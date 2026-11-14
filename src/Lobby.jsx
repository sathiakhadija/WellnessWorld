// Private penthouse lift lobby (Design Bible s05, pp.16-20): a compact enclosed vestibule behind the entrance door — NOT the public lobby (s06).
// Dimensions resolved against the real door: opening x 0.55..1.85, wall z 0..0.4, door head 3.1 m  =>  room x -0.4..2.8 (3.2 m) x z 0.4..2.8 (2.4 m) x 3.1 m high (guide 3.0-3.5 x 2.2-2.5 x 2.7-3.0).
// Materials come from the palette registry (WW_PLASTER_BLUSH, WW_MARBLE_*, WW_BRASS_ANTIQUE …). Geometry kit baked in Blender (assets/blender/make_lobby.py -> src/baked/lobby.json).
// Function: working lift doors (two sliding leaves) + a cab behind them, call/ride interaction, indicator, entrance door unchanged. Rides use the existing world.rideLift transition.
import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import * as THREE from 'three'
import { toCreasedNormals, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ww, wwColor, wwHex } from './palette.js'
import KIT from './baked/lobby.json'
import DEC from './baked/lobby_decor.json'
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
  for (const [bucket, d] of Object.entries(KIT[name] || DEC[name])) {
    const n = d.p.length / 3, uv = new Float32Array(n * 2), P = new Float32Array(n * 3); P.set(d.p)
    for (let i = 0; i < n; i++) { if (bucket === 'top') { uv[i * 2] = P[i * 3]; uv[i * 2 + 1] = P[i * 3 + 2] } else if (bucket === 'rug') { uv[i * 2] = P[i * 3] / 1.56 + 0.5; uv[i * 2 + 1] = P[i * 3 + 2] / 1.56 + 0.5 } else { uv[i * 2] = P[i * 3] + P[i * 3 + 2]; uv[i * 2 + 1] = P[i * 3 + 1] } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); o[bucket] = toCreasedNormals(g, 0.7)
  }
  return (cache[name] = o)
}

