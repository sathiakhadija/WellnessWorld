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
import { world, occupied } from './world.js'
import { camStore, toast } from './camStore.js'

const WORLD = interactionGroups([GROUPS.world])
const GLASS = interactionGroups([GROUPS.glass])
const clamp01 = (t) => Math.max(0, Math.min(1, t))
const smooth = (t) => t * t * (3 - 2 * t)

// ------------------------------------------------------------------ floor plan
export const DOOR_H = 3.0
export const DOORS = [
  { id: 'bedroom',  label: 'bedroom door',  zc: -6.0,   w: 1.5, type: 'double' },
  { id: 'bathroom', label: 'bathroom door', zc: -10.05, w: 1.1, type: 'single', hinge: 'north' },   // single leaf, hinged on the partition side so the open leaf never sits in the opening
]
const OPEN_ANGLE = 1.83     // 105 deg
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
    add('stone', -4.85, -4.45, Y0, 0, a, b, true)                           // threshold (same stone as the sill)
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

  // ---- front wall (rebuilt) with the main entrance: a 1.3 m opening through the whole 0.4 m wall, panelled surround, lintel
  const EX0 = 0.55, EX1 = 1.85
  add('plaster', -4.85, EX0, Y0, 4.1, 0, 0.4, true); add('plaster', EX1, 4.01, Y0, 4.1, 0, 0.4, true)
  add('plaster', EX0, EX1, 3.1, 4.1, 0, 0.4, true)
  add('stone', EX0, EX1, Y0, 0, 0, 0.4, true)                                             // threshold slab, top flush with the floor
  add('brass', EX0 + 0.03, EX1 - 0.03, 0, 0.005, 0.3, 0.37)                               // brushed-brass threshold strip under the door line
  // ONE frame: an espresso lining wraps the whole reveal (jambs + head, full 0.4 m wall depth) and a slim flat casing sits on the room face.
  // (V10 stacked a pale lining, a broad dark casing, an inner bead and plinth blocks here; that read as nested frames.)
  add('trim', EX0, EX0 + 0.03, 0, 3.1, 0, 0.4); add('trim', EX1 - 0.03, EX1, 0, 3.1, 0, 0.4); add('trim', EX0, EX1, 3.07, 3.1, 0, 0.4)
  add('trim', EX0 - 0.08, EX0, 0, 3.18, -0.02, 0); add('trim', EX1, EX1 + 0.08, 0, 3.18, -0.02, 0); add('trim', EX0 - 0.08, EX1 + 0.08, 3.1, 3.18, -0.02, 0)
  for (const [a, b] of [[-3.2, -0.4], [2.8, 3.95]]) {                                                              // flanking raised panels
    const x0 = a + (a < 0 ? 0.0 : 0), yb = 0.55, yt = 3.15, t = 0.05
    if (b - a < 0.6) continue
    add('trim', a, b, yb, yb + t, -0.025, 0); add('trim', a, b, yt - t, yt, -0.025, 0); add('trim', a, a + t, yb, yt, -0.025, 0); add('trim', b - t, b, yb, yt, -0.025, 0)
  }
  // narrow tall panel pair either side of the door (each carries a sconce): tall upper frame, short lower frame
  for (const [a, b] of [[-0.18, 0.3], [2.1, 2.58]]) for (const [yb, yt] of [[1.2, 3.0], [0.4, 1.05]]) {
    const t = 0.04
    add('trim', a, b, yb, yb + t, -0.025, 0); add('trim', a, b, yt - t, yt, -0.025, 0); add('trim', a, a + t, yb, yt, -0.025, 0); add('trim', b - t, b, yb, yt, -0.025, 0)
  }
  add('skirt', -4.45, EX0 - 0.08, 0, 0.18, -0.03, 0); add('skirt', EX1 + 0.08, 3.61, 0, 0.18, -0.03, 0)

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

