// Private penthouse lift lobby (Design Bible s05, pp.16-20): a compact enclosed vestibule behind the entrance door — NOT the public lobby (s06).
// Dimensions resolved against the real door: opening x 0.55..1.85, wall z 0..0.4, door head 3.1 m  =>  room x -0.4..2.8 (3.2 m) x z 0.4..2.8 (2.4 m) x 3.1 m high (guide 3.0-3.5 x 2.2-2.5 x 2.7-3.0).
// Materials come from the palette registry (WW_PLASTER_BLUSH, WW_MARBLE_*, WW_BRASS_ANTIQUE …). Geometry kit baked in Blender (assets/blender/make_lobby.py -> src/baked/lobby.json).
// Function: working lift doors (two sliding leaves) + a cab behind them, call/ride interaction, indicator, entrance door unchanged. Rides use the existing world.rideLift transition.
import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ww, wwColor, wwHex } from './palette.js'
import KIT from './baked/lobby.json'
import { GROUPS } from './CameraRig.jsx'
import { world } from './world.js'
import { camStore } from './camStore.js'
import * as LT from './lobbyTextures.js'

const WORLD = interactionGroups([GROUPS.world])
export const LOBBY = { x0: -0.4, x1: 2.8, z0: 0.4, z1: 2.8, h: 3.1, cx: 1.2, liftZ: 2.8 }
const clamp01 = (v) => Math.min(1, Math.max(0, v)), smooth = (t) => t * t * (3 - 2 * t)

const cache = {}
function kit(name) {
  if (cache[name]) return cache[name]
  const o = {}
  for (const [bucket, d] of Object.entries(KIT[name])) {
    const n = d.p.length / 3, uv = new Float32Array(n * 2), P = new Float32Array(n * 3); P.set(d.p)
    for (let i = 0; i < n; i++) { if (bucket === 'rug') { uv[i * 2] = P[i * 3] / 1.56 + 0.5; uv[i * 2 + 1] = P[i * 3 + 2] / 1.56 + 0.5 } else { uv[i * 2] = P[i * 3] + P[i * 3 + 2]; uv[i * 2 + 1] = P[i * 3 + 1] } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); o[bucket] = toCreasedNormals(g, 0.7)
  }
  return (cache[name] = o)
}

