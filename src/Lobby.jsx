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
const CYL = new Set(['ceramic', 'ceramic2'])
const TILE = { bookA: 0.12, bookB: 0.12, bookC: 0.12, bookD: 0.12, paper: 0.03, paperF: 0.03, label: 0.03, ceramic: 0.2, ceramic2: 0.2, ivy1: 0.06, ivy2: 0.06, stem: 0.05, bronze: 0.12, shade: 0.12 }
function kit(name) {
  if (cache[name]) return cache[name]
  const o = {}
  for (const [bucket, d] of Object.entries(KIT[name] || DEC[name])) {
    const n = d.p.length / 3, uv = new Float32Array(n * 2), P = new Float32Array(n * 3); P.set(d.p)
    if (!KIT[name] && d.uv && d.uv.length === n * 2) uv.set(d.uv)                  // baked per-blade UVs (u across, v along): leaves and petals carry whole-leaf textures
    else if (!KIT[name] && CYL.has(bucket)) {                          // lathed ceramics: cylindrical projection about the kit's vertical axis (no seams between box faces)
      for (let t = 0; t < n; t += 3) {
        const a = [0, 1, 2].map((k) => Math.atan2(P[(t + k) * 3], P[(t + k) * 3 + 2])), lo = Math.min(...a), hi = Math.max(...a)
        for (let k = 0; k < 3; k++) { const an = hi - lo > Math.PI && a[k] < 0 ? a[k] + 2 * Math.PI : a[k]; uv[(t + k) * 2] = (an * 0.06) / 0.2; uv[(t + k) * 2 + 1] = P[(t + k) * 3 + 1] / 0.2 }
      }
    } else if (!KIT[name] && TILE[bucket]) {                                  // decor kits: per-triangle box projection, uv in tiles (1 tile = TILE[bucket] metres)
      const T = TILE[bucket]
      for (let t = 0; t < n; t += 3) {
        const a = t * 3, ux = P[a + 3] - P[a], uy = P[a + 4] - P[a + 1], uz = P[a + 5] - P[a + 2], vx = P[a + 6] - P[a], vy = P[a + 7] - P[a + 1], vz = P[a + 8] - P[a + 2]
        const nx = Math.abs(uy * vz - uz * vy), ny = Math.abs(uz * vx - ux * vz), nz = Math.abs(ux * vy - uy * vx)
        for (let k = 0; k < 3; k++) { const x = P[a + k * 3], y = P[a + k * 3 + 1], z = P[a + k * 3 + 2]; let u, v; if (ny >= nx && ny >= nz) { u = x; v = z } else if (nx >= nz) { u = z; v = y } else { u = x; v = y }; uv[(t + k) * 2] = u / T; uv[(t + k) * 2 + 1] = v / T }
      }
    } else for (let i = 0; i < n; i++) { if (bucket === 'top') { uv[i * 2] = P[i * 3]; uv[i * 2 + 1] = P[i * 3 + 2] } else if (bucket === 'rug') { uv[i * 2] = P[i * 3] / 1.56 + 0.5; uv[i * 2 + 1] = P[i * 3 + 2] / 1.56 + 0.5 } else { uv[i * 2] = P[i * 3] + P[i * 3 + 2]; uv[i * 2 + 1] = P[i * 3 + 1] } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); o[bucket] = toCreasedNormals(g, 0.7)
  }
  return (cache[name] = o)
}

// Back-lit petal look without transmission: double-sided, a touch of opacity, and a view-dependent glow (thin edges / grazing angles glow, like light through a petal).
function petalMat(m, tint) {
  m.side = THREE.DoubleSide; m.transparent = true; m.opacity = 0.94
  const c = new THREE.Color(tint)
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPetal = { value: c }
    sh.fragmentShader = 'uniform vec3 uPetal;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uPetal * (0.22 + 0.55 * pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.6));')
  }
  m.customProgramCacheKey = () => 'petal' + tint
  return m
}

