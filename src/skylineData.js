// Canary Wharf skyline layout, anchored to the reference image (same method as the Blender V8 script's ref_hit()).
// Reference camera CAM1: pos (0,1.7,-0.4) three.js, yaw 15.4° (looks 15.4° LEFT of -z), 2000 px wide frame, focal 1250 px,
// horizon at image row 484.5. Every hero tower below is given by its pixel box in that reference frame
// (read off a gridded crop) and converted to metres at an assumed distance D.
//
// World units: the skyline is authored in REAL metres relative to the CAM1 eye and rendered inside a group scaled by SCALE
// (so the far plane stays small and depth precision stays good). Angular size is identical either way.

export const SCALE = 1 / 6
export const YAW_DEG = 15.4
export const F_PX = 1250
export const HORIZON_PX = 484.5
export const EYE_ABOVE_WATER = 87          // m. from the waterline at the tower bases (y≈575 px) in the reference
export const TWIST = 0.12                     // rad: each tower is turned a little so two faces show (volume)
export const SUN_AZ_DEG = 25               // from -z toward +x (matches the V8 sun fit)
export const SUN_EL_DEG = 9

const rad = (d) => (d * Math.PI) / 180
const az = (px) => -YAW_DEG + (Math.atan((px - 1000) / F_PX) * 180) / Math.PI    // degrees from -z toward +x

// px box (x0,x1) + top row (ytop) + distance D + kind
const HERO = [
  // name,                x0,   x1,   ytop, D,    style
  ['west low tower',     1096, 1148,  442, 1250, 'glass'],
  ['west block A',       1166, 1205,  418, 1230, 'glass'],
  ['west block B',       1195, 1241,  400, 1220, 'glass'],
  ['small block',        1241, 1266,  471, 1260, 'glass'],
  ['25 Canada Sq (Citi) main', 1290, 1352, 361, 1190, 'glass'],
  ['25 Canada Sq shoulder',    1352, 1367, 393, 1190, 'glass'],
  ['Citi podium',        1278, 1348,  456, 1110, 'stone'],
  ['One Canada Sq',      1386, 1446,  352, 1186, 'pyramid'],    // pyramid apex at row 331
  ['centre podium',      1369, 1451,  482, 1090, 'stone'],
  ['8 Canada Sq (HSBC)', 1463, 1526,  366, 1180, 'glass'],
  ['narrow tower',       1526, 1544,  435, 1230, 'glass'],
  ['Barclays slab',      1554, 1648,  402, 1170, 'glass'],
  ['east tower',         1716, 1761,  451, 1240, 'glass'],
]
export const PYRAMID_APEX_PX = 331
// Bible s04 (owner correction 1): architecturally varied massing. Plan/profile per hero tower so the skyline is not a row of rectangular slabs.
const HERO_SHAPE = {
  '25 Canada Sq (Citi) main': 'chamfer', '8 Canada Sq (HSBC)': 'taper', 'Barclays slab': 'slant', 'narrow tower': 'round',
  'west block B': 'chamfer', 'east tower': 'taper', 'west block A': 'slant', 'Citi podium': 'chamfer',
}
const BG_TEX = ['glass', 'glassD', 'blue', 'dusk', 'fin', 'band', 'warm', 'steel']

function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }


