// Architecture layer built in code on top of the V8 GLB (the GLB's old left wall + side cells are removed at load time, see PenthouseScene.jsx).
//   * left wall with two wide panelled double doors (bedroom, bathroom) that open and close, with colliders that follow the leaves
//   * bedroom + bathroom shells (floor, walls, ceiling, skirting, downlights, window) - deliberately UNFURNISHED
//   * a working sliding balcony door in the middle bay of the glazing, with a threshold ramp down to the balcony deck
// Coordinates are glTF/three.js metres: x right, y up, -z toward the river. Main room: x -4.45..3.61, z 0..-11.79, floor y = 0.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GROUPS } from './CameraRig.jsx'
import { world } from './world.js'
import { camStore, toast } from './camStore.js'

const WORLD = interactionGroups([GROUPS.world])
const GLASS = interactionGroups([GROUPS.glass])
const clamp01 = (t) => Math.max(0, Math.min(1, t))
const smooth = (t) => t * t * (3 - 2 * t)

// ------------------------------------------------------------------ floor plan
export const DOOR_H = 3.0
export const DOORS = [
  { id: 'bedroom',  label: 'bedroom door',  zc: -6.0,   w: 1.5 },
  { id: 'bathroom', label: 'bathroom door', zc: -10.05, w: 1.3 },
]
const SLIDER = { x0: -1.9, x1: 1.2, split: -0.35, z: -11.79 }   // middle bay of the far glazing: fixed half + sliding half (1.55 m clear opening)
const Y0 = -0.3, YT = 3.6, RC = 3.4                              // slab bottom, wall top, room ceiling (underside)

