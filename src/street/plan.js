// Neighbourhood masterplan: places every district on the existing world coordinate system (street level GROUND_Y, river toward -z, the tower footprint
// x -62..32 / z -88..4, penthouse entrance axis x = 1.2). Pure data + geometry; no React. Street.jsx turns the result into meshes and colliders.
//
//   z +300  ┌───────────────────────── Romantic lane (west) ─┐
//           │   Neighbourhood Square (fountain)               │
//   z +210  ├──────── Grand Boulevard: Elegant (W) | Modern (E)┤
//   z + 47  ├──────── plaza gate ─────────────────────────────┤
//   z +  4  │  Forecourt + lobby pavilion (lift) ... tower base│   <- penthouse entrance, 87 m above
//           │  West walk | TOWER | East walk                   │
//   z -124  ├──────── Riverside piazza → ramps / stair ───────┤
//   z -146  └──────── Thames terrace (balustrade, skyline) ───┘
import * as THREE from 'three'
import { Chunk, frame, rng, C, GY, GROUND_Y, TERRACE_Y, rowWall, toWorld, dirWorld } from './geo.js'
import { PAL, strip, pane, railing, sash, balconette } from './facade.js'
import { townhouse, modernBlock, shopBuilding } from './buildings.js'

export const BX = 1.2                                   // penthouse entrance axis
export const TERR_H = TERRACE_Y - GY                    // terrace height above street level (≈4.4)
export const BOUNDS = { x0: -130, x1: 86, z0: -150, z1: 128 }
const col = (h) => new THREE.Color(h)
const G = { road: '#6b6a6d', slab: '#e8dfcf', sett: '#d2c7b8', grass: '#8aa356', gravel: '#d3c8b3', paint: '#ece6d8', dark: '#9b8f84' }

export const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function fit(total, lo, hi, R) { const n = Math.max(1, Math.round(total / ((lo + hi) / 2))); const w = []; let s = 0; for (let i = 0; i < n; i++) { w.push(lo + R() * (hi - lo)); s += w[i] } return w.map((x) => x * total / s) }
const pickR = (R, a) => a[Math.floor(R() * a.length) % a.length]