// Rooflines: real towers do not end in a flat lid. Each hero tower gets its own crown (set-backs, plant rooms, masts) and the lesser buildings get plant boxes or
// stepped tops, so the skyline reads as composed architecture rather than a row of boxes. Parts are extra stacked volumes (y0 = height above the waterline).
function addCrowns(out) {
  const R = seeded(404), extra = []
  const part = (b, tag, sw, sd, h, y0, o = {}) => {
    const ts = (y0 >= b.h && b.topScale) || 1; sw *= ts; sd *= ts; const th = -b.rot + TWIST, c = Math.cos(th), s = Math.sin(th), dx = o.dx || 0, dz = o.dz || 0
    extra.push({ name: b.name + ':' + tag, parent: b.name, style: b.style, shade: b.shade, hero: b.hero, band: b.band, part: true, tex: o.tex, x: b.x + dx * c + dz * s, z: b.z - dx * s + dz * c, w: sw, d: sd, h, y0, rot: b.rot })
    return y0 + h
  }
  for (const b of out) {
    if (b.part) continue
    if (b.shape === 'taper') b.topScale = 0.74
    if (b.shape === 'slant' || b.shape === 'round') { if (!b.hero && R() < 0.5) part(b, 'p', b.w * 0.25, b.d * 0.25, 2.5, b.h * 0.9); continue }
    if (b.hero) {
      switch (b.name) {
        case 'One Canada Sq': { b.crownH = 6; part(b, 'c1', b.w * 0.94, b.d * 0.94, 6, b.h, { tex: 'steel' }); part(b, 'mast', 1.5, 1.5, 22, b.h + 6 + b.capH - 2, { tex: 'steel' }); break }
        case '25 Canada Sq (Citi) main': { let y = part(b, 'n1', b.w * 0.86, b.d * 0.86, 5, b.h); y = part(b, 'n2', b.w * 0.6, b.d * 0.6, 7, y); part(b, 'm', 1.2, 1.2, 14, y); break }
        case '25 Canada Sq shoulder': part(b, 'n1', b.w * 0.8, b.d * 0.8, 4, b.h); break
        case '8 Canada Sq (HSBC)': { let y = part(b, 'n1', b.w * 0.9, b.d * 0.9, 4, b.h); y = part(b, 'n2', b.w * 0.68, b.d * 0.68, 6, y); part(b, 'm', 1.1, 1.1, 26, y); break }
        case 'Barclays slab': { let y = part(b, 'n1', b.w * 0.96, b.d * 0.9, 3, b.h); y = part(b, 'n2', b.w * 0.55, b.d * 0.7, 6, y, { dx: b.w * 0.12 }); part(b, 'm', 1.0, 1.0, 12, y, { dx: b.w * 0.12 }); break }
        case 'narrow tower': { const y = part(b, 'n1', b.w * 0.8, b.d * 0.8, 5, b.h); part(b, 'm', 0.9, 0.9, 24, y); break }
        case 'west low tower': case 'west block A': case 'west block B': case 'small block': case 'east tower': { const y = part(b, 'n1', b.w * 0.78, b.d * 0.78, 4 + R() * 3, b.h); part(b, 'p', b.w * 0.3, b.d * 0.3, 3, y, { dx: (R() - 0.5) * b.w * 0.2 }); break }
        default: break
      }
      continue
    }
    const ROOF_STONE = ['gable', 'mansard', 'hip', 'gable'], ROOF_MODERN = ['plant', 'sawtooth', 'plant']
    const assignRoof = () => { const k = (b.style === 'stone' ? ROOF_STONE : ROOF_MODERN)[(R() * 4) | 0] || 'plant'; b.roof = k; b.roofH = Math.max(2.4, Math.min(k === 'mansard' ? 10 : 9, Math.min(b.w, b.d) * (k === 'plant' ? 0.14 : 0.34))) }
    if (b.band && R() < 0.62) { assignRoof(); continue }                                                                      // Blender roof kit (assets/blender/make_skyline_kit.py)
    if (!b.band && !b.hero && b.h < 45 && (b.shape || 'box') === 'box' && R() < 0.5) { assignRoof(); continue }
    if (b.band) { if (R() < 0.45) part(b, 'p', b.w * 0.45, b.d * 0.45, 2.5 + R() * 3, b.h, { dx: (R() - 0.5) * b.w * 0.25, dz: (R() - 0.5) * b.d * 0.25 }); continue }
    if (R() < 0.6) part(b, 'p', b.w * 0.42, b.d * 0.42, 3 + R() * 5, b.h, { dx: (R() - 0.5) * b.w * 0.3, dz: (R() - 0.5) * b.d * 0.3 })
    if (b.h > 60 && R() < 0.4) { const y = part(b, 's1', b.w * 0.82, b.d * 0.82, 5, b.h); part(b, 's2', b.w * 0.55, b.d * 0.55, 6 + R() * 4, y) }
  }
  out.push(...extra)
}

