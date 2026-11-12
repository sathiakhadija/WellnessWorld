// Walkable shop interiors (Bible s13 Café Violette, s14 The Quiet Page). Built in the shop frame F: x across, +z to the street, interior at z < -1.1, floor y 0.2, ceiling y 3.35.
// Called from shopBuilding(o.interior). Colours come from the master palette registry (hex literals mirrored from src/palette/registry.src.json).
import * as THREE from 'three'
import { toWorld } from './geo.js'
const col = (h) => new THREE.Color(h)
const FL = 0.2, CE = 3.35
// shared room shell: floor, ceiling, wall linings, front-wall lining beside window/door, walking surface + wall colliders handled by shopBuilding
function shell(ch, F, c, o) {
  const { w, d } = c, x0 = -w / 2 + 0.12, x1 = w / 2 - 0.12, z0 = -d + 0.3, z1 = -1.1
  ch.box(F, x0, x1, FL - 0.06, FL, z0, z1 + 0.02, col(o.floor), 'trim', 'u', 1.2, 1.2, 0)
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
function pendant(ch, F, x, z, r, y, glowCol = '#ffe0b0') {
  ch.prism(F, x, z, 0.012, 0.012, y, CE, col('#b58a4d'), 'metal', 4)
  ch.prism(F, x, z, r, r * 0.7, y - 0.12, y, col('#b58a4d'), 'metal', 16); ch.prism(F, x, z, r * 0.92, r * 0.92, y - 0.14, y - 0.1, col(glowCol), 'glow', 16, false)
}
const chair = (ch, F, x, z, rot, c1, c2) => { // small bistro chair, facing -z when rot 0 (back toward +z)
  const f = { x: 0, z: 0 }; void f; void rot
  ch.box(F, x - 0.21, x + 0.21, FL + 0.44, FL + 0.48, z - 0.21, z + 0.21, col(c1), 'wood', 'fulrbd', 1, 1, 0); for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) ch.box(F, x + dx - 0.015, x + dx + 0.015, FL, FL + 0.44, z + dz - 0.015, z + dz + 0.015, col(c2), 'wood', 'fulrb', 1, 1, 0)
  ch.box(F, x - 0.21, x + 0.21, FL + 0.48, FL + 0.9, z + (rot ? -0.2 : 0.2) - 0.02, z + (rot ? -0.2 : 0.2) + 0.02, col(c1), 'wood', 'fulrb', 1, 1, 0)
}
const table = (ch, F, x, z, r, top, c1, c2) => { ch.prism(F, x, z, r, r, FL + 0.72, FL + 0.76, col(c1), 'slab', 16); ch.prism(F, x, z, 0.04, 0.04, FL, FL + 0.72, col(c2), 'metal', 8); ch.prism(F, x, z, 0.22, 0.22, FL, FL + 0.03, col(c2), 'metal', 12); void top }