function buildArch() {
  const L = []
  const add = (k, x0, x1, y0, y1, z0, z1, col = false) => L.push({ k, col, b: [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1), Math.min(z0, z1), Math.max(z0, z1)] })

  // ---- main-room left wall (x -4.85 .. -4.45): solid bays between the doors + lintels over them
  const edges = [-12.14]
  for (const d of [...DOORS].sort((a, b) => a.zc - b.zc)) edges.push(d.zc - d.w / 2, d.zc + d.w / 2)
  edges.push(0.4)
  for (let i = 0; i < edges.length; i += 2) add('plaster', -4.85, -4.45, Y0, YT, edges[i], edges[i + 1], true)
  const segs = []
  for (let i = 0; i < edges.length; i += 2) segs.push([edges[i], edges[i + 1]])
  for (const d of DOORS) {
    const a = d.zc - d.w / 2, b = d.zc + d.w / 2
    add('plaster', -4.85, -4.45, DOOR_H, YT, a, b, true)                    // lintel
    add('stone', -4.85, -4.45, Y0, 0, a, b, true)                           // threshold
    add('trim', -4.85, -4.45, 0, DOOR_H, a - 0.0, a + 0.02)                 // reveal linings
    add('trim', -4.85, -4.45, 0, DOOR_H, b - 0.02, b + 0.0)
    add('trim', -4.85, -4.45, DOOR_H - 0.02, DOOR_H, a, b)
    // architrave (main-room face): jambs, head, cap moulding, plinth blocks; same on the room side
    for (const [xa, xb] of [[-4.45, -4.415], [-4.885, -4.85]]) {
      add('trim', xa, xb, 0, DOOR_H + 0.14, a - 0.14, a)
      add('trim', xa, xb, 0, DOOR_H + 0.14, b, b + 0.14)
      add('trim', xa, xb, DOOR_H, DOOR_H + 0.14, a - 0.14, b + 0.14)
      add('trim', xa < -4.5 ? xa - 0.012 : xa, xb > -4.5 ? xb + 0.012 : xb, DOOR_H + 0.14, DOOR_H + 0.2, a - 0.2, b + 0.2)
      add('trim', xa < -4.5 ? xa - 0.01 : xa, xb > -4.5 ? xb + 0.01 : xb, 0, 0.24, a - 0.17, a)
      add('trim', xa < -4.5 ? xa - 0.01 : xa, xb > -4.5 ? xb + 0.01 : xb, 0, 0.24, b, b + 0.17)
    }
  }

  // ---- main-room left wall dressing: skirting, cornice, raised-panel mouldings, fluted pilaster
  for (const [a, b] of segs) {
    const za = Math.max(a, -11.79), zb = Math.min(b, 0.05)
    if (zb - za < 0.2) continue
    add('skirt', -4.45, -4.415, 0, 0.18, za + (a < -11 ? 0 : 0.17), zb - (b > 0 ? 0 : 0.17))
    const len = zb - za - 0.6
    if (len > 0.7) {
      const n = Math.max(1, Math.round(len / 1.55)), gap = 0.22, pw = (len - (n - 1) * gap) / n
      for (let i = 0; i < n; i++) {
        const p0 = za + 0.3 + i * (pw + gap), p1 = p0 + pw
        const x0 = -4.45, x1 = -4.425, yb = 0.55, yt = 3.15, t = 0.05
        add('trim', x0, x1, yb, yb + t, p0, p1); add('trim', x0, x1, yt - t, yt, p0, p1)
        add('trim', x0, x1, yb, yt, p0, p0 + t); add('trim', x0, x1, yb, yt, p1 - t, p1)
      }
    }
  }
  {   // fluted pilaster in the bay between the doors
    const [a, b] = segs[1], zc = (a + b) / 2
    for (let i = -4; i <= 3; i++) add('trim', -4.45, -4.415, 0.25, 3.35, zc + i * 0.075 + 0.0, zc + i * 0.075 + 0.045)
    add('trim', -4.45, -4.40, 3.35, 3.42, zc - 0.34, zc + 0.34)
    add('trim', -4.45, -4.40, 0.18, 0.27, zc - 0.34, zc + 0.34)
  }
  add('trim', -4.45, -4.36, 3.66, 3.8, -11.79, 0.05); add('trim', -4.45, -4.40, 3.60, 3.66, -11.79, 0.05)   // cornice (as before)

  // ---- BEDROOM  interior x -9.65..-4.85, z -8.15..-3.85
  add('plaster', -9.85, -4.85, Y0, YT, -3.85, -3.65, true)                                  // north wall
  add('plaster', -9.85, -4.85, Y0, YT, -8.55, -8.15, true)                                  // partition with the bathroom
  add('floorBed', -9.65, -4.85, Y0, 0, -8.15, -3.85, true)
  add('ceilR', -9.85, -4.85, RC, YT, -8.55, -3.65)
  const wz0 = -7.35, wz1 = -4.65, wy0 = 0.6, wy1 = 2.95                                      // window opening in the back wall
  add('plaster', -9.85, -9.65, Y0, wy0, -8.55, -3.65, true); add('plaster', -9.85, -9.65, wy1, YT, -8.55, -3.65, true)
  add('plaster', -9.85, -9.65, wy0, wy1, -8.55, wz0, true); add('plaster', -9.85, -9.65, wy0, wy1, wz1, -3.65, true)
  add('stone', -9.95, -9.65, wy0 - 0.06, wy0, wz0 - 0.04, wz1 + 0.04)                        // sill
  for (const [z0, z1] of [[-8.15, -3.85]]) add('skirt', -9.65, -9.625, 0, 0.15, z0, z1)
  add('skirt', -9.625, -4.85, 0, 0.15, -3.875, -3.85); add('skirt', -9.625, -4.85, 0, 0.15, -8.15, -8.125)

  // ---- BATHROOM  interior x -8.45..-4.85, z -11.55..-8.55
  add('plaster', -8.65, -4.85, Y0, YT, -11.75, -11.55, true)                                // south wall
  add('plaster', -8.65, -8.45, Y0, YT, -11.75, -8.55, true)                                 // back wall
  add('floorBath', -8.45, -4.85, Y0, 0, -11.55, -8.55, true)
  add('ceilR', -8.65, -4.85, RC, YT, -11.75, -8.55)
  add('skirt', -8.45, -8.425, 0, 0.15, -11.55, -8.55); add('skirt', -8.45, -4.85, 0, 0.15, -11.575, -11.55); add('skirt', -8.45, -4.85, 0, 0.15, -8.55, -8.525)
  return L
}