export function buildLayout() {
  const out = []
  for (const [name, x0, x1, ytop, D, style] of HERO) {
    const a = rad(az((x0 + x1) / 2))
    const silhouette = (D * (x1 - x0)) / F_PX                 // the width we must SEE on screen
    const dr = 0.8                                             // plan aspect (depth / width)
    const w = silhouette / (Math.cos(TWIST) + dr * Math.sin(TWIST))   // box width so the twisted box projects to the measured silhouette
    const topAboveEye = (D * (HORIZON_PX - ytop)) / F_PX
    const height = topAboveEye + EYE_ABOVE_WATER
    out.push({ name, style, shape: HERO_SHAPE[name] || 'box', hero: true, x: D * Math.sin(a), z: -D * Math.cos(a), w, d: w * dr, h: height, rot: a })
  }
  // pyramid cap height from apex row
  const one = out.find((b) => b.name === 'One Canada Sq')
  one.capH = (1186 * (352 - PYRAMID_APEX_PX)) / F_PX

  // far-bank waterfront (middle ground): composed in CLUSTERS with plazas between them, a low warm front row on the quay and a taller glass row behind,
  // so the base of the towers reads as a lived-in dockside rather than a uniform strip of boxes
  const rb = seeded(21)
  let cx = -3600, k = 0
  while (cx < 3600) {
    const cw = 90 + rb() * 150, n = Math.max(2, Math.round(cw / (34 + rb() * 10)))
    const nearCentre = Math.abs(cx) < 1500
    for (let i = 0; i < n; i++) {
      const bx = cx + (i + 0.5) * (cw / n) + (rb() - 0.5) * 6, zb = -(1016 + rb() * 12)
      const w = 20 + rb() * 22, brick = rb() < 0.35
      const dd = w * (0.7 + rb() * 0.4), zf = Math.min(zb, -1022 - Math.hypot(w, dd) / 2)      // footprint stays behind the promenade (never over the quay edge / water)
      out.push({ name: 'bank' + k++, style: brick ? 'stone' : rb() < 0.5 ? 'stone' : 'glass', band: true, hero: false, x: bx, z: zf, w, d: dd, h: (nearCentre ? 14 : 10) + rb() * (nearCentre ? 16 : 10), rot: Math.atan2(bx, -zb) + (rb() - 0.5) * 0.12, shade: rb() })
      if (rb() < (nearCentre ? 0.8 : 0.55)) {
        const ww = 26 + rb() * 30, dd2 = ww * (0.7 + rb() * 0.5), zz = Math.min(-(1048 + rb() * 55), -1022 - Math.hypot(ww, dd2) / 2)
        out.push({ name: 'bank' + k++, style: 'glass', band: true, hero: false, x: bx + (rb() - 0.5) * 14, z: zz, w: ww, d: dd2, h: 30 + rb() * (nearCentre ? 48 : 30), rot: Math.atan2(bx, -zz) + (rb() - 0.5) * 0.2, shade: rb() })
      }
    }
    cx += cw + 36 + rb() * 80                                                    // plaza / dock basin gap
  }
  // background city: low/mid-rise band all around the river view, plus a few taller clusters off-frame (north dock / east)
  const rnd = seeded(7), rs = seeded(1234)
  for (let i = 0; i < 190; i++) {
    const azDeg = -100 + rnd() * 200
    const D = 1350 + rnd() * 1500
    const a = rad(azDeg)
    const tall = (azDeg > 40 && azDeg < 95 && rnd() > 0.55) || (azDeg < -60 && rnd() > 0.93)
    const h = tall ? 90 + rnd() * 90 : 22 + rnd() * 48
    const w = 22 + rnd() * 48
    let bz = -D * Math.cos(a)
    // V10 defect: at side azimuths (|az| > ~42 deg) D*cos(az) falls between the near embankment (z -150) and the far quay (z -1004), i.e. IN THE RIVER, so these
    // towers floated on the water. Re-seat them on the far-bank land (same x, so the skyline's horizontal composition is unchanged).
    if (bz > -1040 && bz < -150) bz = -(1060 + rnd() * 380)
    else if (bz >= -150 && bz < -90) bz = -90 + rnd() * 60                                      // on the near bank, but not on the embankment/promenade strip
    const sr = rs(), shape = h > 60 ? (sr < 0.28 ? 'chamfer' : sr < 0.46 ? 'taper' : sr < 0.62 ? 'slant' : sr < 0.74 ? 'round' : 'box') : (sr < 0.12 ? 'chamfer' : sr < 0.2 ? 'slant' : 'box'), tex = rs() < 0.55 ? BG_TEX[(rs() * BG_TEX.length) | 0] : undefined
    out.push({ name: 'bg' + i, style: rnd() > 0.7 ? 'stone' : 'glass', shape, tex, hero: false, x: D * Math.sin(a), z: bz, w, d: w * (0.7 + rnd() * 0.6), h, rot: a + (rnd() - 0.5) * 0.6, shade: rnd() })
  }
  addNearBank(out)
  addCrowns(out)
  return out
}

