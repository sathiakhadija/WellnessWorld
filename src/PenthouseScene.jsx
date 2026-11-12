// Wellness World - Penthouse V8 : React Three Fiber scene.
// Verified in headless Chromium (SwiftShader): GLB loads, trimesh colliders hold the player, camera modes work. See README.md.
import { Bench, PRESET } from './bench.jsx'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { Physics, RigidBody, CapsuleCollider, TrimeshCollider, interactionGroups } from '@react-three/rapier'
import * as THREE from 'three'
import CameraRig, { GROUPS, rigShared } from './CameraRig.jsx'
import HUD from './HUD.jsx'
import { Avatar, Cat } from './Avatar.jsx'
import Rain from './weather/Rain.jsx'
import RainAudio from './weather/RainAudio.jsx'
import { applyWindowRain } from './weather/windowRain.js'
import { LemonGirl, Rabbit, RabbitPlayer, PLAYER_KIND, TEMP_PLAYER, TEMP_PET } from './TempModels.jsx'
import { PlayerModel } from './character'
import Companion from './companion/Companion.jsx'
import { input } from './input.js'
import { camStore } from './camStore.js'
import { SkyDome, Skyline, HAZE, makeSkyMaterial } from './Skyline.jsx'
import Atmosphere from './Atmosphere.jsx'
import { LIVE, useAtmo, atmoStore } from './atmosphere.js'
import Plan from './Plan.jsx'
import { world, OFF } from './world.js'
import { StreetPhysics } from './street/Street.jsx'
import { BX } from './street/plan.js'
import { GY } from './street/geo.js'

RectAreaLightUniformsLib.init()

// Lighting parameters. Defaults are the tuned values; ?name=value in the URL overrides them for quick A/B tuning.
const Q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const num = (k, d) => (Q.has(k) ? parseFloat(Q.get(k)) : d)
const str = (k, d) => (Q.has(k) ? Q.get(k) : d)
export const L = {
  sun: num('sun', 4.1), sunCol: str('sunCol', '#ffb06c'),
  hemi: num('hemi', 0.7), hemiSky: str('hemiSky', '#ffe0c4'), hemiGround: str('hemiGround', '#f6c08a'),
  env: num('env', 0.32), exp: num('exp', 1.0), tm: str('tm', 'neutral'), cove: num('cove', 7),
  floorR: num('floorR', 2.6), floorG: num('floorG', 3.35), floorB: num('floorB', 2.5), floorEnv: num('floorEnv', 1.5),
}
// Albedo grade, tuned against the reference (same camera, region means). The Blender albedos were authored for Cycles' bounce light,
// which the real-time renderer does not have, so the surfaces that receive that bounce are lifted and warmed here.
const GRADE = {
  WW_Parquet_Baked_GAME: { mul: [L.floorR, L.floorG, L.floorB], env: L.floorEnv },
  WW_Plaster_Ivory_GAME: { set: [0.62, 0.52, 0.45] },      // warm ivory/cream (was a green-biased mul that read sage-grey in shade)
  WW_Ceiling_Ivory_GAME: { set: [0.86, 0.78, 0.66] },
  WW_Trim_Satin_GAME:    { set: [0.86, 0.77, 0.63] },
  WW_Skirting_GAME:      { set: [0.86, 0.77, 0.63] },
  WW_Frame_Bronze_GAME:  { set: [0.25, 0.19, 0.125], rough: 0.4, metal: 0.8, envI: 1.1 },   // Bible: slim champagne bronze (palette WW_BRONZE_CHAMPAGNE), not matte black
}
const TONE = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping, linear: THREE.LinearToneMapping }

function AreaLight({ position, target, rotationY = 0, color, intensity, width, height }) {
  const ref = useRef()
  useLayoutEffect(() => { ref.current.lookAt(...target) }, [target])
  return <group position={position} rotation={[0, rotationY, 0]}><rectAreaLight userData={{ wx: 1 }} ref={ref} color={color} intensity={intensity} width={width} height={height} /></group>
}

function SkyEnv() {
  // the same procedural sky lights the room (image-based lighting), so interior colour and exterior colour agree
  const mat = useMemo(makeSkyMaterial, [])
  const { scene } = useThree()
  useEffect(() => { scene.environmentIntensity = L.env }, [scene])
  return <Environment resolution={128} frames={1}><mesh material={mat}><sphereGeometry args={[50, 32, 16]} /></mesh></Environment>
}