function mergeByKey(list) {
  const by = {}
  for (const a of list) {
    const [x0, x1, y0, y1, z0, z1] = a.b
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    ;(by[a.k] ||= []).push(g)
  }
  const out = {}
  for (const k of Object.keys(by)) out[k] = mergeGeometries(by[k])
  return out
}

// merge [cx,cy,cz, sx,sy,sz] boxes
function boxes(list, matrix) {
  const gs = list.map(([cx, cy, cz, sx, sy, sz]) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(cx, cy, cz); return g })
  const g = mergeGeometries(gs)
  if (matrix) g.applyMatrix4(matrix)
  return g
}

function makeMats(src = {}) {
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o })
  return {
    plaster: src.WW_Plaster_Ivory_GAME || std('#eadfce'),
    trim: src.WW_Trim_Satin_GAME || std('#efe6d6', { roughness: 0.5 }),
    skirt: src.WW_Skirting_GAME || std('#efe6d6'),
    ceil: src.WW_Ceiling_Ivory_GAME || std('#f2eadc'),
    ceilR: src.WW_Ceiling_Ivory_GAME || std('#f2eadc'),
    frame: src.WW_Frame_Bronze_GAME || std('#33211a', { metalness: 0.7, roughness: 0.4 }),
    glass: src.WW_Glass_GAME,
    floorBed: std('#b5aa99', { roughness: 0.98 }),                                    // soft greige wool carpet (placeholder finish)
    floorBath: std('#e4dacb', { roughness: 0.25, envMapIntensity: 0.9 }),            // cream marble (placeholder finish)
    stone: std('#d8cab6', { roughness: 0.55 }),
    brass: std('#e2b559', { metalness: 1, roughness: 0.28, envMapIntensity: 3.2 }),
    downlight: new THREE.MeshBasicMaterial({ color: '#fff0d0', toneMapped: false }),
  }
}

// ------------------------------------------------------------------ doors
const HINGE_X = -4.65

const leafParts = (lw) => {
  const body = [[0, DOOR_H / 2, 0, 0.05, DOOR_H - 0.02, lw]], frame = [], brass = []
  const pw = lw - 0.32
  for (const sx of [1, -1]) for (const [yb, yt] of [[0.3, 1.3], [1.52, 2.74]]) {
    const x = sx * 0.0305, t = 0.012, s = 0.045
    frame.push([x, yb + s / 2, 0, t, s, pw], [x, yt - s / 2, 0, t, s, pw], [x, (yb + yt) / 2, -pw / 2 + s / 2, t, yt - yb, s], [x, (yb + yt) / 2, pw / 2 - s / 2, t, yt - yb, s])
    frame.push([sx * 0.0275, (yb + yt) / 2, 0, 0.006, yt - yb - 0.12, pw - 0.12])
  }
  return { body, frame, brass }
}

function Leaf({ lw, dir, hingeZ, M, rotRef, handleSide }) {
  const g = useMemo(() => {
    const p = leafParts(lw)
    return { body: boxes(p.body), frame: boxes(p.frame) }
  }, [lw])
  const brass = useMemo(() => {
    const list = []
    const hz = dir * (lw - 0.1)
    for (const sx of [1, -1]) { list.push([sx * 0.062, 1.05, hz, 0.012, 0.05, 0.05]); list.push([sx * 0.08, 1.05 + 0.0, hz - dir * 0.045, 0.034, 0.016, 0.115]) }   // rose + lever
    for (const y of [0.35, 1.5, 2.65]) list.push([0.0, y, 0.0, 0.032, 0.11, 0.032])                                            // hinges
    return boxes(list)
  }, [lw, dir])
  return (
    <group ref={rotRef} position={[HINGE_X, 0, hingeZ]}>
      <group position={[0, 0, dir * lw / 2]}>
        <mesh geometry={g.body} material={M.trim} castShadow receiveShadow />
        <mesh geometry={g.frame} material={M.trim} castShadow receiveShadow />
      </group>
      <mesh geometry={brass} material={M.brass} castShadow />
    </group>
  )
}

