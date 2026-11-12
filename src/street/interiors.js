// Walkable shop interiors (Bible s13 Café Violette, s14 The Quiet Page). Built in the shop frame F: x across, +z to the street, interior at z < -1.1, floor y 0.2, ceiling y 3.35.
// Called from shopBuilding(o.interior). Colours come from the master palette registry (hex literals mirrored from src/palette/registry.src.json).
import * as THREE from 'three'
import { toWorld, dirWorld } from './geo.js'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import BAKED from '../baked/cafe.json'   // produced by assets/blender/make_cafe.py (Blender)
const col = (h) => new THREE.Color(h)

// ---- Blender-baked furniture placement: bucket geometry (y-up, front +z) -> street chunk accumulators in the shop frame
const GEO = {}
function bakedGeo(name) {
  if (GEO[name]) return GEO[name]
  const o = {}
  for (const [bucket, d] of Object.entries(BAKED[name])) {
    const n = d.p.length / 3, P = new Float32Array(d.p), g = new THREE.BufferGeometry(), uv = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) { uv[i * 2] = P[i * 3] + P[i * 3 + 2]; uv[i * 2 + 1] = P[i * 3 + 1] }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    o[bucket] = toCreasedNormals(g, 0.7)
  }
  return (GEO[name] = o)
}
const BUCKET_KEY = { wood: 'wood', metal: 'metal', brass: 'metal', fabric: 'awning', seat: 'awning', leather: 'awning', marble: 'slab', glow: 'glow' }
function baked(ch, F, name, x, z, rot = 0, colors = {}, y = FL, scale = 1) {
  const cr = Math.cos(rot), sr = Math.sin(rot), geos = bakedGeo(name)
  for (const [bucket, g] of Object.entries(geos)) {
    const a = ch.acc(BUCKET_KEY[bucket] || 'trim'), pos = g.attributes.position, nor = g.attributes.normal, uvs = g.attributes.uv, col = col_(colors[bucket] || '#ffffff'), idx = g.index
    const base = a.k, N = pos.count
    for (let i = 0; i < N; i++) {
      const px = pos.getX(i) * scale, py = pos.getY(i) * scale, pz = pos.getZ(i) * scale, nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i)
      const lx = x + px * cr + pz * sr, lz = z - px * sr + pz * cr, [wx, wy, wz] = toWorld(F, lx, y + py, lz)
      const nlx = nx * cr + nz * sr, nlz = -nx * sr + nz * cr, d = dirWorld(F, nlx, ny, nlz)
      a.p.push(wx, wy, wz); a.n.push(d[0], d[1], d[2]); a.c.push(col.r, col.g, col.b); a.uv.push(uvs.getX(i), uvs.getY(i))
    }
    if (idx) for (let i = 0; i < idx.count; i++) a.i.push(base + idx.getX(i))
    else for (let i = 0; i < N; i++) a.i.push(base + i)
    a.k += N
  }
}
const col_ = (h) => new THREE.Color(h)
const FL = 0.2, CE = 3.35
// shared room shell: floor, ceiling, wall linings, front-wall lining beside window/door, walking surface + wall colliders handled by shopBuilding
function shell(ch, F, c, o) {
  const { w, d } = c, x0 = -w / 2 + 0.12, x1 = w / 2 - 0.12, z0 = -d + 0.3, z1 = -1.1
  ch.box(F, x0, x1, FL - 0.06, FL, z0, z1 + 0.02, col(o.floor), 'parquet', 'u', 1.2, 1.2, 0)
  ch.box(F, x0, x1, CE, CE + 0.1, z0, z1 + 0.02, col(o.ceil), 'trim', 'ud', 1, 1, 0)
  ch.box(F, x0, x0 + 0.02, FL, CE, z0, z1, col(o.wall), 'trim', 'r', 3, 3, 0)
  ch.box(F, x1 - 0.02, x1, FL, CE, z0, z1, col(o.wall), 'trim', 'l', 3, 3, 0)
  ch.box(F, x0, x1, FL, CE, z0, z0 + 0.02, col(o.wall), 'trim', 'f', 3, 3, 0)
  // front wall lining (inside faces): everywhere except the display window and the doorway
  const segs = [[x0, Math.min(c.winX0, c.dx - 0.6)], [Math.max(c.winX1, c.dx + 0.6), x1]].filter(([a, b]) => b - a > 0.05)
  const lo = Math.min(c.winX0, c.dx - 0.6), hi = Math.max(c.winX1, c.dx + 0.6)
  for (const [a, b] of [[x0, lo], [hi, x1]]) if (b - a > 0.05) ch.box(F, a, b, FL, CE, z1 - 0.02, z1, col(o.wall), 'trim', 'b', 3, 3, 0)
  ch.box(F, lo, hi, CE - 0.4, CE, z1 - 0.02, z1, col(o.wall), 'trim', 'b', 3, 3, 0)                    // above the window
  ch.box(F, c.winX0, c.winX1, FL, 0.8, z1 - 0.02, z1, col(o.wall), 'trim', 'b', 3, 3, 0)               // below the window
  void segs
  ch.box(F, x0, x1, FL, FL + 0.14, z0 + 0.02, z0 + 0.05, col(o.skirt || '#f1e8dc'), 'trim', 'f', 1, 1, 0)  // skirting (back)
  ch.box(F, x0, x1, CE - 0.18, CE, z0 + 0.02, z0 + 0.2, col(o.ceil), 'trim', 'fud', 1, 1, 0)             // crown moulding (back)
  // walking surface for the whole floor + wall colliders are added by shopBuilding; floor surface:
  ch.ramp(F, -w / 2 + 0.2, w / 2 - 0.2, z0, FL, 0.16, FL, 0.2, 'shopfloor')
}
const light = (L, F, x, y, z, color, i, dist) => { const [wx, wy, wz] = toWorld(F, x, y, z); L.push({ x: wx, y: wy, z: wz, color, intensity: i, distance: dist, always: true }) }
function pendant(ch, F, x, z, r, y) { baked(ch, F, 'pendant', x, z, 0, { brass: '#b58a4d', glow: '#ffe0b0' }, CE - 1.0, r / 0.26) }
const chair = (ch, F, x, z, rot, c1, c2) => baked(ch, F, 'bistro_chair', x, z, rot, { wood: c2, seat: c1 })
const table = (ch, F, x, z, r, top, c1, c2) => baked(ch, F, 'bistro_table', x, z, 0, { marble: c1, metal: c2, brass: '#b58a4d' }, FL, r / 0.36)
export function cafeInterior(ch, F, c, L) {
  const { w, d } = c, x0 = -w / 2 + 0.12, x1 = w / 2 - 0.12, z0 = -d + 0.3
  shell(ch, F, c, { floor: '#876349', ceil: '#e8d4bc', wall: '#E6D3CB', skirt: '#F7EADA' })
  // marble inlay strip + rug-like central runner
  ch.box(F, -0.9, 0.9, FL, FL + 0.01, z0 + 0.4, -1.5, col('#e6dcd2'), 'slab', 'u', 1.2, 1.2, 0)
  // plum velvet banquette along the left wall with 3 round bistro tables
  const left = c.side === 1 ? 1 : -1  // keep layout independent of door side: banquette on the x- side, counter on x+
  void left
  ch.box(F, x0, x0 + 0.55, FL + 0.05, FL + 0.46, -9.6, -3.4, col('#4B2E5C'), 'awning', 'fulrb', 1, 1, 0.01)
  ch.box(F, x0, x0 + 0.18, FL + 0.46, FL + 1.15, -9.6, -3.4, col('#4B2E5C'), 'awning', 'fulrb', 1, 1, 0.01)
  for (const z of [-4.4, -6.5, -8.6]) { table(ch, F, x0 + 1.35, z, 0.38, 0, '#efe6da', '#3a2f2a'); chair(ch, F, x0 + 2.05, z, -Math.PI / 2, '#c9ad88', '#4a3a2f'); chair(ch, F, x0 + 0.85, z + 0.0, Math.PI / 2, '#c9ad88', '#4a3a2f') }
  // lounge nook (plum armchairs + low table) toward the rear on the counter-side aisle
  baked(ch, F, 'armchair', -0.75, -10.2, 0.25, { fabric: '#8A5A8C', brass: '#b58a4d' }); baked(ch, F, 'armchair', 0.95, -10.2, -0.25, { fabric: '#8A5A8C', brass: '#b58a4d' })
  table(ch, F, 0.05, -9.2, 0.3, 0, '#e6dcd2', '#B58A4D')
  // curved stone patisserie counter with glass display (right side)
  const cx0 = x1 - 1.0, cz0 = -2.9, cz1 = -7.4
  ch.box(F, cx0 - 0.1, cx0 + 0.55, FL, FL + 1.05, cz1, cz0, col('#E6D3CB'), 'trim', 'fulrb', 2, 2, 0.01)
  ch.prism(F, cx0 + 0.225, cz0, 0.55, 0.55, FL, FL + 1.05, col('#E6D3CB'), 'trim', 20); ch.prism(F, cx0 + 0.225, cz1, 0.55, 0.55, FL, FL + 1.05, col('#E6D3CB'), 'trim', 20)
  ch.box(F, cx0 - 0.15, cx0 + 0.6, FL + 1.05, FL + 1.1, cz1 - 0.55, cz0 + 0.55, col('#efe6da'), 'slab', 'fulrbd', 1.2, 1.2, 0)
  ch.box(F, cx0 - 0.12, cx0 + 0.5, FL + 1.1, FL + 1.55, cz1 - 0.3, cz0 + 0.3, col('#dfeaec'), 'shopglass', 'fulrb', 1, 1, 0)         // pastry display glass case
  for (let i = 0; i < 7; i++) ch.prism(F, cx0 + 0.18, cz0 - 0.4 - i * 0.6, 0.12, 0.1, FL + 1.1, FL + 1.22, col(['#e8c79a', '#c98f9f', '#f1dcc0'][i % 3]), 'awning', 8)
  ch.box(F, cx0 - 0.1, cx0 + 0.55, FL + 0.3, FL + 0.34, cz1, cz0, col('#ffd9b0'), 'glow', 'l', 1, 1, 0)                                // under-counter glow
  ch.solid(F, cx0 - 0.15, cx0 + 0.6, FL, FL + 1.1, cz1 - 0.55, cz0 + 0.55, 'desk')
  // back bar / espresso shelf on the back wall behind the counter
  ch.box(F, x1 - 2.6, x1, FL, FL + 0.95, z0 + 0.02, z0 + 0.6, col('#38261F'), 'wood', 'fulb', 1, 1, 0.01)
  ch.box(F, x1 - 2.6, x1, FL + 0.95, FL + 1.0, z0 + 0.02, z0 + 0.65, col('#efe6da'), 'slab', 'fulrbd', 1, 1, 0)
  for (const y of [1.6, 2.1, 2.6]) ch.box(F, x1 - 2.6, x1, FL + y, FL + y + 0.04, z0 + 0.02, z0 + 0.3, col('#B58A4D'), 'metal', 'fud', 1, 1, 0)
  // window-side study bar with stools (along the glazing)
  ch.box(F, c.winX0 + 0.2, c.winX1 - 0.2, FL + 0.98, FL + 1.04, -1.75, -1.3, col('#38261F'), 'wood', 'fulrbd', 1, 1, 0)
  for (let i = 0; i < 3; i++) { const x = c.winX0 + 0.6 + i * ((c.winX1 - c.winX0 - 1.2) / 2); baked(ch, F, 'stool', x, -2.15, 0, { fabric: '#8A5A8C', brass: '#b58a4d' }) }
  // rear: restroom door + service door
  ch.box(F, -0.2, 0.7, FL, 2.3, z0 + 0.02, z0 + 0.07, col('#4B2E5C'), 'wood', 'f', 1, 1, 0); ch.box(F, 0.52, 0.58, 1.0, 1.1, z0 + 0.07, z0 + 0.12, col('#B58A4D'), 'metal', 'f', 1, 1, 0)
  // art: framed prints on the banquette wall + street sign sconce
  for (const z of [-4.4, -6.5, -8.6]) { ch.box(F, x0 + 0.02, x0 + 0.06, 1.5, 2.4, z - 0.4, z + 0.4, col('#B58A4D'), 'metal', 'r', 1, 1, 0); ch.box(F, x0 + 0.06, x0 + 0.08, 1.58, 2.32, z - 0.32, z + 0.32, col(['#8A5A8C', '#E6D3CB', '#8a9a85'][Math.abs(Math.round(z)) % 3]), 'trim', 'r', 1, 1, 0) }
  // lighting: pendants over the seating + warm interior points
  for (const [x, z] of [[x0 + 1.35, -4.4], [x0 + 1.35, -6.5], [x0 + 1.35, -8.6], [0.1, -9.2], [x1 - 2.0, -5.1]]) pendant(ch, F, x, z, 0.26, 2.3)
  light(L, F, 0, 2.5, -3.0, '#ffd5a8', 26, 9); light(L, F, 0, 2.5, -7.0, '#ffd5a8', 26, 9); light(L, F, x1 - 1.2, 2.3, -5, '#ffe0b8', 12, 6)
}