// Remove triangles from a geometry (in place) where pred(pos, a, b, c) is true. Used to cut the V8 left wall / side cells / far glass out of the GLB,
// because Plan.jsx rebuilds them (wider doors, real bedroom + bathroom, sliding balcony door).
function dropTris(geom, pred) {
  const pos = geom.attributes.position, idx = geom.index
  const n = idx ? idx.count : pos.count
  const keep = []
  for (let i = 0; i < n; i += 3) {
    const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2
    if (!pred(pos, a, b, c)) keep.push(a, b, c)
  }
  geom.setIndex(keep)
  return geom
}
const all3 = (pos, a, b, c, f) => f(pos.getX(a), pos.getY(a), pos.getZ(a)) && f(pos.getX(b), pos.getY(b), pos.getZ(b)) && f(pos.getX(c), pos.getY(c), pos.getZ(c))
const LEFTWALL = (x) => x <= -4.38                                           // left-wall slab, linings, panelling, skirting, cornice (x -4.85..-4.38)
const FRONT_WALL = (x, y, z) => z > -0.002 && z < 0.402 && x > -4.86 && x < 4.02            // old front wall slab (rebuilt in Plan.jsx with the main entrance)
const FRONT_TRIM = (x, y, z) => z > -0.07 && z < 0.07 && x > -4.46 && x < 3.99
const FAR_GLASS_BAY2 = (x, y, z) => x > -1.91 && x < 1.21 && z < -11.78 && z > -11.80   // the middle far glass pane (replaced by the sliding door)
const FAR_GLASS_COL = (x, y, z) => x > -4.46 && x < 3.62 && z < -11.75 && z > -11.89   // far-wall glass collider (re-created in Plan.jsx with a door gap)

