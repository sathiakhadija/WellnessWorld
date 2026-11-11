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

function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

export function buildLayout() {
  const out = []
  for (const [name, x0, x1, ytop, D, style] of HERO) {
    const a = rad(az((x0 + x1) / 2))
    const silhouette = (D * (x1 - x0)) / F_PX                 // the width we must SEE on screen
    const dr = 0.8                                             // plan aspect (depth / width)
    const w = silhouette / (Math.cos(TWIST) + dr * Math.sin(TWIST))   // box width so the twisted box projects to the measured silhouette
    const topAboveEye = (D * (HORIZON_PX - ytop)) / F_PX
    const height = topAboveEye + EYE_ABOVE_WATER
    out.push({ name, style, hero: true, x: D * Math.sin(a), z: -D * Math.cos(a), w, d: w * dr, h: height, rot: a })
  }
  // pyramid cap height from apex row
  const one = out.find((b) => b.name === 'One Canada Sq')
  one.capH = (1186 * (352 - PYRAMID_APEX_PX)) / F_PX

  // lit low-rise waterfront in front of the tower bases (reference: warm glittering band between towers and river)
  const rb = seeded(21)
  for (let i = 0; i < 150; i++) {
    const zb = -(1020 + rb() * 90), xb = (rb() * 2 - 1) * 3700                       // far bank is a straight embankment (the river runs left-right)
    const a = Math.atan2(xb, -zb)
    const w = 18 + rb() * 34
    out.push({ name: 'bank' + i, style: 'stone', band: true, hero: false, x: xb, z: zb, w, d: w * (0.7 + rb() * 0.5), h: 12 + rb() * 26, rot: a + (rb() - 0.5) * 0.5, shade: rb() })
  }
  // background city: low/mid-rise band all around the river view, plus a few taller clusters off-frame (north dock / east)
  const rnd = seeded(7)
  for (let i = 0; i < 190; i++) {
    const azDeg = -100 + rnd() * 200
    const D = 1350 + rnd() * 1500
    const a = rad(azDeg)
    const tall = (azDeg > 40 && azDeg < 95 && rnd() > 0.55) || (azDeg < -60 && rnd() > 0.93)
    const h = tall ? 90 + rnd() * 90 : 22 + rnd() * 48
    const w = 22 + rnd() * 48
    out.push({ name: 'bg' + i, style: rnd() > 0.7 ? 'stone' : 'glass', hero: false, x: D * Math.sin(a), z: -D * Math.cos(a), w, d: w * (0.7 + rnd() * 0.6), h, rot: a + (rnd() - 0.5) * 0.6, shade: rnd() })
  }
  return out
}
