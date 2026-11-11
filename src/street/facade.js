// Reusable facade parts: windows with real reveals, sills, balconettes, railings, doors, steps. All take a Chunk + local frame F (outer wall plane at z = 0,
// wall thickness t behind it) so they work on any building at any orientation.
import { C, toWorld, dirWorld } from './geo.js'

export const PAL = {
  ivory: '#ece3d0', champagne: '#decdae', cream: '#e8dcc2', greige: '#cbc1b2', stone: '#d6cab2', limestone: '#dbd0ba', taupe: '#a69888', blush: '#dcc6ba',
  sage: '#a9b39a', mauve: '#977c92', plum: '#684b61', charcoal: '#34323a', slate: '#3f4049', stock: '#c4ab84', brick: '#a8714f', rose: '#b4806e',
  iron: '#1c1b21', brass: '#b7965a', zinc: '#8a8e92', white: '#f1ece1', ink: '#2b3040', green: '#34473d', cocoa: '#4a3a34',
}
const GLASS = [C('#2a2832'), C('#24232d'), C('#312e39'), C('#292b36')]
const LIT = [C('#efd0a0'), C('#f3d9b2'), C('#e9c795'), C('#f6e0be'), C('#ecce9f')]

export function strip(ch, F, key, col, x0, x1, y0, y1, z) {
  ch.acc(key).quad(toWorld(F, x0, y0, z), toWorld(F, x1, y0, z), toWorld(F, x1, y1, z), toWorld(F, x0, y1, z), col, dirWorld(F, 0, 0, 1), [[0, 0], [1, 0], [1, 1], [0, 1]])
}
// one glazing pane on the facade plane (dark reflective glass, or a warm lit window)
export function pane(ch, F, x0, x1, y0, y1, z, lit) {
  const R = ch.R
  const col = lit ? LIT[(R() * LIT.length) | 0] : GLASS[(R() * GLASS.length) | 0]
  ch.acc(lit ? 'glow' : 'glass').quad(toWorld(F, x0, y0, z), toWorld(F, x1, y0, z), toWorld(F, x1, y1, z), toWorld(F, x0, y1, z), col, dirWorld(F, 0, 0, 1), [[0, 0], [1, 0], [1, 1], [0, 1]])
  if (lit && x1 - x0 > 0.5 && y1 - y0 > 0.6) {                      // curtains + a pelmet so a lit window reads as a room, not a flat glowing rectangle
    const cw = (x1 - x0) * 0.24, cc = col.clone().multiplyScalar(0.62).lerp(C('#e9dccb'), 0.35), z2 = z + 0.004
    for (const [a, b] of [[x0, x0 + cw], [x1 - cw, x1]]) ch.acc('glow').quad(toWorld(F, a, y0, z2), toWorld(F, b, y0, z2), toWorld(F, b, y1, z2), toWorld(F, a, y1, z2), cc, dirWorld(F, 0, 0, 1), [[0, 0], [1, 0], [1, 1], [0, 1]])
    ch.acc('glow').quad(toWorld(F, x0, y1 - 0.16, z2), toWorld(F, x1, y1 - 0.16, z2), toWorld(F, x1, y1, z2), toWorld(F, x0, y1, z2), cc.clone().multiplyScalar(0.8), dirWorld(F, 0, 0, 1), [[0, 0], [1, 0], [1, 1], [0, 1]])
    ch.acc('glow').quad(toWorld(F, x0 + cw, y0, z2), toWorld(F, x1 - cw, y0, z2), toWorld(F, x1 - cw, y0 + 0.5, z2), toWorld(F, x0 + cw, y0 + 0.5, z2), col.clone().multiplyScalar(0.72), dirWorld(F, 0, 0, 1), [[0, 0], [1, 0], [1, 1], [0, 1]])
  }
}

// Sash window set into a wall of thickness t: recessed pane + glazing bars + stone sill + flat lintel. style: 'georgian' | 'plate'
export function sash(ch, F, cx, y0, w, h, t, o = {}) {
  const trim = o.trim || C(PAL.white), stone = o.stone || C(PAL.limestone)
  const zg = -t + 0.1, zf = zg + 0.015
  pane(ch, F, cx - w / 2, cx + w / 2, y0, y0 + h, zg, o.lit)
  const bar = 0.05
  strip(ch, F, 'trim+', trim, cx - w / 2, cx + w / 2, y0, y0 + bar, zf); strip(ch, F, 'trim+', trim, cx - w / 2, cx + w / 2, y0 + h - bar, y0 + h, zf)
  strip(ch, F, 'trim+', trim, cx - w / 2, cx - w / 2 + bar, y0, y0 + h, zf); strip(ch, F, 'trim+', trim, cx + w / 2 - bar, cx + w / 2, y0, y0 + h, zf)
  strip(ch, F, 'trim+', trim, cx - w / 2, cx + w / 2, y0 + h * 0.5 - 0.035, y0 + h * 0.5 + 0.035, zf + 0.012)                          // meeting rail
  if ((o.style || 'georgian') === 'georgian') {
    strip(ch, F, 'trim+', trim, cx - 0.018, cx + 0.018, y0, y0 + h, zf)
    for (const f of [0.17, 0.33, 0.67, 0.83]) strip(ch, F, 'trim+', trim, cx - w / 2, cx + w / 2, y0 + h * f - 0.012, y0 + h * f + 0.012, zf)
  } else strip(ch, F, 'trim+', trim, cx - 0.02, cx + 0.02, y0, y0 + h, zf)
  ch.box(F, cx - w / 2 - 0.07, cx + w / 2 + 0.07, y0 - 0.08, y0, -0.04, 0.09, stone, 'trim+', 'fu')                                        // sill
  if (o.lintel !== false) ch.box(F, cx - w / 2 - 0.09, cx + w / 2 + 0.09, y0 + h, y0 + h + 0.17, -0.03, 0.045, stone, 'trim+', 'fu')   // flat-arch lintel
}