function Door({ d, M }) {
  const st = useRef({ t: 0, target: 0 })
  const l1 = useRef(), l2 = useRef()
  const blockRef = useRef(true)
  const [block, setBlock] = useState(true)
  const lw = d.w / 2 - 0.004
  useEffect(() => {
    const it = {
      id: d.id, label: d.label, x: HINGE_X, z: d.zc, range: 2.7,
      isOpen: () => st.current.target === 1,
      toggle: () => {
        const s = st.current
        if (s.target === 1) {
          const p = world.player
          if (Math.abs(p.x - HINGE_X) < 0.8 && Math.abs(p.z - d.zc) < d.w / 2 + 0.3) return 'Something is in the doorway'
          s.target = 0; return `Closing the ${d.label}`
        }
        s.target = 1; return `Opening the ${d.label}`
      },
    }
    world.interactables.push(it)
    return () => { const i = world.interactables.indexOf(it); if (i >= 0) world.interactables.splice(i, 1) }
  }, [d])
  useFrame((_, dt) => {
    const s = st.current
    const p = world.player
    if (s.target === 0 && s.t > 0.02 && Math.abs(p.x - HINGE_X) < 0.7 && Math.abs(p.z - d.zc) < d.w / 2 + 0.25) s.target = 1   // never close on someone
    const dir = Math.sign(s.target - s.t)
    if (dir) s.t = clamp01(s.t + dir * (world.fastAnim ? dt : Math.min(dt, 0.05)) / 0.9)
    const a = smooth(s.t) * 1.75
    if (l1.current) { l1.current.rotation.y = a; l2.current.rotation.y = -a }
    const should = s.target === 0 && s.t < 0.04
    if (should !== blockRef.current) { blockRef.current = should; setBlock(should) }
  })
  return (
    <>
      <Leaf lw={lw} dir={-1} hingeZ={d.zc + d.w / 2 - 0.002} M={M} rotRef={l1} />
      <Leaf lw={lw} dir={1} hingeZ={d.zc - d.w / 2 + 0.002} M={M} rotRef={l2} />
      {block && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.05, DOOR_H / 2, d.w / 2]} position={[HINGE_X, DOOR_H / 2, d.zc]} collisionGroups={WORLD} />
        </RigidBody>
      )}
    </>
  )
}

// ------------------------------------------------------------------ sliding balcony door
const PANEL_W = SLIDER.split - SLIDER.x0            // 1.55
const PANEL_H = 3.52, PANEL_Y = 0.06