function useMats() {
  return useMemo(() => {
    const brass = ww('WW_BRASS_ANTIQUE', { color: wwColor('WW_BRASS_ANTIQUE', true).lerp(new THREE.Color('#cdbb98'), 0.4), roughness: 0.4, metalness: 1, envMapIntensity: 1.3 }, 'lobbyBrass')
    const warm = new THREE.MeshBasicMaterial({ color: wwHex('WW_LAMP_WARM'), toneMapped: false })
    const marbleL = LT.marbleLight(true, true), marbleD = LT.marbleDark(), gold = LT.brushedGold(); gold.wrapS = gold.wrapT = THREE.RepeatWrapping
    return {
      blush: ww('WW_PLASTER_BLUSH', { map: LT.plaster(), roughness: 0.88, color: new THREE.Color('#dfd5c6'), envMapIntensity: 0.3 }, 'lobbyIvory'),               // Task 003: warm ivory limewash (was dark blush)
      trim: ww('WW_LIMESTONE_CREAM', { color: wwColor('WW_LIMESTONE_CREAM', true), roughness: 0.5 }, 'lobbyTrim'),
      floor: ww('WW_MARBLE_LIGHT', { map: marbleL, roughness: 0.32, envMapIntensity: 0.22, color: new THREE.Color('#fff1e0') }, 'lobbyFloor'),   // Task 003: calmer reflections
      marble: ww('WW_MARBLE_DARK', { map: LT.walnut(), color: new THREE.Color('#ffffff'), roughness: 0.55, envMapIntensity: 0.5 }, 'lobbyWalnut'),            // Task 003: the lift surround is dark walnut (bucket name kept from the old dark-marble kit)
      top: ww('WW_MARBLE_LIGHT', { map: (() => { const t = LT.marbleFeature(); t.repeat.set(0.8, 0.8); return t })(), roughness: 0.3 }, 'lobbyTop2'),
      flute: ww('WW_LIMESTONE_CREAM', { roughness: 0.62 }, 'lobbyFlute'),
      gold: ww('WW_BRASS_ANTIQUE', { color: wwColor('WW_BRASS_ANTIQUE', true).lerp(new THREE.Color('#d6c7a6'), 0.5), map: gold, roughness: 0.46, metalness: 1, envMapIntensity: 1.2 }, 'lobbyGold'),   // brushed champagne, not mirror gold
      brass, dark: ww('WW_IRONWORK_CHARCOAL', { roughness: 0.45, metalness: 0.4 }, 'lobbyDark2'),
      tube: warm, wax: ww('WW_LIMESTONE_CREAM', { roughness: 0.6 }, 'lobbyWax'),
      rug: ww('WW_RUG_CREAM', { map: LT.rugTex(), roughness: 1 }, 'lobbyRug'),
      ivy1: ww('WW_FOLIAGE_FOREST', { side: THREE.DoubleSide, roughness: 0.7 }, 'lobbyIvy1'), ivy2: ww('WW_FOLIAGE_OLIVE', { side: THREE.DoubleSide, roughness: 0.7 }, 'lobbyIvy2'),
      stem: ww('WW_BARK', { roughness: 1 }, 'lobbyStem'),
      bloom1: ww('WW_FLOWER_PINK_MUTED', { roughness: 0.85 }, 'lobbyB1'), bloom2: ww('WW_FLOWER_PINK_MUTED', { color: wwColor('WW_FLOWER_PINK_MUTED', true).lerp(new THREE.Color('#fff4f0'), 0.55), roughness: 0.85 }, 'lobbyB2'),
      cove: new THREE.MeshBasicMaterial({ color: new THREE.Color(wwHex('WW_LAMP_WARM')).multiplyScalar(0.78), toneMapped: false }),                        // Task 003: softer than the bare LED tube
      rod: new THREE.MeshStandardMaterial({ color: '#fff4de', emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0.85, roughness: 0.3, toneMapped: false }),
      bronze: new THREE.MeshStandardMaterial({ color: '#8a6a45', metalness: 1, roughness: 0.42, envMapIntensity: 1.1 }),
      shade: new THREE.MeshStandardMaterial({ color: '#d9b87c', emissive: new THREE.Color('#ffcf94'), emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }),
      ceramic: new THREE.MeshStandardMaterial({ color: '#efe6d8', roughness: 0.35 }),
      niche: new THREE.MeshStandardMaterial({ map: (() => { const t = LT.marbleFeature(); t.repeat.set(0.62, 0.62); return t })(), color: '#eadfce', roughness: 0.28, envMapIntensity: 0.6 }),
      ceramic2: new THREE.MeshStandardMaterial({ color: '#cdbba4', roughness: 0.42 }), paper: new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.9 }), bookD: new THREE.MeshStandardMaterial({ color: '#7d5a3c', roughness: 0.8 }),
      rug2: new THREE.MeshStandardMaterial({ map: LT.rugRect(), roughness: 1 }),
      bookA: new THREE.MeshStandardMaterial({ color: '#d9c9ae', roughness: 0.8 }), bookB: new THREE.MeshStandardMaterial({ color: '#4a3326', roughness: 0.8 }), bookC: new THREE.MeshStandardMaterial({ color: '#a98b63', roughness: 0.8 }),
      glass: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }),
      ceil: new THREE.MeshStandardMaterial({ color: wwColor('WW_CEILING_CREAM'), roughness: 0.95, emissive: new THREE.Color(wwHex('WW_LAMP_WARM')), emissiveMap: LT.ceilingGlow(), emissiveIntensity: 0.3 }),
      art: new THREE.MeshStandardMaterial({ map: LT.artTex(), roughness: 0.6 }),
      sign: new THREE.MeshBasicMaterial({ map: LT.liftSign(), transparent: true, toneMapped: false, depthWrite: false }),
      indicator: new THREE.MeshBasicMaterial({ map: LT.indicator('▲ PH'), toneMapped: false }),
      cabWall: ww('WW_BRASS_ANTIQUE', { color: wwColor('WW_BRASS_ANTIQUE', true), map: gold, roughness: 0.4, metalness: 0.9, side: THREE.DoubleSide, envMapIntensity: 1.6 }, 'lobbyCab'),
    }
  }, [])
}