// railing run along local x from x0 to x1 at depth z (iron bars, top + bottom rail). Adds a thin collider when `solid`.
export function railing(ch, F, x0, x1, z, y0, h, o = {}) {
  const col = o.col || C(PAL.iron), sp = o.sp || 0.13, k = 'metal+'
  if (x1 - x0 < 0.05) return
  ch.box(F, x0, x1, y0 + h - 0.05, y0 + h, z - 0.03, z + 0.03, col, k, 'fu')
  ch.box(F, x0, x1, y0 + 0.08, y0 + 0.13, z - 0.025, z + 0.025, col, k, 'fu')
  const n = Math.max(1, Math.round((x1 - x0) / sp))
  for (let i = 0; i <= n; i++) { const x = x0 + (i / n) * (x1 - x0); ch.box(F, x - 0.01, x + 0.01, y0 + 0.1, y0 + h - 0.05, z - 0.01, z + 0.01, col, k, 'fl', 1, 1, 0) }
  if (o.solid) ch.solid(F, x0, x1, y0, y0 + h, z - 0.06, z + 0.06, 'railing')
}
// ironwork balconette across a window
export function balconette(ch, F, cx, y0, w, o = {}) {
  const stone = o.stone || C(PAL.limestone)
  ch.box(F, cx - w / 2 - 0.12, cx + w / 2 + 0.12, y0 - 0.14, y0 - 0.02, -0.04, 0.34, stone, 'trim', 'fulrd')
  const bx = sub2(F)
  railing(ch, F, cx - w / 2 - 0.1, cx + w / 2 + 0.1, 0.3, y0 - 0.02, 0.92, { col: o.col })
  for (const s of [-1, 1]) ch.box(F, cx + s * (w / 2 + 0.1) - 0.012, cx + s * (w / 2 + 0.1) + 0.012, y0 - 0.02, y0 + 0.9, -0.01, 0.3, o.col || C(PAL.iron), 'metal+', 'fl', 1, 1, 0)
  void bx
}
const sub2 = () => null

// panelled front door recessed in a wall of thickness t, with pilasters, entablature and fanlight, plus its stone steps down to street level.
export function frontDoor(ch, F, cx, base, t, o = {}) {
  const dc = o.door || C(PAL.green), stone = o.stone || C(PAL.limestone), trim = C(PAL.white)
  const zd = -t + 0.24
  ch.box(F, cx - 0.5, cx + 0.5, base, base + 2.4, zd - 0.05, zd, dc, 'wood', 'f')
  for (const [py, ph] of [[0.15, 0.85], [1.15, 0.85]]) for (const px of [-0.3, 0.3]) strip(ch, F, 'trim+', trim.clone().multiplyScalar(0.55).lerp(dc, 0.5), cx + px - 0.17, cx + px + 0.17, base + py, base + py + ph, zd + 0.012)
  pane(ch, F, cx - 0.5, cx + 0.5, base + 2.42, base + 2.95, zd, o.lit)                                                                     // fanlight
  strip(ch, F, 'trim+', trim, cx - 0.5, cx + 0.5, base + 2.4, base + 2.45, zd + 0.01); strip(ch, F, 'trim+', trim, cx - 0.02, cx + 0.02, base + 2.45, base + 2.95, zd + 0.01)
  ch.box(F, cx + 0.32, cx + 0.38, base + 1.0, base + 1.06, zd, zd + 0.05, C(PAL.brass), 'metal+', 'fu')                                     // knocker
  ch.box(F, cx - 0.16, cx + 0.16, base + 0.78, base + 0.84, zd, zd + 0.04, C(PAL.brass), 'metal+', 'fu')                                     // letterbox
  for (const s of [-1, 1]) ch.box(F, cx + s * 0.72 - 0.1, cx + s * 0.72 + 0.1, base, base + 3.15, -0.03, 0.12, stone, 'trim', 'fulr')       // pilasters
  ch.box(F, cx - 0.98, cx + 0.98, base + 3.15, base + 3.4, -0.04, 0.3, stone, 'trim', 'fulrd')                                              // entablature / hood
  ch.box(F, cx - 1.02, cx + 1.02, base + 3.4, base + 3.5, -0.04, 0.33, stone, 'trim', 'fulr')
  // lantern over the door
  ch.box(F, cx - 0.09, cx + 0.09, base + 3.55, base + 3.85, 0.1, 0.28, C('#ffd9a0'), 'glow', 'fulrb', 1, 1, 0)
}
// stepped stone flight from the threshold (z = 0, height `h`) down to the pavement, run along +z. Adds an invisible ramp so the capsule glides over it.
export function steps(ch, F, cx, hw, h, n = 5, tread = 0.3, o = {}) {
  const stone = o.stone || C(PAL.limestone), rise = h / n
  for (let k = 0; k < n; k++) ch.box(F, cx - hw, cx + hw, 0, h - rise * k, 0, 0.45 + tread * k, stone, 'trim', 'fulr', 1, 1, 0.03)
  ch.ramp(F, cx - hw, cx + hw, 0.45, h, 0.45 + tread * (n - 1) + 0.15, 0)
  ch.solid(F, cx - hw, cx + hw, 0, h, 0, 0.45, 'landing')
}