function Slider({ M }) {
  const st = useRef({ t: 0, target: 0 })
  const mover = useRef()
  const blockRef = useRef(true)
  const [block, setBlock] = useState(true)
  const geo = useMemo(() => {
    const s = 0.05, r = 0.075
    const frame = boxes([
      [-PANEL_W / 2 + s / 2, PANEL_H / 2, 0, s, PANEL_H, 0.05], [PANEL_W / 2 - s / 2, PANEL_H / 2, 0, s, PANEL_H, 0.05],
      [0, r / 2, 0, PANEL_W, r, 0.05], [0, PANEL_H - r / 2, 0, PANEL_W, r, 0.05],
    ])
    return { frame, glass: new THREE.PlaneGeometry(PANEL_W - 2 * s, PANEL_H - 2 * r).translate(0, PANEL_H / 2, 0) }
  }, [])
  const handle = useMemo(() => boxes([[0, 1.25, 0.045, 0.026, 0.62, 0.026], [0, 0.97, 0.03, 0.02, 0.02, 0.03], [0, 1.53, 0.03, 0.02, 0.02, 0.03]]), [])
  const track = useMemo(() => boxes([[(SLIDER.x0 + SLIDER.x1) / 2, 0.012, 0, SLIDER.x1 - SLIDER.x0, 0.024, 0.13]]), [])
  useEffect(() => {
    const it = {
      id: 'balcony', label: 'balcony sliding door', x: 0.4, z: SLIDER.z, range: 3.0,
      isOpen: () => st.current.target === 1,
      toggle: () => {
        const s = st.current
        if (s.target === 1) {
          const p = world.player
          if (Math.abs(p.z - SLIDER.z) < 0.7 && p.x > SLIDER.split - 0.2 && p.x < SLIDER.x1 + 0.2) return 'Something is in the doorway'
          s.target = 0; return 'Closing the balcony door'
        }
        s.target = 1; return 'Opening the balcony door'
      },
    }
    world.interactables.push(it)
    return () => { const i = world.interactables.indexOf(it); if (i >= 0) world.interactables.splice(i, 1) }
  }, [])
  useFrame((_, dt) => {
    const s = st.current, p = world.player
    if (s.target === 0 && s.t > 0.02 && Math.abs(p.z - SLIDER.z) < 0.6 && p.x > SLIDER.split - 0.1 && p.x < SLIDER.x1 + 0.1) s.target = 1
    const dir = Math.sign(s.target - s.t)
    if (dir) s.t = clamp01(s.t + dir * (world.fastAnim ? dt : Math.min(dt, 0.05)) / 1.7)
    if (mover.current) mover.current.position.x = -smooth(s.t) * PANEL_W
    const should = s.target === 0 && s.t < 0.03
    if (should !== blockRef.current) { blockRef.current = should; setBlock(should) }
  })
  const glassMat = M.glass
  const cx0 = (SLIDER.x0 + SLIDER.split) / 2, cx1 = (SLIDER.split + SLIDER.x1) / 2
  return (
    <>
      <mesh geometry={track} material={M.frame} position={[0, 0, SLIDER.z]} receiveShadow />
      {/* fixed panel (outer rail) */}
      <group position={[cx0, PANEL_Y, SLIDER.z - 0.035]}>
        <mesh geometry={geo.frame} material={M.frame} castShadow /><mesh geometry={geo.glass} material={glassMat} renderOrder={2} />
      </group>
      {/* sliding panel (inner rail): slides over the fixed one */}
      <group position={[cx1, PANEL_Y, SLIDER.z + 0.035]}>
        <group ref={mover}>
          <mesh geometry={geo.frame} material={M.frame} castShadow /><mesh geometry={geo.glass} material={glassMat} renderOrder={2} />
          <mesh geometry={handle} material={M.brass} position={[-PANEL_W / 2 + 0.07, 0, 0]} castShadow />
        </group>
      </group>
      {/* collision: permanent glazing either side + the door leaf while it is closed */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(SLIDER.split - (-4.45)) / 2, 2.05, 0.06]} position={[(SLIDER.split - 4.45) / 2, 1.75, SLIDER.z - 0.0]} collisionGroups={GLASS} />
        <CuboidCollider args={[(3.61 - SLIDER.x1) / 2, 2.05, 0.06]} position={[(3.61 + SLIDER.x1) / 2, 1.75, SLIDER.z]} collisionGroups={GLASS} />
      </RigidBody>
      {block && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[(SLIDER.x1 - SLIDER.split) / 2, 2.05, 0.06]} position={[cx1, 1.75, SLIDER.z]} collisionGroups={GLASS} />
        </RigidBody>
      )}
      {/* 0.35 m step down to the balcony deck: a stone ramp so the player can walk out and back in */}
      <group position={[0.4, -0.222, -12.2735]} rotation={[-0.3366, 0, 0]}>
        <mesh material={M.stone} castShadow receiveShadow><boxGeometry args={[2.0, 0.1, 1.06]} /></mesh>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.0, 0.05, 0.53]} position={[0.4, -0.222, -12.2735]} rotation={[-0.3366, 0, 0]} collisionGroups={WORLD} />
      </RigidBody>
    </>
  )
}