export function buildStreet() {
  const chunks = {}, mk = (n) => chunks[n] || (chunks[n] = new Chunk(n, rng(hash(n))))
  const inst = { plane: [], ornamental: [], clipped: [], lamp: [], bench: [], bollard: [], pathLight: [], table: [], chair: [], urn: [], car1: [], car2: [], car3: [], car4: [], bike: [], shrub: [], grass: [], planter: [] }
  const put = (k, x, z, ry = 0, s = 1, y = GY) => inst[k].push([x, y, z, ry, s])
  const pools = [], halos = [], waters = [], jets = [], lightsAt = []
  const pois = {}
  const R = rng(2026)
  const W0 = frame(0, 0, 0, GY)

  // ---------- small helpers
  const mapSurf = [], mapRib = []
  const surf = (ch, key, x0, x1, z0, z1, c, su, sv, layer = 1, y = GY) => (y === GY && mapSurf.push([key, x0, x1, z0, z1, layer]), ch.flat(frame(0, 0, 0, y + layer * 0.012), x0, x1, z0, z1, 0, col(c), layer >= 2 && key !== 'paint' && key !== 'grass' ? key + '2' : key, su, sv))
  const wall = (ch, x0, x1, z0, z1, h = 1.1, o = {}) => {
    ch.box(W0, x0, x1, 0, h, z0, z1, col(o.col || PAL.limestone), o.key || 'ashlar', 'fulrb', o.key === 'brick' ? 0.9 : 2.4, o.key === 'brick' ? 1 : 1.2)
    if (!o.nocap) ch.box(W0, x0 - 0.05, x1 + 0.05, h, h + 0.1, z0 - 0.05, z1 + 0.05, col('#e6decd'), 'trim', 'fulrb')
    if (!o.nosolid) ch.solid(W0, x0, x1, 0, h + 0.1, z0, z1, 'wall')
  }
  const hedge = (ch, x0, x1, z0, z1, h = 1.1, c = '#4f6038') => {
    ch.box(W0, x0, x1, 0, h, z0, z1, col(c), 'leaf', 'fulrb', 1, 1, 0.1)
    ch.box(W0, x0 + 0.05, x1 - 0.05, h, h + 0.12, z0 + 0.05, z1 - 0.05, col(c).multiplyScalar(1.12), 'leaf', 'u', 1, 1, 0.1)
    ch.solid(W0, x0, x1, 0, h + 0.1, z0, z1, 'hedge')
  }
  const lamp = (x, z, ry = 0) => { put('lamp', x, z, ry); pools.push([x, z, 7.5]); halos.push([x, GY + 4.9, z]) }
  const tree = (kind, x, z, s = 1, ry) => put(kind, x, z, ry ?? R() * 6.28, s)
  const grate = (ch, x, z, s = 1.3) => { ch.flat(frame(x, z, 0, GY + 0.03), -s / 2, s / 2, -s / 2, s / 2, 0, col('#5d5750'), 'sett', 1.6, 1.6); }
  const bench = (x, z, ry) => { put('bench', x, z, ry); const F = frame(x, z, ry, GY); mk('furniture').solid(F, -0.9, 0.9, 0, 0.5, -0.25, 0.25, 'bench') }

  // =====================================================================================================================================
  // 1. TOWER PODIUM: dresses the 7.5 m base of the existing tower on all four sides with real stone piers, deep-set glazing and a cornice
  // =====================================================================================================================================
  const podium = (F, len, h = 7.6, name = 'podium') => {
    const ch = mk(name), t = 0.9, n = Math.max(2, Math.round(len / 6.2)), bay = len / n, stone = col(PAL.limestone)
    ch.box(F, -len / 2, len / 2, 0, 0.7, -t, 0.25, col('#c3b8a3'), 'ashlar', 'fulr', 2.4, 1.2)                                            // plinth course
    const ops = []
    for (let i = 0; i < n; i++) { const cx = -len / 2 + (i + 0.5) * bay; ops.push({ x0: cx - bay / 2 + 1.0, x1: cx + bay / 2 - 1.0, sill: 0.7, head: h - 1.5 }) }
    rowWall(ch, F, -len / 2, len / 2, 0.7, h, ops.map((o) => ({ ...o, sill: o.sill - 0.7, head: o.head - 0.7 })), t, stone, 'ashlar', 2.4, 1.2)
    ops.forEach((o) => {
      const lit = R() < 0.5; pane(ch, F, o.x0, o.x1, o.sill, o.head, -t + 0.12, lit)
      const nm = Math.max(1, Math.round((o.x1 - o.x0) / 1.4)); for (let i = 1; i < nm; i++) { const x = o.x0 + (i / nm) * (o.x1 - o.x0); strip(ch, F, 'metal+', col(PAL.charcoal), x - 0.03, x + 0.03, o.sill, o.head, -t + 0.14) }
      strip(ch, F, 'metal+', col(PAL.charcoal), o.x0, o.x1, o.sill + (o.head - o.sill) * 0.62, o.sill + (o.head - o.sill) * 0.62 + 0.05, -t + 0.14)
      ch.box(F, o.x0 - 0.1, o.x1 + 0.1, o.sill - 0.12, o.sill, -0.05, 0.12, stone, 'trim+', 'fu')
    })
    ch.box(F, -len / 2 - 0.1, len / 2 + 0.1, h, h + 0.22, -t, 0.35, stone, 'trim', 'fulrd'); ch.box(F, -len / 2 - 0.15, len / 2 + 0.15, h + 0.22, h + 0.4, -t, 0.5, stone, 'trim', 'fulrd')
    ch.solid(F, -len / 2, len / 2, 0, h + 6, -t, 0.25, 'podium')
  }
  // =====================================================================================================================================
  // 2. WELLNESS HOUSE: residential lobby building (lift, concierge, seating) closing the north end of the private courtyard
  //    Local frame FL: origin on the facade plane (z = 14) at the entrance axis, +z out into the courtyard, x across (-17.25..17.25 = world -16.05..18.45)
  // =====================================================================================================================================
  const CX0 = BX - 15, CX1 = BX + 15, CZ0 = 14, CZ1 = 49                     // courtyard 30 x 35 m
  const HX0 = CX0 - 2.25, HX1 = CX1 + 2.25                                   // residential facade planes either side (their 2.25 m front gardens face the courtyard)
  const mass = (ch, x0, x1, z0, z1, h, c = PAL.stock, key = 'brick') => {
    ch.box(W0, x0, x1, 0, h, z0, z1, col(c), key, 'flrb', 0.9, 1)
    ch.box(W0, x0 - 0.1, x1 + 0.1, h, h + 0.35, z0 - 0.1, z1 + 0.1, col('#d9cfba'), 'trim', 'fulrbd')
    ch.box(W0, x0 + 0.4, x1 - 0.4, h + 0.35, h + 0.4, z0 + 0.4, z1 - 0.4, col(PAL.slate), 'roof', 'u')
    ch.solid(W0, x0, x1, 0, h + 3, z0, z1, 'mass')
  }
  {
    const ch = mk('lobby'), FL = frame(BX, 14, 0, GY), FP = frame(BX, 4, 0, GY)
    const lim = col(PAL.limestone), brickC = col('#b77a58'), bronze = col('#5b4731'), brass = col(PAL.brass), walnut = col('#5a3d2a')
    const gh = 5.2, fh = 3.3, nf = 3, H = gh + nf * fh, t = 0.45, hw = 17.25
    // ---- ground floor: limestone with a deep glazed central bay (the lobby) and two stone wings with recessed windows
    const wingOps = []
    for (const s of [-1, 1]) for (const cx of [10.6, 14.4]) wingOps.push({ x0: s * cx - 0.8, x1: s * cx + 0.8, sill: 0.95, head: 4.0 })
    wingOps.push({ x0: -7, x1: 7, sill: 0, head: 4.7 })
    rowWall(ch, FL, -hw, hw, 0, gh, wingOps.sort((a, b) => a.x0 - b.x0), t, lim, 'ashlar', 2.4, 1.2)
    for (const o of wingOps) if (o.x1 - o.x0 < 3) { sash(ch, FL, (o.x0 + o.x1) / 2, o.sill, o.x1 - o.x0, o.head - o.sill, t, { style: 'plate', lit: R() < 0.5, stone: lim }) }
    // string course, then three brick floors of sash windows with a stone cornice
    ch.box(FL, -hw - 0.05, hw + 0.05, gh, gh + 0.2, -t, 0.14, lim, 'trim', 'fulrd')
    const nb = 10, bw = (2 * hw) / nb
    for (let f = 0; f < nf; f++) {
      const y0 = gh + 0.2 + f * fh, y1 = y0 + fh, ops = []
      for (let b = 0; b < nb; b++) { const cx = -hw + (b + 0.5) * bw; ops.push({ x0: cx - 0.6, x1: cx + 0.6, sill: 0.55, head: 0.55 + (f === 0 ? 2.25 : 2.0) }) }
      rowWall(ch, FL, -hw, hw, y0, y1, ops, t, brickC, 'brick', 0.9, 1)
      ops.forEach((o) => sash(ch, FL, (o.x0 + o.x1) / 2, y0 + o.sill, 1.2, o.head - o.sill, t, { lit: R() < 0.34, stone: lim }))
      if (f === 0) for (let b = 0; b < nb; b++) { const cx = -hw + (b + 0.5) * bw; if (b % 2 === 0) balconette(ch, FL, cx, y0 + 0.55, 1.2, {}) }
    }
    ch.box(FL, -hw - 0.15, hw + 0.15, H - 0.1, H + 0.3, -t, 0.5, lim, 'trim', 'fulrbd'); ch.box(FL, -hw - 0.2, hw + 0.2, H + 0.3, H + 0.55, -t, 0.62, lim, 'trim', 'fulrbd')
    // ---- bronze shopfront-style glazing frame + entrance portal at the centre
    const zf = -0.08
    const bz = col('#A77D4D')
    for (const x of [-7, -5.6, -4.2, -2.8, -1.45, 1.45, 2.8, 4.2, 5.6, 7]) ch.box(FL, x - 0.025, x + 0.025, 0, 4.7, zf - 0.07, zf + 0.07, bz, 'metal+', 'fulrb', 1, 1, 0)       // slim champagne-bronze mullions
    for (const y of [0.1, 3.2, 4.7]) ch.box(FL, -7, 7, y - 0.03, y + 0.03, zf - 0.07, zf + 0.07, bz, 'metal+', 'fulrb', 1, 1, 0)
    for (const s of [-1, 1]) ch.box(FL, s * 1.45 - 0.06, s * 1.45 + 0.06, 0, 3.3, zf - 0.1, zf + 0.12, bz, 'metal', 'fulrb', 1, 1, 0)
    ch.box(FL, -1.55, 1.55, 3.2, 3.4, zf - 0.1, zf + 0.12, bz, 'metal', 'fulrb', 1, 1, 0)
    ch.box(FL, -1.2, 1.2, 3.4, 3.5, zf - 0.02, zf + 0.04, brass, 'metal', 'fu', 1, 1, 0)
    // sliding door track + leaves (glass with slim frames), centre seam
    ch.box(FL, -1.45, 1.45, 0, 0.02, zf - 0.08, zf + 0.1, brass, 'metal', 'u', 1, 1, 0)
    for (const x of [-0.72, 0.72]) { ch.box(FL, x - 0.7, x + 0.7, 0.02, 3.18, zf - 0.02, zf + 0.02, col('#cfe0e4'), 'shopglass', 'fb', 1, 1, 0); for (const dx of [-0.7, 0.7]) ch.box(FL, x + dx - 0.025, x + dx + 0.025, 0.02, 3.18, zf - 0.04, zf + 0.04, bz, 'metal', 'fulrb', 1, 1, 0) }
    // glass panes in the glazing grid (slightly tinted, low opacity so the courtyard shows through)
    for (const [x0, x1] of [[-7, -5.6], [-5.6, -4.2], [-4.2, -2.8], [-2.8, -1.45], [1.45, 2.8], [2.8, 4.2], [4.2, 5.6], [5.6, 7]]) ch.box(FL, x0, x1, 0.1, 4.7, zf - 0.01, zf + 0.01, col('#cfe0e4'), 'shopglass', 'fb', 1, 1, 0)
    for (const x of [-4.2, 4.2]) ch.box(FL, x - 0.3, x + 0.3, 2.62, 4.6, zf - 0.02, zf, col('#ffe2b0'), 'glow', 'f', 1, 1, 0)                // warm glow behind the upper lobby glazing
    ch.solid(FL, -7, -1.55, 0, 4.7, -0.3, 0.0, 'lobbyglass'); ch.solid(FL, 1.55, 7, 0, 4.7, -0.3, 0.0, 'lobbyglass')
    // wing masses + back-of-house
    for (const s of [-1, 1]) { ch.box(FL, s > 0 ? 7.2 : -hw, s > 0 ? hw : -7.2, 0, H, -10, -t, col(PAL.stock), 'brick', 'lrb', 0.9, 1); ch.solid(FL, s > 0 ? 7.2 : -hw, s > 0 ? hw : -7.2, 0, H + 3, -10, -t, 'wing') }
    ch.box(FL, -7.2, 7.2, 4.9, H, -10, -t, col(PAL.stock), 'brick', 'fb', 0.9, 1)
    ch.box(FL, -hw, hw, H + 0.55, H + 0.6, -10, 0.3, col(PAL.slate), 'roof', 'u')
    // ---- the lobby interior (FP: lz 0 = the tower wall at z = 4; the lobby is lx -7..7, lz 0.9..9.55; ceiling 4.9)
    const iw = 7
    ch.box(FP, -iw, iw, -0.01, 0.04, 0.9, 9.6, col('#f0dfca'), 'trim', 'u', 2.8, 2.8)                                                      // pale veined marble floor (large slabs)
    ch.box(FP, -iw + 0.6, iw - 0.6, 0.04, 0.046, 1.5, 9.0, col('#e6d2bc'), 'trim', 'u', 2.8, 2.8, 0)                                      // inlaid border
    for (const [x0, x1, z0, z1] of [[-iw + 0.6, iw - 0.6, 1.5, 1.54], [-iw + 0.6, iw - 0.6, 8.96, 9.0], [-iw + 0.6, -iw + 0.64, 1.5, 9.0], [iw - 0.64, iw - 0.6, 1.5, 9.0]]) ch.box(FP, x0, x1, 0.046, 0.052, z0, z1, brass, 'metal', 'u', 1, 1, 0)   // brass inlay line
    ch.box(FP, -iw, iw, 4.9, 5.2, 0.9, 9.6, col('#efe4d6'), 'trim', 'fd', 1, 1, 0)                                                          // ceiling
    for (const [x0, x1, z0, z1] of [[-iw, -iw + 0.9, 0.9, 9.6], [iw - 0.9, iw, 0.9, 9.6], [-iw + 0.9, iw - 0.9, 0.9, 1.7], [-iw + 0.9, iw - 0.9, 8.7, 9.6]]) ch.box(FP, x0, x1, 4.55, 4.9, z0, z1, col('#efe4d6'), 'trim', 'fd', 1, 1, 0)   // recessed ceiling soffit
    for (const [x0, x1, z0, z1] of [[-iw + 0.9, -iw + 0.96, 1.7, 8.7], [iw - 0.96, iw - 0.9, 1.7, 8.7], [-iw + 0.96, iw - 0.96, 1.7, 1.76], [-iw + 0.96, iw - 0.96, 8.64, 8.7]]) ch.box(FP, x0, x1, 4.5, 4.55, z0, z1, col('#ffd9b0'), 'glow', 'd', 1, 1, 0)   // warm cove light
    for (const x of [-4.2, -1.9, 1.9, 4.2]) for (const z of [2.6, 5.0, 7.4]) ch.prism(FP, x, z, 0.11, 0.11, 4.86, 4.9, col('#ffe6c4'), 'glow', 12)   // recessed downlights
    for (const [x0, x1, z0, z1] of [[-iw, iw, 0.9, 0.96], [-iw, -iw + 0.06, 0.9, 9.6], [iw - 0.06, iw, 0.9, 9.6]]) ch.box(FP, x0, x1, 0, 0.16, z0, z1, col('#f1e8dc'), 'trim', 'fulrb', 1, 1, 0)   // skirting
    for (const s of [-1, 1]) { ch.box(FP, s * 5.6 - 0.15, s * 5.6 + 0.15, 4.84, 4.9, 1.2, 9.4, col('#ffe0b0'), 'glow', 'd', 1, 1, 0); ch.box(FP, Math.min(s * 7.0, s * 7.2), Math.max(s * 7.0, s * 7.2), 0, 4.9, 0.9, 9.6, col('#dcc3b1'), 'trim', 'fulrb', 8, 8); ch.solid(FP, Math.min(s * 7.0, s * 7.2), Math.max(s * 7.0, s * 7.2), 0, 4.9, 0.9, 9.6, 'lobbywall') }
    ch.box(FP, -iw - 0.1, iw + 0.1, 4.9, 5.0, 0.9, 9.6, col('#e9dfca'), 'trim', 'fulrbd', 1, 1, 0)
    // back wall: limestone with the lift recess, flanked by walnut panelling
    const FB = frame(BX, 4.9, 0, GY)
    rowWall(ch, FB, -iw, iw, 0, 4.9, [{ x0: -0.95, x1: 0.95, sill: 0, head: 2.6 }], 0.9, col('#dcc3b1'), 'trim', 8, 8)
    for (const sd of [-1, 1]) {
      ch.box(FB, Math.min(sd * 1.55, sd * 5.8), Math.max(sd * 1.55, sd * 5.8), 0.1, 3.6, 0.0, 0.03, col('#c9ad92'), 'wood', 'f', 1, 1, 0)           // slat backing
      for (let k = 0; k < 22; k++) { const x0 = sd * (1.6 + k * 0.19); ch.box(FB, Math.min(x0, x0 + sd * 0.12), Math.max(x0, x0 + sd * 0.12), 0.1, 3.6, 0.03, 0.09, col('#a9835f').multiplyScalar(0.92 + 0.07 * (k % 3)), 'wood', 'flr', 1, 1, 0.02) }
      ch.box(FB, Math.min(sd * 1.1, sd * 1.5), Math.max(sd * 1.1, sd * 1.5), 0, 3.5, -0.02, 0.1, col('#33281f'), 'slab', 'fulr', 1.2, 1.2, 0)         // dark veined marble pilaster
      ch.box(FB, Math.min(sd * 5.8, sd * 5.86), Math.max(sd * 5.8, sd * 5.86), 0.1, 3.6, 0.0, 0.12, col('#ffd9b0'), 'glow', 'f', 1, 1, 0)             // slat uplight edge
    }
    ch.box(FB, -1.5, 1.5, 2.72, 3.5, -0.02, 0.1, col('#33281f'), 'slab', 'fulr', 1.2, 1.2, 0)
    ch.box(FB, -0.95, 0.95, 0, 0.01, -0.9, 0, col('#cdbf9f'), 'trim', 'u')
    ch.acc('glow').quad(...[[-0.9, 0.04, -0.82], [0.9, 0.04, -0.82], [0.9, 2.55, -0.82], [-0.9, 2.55, -0.82]].map(([x, y, z]) => [FB.x + x, FB.y + y, FB.z + z]), col('#ffdca8'), [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]])
    for (const s of [-1, 1]) ch.box(FB, s * 1.0 - 0.05, s * 1.0 + 0.05, 0, 2.7, -0.1, 0.06, bronze, 'metal+', 'fulr')
    ch.box(FB, -1.05, 1.05, 2.6, 2.72, -0.1, 0.06, bronze, 'metal+', 'fulr')
    ch.box(FB, -0.14, 0.14, 2.9, 3.0, 0.0, 0.05, col('#ffd9a0'), 'glow', 'f', 1, 1, 0)                                                      // floor indicator
    ch.box(FB, 1.15, 1.3, 1.0, 1.5, 0.0, 0.04, brass, 'metal+', 'fu')                                                                         // call plate
    pois.lift = { x: BX, z: 4.9, doorZ: 4.9 - 0.12, w: 0.9, h: 2.5, y: GY }
    ch.solid(FP, -iw, iw, 0, 4.9, 0, 0.95, 'liftwall')
    // lift cab beyond the doors (walnut, bronze, a warm light and a control panel); visible when the doors are open
    {
      const FC = frame(BX, 4.9, 0, GY)
      ch.box(FC, -1.1, 1.1, 0, 0.04, -2.7, -0.2, col('#cdbf9f'), 'slab', 'u', 1.8, 1.2); ch.box(FC, -1.1, 1.1, 2.55, 2.7, -2.7, -0.2, col('#efe2c4'), 'trim', 'd', 1, 1, 0)
      ch.box(FC, -1.1, -1.0, 0, 2.55, -2.7, -0.2, walnut, 'wood', 'r', 1, 1, 0); ch.box(FC, 1.0, 1.1, 0, 2.55, -2.7, -0.2, walnut, 'wood', 'l', 1, 1, 0); ch.box(FC, -1.1, 1.1, 0.04, 2.55, -2.72, -2.6, walnut.clone().multiplyScalar(1.1), 'wood', 'f', 1, 1, 0)
      ch.box(FC, -1.1, 1.1, 1.0, 1.06, -2.62, -2.58, bronze, 'metal+', 'f', 1, 1, 0)                                                         // handrail
      ch.box(FC, -0.5, 0.5, 2.5, 2.54, -2.5, -0.5, col('#ffe0b0'), 'glow', 'd', 1, 1, 0)
      ch.box(FC, 0.58, 0.9, 1.1, 1.62, -0.62, -0.58, bronze, 'metal+', 'f', 1, 1, 0); for (let i = 0; i < 3; i++) ch.box(FC, 0.66, 0.72, 1.18 + i * 0.12, 1.24 + i * 0.12, -0.6, -0.57, col('#ffd9a0'), 'glow', 'f', 1, 1, 0)   // control panel
    }
    // side walls: art. Three framed pieces (muted abstract canvases) on the west wall, one large on the east
    const art = (lx, lz, w, h, y, c1, c2, side) => {
      const FA = frame(BX + side * iw, 4 + lz, side * -Math.PI / 2, GY), wx = w
      ch.box(FA, -wx / 2 - 0.07, wx / 2 + 0.07, y - 0.07, y + h + 0.07, 0, 0.06, bronze, 'metal+', 'fulrb', 1, 1, 0)
      ch.box(FA, -wx / 2, wx / 2, y, y + h, 0.04, 0.07, c1, 'trim', 'f', 1, 1, 0); ch.box(FA, -wx / 2 + 0.2, wx / 2 - 0.2, y + h * 0.18, y + h * 0.55, 0.07, 0.08, c2, 'trim', 'f', 1, 1, 0)
    }
    art(0, 3.3, 1.1, 1.4, 1.5, col('#bfb39b'), col('#8a6a78'), -1); art(0, 5.3, 1.1, 1.4, 1.5, col('#a9b39a'), col('#cbb78d'), -1); art(0, 7.3, 1.1, 1.4, 1.5, col('#d9cdb8'), col('#cf8f9c'), -1); art(0, 6.0, 2.3, 1.5, 1.4, col('#cbb9a0'), col('#a45f47'), 1)
    // curved fluted reception counter (east), warm stone top, brass plinth, lamp + bouquet
    {
      const cc = col('#cdb59c'), fl = col('#bfa58a')
      ch.box(FP, 3.45, 5.35, 0.08, 1.05, 2.4, 3.5, cc, 'plaster', 'fulrb', 2, 2, 0.01)
      for (const x of [3.45, 5.35]) ch.prism(FP, x, 2.95, 0.55, 0.55, 0.08, 1.05, cc, 'plaster', 24)
      for (let k = 0; k < 29; k++) { const x = 2.95 + k * 0.1; const z = x < 3.45 ? 2.95 + Math.sqrt(Math.max(0, 0.3025 - (x - 3.45) ** 2)) : x > 5.35 ? 2.95 + Math.sqrt(Math.max(0, 0.3025 - (x - 5.35) ** 2)) : 3.5; ch.box(FP, x, x + 0.045, 0.1, 1.03, z, z + 0.04, fl, 'plaster', 'f', 1, 1, 0) }
      ch.box(FP, 3.45, 5.35, 0, 0.08, 2.4, 3.56, brass, 'metal', 'fulrb', 1, 1, 0); for (const x of [3.45, 5.35]) ch.prism(FP, x, 2.95, 0.58, 0.58, 0, 0.08, brass, 'metal', 24)
      ch.box(FP, 3.45, 5.35, 1.05, 1.12, 2.34, 3.58, col('#efe6da'), 'slab', 'fulrbd', 1.2, 1.2, 0); for (const x of [3.45, 5.35]) ch.prism(FP, x, 2.95, 0.62, 0.62, 1.05, 1.12, col('#efe6da'), 'slab', 24)
      ch.box(FP, 3.0, 5.8, 0.98, 1.04, 3.5, 3.58, col('#ffd9b0'), 'glow', 'f', 1, 1, 0)
      ch.solid(FP, 2.85, 5.95, 0, 1.12, 2.35, 3.65, 'desk')
      ch.prism(FP, 4.0, 3.0, 0.014, 0.014, 1.12, 1.5, brass, 'metal', 6); ch.prism(FP, 4.0, 3.0, 0.16, 0.12, 1.5, 1.7, col('#ffe0b0'), 'glow', 14)
      ch.prism(FP, 5.0, 3.0, 0.06, 0.06, 1.12, 1.3, col('#e8e0d6'), 'trim', 10); ch.prism(FP, 5.0, 3.0, 0.2, 0.2, 1.3, 1.62, col('#c98f9f'), 'awning', 10)
    }
    // upholstered cream barrel chair + brass side table
    ch.prism(FP, -4.7, 2.7, 0.46, 0.46, 0.05, 0.42, col('#eadfd0'), 'awning', 20); ch.box(FP, -5.2, -4.2, 0.42, 0.95, 2.2, 2.45, col('#eadfd0'), 'awning', 'fulrb', 1, 1, 0.01); ch.prism(FP, -4.7, 2.7, 0.44, 0.44, 0.42, 0.5, col('#cfa7a0'), 'awning', 20)
    ch.solid(FP, -5.2, -4.2, 0, 0.95, 2.2, 3.2, 'armchair')
    ch.prism(FP, -3.7, 2.7, 0.22, 0.22, 0.05, 0.56, brass, 'metal', 14); ch.prism(FP, -3.7, 2.7, 0.26, 0.26, 0.56, 0.6, col('#efe6da'), 'slab', 14); ch.prism(FP, -3.7, 2.7, 0.12, 0.1, 0.6, 0.8, col('#c98f9f'), 'awning', 10); ch.solid(FP, -3.95, -3.45, 0, 0.8, 2.45, 2.95, 'table')
    // deliberately placed rug between lift, counter and door
    ch.box(FP, -2.6, 2.6, 0.05, 0.062, 3.4, 7.2, col('#c9b6a3'), 'trim', 'u', 1, 1, 0); ch.box(FP, -2.4, 2.4, 0.062, 0.07, 3.6, 7.0, col('#d9c9bc'), 'trim', 'u', 1, 1, 0)
    // sculptural pendant: stacked brass rings on a drop rod, warm glow core
    const FD = frame(BX, 4 + 5.2, 0, GY)
    ch.prism(FD, 0, 0, 0.012, 0.012, 3.0, 4.9, brass, 'metal', 4)
    for (const [r, y] of [[1.15, 3.85], [0.82, 3.52], [0.5, 3.2]]) { ch.prism(FD, 0, 0, r, r, y, y + 0.05, brass, 'metal', 40); ch.prism(FD, 0, 0, r - 0.05, r - 0.05, y - 0.04, y, col('#ffe0b0'), 'glow', 40) }
    // restrained greenery: two stone planters at the lift wall, a pair of potted trees by the doors
    for (const s of [-1, 1]) { put('planter', BX + s * 5.0, 5.7, 0, 1.0, GY); put('shrub', BX + s * 5.0 + 0.2, 5.7, 0, 1.0, GY + 0.62) }
    for (const sd of [-1, 1]) for (const [dx, dz, hh] of [[3.35, 8.4, 0.42], [3.75, 8.85, 0.3]]) { const x = sd * dx; ch.box(FP, x - 0.14, x + 0.14, 0.04, 0.04 + hh, dz - 0.14, dz + 0.14, col('#ffdca8'), 'glow', 'fulrb', 1, 1, 0); ch.box(FP, x - 0.17, x + 0.17, 0.0, 0.05, dz - 0.17, dz + 0.17, brass, 'metal', 'fulrbu', 1, 1, 0); ch.box(FP, x - 0.17, x + 0.17, 0.04 + hh, 0.08 + hh, dz - 0.17, dz + 0.17, brass, 'metal', 'fulrbu', 1, 1, 0); for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ch.box(FP, x + ax * 0.16 - 0.012, x + ax * 0.16 + 0.012, 0.05, 0.04 + hh, dz + az * 0.16 - 0.012, dz + az * 0.16 + 0.012, brass, 'metal', 'fulrb', 1, 1, 0) }   // brass lanterns
    for (const sd of [-1, 1]) ch.prism(FP, sd * 3.0, 8.35, 0.26, 0.2, 0.04, 0.5, col('#c98f9f'), 'awning', 12)                                                                                   // hydrangea mound
    for (const s of [-1, 1]) { put('urn', BX + s * 2.7, 8.7, 0, 1.0, GY); put('ornamental', BX + s * 2.7, 8.7, 0, 0.42, GY + 0.9) }
    lightsAt.push({ x: BX, y: GY + 3.4, z: 4 + 5.2, color: '#ffd5a8', intensity: 5, distance: 14 })
    halos.push([BX, GY + 3.2, 4 + 5.2], [BX, GY + 4.0, 14.6])
    // door to the courtyard: a clear 2.9 m opening (no leaves, so the arrival is never blocked)
    pois.lobby = { x: BX, z: 9 }
    pois.pavilion = { x: BX, z: 14 }
    // building masses beside + behind the courtyard (brick end elevations / back of house)
    const bm = mk('masses')
    mass(bm, -62, -28, 4, 34.75, 14.6); mass(bm, -28, HX0, 4, 14, 14.6); mass(bm, 30.45, 62, 4, 34.75, 14.6); mass(bm, HX1, 30.45, 4, 14, 14.6)
    // the tower's own south face stays as drawn by the V10 massing; the podium below dresses the remaining faces
  }

  // =====================================================================================================================================
  // 3. PRIVATE COURTYARD (30 x 35 m): signature plane tree with a curved limestone bench, a contemporary rill, layered planting, stone paths, bronze gateway
  // =====================================================================================================================================
  {
    const g = mk('courtyard'), cx = BX, cz = 30.5, G2 = '#d4c8b2'
    // paving: stone field with a lighter path spine and a paved ring around the tree; planted beds between
    surf(g, 'grass', CX0 - 2.25, CX1 + 2.25, CZ0, CZ1, '#7f9a58', 4, 4, 0)
    surf(g, 'slab', CX0, CX1, CZ0, CZ0 + 6.5, G.slab, 1.8, 1.2, 1)                                                 // forecourt apron at the lobby doors
    surf(g, 'slab', cx - 1.8, cx + 1.8, CZ0 + 6.5, CZ1, G.slab, 1.8, 1.2, 1)                                       // path spine to the gate
    surf(g, 'sett', cx - 8.4, cx + 8.4, cz - 8.4, cz + 8.4, G.sett, 1.6, 1.6, 1)                                      // setts square under the tree (the "room")
    surf(g, 'slab', cx - 6.6, cx + 6.6, cz - 6.6, cz + 6.6, G.slab, 1.8, 1.2, 2)
    surf(g, 'slab', CX0, CX0 + 2.4, CZ0 + 6.5, CZ1, G.slab, 1.8, 1.2, 1); surf(g, 'slab', CX1 - 2.4, CX1, CZ0 + 6.5, CZ1, G.slab, 1.8, 1.2, 1)     // side paths along the house gardens
    surf(g, 'slab', cx - 8.4, CX0 + 2.4, cz - 1, cz + 1, G.slab, 1.8, 1.2, 1); surf(g, 'slab', cx + 8.4, CX1 - 2.4, cz - 1, cz + 1, G.slab, 1.8, 1.2, 1)   // cross paths
    // the signature tree + pit + curved limestone bench (two arcs open to the path axis)
    put('plane', cx, cz, 0.3, 1.5)
    {
      const FT = frame(cx, cz, 0, GY)
      g.prism(FT, 0, 0, 2.6, 2.6, 0, 0.42, col('#e0d6c4'), 'ashlar', 36)                                                         // low circular limestone planter
      g.prism(FT, 0, 0, 2.63, 2.63, 0.3, 0.33, col('#ffd29a'), 'glow', 36)                                                       // softly glowing recessed light strip
      g.prism(FT, 0, 0, 2.62, 2.62, 0.42, 0.46, col('#efe7d8'), 'trim', 36)                                                      // coping
      g.prism(FT, 0, 0, 2.3, 2.3, 0.42, 0.5, col('#5a4a3a'), 'gravel', 30)                                                       // soil bed
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 1.55 + (i % 3) * 0.25; g.prism(frame(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0, GY), 0, 0, 0.34, 0.16, 0.48, 0.68, col(['#edE6d7', '#82749a', '#718451'][i % 3]), 'leaf', 8) }   // off-white, lavender and sage planting
      g.solid(FT, -2.3, 2.3, 0, 0.46, -2.3, 2.3, 'planter')
    }
    const arc = (a0, a1, r = 3.6) => {
      const n = 11
      for (let i = 0; i < n; i++) {
        const a = a0 + ((i + 0.5) / n) * (a1 - a0), seg = ((a1 - a0) / n) * r * 1.04, rot = Math.atan2(-Math.cos(a), -Math.sin(a)), F = frame(cx + Math.cos(a) * r, cz + Math.sin(a) * r, rot, GY)
        g.box(F, -seg / 2, seg / 2, 0, 0.46, -0.32, 0.32, col('#e0d6c0'), 'ashlar', 'fulrb', 2.4, 1.2, 0.02); g.box(F, -seg / 2 - 0.02, seg / 2 + 0.02, 0.46, 0.52, -0.36, 0.36, col('#ebe3d1'), 'trim', 'fulrbd')
        g.solid(F, -seg / 2, seg / 2, 0, 0.52, -0.36, 0.36, 'bench')
      }
    }
    arc(-1.15, 1.15); arc(Math.PI - 1.15, Math.PI + 1.15)
    // contemporary water feature: a long black-granite rill with a standing stone spill at the north end (calm, no jets)
    const rx = cx + 9.9, rz0 = cz - 4.5, rz1 = cz + 4.5
    g.box(W0, rx - 0.55, rx + 0.55, 0, 0.3, rz0 - 0.3, rz1 + 0.3, col('#34322f'), 'trim', 'fulrb', 1, 1, 0.02)
    g.solid(W0, rx - 0.55, rx + 0.55, 0, 0.3, rz0 - 0.3, rz1 + 0.3, 'rill')
    g.box(W0, rx - 0.3, rx + 0.3, 0.3, 0.32, rz0, rz1, col('#1e1d22'), 'trim', 'u', 1, 1, 0)
    waters.push({ x: rx, z: (rz0 + rz1) / 2, w: 0.6, d: rz1 - rz0, y: GY + 0.34, kind: 'pool' })
    g.box(W0, rx - 0.35, rx + 0.35, 0.3, 1.5, rz0 - 0.9, rz0 - 0.3, col('#ddd2bb'), 'ashlar', 'fulrb', 2.4, 1.2, 0.02); g.solid(W0, rx - 0.35, rx + 0.35, 0.3, 1.5, rz0 - 0.9, rz0 - 0.3, 'spill')
    // layered planting: clipped hedge walls along the garden railings, shrub mounds, ornamental grasses, a few restrained blush flowers
    for (const [xa, xb] of [[CX0 + 0.1, CX0 + 0.9], [CX1 - 0.9, CX1 - 0.1]]) { for (let z = CZ0 + 8; z < CZ1 - 4; z += 7) { hedge(g, xa, xb, z, z + 5.5, 0.9, '#4e6139') } }
    const R2 = rng(77)
    for (const [bx0, bx1, bz0, bz1] of [[CX0 + 3, cx - 9.2, CZ0 + 8, cz - 3], [CX0 + 3, cx - 9.2, cz + 3, CZ1 - 3], [cx + 9.2, CX1 - 3, CZ0 + 8, cz - 8], [cx + 9.2, CX1 - 3, cz + 6, CZ1 - 3]]) {
      for (let i = 0; i < 14; i++) { const x = bx0 + R2() * (bx1 - bx0), z = bz0 + R2() * (bz1 - bz0); if (R2() < 0.55) put('shrub', x, z, R2() * 6, 0.7 + R2() * 0.5); else put('grass', x, z, R2() * 6, 0.9 + R2() * 0.5) }
      for (let i = 0; i < 4; i++) { const x = bx0 + R2() * (bx1 - bx0), z = bz0 + R2() * (bz1 - bz0); g.prism(frame(x, z, 0, GY), 0, 0, 0.3, 0.22, 0.0, 0.34, col(['#cfa9ad', '#e4d9cb', '#b7a5c4'][i % 3]), 'leaf', 8) }
    }
    for (const [x, z] of [[cx - 4.6, CZ0 + 2.0], [cx + 4.6, CZ0 + 2.0]]) { put('planter', x, z, 0, 1.0) }
    put('ornamental', CX0 + 4.5, CZ0 + 14, 0, 0.8); put('ornamental', CX1 - 4.5, CZ0 + 17, 1, 0.85); put('ornamental', CX0 + 4.5, CZ1 - 6, 2, 0.8); put('ornamental', CX1 - 4.5, CZ1 - 8, 3, 0.8)
    // discreet lighting: low path lights along the spine, two lamps at the gate, soft pools
    for (let z = CZ0 + 8; z <= CZ1 - 2; z += 5.2) for (const s of [-1, 1]) { put('pathLight', cx + s * 2.3, z, 0); pools.push([cx + s * 2.3, z, 3.2]) }
    pools.push([cx, cz, 9]); halos.push([cx + 2.4, GY + 2.6, cz - 1])
    pois.courtyard = { x: BX, z: 30 }

    // ---- bronze gateway on the lane (z 49 .. 50): stone piers, a bronze arch + railings either side, 3.2 m opening on the axis
    const FG = frame(BX, 49.6, 0, GY), bronze = col('#5b4731'), lim = col(PAL.limestone), hw = (HX1 - HX0) / 2
    for (const s of [-1, 1]) {
      const px = s * 2.2
      g.box(FG, px - 0.45, px + 0.45, 0, 3.0, -0.45, 0.45, lim, 'ashlar', 'fulrb', 2.4, 1.2); g.box(FG, px - 0.55, px + 0.55, 3.0, 3.15, -0.55, 0.55, col('#e6decd'), 'trim', 'fulrbd')
      g.box(FG, px - 0.12, px + 0.12, 3.15, 3.55, -0.12, 0.12, col('#ffd9a0'), 'glow', 'fulrb', 1, 1, 0)                                                // gate lantern
      g.solid(FG, px - 0.45, px + 0.45, 0, 3.1, -0.45, 0.45, 'gatepier')
      const a = s * 2.65, b = s * hw
      g.box(FG, Math.min(a, b), Math.max(a, b), 0, 0.55, -0.28, 0.28, lim, 'ashlar', 'fulrb', 2.4, 1.2)                                                  // stone plinth
      railing(g, FG, Math.min(a, b), Math.max(a, b), 0, 0.55, 1.85, { col: bronze, sp: 0.12 }); g.solid(FG, Math.min(a, b), Math.max(a, b), 0, 2.4, -0.28, 0.28, 'gaterail')
    }
    g.box(FG, -2.2, 2.2, 3.55, 3.7, -0.06, 0.06, bronze, 'metal', 'fulrb', 1, 1, 0)                                                                    // arch header
    for (let i = 0; i < 9; i++) { const x = -1.8 + i * 0.45, h = 3.55 + Math.sin((i / 8) * Math.PI) * 0.35; g.box(FG, x - 0.012, x + 0.012, 3.15, h, -0.02, 0.02, bronze, 'metal+', 'fl', 1, 1, 0) }
    g.box(FG, -0.6, 0.6, 3.72, 3.94, -0.04, 0.04, col('#f1e8d6'), 'trim', 'fu', 1, 1, 0)
    pois.gate = { x: BX, z: 50 }
  }

  // =====================================================================================================================================
  // 4. RIVERSIDE GARDENS + THE TWO PATHS DOWN TO THE THAMES (Thames Row west of the tower, East Walk east of it)
  // =====================================================================================================================================
  const ribbon = (ch, key, pts, w, c, su = 1.8, sv = 1.2, layer = 1, y = GY) => {
    if (y === GY) mapRib.push([key, pts.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)]), w])
    const yy = y + layer * 0.012, k = layer >= 2 ? key + '2' : key
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2
      const A = [x0 + nx, yy, z0 + nz], B = [x1 + nx, yy, z1 + nz], Cc = [x1 - nx, yy, z1 - nz], D = [x0 - nx, yy, z0 - nz]
      ch.acc(k).quad(A, B, Cc, D, col(c), [0, 1, 0], [[A[0] / su, A[2] / sv], [B[0] / su, B[2] / sv], [Cc[0] / su, Cc[2] / sv], [D[0] / su, D[2] / sv]])
    }
  }
  const curve = (pts, n = 10) => {                       // Catmull-Rom through control points
    const o = []
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; o.push([0, 1].map((a) => 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3))) }
    }
    o.push(pts[pts.length - 1]); return o
  }
  const WEST = -126.5, EAST = 82, SOUTH = 124
  {
    const g = mk('gardens')
    surf(g, 'grass', WEST, EAST, -132, SOUTH, G.grass, 4, 4, 0)                                                      // one continuous lawn base under everything
    // riverside piazza in front of the grand stair (formal approach) + a long walk along the tower's river face
    surf(g, 'slab', BX - 11, BX + 11, -132, -88, G.slab, 1.8, 1.2, 1); surf(g, 'slab', -64, 34, -97, -92, G.slab, 1.8, 1.2, 1)
    surf(g, 'gravel', BX - 8, BX - 6.5, -131, -97, G.gravel, 2, 2, 1); surf(g, 'gravel', BX + 6.5, BX + 8, -131, -97, G.gravel, 2, 2, 1)
    for (const s of [-1, 1]) for (let z = -128; z < -98; z += 6) { hedge(g, BX + s * 8.6 - 0.45, BX + s * 8.6 + 0.45, z, z + 3.6, 0.8, '#4e6139') }
    for (let z = -126; z < -98; z += 9) for (const s of [-1, 1]) { put('shrub', BX + s * 9.8, z, 0, 0.9 + R() * 0.3); put('grass', BX + s * 10.6, z + 1.5, R() * 6, 1.1) }
    for (const s of [-1, 1]) for (const z of [-124, -112, -100]) { tree('clipped', BX + s * 11.5, z, 1.0, Math.PI / 2); grate(g, BX + s * 11.5, z, 1.5) }
    // paths from the ramps' feet to the two side routes
    surf(g, 'slab', -90, -64, -97, -92, G.slab, 1.8, 1.2, 1); surf(g, 'slab', 34, 70, -97, -92, G.slab, 1.8, 1.2, 1)
    surf(g, 'slab', -87, -77, -105, -92, G.slab, 1.8, 1.2, 1); surf(g, 'slab', 47, 57, -105, -92, G.slab, 1.8, 1.2, 1)         // ramp approaches (ramps start at z = -102)
    // THAMES ROW (west) and EAST WALK: tree-lined stone walks with clipped hedges, lamps and benches, from the lane to the river
    for (const [xc, side] of [[-86, 'W'], [67, 'E']]) {
      const hw2 = xc === -86 ? 4 : 3.5
      surf(g, 'slab', xc - hw2, xc + hw2, -97, 50, G.slab, 1.8, 1.2, 1)
      for (const s of [-1, 1]) for (let z = -90; z < 44; z += 12) if (!(side === 'W' && Math.abs(z + 0) < 0)) hedge(g, xc + s * (hw2 + 0.6) - 0.4, xc + s * (hw2 + 0.6) + 0.4, z, z + 8.4, 0.9, '#4e6139')
      for (let z = -88; z < 46; z += 11) for (const s of [-1, 1]) { tree(R() < 0.45 ? 'plane' : 'ornamental', xc + s * (hw2 + 2.6), z + (R() - 0.5) * 2, 0.9 + R() * 0.3) }
      for (let z = -84; z < 46; z += 22) { bench(xc - hw2 + 0.8, z, Math.PI / 2); bench(xc + hw2 - 0.8, z + 11, -Math.PI / 2) }
      for (let z = -92; z < 46; z += 20) lamp(xc + (z % 40 === 0 ? -1 : 1) * (hw2 - 0.5), z, 0)
    }
    // lawn groves: soft, layered, never dense enough to hide the architecture
    const grove = (x0, x1, z0, z1, n) => { for (let i = 0; i < n; i++) { const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0); const k = R(); if (k < 0.45) tree('plane', x, z, 0.85 + R() * 0.4); else if (k < 0.8) tree('ornamental', x, z, 0.85 + R() * 0.35); else put('shrub', x, z, R() * 6, 0.9 + R() * 0.6) } }
    grove(-124, -92, -128, -100, 9); grove(-124, -92, -90, 44, 16); grove(-80, -64, -128, 44, 12); grove(34, 62, -128, -100, 7); grove(34, 62, -90, 44, 7); grove(72, 80, -128, 44, 6)
    // west + east boundary of the neighbourhood (a stone plinth with a tall clipped hedge) so the world has a clear edge
    wall(g, WEST - 0.6, WEST, -132, SOUTH, 1.2); hedge(g, WEST + 0.0, WEST + 1.4, -132, SOUTH, 2.2, '#46583a'); wall(g, EAST, EAST + 0.6, -132, SOUTH, 1.2); hedge(g, EAST - 1.4, EAST, -132, SOUTH, 2.2, '#46583a')
    wall(g, WEST, EAST, SOUTH, SOUTH + 0.8, 2.4, { col: PAL.stock, key: 'brick' })
    pois.riverside = { x: BX, z: -112 }
  }

  // =====================================================================================================================================
  // 4. THAMES TERRACE: raised promenade over the quay wall, ramps + grand stair, balustrade, lamps, benches, trees; the river + skyline beyond
  // =====================================================================================================================================
  {
    const ch = mk('terrace'), x0 = -125, x1 = 80, zr = -146.6, zw = -132, H = TERR_H, stone = col(PAL.limestone)
    const FT = frame(0, 0, 0, GY)
    ch.box(FT, x0, x1, 0, H, zr, zw, stone, 'ashlar', 'f', 2.4, 1.2)                                                      // retaining wall (street side)
    ch.box(FT, x0, x1, -0.3, H, zr - 5.4, zr, col('#8e8579'), 'ashlar', 'b', 2.4, 1.2)                                   // quay wall (river side), the face the skyline view sees
    ch.box(FT, x0, x1, H - 0.02, H, zr - 5.4, zr, col('#cdbfa6'), 'slab', 'u', 1.8, 1.2, 0)
    ch.box(FT, x0, x1, H - 0.001, H, zr, zw, col(G.slab), 'slab', 'u', 1.8, 1.2, 0)
    ch.box(FT, x0, x1, H + 0.0, H + 0.011, zw - 3.5, zw - 0.0, col('#d1c6b2'), 'sett', 'u', 1.6, 1.6, 0)                    // setts band along the stair edge
    ch.solid(FT, x0, x1, -0.5, H, zr, zw, 'terrace')
    ch.solid(FT, x0, x1, 0, H + 1.2, zr - 0.7, zr - 0.2, 'balustrade')
    // balustrade along the river edge + the street-side edge (gaps at the stairs/ramps); balusters are detail geometry (LOD)
    const gaps = [[BX - 10, BX + 10], [-87, -77], [47, 57]]
    const bal = (xa, xb, z) => {
      const ironB = col('#26242b')                                             // black wrought iron railing between stone posts (as in the reference)
      ch.box(FT, xa, xb, H, H + 0.14, z - 0.16, z + 0.16, stone, 'trim', 'fulrb'); ch.box(FT, xa, xb, H + 0.94, H + 1.0, z - 0.05, z + 0.05, ironB, 'metal', 'fulrb')
      const n = Math.max(1, Math.round((xb - xa) / 0.28)); for (let i = 0; i <= n; i++) { const x = xa + (i / n) * (xb - xa); ch.prism(FT, x, z, 0.018, 0.018, H + 0.14, H + 0.96, ironB, 'metal+', 4, false) }
      for (let x = xa; x <= xb; x += 3) { ch.box(FT, x - 0.12, x + 0.12, H + 0.14, H + 1.0, z - 0.12, z + 0.12, stone, 'trim', 'fulrb'); ch.prism(FT, x, z, 0.07, 0.01, H + 1.0, H + 1.16, ironB, 'metal', 6) }
    }
    bal(x0, -50, zr + 0.35); bal(-40, x1, zr + 0.35)                                                                         // gap = the reserved ferry landing
    let cur = x0; for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > cur) bal(cur, a, zw - 0.4); cur = b } if (cur < x1) bal(cur, x1, zw - 0.4)
    ch.solid(FT, x0, -50, H, H + 1.1, zr + 0.15, zr + 0.55, 'rail'); ch.solid(FT, -40, x1, H, H + 1.1, zr + 0.15, zr + 0.55, 'rail')
    cur = x0; for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > cur) ch.solid(FT, cur, a, H, H + 1.1, zw - 0.6, zw - 0.2, 'rail'); cur = b } if (cur < x1) ch.solid(FT, cur, x1, H, H + 1.1, zw - 0.6, zw - 0.2, 'rail')
    for (const x of [x0, x1]) ch.solid(FT, x - 0.4, x + 0.4, H, H + 1.6, zr - 0.2, zw, 'endwall')
    // ramps (gentle, 8°) and the grand stair on the axis
    const ramp = (xc, w) => {
      const F = frame(xc, -102, Math.PI, GY), L = 30, h = H
      ch.slope(F, [w / 2, 0.02, 0], [-w / 2, 0.02, 0], [-w / 2, h + 0.02, L], [w / 2, h + 0.02, L], col(G.slab), 'slab', 1.8, 1.2)
      for (const s of [-1, 1]) { ch.tri(F, [s * w / 2, 0, 0], [s * w / 2, 0, L], [s * w / 2, h, L], stone, 'ashlar', [s, 0, 0]); ch.box(F, s * w / 2 - 0.15, s * w / 2 + 0.15, 0, 0.55, 0, 2, stone, 'ashlar', 'fulr', 2.4, 1.2) }
      ch.ramp(F, -w / 2, w / 2, 0, 0, L, h)
      for (const s of [-1, 1]) ch.solid(F, s * w / 2 - 0.12, s * w / 2 + 0.12, 0, 2.2, 0, L, 'rampcheek')
    }
    ramp(-82, 10); ramp(52, 10)
    {  // grand stair
      const F = frame(BX, -123.4, Math.PI, GY), w = 20, n = 29, rise = H / n, tread = 0.3
      for (let k = 0; k < n; k++) ch.box(F, -w / 2, w / 2, 0, (k + 1) * rise, k * tread, n * tread, stone, 'ashlar', 'fu', 2.4, 1.2, 0.02)
      for (const s of [-1, 1]) { ch.tri(F, [s * w / 2, 0, 0], [s * w / 2, 0, n * tread], [s * w / 2, H, n * tread], stone, 'ashlar', [s, 0, 0]); ch.box(F, s * w / 2 - 0.2, s * w / 2 + 0.2, 0, 0.7, -0.2, 1.6, stone, 'ashlar', 'fulr', 2.4, 1.2) }
      ch.ramp(F, -w / 2, w / 2, 0, 0.08, n * tread + 0.2, H + 0.08)
      for (const s of [-1, 1]) ch.solid(F, s * w / 2 - 0.2, s * w / 2 + 0.2, 0, 2.4, 0, n * tread, 'stairwall')
      pois.stair = { x: BX, z: -122 }
    }
    // lamps along the balustrade; benches + trees are placed per zone in the promenade section below
    for (let x = -118; x <= x1; x += 22) { put('lamp', x, zr + 1.2, 0, 1.0, TERRACE_Y); pools.push([x, zr + 1.2, 7.5, TERRACE_Y]); halos.push([x, TERRACE_Y + 4.9, zr + 1.2]) }
    pois.terrace = { x: BX, z: -139 }
    pois.river = { x: BX, z: -143.5 }
  }

  // =====================================================================================================================================
  // 5b. THAMES PROMENADE ZONES on the terrace: A peaceful riverside (west-centre), B signature sunset viewpoint (centre, kept clear), C social waterfront (east), D romantic corner (west end), ferry landing reserved
  // =====================================================================================================================================
  {
    const ch = mk('promenade'), T = TERRACE_Y, FT = frame(0, 0, 0, T), stone = col(PAL.limestone), timber = col('#6a4d3a'), bronze = col('#4b3c2b')
    const hedgeT = (x0, x1, z0, z1, h = 1.0) => { ch.box(FT, x0, x1, 0, h, z0, z1, col('#4e6139'), 'leaf', 'fulrb', 1, 1, 0.1); ch.box(FT, x0 + 0.05, x1 - 0.05, h, h + 0.12, z0 + 0.05, z1 - 0.05, col('#586d41'), 'leaf', 'u', 1, 1, 0.1); ch.solid(FT, x0, x1, 0, h + 0.1, z0, z1, 'hedge') }
    // ---- Zone B: a stone dais on the axis with framing lantern piers and two benches turned to the river (nothing tall in the view)
    ch.box(FT, BX - 9, BX + 9, 0, 0.14, -145.2, -136.8, col('#e2d8c3'), 'slab', 'fulu', 1.8, 1.2, 0.0)
    for (const s of [-1, 1]) {
      const px = BX + s * 10.2
      ch.box(FT, px - 0.4, px + 0.4, 0, 3.0, -145.9 - 0.4, -145.9 + 0.4, stone, 'ashlar', 'fulrb', 2.4, 1.2); ch.box(FT, px - 0.5, px + 0.5, 3.0, 3.15, -146.3 - 0.1, -145.4 + 0.5, col('#e6decd'), 'trim', 'fulrbd')
      ch.box(FT, px - 0.14, px + 0.14, 3.15, 3.65, -146.04, -145.76, col('#ffd9a0'), 'glow', 'fulrb', 1, 1, 0); ch.solid(FT, px - 0.4, px + 0.4, 0, 3.2, -146.3, -145.5, 'pier')
      put('bench', BX + s * 5.5, -139.2, Math.PI, 1.0, T); ch.solid(frame(BX + s * 5.5, -139.2, Math.PI, T), -0.9, 0.9, 0, 0.5, -0.25, 0.25, 'bench')
    }
    halos.push([BX - 10.2, T + 3.4, -145.9], [BX + 10.2, T + 3.4, -145.9]); pools.push([BX, -142, 12, T])
    pois.viewpoint = { x: BX, z: -141 }
    // ---- Zone C: two waterfront café pavilions with dining terraces (east end)
    const cafe = (x, w, sign) => {
      const F = frame(x, -138.2, Math.PI, T), hh = 3.7
      ch.box(F, -w / 2, w / 2, 0, hh, -5.1, -0.35, col('#dcd1ba'), 'plaster', 'flrb', 3, 3)
      const n = Math.round(w / 2.2), bw = (w - 0.6) / n
      for (let i = 0; i <= n; i++) { const px = -w / 2 + 0.3 + i * bw; ch.box(F, px - 0.07, px + 0.07, 0, hh, -0.4, -0.2, timber, 'wood', 'fulrb', 1, 1, 0.03) }
      for (let i = 0; i < n; i++) { const a = -w / 2 + 0.3 + i * bw + 0.07, b = -w / 2 + 0.3 + (i + 1) * bw - 0.07; pane(ch, F, a, b, 0.45, hh - 0.3, -0.3, i % 4 !== 3) }
      ch.box(F, -w / 2, w / 2, 0, 0.45, -0.4, -0.2, timber, 'wood', 'fulrb', 1, 1, 0.03); ch.box(F, -w / 2, w / 2, hh - 0.3, hh, -0.4, -0.2, timber, 'wood', 'fulrb', 1, 1, 0.03)
      ch.box(F, -w / 2 - 0.9, w / 2 + 0.9, hh, hh + 0.28, -5.4, 2.0, col('#cfc4b0'), 'trim', 'fulrbd'); ch.box(F, -w / 2 - 0.6, w / 2 + 0.6, hh - 0.04, hh, -0.6, 1.9, col('#ffe0b0'), 'glow', 'd', 1, 1, 0)
      ch.box(F, -w / 2 - 0.9, w / 2 + 0.9, hh + 0.28, hh + 0.34, -5.4, 2.0, col(PAL.slate), 'roof', 'u')
      ch.acc('sign').quad(...[[-w / 2 + 0.5, hh + 0.35, 2.02], [w / 2 - 0.5, hh + 0.35, 2.02], [w / 2 - 0.5, hh + 1.0, 2.02], [-w / 2 + 0.5, hh + 1.0, 2.02]].map(([lx, y, lz]) => { const a = toWorld(F, lx, y, lz); return a }), col('#ffffff'), dirWorld(F, 0, 0, 1), signQ(sign))
      ch.solid(F, -w / 2, w / 2, 0, hh + 1, -5.1, -0.2, 'cafe')
      for (let i = 0; i < Math.floor(w / 2.4); i++) { const tx = -w / 2 + 1.4 + i * 2.4; const wp = toWorld(F, tx, 0, 2.2); put('table', wp[0], wp[2], 0, 1.0, T); put('chair', wp[0] - 0.55, wp[2], Math.PI / 2, 1.0, T); put('chair', wp[0] + 0.55, wp[2], -Math.PI / 2, 1.0, T) }
      lightsAt.push({ x, y: T + 2.8, z: -141, color: '#ffcf94', intensity: 5, distance: 13 })
    }
    cafe(56, 13, 9); cafe(73, 11, 10)
    pois.quayCafe = { x: 56, z: -141 }
    // ---- Zone D: romantic corner (west end): a hedged alcove with two benches, a lantern, a clipped tree and a view straight down the river
    hedgeT(-123, -108, -134.2, -133.2, 1.5); hedgeT(-123, -122, -145, -134.2, 1.5); hedgeT(-110, -109, -141, -134.2, 1.5)
    put('bench', -116.5, -140.4, Math.PI, 1.0, T); ch.solid(frame(-116.5, -140.4, Math.PI, T), -0.9, 0.9, 0, 0.5, -0.25, 0.25, 'bench')
    put('bench', -121.2, -141.5, -Math.PI / 2, 1.0, T); ch.solid(frame(-121.2, -141.5, -Math.PI / 2, T), -0.9, 0.9, 0, 0.5, -0.25, 0.25, 'bench')
    put('lamp', -112.6, -143.6, 0, 1.0, T); pools.push([-112.6, -143.6, 6, T]); halos.push([-112.6, T + 4.9, -143.6]); put('planter', -119, -135.2, 0, 1.0, T)
    pois.romantic = { x: -117, z: -140 }
    // ---- reserved ferry landing (x -50..-40): a pier deck over the quay with railings and bollards; no service runs yet
    {
      const x0 = -50, x1 = -40, z0 = -153.5, zr = -146.6, F2 = frame(0, 0, 0, T)
      ch.box(F2, x0, x1, -0.35, 0, z0, zr, col('#cdbfa6'), 'slab', 'fulrbd', 1.8, 1.2, 0)
      ch.box(F2, x0 - 0.1, x0, -0.35, 0.0, z0, zr, stone, 'ashlar', 'fulrb', 2.4, 1.2)
      for (const [xa, xb, za, zb] of [[x0, x0 + 0.12, z0, zr], [x1 - 0.12, x1, z0, zr], [x0, x1, z0, z0 + 0.12]]) { ch.box(F2, xa, xb, 0, 1.05, za, zb, bronze, 'metal+', 'fulrb', 1, 1, 0); ch.solid(F2, xa - 0.05, xb + 0.05, 0, 1.1, za, zb, 'pierrail') }
      for (const x of [x0 + 0.6, x1 - 0.6]) put('bollard', x, z0 + 0.7, 0, 1.0, T)
      ch.solid(F2, x0, x1, -0.5, 0, z0, zr, 'pierdeck')
      pois.ferry = { x: (x0 + x1) / 2, z: -150 }
    }
    // ---- Zone A: peaceful riverside trees (kept off the central view) + benches
    for (const x of [-104, -92, -80, -68, -56]) { grate(ch, x, -139.5, 1.3); put('plane', x, -139.5, R() * 6, 0.85 + R() * 0.25, T) }
    for (const x of [-98, -74, -62]) { put('bench', x, -135.2, 0, 1.0, T); ch.solid(frame(x, -135.2, 0, T), -0.9, 0.9, 0, 0.5, -0.25, 0.25, 'bench') }
    for (const x of [-12, 14]) for (const z of [-143.2]) { void x; void z }
  }

  // =====================================================================================================================================
  // 6. STREETS: Courtyard Lane (quiet, narrow) widening into the Neighbourhood Avenue toward the garden square; houses with real fronts, parked cars
  // =====================================================================================================================================
  const MAIN = ['#ece3d0', '#decdae', '#e8dcc2', '#d3cab9', '#e0cdbf', '#cdd2c0', '#e6dcc9'], DOORS = ['#34473d', '#4d3548', '#2f3138', '#2d3345', '#5a3a3a', '#44504a', '#6a4d63', '#3b3226']
  const BRICKS = [PAL.brick, PAL.stock, '#a56b50', '#b8825f', '#98694f']
  // a terrace of individually composed townhouses along an axis. ax 'x': facade plane at z = plane, centres run along x; ax 'z': plane at x = plane
  const houseRow = (ch, ax, plane, rot, from, to, o = {}) => {
    const ws = fit(to - from, o.lo ?? 5.4, o.hi ?? 7.0, R); let p = from
    ws.forEach((w, i) => {
      const c = p + w / 2; p += w
      const main = pickR(R, MAIN), brickUp = R() < (o.brickP ?? 0.55), tall = R() < 0.14
      const F = ax === 'x' ? frame(c, plane, rot, GY) : frame(plane, c, rot, GY)
      townhouse(ch, F, { w, d: o.d ?? 12, floors: o.floors ?? (tall ? 5 : 4), main, ground: new THREE.Color(main).lerp(new THREE.Color('#f1e7d0'), 0.5).getStyle(), upper: brickUp ? 'brick' : 'plaster', brick: pickR(R, BRICKS), doorBay: R() < 0.5 ? 0 : (w < 6.15 ? 1 : 2), door: pickR(R, DOORS), litP: o.litP ?? 0.26, mansard: 2.1 + R() * 0.7, balc: R() < 0.55, side: PAL.stock, slate: R() < 0.7 ? PAL.slate : '#4a4650' })
    })
  }
  const parked = (x, z, ry, k) => put('car' + (1 + (k % 4)), x, z, ry, 1)
  const WS0 = -31.8, WS1 = -21.8, ES0 = 33.2, ES1 = 43.2                     // west / east street edges around the garden square (pavement + road + pavement)
  {
    const g = mk('streets'), ch = mk('houses'), L0 = -98, L1 = 76
    // ---- Courtyard Lane: z 50..61, road 6 m, 2.5 m stone pavements; granite kerbs
    surf(g, 'road', L0, L1, 52.5, 58.5, G.road, 4, 4, 1)
    surf(g, 'slab', L0, L1, 50, 52.5, G.slab, 1.8, 1.2, 1); surf(g, 'slab', L0, L1, 58.5, 61, G.slab, 1.8, 1.2, 1)
    for (const z of [52.5, 58.5]) g.box(W0, L0, L1, 0, 0.1, z - 0.15, z + 0.15, col('#cfc4b0'), 'ashlar', 'fulr', 2.4, 1.2, 0.02)
    // West Street + East Street (one-way, 5 m) wrap the garden square; they leave the lane at junctions with a dropped crossing
    for (const [a, b] of [[WS0, WS1], [ES0, ES1]]) {
      const x0 = a + 2.5, x1 = b - 2.5
      surf(g, 'road', x0, x1, 58.5, 108.75, G.road, 4, 4, 1); surf(g, 'slab', a, x0, 61, 108.75, G.slab, 1.8, 1.2, 1); surf(g, 'slab', x1, b, 61, 108.75, G.slab, 1.8, 1.2, 1)
      for (const x of [x0, x1]) g.box(W0, x - 0.15, x + 0.15, 0, 0.1, 61, 108.75, col('#cfc4b0'), 'ashlar', 'fulr', 2.4, 1.2, 0.02)
      for (let x = x0 + 0.4; x < x1 - 0.2; x += 0.9) surf(g, 'paint', x, x + 0.45, 59.2, 60.6, G.paint, 1, 1, 2)                              // zebra bars at the lane junction
    }
    surf(g, 'slab', WS0, ES1, 106.5, 108.75, G.slab, 1.8, 1.2, 1)                                                                          // south pavement under the garden terrace
    // gateway apron: the courtyard gate (z 50) -> garden gate (z 61.5) is one clear axis; a stone crossing marks it
    surf(g, 'slab', BX - 3, BX + 3, 50, 61, G.slab, 1.8, 1.2, 2); surf(g, 'sett', BX - 3, BX + 3, 52.5, 58.5, G.sett, 1.6, 1.6, 2)
    // ---- houses. Courtyard sides (they face the courtyard, 2.25 m gardens inside it) + both sides of the lane
    houseRow(ch, 'z', HX0, Math.PI / 2, 14, 47.7, { d: 12 }); houseRow(ch, 'z', HX1, -Math.PI / 2, 14, 47.7, { d: 12 })
    houseRow(ch, 'x', 47.75, 0, -80, -28, { d: 12 }); houseRow(ch, 'x', 47.75, 0, 30.45, 62, { d: 12 })                                       // lane, north side (the quiet end: brick, stucco, steps)
    houseRow(ch, 'x', 63.25, Math.PI, -98, WS0, { d: 10, floors: 4 }); houseRow(ch, 'x', 63.25, Math.PI, ES1, L1, { d: 10, floors: 4 })       // lane, south side
    mass(mk('masses'), -80, -62, 4, 34.75, 13.5)
    // ---- a stone end to each end of the lane: brick wall + gate piers + a tree, so the lane reads as a quiet residential street
    for (const [x, s] of [[L0, -1], [L1, 1]]) {
      wall(g, x, x + s * 0.8, 50, 61, 2.6, { col: PAL.stock, key: 'brick' })
      g.box(W0, x + s * 0.1, x + s * 0.7, 0, 2.5, 54.3, 56.7, col('#3e3b44'), 'wood', 'fulr'); tree('plane', x - s * 4.0, 55.5, 1.0, 1)
    }
    // street trees (planes in pits) + lamps + benches + cars + bicycles
    for (let x = -70; x < L1 - 4; x += 13) { if (Math.abs(x - BX) < 6) continue; tree('plane', x, 51.2, 0.9 + R() * 0.15); grate(g, x, 51.2); if (x > -58 && Math.abs(x + 6 - BX) >= 6) { tree('plane', x + 6, 59.8, 0.85 + R() * 0.15); grate(g, x + 6, 59.8) } }
    for (let x = -92; x < L1 - 2; x += 20) lamp(x, 52.8, 0)
    for (let x = -88; x < L1 - 2; x += 20) lamp(x + 10, 58.2, 0)
    let k = 0
    for (const x of [-72, -58, -44, 22, 36, 50, 64]) parked(x, 53.6, Math.PI / 2, k++)
    for (const x of [-84, -66, -50, 52, 66]) parked(x, 57.5, -Math.PI / 2, k++)
    for (const [x, z] of [[-17.5, 50.9], [20, 50.9], [-8, 59.7]]) { put('bike', x, z, Math.PI / 2, 1.0); }
    for (const z of [68, 84, 99]) for (const [x, ry] of [[(WS0 + 2.5 + WS1 - 2.5) / 2 - 1.2, 0], [(ES0 + 2.5 + ES1 - 2.5) / 2 + 1.2, Math.PI]]) parked(x, z, ry, k++)
    for (const z of [67, 82, 97]) { lamp(WS1 - 0.5, z, 0); lamp(ES0 + 0.5, z + 7, 0) }
    for (const z of [72, 92, 102]) { tree('plane', WS0 + 1.2, z, 0.85); tree('plane', ES1 - 1.2, z + 3, 0.85) }
    pois.lane1 = { x: BX, z: 55.5 }
    // closing walls at the foot of the two side streets
    wall(g, WS0, WS1, 108.75, 109.5, 1.0); wall(g, ES0, ES1, 108.75, 109.5, 1.0)
  }

  // =====================================================================================================================================
  // 7. LONDON GARDEN VILLAGE (55 x 45 m): lawns, curved stone paths, small refined fountain, benches, seating corners, lanterns; framed by houses, a modern block and cafés
  // =====================================================================================================================================
  const SQ = { x0: -21.8, x1: 33.2, z0: 61.5, z1: 106.5 }
  const SCX = (SQ.x0 + SQ.x1) / 2, SCZ = 84
  {
    const g = mk('square'), bronze = col('#2d2a2e')
    surf(g, 'grass', SQ.x0, SQ.x1, SQ.z0, SQ.z1, '#86a15a', 4, 4, 1)
    // gently curved stone paths: north gate -> fountain, west gate (lane mouth) -> fountain, east gate, south gate; a looping path past the seating corners
    const P_ = (pts, w = 2.2) => ribbon(g, 'slab', curve(pts, 12), w, G.slab, 1.8, 1.2, 2)
    P_([[BX, SQ.z0], [BX - 1.5, 68], [BX + 2, 76], [SCX, SCZ - 5]]); P_([[SQ.x0, 90.5], [-14, 91.5], [-5, 88.5], [SCX - 5, SCZ + 2]]); P_([[SQ.x1, 85], [28, 86.5], [21, 85], [SCX + 5, SCZ]])
    P_([[SCX, SCZ + 5], [BX + 3, 94], [BX - 2, 100], [BX, SQ.z1]])
    P_([[-14, 91.5], [-12, 78], [-6, 68], [4, 65]], 1.8); P_([[21, 85], [26, 94], [22, 101], [14, 103]], 1.8)
    // fountain: a small refined round basin, one calm central jet (understated); a setts apron ring + low clipped hedge ring with four openings
    surf(g, 'sett', SCX - 5.2, SCX + 5.2, SCZ - 5.2, SCZ + 5.2, G.sett, 1.6, 1.6, 2)
    const Fq = frame(SCX, SCZ, 0, GY), stone = '#d9cdb5'
    g.prism(Fq, 0, 0, 2.5, 2.5, 0, 0.5, col(stone), 'trim', 28, false)
    for (let i = 0; i < 28; i++) { const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 1) / 28) * Math.PI * 2, r0 = 2.0, r1 = 2.5, y = GY + 0.5; g.acc('trim').quad([SCX + Math.cos(a0) * r0, y, SCZ + Math.sin(a0) * r0], [SCX + Math.cos(a0) * r1, y, SCZ + Math.sin(a0) * r1], [SCX + Math.cos(a1) * r1, y, SCZ + Math.sin(a1) * r1], [SCX + Math.cos(a1) * r0, y, SCZ + Math.sin(a1) * r0], col('#e4dac4'), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]) }
    // three-tier pale-stone fountain: moulded pedestal, lower bowl, stem, upper bowl, finial; warm underwater + tier glow
    g.prism(Fq, 0, 0, 0.62, 0.5, 0.3, 0.9, col(stone), 'trim', 16); g.prism(Fq, 0, 0, 0.78, 0.7, 0.9, 1.0, col('#e4dac4'), 'trim', 20)
    g.prism(Fq, 0, 0, 1.45, 0.95, 1.0, 1.28, col(stone), 'trim', 28); g.prism(Fq, 0, 0, 1.5, 1.5, 1.28, 1.34, col('#e8dfca'), 'trim', 28)          // lower bowl
    g.prism(Fq, 0, 0, 1.38, 1.38, 1.34, 1.37, col('#9ec0c6'), 'glass', 28)                                                                         // water skin in the bowl
    g.prism(Fq, 0, 0, 0.26, 0.2, 1.34, 2.1, col(stone), 'trim', 12); g.prism(Fq, 0, 0, 0.78, 0.5, 2.1, 2.3, col(stone), 'trim', 20); g.prism(Fq, 0, 0, 0.82, 0.82, 2.3, 2.35, col('#e8dfca'), 'trim', 20)   // upper bowl
    g.prism(Fq, 0, 0, 0.16, 0.1, 2.35, 2.75, col(stone), 'trim', 10); g.prism(Fq, 0, 0, 0.1, 0.0, 2.75, 2.95, col('#e4dac4'), 'trim', 10)      // stem + finial
    g.prism(Fq, 0, 0, 1.52, 1.52, 0.96, 0.99, col('#ffd29a'), 'glow', 28); g.prism(Fq, 0, 0, 2.0, 2.0, 0.44, 0.46, col('#ffe0b0'), 'glow', 28, false)   // tier + basin glow
    g.solid(Fq, -2.5, 2.5, 0, 0.55, -2.5, 2.5, 'fountain'); g.cols[g.cols.length - 1].cyl = true; g.cols[g.cols.length - 1].r = 2.5
    waters.push({ x: SCX, z: SCZ, r: 2.0, y: GY + 0.42, kind: 'fountain' }); jets.push({ x: SCX, z: SCZ, y: GY + 2.4 })
    pools.push([SCX, SCZ, 11])
    // perimeter: low stone wall + black railings + clipped hedge with four gates (N on the courtyard axis, W lane mouth, E, S)
    // (north + south runs are along x; west + east runs along z). Hedge sits inside the wall.
    const run = (x0, x1, z0, z1, gaps, inward) => {
      const horiz = z0 === z1, a0 = horiz ? x0 : z0, a1 = horiz ? x1 : z1; let cur = a0
      const seg = (a, b) => { if (b - a < 0.15) return; if (horiz) { wall(g, a, b, z0 - 0.2, z0 + 0.2, 0.5); hedge(g, a, b, z0 + inward * 0.2 + (inward > 0 ? 0 : -0.9), z0 + inward * 0.2 + (inward > 0 ? 0.9 : 0), 1.1, '#4e6139') } else { wall(g, x0 - 0.2, x0 + 0.2, a, b, 0.5); hedge(g, x0 + inward * 0.2 + (inward > 0 ? 0 : -0.9), x0 + inward * 0.2 + (inward > 0 ? 0.9 : 0), a, b, 1.1, '#4e6139') } }
      for (const [a, b] of gaps) { seg(cur, a); cur = b }; seg(cur, a1)
    }
    run(SQ.x0, SQ.x1, SQ.z0, SQ.z0, [[BX - 1.8, BX + 1.8]], 1); run(SQ.x0, SQ.x1, SQ.z1, SQ.z1, [[BX - 1.5, BX + 1.5]], -1)
    run(SQ.x0, SQ.x0, SQ.z0, SQ.z1, [[89, 92.5]], 1); run(SQ.x1, SQ.x1, SQ.z0, SQ.z1, [[83.5, 86.5]], -1)
    for (const [x, z] of [[BX - 1.9, SQ.z0], [BX + 1.9, SQ.z0], [BX - 1.6, SQ.z1], [BX + 1.6, SQ.z1], [SQ.x0, 89], [SQ.x0, 92.5], [SQ.x1, 83.5], [SQ.x1, 86.5]]) { g.box(W0, x - 0.3, x + 0.3, 0, 1.7, z - 0.3, z + 0.3, col(PAL.limestone), 'ashlar', 'fulrb', 2.4, 1.2); g.box(W0, x - 0.36, x + 0.36, 1.7, 1.8, z - 0.36, z + 0.36, col('#e6decd'), 'trim', 'fulrbd'); g.solid(W0, x - 0.3, x + 0.3, 0, 1.8, z - 0.3, z + 0.3, 'pier'); lamp(x, z, 0) }
    // mature trees (varied silhouettes), planting beds with restrained flowers, grasses, benches and intimate corners
    for (const [x, z, s] of [[-12, 70, 1.25], [24, 69, 1.2], [-15, 100, 1.2], [26, 100, 1.15]]) tree('plane', x, z, s)
    for (const [x, z, s] of [[-3, 94, 0.95], [14, 75, 1.0], [8, 98, 0.9], [-9, 82, 0.95], [29, 79, 0.9], [-17, 85, 0.9]]) tree('ornamental', x, z, s)
    for (const [x, z] of [[BX - 6.5, SCZ - 6.5], [BX + 6.5, SCZ - 6.5], [BX - 6.5, SCZ + 6.5], [BX + 6.5, SCZ + 6.5]]) tree('clipped', x, z, 0.95, 0)
    const R3 = rng(81)
    for (const [bx0, bx1, bz0, bz1] of [[-19, -10, 74, 86], [18, 31, 62.5, 70], [20, 31, 91, 104], [-7, 6, 100, 105], [-8, 2, 63, 66.5]]) {
      for (let i = 0; i < 16; i++) { const x = bx0 + R3() * (bx1 - bx0), z = bz0 + R3() * (bz1 - bz0); if (R3() < 0.5) put('shrub', x, z, R3() * 6, 0.7 + R3() * 0.5); else put('grass', x, z, R3() * 6, 0.9 + R3() * 0.5) }
      for (let i = 0; i < 5; i++) { const x = bx0 + R3() * (bx1 - bx0), z = bz0 + R3() * (bz1 - bz0); g.prism(frame(x, z, 0, GY), 0, 0, 0.32, 0.22, 0, 0.32, col(['#cfa9ad', '#e4d9cb', '#b7a5c4', '#d9c08a'][i % 4]), 'leaf', 8) }
    }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3, r = 7.4; bench(SCX + Math.cos(a) * r, SCZ + Math.sin(a) * r, -a + Math.PI / 2 + Math.PI) }
    // seating corners: NW nook (two benches + a table under a plane), SE pergola bench
    bench(-15.6, 76, 0); bench(-9, 76, Math.PI); put('table', -12.3, 76, 0, 1.0); put('chair', -12.9, 76, 0, 1.0); put('chair', -11.7, 76, Math.PI, 1.0)
    bench(25.5, 103.4, Math.PI); bench(30.4, 98.4, -Math.PI / 2)
    for (const [x, z] of [[-14, 92], [-4, 70], [10, 78], [22, 88], [3, 92]]) { lamp(x, z, 0) }
    pois.square = { x: SCX, z: 72 }; pois.fountain = { x: SCX, z: SCZ }

    // ---- frontages: west = lane mouth (the lane's own shop rows start here), east = modern block, south = houses with two cafés/boutiques at the corners
    const sh = mk('squareShops'), mo = mk('squareE'), so = mk('squareS')
    modernBlock(mo, frame(ES1, 90.5, -Math.PI / 2, GY), { w: 29, d: 14, floors: 6, mat: 'ashlar', main: '#ddd2bb', fin: '#cfc3ab', balc: true, setback: true, litP: 0.3, back: '#cfc6b6' })
    // east side of East Street: a second, lower block of three houses facing the garden would crowd the corner; the lane's south houses already close it
    houseRow(so, 'x', 111, Math.PI, -8.3, 16.9, { d: 9, floors: 4 })
    const shopS = (xc, w, sp) => shopBuilding(sh, frame(xc, 108.75 + 0.0, Math.PI, GY), { w, d: 12, floors: 3, wall: sp.wall, main: sp.main, sign: sp.sign, awning: sp.awning, stall: sp.stall, door: sp.door, doorSide: sp.side, balc: true, roof: 'hip', side: PAL.stock })
    shopS(-26.8, 8.0, { wall: 'brick', main: PAL.brick, sign: 0, awning: '#cf8f9c', stall: '#d8ceb4', door: '#2b2630', side: 'l' })
    shopS(-19.0, 7.0, { wall: 'plaster', main: '#d9c9bf', sign: 3, awning: '#8d9a85', stall: '#a9b89c', door: '#4a3a46', side: 'r' })
    shopS(-11.5, 6.4, { wall: 'plaster', main: '#e0d6c4', sign: 4, awning: '#c9b79a', stall: '#e4d6c2', door: '#41584a', side: 'l' })
    shopS(20.5, 7.2, { wall: 'brick', main: '#b4806e', sign: 6, awning: '#b9778a', stall: '#dcc6b4', door: '#2b2630', side: 'r' })
    shopS(28, 7.4, { wall: 'plaster', main: '#cdd2c0', sign: 7, awning: '#d9a8ae', stall: '#2f2b2c', door: '#2f3d36', side: 'l' })
    houseRow(so, 'x', 111, Math.PI, 31.7, ES1, { d: 9, floors: 4 })
    // café tables on the south pavement (under the garden railings)
    for (let i = 0; i < 3; i++) { put('table', -27 + i * 2.1, 107.6, 0, 1.0); put('chair', -27.6 + i * 2.1, 107.6, Math.PI / 2, 1.0); put('chair', -26.4 + i * 2.1, 107.6, -Math.PI / 2, 1.0) }
    pois.cafeSquare = { x: -26.8, z: 107.5 }
  }

  // =====================================================================================================================================
  // 8. THE ROMANTIC LANE (92 x 9 m, pedestrian): café, bookshop, florist, bakery, boutiques; a tucked-away passage to a hidden courtyard; a pocket garden at the end
  //    Facades at z = 86 (north row, facing +z) and z = 95 (south row, facing -z); setts z 87.5..93.5, 1.5 m stone pavements either side
  // =====================================================================================================================================
  const LZ = 90.5, LN = 86, LS = 95, LX1 = WS0, LX0 = -119
  {
    const g = mk('lane'), ch = mk('laneShops'), bk = mk('masses')
    surf(g, 'sett', LX0, LX1, 87.5, 93.5, G.sett, 1.6, 1.6, 2)
    surf(g, 'slab', LX0, LX1, LN, 87.5, G.slab, 1.8, 1.2, 1); surf(g, 'slab', LX0, LX1, 93.5, LS, G.slab, 1.8, 1.2, 1)
    surf(g, 'slab', LX1, WS0 + 0.001, 86, 95, G.slab, 1.8, 1.2, 1)
    const W_ = (a, p) => ({ sign: a, ...p })
    const NORTH = [
      { id: 'books', w: 7.4, sign: 1, awning: '#8d9a85', wall: 'plaster', main: '#d9d1bf', stall: '#3a3331', door: '#2f3d36' },
      { w: 6.0, sign: 4, awning: '#c9b79a', wall: 'brick', main: '#b4806e', stall: '#e8dcc6', door: '#415a4b' },
      { id: 'bakery', w: 6.6, sign: 5, awning: '#b4806e', wall: 'plaster', main: '#e0d6c4', stall: '#e0d2bd', door: '#5a3a3a' },
      { w: 5.6, sign: 7, awning: '#d9a8ae', wall: 'brick', main: PAL.stock, stall: '#2f2b2c', door: '#4d3548' },
      { id: 'boutique', w: 6.8, sign: 3, awning: '#cf8f9c', wall: 'plaster', main: '#d9c9bf', stall: '#ece0c8', door: '#4a3a46' },
      { w: 6.2, sign: 6, awning: '#b9778a', wall: 'brick', main: PAL.brick, stall: '#d8ceb4', door: '#2b2630' },
      { w: 5.8, sign: 4, awning: '#d9cdb8', wall: 'plaster', main: '#cdd2c0', stall: '#a9b89c', door: '#2f3d36' },
      { w: 6.6, sign: 7, awning: '#8d9a85', wall: 'brick', main: '#a35b45', stall: '#e4d6c2', door: '#44504a' },
      { w: 6.0, sign: 5, awning: '#cf8f9c', wall: 'plaster', main: '#e6dcc9', stall: '#dcc6b4', door: '#6a4d63' },
      { w: 5.8, sign: 6, awning: '#c9b79a', wall: 'brick', main: PAL.stock, stall: '#2f2b2c', door: '#34473d' },
      { w: 6.4, sign: 4, awning: '#b4806e', wall: 'plaster', main: '#d9d1bf', stall: '#3a3331', door: '#5a3a3a' },
      { w: 6.2, sign: 7, awning: '#8d9a85', wall: 'brick', main: PAL.brick, stall: '#e8dcc6', door: '#2d3345' },
    ]
    const SOUTH = [
      { id: 'cafe', w: 9.4, sign: 0, awning: '#cf8f9c', wall: 'brick', main: PAL.brick, stall: '#e0d2bd', door: '#2b2630' },
      { id: 'florist', w: 6.4, sign: 2, awning: '#d9cdb8', wall: 'plaster', main: '#cfc7b6', stall: '#2f2b2c', door: '#41584a' },
      { w: 6.0, sign: 4, awning: '#d9a8ae', wall: 'plaster', main: '#d9c9bf', stall: '#ece0c8', door: '#4d3548' },
      { w: 5.8, sign: 6, awning: '#b9778a', wall: 'brick', main: '#b0785a', stall: '#d8ceb4', door: '#2b2630' },
      { passage: 2.6 },
      { w: 6.4, sign: 5, awning: '#c9b79a', wall: 'plaster', main: '#e0d6c4', stall: '#a9b89c', door: '#5a3a3a' },
      { w: 6.0, sign: 7, awning: '#8d9a85', wall: 'brick', main: PAL.brick, stall: '#e4d6c2', door: '#44504a' },
      { w: 7.0, sign: 3, awning: '#cf8f9c', wall: 'plaster', main: '#d9cdbf', stall: '#dcc6b4', door: '#6a4d63' },
      { w: 6.2, sign: 4, awning: '#b4806e', wall: 'brick', main: PAL.stock, stall: '#2f2b2c', door: '#34473d' },
      { w: 5.6, sign: 6, awning: '#d9cdb8', wall: 'plaster', main: '#cdd2c0', stall: '#3a3331', door: '#41584a' },
      { w: 6.8, sign: 5, awning: '#8d9a85', wall: 'brick', main: '#a35b45', stall: '#e8dcc6', door: '#2d3345' },
      { w: 6.0, sign: 7, awning: '#d9a8ae', wall: 'plaster', main: '#e6dcc9', stall: '#e0d2bd', door: '#4d3548' },
    ]
    const total = (L) => L.reduce((s, e) => s + (e.passage ?? e.w), 0), len = LX1 - LX0 - 1.2
    const place = (list, row) => {
      const k = len / total(list); let x = LX1 - 0.6
      for (const sp of list) {
        if (sp.passage) { const px = x - sp.passage * k / 2; pois.passage = { x: px, z: LS + 1 }; x -= sp.passage * k; continue }
        const w = sp.w * k, xc = x - w / 2; x -= w
        const F = row > 0 ? frame(xc, LN, 0, GY) : frame(xc, LS, Math.PI, GY)
        shopBuilding(ch, F, { w, d: 12, floors: R() < 0.3 ? 4 : 3, wall: sp.wall, main: sp.main, sign: sp.sign, awning: sp.awning, stall: sp.stall, door: sp.door, doorSide: R() < 0.5 ? 'l' : 'r', balc: R() < 0.5, roof: R() < 0.55 ? 'gable' : 'hip', side: PAL.stock })
        const zf = row > 0 ? LN : LS, dir = row > 0 ? 1 : -1                                              // dir = into the lane
        if (sp.id === 'cafe') { for (let i = 0; i < 4; i++) { const tx = xc + (i - 1.5) * 1.9, tz = zf + dir * 2.4; put('table', tx, tz, 0); put('chair', tx - 0.55, tz, Math.PI / 2); put('chair', tx + 0.55, tz, -Math.PI / 2) } put('planter', xc - w / 2 + 0.5, zf + dir * 1.3, 0, 1.0); put('planter', xc + w / 2 - 0.5, zf + dir * 1.3, 0, 1.0) }
        if (sp.id === 'florist') { for (let i = 0; i < 3; i++) { const fx = xc + (i - 1) * 1.1, fz = zf + dir * 0.9; ch.prism(frame(fx, fz, 0, GY), 0, 0, 0.2, 0.17, 0, 0.42, col('#6b6a70'), 'metal', 8); for (let j = 0; j < 5; j++) ch.prism(frame(fx + (j - 2) * 0.06, fz + ((j % 2) - 0.5) * 0.08, 0, GY), 0, 0, 0.07, 0.05, 0.42, 0.64 + (j % 3) * 0.05, col(['#cfa9ad', '#e4d9cb', '#b7a5c4', '#d9c08a', '#a9b39a'][j]), 'leaf', 6) } }
        if (sp.id === 'books') { ch.box(frame(xc, zf + dir * 0.9, row > 0 ? 0 : Math.PI, GY), -0.6, 0.6, 0, 1.1, -0.25, 0.25, col('#4a3a2c'), 'wood', 'fulrb'); ch.solid(frame(xc, zf + dir * 0.9, 0, GY), -0.6, 0.6, 0, 1.1, -0.25, 0.25, 'cart') }
        if (sp.id === 'bakery') { ch.box(frame(xc, zf + dir * 0.9, 0, GY), -0.5, 0.5, 0, 0.95, -0.28, 0.28, col('#6a4d3a'), 'wood', 'fulrb'); ch.box(frame(xc, zf + dir * 0.9, 0, GY), -0.52, 0.52, 0.95, 1.0, -0.3, 0.3, col('#d9c9a0'), 'trim', 'fulrb') }
        if (sp.id) pois[sp.id] = { x: xc, z: zf + dir * 0.6 }
      }
    }
    place(NORTH, 1); place(SOUTH, -1)
    // lane furniture: lamps on alternating sides, festoon lights, benches, planters, bicycles
    for (let x = LX1 - 6; x > LX0 + 6; x -= 16) { lamp(x, 87.0, 0); lamp(x - 8, 94.0, 0) }
    for (const x of [-48, -74, -100]) { const n = 14; for (let i = 0; i <= n; i++) { const t = i / n, z = LN + 0.3 + t * (LS - LN - 0.6), y = GY + 5.6 - 0.9 * Math.sin(t * Math.PI); halos.push([x, y, z]) } }
    bench(-52, 87.9, 0); bench(-96, 93.1, Math.PI); put('planter', -39, 87.6, 0, 1.0); put('planter', -108, 93.4, 0, 1.0); put('bike', -34.5, 94.3, 0, 1.0); put('bike', -60.2, 86.4, 0, 1.0)
    // ---- pocket garden closing the lane (west): a seating corner behind a low brick wall + an old pear tree: the lane ends with something to find
    surf(g, 'slab', LX0 - 7.3, LX0, 86, 95, G.slab, 1.8, 1.2, 1); surf(g, 'grass', LX0 - 7.3, LX0 - 2.5, 86.2, 94.8, '#86a15a', 4, 4, 2)
    wall(g, LX0 - 7.5, LX0 - 7.3, 86, 95, 2.4, { col: PAL.stock, key: 'brick' }); wall(g, LX0 - 7.5, LX0, 85.3, 86, 2.4, { col: PAL.stock, key: 'brick' }); wall(g, LX0 - 7.5, LX0, 95, 95.7, 2.4, { col: PAL.stock, key: 'brick' })
    tree('ornamental', LX0 - 4.5, 90.5, 1.0); bench(LX0 - 6.5, 88.2, -Math.PI / 2); bench(LX0 - 6.5, 92.8, -Math.PI / 2); lamp(LX0 - 2.2, 90.5, 0); put('planter', LX0 - 1.6, 87.2, 0, 1.0); put('planter', LX0 - 1.6, 93.8, 0, 1.0)
    pois.pocket = { x: LX0 - 4.5, z: 90.5 }
    // ---- tucked-away passage (south row, between two shops) -> hidden courtyard (x -89..-71, z 107..118): a bench, a small tree, a lantern, a wall fountain
    {
      const px = pois.passage.x, hw = 1.3
      surf(g, 'slab', px - hw, px + hw, LS, 107, G.slab, 1.8, 1.2, 1); surf(g, 'sett', px - 8.5, px + 8.5, 107, 119, G.sett, 1.6, 1.6, 1)
      for (const s of [-1, 1]) wall(g, px + s * 8.5 - (s > 0 ? 0 : 0.5), px + s * 8.5 + (s > 0 ? 0.5 : 0), 107, 119.6, 3.0, { col: PAL.stock, key: 'brick' })
      wall(g, px - 9, px + 9, 119.6, 120.4, 3.0, { col: PAL.stock, key: 'brick' })
      tree('ornamental', px + 3.5, 113, 0.95); bench(px - 6.4, 113, -Math.PI / 2); bench(px, 118.4, Math.PI); lamp(px - 4.5, 109, 0); put('planter', px + 6, 108, 0, 1.0); put('planter', px - 6, 108, 0, 1.0)
      for (let i = 0; i < 8; i++) { put('shrub', px - 6.5 + R() * 13, 117 + R() * 1.6, R() * 6, 0.8 + R() * 0.5) }
      g.box(W0, px - 0.8, px + 0.8, 0, 1.4, 119.2, 119.6, col('#ddd2bb'), 'ashlar', 'fulrb', 2.4, 1.2); g.box(W0, px - 0.35, px + 0.35, 1.0, 1.04, 118.7, 119.2, col('#34322f'), 'trim', 'fulrb')
      waters.push({ x: px, z: 118.9, w: 0.7, d: 0.5, y: GY + 1.06, kind: 'pool' })
      mass(bk, LX0, px - 8.5, 107.5, 124, 13); mass(bk, px + 8.5, LX1, 107.5, 124, 13)
      pois.hiddenCourt = { x: px, z: 113 }
    }
    // closing masses behind the north row, between the lane and the lane-1 houses
    mass(bk, LX0, LX1, 73.3, 74, 12)
    // lane arch: stone gate piers at the east mouth (from the square) with a bronze arch sign-band
    for (const z of [LN + 0.4, LS - 0.4]) { g.box(W0, LX1 - 0.3, LX1 + 0.3, 0, 3.4, z - 0.3, z + 0.3, col(PAL.limestone), 'ashlar', 'fulrb', 2.4, 1.2); g.solid(W0, LX1 - 0.3, LX1 + 0.3, 0, 3.4, z - 0.3, z + 0.3, 'pier') }
    g.box(W0, LX1 - 0.18, LX1 + 0.18, 3.4, 3.8, LN, LS, col('#4a3a2c'), 'wood', 'fulrbd', 1, 1, 0)
    pois.lane = { x: -76, z: LZ }
  }

  // =====================================================================================================================================
  // 9. THE SECRET GARDEN (east, reached by a narrow alley off East Street) + sealing masses so no part of the envelope is an empty void
  // =====================================================================================================================================
  {
    const g = mk('secret'), bm = mk('masses')
    surf(g, 'slab', ES1, 57.4, 73.45, 74.95, G.slab, 1.8, 1.2, 2)                                                                           // alley floor
    surf(g, 'grass', 57.2, EAST - 1.4, 73.3, SOUTH - 0.4, '#86a15a', 4, 4, 1); surf(g, 'grass', ES1, 57.2, 106, SOUTH - 0.4, '#86a15a', 4, 4, 1)
    ribbon(g, 'slab', curve([[57.2, 74.2], [63, 76], [66, 84], [64, 92], [68, 99], [71, 104]], 12), 1.8, G.slab, 1.8, 1.2, 2)
    // pond with a stone rim and a timber pergola bench
    const px = 72, pz = 99
    g.box(W0, px - 3.2, px + 3.2, 0, 0.28, pz - 2.2, pz + 2.2, col('#d9cdb5'), 'ashlar', 'fulrb', 2.4, 1.2); g.solid(W0, px - 3.2, px + 3.2, 0, 0.3, pz - 2.2, pz + 2.2, 'pond')
    g.box(W0, px - 2.8, px + 2.8, 0.28, 0.3, pz - 1.8, pz + 1.8, col('#2e2a36'), 'trim', 'u', 1, 1, 0); waters.push({ x: px, z: pz, w: 5.6, d: 3.6, y: GY + 0.33, kind: 'pool' })
    for (const [x, z] of [[66, 105], [70.5, 105], [66, 109], [70.5, 109]]) { g.box(W0, x - 0.1, x + 0.1, 0, 2.6, z - 0.1, z + 0.1, col('#6a4d3a'), 'wood', 'fulrb', 1, 1, 0.02); g.solid(W0, x - 0.1, x + 0.1, 0, 2.6, z - 0.1, z + 0.1, 'post') }
    for (let i = 0; i < 6; i++) g.box(W0, 65.8, 70.8, 2.6, 2.7, 105 + i * 0.85 - 0.1, 105 + i * 0.85 + 0.05, col('#6a4d3a'), 'wood', 'fulrbd', 1, 1, 0.02)
    bench(68.3, 108.2, 0); put('lamp', 64.6, 106.5, 0, 1.0); pools.push([64.6, 106.5, 7.5]); halos.push([64.6, GY + 4.9, 106.5])
    tree('plane', 77, 85, 1.15); tree('ornamental', 62, 112, 1.0); tree('ornamental', 76, 112, 0.95); tree('ornamental', 49, 114, 0.95); tree('plane', 52, 80, 0.5)
    const R4 = rng(91); for (let i = 0; i < 26; i++) { const x = 49 + R4() * 31, z = 78 + R4() * 44; if (Math.hypot(x - px, z - pz) < 5.5 || (x > 62 && x < 72 && z > 103 && z < 110)) continue; if (R4() < 0.5) put('shrub', x, z, R4() * 6, 0.7 + R4() * 0.6); else put('grass', x, z, R4() * 6, 0.9 + R4() * 0.5) }
    for (let i = 0; i < 6; i++) g.prism(frame(60 + R4() * 20, 80 + R4() * 38, 0, GY), 0, 0, 0.3, 0.2, 0, 0.3, col(['#cfa9ad', '#e4d9cb', '#b7a5c4'][i % 3]), 'leaf', 8)
    wall(g, ES1, 57.2, 73.25 - 0.0, 73.4, 3.0, { col: PAL.stock, key: 'brick', nocap: true })                                                // alley wall, house side is the house itself
    pois.secret = { x: 66, z: 96 }; pois.alley = { x: 50, z: 74.2 }
    // masses that close the remaining voids (building backs) so the envelope is fully enclosed
    mass(bm, -98, -31.8, 124, 124.6, 3)
  }

  // =====================================================================================================================================
  // finalise: collect colliders, instance lists, lights
  // =====================================================================================================================================
  // ---- optional discoveries: small keepsakes to find while strolling (no objectives, nothing is required)
  const discoveries = [
    { id: 'leaf', label: 'a pressed plane leaf, tucked behind the courtyard bench', x: BX - 4.5, z: 30.5 },
    { id: 'coin', label: 'a lucky coin in the garden fountain', x: SCX + 3.2, z: SCZ },
    { id: 'key', label: 'a small brass key in the hidden courtyard', x: pois.hiddenCourt.x + 3.0, z: 117.2 },
    { id: 'blossom', label: 'a pear blossom in the pocket garden', x: pois.pocket.x + 1.5, z: 91.2 },
    { id: 'postcard', label: 'a handwritten postcard in the secret garden', x: 68.3, z: 106.6 },
    { id: 'view', label: 'the best view of the Wharf at sunset', x: BX, z: -142 },
    { id: 'ferry', label: 'a ferry timetable at the reserved landing', x: pois.ferry.x, z: -149 },
  ]
  for (const d of discoveries) halos.push([d.x, (d.id === 'view' || d.id === 'ferry' ? TERRACE_Y : GY) + 1.0, d.z])
  const colliders = []
  for (const c of Object.values(chunks)) colliders.push(...c.cols)
  const stats = {}; for (const [k, c] of Object.entries(chunks)) stats[k] = c.tris
  return { chunks, inst, pools, halos, waters, jets, lightsAt, colliders, pois, stats, discoveries, map: { surf: mapSurf, rib: mapRib } }
}

const rw_ = () => -5.8 - 6.2, re_ = () => 8.2 + 6.2
const signQ = (i) => { const u0 = (i % 2) / 2, v1 = 1 - Math.floor(i / 2) / 6; return [[u0, v1 - 1 / 6], [u0 + 0.5, v1 - 1 / 6], [u0 + 0.5, v1], [u0, v1]] }
