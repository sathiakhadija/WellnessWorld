// Building generators. Each takes a Chunk, a local frame F (origin = centre of the facade at street level, local +z = outward) and a spec, and emits real
// geometry (recessed windows, cornices, mansards, balconies, shopfronts) plus its colliders. Specs are randomised by the caller so no two facades repeat.
import * as THREE from 'three'
import { rowWall } from './geo.js'
import { baked } from './interiors.js'
import { PAL, sash, pane, strip, railing, balconette, frontDoor, steps } from './facade.js'

const col = (h) => new THREE.Color(h)

// ------------------------------------------------------------------------------------------------------------------------------------------
// Georgian / Victorian townhouse (Elegant Quarter). o: { w, d, floors, main, ground, brick?, upper, doorBay, door, litP, mansard, balc }
export function townhouse(ch, F, o) {
  aoStrip(ch, F, -(o.w) / 2 - 0.1, o.w / 2 + 0.1, 1.3)
  const R = ch.R, w = o.w, d = o.d ?? 13, t = 0.36, nf = o.floors ?? 4, nb = w < 6.15 ? 2 : 3
  const plinth = 0.9, hs = [3.35, 3.95, 3.5, 3.1, 2.8].slice(0, nf).map((h) => h + (R() - 0.5) * 0.25)
  const ys = [plinth]; hs.forEach((h, i) => ys.push(ys[i] + h))
  const top = ys[nf], winW = o.winW ?? 1.12
  const wins = [{ h: 1.95, sill: 0.62 }, { h: 2.78, sill: 0.28 }, { h: 2.3, sill: 0.55 }, { h: 1.9, sill: 0.68 }, { h: 1.6, sill: 0.7 }]
  const main = col(o.main), ground = col(o.ground), trim = col(PAL.white), stone = col(PAL.limestone)
  const doorCx = (o.doorBay + 0.5) * w / nb - w / 2
  const litP = o.litP ?? 0.42
  // plinth + body
  ch.box(F, -w / 2, w / 2, 0, plinth, -d, 0, col(PAL.taupe), 'ashlar', 'flr', 2.4, 1.2)
  ch.box(F, -w / 2, w / 2, plinth, top + 0.9, -d, -t, col(o.side || PAL.stock), 'brick', 'lrb', 0.9, 1)
  for (let f = 0; f < nf; f++) {
    const y0 = ys[f], y1 = ys[f + 1], ops = [], isG = f === 0
    for (let b = 0; b < nb; b++) {
      const cx = (b + 0.5) * w / nb - w / 2
      if (isG && b === o.doorBay) { ops.push({ x0: cx - 0.62, x1: cx + 0.62, sill: 0, head: 3.05 }); continue }
      const wd = wins[f]; ops.push({ x0: cx - winW / 2, x1: cx + winW / 2, sill: wd.sill, head: wd.sill + wd.h })
    }
    const brickUp = o.upper === 'brick' && f >= 1
    const key = isG ? 'ashlar' : brickUp ? 'brick' : 'plaster'
    rowWall(ch, F, -w / 2, w / 2, y0, y1, ops, t, isG ? ground : brickUp ? col(o.brick) : main, key, key === 'brick' ? 0.9 : key === 'ashlar' ? 2.4 : 3, key === 'brick' ? 1 : key === 'ashlar' ? 1.2 : 3)
    for (let b = 0; b < nb; b++) {
      const cx = (b + 0.5) * w / nb - w / 2
      if (isG && b === o.doorBay) continue
      const wd = wins[f]
      sash(ch, F, cx, y0 + wd.sill, winW, wd.h, t, { lit: R() < litP, stone, trim })
      if (f === 1 && o.balc) balconette(ch, F, cx, y0 + wd.sill, winW, {})
      if (f >= 1 && f <= 2) surround(ch, F, cx, y0 + wd.sill, winW, wd.h, f === 1, stone, R)
    }
    if (f >= 1) ch.box(F, -w / 2 - 0.02, w / 2 + 0.02, y0 - 0.07, y0 + 0.07, -0.02, 0.07, stone, 'trim', 'fu', 1, 1, 0.02)         // string course
  }
  // front door + steps
  frontDoor(ch, F, doorCx, plinth, t, { door: col(o.door), stone, lit: R() < 0.5 })
  steps(ch, F, doorCx, 1.0, plinth, 5, 0.3, { stone })
  for (const s of [-1, 1]) ch.prism(F, doorCx + s * 0.86, 0.25, 0.13, 0.11, plinth, plinth + 2.55, col(PAL.white), 'trim', 10)         // portico columns
  ch.box(F, doorCx - 1.08, doorCx + 1.08, plinth + 2.55, plinth + 2.8, -0.05, 0.5, stone, 'trim', 'fulrbd', 1, 1, 0.015)             // entablature
  ch.tri(F, [doorCx - 1.12, plinth + 2.8, 0.52], [doorCx + 1.12, plinth + 2.8, 0.52], [doorCx, plinth + 3.15, 0.52], stone, 'trim', [0, 0, 1])
  ch.box(F, doorCx - 0.5, doorCx + 0.5, plinth + 2.85, plinth + 3.0, -0.03, 0.06, stone, 'trim', 'fulr', 1, 1, 0.01)                 // fanlight transom
  // cornice + parapet
  ch.box(F, -w / 2 - 0.05, w / 2 + 0.05, top, top + 0.17, -0.1, 0.24, stone, 'trim', 'fulrd')
  ch.box(F, -w / 2 - 0.1, w / 2 + 0.1, top + 0.17, top + 0.36, -0.1, 0.42, stone, 'trim', 'fulrd')
  ch.box(F, -w / 2, w / 2, top + 0.36, top + 0.9, -0.45, -0.1, main, 'plaster', 'flrb', 3, 3)
  ch.box(F, -w / 2 - 0.03, w / 2 + 0.03, top + 0.9, top + 0.98, -0.5, -0.05, stone, 'trim', 'fulr')
  // mansard roof with dormers + chimneys
  const B0 = top + 0.98, rise = o.mansard ?? 2.4, zf0 = -0.5, zf1 = -2.5, zb0 = -d + 0.35, zb1 = -d + 2.3, ix = 1.7
  const slate = col(o.slate || PAL.slate), deck = col('#6c7076')
  ch.slope(F, [-w / 2, B0, zf0], [w / 2, B0, zf0], [w / 2 - ix, B0 + rise, zf1], [-w / 2 + ix, B0 + rise, zf1], slate, 'roof', 1.6, 1.6)
  ch.slope(F, [w / 2, B0, zb0], [-w / 2, B0, zb0], [-w / 2 + ix, B0 + rise, zb1], [w / 2 - ix, B0 + rise, zb1], slate, 'roof', 1.6, 1.6)
  ch.slope(F, [-w / 2, B0, zb0], [-w / 2, B0, zf0], [-w / 2 + ix, B0 + rise, zf1], [-w / 2 + ix, B0 + rise, zb1], slate, 'roof', 1.6, 1.6)
  ch.slope(F, [w / 2, B0, zf0], [w / 2, B0, zb0], [w / 2 - ix, B0 + rise, zb1], [w / 2 - ix, B0 + rise, zf1], slate, 'roof', 1.6, 1.6)
  ch.slope(F, [-w / 2 + ix, B0 + rise, zf1], [w / 2 - ix, B0 + rise, zf1], [w / 2 - ix, B0 + rise, zb1], [-w / 2 + ix, B0 + rise, zb1], deck, 'roof', 2, 2)
  // roof-level fill behind the parapet at the rear so the back of the slope is closed
  ch.box(F, -w / 2, w / 2, top + 0.9, B0, -d, zb0, col(o.side || PAL.stock), 'brick', 'lrbf', 0.9, 1)
  const nd = nb === 3 ? [-w / nb, 0, w / nb] : [-w / 4, w / 4]
  for (const dx of nd) {
    if (R() < 0.12) continue
    const zq = -1.25, tt = (zf0 - zq) / (zf0 - zf1), yb = B0 + rise * tt, dw = 1.05, dh = 1.55
    ch.box(F, dx - dw / 2, dx + dw / 2, yb - 0.05, yb + dh, zq - 0.9, zq, main, 'plaster', 'flr', 3, 3)
    pane(ch, F, dx - 0.4, dx + 0.4, yb + 0.2, yb + dh - 0.25, zq + 0.01, R() < 0.2)
    strip(ch, F, 'trim+', col(PAL.white), dx - 0.4, dx + 0.4, yb + dh * 0.5 - 0.02, yb + dh * 0.5 + 0.02, zq + 0.02)
    ch.slope(F, [dx - dw / 2 - 0.08, yb + dh, zq + 0.12], [dx + dw / 2 + 0.08, yb + dh, zq + 0.12], [dx + dw / 2 + 0.08, yb + dh + 0.42, zq - 0.45], [dx - dw / 2 - 0.08, yb + dh + 0.42, zq - 0.45], slate, 'roof')
    ch.slope(F, [dx + dw / 2 + 0.08, yb + dh, zq - 0.95], [dx - dw / 2 - 0.08, yb + dh, zq - 0.95], [dx - dw / 2 - 0.08, yb + dh + 0.42, zq - 0.45], [dx + dw / 2 + 0.08, yb + dh + 0.42, zq - 0.45], slate, 'roof')
    ch.tri(F, [dx - dw / 2 - 0.08, yb + dh, zq + 0.12], [dx - dw / 2 - 0.08, yb + dh, zq - 0.95], [dx - dw / 2 - 0.08, yb + dh + 0.42, zq - 0.45], slate, 'roof', [-1, 0, 0])
    ch.tri(F, [dx + dw / 2 + 0.08, yb + dh, zq + 0.12], [dx + dw / 2 + 0.08, yb + dh, zq - 0.95], [dx + dw / 2 + 0.08, yb + dh + 0.42, zq - 0.45], slate, 'roof', [1, 0, 0])
  }
  const nch = 1 + (R() < 0.5 ? 1 : 0)
  for (let i = 0; i < nch; i++) {
    const cx = (i === 0 ? -1 : 1) * (w / 2 - 0.6) * (R() < 0.5 ? 1 : -1) * (nch === 1 ? 1 : 1), cz = -d * (0.42 + R() * 0.2), yb = B0 + rise
    ch.box(F, cx - 0.45, cx + 0.45, yb - 0.05, yb + 1.7, cz - 0.35, cz + 0.35, col(PAL.stock), 'brick', 'fblru', 0.9, 1)
    ch.box(F, cx - 0.52, cx + 0.52, yb + 1.7, yb + 1.82, cz - 0.42, cz + 0.42, stone, 'trim', 'fulrb')
    for (const px of [-0.22, 0.22]) ch.prism(F, cx + px, cz, 0.12, 0.1, yb + 1.82, yb + 2.2, col('#a8643f'), 'trim', 6)
  }
  // front garden: gravel + path, low box hedges, railing with a gate gap at the path
  const zf = 2.25
  ch.flat(F, -w / 2, w / 2, 0.45, zf, 0.02, col('#b9ac98'), 'gravel', 1.5, 1.5)
  ch.flat(F, doorCx - 0.75, doorCx + 0.75, 0.45, zf + 0.0, 0.03, col('#cdc2ae'), 'slab', 1.8, 1.2)
  const hedge = col(['#4c5b3a', '#566640', '#475a3c'][(R() * 3) | 0])
  for (const [a, b] of [[-w / 2 + 0.15, doorCx - 1.2], [doorCx + 1.2, w / 2 - 0.15]]) if (b - a > 0.8) ch.box(F, a, b, 0, 0.55, 1.1, 1.65, hedge, 'leaf', 'fulr', 1, 1, 0.08)
  railing(ch, F, -w / 2, doorCx - 0.6, zf, 0, 1.0, { solid: true }); railing(ch, F, doorCx + 0.6, w / 2, zf, 0, 1.0, { solid: true })
  for (const px of [doorCx - 0.62, doorCx + 0.62]) ch.box(F, px - 0.06, px + 0.06, 0, 1.15, zf - 0.06, zf + 0.06, col(PAL.iron), 'metal+', 'fulr')
  // physics: the body + a ramp is registered by steps()
  ch.solid(F, -w / 2, w / 2, 0, top + 3, -d, 0, 'building')
  return { top: top + 0.98 + rise, w, doorCx }
}