function Penthouse({ onSpawn, onMats }) {
  const { scene } = useGLTF('/wellness_world_penthouse_v8.glb')
  const { visual, colliders, mats } = useMemo(() => {
    const colliders = []
    const remove = [], mats = {}
    scene.traverse((o) => {
      if (o.name?.startsWith('WW_Adjoining') || o.name?.startsWith('WW_Blossom') || o.name?.startsWith('WW_Balcony') || o.name?.startsWith('WW_Balustrade') || o.name === 'WW_COL_Balcony') { remove.push(o); return }   // old side cells (+ their props) and the old tree: rebuilt in code
      // Single authoritative source for the left wall, its door openings and the front wall = Plan.jsx. Every GLB triangle of the old V8 left wall
      // (plaster, door linings/architraves in Trim_Satin, skirting) is removed by MATERIAL, not by mesh name: GLTFLoader numbers split primitives
      // differently from the Blender export, so the V9/V10 name lists missed the old door linings ("WW_Walls_2"), which stayed inside the new door
      // openings (the "central vertical structure"), and the old skirting, which ran across the doorway floors. Sconces (Brass/SconceGlow) are kept.
      if (o.isMesh && ['WW_Plaster_Ivory_GAME', 'WW_Trim_Satin_GAME', 'WW_Skirting_GAME'].includes(o.material?.name)) {
        dropTris(o.geometry, (pos, a, b, c) => all3(pos, a, b, c, (x) => LEFTWALL(x)))                // old left wall slab, linings, panelling, skirting (x <= -4.40)
        dropTris(o.geometry, (pos, a, b, c) => all3(pos, a, b, c, FRONT_WALL))                         // old front wall slab (rebuilt with the entrance)
      }
      if (o.isMesh && ['WW_Trim_Satin_GAME', 'WW_Skirting_GAME'].includes(o.material?.name)) dropTris(o.geometry, (pos, a, b, c) => all3(pos, a, b, c, FRONT_TRIM))
      if (o.isMesh && o.name === 'WW_Window_Frames' && !o.geometry.userData.slimmed) {            // Bible s01: slim champagne-bronze mullions. Each pier is a 24-vertex box: shrink its x/z section about its own centre (height untouched).
        o.geometry.userData.slimmed = true
        const pa = o.geometry.attributes.position, fx = (w) => (w > 0.3 ? 0.55 : 0.68)
        for (let g = 0; g + 24 <= pa.count; g += 24) {
          let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]
          for (let i = g; i < g + 24; i++) for (let k = 0; k < 3; k++) { const v = k === 0 ? pa.getX(i) : k === 1 ? pa.getY(i) : pa.getZ(i); mn[k] = Math.min(mn[k], v); mx[k] = Math.max(mx[k], v) }
          if (mx[1] - mn[1] < 3) continue
          const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, sx = fx(mx[0] - mn[0]), sz = fx(mx[2] - mn[2])
          for (let i = g; i < g + 24; i++) pa.setX(i, cx + (pa.getX(i) - cx) * sx), pa.setZ(i, cz + (pa.getZ(i) - cz) * sz)
        }
        pa.needsUpdate = true; o.geometry.computeBoundingSphere()
      }
      if (o.isMesh && o.name === 'WW_Window_Glass') dropTris(o.geometry, (pos, a, b, c) => all3(pos, a, b, c, FAR_GLASS_BAY2))
      if (o.userData?.ww_collider) colliders.push(o)          // exported "extras" from Blender
      if (o.userData?.ww_role === 'player_spawn') onSpawn?.(o.getWorldPosition(new THREE.Vector3()))
      if (o.isMesh && !o.userData?.ww_collider) {
        o.castShadow = o.receiveShadow = true
        const m = o.material
        const gr = m && GRADE[m.name]
        if (gr && !m.userData.graded) {
          m.userData.graded = true
          if (gr.mul) m.color.setRGB(m.color.r * gr.mul[0], m.color.g * gr.mul[1], m.color.b * gr.mul[2])
          if (gr.set) m.color.setRGB(...gr.set)
          if (gr.env) m.envMapIntensity = gr.env
          if (gr.rough !== undefined) m.roughness = gr.rough
          if (gr.metal !== undefined) m.metalness = gr.metal
          if (gr.envI !== undefined) m.envMapIntensity = gr.envI
        }
        if (m?.name) mats[m.name] = m
        if (m?.name?.includes('Glass')) o.castShadow = false      // shadow maps ignore transparency: glass would block the whole sun
        if (m?.name?.includes('Glass')) { applyWindowRain(m); m.transparent = true; m.opacity = 0.12; m.depthWrite = false; m.side = THREE.DoubleSide }
      }
    })
    remove.forEach((o) => o.parent?.remove(o))
    scene.updateMatrixWorld(true)
    colliders.forEach((c) => {                                    // bake world transform into plain arrays for Rapier
      const g = c.geometry.clone().applyMatrix4(c.matrixWorld)
      const kind = c.userData.ww_collider_kind
      if (kind === 'walls') dropTris(g, (pos, a, b, cc) => all3(pos, a, b, cc, (x) => x <= -4.44))                           // left wall + old cells
      if (kind === 'walls') dropTris(g, (pos, a, b, cc) => all3(pos, a, b, cc, FRONT_WALL))
      if (kind === 'floor') dropTris(g, (pos, a, b, cc) => all3(pos, a, b, cc, (x) => x <= -4.84))                           // old cell floors
      if (kind === 'glass') dropTris(g, (pos, a, b, cc) => all3(pos, a, b, cc, FAR_GLASS_COL))
      c.userData.__pos = new Float32Array(g.attributes.position.array)
      c.userData.__idx = new Uint32Array(g.index.array)
      c.visible = false                                           // invisible physics-only meshes
    })
    return { visual: scene, colliders, mats }
  }, [scene])
  return (
    <>
      <primitive object={visual} />
      {!OFF.has('plan') && <Plan mats={mats} />}
      {colliders.map((c) => (
        <RigidBody key={c.uuid} type="fixed" colliders={false}>
          <TrimeshCollider
            args={[c.userData.__pos, c.userData.__idx]}
            collisionGroups={interactionGroups([c.userData.ww_collider_kind === 'glass' ? GROUPS.glass : GROUPS.world])}
          />
        </RigidBody>
      ))}
    </>
  )
}

function CleanHide({ children }) {
  const ref = useRef()
  useFrame(() => { if (ref.current) ref.current.visible = !camStore.get().clean })
  return <group ref={ref}>{children}</group>
}

// show a subtree only on one floor (the penthouse is hidden while the player is on the street, and vice versa for nothing: the street always renders)
function LevelGate({ level, children }) {
  const r = useRef()
  useFrame(() => { if (r.current) r.current.visible = world.level === level })
  return <group ref={r}>{children}</group>
}