function Kit({ name, M, position, rotY = 0, scale, castShadow = true, over = {} }) {
  const g = useMemo(() => kit(name), [name])
  return <group position={position} rotation={[0, rotY, 0]} scale={scale}>{Object.keys(g).map((k) => <mesh key={k} geometry={g[k]} material={over[k] || M[k] || M.trim} castShadow={castShadow && k !== 'tube'} receiveShadow />)}</group>
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

  const G = useMemo(() => {            // Task 003 procedural architecture (units = metres)
    const archShape = (w, h) => { const sh = new THREE.Shape(), r = w / 2; sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.lineTo(r, h - r); sh.absarc(0, h - r, r, 0, Math.PI, false); sh.lineTo(-r, 0); return sh }
    const ex = (sh, d) => new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 24 })
    const arch = ex(archShape(1.1, 2.41), 0.03); arch.translate(0, 0.14, 0)
    const glow = ex(archShape(1.17, 2.455), 0.012); glow.translate(0, 0.14, 0)
    const rect = new THREE.Shape(); rect.moveTo(-0.43, 0); rect.lineTo(0.43, 0); rect.lineTo(0.43, 2.31); rect.lineTo(-0.43, 2.31); rect.lineTo(-0.43, 0)
    const slab = ex(rect, 0.03)
    const pts = [[0.0, 0], [0.05, 0], [0.065, 0.04], [0.05, 0.1], [0.07, 0.16], [0.06, 0.2], [0.05, 0.215], [0.03, 0.22], [0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y))
    const vase = new THREE.LatheGeometry(pts, 20)
    const ribs = []                                                                       // fluting on the two surround panels (lift wall, local frame: x across, z toward the room = -z)
    for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) { const x = sx * (0.6 + k * 0.042); const b = new THREE.BoxGeometry(0.022, 2.5, 0.014); b.translate(x, 1.31, -0.057); ribs.push(b) }
    return { arch, archGlow: glow, slab, vase, flutes: mergeGeometries(ribs) }
  }, [])
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
      {[[x0 + 0.05, (z0 + z1) / 2, 0.1, D], [x1 - 0.05, (z0 + z1) / 2, 0.1, D]].map(([x, z, w, d], i) => <React.Fragment key={'cv' + i}><Box p={[x, h - 0.1, z]} s={[w, 0.12, d]} m={M.trim} /><Box p={[x + (i ? -0.02 : 0.02), h - 0.025, z]} s={[0.05, 0.05, d - 0.1]} m={M.cove} /></React.Fragment>)}
      {[[z0 + 0.05, 0], [z1 - 0.05, 1]].map(([z, i]) => <React.Fragment key={'cz' + i}><Box p={[cx, h - 0.1, z]} s={[W, 0.12, 0.1]} m={M.trim} /><Box p={[cx, h - 0.025, z + (i ? -0.02 : 0.02)]} s={[W - 0.1, 0.05, 0.05]} m={M.cove} /></React.Fragment>)}
      {[[0.1, 1.0], [2.3, 1.0], [0.1, 2.2], [2.3, 2.2]].map(([x, z], i) => <mesh key={'dl' + i} position={[x, h - 0.004, z]} rotation={[Math.PI / 2, 0, 0]} material={M.tube}><circleGeometry args={[0.05, 20]} /></mesh>)}

      {/* Task 003: slim moulded frames only where wall space is free (reference shows them beside the niche / entrance); the old frames behind the console / shelves stay gone */}
      <Kit name="pf_tall" M={M} position={[0.075, 0.5, z0 + 0.01]} /><Kit name="pf_tall" M={M} position={[2.325, 0.5, z0 + 0.01]} />
      <Kit name="pf_tall" M={M} position={[x0 + 0.0, 0.5, 0.82]} rotY={Math.PI / 2} scale={[0.82, 1, 1]} />
      <Kit name="pf_tall" M={M} position={[x1 - 0.0, 0.5, 1.0]} rotY={-Math.PI / 2} scale={[0.9, 1, 1]} />

      {/* ---- lift wall: dark marble surround, indicator, brass frame, doors, sign, call panel ---- */}
      <Kit name="lift_surround" M={M} position={[cx, 0, z1]} rotY={Math.PI} />
      <group position={[cx, 0, z1]} rotation={[0, Math.PI, 0]}>
        <group ref={leafL}><Kit name="lift_leaf" M={M} position={[0, 0, 0]} /></group>
        <group ref={leafR}><Kit name="lift_leaf" M={M} position={[0, 0, 0]} scale={[-1, 1, 1]} /></group>
      </group>
      <mesh position={[cx, 2.425, z1 - 0.0755]} rotation={[0, Math.PI, 0]} material={M.indicator}><planeGeometry args={[0.52, 0.15]} /></mesh>
      <mesh position={[-0.09, 1.66, z1 - 0.004]} rotation={[0, Math.PI, 0]} material={M.sign}><planeGeometry args={[0.6, 0.6]} /></mesh>
      <Kit name="call_panel" M={M} position={[2.5, 0.98, z1]} rotY={Math.PI} over={{ dark: M.bronze }} />
      {/* Task 003: restrained vertical fluting on the walnut surround panels + two slim vertical light blades (emissive; no extra lights) */}
      <mesh geometry={G.flutes} position={[cx, 0, z1]} material={M.marble} castShadow receiveShadow />
      {[-0.77, 0.77].map((dx, i) => (
        <group key={'sc' + i} position={[cx + dx, 1.5, z1 - 0.082]}>
          <Box p={[0, 0.15, 0]} s={[0.034, 0.26, 0.018]} m={M.tube} /><Box p={[0, -0.15, 0]} s={[0.034, 0.26, 0.018]} m={M.tube} /><Box p={[0, 0, 0.003]} s={[0.06, 0.04, 0.026]} m={M.bronze} />
          <Box p={[0, 0.34, 0.002]} s={[0.07, 0.03, 0.024]} m={M.bronze} /><Box p={[0, -0.34, 0.002]} s={[0.07, 0.03, 0.024]} m={M.bronze} />
        </group>
      ))}
      {/* two-tier fluted-glass ring light (Blender kit): hangs 0.35 m from the 3.1 m ceiling -> lowest point 2.75 m */}
      <Kit name="chandelier" M={M} position={[cx, h, 1.5]} over={{ rod: M.rod }} castShadow={false} />
      {/* cab behind the doors */}
      <group position={[cx, 0, z1 + 0.7 + 0.04]}>
        {[[-0.7, 1.2, 0, 0.04, 2.4, 1.4], [0.7, 1.2, 0, 0.04, 2.4, 1.4], [0, 1.2, 0.7, 1.4, 2.4, 0.04], [0, 2.4, 0, 1.4, 0.04, 1.4]].map(([x, y, z, sx, sy, sz], i) => <Box key={'cab' + i} p={[x, y, z]} s={[sx, sy, sz]} m={M.cabWall} />)}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.floor}><planeGeometry args={[1.4, 1.4]} /></mesh>
        <Box p={[0, 1.0, 0.66]} s={[1.2, 0.03, 0.03]} m={M.brass} />
        <pointLight ref={cabLight} position={[0, 2.2, 0]} color={warm} intensity={0.5} distance={3.2} decay={1.6} />
      </group>

      {/* ---- left wall (Task 003): shallow arched marble niche with a perimeter glow, curved fluted console, one bouquet, one lamp, one ceramic ---- */}
      <group position={[x0, 0, 1.95]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={G.archGlow} position={[0, 0, 0]} material={M.cove} />
        <mesh geometry={G.arch} position={[0, 0, 0.0]} material={M.niche} receiveShadow />
      </group>
      <Kit name="console" M={M} position={[x0, 0, 1.95]} rotY={Math.PI / 2} over={{ dark: M.bronze }} />
      <Kit name="bloom_vase" M={M} position={[x0 + 0.22, 0.82, 1.6]} />
      <Kit name="lamp" M={M} position={[x0 + 0.2, 0.82, 2.32]} />
      <Kit name="vase_bottle" M={M} position={[x0 + 0.2, 0.82, 2.02]} scale={[0.85, 0.85, 0.85]} />

      {/* ---- right wall (Task 003): marble feature slab + three walnut shelves with soft under-light, restrained styling ---- */}
      <mesh geometry={G.slab} position={[x1 - 0.002, 0.14, 2.35]} rotation={[0, -Math.PI / 2, 0]} material={M.niche} receiveShadow />
      <group position={[x1 - 0.03, 0, 2.35]} rotation={[0, -Math.PI / 2, 0]}>
        {[1.12, 1.56, 2.0].map((y, i) => <Kit key={'sh' + i} name="shelf2" M={M} position={[0, y, 0]} over={{ top: M.marble, brass: M.bronze, tube: M.cove }} />)}
        <Kit name="books_row" M={M} position={[-0.27, 1.156, 0.07]} />
        <Kit name="vase_round" M={M} position={[0.17, 1.156, 0.14]} />
        <Kit name="books_stack" M={M} position={[-0.12, 1.596, 0.08]} />
        <Kit name="vase_bottle" M={M} position={[0.2, 1.596, 0.13]} />
        <Kit name="pothos" M={M} position={[0.17, 2.036, 0.15]} />
        <Kit name="orb" M={M} position={[-0.17, 2.036, 0.14]} />
        <Kit name="globe" M={M} position={[0.065, 1.596, 0.15]} />
        <Kit name="candle" M={M} position={[-0.3, 1.596, 0.12]} />
      </group>

      <mesh position={[cx, 0.003, 1.55]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={M.rug2}><planeGeometry args={[1.9, 1.25]} /></mesh>

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