function useMats() {
  return useMemo(() => {
    const brass = ww('WW_BRASS_ANTIQUE', { color: wwColor('WW_BRASS_ANTIQUE', true).lerp(new THREE.Color('#cdbb98'), 0.4), roughness: 0.4, metalness: 1, envMapIntensity: 1.3 }, 'lobbyBrass')
    const warm = new THREE.MeshBasicMaterial({ color: wwHex('WW_LAMP_WARM'), toneMapped: false })
    const marbleL = LT.marbleLight(), marbleD = LT.marbleDark(), gold = LT.brushedGold(); gold.wrapS = gold.wrapT = THREE.RepeatWrapping
    return {
      blush: ww('WW_PLASTER_BLUSH', { roughness: 0.92, color: wwColor('WW_PLASTER_BLUSH').lerp(new THREE.Color('#8a7873'), 0.6).multiplyScalar(0.72), envMapIntensity: 0.35 }, 'lobby'),
      trim: ww('WW_LIMESTONE_CREAM', { color: wwColor('WW_LIMESTONE_CREAM', true), roughness: 0.5 }, 'lobbyTrim'),
      floor: ww('WW_MARBLE_LIGHT', { map: marbleL, roughness: 0.12, envMapIntensity: 1.4, color: wwColor('WW_MARBLE_LIGHT').multiplyScalar(0.75) }, 'lobbyFloor'),
      marble: ww('WW_MARBLE_DARK', { map: marbleD, color: new THREE.Color('#4a4340'), roughness: 0.26, envMapIntensity: 1.2 }, 'lobbyDark'),
      top: ww('WW_MARBLE_LIGHT', { map: marbleL, roughness: 0.3 }, 'lobbyTop'),
      flute: ww('WW_LIMESTONE_CREAM', { roughness: 0.62 }, 'lobbyFlute'),
      gold: ww('WW_BRASS_ANTIQUE', { color: wwColor('WW_BRASS_ANTIQUE', true).lerp(new THREE.Color('#d6c7a6'), 0.45), map: gold, roughness: 0.34, metalness: 1, envMapIntensity: 1.5 }, 'lobbyGold'),
      brass, dark: ww('WW_IRONWORK_CHARCOAL', { roughness: 0.45, metalness: 0.4 }, 'lobbyDark2'),
      tube: warm, wax: ww('WW_LIMESTONE_CREAM', { roughness: 0.6 }, 'lobbyWax'),
      rug: ww('WW_RUG_CREAM', { map: LT.rugTex(), roughness: 1 }, 'lobbyRug'),
      ivy1: ww('WW_FOLIAGE_FOREST', { side: THREE.DoubleSide, roughness: 0.7 }, 'lobbyIvy1'), ivy2: ww('WW_FOLIAGE_OLIVE', { side: THREE.DoubleSide, roughness: 0.7 }, 'lobbyIvy2'),
      stem: ww('WW_BARK', { roughness: 1 }, 'lobbyStem'),
      bloom1: ww('WW_FLOWER_PINK_MUTED', { roughness: 0.85 }, 'lobbyB1'), bloom2: ww('WW_FLOWER_PINK_MUTED', { color: wwColor('WW_FLOWER_PINK_MUTED', true), roughness: 0.85 }, 'lobbyB2'),
      glass: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }),
      ceil: new THREE.MeshStandardMaterial({ color: wwColor('WW_CEILING_CREAM'), roughness: 0.95, emissive: new THREE.Color(wwHex('WW_LAMP_WARM')), emissiveMap: LT.ceilingGlow(), emissiveIntensity: 0.3 }),
      art: new THREE.MeshStandardMaterial({ map: LT.artTex(), roughness: 0.6 }),
      sign: new THREE.MeshBasicMaterial({ map: LT.liftSign(), transparent: true, toneMapped: false, depthWrite: false }),
      indicator: new THREE.MeshBasicMaterial({ map: LT.indicator('▲ PH'), toneMapped: false }),
      cabWall: ww('WW_BRASS_ANTIQUE', { color: wwColor('WW_BRASS_ANTIQUE', true), map: gold, roughness: 0.4, metalness: 0.9, side: THREE.DoubleSide, envMapIntensity: 1.6 }, 'lobbyCab'),
    }
  }, [])
}

function Kit({ name, M, position, rotY = 0, scale, castShadow = true }) {
  const g = useMemo(() => kit(name), [name])
  return <group position={position} rotation={[0, rotY, 0]} scale={scale}>{Object.keys(g).map((k) => <mesh key={k} geometry={g[k]} material={M[k] || M.trim} castShadow={castShadow && k !== 'tube'} receiveShadow />)}</group>
}
const Box = ({ p, s, m, shadow = false }) => <mesh position={p} castShadow={shadow} receiveShadow material={m}><boxGeometry args={s} /></mesh>