// The lift: penthouse <-> street. Fades to the lift card, moves the player + camera, resets the doors. Also exposes enterStreet/enterPenthouse for tests.
function Transit() {
  useEffect(() => {
    const toStreet = () => {
      world.level = 'street'
      world.teleportPlayer && world.teleportPlayer(BX, GY + 0.05, 7.4)
      world.setPlayerYaw && world.setPlayerYaw(0); world.setFollowYaw && world.setFollowYaw(Math.PI)
      const d = world.doors.entrance; if (d) { d.t = 0; d.target = 0; d.force = undefined; d.hold = 0 }
      const lf = world.doors.lift; if (lf) { lf.t = 0; lf.target = 0; lf.force = undefined; lf.hold = 0 }
    }
    const toPenthouse = () => {
      world.level = 'penthouse'
      world.teleportPlayer && world.teleportPlayer(1.2, 0.05, 2.15)                       // arrive in the private lift lobby, facing the entrance door; the lift doors open behind
      world.setPlayerYaw && world.setPlayerYaw(Math.PI); world.setFollowYaw && world.setFollowYaw(0)
      const lf = world.doors.lift; if (lf) { lf.t = 1; lf.target = 1; lf.force = undefined; lf.hold = 0; setTimeout(() => { lf.target = 0 }, 3500) }
      const d = world.doors.entrance; if (d) { d.t = 0; d.target = 0; d.force = undefined; d.hold = 0 }
    }
    world.enterStreet = toStreet; world.enterPenthouse = toPenthouse
    // The ride is a short, skippable fade (about 1.7 s); with prefers-reduced-motion it is a 0.35 s cut. Space / Enter / Escape / a click skips straight to the arrival.
    let pending = null
    const finish = (dir) => {
      const L = world.liftDoor, reduced = atmoStore.get().reduced; pending = null
      if (dir === 'down') { toStreet(); if (L) { L.t = 0; L.target = 1; setTimeout(() => { L.target = 0 }, 4500) } }
      else { toPenthouse(); if (L) L.target = 0 }
      setTimeout(() => camStore.set({ transition: 'idle', dest: '' }), reduced ? 80 : 700)
    }
    world.rideLift = (dir) => {
      camStore.set({ transition: 'overlay', dest: dir })
      const L = world.liftDoor; if (dir === 'up' && L) L.target = 1
      pending = { dir, t: setTimeout(() => finish(dir), atmoStore.get().reduced ? 350 : 1700) }
    }
    world.skipRide = () => { if (pending) { clearTimeout(pending.t); finish(pending.dir) } }
    const onKey = (e) => { if (pending && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') && !e.repeat) { e.preventDefault(); world.skipRide() } }
    const onClick = () => { if (pending) world.skipRide() }
    window.addEventListener('keydown', onKey); window.addEventListener('pointerdown', onClick)
    if (new URLSearchParams(window.location.search).get('at') === 'street') setTimeout(toStreet, 600)         // dev/test: start on the street
    return () => { world.rideLift = null; world.skipRide = null; world.enterStreet = world.enterPenthouse = null; window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onClick) }
  }, [])
  return null
}

// One sun, two framings: over the penthouse (tight shadow box around the room) and on the street (a 110 m box following the player, snapped to a grid so shadows don't shimmer).
function SunRig({ lightRef, targetRef, fillRef }) {
  const mode = useRef('')
  useFrame(() => {
    const L = lightRef.current, T = targetRef.current, f = fillRef.current
    if (!L || !T) return
    const street = world.level === 'street', p = world.player
    if (street) {
      const sx = Math.round(p.x / 6) * 6, sz = Math.round(p.z / 6) * 6
      T.position.set(sx, GY, sz); T.updateMatrixWorld(); { const el = LIVE.sunEl + 5.7, az = Math.atan2(LIVE.sunDir.x, -LIVE.sunDir.z); L.position.set(sx + Math.sin(az) * Math.cos(el * 0.01745) * 51, GY + Math.sin(el * 0.01745) * 51, sz - Math.cos(az) * Math.cos(el * 0.01745) * 51) }
      if (mode.current !== 'street') {
        const c = L.shadow.camera; c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 1; c.far = 190; c.updateProjectionMatrix()
        L.shadow.bias = -0.0006; L.shadow.normalBias = 0.05; mode.current = 'street'
      }
    } else {
      T.position.set(-1, 0, -6); T.updateMatrixWorld(); L.position.set(-1 + LIVE.sunDir.x * 50.2, LIVE.sunDir.y * 50.2, -6 + LIVE.sunDir.z * 50.2)
    }
    if (!street && mode.current !== 'penthouse') {
      const c = L.shadow.camera; c.left = -14; c.right = 14; c.top = 14; c.bottom = -14; c.near = 1; c.far = 120; c.updateProjectionMatrix()
      L.shadow.bias = -0.0004; L.shadow.normalBias = 0.03; mode.current = 'penthouse'
    }
    if (f) f.intensity = street ? (f.userData.k ?? 0.55) : 0
  })
  return null
}

const AMB = { morning: 0.35, afternoon: 0.3, golden: 0.15, blue: 0.2, night: 0.1 }   // warm interior bounce so shadowed ivory walls stay cream, not grey-green
const walkDir = new THREE.Vector3()
// Active visuals: the ORIGINAL pill avatar + geometric cat are the default placeholders. The V12 procedural character/kitten/companion
// are experimental and OFF unless ?model=v12 is passed (kept in src/character and src/companion for later replacement work).
const EXPERIMENTAL = new URLSearchParams(window.location.search).get('model') === 'v12'
const LEGACY = !EXPERIMENTAL

function Player({ spawn, bodyRef, meshRef }) {
  const heading = useRef(0)
  const speedRef = useRef(0)
  useEffect(() => {
    world.setPlayerYaw = (y) => { heading.current = y; world.faceYaw = null; if (meshRef.current) meshRef.current.rotation.y = y }
    return () => { world.setPlayerYaw = null }
  }, [meshRef])
  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) return
    let speed = 0
    walkDir.set(0, 0, 0)
    if (camStore.get().mode === 'follow' && camStore.get().transition === 'idle') {                       // free + inspect cameras never move the player
      const f = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0)
      const r = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0)
      const y = rigShared.followYaw                               // walk relative to where the camera looks
      walkDir.set(-Math.sin(y) * f + Math.cos(y) * r, 0, -Math.cos(y) * f - Math.sin(y) * r)
      if (walkDir.lengthSq() && !world.playerLock) { walkDir.normalize(); const fast = input.down('ShiftLeft') || input.down('ShiftRight'); speed = fast && input.down('Space') ? 5.0 : fast ? 3.5 : input.down('KeyZ') ? 1.8 : (world.level === 'street' ? 2.5 : 1.8) }   // sprint 5.0 (Shift+Space) / fast walk 3.5 (Shift) / relaxed stroll 1.8 (Z) / normal 2.5 outdoors, 1.8 indoors
    }
    speedRef.current = speed
    const tp = body.translation(); world.player.x = tp.x; world.player.y = tp.y; world.player.z = tp.z
    if (tp.y < (world.level === 'street' ? GY - 6 : -8) && world.teleportPlayer) {            // safety net: never leave the player in the void
      if (world.level === 'street') world.teleportPlayer(BX, GY + 0.1, 8); else world.teleportPlayer(spawn.x, spawn.y + 0.2, spawn.z)
    }
    const lin = body.linvel()
    body.setLinvel({ x: walkDir.x * speed, y: lin.y, z: walkDir.z * speed }, true)
    if (meshRef.current) world.heading = meshRef.current.rotation.y
    if ((speed > 0 || world.faceYaw != null) && meshRef.current) {   // turn the model to face its walking direction (or an interaction target)
      const target = speed > 0 ? Math.atan2(walkDir.x, walkDir.z) : world.faceYaw
      let d = target - heading.current
      d = Math.atan2(Math.sin(d), Math.cos(d))
      heading.current += d * (1 - Math.exp(-12 * Math.min(delta, 0.05)))
      meshRef.current.rotation.y = heading.current
    }
  })
  return (
    <RigidBody ref={bodyRef} position={[spawn.x, spawn.y + 1, spawn.z]} enabledRotations={[false, false, false]} colliders={false}>
      {/* 1.54 m tall capsule (2 x 0.55 + 2 x 0.22), 0.44 m wide: a real person, not a pill */}
      <CapsuleCollider args={[0.55, 0.22]} position={[0, 0.77, 0]} collisionGroups={interactionGroups([GROUPS.player], [GROUPS.world, GROUPS.glass])} />
      <group ref={meshRef}>{LEGACY ? (PLAYER_KIND === 'rabbit' ? <Suspense fallback={null}><RabbitPlayer speedRef={speedRef} /></Suspense> : PLAYER_KIND === 'lemon' ? <Suspense fallback={<Avatar speedRef={speedRef} />}><LemonGirl speedRef={speedRef} /></Suspense> : <Avatar speedRef={speedRef} />) : <PlayerModel speedRef={speedRef} />}</group>
    </RigidBody>
  )
}

