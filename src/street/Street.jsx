// Street level: turns the masterplan (plan.js) into meshes, instanced props, colliders, lights, water and the lift. Everything here lives ~87 m below the
// penthouse, in the same world coordinates, so the penthouse's rear windows look straight down onto it.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { GROUPS } from '../CameraRig.jsx'
import { interactionGroups } from '@react-three/rapier'
import { world, OFF } from '../world.js'
import { camStore } from '../camStore.js'
import { LIVE } from '../atmosphere.js'
import { discoStore } from '../discoveries.js'
import { buildStreet, BX, hash } from './plan.js'
import { GY } from './geo.js'
import * as T from './textures.js'
import * as P from './props.js'

const WORLDG = interactionGroups([GROUPS.world])
const DETAIL_DIST = 130, CHUNK_DIST = 420

// ---------------------------------------------------------------- materials
function makeMaterials() {
  const std = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, ...o })
  const off = (n) => ({ polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n })
  const M = {
    brick: std({ map: T.brickTex() }), ashlar: std({ map: T.ashlarTex() }), plaster: std({ map: T.plasterTex() }),
    trim: std({ roughness: 0.8 }), roof: std({ roughness: 0.78 }), metal: std({ roughness: 0.42, metalness: 0.65 }), wood: std({ roughness: 0.62 }),
    shopin: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true }), shopglass: new THREE.MeshStandardMaterial({ color: '#cfe0e4', transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0, envMapIntensity: 2.6, depthWrite: false }), glass: std({ roughness: 0.1, metalness: 0.0, envMapIntensity: 1.8 }), glow: Object.assign(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), { userData: { glow: true } }),
    awning: std({ side: THREE.DoubleSide, roughness: 0.95 }), leaf: std({ roughness: 1 }), trunk: std({ roughness: 1 }),
    sign: std({ map: T.signAtlas(), roughness: 0.65 }),
    grass: std({ map: T.grassTex(), roughness: 1 }),
    slab: std({ map: T.slabTex(), bumpMap: T.slabTex(), bumpScale: 1.2, ...off(1) }), sett: std({ map: T.settTex(), bumpMap: T.settTex(), bumpScale: 2.2, ...off(1) }), road: std({ map: T.asphaltTex(), roughness: 0.96, ...off(1) }), gravel: std({ map: T.gravelTex(), roughness: 1, ...off(1) }),
    slab2: std({ map: T.slabTex(), ...off(2) }), sett2: std({ map: T.settTex(), ...off(2) }), road2: std({ map: T.asphaltTex(), roughness: 0.96, ...off(2) }), gravel2: std({ map: T.gravelTex(), roughness: 1, ...off(2) }),
    paint: std({ roughness: 0.9, ...off(3) }),
  }
  for (const k of ['slab', 'sett', 'road', 'gravel', 'slab2', 'sett2', 'road2', 'gravel2', 'grass']) { M[k].map.repeat.set(1, 1) }
  return M
}
const NOSHADOW = new Set(['glow', 'shopin', 'sign', 'paint', 'grass', 'slab', 'sett', 'road', 'gravel', 'slab2', 'sett2', 'road2', 'gravel2'])
const GROUND = new Set(['grass', 'slab', 'sett', 'road', 'gravel', 'slab2', 'sett2', 'road2', 'gravel2', 'paint'])

// ---------------------------------------------------------------- water
function rippleNormal() {
  const N = 128, h = new Float32Array(N * N), cv = document.createElement('canvas'); cv.width = cv.height = N
  const g = cv.getContext('2d'), img = g.createImageData(N, N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x / N) * Math.PI * 2, v = (y / N) * Math.PI * 2
    h[y * N + x] = Math.sin(u * 3 + Math.sin(v * 2) * 1.2) * 0.5 + Math.sin(v * 4 + u) * 0.35 + Math.sin((u + v) * 5) * 0.2
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x]
    const nx = -dx * 0.9, ny = -dy * 0.9, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * N + x) * 4
    img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}