function limestoneTexture() {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S
  const g = cv.getContext('2d'); let st = 7; const r = () => { st = (st * 16807) % 2147483647; return st / 2147483647 }
  const n = 4, t = S / n                                   // 4 x 4 tiles per canvas tile = 0.6 m tiles when repeated 1 per 2.4 m
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 214 + Math.floor(r() * 16)
    g.fillStyle = `rgb(${v},${v - 6},${v - 18})`; g.fillRect(i * t, j * t, t, t)
    for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(${150 + r() * 60},${140 + r() * 60},${120 + r() * 50},${0.05 + r() * 0.1})`; g.fillRect(i * t + r() * t, j * t + r() * t, 1 + r() * 3, 1 + r() * 2) }
  }
  g.strokeStyle = 'rgba(120,108,92,0.55)'; g.lineWidth = 2
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, S); g.stroke(); g.beginPath(); g.moveTo(0, i * t); g.lineTo(S, i * t); g.stroke() }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8; return tex
}

function makeMats(src = {}) {
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o })
  return {
    plaster: src.WW_Plaster_Ivory_GAME || std('#eadfce'),
    trim: src.WW_Trim_Satin_GAME || std('#efe6d6', { roughness: 0.5 }),
    skirt: src.WW_Skirting_GAME || std('#efe6d6'),
    ceil: src.WW_Ceiling_Ivory_GAME || std('#f2eadc'),
    ceilR: src.WW_Ceiling_Ivory_GAME || std('#f2eadc'),
    frame: src.WW_Frame_Bronze_GAME || std('#111114', { metalness: 0.55, roughness: 0.42 }),     // slim matte-black aluminium
    glass: src.WW_Glass_GAME,
    floorBed: std('#b5aa99', { roughness: 0.98 }),                                    // soft greige wool carpet (placeholder finish)
    floorBath: std('#e4dacb', { roughness: 0.25, envMapIntensity: 0.9 }),            // cream marble (placeholder finish)
    stone: std('#d8cab6', { roughness: 0.55 }),
    door: std('#efe5d2', { roughness: 0.55 }),
    dk: std('#2d2019', { roughness: 0.5 }),
    doorHi: std('#e6d9c3', { roughness: 0.5 }),
    walnutHi: std('#41322a', { roughness: 0.38 }),                                          // cream satin paint
    walnut: std('#2c211c', { roughness: 0.42 }),                                          // espresso entrance door
    limestone: new THREE.MeshStandardMaterial({ map: limestoneTexture(), roughness: 0.78, color: '#ffffff' }),
    deckSide: std('#cfc4b2', { roughness: 0.8 }),
    balGlass: new THREE.MeshStandardMaterial({ color: '#d4ebe8', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false }),
    black: std('#101012', { metalness: 0, roughness: 0.9, envMapIntensity: 0 }),
    led: new THREE.MeshBasicMaterial({ color: '#ffc77a', toneMapped: false }),
    tube: new THREE.MeshBasicMaterial({ color: '#fff1d6', toneMapped: false }),
    brass: std('#d9b36a', { metalness: 1, roughness: 0.42, envMapIntensity: 2.6 }),       // brushed brass
    downlight: new THREE.MeshBasicMaterial({ color: '#fff0d0', toneMapped: false }),
  }
}

// ------------------------------------------------------------------ doors
const HINGE_X = -4.65

const leafParts = (lw, panels = [[0.3, 1.3], [1.52, 2.74]], h = DOOR_H - 0.02) => {
  const body = [[0, h / 2, 0, 0.05, h, lw]], frame = [], brass = []
  const pw = lw - 0.32
  for (const sx of [1, -1]) for (const [yb, yt] of panels) {
    const x = sx * 0.0305, t = 0.012, s = 0.045
    frame.push([x, yb + s / 2, 0, t, s, pw], [x, yt - s / 2, 0, t, s, pw], [x, (yb + yt) / 2, -pw / 2 + s / 2, t, yt - yb, s], [x, (yb + yt) / 2, pw / 2 - s / 2, t, yt - yb, s])
    frame.push([sx * 0.0275, (yb + yt) / 2, 0, 0.006, yt - yb - 0.12, pw - 0.12])
  }
  return { body, frame, brass }
}

function Leaf({ lw, dir, hingeZ, M, rotRef, mat, hingeX = HINGE_X, hingeY = 0, entrance = false }) {
  const g = useMemo(() => {
    const p = leafParts(lw, entrance ? [[0.3, 1.05], [1.3, 2.85]] : undefined, entrance ? 3.06 : undefined)
    return { body: boxes(p.body), frame: boxes(p.frame) }
  }, [lw, entrance])
  const brass = useMemo(() => {
    const list = []
    const hz = dir * (lw - 0.1)
    if (entrance) {                                                                     // long vertical brass pull + thumb latch, peephole, three hinges
      for (const sx of [1, -1]) {
        list.push([sx * 0.04, 1.2, hz, 0.014, 0.66, 0.06], [sx * 0.085, 1.2, hz - dir * 0.02, 0.026, 0.52, 0.026], [sx * 0.062, 0.98, hz - dir * 0.02, 0.04, 0.03, 0.03], [sx * 0.062, 1.42, hz - dir * 0.02, 0.04, 0.03, 0.03], [sx * 0.05, 1.05, hz, 0.02, 0.05, 0.05])
        list.push([sx * 0.029, 1.58, dir * lw / 2, 0.01, 0.034, 0.034])
      }
      for (const y of [0.4, 1.5, 2.6]) list.push([0.0, y, 0.0, 0.034, 0.16, 0.034])
      return boxes(list)
    }
    for (const sx of [1, -1]) { list.push([sx * 0.062, 1.05, hz, 0.012, 0.05, 0.05]); list.push([sx * 0.08, 1.05 + 0.0, hz - dir * 0.045, 0.034, 0.016, 0.115]) }   // rose + lever
    for (const y of [0.35, 1.5, 2.65]) list.push([0.0, y, 0.0, 0.032, 0.11, 0.032])                                            // hinges
    return boxes(list)
  }, [lw, dir, entrance])
  return (
    <group ref={rotRef} position={[hingeX, hingeY, hingeZ]}>
      <group position={[0, 0, dir * lw / 2]}>
        <mesh geometry={g.body} material={mat || M.door} castShadow receiveShadow />
        <mesh geometry={g.frame} material={entrance ? M.doorHi : (mat || M.door)} castShadow receiveShadow />
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
  const double = d.type !== 'single'
  const lw = double ? d.w / 2 - 0.004 : d.w - 0.008
  const sdir = d.hinge === 'south' ? 1 : -1                                  // single door: -1 = hinged on the +z (north) jamb, leaf extends toward -z
  useEffect(() => {
    const it = {
      id: d.id, label: d.label, x: HINGE_X, z: d.zc, range: 2.7,
      isOpen: () => st.current.target === 1,
      toggle: () => {
        const s = st.current
        if (s.target === 1) {
          const p = world.player
          if (occupied(HINGE_X - 0.8, HINGE_X + 0.8, d.zc - d.w / 2 - 0.3, d.zc + d.w / 2 + 0.3)) return 'Something is in the doorway'
          s.target = 0; return `Closing the ${d.label}`
        }
        s.target = 1; return `Opening the ${d.label}`
      },
    }
    world.interactables.push(it); world.doors[d.id] = st.current
    return () => { const i = world.interactables.indexOf(it); if (i >= 0) world.interactables.splice(i, 1); delete world.doors[d.id] }
  }, [d])
  useFrame((_, dt) => {
    const s = st.current
    const p = world.player
    if (s.force == null && s.target === 0 && s.t > 0.02 && occupied(HINGE_X - 0.7, HINGE_X + 0.7, d.zc - d.w / 2 - 0.25, d.zc + d.w / 2 + 0.25)) s.target = 1   // never close on someone
    if (s.force != null) { s.t = s.force; s.target = s.force > 0.5 ? 1 : 0 }                 // test hook: pin the door at a fraction
    const dir = s.force != null ? 0 : Math.sign(s.target - s.t)
    if (dir) s.t = clamp01(s.t + dir * (world.fastAnim ? dt : Math.min(dt, 0.05)) / 0.9)
    const a = smooth(s.t) * OPEN_ANGLE
    if (double) { if (l1.current) { l1.current.rotation.y = a; l2.current.rotation.y = -a } }
    else if (l1.current) l1.current.rotation.y = sdir === -1 ? a : -a
    const should = s.target === 0 && s.t < 0.04
    if (should !== blockRef.current) { blockRef.current = should; setBlock(should) }
  })
  return (
    <>
      {double ? (
        <>
          <Leaf lw={lw} dir={-1} hingeZ={d.zc + d.w / 2 - 0.002} M={M} rotRef={l1} />
          <Leaf lw={lw} dir={1} hingeZ={d.zc - d.w / 2 + 0.002} M={M} rotRef={l2} />
        </>
      ) : (
        <Leaf lw={lw} dir={sdir} hingeZ={sdir === -1 ? d.zc + d.w / 2 - 0.002 : d.zc - d.w / 2 + 0.002} M={M} rotRef={l1} />
      )}
      {block && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.05, DOOR_H / 2, d.w / 2]} position={[HINGE_X, DOOR_H / 2, d.zc]} collisionGroups={WORLD} />
        </RigidBody>
      )}
    </>
  )
}

// ------------------------------------------------------------------ main entrance (front wall) + "Go Outside" transition placeholder
// Activating it swings the door open onto a warm light, fades to a placeholder card (see DESTINATIONS in destinations.js) and waits for Enter to come back.
function Entrance({ M }) {
  const st = useRef({ t: 0, target: 0, hold: 0 })
  const rot = useRef(), glow = useRef(), light = useRef()
  const blockRef = useRef(true)
  const [block, setBlock] = useState(true)
  const X0 = 0.585, W = 1.22, Z = 0.33
  useEffect(() => {
    const it = {
      id: 'entrance', label: 'main entrance', x: 1.2, z: -0.2, range: 2.3,
      prompt: () => '🚪 Go Outside',
      isOpen: () => st.current.target === 1,
      toggle: () => {
        if (camStore.get().transition !== 'idle') return false
        st.current.target = 1; camStore.set({ transition: 'opening', dest: 'down' }); return false
      },
    }
    world.interactables.push(it); world.doors.entrance = st.current
    return () => { const i = world.interactables.indexOf(it); if (i >= 0) world.interactables.splice(i, 1); delete world.doors.entrance }
  }, [])
  useFrame((_, dt) => {
    const s = st.current, step = world.fastAnim ? dt : Math.min(dt, 0.05)
    if (s.force != null) { s.t = s.force; s.target = s.force > 0.5 ? 1 : 0 }
    const dir = s.force != null ? 0 : Math.sign(s.target - s.t)
    if (dir) s.t = clamp01(s.t + dir * step / 1.3)
    if (rot.current) rot.current.rotation.y = -smooth(s.t) * 1.75               // swings outward (+z) into the light
    if (light.current) light.current.intensity = 9 * smooth(s.t)
    if (glow.current) glow.current.visible = s.t > 0.01
    const tr = camStore.get().transition
    if (tr === 'opening' && s.t >= 1) { s.hold += step; if (s.hold > 0.5) { s.hold = 0; world.rideLift ? world.rideLift('down') : camStore.set({ transition: 'idle' }) } }
    if (tr === 'closing' && s.t <= 0) camStore.set({ transition: 'idle' })
    const should = s.target === 0 && s.t < 0.04
    if (should !== blockRef.current) { blockRef.current = should; setBlock(should) }
  })
  return (
    <>
      <group position={[X0, 0, Z]} rotation={[0, Math.PI / 2, 0]}>
        <Leaf lw={W} dir={1} hingeZ={0} hingeX={0} M={M} rotRef={rot} mat={M.door} entrance />
      </group>
      <mesh ref={glow} position={[1.2, 1.7, 2.2]} visible={false}>
        <planeGeometry args={[5, 4.2]} /><meshBasicMaterial color="#ffd9a0" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[1.2, 2.0, 0.9]} intensity={0} distance={7} decay={1.4} color="#ffcf94" />
      {block && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[W / 2 + 0.04, DOOR_H / 2, 0.06]} position={[1.2, DOOR_H / 2, Z]} collisionGroups={WORLD} />
        </RigidBody>
      )}
      {/* tall tube sconces either side (frosted warm tube, brass clasp + end caps), centred in the narrow panels */}
      {[0.06, 2.34].map((x, i) => (
        <group key={i} position={[x, 2.2, -0.04]}>
          <mesh material={M.tube}><boxGeometry args={[0.035, 1.3, 0.035]} /></mesh>
          <mesh material={M.brass}><boxGeometry args={[0.07, 0.2, 0.06]} /></mesh>
          <mesh material={M.brass} position={[0, 0.67, 0]}><boxGeometry args={[0.05, 0.03, 0.05]} /></mesh>
          <mesh material={M.brass} position={[0, -0.67, 0]}><boxGeometry args={[0.05, 0.03, 0.05]} /></mesh>
        </group>
      ))}
      <pointLight position={[0.06, 2.2, -0.5]} intensity={3.2} distance={4} decay={1.5} color="#ffcf94" />
      <pointLight position={[2.34, 2.2, -0.5]} intensity={3.2} distance={4} decay={1.5} color="#ffcf94" />
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
  const track = useMemo(() => boxes([[(SLIDER.x0 + SLIDER.x1) / 2, 0.004, 0, SLIDER.x1 - SLIDER.x0, 0.008, 0.1]]), [])
  useEffect(() => {
    const it = {
      id: 'balcony', label: 'balcony sliding door', x: 0.4, z: SLIDER.z, range: 3.0,
      isOpen: () => st.current.target === 1,
      toggle: () => {
        const s = st.current
        if (s.target === 1) {
          const p = world.player
          if (occupied(SLIDER.split - 0.2, SLIDER.x1 + 0.2, SLIDER.z - 0.7, SLIDER.z + 0.7)) return 'Something is in the doorway'
          s.target = 0; return 'Closing the balcony door'
        }
        s.target = 1; return 'Opening the balcony door'
      },
    }
    world.interactables.push(it); world.doors.slider = st.current
    return () => { const i = world.interactables.indexOf(it); if (i >= 0) world.interactables.splice(i, 1); delete world.doors.slider }
  }, [])
  useFrame((_, dt) => {
    const s = st.current, p = world.player
    if (s.target === 0 && s.t > 0.02 && occupied(SLIDER.split - 0.1, SLIDER.x1 + 0.1, SLIDER.z - 0.6, SLIDER.z + 0.6)) s.target = 1
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
    </>
  )
}

// ------------------------------------------------------------------ balcony (L-shaped wrap-around, rebuilt flush with the interior floor)
// The V8 deck sat 0.35 m below the interior floor (V9 hid that with a ramp). Here the deck top is at y = 0 like the herringbone, so the sliding door's
// track is the only threshold. Pale limestone tiles (0.6 m), slim black aluminium balustrade with a continuous glass infill, every open edge has a collider.
const BAL = { x0: -4.45, x1: 5.8, zF: -11.79, zB: -13.95, zN: -3.0, xi: 3.61, T: 0.35 }
function Balcony({ M }) {
  const g = useMemo(() => {
    const topGeo = (x0, x1, z0, z1) => {
      const t = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2)
      const uv = t.attributes.uv, pos = t.attributes.position
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 2.4, -pos.getZ(i) / 2.4)
      return t
    }
    const { x0, x1, zF, zB, zN, xi, T } = BAL
    const top = mergeGeometries([topGeo(x0, x1, zB, zF), topGeo(xi, x1, zF, zN)])
    const slab = boxes([[(x0 + x1) / 2, -T / 2 - 0.003, (zB + zF) / 2, x1 - x0, T, zF - zB], [(xi + x1) / 2, -T / 2 - 0.003, (zF + zN) / 2, x1 - xi, T, zN - zF]])
    // balustrade runs: [axis, fixed coord, from, to]
    const i = 0.07, runs = [['x', zB + i, x0 + i, x1 - i], ['z', x1 - i, zB + i, zN - 0.0], ['x', zN - 0.0, xi, x1 - i], ['z', x0 + i, zB + i, zF]]
    const glass = [], black = [], cols = [], led = []
    const H = 1.1
    for (const [ax, c, a, b] of runs) {
      const len = b - a, mid = (a + b) / 2
      const P = (along, y, thick, h, w) => ax === 'x' ? [along, y, c, w, h, thick] : [c, y, along, thick, h, w]
      glass.push(P(mid, 0.06 + (H - 0.06 - 0.04) / 2, 0.014, H - 0.1, len - 0.04))
      black.push(P(mid, H - 0.02, 0.05, 0.04, len), P(mid, 0.03, 0.07, 0.06, len))               // slim cap rail + base channel
      const n = Math.max(1, Math.round(len / 2.1))
      for (let k = 0; k <= n; k++) { const t = a + (len * k) / n; black.push(ax === 'x' ? [t, H / 2, c, 0.04, H, 0.04] : [c, H / 2, t, 0.04, H, 0.04]) }   // minimal posts
      led.push(ax === 'x' ? [mid, 0.075, c + (c < -8 ? 0.045 : -0.045), len - 0.1, 0.012, 0.012] : [c + (c > 0 ? -0.045 : 0.045), 0.075, mid, 0.012, 0.012, len - 0.1])
      cols.push(ax === 'x' ? { p: [mid, H / 2, c], a: [len / 2 + 0.03, H / 2, 0.05] } : { p: [c, H / 2, mid], a: [0.05, H / 2, len / 2 + 0.03] })
    }
    return { top, slab: slab, glass: boxes(glass), black: boxes(black), led: boxes(led), cols }
  }, [])
  const { x0, x1, zF, zB, zN, xi, T } = BAL
  return (
    <>
      <mesh geometry={g.top} material={M.limestone} receiveShadow name="WW_Balcony_Deck" />
      <mesh geometry={g.slab} material={M.deckSide} castShadow receiveShadow />
      <mesh geometry={g.black} material={M.black} castShadow />
      <mesh geometry={g.glass} material={M.balGlass} renderOrder={2} />
      <mesh geometry={g.led} material={M.led} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[(x1 - x0) / 2, T / 2, (zF - zB) / 2]} position={[(x0 + x1) / 2, -T / 2, (zB + zF) / 2]} collisionGroups={WORLD} />
        <CuboidCollider args={[(x1 - xi) / 2, T / 2, (zN - zF) / 2]} position={[(xi + x1) / 2, -T / 2, (zF + zN) / 2]} collisionGroups={WORLD} />
        {g.cols.map((c, i) => <CuboidCollider key={i} args={c.a} position={c.p} collisionGroups={GLASS} />)}
      </RigidBody>
      <pointLight position={[0.5, 0.6, -13.2]} intensity={1.2} distance={5} decay={1.6} color="#ffc27a" />
      <pointLight position={[5.2, 0.6, -8]} intensity={1.0} distance={5} decay={1.6} color="#ffc27a" />
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
    if (camStore.get().transition === 'idle' || !camStore.get().transition) for (const it of world.interactables) {
      if ((it.level || 'penthouse') !== (world.level || 'penthouse')) continue
      const d = Math.hypot(it.x - p.x, it.z - p.z)
      const sc = d + (it.penalty || 0)
      if (d < it.range && sc < bd) { best = it; bd = sc }
    }
    cur.current = best
    const text = best ? (best.prompt ? best.prompt() : `${best.isOpen() ? 'close' : 'open'} the ${best.label}`) : ''
    if (camStore.get().prompt !== text) camStore.set({ prompt: text })
  })
  useEffect(() => {
    const on = (e) => {
      if (e.code !== 'Enter' || e.repeat || e.metaKey || e.altKey) return
      if (camStore.get().transition === 'overlay') { e.preventDefault(); return }
      const it = cur.current
      if (!it) return
      e.preventDefault()
      if (world.playerLock) return                              // an interaction sequence (petting) holds the controls
      const msg = it.toggle()
      if (msg) toast(msg)
      if (it.id !== 'kitten' && world.onInteract) world.onInteract(it, msg)
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
      <Entrance M={M} />
      <Balcony M={M} />
      <BedroomWindow M={M} />
      <RoomLights M={M} />
      <Interact />
    </>
  )
}