export function cafeInterior(ch, F, c, L) {
  const { w, d } = c, x0 = -w / 2 + 0.12, x1 = w / 2 - 0.12, z0 = -d + 0.3
  shell(ch, F, c, { floor: '#a98260', ceil: '#e8d4bc', wall: '#E6D3CB', skirt: '#F7EADA' })
  // marble inlay strip + rug-like central runner
  ch.box(F, -0.9, 0.9, FL, FL + 0.01, z0 + 0.4, -1.5, col('#e6dcd2'), 'slab', 'u', 1.2, 1.2, 0)
  // plum velvet banquette along the left wall with 3 round bistro tables
  const left = c.side === 1 ? 1 : -1  // keep layout independent of door side: banquette on the x- side, counter on x+
  void left
  ch.box(F, x0, x0 + 0.55, FL + 0.05, FL + 0.46, -9.6, -3.4, col('#4B2E5C'), 'awning', 'fulrb', 1, 1, 0.01)
  ch.box(F, x0, x0 + 0.18, FL + 0.46, FL + 1.15, -9.6, -3.4, col('#4B2E5C'), 'awning', 'fulrb', 1, 1, 0.01)
  for (const z of [-4.4, -6.5, -8.6]) { table(ch, F, x0 + 1.35, z, 0.38, 0, '#efe6da', '#3a2f2a'); chair(ch, F, x0 + 2.0, z, 0, '#b69a78', '#3a2f2a') }
  // lounge nook (plum armchairs + low table) toward the rear on the counter-side aisle
  for (const [x, z] of [[-0.55, -10.0], [0.65, -10.0]]) { ch.prism(F, x, z, 0.42, 0.42, FL + 0.05, FL + 0.42, col('#8A5A8C'), 'awning', 16); ch.box(F, x - 0.42, x + 0.42, FL + 0.42, FL + 0.95, z - 0.46, z - 0.3, col('#8A5A8C'), 'awning', 'fulrb', 1, 1, 0) }
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
  for (let i = 0; i < 3; i++) { const x = c.winX0 + 0.6 + i * ((c.winX1 - c.winX0 - 1.2) / 2); ch.prism(F, x, -2.15, 0.19, 0.17, FL + 0.7, FL + 0.76, col('#8A5A8C'), 'awning', 12); ch.prism(F, x, -2.15, 0.03, 0.03, FL, FL + 0.7, col('#B58A4D'), 'metal', 6) }
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
  shell(ch, F, c, { floor: '#6e4a36', ceil: '#cfbda3', wall: '#38261F', skirt: '#2b1c16' })
  // oxblood rug with border
  ch.box(F, -2.2, 2.2, FL, FL + 0.012, -9.8, -3.2, col('#592B37'), 'trim', 'u', 1, 1, 0); ch.box(F, -2.0, 2.0, FL + 0.012, FL + 0.02, -9.6, -3.4, col('#7a3a40'), 'trim', 'u', 1, 1, 0)
  // continuous bookshelf wall on the x+ side with books + rolling ladder
  const R = ch.R, bookCols = ['#7a2f2f', '#2f4a3a', '#3b4a6a', '#a07850', '#5a3a28', '#8a5a4a', '#d8c7a8', '#4a3550']
  ch.box(F, x1 - 0.5, x1, FL, CE - 0.2, z0 + 0.3, -1.5, col('#38261F'), 'wood', 'l', 1, 1, 0)
  for (let b = 0; b < 8; b++) { const zA = -1.6 - b * 1.3; ch.box(F, x1 - 0.5, x1 - 0.46, FL, CE - 0.2, zA - 0.05, zA, col('#2b1c16'), 'wood', 'fulr', 1, 1, 0) }
  for (const y of [0.45, 0.95, 1.45, 1.95, 2.45]) ch.box(F, x1 - 0.5, x1, FL + y - 0.02, FL + y + 0.02, z0 + 0.3, -1.5, col('#4a2f20'), 'wood', 'fulrbud', 1, 1, 0)
  for (const y of [0.0, 0.5, 1.0, 1.5, 2.0]) { let z = -1.7; while (z > z0 + 0.4) { const wd = 0.05 + R() * 0.07, h = 0.28 + R() * 0.16; ch.box(F, x1 - 0.42, x1 - 0.1, FL + y + 0.05, FL + y + 0.05 + h, z - wd, z, col(bookCols[Math.floor(R() * bookCols.length)]), 'trim', 'l', 1, 1, 0); z -= wd + 0.004; if (R() < 0.07) z -= 0.18 } }
  ch.solid(F, x1 - 0.5, x1, FL, CE, z0, -1.5, 'shelves')
  // brass rolling ladder
  ch.box(F, x1 - 0.7, x1 - 0.66, FL, 2.9, -5.2, -5.15, col('#b58a4d'), 'metal', 'fb', 1, 1, 0); ch.box(F, x1 - 0.7, x1 - 0.66, FL, 2.9, -5.9, -5.85, col('#b58a4d'), 'metal', 'fb', 1, 1, 0); for (let i = 0; i < 9; i++) ch.box(F, x1 - 0.7, x1 - 0.5, FL + 0.3 + i * 0.28, FL + 0.33 + i * 0.28, -5.9, -5.15, col('#b58a4d'), 'metal', 'fud', 1, 1, 0)
  ch.box(F, x1 - 0.52, x1 - 0.48, 2.85, 2.95, z0 + 0.3, -1.5, col('#b58a4d'), 'metal', 'l', 1, 1, 0)                                     // ladder rail
  // glazed street wall left: tall bronze mullions reading as library windows is the front glazing already; left-hand reading lounge: two oxblood leather chairs + brass lamp
  for (const [x, z, rr] of [[x0 + 0.65, -3.2, 0], [x0 + 0.65, -4.8, 0]]) { ch.box(F, x - 0.45, x + 0.45, FL + 0.05, FL + 0.45, z - 0.45, z + 0.45, col('#592B37'), 'awning', 'fulrb', 1, 1, 0.01); ch.box(F, x - 0.5, x - 0.3, FL + 0.45, FL + 0.95, z - 0.45, z + 0.45, col('#592B37'), 'awning', 'fulrb', 1, 1, 0.01); void rr }
  ch.prism(F, x0 + 0.65, -4.0, 0.2, 0.2, FL, FL + 0.6, col('#38261F'), 'wood', 10); ch.prism(F, x0 + 0.65, -4.0, 0.012, 0.012, FL + 0.6, FL + 1.1, col('#b58a4d'), 'metal', 6); ch.prism(F, x0 + 0.65, -4.0, 0.17, 0.1, FL + 1.1, FL + 1.3, col('#ffe0b0'), 'glow', 12)
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