// Audit B03: the near-bank land used to be one raw green plane. It is now a real district: axis-aligned perimeter blocks (56 x 52 m, 14 m streets) of 4-9 storey
// townhouse / mansion-block massing on both sides of the playable neighbourhood and behind it, aligned to the ground-street texture in NearBank.jsx
// (street centres at x = 50 + 70k, z = -145 + 66j). The playable parcel (x -140..95, z -150..125) stays empty: the street plan owns it.
export const NB = { PX: 70, PZ: 66, X0: 50, Z0: -145, PARCEL: [-140, 95, -150, 125] }
function addNearBank(out) {
  const R = seeded(909), TEX = ['warm', 'stone', 'band', 'warm', 'stone']
  const [px0, px1, pz0, pz1] = NB.PARCEL
  let n = 0
  for (let k = -14; k <= 13; k++) for (let j = 0; j < 9; j++) {
    const bx0 = NB.X0 + NB.PX * k + 7, bx1 = NB.X0 + NB.PX * (k + 1) - 7, bz0 = NB.Z0 + NB.PZ * j + 7, bz1 = NB.Z0 + NB.PZ * (j + 1) - 7
    if (bx1 > px0 && bx0 < px1 && bz1 > pz0 && bz0 < pz1) continue
    const dist = Math.min(1, Math.abs((bx0 + bx1) / 2) / 900), baseH = 15 + R() * 10 + dist * 8 + j * 1.2
    for (const row of [0, 1]) {                                          // river-side row and landward row (courtyard between)
      const z0 = row ? bz1 - 15 : bz0, d = 15, split = R() < 0.55, cuts = split ? [bx0, bx0 + 14 + R() * 28, bx1] : [bx0, bx1]
      for (let i = 0; i < cuts.length - 1; i++) {
        const w = cuts[i + 1] - cuts[i], h = baseH + (R() - 0.35) * 9 + (row ? 3 : 0), stone = R() < 0.5
        out.push({ name: 'nb' + n++, style: 'stone', tex: TEX[(R() * TEX.length) | 0], shape: 'box', hero: false, nearBank: true, x: cuts[i] + w / 2, z: z0 + d / 2, w, d, h: Math.max(13, h), rot: TWIST, shade: R() })
      }
    }
  }
}