export default function PenthouseScene() {
  const spawn = useMemo(() => ({ current: new THREE.Vector3(0, 0, 0) }), [])
  const bodyRef = useRef(null)
  const meshRef = useRef(null)
  const sunTarget = useMemo(() => new THREE.Object3D(), [])
  const sunRef = useRef(), fillRef = useRef(), hemiRef = useRef()
  const atmo = useAtmo()
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows dpr={[1, PRESET.dprMax]} camera={{ fov: 50, near: 0.05, far: 700, position: [0, 1.7, 0] }}
              gl={{ toneMapping: TONE[L.tm] ?? THREE.ACESFilmicToneMapping, toneMappingExposure: L.exp }}>
        <Bench />
        <fog attach="fog" args={[HAZE, 100, 560]} />
        <SkyDome />
        <Suspense fallback={null}><SkyEnv key={atmo.rev} /></Suspense>
        <Skyline />
        <Rain />
        <RainAudio />
        {/* golden-hour sun: Blender direction (0.42, 0.89, 0.16) -> three.js (x, z, -y). Target = room centre, shadow frustum covers the whole penthouse */}
        <primitive object={sunTarget} position={[-1, 0, -6]} />
        <directionalLight ref={sunRef} target={sunTarget} color={L.sunCol} intensity={L.sun} position={[20, 8, -51]} castShadow shadow-mapSize={[PRESET.shadow, PRESET.shadow]}
          shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={120}
          shadow-bias={-0.0004} shadow-normalBias={0.03} />
        {/* warm bounce stand-in: sky colour lights upward faces, honey ground colour lights downward faces (ceiling, soffits) */}
        <hemisphereLight ref={hemiRef} args={[L.hemiSky, L.hemiGround, L.hemi]} />
        {/* street-only cool shadow fill (intensity 0 in the penthouse) */}
        <hemisphereLight ref={fillRef} args={['#c9b8de', '#8f6f5e', 0]} />
        <SunRig lightRef={sunRef} targetRef={{ current: sunTarget }} fillRef={fillRef} />
        <Atmosphere sunRef={sunRef} hemiRef={hemiRef} fillRef={fillRef} />
        {/* cove LED runs along the glazing wall and the right-hand glazing */}
        <AreaLight position={[-0.4, 3.55, -11.1]} target={[-0.4, 3.9, -9.4]} color="#ffc27a" intensity={L.cove} width={8} height={0.25} />
        <AreaLight position={[3.0, 3.55, -7.2]} rotationY={Math.PI / 2} target={[0, 0.5, -1.6]} color="#ffc27a" intensity={L.cove} width={8} height={0.25} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.8, 0]}>
            <LevelGate level="penthouse"><ambientLight color="#ffe6d2" intensity={AMB[atmo.preset] ?? 0.4} /><Penthouse onSpawn={(p) => spawn.current.copy(p)} /></LevelGate>
            {!OFF.has('street') && <StreetPhysics />}
            <Transit />
            <Player spawn={spawn.current} bodyRef={bodyRef} meshRef={meshRef} />
            <LevelGate level="penthouse">
              {/* balcony cherry tree + petals removed (owner decision 2026-11-12: approved balcony AFTER is unfurnished) */}
              {LEGACY ? (PLAYER_KIND === 'rabbit' ? null : <CleanHide>{TEMP_PET ? <Suspense fallback={null}><Rabbit position={[-0.70, 0, -4.48]} rotationY={Math.PI + 0.25} /></Suspense> : <Cat position={[-0.70, 0, -4.48]} rotationY={Math.PI + 0.25} />}</CleanHide>) : <Companion />}
            </LevelGate>
            <CameraRig playerRef={bodyRef} playerMeshRef={meshRef} />
          </Physics>
        </Suspense>
      </Canvas>
      <HUD />
    </div>
  )
}