// ---------------------------------------------------------------- shared build (visuals live in the exterior group, physics in the Physics tree)
let _built = null
export const getStreet = () => {
  if (!_built) { const t0 = performance.now(); _built = buildStreet(); _built.ms = performance.now() - t0 }
  return _built
}
const _v = new THREE.Vector3(), _s = new THREE.Vector3()
const TREE_DIST = 95        // street metres: trees beyond this are not drawn (the neighbourhood is ~210 x 270 m; distant crowns are lost in fog / haze)

// ---------------------------------------------------------------- visuals: mounted INSIDE the Skyline's exterior group so it shares its transform
// (scale 1/6 + eye offset seen from the penthouse, 1:1 at the origin when the player is on the street)
export function StreetVisuals() {
  const built = useMemo(getStreet, [])
  const M = useMemo(makeMaterials, [])
  const dot = useMemo(T.dotTex, []), pool = useMemo(T.poolTex, [])
  const { camera } = useThree()
  const groups = useRef([])
  const uTime = useRef({ value: 0 })
  const lift = useRef({ l: null, r: null, t: 0, target: 0 })
  const lightRefs = useRef([])
  const treeRoot = useRef(null)
  const normalMap = useMemo(rippleNormal, [])

  const chunkMeshes = useMemo(() => {
    const out = []
    for (const [name, ch] of Object.entries(built.chunks)) {
      const meshes = []
      for (const [key, acc] of Object.entries(ch.b)) {
        if (!acc.k) continue
        const isDetail = key.endsWith('+'), mk = isDetail ? key.slice(0, -1) : key
        const mat = M[mk] || M.trim
        meshes.push({ key, geo: acc.geometry(), mat, detail: isDetail, cast: !NOSHADOW.has(mk) && !GROUND.has(mk), receive: mk !== 'glow' && mk !== 'shopin', order: GROUND.has(mk) ? 0 : 1 })
      }
      if (meshes.length) {
        const all = new THREE.Box3(); meshes.forEach((m) => { m.geo.computeBoundingBox(); all.union(m.geo.boundingBox) })
        out.push({ name, meshes, sph: all.getBoundingSphere(new THREE.Sphere()) })
      }
    }
    return out
  }, [built, M])

  const props = useMemo(() => {
    const mats = { metal: M.metal, glow: M.glow, wood: M.wood, trim: M.trim, leaf: M.leaf, glass: M.glass }
    const makeSet = (geos, list) => {
      const arr = []
      for (const [k, g] of Object.entries(geos)) {
        const m = new THREE.InstancedMesh(g, mats[k] || M.trim, Math.max(1, list.length)); m.count = list.length
        const o = new THREE.Object3D()
        list.forEach(([x, y, z, ry, s], i) => { o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.setScalar(s); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
        m.castShadow = k !== 'glow'; m.receiveShadow = k !== 'glow'; m.instanceMatrix.needsUpdate = true; m.frustumCulled = false
        arr.push(m)
      }
      return arr
    }
    const sets = [
      ...makeSet(P.lampGeo(4.8), built.inst.lamp), ...makeSet(P.benchGeo(), built.inst.bench), ...makeSet(P.bollardGeo(), built.inst.bollard), ...makeSet(P.pathLightGeo(), built.inst.pathLight),
      ...makeSet(P.tableGeo(), built.inst.table), ...makeSet(P.chairGeo(), built.inst.chair), ...makeSet(P.urnGeo(), built.inst.urn),
      ...makeSet(P.carGeo('#7d8794'), built.inst.car1), ...makeSet(P.carGeo('#8b9482'), built.inst.car2), ...makeSet(P.carGeo('#d6cdbc'), built.inst.car3), ...makeSet(P.carGeo('#6a3f46'), built.inst.car4),
      ...makeSet(P.bikeGeo(), built.inst.bike), ...makeSet(P.shrubGeo(), built.inst.shrub), ...makeSet(P.grassGeo(), built.inst.grass), ...makeSet(P.planterGeo(), built.inst.planter),
    ]
    const palette = ['#86a84e', '#729a46', '#9ab458', '#63914a', '#a8bb55', '#70a050', '#8cab45']
    let sd = 91; const R = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296 }
    const trees = [], treeSets = [], leafTex = P.leafTexture()
    for (const kind of ['plane', 'ornamental', 'clipped']) {
      const list = built.inst[kind]; if (!list.length) continue
      const g = P.treeGeo(kind), trunk = new THREE.InstancedMesh(g.trunk, M.trunk, list.length), canopy = new THREE.InstancedMesh(g.canopy, null, list.length)
      const cm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide, map: leafTex, alphaTest: 0.5 })
      cm.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = uTime.current
        sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;'))
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
            float sw = clamp(position.y / 8.0, 0.0, 1.0);
            transformed.x += sin(uTime * 0.9 + ph) * 0.07 * sw + sin(uTime * 2.3 + ph * 1.7 + position.z) * 0.025 * sw;
            transformed.z += cos(uTime * 0.75 + ph * 1.3) * 0.06 * sw;`)
      }
      canopy.material = cm
      canopy.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.5 })   // leaf-shaped shadows, not card-shaped
      const o = new THREE.Object3D(), mats = [], cols = []
      list.forEach(([x, y, z, ry, s], i) => {
        o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.setScalar(s); o.updateMatrix(); mats.push(o.matrix.clone()); trunk.setMatrixAt(i, o.matrix); canopy.setMatrixAt(i, o.matrix)
        const cc = new THREE.Color(palette[(R() * palette.length) | 0]).multiplyScalar(0.86 + R() * 0.3); cols.push(cc); canopy.setColorAt(i, cc)
      })
      treeSets.push({ trunk, canopy, list, mats, cols, order: list.map((_, i) => i) })
      for (const m of [trunk, canopy]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false }
      trees.push(trunk, canopy)
    }
    const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const pm = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, userData: { noTint: true } }), Math.max(1, built.pools.length))
    pm.count = built.pools.length
    const o = new THREE.Object3D()
    built.pools.forEach(([x, z, r, y], i) => { o.position.set(x, (y ?? GY) + 0.06, z); o.scale.set(r * 2, 1, r * 2); o.updateMatrix(); pm.setMatrixAt(i, o.matrix) })
    pm.frustumCulled = false; pm.renderOrder = 2
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(built.halos.flat(), 3))
    return { sets, trees, treeSets, pm, hg }
  }, [built, M, pool])

  const liftGeo = useMemo(() => new THREE.BoxGeometry(0.93, 2.55, 0.05), [])
  const liftMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a6d44', roughness: 0.4, metalness: 0.75 }), [])
  const waterMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d4a63', roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.88, normalMap, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 1.6 }), [normalMap])
  const jetRefs = useRef([]), haloMat = useRef()
  const last = useRef(-1)

  useEffect(() => {
    const L = lift.current
    world.liftDoor = L
    return () => { world.liftDoor = null }
  }, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime, step = Math.min(dt, 0.05), L = lift.current
    uTime.current.value = t
    L.t = Math.max(0, Math.min(1, L.t + Math.sign(L.target - L.t) * step / 0.9))
    if (L.l) { const k = L.t * L.t * (3 - 2 * L.t); L.l.position.x = BX - 0.465 - k * 0.95; L.r.position.x = BX + 0.465 + k * 0.95 }
    normalMap.offset.x = (t * 0.012) % 1; normalMap.offset.y = (t * 0.007) % 1
    jetRefs.current.forEach((m) => { if (!m) return; const s = 0.82 + 0.18 * Math.sin(t * 2.1 + m.userData.k * 1.7); m.scale.y = s; m.position.y = m.userData.y + (s * 1.5) / 2 })
    const onStreet = world.level === 'street'
    M.shopin.color.setScalar(0.55 + 0.62 * Math.min(1, LIVE.win))                                        // interiors read dim by day, glow at dusk
    for (const l of lightRefs.current) if (l) l.intensity = onStreet ? l.userData.i * LIVE.lamp : 0
    if (props.pm) props.pm.material.opacity = Math.min(1, LIVE.lamp); if (haloMat.current) haloMat.current.opacity = Math.min(1, LIVE.lamp)           // (kept in the scene so toggling levels never recompiles shaders)
    if (t - last.current > 0.3) {                                                                 // chunk culling + detail LOD, a few times a second
      last.current = t
      if (treeRoot.current) {                                                                      // tree LOD: draw only the trees within TREE_DIST of the camera, nearest first
        treeRoot.current.worldToLocal(_v.copy(camera.position)); const sc = treeRoot.current.getWorldScale(_s).x, lim = (world.level === 'street' ? TREE_DIST : 45) ** 2
        for (const ts of props.treeSets) {
          const d = ts.list.map(([x, , z]) => (x - _v.x) ** 2 + (z - _v.z) ** 2)
          ts.order.sort((a, b) => d[a] - d[b]); let n = 0
          ts.order.forEach((src, k) => { ts.trunk.setMatrixAt(k, ts.mats[src]); ts.canopy.setMatrixAt(k, ts.mats[src]); ts.canopy.setColorAt(k, ts.cols[src]); if (d[src] < lim) n = k + 1 })
          ts.trunk.count = ts.canopy.count = n; ts.trunk.instanceMatrix.needsUpdate = ts.canopy.instanceMatrix.needsUpdate = true; ts.canopy.instanceColor.needsUpdate = true
        }
        void sc
      }
      for (const g of groups.current) {
        if (!g) continue
        const c = g.userData.sph, sc = g.getWorldScale(_s).x
        const d = camera.position.distanceTo(g.localToWorld(_v.copy(c.center))) - c.radius * sc
        g.visible = d < CHUNK_DIST * sc
        const near = d < DETAIL_DIST * sc
        for (const m of g.children) if (m.userData.detail) m.visible = near
      }
    }
  })

  useEffect(() => { window.__street = { built, stats: built.stats, ms: built.ms, tris: Object.values(built.stats).reduce((a, b) => a + b, 0) } }, [built])

  return (
    <>
      {!OFF.has('schunks') && chunkMeshes.map((c, i) => (
        <group key={c.name} ref={(g) => { if (g) { g.userData.sph = c.sph; groups.current[i] = g } }}>
          {c.meshes.map((m) => <mesh key={m.key} geometry={m.geo} material={m.mat} castShadow={m.cast} receiveShadow={m.receive} userData={{ detail: m.detail }} renderOrder={m.order} />)}
        </group>
      ))}
      {!OFF.has('sprops') && props.sets.map((m, i) => <primitive key={'s' + i} object={m} />)}
      <group ref={treeRoot}>{!OFF.has('strees') && props.trees.map((m, i) => <primitive key={'t' + i} object={m} />)}</group>
      <primitive object={props.pm} />
      <points geometry={props.hg} frustumCulled={false}><pointsMaterial ref={haloMat} userData={{ noTint: true }} size={3.4} sizeAttenuation={false} map={dot} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
      <mesh ref={(m) => { lift.current.l = m }} geometry={liftGeo} material={liftMat} position={[BX - 0.465, GY + 1.3, 4.78]} castShadow />
      <mesh ref={(m) => { lift.current.r = m }} geometry={liftGeo} material={liftMat} position={[BX + 0.465, GY + 1.3, 4.78]} castShadow />
      {built.waters.map((w, i) => (
        <mesh key={'w' + i} rotation={[-Math.PI / 2, 0, 0]} position={[w.x, w.y, w.z]} material={waterMat} renderOrder={3}>
          {w.kind === 'pool' ? <planeGeometry args={[w.w, w.d]} /> : <circleGeometry args={[w.r, 40]} />}
        </mesh>
      ))}
      {built.jets.map((j, i) => [0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2, r = k === 0 ? 0 : 0.5
        return <mesh key={'j' + i + k} ref={(m) => { if (m) { m.userData.y = j.y; m.userData.k = k; jetRefs.current[k] = m } }} position={[j.x + Math.cos(a) * r, j.y + 0.75, j.z + Math.sin(a) * r]}><cylinderGeometry args={[0.025, 0.05, 1.5, 6]} /><meshStandardMaterial color="#e8eef6" transparent opacity={0.55} roughness={0.2} /></mesh>
      }))}
      {built.lightsAt.map((l, i) => <pointLight key={'l' + i} ref={(p) => { if (p) { p.userData.i = l.intensity; lightRefs.current[i] = p } }} position={[l.x, l.y, l.z]} color={l.color} intensity={0} distance={l.distance} decay={1.6} />)}
    </>
  )
}

// ---------------------------------------------------------------- physics: street-level colliders (world coordinates = plan coordinates, 1:1)
export function StreetPhysics() {
  const built = useMemo(getStreet, [])
  const cols = useMemo(() => {
    const out = [...built.colliders]
    const add = (list, hx, hy, tag) => list.forEach(([x, y, z]) => out.push({ x, y: y + hy, z, hx, hy, hz: hx, rot: 0, tag }))
    for (const k of ['plane', 'ornamental', 'clipped']) add(built.inst[k], k === 'clipped' ? 0.12 : 0.26, 2.0, 'trunk')
    add(built.inst.lamp, 0.2, 2.0, 'lamp'); for (const k of ['car1', 'car2', 'car3', 'car4']) built.inst[k].forEach(([x, y, z, ry]) => out.push({ x, y: y + 0.7, z, hx: 0.95, hy: 0.7, hz: 2.1, rot: ry, tag: 'car' })); built.inst.planter.forEach(([x, y, z, ry]) => out.push({ x, y: y + 0.35, z, hx: 0.55, hy: 0.35, hz: 0.4, rot: ry, tag: 'planter' })); add(built.inst.bollard, 0.14, 0.4, 'bollard'); add(built.inst.pathLight, 0.1, 0.4, 'pathlight')
    return out
  }, [built])
  useEffect(() => {
    const it = {
      id: 'lift', label: 'lift', level: 'street', x: BX, z: 8.2, range: 3.8,
      prompt: () => '🛗 Take the lift up to the penthouse',
      isOpen: () => !!(world.liftDoor && world.liftDoor.target === 1),
      toggle: () => { if (camStore.get().transition !== 'idle') return false; world.rideLift && world.rideLift('up'); return false },
    }
    const ds = built.discoveries.map((d) => ({
      id: 'disc-' + d.id, label: d.label, level: 'street', x: d.x, z: d.z, range: 2.2,
      prompt: () => (discoStore.has(d.id) ? '✨ ' + d.label + ' (found)' : '✨ Look closer'),
      isOpen: () => discoStore.has(d.id),
      toggle: () => (discoStore.add(d.id) ? '✨ Found ' + d.label : false),
    }))
    world.interactables.push(it, ...ds)
    world.streetColliders = cols.length
    return () => { for (const x of [it, ...ds]) { const i = world.interactables.indexOf(x); if (i >= 0) world.interactables.splice(i, 1) } }
  }, [cols])
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[110, 1, 140]} position={[-22, GY - 1, -10]} collisionGroups={WORLDG} />
      {cols.map((c, i) => c.cyl
        ? <CylinderCollider key={i} args={[c.hy, c.r]} position={[c.x, c.y, c.z]} collisionGroups={WORLDG} />
        : <CuboidCollider key={i} args={[c.hx, c.hy, c.hz]} position={[c.x, c.y, c.z]} {...(c.q ? { quaternion: c.q } : { rotation: [0, c.rot || 0, 0] })} collisionGroups={WORLDG} />)}
    </RigidBody>
  )
}
void hash