export default function Lobby() {
  const M = useMats()
  const { x0, x1, z0, z1, h, cx } = LOBBY, W = x1 - x0, D = z1 - z0
  const L = useRef({ t: 0, target: 0, hold: 0 }), leafL = useRef(), leafR = useRef(), cabLight = useRef(), indRef = useRef(), blockRef = useRef(true)
  const [block, setBlock] = React.useState(true)

  useEffect(() => {
    const it = {
      id: 'lift', label: 'lift', x: cx, z: 2.3, range: 1.5,
      prompt: () => (L.current.target === 1 ? '' : '🛗 Take the lift down'),
      isOpen: () => L.current.target === 1,
      toggle: () => {
        if (camStore.get().transition !== 'idle' && camStore.get().transition) return false
        L.current.target = 1; camStore.set({ transition: 'opening', dest: 'down' }); return false
      },
    }
    world.interactables.push(it); world.doors.lift = L.current
    return () => { const i = world.interactables.indexOf(it); if (i >= 0) world.interactables.splice(i, 1); delete world.doors.lift }
  }, [cx])

  useFrame((_, dt) => {
    const s = L.current, step = world.fastAnim ? dt : Math.min(dt, 0.05)
    if (s.force != null) { s.t = s.force; s.target = s.force > 0.5 ? 1 : 0 }
    const dir = s.force != null ? 0 : Math.sign(s.target - s.t)
    if (dir) s.t = clamp01(s.t + dir * step / 1.4)
    const e = smooth(s.t)
    if (leafL.current) leafL.current.position.x = 0.42 * e
    if (leafR.current) leafR.current.position.x = -0.42 * e
    if (cabLight.current) cabLight.current.intensity = 0.5 + 1.4 * e
    const tr = camStore.get().transition
    if (tr === 'opening' && s.t >= 1) { s.hold += step; if (s.hold > 0.7) { s.hold = 0; world.rideLift ? world.rideLift('down') : camStore.set({ transition: 'idle' }) } }
    const should = s.t < 0.04 && s.target === 0
    if (should !== blockRef.current) { blockRef.current = should; setBlock(should) }
  })

  const warm = wwHex('WW_LAMP_WARM'), W2 = W / 2
  const wallH = h + 0.2
  return (
    <group>
      {/* ---- shell ---- */}
      <Box p={[x0 - 0.1, wallH / 2 - 0.3, (z0 + z1 + 0.2) / 2]} s={[0.2, wallH + 0.3, D + 0.4]} m={M.blush} shadow />
      <Box p={[x1 + 0.1, wallH / 2 - 0.3, (z0 + z1 + 0.2) / 2]} s={[0.2, wallH + 0.3, D + 0.4]} m={M.blush} shadow />
      <Box p={[(x0 - 0.2 + 0.65) / 2, wallH / 2 - 0.3, z1 + 0.1]} s={[0.65 - (x0 - 0.2), wallH + 0.3, 0.2]} m={M.blush} shadow />
      <Box p={[(1.75 + x1 + 0.2) / 2, wallH / 2 - 0.3, z1 + 0.1]} s={[x1 + 0.2 - 1.75, wallH + 0.3, 0.2]} m={M.blush} shadow />
      <Box p={[cx, (2.2 + wallH) / 2, z1 + 0.1]} s={[1.1, wallH - 2.2, 0.2]} m={M.blush} shadow />
      <Box p={[cx, h + 0.15, (z0 + z1 + 0.4) / 2]} s={[W + 0.4, 0.3, D + 0.4]} m={M.ceil} shadow />
      {/* ceiling underside (warm bounce map) + marble floor */}
      <mesh position={[cx, h - 0.001, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow material={M.ceil}><planeGeometry args={[W, D]} /></mesh>
      <mesh position={[cx, 0.001, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={M.floor}><planeGeometry args={[W, D]} /></mesh>
      {/* front wall (entrance side) blush facing in, with the existing opening x 0.55..1.85 */}
      <Box p={[(x0 + 0.55) / 2, h / 2, z0 + 0.004]} s={[0.55 - x0, h, 0.008]} m={M.blush} />
      <Box p={[(1.85 + x1) / 2, h / 2, z0 + 0.004]} s={[x1 - 1.85, h, 0.008]} m={M.blush} />
      {/* casing around the doorway (vestibule side) */}
      <Box p={[0.55 - 0.045, 1.55, z0 + 0.02]} s={[0.09, 3.1, 0.04]} m={M.trim} /><Box p={[1.85 + 0.045, 1.55, z0 + 0.02]} s={[0.09, 3.1, 0.04]} m={M.trim} />
      {/* skirting */}
      <Box p={[x0 + 0.02, 0.07, (z0 + z1) / 2]} s={[0.04, 0.14, D]} m={M.trim} /><Box p={[x1 - 0.02, 0.07, (z0 + z1) / 2]} s={[0.04, 0.14, D]} m={M.trim} />
      <Box p={[(x0 + 0.55) / 2, 0.07, z0 + 0.02]} s={[0.55 - x0, 0.14, 0.04]} m={M.trim} /><Box p={[(1.85 + x1) / 2, 0.07, z0 + 0.02]} s={[x1 - 1.85, 0.14, 0.04]} m={M.trim} />
      <Box p={[(x0 + 0.22) / 2, 0.07, z1 - 0.02]} s={[0.22 - x0, 0.14, 0.04]} m={M.trim} /><Box p={[(2.18 + x1) / 2, 0.07, z1 - 0.02]} s={[x1 - 2.18, 0.14, 0.04]} m={M.trim} />
      {/* cove: cream lip with a hidden warm LED strip above it (light washes the ceiling) */}
      {[[x0 + 0.05, (z0 + z1) / 2, 0.1, D], [x1 - 0.05, (z0 + z1) / 2, 0.1, D]].map(([x, z, w, d], i) => <React.Fragment key={'cv' + i}><Box p={[x, h - 0.1, z]} s={[w, 0.12, d]} m={M.trim} /><Box p={[x + (i ? -0.02 : 0.02), h - 0.025, z]} s={[0.05, 0.05, d - 0.1]} m={M.tube} /></React.Fragment>)}
      {[[z0 + 0.05, 0], [z1 - 0.05, 1]].map(([z, i]) => <React.Fragment key={'cz' + i}><Box p={[cx, h - 0.1, z]} s={[W, 0.12, 0.1]} m={M.trim} /><Box p={[cx, h - 0.025, z + (i ? -0.02 : 0.02)]} s={[W - 0.1, 0.05, 0.05]} m={M.tube} /></React.Fragment>)}
      {[0.55, 1.85].map((x, i) => <mesh key={'dl' + i} position={[x + (i ? 0.45 : -0.45) + 0.0, h - 0.004, 1.65]} rotation={[Math.PI / 2, 0, 0]} material={M.tube}><circleGeometry args={[0.055, 20]} /></mesh>)}

      {/* ---- wall panelling frames (Blender kit) ---- */}
      <Kit name="pf_tall" M={M} position={[x0 + 0.0, 0.5, 0.9]} rotY={Math.PI / 2} />
      <Kit name="pf_tall" M={M} position={[x1 - 0.0, 0.5, 1.0]} rotY={-Math.PI / 2} />
      <Kit name="pf_tall" M={M} position={[0.075, 0.5, z0 + 0.01]} />
      <Kit name="pf_tall" M={M} position={[2.325, 0.5, z0 + 0.01]} />
      <Kit name="pf_low" M={M} position={[x1, 0.5, 1.95]} rotY={-Math.PI / 2} />

      {/* ---- lift wall: dark marble surround, indicator, brass frame, doors, sign, call panel ---- */}
      <Kit name="lift_surround" M={M} position={[cx, 0, z1]} rotY={Math.PI} />
      <group position={[cx, 0, z1]} rotation={[0, Math.PI, 0]}>
        <group ref={leafL}><Kit name="lift_leaf" M={M} position={[0, 0, 0]} /></group>
        <group ref={leafR}><Kit name="lift_leaf" M={M} position={[0, 0, 0]} scale={[-1, 1, 1]} /></group>
      </group>
      <mesh position={[cx, 2.425, z1 - 0.0755]} rotation={[0, Math.PI, 0]} material={M.indicator}><planeGeometry args={[0.52, 0.15]} /></mesh>
      <mesh position={[-0.09, 1.66, z1 - 0.004]} rotation={[0, Math.PI, 0]} material={M.sign}><planeGeometry args={[0.6, 0.6]} /></mesh>
      <Kit name="call_panel" M={M} position={[2.5, 0.98, z1]} rotY={Math.PI} />
      {/* cab behind the doors */}
      <group position={[cx, 0, z1 + 0.7 + 0.04]}>
        {[[-0.7, 1.2, 0, 0.04, 2.4, 1.4], [0.7, 1.2, 0, 0.04, 2.4, 1.4], [0, 1.2, 0.7, 1.4, 2.4, 0.04], [0, 2.4, 0, 1.4, 0.04, 1.4]].map(([x, y, z, sx, sy, sz], i) => <Box key={'cab' + i} p={[x, y, z]} s={[sx, sy, sz]} m={M.cabWall} />)}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.floor}><planeGeometry args={[1.4, 1.4]} /></mesh>
        <Box p={[0, 1.0, 0.66]} s={[1.2, 0.03, 0.03]} m={M.brass} />
        <pointLight ref={cabLight} position={[0, 2.2, 0]} color={warm} intensity={0.5} distance={3.2} decay={1.6} />
      </group>

      {/* ---- left wall: curved fluted console with warm underglow, framed art, bouquet + lanterns ---- */}
      <Kit name="console" M={M} position={[x0, 0, 1.95]} rotY={Math.PI / 2} />
      <Kit name="bouquet" M={M} position={[x0 + 0.2, 0.825, 1.72]} />
      <Kit name="lantern" M={M} position={[x0 + 0.17, 0.825, 2.22]} /><Kit name="lantern" M={M} position={[x0 + 0.3, 0.825, 2.36]} scale={[0.75, 0.75, 0.75]} />
      <group position={[x0 + 0.012, 1.8, 1.95]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0.004]} material={M.art}><planeGeometry args={[0.8, 1.15]} /></mesh>
        {[[0, 0.595, 0.84, 0.04], [0, -0.595, 0.84, 0.04], [0.42, 0, 0.04, 1.23], [-0.42, 0, 0.04, 1.23]].map(([x, y, w, hh], i) => <mesh key={'af' + i} position={[x, y, 0.012]} castShadow material={M.trim}><boxGeometry args={[w, hh, 0.024]} /></mesh>)}
      </group>

      {/* ---- right wall: floating shelves, ivy, books ---- */}
      <Kit name="shelf" M={M} position={[x1, 1.52, 2.35]} rotY={-Math.PI / 2} /><Kit name="shelf" M={M} position={[x1, 1.98, 2.35]} rotY={-Math.PI / 2} />
      <Kit name="ivy" M={M} position={[x1 - 0.18, 2.02, 2.52]} />
      {[[0, 0.04, 0.045, 0.22, '#5a2934'], [0.05, 0.04, 0.05, 0.2, '#e8d9c6'], [0.11, 0.04, 0.04, 0.24, '#263b32']].map(([dz, , w, hh, c], i) => <mesh key={'bk' + i} position={[x1 - 0.14, 1.56 + hh / 2, 2.1 + dz]} castShadow receiveShadow><boxGeometry args={[0.16, hh, w]} /><meshStandardMaterial color={c} roughness={0.7} /></mesh>)}

      <Kit name="rug" M={M} position={[cx, 0.001, 1.6]} />

      {/* ---- lights (warm 3000 K, scaled with the weather like every interior lamp) ---- */}
      {[[0.4, h - 0.25, 1.35, 1.5], [2.0, h - 0.25, 1.35, 1.5], [cx, h - 0.25, 2.3, 1.1], [cx, h - 0.25, 0.9, 0.9]].map(([x, y, z, i], k) => <pointLight key={'pl' + k} userData={{ wx: 1 }} position={[x, y, z]} color={warm} intensity={i} distance={5} decay={1.5} />)}
      <pointLight userData={{ wx: 1 }} position={[x0 + 0.55, 1.0, 1.95]} color="#ffb870" intensity={0.6} distance={2.4} decay={1.6} />
      <pointLight userData={{ wx: 1 }} position={[x1 - 0.5, 1.9, 2.4]} color={warm} intensity={0.5} distance={2.4} decay={1.6} />

      {/* ---- collision ---- */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(x1 - x0) / 2 + 0.1, 0.15, (z1 - z0) / 2 + 0.45]} position={[cx, -0.15, (z0 + z1) / 2 - 0.35]} collisionGroups={WORLD} />   {/* floor: without it the player falls through the lobby floor after the entrance door */}
        <CuboidCollider args={[0.1, 1.9, 1.4]} position={[x0 - 0.1, 1.9, 1.6]} collisionGroups={WORLD} />
        <CuboidCollider args={[0.1, 1.9, 1.4]} position={[x1 + 0.1, 1.9, 1.6]} collisionGroups={WORLD} />
        <CuboidCollider args={[0.65, 1.9, 0.1]} position={[0.025, 1.9, z1 + 0.1]} collisionGroups={WORLD} />
        <CuboidCollider args={[0.625, 1.9, 0.1]} position={[2.375, 1.9, z1 + 0.1]} collisionGroups={WORLD} />
        <CuboidCollider args={[0.22, 0.4, 0.75]} position={[x0 + 0.22, 0.4, 1.95]} collisionGroups={WORLD} />
        {block && <CuboidCollider args={[0.58, 1.2, 0.08]} position={[cx, 1.2, z1 - 0.02]} collisionGroups={WORLD} />}
      </RigidBody>
    </group>
  )
}