// Stone architrave round a sash window: jambs, a lintel with keystone, and (piano nobile) a triangular pediment + a flower box on the sill.
function surround(ch, F, cx, y0, ww, wh, noble, stone, R) {
  const j = 0.13, o = 0.075, hw = ww / 2
  for (const s of [-1, 1]) ch.box(F, cx + s * (hw + j / 2) - j / 2, cx + s * (hw + j / 2) + j / 2, y0 - 0.05, y0 + wh + 0.02, -0.02, o, stone, 'trim', 'fulr', 1, 1, 0.015)
  ch.box(F, cx - hw - j, cx + hw + j, y0 + wh, y0 + wh + 0.17, -0.02, o + 0.03, stone, 'trim', 'fulrd', 1, 1, 0.02)
  ch.box(F, cx - 0.09, cx + 0.09, y0 + wh - 0.04, y0 + wh + 0.2, -0.02, o + 0.05, stone, 'trim', 'fulr', 1, 1, 0.015)      // keystone
  if (noble) {
    const yb = y0 + wh + 0.17
    ch.box(F, cx - hw - j - 0.06, cx + hw + j + 0.06, yb, yb + 0.07, -0.02, o + 0.07, stone, 'trim', 'fulrd', 1, 1, 0.01)
    ch.tri(F, [cx - hw - j - 0.06, yb + 0.07, o + 0.06], [cx + hw + j + 0.06, yb + 0.07, o + 0.06], [cx, yb + 0.07 + 0.3, o + 0.06], stone, 'trim', [0, 0, 1])
  }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// Contemporary limestone / glass mid-rise (Modern Quarter). o: { w, d, floors, mat:'ashlar'|'brick'|'plaster', main, fin, setback, balc, litP }
export function modernBlock(ch, F, o) {
  const R = ch.R, w = o.w, d = o.d ?? 20, nbay = Math.max(4, Math.round(w / 3.0)), bw = w / nbay, nf = o.floors
  const gh = o.gh ?? 5.0, fh = o.fh ?? 3.5, arc = 3.4, zg = -0.95
  const main = col(o.main), fin = col(o.fin || o.main), frame = col(PAL.charcoal), mat = o.mat || 'ashlar'
  const su = mat === 'brick' ? 0.9 : mat === 'ashlar' ? 2.4 : 3, sv = mat === 'brick' ? 1 : mat === 'ashlar' ? 1.2 : 3
  const top = gh + nf * fh, litP = o.litP ?? 0.3
  const back = col(o.back || PAL.greige)
  ch.box(F, -w / 2, w / 2, 0, top, -d, -arc, back, 'plaster', 'lrbu', 3, 3)                                                  // rear + side mass
  ch.box(F, -w / 2, w / 2, gh, top, -arc, 0, back, 'plaster', 'dlr', 3, 3)                                                    // mass above the arcade
  // ground floor: arcade of columns, recessed shopfront glazing, lit soffit
  const cols = Math.round(w / 6)
  for (let i = 0; i <= cols; i++) {
    const x = -w / 2 + 0.25 + (i / cols) * (w - 0.5)
    ch.box(F, x - 0.25, x + 0.25, 0, gh, -0.75, -0.25, fin, mat, 'fblr', su, sv)
    ch.solid(F, x - 0.25, x + 0.25, 0, gh, -0.75, -0.25, 'column')
  }
  const sw = nbay
  for (let b = 0; b < sw; b++) {
    const x0 = -w / 2 + b * bw, x1 = x0 + bw
    if (b % 3 === 1) ch.box(F, x0, x1, 0, gh - 0.3, -arc - 0.05, -arc, col('#3a363e'), 'wood', 'f')                                // solid door/service panel
    else { pane(ch, F, x0 + 0.05, x1 - 0.05, 0.35, gh - 0.35, -arc + 0.02, R() < 0.55); strip(ch, F, 'metal+', frame, x0, x0 + 0.06, 0, gh - 0.3, -arc + 0.03) }
    ch.box(F, x0, x1, 0, 0.35, -arc - 0.05, -arc + 0.12, fin, mat, 'fu', su, sv)
  }
  for (let b = 0; b < sw; b += 2) {
    const x = -w / 2 + (b + 0.5) * bw
    ch.box(F, x - 0.9, x + 0.9, gh - 0.14, gh - 0.1, -arc + 0.3, -0.9, col('#ffdcae'), 'glow', 'd', 1, 1, 0)                           // soffit light strips
  }
  ch.box(F, -w / 2, w / 2, gh - 0.02, gh + 0.0, -arc, 0, col('#cfc6b6'), 'plaster', 'd')
  // upper floors
  for (let f = 0; f < nf; f++) {
    const y0 = gh + f * fh, last = o.setback && f === nf - 1, zp = last ? zg - 3.0 : zg
    const xa = last ? -w / 2 + bw : -w / 2, xb = last ? w / 2 - bw : w / 2
    ch.box(F, -w / 2, w / 2, y0, y0 + 0.55, last ? -4.2 : -1.1, 0.14, main, mat, 'fulrd', su, sv, 0.015)                // slab edge / spandrel (terrace deck when set back)
    for (let b = 0; b < nbay; b++) {
      const x0 = -w / 2 + b * bw, x1 = x0 + bw
      if (x0 < xa - 0.01 || x1 > xb + 0.01) continue
      const lit = R() < litP
      pane(ch, F, x0 + 0.06, x1 - 0.06, y0 + 0.55, y0 + fh - 0.02, zp - 0.02, lit)
      for (const m of [0.33, 0.66]) strip(ch, F, 'metal+', frame, x0 + bw * m - 0.025, x0 + bw * m + 0.025, y0 + 0.55, y0 + fh, zp)
      strip(ch, F, 'metal+', frame, x0, x1, y0 + fh * 0.52, y0 + fh * 0.52 + 0.05, zp)
      if (!last && o.balc && ((b + f) % 3 === 0)) {                                                                              // staggered balcony stacks
        ch.box(F, x0 + 0.12, x1 - 0.12, y0 + 0.5, y0 + 0.68, 0.14, 1.6, col('#d3c9b6'), 'trim', 'fulrd')
        ch.box(F, x0 + 0.12, x1 - 0.12, y0 + 1.5, y0 + 1.56, 1.55, 1.6, frame, 'metal+', 'fu')
        for (const px of [x0 + 0.14, (x0 + x1) / 2, x1 - 0.14]) ch.box(F, px - 0.02, px + 0.02, y0 + 0.68, y0 + 1.5, 1.55, 1.6, frame, 'metal+', 'fl')
      }
    }
    for (let b = 0; b <= nbay; b++) {                                                                                           // vertical fins on the bay lines
      const x = -w / 2 + b * bw; if (x < xa - 0.01 || x > xb + 0.01) continue
      ch.box(F, x - 0.11, x + 0.11, y0 + 0.55, y0 + fh, last ? zp - 0.02 : zg - 0.02, last ? zp + 0.5 : 0.28, fin, mat, 'fblr', su, sv, 0.015)
    }
    if (last) {                                                                                                                   // terrace balustrade
      railing(ch, F, -w / 2 + 0.2, w / 2 - 0.2, 0.0, y0 + 0.55, 1.1, { col: frame, sp: 0.2 })
    }
  }
  // roof: slab with overhang, parapet, plant screen
  const ov = o.setback ? 0.8 : 0.3
  ch.box(F, -w / 2 - ov, w / 2 + ov, top, top + 0.35, -d, o.setback ? -3.0 : 0.4, main, mat, 'fulrbd', su, sv)
  ch.box(F, -w / 2 + 2, w / 2 - 2, top + 0.35, top + 2.2, -d + 3, -d + 7, col(PAL.zinc), 'plaster', 'fulrb', 3, 3)
  ch.solid(F, -w / 2, w / 2, 0, gh, -d, -arc, 'building')
  ch.solid(F, -w / 2, w / 2, gh, top + 2, -d, 0.2, 'building')
  return { top }
}

// ------------------------------------------------------------------------------------------------------------------------------------------
// Shopfront building (Romantic Quarter). o: { w, d, floors, wall:'brick'|'plaster', main, sign (index), awning, stall, extras }
export function shopBuilding(ch, F, o) {
  aoStrip(ch, F, -(o.w) / 2 - 0.1, o.w / 2 + 0.1, 1.5)
  const R = ch.R, w = o.w, d = o.d ?? 12, t = 0.34, nf = o.floors ?? 3, ground = 3.7, fh = [3.3, 3.0, 2.8]
  const main = col(o.main), trim = col(PAL.white), stone = col(PAL.limestone), brick = o.wall === 'brick'
  const key = brick ? 'brick' : 'plaster', su = brick ? 0.9 : 3, sv = brick ? 1 : 3
  const ys = [ground]; for (let i = 0; i < nf - 1; i++) ys.push(ys[i] + fh[i])
  if (nf >= 2 && R() < 0.55) {   // Bible s12: wisteria curtain trailing from the first-floor line over the shopfront
    const cx = (R() - 0.5) * w * 0.5, span = Math.min(w * 0.6, 4.2), top = ys[0] + 1.95
    for (let k = 0; k < 44; k++) {
      const x = cx - span / 2 + R() * span, l = 0.5 + R() * 0.95, r0 = 0.045 + R() * 0.05
      ch.prism(F, x, 0.34 + R() * 0.12, r0, 0.015, top - l, top, col(['#a58fc4', '#b9a6d6', '#8e76ae', '#c8b8e0'][(R() * 4) | 0]), 'leaf', 5)
      if (R() < 0.6) ch.prism(F, x + (R() - 0.5) * 0.1, 0.4, 0.045, 0.02, top - l * 0.4, top + 0.05, col(['#5b7243', '#6b7f4a', '#4e6139'][(R() * 3) | 0]), 'leaf', 5)
    }
    ch.box(F, cx - span / 2, cx + span / 2, top, top + 0.06, 0.28, 0.46, col('#5b7243'), 'leaf', 'fulr', 1, 1, 0)
  }
  const top = ys[nf - 1]
  ch.box(F, -w / 2, w / 2, 0, top + 0.7, -d, -t, col(o.side || PAL.stock), 'brick', 'lrb', 0.9, 1)
  // ground floor shopfront: stall riser, display window (recessed), recessed entrance with a step, fascia + sign, awning
  const stall = col(o.stall || PAL.cocoa), bay = Math.min(2.7, w * 0.5), dw = 1.15
  const dx = o.doorSide === 'l' ? -w / 2 + 0.55 + dw / 2 : w / 2 - 0.55 - dw / 2
  const winX0 = o.doorSide === 'l' ? dx + dw / 2 + 0.55 : -w / 2 + 0.3, winX1 = o.doorSide === 'l' ? w / 2 - 0.3 : dx - dw / 2 - 0.55
  ch.box(F, -w / 2, w / 2, 0, 0.12, -0.5, 0.14, col('#9d9488'), 'ashlar', 'fu', 2.4, 1.2)                                       // plinth course
  const piers = o.doorSide === 'l' ? [[-w / 2, dx - dw / 2], [winX1, w / 2]] : [[-w / 2, winX0], [dx + dw / 2, w / 2]]
  if (o.doorSide !== 'l') piers.push([winX1, dx - dw / 2]); else piers.push([dx + dw / 2, winX0])
  for (const [a, b] of piers) if (b - a > 0.05) { ch.box(F, a, b, 0.12, ground - 0.35, -0.5, 0, stall, 'wood', 'fulr'); if (b - a > 0.55) { ch.box(F, a + 0.1, b - 0.1, 0.45, ground - 0.75, -0.53, -0.5, stall.clone().multiplyScalar(0.84), 'wood', 'fulr'); ch.box(F, a + 0.17, b - 0.17, 0.55, ground - 0.85, -0.545, -0.53, stall.clone().multiplyScalar(1.06), 'wood', 'fulr') } }
  // display window: stall riser + glass + transom bar + mullions
  ch.box(F, winX0, winX1, 0.12, 0.78, -0.55, -0.4, stall, 'wood', 'fu')
  const lit = o.shopLit ?? true
  if (lit && !o.interior) shopInterior(ch, F, winX0 + 0.04, winX1 - 0.04, 0.8, ground - 0.35, o.sign)
  else if (!o.interior) pane(ch, F, winX0 + 0.04, winX1 - 0.04, 0.8, ground - 0.9, -0.5, lit)
  const frameC = col('#2b2623')
  strip(ch, F, 'trim+', frameC, winX0, winX1, ground - 1.0, ground - 0.9, -0.48)
  if (lit) ch.acc('shopglass').quad(W(F, winX0 + 0.04, 0.8, -0.5), W(F, winX1 - 0.04, 0.8, -0.5), W(F, winX1 - 0.04, ground - 0.35, -0.5), W(F, winX0 + 0.04, ground - 0.35, -0.5), col('#ffffff'), dirW(F), [[0, 0], [1, 0], [1, 1], [0, 1]])
  if (!lit) pane(ch, F, winX0 + 0.04, winX1 - 0.04, ground - 0.88, ground - 0.35, -0.5, lit)
  const nm = Math.max(1, Math.round((winX1 - winX0) / 1.0))
  for (let i = 0; i <= nm; i++) { const x = winX0 + (i / nm) * (winX1 - winX0); strip(ch, F, 'trim+', frameC, x - 0.03, x + 0.03, 0.78, ground - 0.35, -0.47) }
  // entrance recess: side reveals + door at the back, threshold step
  ch.box(F, dx - dw / 2 - 0.06, dx - dw / 2, 0.12, ground - 0.35, -1.1, -0.2, stall, 'wood', 'r'); ch.box(F, dx + dw / 2, dx + dw / 2 + 0.06, 0.12, ground - 0.35, -1.1, -0.2, stall, 'wood', 'l')
  ch.box(F, dx - dw / 2, dx + dw / 2, 0.12, 0.2, -1.1, 0.14, col('#a89d8e'), 'ashlar', 'fu', 2.4, 1.2)                         // step / threshold
  if (!o.interior) { ch.box(F, dx - dw / 2, dx + dw / 2, 0.12, ground - 0.35, -1.12, -1.1, col(o.door || PAL.green), 'wood', 'f'); pane(ch, F, dx - 0.35, dx + 0.35, 0.9, 2.3, -1.09, lit) }
  ch.box(F, dx + dw / 2 - 0.2, dx + dw / 2 - 0.15, 1.0, 1.1, -1.1, -1.0, col(PAL.brass), 'metal+', 'fl', 1, 1, 0)             // door pull
  ch.box(F, dx - dw / 2, dx + dw / 2, ground - 0.35, ground - 0.3, -1.1, -0.2, col('#cfc4ae'), 'trim', 'd')
  ch.ramp(F, dx - dw / 2, dx + dw / 2, 0.14, 0.2, 0.5, 0, 0.2, 'ramp')                                                          // glides over the step
  // fascia + sign (atlas quad), corbels, lantern
  const fy0 = ground - 0.35
  ch.box(F, -w / 2, w / 2, fy0, ground + 0.05, -0.5, 0.16, stall, 'wood', 'fuldr')
  ch.acc('sign').quad(W(F, -w / 2 + 0.25, fy0 + 0.04, 0.17), W(F, w / 2 - 0.25, fy0 + 0.04, 0.17), W(F, w / 2 - 0.25, ground, 0.17), W(F, -w / 2 + 0.25, ground, 0.17), col('#ffffff'), dirW(F), signUVq(o.sign), 1)
  for (const s of [-1, 1]) ch.box(F, s * (w / 2 - 0.2) - 0.1, s * (w / 2 - 0.2) + 0.1, fy0 - 0.5, ground + 0.05, -0.1, 0.2, stone, 'trim', 'fulr')
  const aw = col(o.awning || PAL.sage)
  if (o.awning !== false) {
    ch.slope(F, [winX0 - 0.1, ground - 0.4, 0.16], [winX1 + 0.1, ground - 0.4, 0.16], [winX1 + 0.1, ground - 1.15, 1.35], [winX0 - 0.1, ground - 1.15, 1.35], aw, 'awning', 2, 2)
    ch.slope(F, [winX1 + 0.1, ground - 1.15, 1.35], [winX0 - 0.1, ground - 1.15, 1.35], [winX0 - 0.1, ground - 1.2, 1.35], [winX1 + 0.1, ground - 1.2, 1.35], aw, 'awning', 2, 2)
    ch.tri(F, [winX0 - 0.1, ground - 0.4, 0.16], [winX0 - 0.1, ground - 1.15, 1.35], [winX0 - 0.1, ground - 0.4, 1.35], aw.clone().multiplyScalar(0.85), 'awning', [-1, 0, 0])
    ch.tri(F, [winX1 + 0.1, ground - 0.4, 0.16], [winX1 + 0.1, ground - 1.15, 1.35], [winX1 + 0.1, ground - 0.4, 1.35], aw.clone().multiplyScalar(0.85), 'awning', [1, 0, 0])
  }
  // wall lanterns beside the shopfront + clipped topiary pots at the corners (not in front of the door)
  for (const sx of [-1, 1]) { const lx = sx * (w / 2 - 0.12); ch.box(F, lx - 0.05, lx + 0.05, ground - 1.35, ground - 0.95, 0.16, 0.3, col('#ffd9a0'), 'glow', 'fulrb', 1, 1, 0); ch.box(F, lx - 0.06, lx + 0.06, ground - 0.95, ground - 0.9, 0.15, 0.31, col('#2b2623'), 'metal', 'fulrbd', 1, 1, 0); ch.box(F, lx - 0.06, lx + 0.06, ground - 1.4, ground - 1.35, 0.15, 0.31, col('#2b2623'), 'metal', 'fulrbu', 1, 1, 0) }
  for (const sx of [-1, 1]) {
    const px = sx * (w / 2 - 0.3); if (Math.abs(px - dx) < 1.1) continue
    ch.prism(F, px, 0.62, 0.22, 0.2, 0.0, 0.42, col('#6b6a70'), 'metal', 10); ch.prism(F, px, 0.62, 0.012, 0.012, 0.42, 0.7, col('#5a4636'), 'wood', 5); ch.prism(F, px, 0.62, 0.3, 0.3, 0.68, 1.12, col('#4e6139'), 'leaf', 10)
    ch.solid(F, px - 0.25, px + 0.25, 0, 1.1, 0.37, 0.87, 'planter')
    const hx = px - sx * 0.62
    if (Math.abs(hx - dx) > 1.0) {
      ch.prism(F, hx, 0.66, 0.26, 0.24, 0.0, 0.34, col('#8a8378'), 'metal', 10); ch.prism(F, hx, 0.66, 0.3, 0.2, 0.34, 0.62, col('#5d7a46'), 'leaf', 9)
      for (let k = 0; k < 5; k++) { const a = k * 1.26 + sx, r = k ? 0.14 : 0; ch.prism(F, hx + Math.cos(a) * r, 0.66 + Math.sin(a) * r, 0.11, 0.09, 0.58, 0.76 + (k % 2) * 0.04, col(k % 2 ? '#f3f0ea' : '#e4e3f0'), 'leaf', 7) }
      ch.solid(F, hx - 0.27, hx + 0.27, 0, 0.8, 0.39, 0.93, 'planter')
    }
  }
  // upper floors
  const nb = w < 6 ? 2 : w < 8.2 ? 3 : 4
  for (let f = 1; f < nf; f++) {
    const y0 = ys[f - 1] + (f === 1 ? 0 : 0), y1 = f === nf - 1 ? top : ys[f], ops = []
    const yy0 = f === 1 ? ground : ys[f - 1], yy1 = ys[f]
    void y0; void y1
    const winH = f === 1 ? 2.1 : 1.85, sill = f === 1 ? 0.55 : 0.6, ww = 1.0
    for (let b = 0; b < nb; b++) { const cx = (b + 0.5) * w / nb - w / 2; ops.push({ x0: cx - ww / 2, x1: cx + ww / 2, sill, head: sill + winH }) }
    rowWall(ch, F, -w / 2, w / 2, yy0, yy1, ops, t, main, key, su, sv)
    for (let b = 0; b < nb; b++) { const cx = (b + 0.5) * w / nb - w / 2; sash(ch, F, cx, yy0 + sill, ww, winH, t, { lit: R() < 0.3, stone, trim }); if (f === 1 && o.balc) { balconette(ch, F, cx, yy0 + sill, ww, {}); if (!o.noFlowers) { ch.box(F, cx - ww / 2, cx + ww / 2, yy0 + sill + 0.62, yy0 + sill + 0.84, 0.82, 1.1, col('#2b2623'), 'metal', 'fulrb', 1, 1, 0); for (let k = 0; k < 5; k++) ch.prism(F, cx - ww / 2 + 0.1 + k * (ww - 0.2) / 4, 0.96, 0.14, 0.09, yy0 + sill + 0.84, yy0 + sill + 1.08 + (k % 2) * 0.06, col(['#edE6d7', '#4e6139', '#82749a', '#edE6d7', '#718451'][k]), 'leaf', 7) } } }
    for (let b = 0; b < nb; b++) {            // Bible s10/s11: window flower boxes under about half of the upper windows (trough + foliage mound + blooms), sits on the sill ledge
      const cx = (b + 0.5) * w / nb - w / 2; if (o.balc && f === 1) continue; if (R() > 0.55) continue
      const sy = yy0 + sill + 0.02, bl = [['#e8c9d2', '#f3f0ea', '#b9a5c9'], ['#f3f0ea', '#d9a8ae', '#cfa9c6']][R() < 0.5 ? 0 : 1]
      ch.box(F, cx - 0.52, cx + 0.52, sy, sy + 0.24, 0.1, 0.34, col('#4a3b30'), 'wood', 'fulrb', 1, 1, 0)
      ch.box(F, cx - 0.5, cx + 0.5, sy + 0.24, sy + 0.4, 0.12, 0.32, col('#5d7a46'), 'leaf', 'fulr', 1, 1, 0)
      for (let k = 0; k < 6; k++) ch.prism(F, cx - 0.42 + k * 0.168, 0.23 + (k % 2) * 0.03, 0.09, 0.08, sy + 0.38, sy + 0.54 + (k % 3) * 0.04, col(bl[k % 3]), 'leaf', 6)
    }
    ch.box(F, -w / 2 - 0.02, w / 2 + 0.02, yy0 - 0.06, yy0 + 0.06, -0.02, 0.06, stone, 'trim', 'fu')
  }
  void top
  // cornice + roof
  const yTop = ys[nf - 1] + (nf === 1 ? 0 : 0)
  const ct = ys[nf - 1]
  ch.box(F, -w / 2 - 0.05, w / 2 + 0.05, ct - 0.02, ct + 0.16, -0.1, 0.3, stone, 'trim', 'fulrd')
  ch.box(F, -w / 2, w / 2, ct + 0.16, ct + 0.7, -0.4, -0.1, main, key, 'flrb', su, sv)
  const slate = col(PAL.slate), B0 = ct + 0.7
  if (o.roof === 'gable') {
    const ridge = B0 + 2.6
    ch.slope(F, [-w / 2 - 0.1, B0, -0.4], [w / 2 + 0.1, B0, -0.4], [w / 2 + 0.1, ridge, -d / 2], [-w / 2 - 0.1, ridge, -d / 2], slate, 'roof', 1.6, 1.6)
    ch.slope(F, [w / 2 + 0.1, B0, -d + 0.4], [-w / 2 - 0.1, B0, -d + 0.4], [-w / 2 - 0.1, ridge, -d / 2], [w / 2 + 0.1, ridge, -d / 2], slate, 'roof', 1.6, 1.6)
    ch.tri(F, [-w / 2, B0, -0.4], [-w / 2, B0, -d + 0.4], [-w / 2, ridge, -d / 2], col(PAL.stock), 'brick', [-1, 0, 0])
    ch.tri(F, [w / 2, B0, -0.4], [w / 2, B0, -d + 0.4], [w / 2, ridge, -d / 2], col(PAL.stock), 'brick', [1, 0, 0])
  } else {
    ch.slope(F, [-w / 2, B0, -0.4], [w / 2, B0, -0.4], [w / 2 - 1.2, B0 + 1.9, -2.2], [-w / 2 + 1.2, B0 + 1.9, -2.2], slate, 'roof', 1.6, 1.6)
    ch.slope(F, [w / 2, B0, -d + 0.4], [-w / 2, B0, -d + 0.4], [-w / 2 + 1.2, B0 + 1.9, -d + 2.2], [w / 2 - 1.2, B0 + 1.9, -d + 2.2], slate, 'roof', 1.6, 1.6)
    ch.slope(F, [-w / 2, B0, -d + 0.4], [-w / 2, B0, -0.4], [-w / 2 + 1.2, B0 + 1.9, -2.2], [-w / 2 + 1.2, B0 + 1.9, -d + 2.2], slate, 'roof', 1.6, 1.6)
    ch.slope(F, [w / 2, B0, -0.4], [w / 2, B0, -d + 0.4], [w / 2 - 1.2, B0 + 1.9, -d + 2.2], [w / 2 - 1.2, B0 + 1.9, -2.2], slate, 'roof', 1.6, 1.6)
    ch.slope(F, [-w / 2 + 1.2, B0 + 1.9, -2.2], [w / 2 - 1.2, B0 + 1.9, -2.2], [w / 2 - 1.2, B0 + 1.9, -d + 2.2], [-w / 2 + 1.2, B0 + 1.9, -d + 2.2], col('#6c7076'), 'roof', 2, 2)
  }
  const cx = (R() - 0.5) * (w - 2)
  ch.box(F, cx - 0.4, cx + 0.4, B0 - 0.1, B0 + 2.4, -d * 0.55 - 0.35, -d * 0.55 + 0.35, col(PAL.stock), 'brick', 'fblru', 0.9, 1)
  for (const px of [-0.15, 0.15]) ch.prism(F, cx + px, -d * 0.55, 0.11, 0.09, B0 + 2.4, B0 + 2.75, col('#a8643f'), 'trim', 6)
  // colliders: body behind the recess, the display window zone, the piers, and the overhead mass (the door recess stays open so the entrance is reachable)
  if (o.interior) {
    ch.solid(F, -w / 2, w / 2, ground - 0.4, top + 4, -d, -1.1, 'building')
    ch.solid(F, -w / 2, -w / 2 + 0.3, 0, ground, -d, -1.1, 'building'); ch.solid(F, w / 2 - 0.3, w / 2, 0, ground, -d, -1.1, 'building'); ch.solid(F, -w / 2, w / 2, 0, ground, -d, -d + 0.3, 'building')
    o.interior(ch, F, { w, d, ground, dx, winX0, winX1 })
  } else ch.solid(F, -w / 2, w / 2, 0, top + 4, -d, -1.1, 'building')
  ch.solid(F, winX0, winX1, 0, ground, -1.1, -0.45, 'frontage')
  for (const [a, b] of piers) ch.solid(F, a, b, 0, ground, -1.1, 0, 'frontage')
  ch.solid(F, -w / 2, w / 2, ground - 0.4, top + 4, -1.1, 0, 'building')
  return { top: top + 0.7, dx }
}

// Lit shop interior seen through the display window: warm back wall + floor + ceiling glow, shelving / counter / pendants and themed goods
// (books, loaves, flowers, garments, ceramics) built as small emissive-lit blocks so the window reads as a real, populated room.
const SIGN_THEME = { 3: 3, 11: 3, 10: 3, 4: 1, 5: 1, 6: 0, 7: 4, 1: 0 }   // sign atlas index -> goods theme (fashion = 3 mannequins), so a boutique never shows books
function shopInterior(ch, F, x0, x1, y0, y1, sign) {
  const R = ch.R, D = 3.4, z0 = -0.62, zb = z0 - D, w = x1 - x0, rt = (R() * 5) | 0, theme = SIGN_THEME[sign] ?? rt
  const warm = (h, k = 1) => col(h).multiplyScalar(k)
  // back wall as a vertical gradient of glow strips; floor + ceiling
  const WALLS = [['#d2ab78', '#c79d68', '#b58858', '#94704a'], ['#f2e0bd', '#ead3aa', '#d9bc8f', '#b89a6e'], ['#e6e3c8', '#d9d8b8', '#c3c4a2', '#9ea083'], ['#ecd3c6', '#e2c4b4', '#cfae9d', '#a78677'], ['#e4d6bd', '#d8c7a8', '#c4b08f', '#a08c6c']]
  const wallC = WALLS[theme]
  const bandH = (y1 - y0) / wallC.length
  wallC.forEach((c, i) => ch.box(F, x0, x1, y1 - (i + 1) * bandH, y1 - i * bandH, zb - 0.02, zb, warm(c), 'shopin', 'f', 1, 1, 0))
  ch.box(F, x0, x1, y0, y0 + 0.02, zb, z0, warm('#b98a58'), 'shopin', 'u', 1, 1, 0)
  ch.box(F, x0, x1, y1 - 0.02, y1, zb, z0, warm('#dcc196'), 'shopin', 'd', 1, 1, 0)
  for (const s of [x0, x1]) ch.box(F, s, s + 0.02, y0, y1, zb, z0, warm('#e9c48c'), 'shopin', s === x0 ? 'r' : 'l', 1, 1, 0)
  // pendants
  const np = Math.max(1, Math.round(w / 1.8))
  for (let i = 0; i < np; i++) { const px = x0 + (i + 0.5) * w / np; ch.box(F, px - 0.012, px + 0.012, y1 - 0.65, y1, z0 - 1.3, z0 - 1.28, col('#3a2f28'), 'wood', 'f', 1, 1, 0); ch.box(F, px - 0.14, px + 0.14, y1 - 0.8, y1 - 0.62, z0 - 1.44, z0 - 1.16, warm('#fff4d6'), 'shopin', 'fulrb', 1, 1, 0) }
  const dark = col('#4a382c')
  // shelving along the back wall (dark timber uprights + shelves) carrying themed goods
  const shelfZ = zb + 0.06, rows = 3
  for (let i = 0; i <= Math.round(w / 0.9); i++) { const x = x0 + (i / Math.round(w / 0.9)) * (w - 0.04); ch.box(F, x, x + 0.04, y0 + 0.02, y1 - 0.25, shelfZ, shelfZ + 0.32, dark, 'wood', 'fulr', 1, 1, 0) }
  const palettes = [['#8b3a3a', '#d6c19a', '#3f5f7a', '#c79a3a', '#5a7a4a'], ['#c8884a', '#e0aa62', '#a3622f', '#f0cf94'], ['#e8a0b4', '#f4e4e8', '#8fb56e', '#d46a8a', '#f6d8a0'], ['#7a8f9e', '#d9b9a0', '#a84f4f', '#efe3d0'], ['#e9e1d3', '#b8a38a', '#7d6c58', '#d1c3ad']][theme]
  for (let r = 0; r < rows; r++) {
    const sy = y0 + 0.55 + r * ((y1 - y0 - 1.0) / rows)
    ch.box(F, x0, x1, sy, sy + 0.035, shelfZ, shelfZ + 0.32, dark, 'wood', 'fu', 1, 1, 0)
    let x = x0 + 0.1
    while (x < x1 - 0.2) { const bw = theme === 3 ? 0.26 + R() * 0.16 : 0.05 + R() * 0.12, bh = theme === 3 ? 0.06 + R() * 0.1 : 0.18 + R() * 0.26;   // fashion: folded garment stacks, not book spines
    ch.box(F, x, x + bw, sy + 0.035, sy + 0.035 + (theme === 2 ? bh * 0.7 : bh), shelfZ + 0.04, shelfZ + 0.3, warm(palettes[(R() * palettes.length) | 0], 0.9 + R() * 0.3), 'shopin', 'f', 1, 1, 0); x += bw + 0.012 + (R() < 0.15 ? 0.2 : 0) }
  }
  // counter / display table nearer the glass
  if (theme === 1 || theme === 4) { ch.box(F, x0 + 0.3, x1 - 0.3, y0, y0 + 0.9, zb + 1.0, zb + 1.7, dark, 'wood', 'fulr', 1, 1, 0); ch.box(F, x0 + 0.3, x1 - 0.3, y0 + 0.9, y0 + 0.94, zb + 0.96, zb + 1.74, warm('#efe4d0'), 'trim', 'fulr', 1, 1, 0)
    for (let i = 0; i < 6; i++) { const px = x0 + 0.5 + R() * (w - 1.0); ch.box(F, px, px + 0.16, y0 + 0.94, y0 + 1.08, zb + 1.2, zb + 1.5, warm(palettes[(R() * palettes.length) | 0], 1.05), 'shopin', 'fulr', 1, 1, 0) } }
  if (theme === 2) for (let i = 0; i < Math.max(2, Math.round(w / 0.8)); i++) { const px = x0 + 0.3 + (i + 0.5) * (w - 0.6) / Math.max(2, Math.round(w / 0.8)); ch.box(F, px - 0.14, px + 0.14, y0, y0 + 0.5, zb + 1.2, zb + 1.5, col('#5e5a52'), 'metal', 'fulr', 1, 1, 0); for (let k = 0; k < 4; k++) ch.box(F, px - 0.1 + R() * 0.05, px + 0.1, y0 + 0.5, y0 + 0.5 + 0.25 + R() * 0.25, zb + 1.25 + R() * 0.1, zb + 1.45, warm(palettes[(R() * palettes.length) | 0], 1.05), 'shopin', 'fulr', 1, 1, 0) }
  if (theme === 3) { const GARM = ['#c94f6a', '#2f4a6e', '#e9dcc4', '#7a2f3e', '#3f6a58', '#d9a441'], nm = Math.max(2, Math.min(4, Math.round(w / 1.1))), kinds = ['mannequin_dress', 'mannequin_skirt', 'mannequin_coat']
    for (let i = 0; i < nm; i++) { const px = x0 + (i + 0.5) * w / nm; baked(ch, F, kinds[(R() * 3) | 0], px, z0 - 0.85 - R() * 0.5, Math.PI + (R() - 0.5) * 0.6, { fabric: GARM[(R() * GARM.length) | 0], marble: '#e8ddd0', metal: '#6b6b6b', brass: '#c9a45e' }, y0 + 0.02, 0.92 + R() * 0.12) }
    baked(ch, F, 'shoe_shelf', x1 - 0.5, z0 - 0.6, Math.PI, { fabric: '#7a2f3e', metal: '#6b6b6b', brass: '#c9a45e' }, y0 + 0.02, 1.3)
    baked(ch, F, 'handbag', x0 + 0.5, z0 - 0.6, Math.PI, { fabric: '#7a2f3e', marble: '#efe4d0', brass: '#c9a45e' }, y0 + 0.02, 1.2) }

}
const W = (F, x, y, z) => [F.x + x * F.c + z * F.s, F.y + y, F.z - x * F.s + z * F.c]
const dirW = (F) => [F.s, 0, F.c]
// Baked-style ambient-occlusion contact strip on the ground along a façade/planter base (static, neutral, day/night-safe; Bible/Directive §3). Local z>0 is outward.
export function aoStrip(ch, F, x0, x1, depth, z0 = 0, y = 0.07) {
  ch.acc('ao').quad(W(F, x0, y, z0), W(F, x1, y, z0), W(F, x1, y, z0 + depth), W(F, x0, y, z0 + depth), col('#000000'), [0, 1, 0], [[0, 1], [1, 1], [1, 0], [0, 0]])
}
import { signUV } from './textures.js'
const signUVq = (i) => { const [u0, v0, u1, v1] = signUV(i); return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] }