// ------------------------------------------------------------------ lights (foundations only) + interaction
function RoomLights({ M }) {
  const discs = useMemo(() => {
    const out = []
    for (const x of [-8.3, -6.2]) for (const z of [-7.1, -4.95]) out.push([x, RC - 0.004, z])
    for (const x of [-7.1, -5.6]) for (const z of [-10.6, -9.5]) out.push([x, RC - 0.004, z])
    return out
  }, [])
  return (
    <>
      {discs.map((p, i) => (
        <mesh key={i} position={p} rotation={[Math.PI / 2, 0, 0]} material={M.downlight}><circleGeometry args={[0.075, 20]} /></mesh>
      ))}
      {/* warm wash from the brass sconces / cove onto the panelled wall and doors */}
      <pointLight position={[-3.9, 2.3, -4.43]} intensity={4} distance={6} decay={1.5} color="#ffbf7a" />
      <pointLight position={[-3.9, 2.3, -8.1]} intensity={3} distance={6} decay={1.5} color="#ffbf7a" />
      <pointLight position={[-3.9, 2.3, -11.1]} intensity={4} distance={6} decay={1.5} color="#ffbf7a" />
      <pointLight position={[-7.2, 3.0, -6.0]} intensity={7} distance={9} decay={1.5} color="#ffc486" />
      <pointLight position={[-6.7, 3.0, -10.05]} intensity={5} distance={7} decay={1.5} color="#ffd2a0" />
    </>
  )
}

function BedroomWindow({ M }) {
  const g = useMemo(() => {
    const x = -9.75, z0 = -7.35, z1 = -4.65, y0 = 0.6, y1 = 2.95, t = 0.06
    const zm = (z0 + z1) / 2
    return {
      frame: boxes([
        [x, y0 + t / 2, zm, 0.08, t, z1 - z0], [x, y1 - t / 2, zm, 0.08, t, z1 - z0],
        [x, (y0 + y1) / 2, z0 + t / 2, 0.08, y1 - y0, t], [x, (y0 + y1) / 2, z1 - t / 2, 0.08, y1 - y0, t], [x, (y0 + y1) / 2, zm, 0.08, y1 - y0, 0.05],
      ]),
      glass: new THREE.PlaneGeometry(z1 - z0 - 0.12, y1 - y0 - 0.12).rotateY(Math.PI / 2).translate(x, (y0 + y1) / 2, zm),
    }
  }, [])
  return (
    <>
      <mesh geometry={g.frame} material={M.frame} castShadow /><mesh geometry={g.glass} material={M.glass} renderOrder={2} />
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[0.06, 1.2, 1.35]} position={[-9.75, 1.78, -6.0]} collisionGroups={GLASS} /></RigidBody>
    </>
  )
}

function Interact() {
  const cur = useRef(null)
  useFrame(() => {
    const p = world.player
    let best = null, bd = 1e9
    for (const it of world.interactables) {
      const d = Math.hypot(it.x - p.x, it.z - p.z)
      if (d < it.range && d < bd) { best = it; bd = d }
    }
    cur.current = best
    const text = best ? `${best.isOpen() ? 'close' : 'open'} the ${best.label}` : ''
    if (camStore.get().prompt !== text) camStore.set({ prompt: text })
  })
  useEffect(() => {
    const on = (e) => {
      if (e.code !== 'Enter' || e.repeat || e.metaKey || e.altKey) return
      const it = cur.current
      if (!it) return
      e.preventDefault()
      const msg = it.toggle()
      if (msg) toast(msg)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
  return null
}

export default function Plan({ mats }) {
  const M = useMemo(() => makeMats(mats), [mats])
  const arch = useMemo(buildArch, [])
  const geoms = useMemo(() => mergeByKey(arch), [arch])
  return (
    <>
      {Object.keys(geoms).map((k) => (
        <mesh key={k} name={k === 'ceilR' ? 'WW_Ceiling_Rooms' : 'WW_Plan_' + k} geometry={geoms[k]} material={M[k]} castShadow receiveShadow />
      ))}
      <RigidBody type="fixed" colliders={false}>
        {arch.filter((a) => a.col).map((a, i) => {
          const [x0, x1, y0, y1, z0, z1] = a.b
          return <CuboidCollider key={i} args={[(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]} position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} collisionGroups={WORLD} />
        })}
      </RigidBody>
      {DOORS.map((d) => <Door key={d.id} d={d} M={M} />)}
      <Slider M={M} />
      <BedroomWindow M={M} />
      <RoomLights M={M} />
      <Interact />
    </>
  )
}