// decor material helper: colour map + the same canvas as a bump map, tiled per TILE metres
const dm = (t, o) => { const { bump = 0.5, ...r } = o; const m = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: bump, color: '#ffffff', ...r }); return m }

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
      ivy1: ww('WW_FOLIAGE_FOREST', { map: LT.leafTex('#dfeec8', 9), side: THREE.DoubleSide, roughness: 0.55 }, 'lobbyIvy1'), ivy2: ww('WW_FOLIAGE_OLIVE', { map: LT.leafTex('#ecf2c2', 12), side: THREE.DoubleSide, roughness: 0.55 }, 'lobbyIvy2'),
      stem: ww('WW_BARK', { map: LT.barkTex(), color: '#ffffff', roughness: 1 }, 'lobbyStem'),
      bloom1: petalMat(ww('WW_FLOWER_PINK_MUTED', { map: LT.petalTex('#ffc4d2', 1), roughness: 0.7 }, 'lobbyB1'), '#ff9fb4'), bloom2: petalMat(ww('WW_FLOWER_PINK_MUTED', { map: LT.petalTex('#fff0f3', 2), color: wwColor('WW_FLOWER_PINK_MUTED', true).lerp(new THREE.Color('#fff4f0'), 0.55), roughness: 0.7 }, 'lobbyB2'), '#ffd3dc'),
      cove: new THREE.MeshBasicMaterial({ color: new THREE.Color(wwHex('WW_LAMP_WARM')).multiplyScalar(0.7), toneMapped: false }),                        // Task 003: softer than the bare LED tube
      frame: new THREE.MeshStandardMaterial({ color: '#d6c9b3', roughness: 0.62, envMapIntensity: 0.3 }),
      rod: new THREE.MeshStandardMaterial({ color: '#fff4de', emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0.85, roughness: 0.3, toneMapped: false }),
      bronze: new THREE.MeshStandardMaterial({ map: LT.bronzeBrushed(), bumpMap: LT.bronzeBrushed(), bumpScale: 0.4, color: '#ffffff', metalness: 1, roughness: 0.42, envMapIntensity: 1.1 }),
      shade: new THREE.MeshStandardMaterial({ color: '#d9b87c', emissive: new THREE.Color('#ffcf94'), emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }),
      ceramic: dm(LT.glazeTex('#efe6d8', '#6a5238', 5), { roughness: 0.3, bump: 0.12 }),
      niche: new THREE.MeshStandardMaterial({ map: (() => { const t = LT.marbleFeature(); t.repeat.set(0.62, 0.62); return t })(), color: '#eadfce', roughness: 0.28, envMapIntensity: 0.6 }),
      nicheMirror: new THREE.MeshStandardMaterial({ map: (() => { const t = LT.marbleFeature(); t.repeat.set(0.62, 0.62); return t })(), color: '#eadfce', roughness: 0.28, envMapIntensity: 0.6, side: THREE.DoubleSide }),
      burgundy: dm(LT.glazeTex('#682D3E', '#2a0f18', 7, false), { roughness: 0.82, bump: 0.15 }),     // main console vase: matte burgundy ceramic with a fine speckled body
      ceramic2: dm(LT.glazeTex('#cdbba4', '#4a3626', 6), { roughness: 0.55, bump: 0.2 }), paper: dm(LT.paperTex(true), { roughness: 0.9, bump: 0.5 }), paperF: dm(LT.paperTex(false), { roughness: 0.9, bump: 0.5 }), label: dm(LT.labelTex(), { roughness: 0.7, bump: 0.3 }),
      bookD: dm(LT.clothTex('#8a5f3a', 'leather', 4), { roughness: 0.62, bump: 0.35 }),
      rug2: new THREE.MeshStandardMaterial({ map: LT.rugRect(), roughness: 1 }),
      bookA: dm(LT.clothTex('#dccdb2', 'cloth', 1), { roughness: 0.85, bump: 0.8 }), bookB: dm(LT.clothTex('#5a4030', 'leather', 2), { roughness: 0.55, bump: 0.35 }), bookC: dm(LT.clothTex('#b3946a', 'cloth', 3), { roughness: 0.85, bump: 0.8 }),
      glass: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }),
      ceil: new THREE.MeshStandardMaterial({ color: wwColor('WW_CEILING_CREAM'), roughness: 0.95, emissive: new THREE.Color(wwHex('WW_LAMP_WARM')), emissiveMap: LT.ceilingGlow(), emissiveIntensity: 0.2 }),
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
    const rect = new THREE.Shape(); rect.moveTo(0, 0); rect.lineTo(0.425, 0); rect.lineTo(0.425, 2.29); rect.lineTo(0, 2.29); rect.lineTo(0, 0)
    const slab = ex(rect, 0.03)
    const pts = [[0.0, 0], [0.05, 0], [0.065, 0.04], [0.05, 0.1], [0.07, 0.16], [0.06, 0.2], [0.05, 0.215], [0.03, 0.22], [0, 0.22]].map(([x, y]) => new THREE.Vector2(x, y))
    const vase = new THREE.LatheGeometry(pts, 20)
    const ribs = []                                                                       // fluting on the two surround panels (lift wall, local frame: x across, z toward the room = -z)
    for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) { const x = sx * (0.6 + k * 0.042); const b = new THREE.BoxGeometry(0.022, 2.5, 0.014); b.translate(x, 1.31, -0.057); ribs.push(b) }
    return { arch, archGlow: glow, slab, vase, flutes: mergeGeometries(ribs) }
  }, [])
  const warm = '#ffe3c2', W2 = W / 2
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
      <Kit name="pf_tall" M={M} position={[0.075, 0.5, z0 + 0.01]} over={{ trim: M.frame }} /><Kit name="pf_tall" M={M} position={[2.325, 0.5, z0 + 0.01]} over={{ trim: M.frame }} />
      <Kit name="pf_tall" M={M} position={[x0 + 0.0, 0.5, 0.82]} rotY={Math.PI / 2} scale={[0.82, 1, 1]} over={{ trim: M.frame }} />
      <Kit name="pf_tall" M={M} position={[x1 - 0.0, 0.5, 1.0]} rotY={-Math.PI / 2} scale={[0.9, 1, 1]} over={{ trim: M.frame }} />

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
      <Kit name="bloom_vase" M={M} position={[x0 + 0.22, 0.82, 1.6]} over={{ ceramic: M.burgundy }} />
      <Kit name="lamp" M={M} position={[x0 + 0.2, 0.82, 2.32]} />
      <Kit name="vase_bottle" M={M} position={[x0 + 0.2, 0.82, 2.02]} scale={[0.85, 0.85, 0.85]} />

      {/* ---- right wall (Task 003): marble feature slab + three walnut shelves with soft under-light, restrained styling ---- */}
      {/* book-matched marble feature wall: two mirrored halves, bronze perimeter trim and a centre joint */}
      <group position={[x1 - 0.002, 0.14, 2.35]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={G.slab} position={[0, 0, 0]} material={M.niche} receiveShadow />
        <mesh geometry={G.slab} position={[0, 0, 0]} scale={[-1, 1, 1]} material={M.nicheMirror} receiveShadow />
        {[[0, 2.3, 0.87, 0.016], [0, 0.0, 0.87, 0.016], [-0.435, 1.15, 0.016, 2.3], [0.435, 1.15, 0.016, 2.3], [0, 1.15, 0.006, 2.3]].map(([x, y, w, hh], i) => <mesh key={'sl' + i} position={[x, y, 0.036]} material={M.bronze}><boxGeometry args={[w, hh, i === 4 ? 0.006 : 0.014]} /></mesh>)}
      </group>
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