export function bookInterior(ch, F, c, L) {
  const { w, d } = c, x0 = -w / 2 + 0.12, x1 = w / 2 - 0.12, z0 = -d + 0.3
  shell(ch, F, c, { floor: '#5e3e2b', ceil: '#d8c6ab', wall: '#5a3d2c', skirt: '#3a261c' })
  // oxblood rug with border
  ch.box(F, -2.2, 2.2, FL, FL + 0.012, -9.8, -3.2, col('#592B37'), 'trim', 'u', 1, 1, 0); ch.box(F, -2.0, 2.0, FL + 0.012, FL + 0.02, -9.6, -3.4, col('#7a3a40'), 'trim', 'u', 1, 1, 0)
  // continuous bookshelf wall on the x+ side with books + rolling ladder
  const R = ch.R, bookCols = ['#9a3a3a', '#3f6a4e', '#4a5f8f', '#c29a68', '#7a4a32', '#b9785f', '#e6d6b4', '#6a4a80', '#d9b26a']
  ch.box(F, x1 - 0.04, x1, FL, CE - 0.2, z0 + 0.3, -1.5, col('#4a3123'), 'wood', 'l', 1, 1, 0)
  for (let b = 0; b < 8; b++) { const zA = -1.6 - b * 1.3; ch.box(F, x1 - 0.5, x1 - 0.46, FL, CE - 0.2, zA - 0.05, zA, col('#2b1c16'), 'wood', 'fulr', 1, 1, 0) }
  for (const y of [0.45, 0.95, 1.45, 1.95, 2.45]) ch.box(F, x1 - 0.12, x1 - 0.1, FL + y - 0.46, FL + y - 0.4, z0 + 0.3, -1.5, col('#ffd9a0'), 'glow', 'l', 1, 1, 0)
  for (const y of [0.45, 0.95, 1.45, 1.95, 2.45]) ch.box(F, x1 - 0.5, x1, FL + y - 0.02, FL + y + 0.02, z0 + 0.3, -1.5, col('#4a2f20'), 'wood', 'fulrbud', 1, 1, 0)
  for (const y of [0.0, 0.5, 1.0, 1.5, 2.0]) { let z = -1.7; while (z > z0 + 0.4) { const wd = 0.05 + R() * 0.07, h = 0.28 + R() * 0.16; ch.box(F, x1 - 0.42, x1 - 0.1, FL + y + 0.05, FL + y + 0.05 + h, z - wd, z, col(bookCols[Math.floor(R() * bookCols.length)]), 'trim', 'l', 1, 1, 0); z -= wd + 0.004; if (R() < 0.07) z -= 0.18 } }
  ch.solid(F, x1 - 0.5, x1, FL, CE, z0, -1.5, 'shelves')
  // brass rolling ladder
  ch.box(F, x1 - 0.7, x1 - 0.66, FL, 2.9, -5.2, -5.15, col('#b58a4d'), 'metal', 'fb', 1, 1, 0); ch.box(F, x1 - 0.7, x1 - 0.66, FL, 2.9, -5.9, -5.85, col('#b58a4d'), 'metal', 'fb', 1, 1, 0); for (let i = 0; i < 9; i++) ch.box(F, x1 - 0.7, x1 - 0.5, FL + 0.3 + i * 0.28, FL + 0.33 + i * 0.28, -5.9, -5.15, col('#b58a4d'), 'metal', 'fud', 1, 1, 0)
  ch.box(F, x1 - 0.52, x1 - 0.48, 2.85, 2.95, z0 + 0.3, -1.5, col('#b58a4d'), 'metal', 'l', 1, 1, 0)                                     // ladder rail
  // glazed street wall left: tall bronze mullions reading as library windows is the front glazing already; left-hand reading lounge: two oxblood leather chairs + brass lamp
  baked(ch, F, 'club_chair', x0 + 0.75, -3.0, -Math.PI / 2, { leather: '#592B37', brass: '#b58a4d' }); baked(ch, F, 'club_chair', x0 + 0.75, -5.0, -Math.PI / 2, { leather: '#592B37', brass: '#b58a4d' })
  ch.prism(F, x0 + 0.5, -4.0, 0.2, 0.2, FL, FL + 0.6, col('#38261F'), 'wood', 12); baked(ch, F, 'brass_lamp', x0 + 0.5, -4.0, 0, { brass: '#b58a4d', glow: '#ffe0b0' }, FL + 0.6)
  // central circular book island with lit lower shelf
  ch.prism(F, 0, -6.5, 1.0, 1.0, FL, FL + 0.9, col('#38261F'), 'wood', 28); ch.prism(F, 0, -6.5, 1.04, 1.04, FL + 0.9, FL + 0.95, col('#b58a4d'), 'metal', 28); ch.prism(F, 0, -6.5, 1.02, 1.02, FL + 0.28, FL + 0.32, col('#ffd9b0'), 'glow', 28, false)
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ch.prism(F, Math.cos(a) * 0.62, -6.5 + Math.sin(a) * 0.62, 0.12, 0.12, FL + 0.95, FL + 1.12, col(bookCols[i % bookCols.length]), 'trim', 5) }
  ch.solid(F, -1.05, 1.05, FL, FL + 0.95, -7.55, -5.45, 'island')
  // arched opening to the second reading room (back wall): piers + lintel + arch crown
  ch.box(F, -0.95, 0.95, FL, 2.7, z0 - 0.0, z0 + 0.04, col('#2a1b14'), 'wood', 'f', 1, 1, 0)                                            // recessed back of the arch (dark)
  ch.box(F, x0, -0.95, FL, CE, z0, z0 + 0.1, col('#38261F'), 'wood', 'f', 1, 1, 0); ch.box(F, 0.95, x1 - 0.5, FL, CE, z0, z0 + 0.1, col('#38261F'), 'wood', 'f', 1, 1, 0)
  ch.box(F, -0.95, 0.95, 2.7, CE, z0, z0 + 0.1, col('#38261F'), 'wood', 'f', 1, 1, 0)
  for (const sd of [-1, 1]) ch.box(F, sd * 0.95 - 0.07, sd * 0.95 + 0.07, FL, 2.75, z0 + 0.1, z0 + 0.2, col('#b58a4d'), 'metal', 'fulrb', 1, 1, 0)
  ch.box(F, -1.02, 1.02, 2.7, 2.78, z0 + 0.1, z0 + 0.2, col('#b58a4d'), 'metal', 'fulrbd', 1, 1, 0)
  ch.box(F, -0.9, 0.9, FL + 1.1, FL + 1.8, z0 + 0.04, z0 + 0.06, col('#ffd9b0'), 'glow', 'f', 1, 1, 0)                                      // lit reading room beyond (glow panel)
  ch.box(F, -0.5, 0.5, FL, FL + 0.7, z0 + 0.06, z0 + 0.5, col('#592B37'), 'awning', 'fulrb', 1, 1, 0)                                    // armchair seen through the arch
  // ceiling: cream coffers + brass chandelier
  for (const z of [-3, -5.5, -8]) for (const x of [-1.8, 0, 1.8]) ch.box(F, x - 0.85, x + 0.85, CE - 0.05, CE, z - 0.9, z + 0.9, col('#e9d9c0'), 'trim', 'd', 1, 1, 0)
  ch.prism(F, 0, -6.5, 0.012, 0.012, 2.6, CE, col('#b58a4d'), 'metal', 4)
  for (const [r, y] of [[0.7, 2.7], [0.45, 2.5]]) { ch.prism(F, 0, -6.5, r, r, y, y + 0.05, col('#b58a4d'), 'metal', 28); ch.prism(F, 0, -6.5, r - 0.05, r - 0.05, y - 0.05, y, col('#ffe0b0'), 'glow', 28, false) }
  // small brass wall sconces + sign
  for (const z of [-3.2, -6.5, -9.3]) ch.prism(F, x1 - 0.6, z, 0.08, 0.1, 2.7, 2.9, col('#ffe0b0'), 'glow', 8)
  light(L, F, 0, 2.5, -6.5, '#ffd5a8', 22, 9); light(L, F, 0, 2.5, -3.2, '#ffd5a8', 14, 7); light(L, F, x0 + 0.65, 1.6, -4.0, '#ffb870', 8, 4)
}
