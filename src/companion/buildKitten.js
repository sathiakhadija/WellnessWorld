// Procedurally modelled fluffy kitten: smooth skinned base + 6 fur shells + clumped tufts. Modelled from scratch in code.
import * as THREE from 'three'
import { loft, ellipsoid, mergeSkinned, hex } from '../character/loft.js'
import { buildSkeleton } from '../character/humanoidRig.js'
import { KITTEN_JOINTS, KITTEN_SOLES } from './kittenRig.js'
import { KITTEN_APPEARANCE } from './kittenAppearance.js'

const lerp = (a, b, t) => a + (b - a) * t
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s) }

// kitten proportions: short legs. y in [0, 0.15] is compressed to [0, 0.115], everything above drops by 0.035
const squash = (y) => (y < 0.15 ? y * (0.115 / 0.15) : y - 0.035)

const zmap = (z) => (z < 0.1 ? z * 0.8 : z - 0.02)   // shorter, rounder kitten body

export function buildKitten(A = KITTEN_APPEARANCE) {
  const rig = buildSkeleton(KITTEN_JOINTS.map(([n, p, [x, y, z]]) => [n, p, [x, squash(y), zmap(z)]]))
  rig.soles = KITTEN_SOLES
  const bi = rig.index
  const W = {}; for (const [n, , p] of KITTEN_JOINTS) W[n] = new THREE.Vector3(p[0], p[1], p[2])   // authoring frame (before squash)
  const fur = [], eyes = [], dark = [], whisk = [], collar = [], gold = [], skinnish = []
  const W1 = (b) => [[b, 1]]
  const bodyW = (z) => {
    if (z < -0.09) return [['root', 1]]
    if (z < 0.0) return [['root', 1 - sstep(-0.09, -0.01, z)], ['spine', sstep(-0.09, -0.01, z)]]
    if (z < 0.065) return [['spine', 1 - sstep(-0.01, 0.065, z)], ['chest', sstep(-0.01, 0.065, z)]]
    if (z < 0.115) return [['chest', 1 - sstep(0.065, 0.115, z)], ['neck', sstep(0.065, 0.115, z)]]
    return [['neck', 1]]
  }
  // ---- body: plump rounded barrel
  const BR = [[-0.135, 0.150, 0.040, 0.040, 0.040], [-0.11, 0.150, 0.056, 0.056, 0.055], [-0.07, 0.150, 0.062, 0.060, 0.058], [-0.02, 0.150, 0.062, 0.058, 0.057],
    [0.03, 0.152, 0.061, 0.058, 0.056], [0.075, 0.156, 0.058, 0.057, 0.054], [0.115, 0.168, 0.046, 0.050, 0.044], [0.14, 0.18, 0.038, 0.046, 0.040]]
  fur.push(loft(BR.map(([z, y, rx, up, dn]) => ({ c: [0, y, z], rx, rz: [up, dn], k: 2.2, w: bodyW(z) })), { seg: 22, hint: new THREE.Vector3(0, 1, 0) }))
  // ---- head: big round kitten head with cheek fluff
  const HC = [0, 0.205, 0.148], HR = [0.060, 0.052, 0.054]
  fur.push(ellipsoid(HC, HR, W1('head'), { ws: 32, hs: 24, mod: (v) => {
    const cheek = sstep(0.3, 0.8, Math.abs(v.x)) * (1 - sstep(0.0, 0.7, Math.abs(v.y + 0.25)))
    v.x *= 1 + 0.10 * cheek; if (v.y < -0.3) { v.x *= 0.92; v.z *= 1.0 }
    if (v.z > 0.55) v.z *= 0.97
  } }))
  fur.push(ellipsoid([0, 0.186, 0.190], [0.026, 0.019, 0.022], W1('head'), { ws: 18, hs: 12 }))        // muzzle
  fur.push(ellipsoid([0, 0.172, 0.176], [0.020, 0.015, 0.020], W1('head'), { ws: 14, hs: 10 }))        // chin
  for (const s of [1, -1]) fur.push(ellipsoid([0.052 * s, 0.192, 0.145], [0.020, 0.024, 0.026], W1('head'), { ws: 14, hs: 10 })) // cheek ruffs
  // ears (small, furry, triangular) with pink inner
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    const b = [0.036 * s, 0.245, 0.128]
    fur.push(loft([
      { c: [b[0], b[1] - 0.004, b[2]], rx: 0.0185, rz: 0.0095, w: W1('ear' + S), k: 2 },
      { c: [b[0] + 0.004 * s, b[1] + 0.014, b[2] - 0.002], rx: 0.0150, rz: 0.0080, w: W1('ear' + S), k: 2 },
      { c: [b[0] + 0.009 * s, b[1] + 0.028, b[2] - 0.004], rx: 0.0070, rz: 0.0050, w: W1('ear' + S), k: 2 },
      { c: [b[0] + 0.012 * s, b[1] + 0.036, b[2] - 0.005], rx: 0.0010, rz: 0.0010, w: W1('ear' + S), k: 2 },
    ], { seg: 12, cap0: true, cap1: true, hint: new THREE.Vector3(0, 0, 1) }))
    skinnish.push(ellipsoid([b[0] + 0.001 * s, b[1] + 0.010, b[2] + 0.0065], [0.0105, 0.0185, 0.0035], W1('ear' + S), { col: A.inner, ws: 12, hs: 8, rot: new THREE.Euler(0, 0, -0.2 * s) }))
  }
  // ---- legs: short rounded, white socks/paws
  for (const [P, s, front] of [['fL', 1, true], ['fR', -1, true], ['hL', 1, false], ['hR', -1, false]]) {
    const S = P[1], up = front ? 'fUp' + S : 'hUp' + S, lo = front ? 'fLow' + S : 'hLow' + S, pw = front ? 'fPaw' + S : 'hPaw' + S
    const a = W[up], b = W[lo], c = W[pw]
    const ch = [[up, a.y], [lo, b.y], [pw, c.y + 0.02]]
    const wl = (y) => (y > b.y ? [[up, sstep(a.y, b.y, y) < 0.5 ? 1 - sstep(a.y, b.y, y) : 1 - sstep(a.y, b.y, y)], [lo, sstep(a.y, b.y, y)]] : [[lo, 1 - sstep(b.y, c.y, y) * 0 - sstep(c.y + 0.02, b.y, y) * 0], [pw, 1 - sstep(c.y + 0.03, b.y, y)]])
    const lw = (y) => {
      if (y >= b.y) { const t = sstep(a.y, b.y, y); return [[lo, 1 - t], [up, t]].map(([n, w]) => [n, w]) }
      const t = sstep(b.y, c.y + 0.01, y); return [[lo, t === 0 ? 1 : 1 - t], [pw, t]]
    }
    const rings = []
    const top = a.y + 0.012
    for (let i = 0; i <= 7; i++) {
      const t = i / 7, y = lerp(top, 0.014, t)
      const x = lerp(a.x, c.x, t), z = y > b.y ? lerp(a.z, b.z, (top - y) / (top - b.y)) : lerp(b.z, c.z + (front ? 0.01 : 0.0), (b.y - y) / (b.y - 0.014))
      const th = front ? lerp(0.0195, 0.0150, t) : (t < 0.4 ? lerp(0.030, 0.018, t / 0.4) : lerp(0.018, 0.0150, (t - 0.4) / 0.6))
      rings.push({ c: [x, y, z], rx: th, rz: th * 1.05, w: lw(y), k: 2.1 })
    }
    fur.push(loft(rings, { seg: 12, hint: new THREE.Vector3(0, 0, 1) }))
    fur.push(ellipsoid([c.x, 0.0135, c.z + (front ? 0.016 : 0.012)], [0.0185, 0.0135, 0.0245], W1(pw), { ws: 14, hs: 10 }))   // round paw
    if (!front) fur.push(ellipsoid([a.x + 0.006 * s, a.y - 0.01, a.z + 0.0], [0.034, 0.042, 0.044], [[up, 0.8], ['root', 0.2]], { ws: 14, hs: 10 }))   // thigh mass
  }
  // ---- tail: fluffy plume curling up
  {
    const T = [['tail0', 0.158, -0.135, 0.020], ['tail1', 0.172, -0.185, 0.0215], ['tail2', 0.205, -0.226, 0.0235], ['tail3', 0.248, -0.246, 0.0235], ['tail4', 0.292, -0.245, 0.0215]]
    const rings = [{ c: [0, 0.155, -0.12], rx: 0.020, rz: 0.020, w: W1('tail0'), k: 2 }]
    T.forEach(([n, y, z, r], i) => rings.push({ c: [0, y, z], rx: r, rz: r, w: [[n, 1]], k: 2 }))
    rings.push({ c: [0, 0.322, -0.24], rx: 0.016, rz: 0.016, w: W1('tail4'), k: 2 }, { c: [0, 0.336, -0.236], rx: 0.006, rz: 0.006, w: W1('tail4'), k: 2 })
    fur.push(loft(rings, { seg: 14, hint: new THREE.Vector3(1, 0, 0) }))
  }
  // ---- fur tufts: chest ruff, cheek fringe, tail plume, leg feathering, ear tips (clumped cones pointing along the surface)
  const tuft = (c, dir, len, r, w) => {
    const d = new THREE.Vector3(...dir).normalize()
    const g = ellipsoid([0, 0, 0], [r, r, len], w, { ws: 7, hs: 6 })
    const m = new THREE.Matrix4().lookAt(d, new THREE.Vector3(), new THREE.Vector3(0, 1, 0))
    g.applyMatrix4(m.setPosition(c[0], c[1], c[2]).premultiply(new THREE.Matrix4()))
    return g
  }
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const rings2 = (n, f) => { for (let i = 0; i < n; i++) f(i) }
  rings2(26, (i) => { const x = (rnd() - 0.5) * 0.07, y = 0.128 + rnd() * 0.035; fur.push(tuft([x, y, 0.118 + rnd() * 0.02], [x * 3, -0.9, 0.5], 0.020 + rnd() * 0.01, 0.0075, W1('chest'))) })      // chest ruff
  for (const s of [1, -1]) rings2(12, (i) => fur.push(tuft([0.058 * s + (rnd() - 0.5) * 0.01, 0.182 + rnd() * 0.02, 0.15 + rnd() * 0.02], [s * 1, -0.5, 0.15], 0.020 + rnd() * 0.012, 0.0065, W1('head'))))   // cheek fringe
  rings2(26, (i) => { const a = rnd() * Math.PI * 2, t = 0.2 + rnd() * 0.7, k = Math.floor(t * 4.99), n = 'tail' + k, p = [0.158, 0.172, 0.205, 0.248, 0.292][k], z = [-0.135, -0.185, -0.226, -0.246, -0.245][k]
    fur.push(tuft([Math.cos(a) * 0.021, p + Math.sin(a) * 0.021, z], [Math.cos(a), Math.sin(a) * 0.8 + 0.5, -0.5], 0.02, 0.0065, W1(n))) })   // tail plume
  for (const [S, s] of [['L', 1], ['R', -1]]) { rings2(7, (i) => fur.push(tuft([0.041 * s, 0.09 - i * 0.008, 0.062], [0, -1, -0.6], 0.016, 0.0055, W1('fLow' + S)))) }
  for (const [S, s] of [['L', 1], ['R', -1]]) rings2(6, (i) => fur.push(tuft([0.036 * s + (rnd() - 0.5) * 0.01, 0.262 + rnd() * 0.012, 0.122], [s * 0.3, 1, 0], 0.012, 0.004, W1('ear' + S))))  // ear tuft tips
  rings2(14, (i) => { const x = (rnd() - 0.5) * 0.06; fur.push(tuft([x, 0.088, -0.02 + (rnd() - 0.5) * 0.14], [x * 2, -1, 0], 0.016, 0.0065, W1('spine'))) })   // belly fluff
  // ---- eyes (big, round, glossy) + lids
  const ez = 0.1845
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    const c = [0.0275 * s, 0.211, ez], w = W1('head')
    eyes.push(ellipsoid(c, [0.0150, 0.0160, 0.0105], w, { col: '#f4efe8', ws: 20, hs: 14 }))
    eyes.push(ellipsoid([c[0] + 0.0008 * s, c[1], c[2] + 0.0050], [0.0128, 0.0138, 0.0070], w, { col: A.eye, ws: 20, hs: 12 }))
    eyes.push(ellipsoid([c[0] + 0.0008 * s, c[1], c[2] + 0.0100], [0.0072, 0.0092, 0.0035], w, { col: '#06060a', ws: 14, hs: 10 }))
    eyes.push(ellipsoid([c[0] + 0.0045 * s, c[1] + 0.0058, c[2] + 0.0128], [0.0030, 0.0030, 0.0020], w, { col: '#ffffff', ws: 8, hs: 6 }))
    eyes.push(ellipsoid([c[0] - 0.0035 * s, c[1] - 0.005, c[2] + 0.0120], [0.0016, 0.0016, 0.0012], w, { col: '#ffffff', ws: 6, hs: 5 }))
    // eyelid cap in fur colour, rotates down to blink
    fur.push(ellipsoid([c[0], c[1], c[2] - 0.001], [0.0168, 0.0178, 0.0122], W1('lid' + S), { theta: [0, 1.25], ws: 16, hs: 8 }))
  }
  // nose (small triangular, pink), mouth, whiskers
  dark.push(ellipsoid([0, 0.1985, 0.2085], [0.0070, 0.0050, 0.0050], W1('head'), { col: A.inner, ws: 12, hs: 8, rot: new THREE.Euler(0.3, 0, 0) }))
  dark.push(loft([{ c: [0, 0.1935, 0.2075], rx: 0.0006, rz: 0.0006, w: W1('head'), col: '#7a4a4f', k: 2 }, { c: [0, 0.1865, 0.2095], rx: 0.0006, rz: 0.0006, w: W1('head'), col: '#7a4a4f', k: 2 }], { seg: 5 }))
  for (const s of [1, -1]) {
    dark.push(loft([{ c: [0, 0.1865, 0.2095], rx: 0.0006, rz: 0.0006, w: W1('head'), col: '#7a4a4f', k: 2 }, { c: [0.012 * s, 0.1815, 0.2045], rx: 0.0006, rz: 0.0006, w: W1('head'), col: '#7a4a4f', k: 2 }], { seg: 5 }))
    for (let i = 0; i < 5; i++) {
      const y = 0.19 + (i - 2) * 0.0035, e = [0.095 * s, y + (i - 2) * 0.004, 0.19 - Math.abs(i - 1.5) * 0.004]
      whisk.push(loft([{ c: [0.020 * s, y, 0.2], rx: 0.0006, rz: 0.0005, w: W1('head'), col: '#ffffff', k: 2 }, { c: [0.058 * s, (y + e[1]) / 2, 0.2], rx: 0.0004, rz: 0.0004, w: W1('head'), col: '#ffffff', k: 2 }, { c: e, rx: 0.0002, rz: 0.0002, w: W1('head'), col: '#ffffff', k: 2 }], { seg: 4 }))
    }
  }
  // collar + gold paw charm
  collar.push(loft([
    { c: [0, 0.1665, 0.105], rx: 0.0455, rz: [0.044, 0.044], w: [['neck', 0.6], ['chest', 0.4]], col: A.collar, k: 2.2 },
    { c: [0, 0.1685, 0.119], rx: 0.0455, rz: [0.043, 0.044], w: [['neck', 1]], col: A.collar, k: 2.2 },
  ], { seg: 22, hint: new THREE.Vector3(0, 1, 0), cap0: false, cap1: false }))
  gold.push(ellipsoid([0, 0.1245, 0.139], [0.0072, 0.0072, 0.0022], W1('neck'), { col: A.gold, ws: 12, hs: 8 }))
  for (const [x, y] of [[-0.0045, 0.0042], [0, 0.0058], [0.0045, 0.0042]]) gold.push(ellipsoid([x, 0.1245 + y + 0.0035, 0.139], [0.0020, 0.0022, 0.0018], W1('neck'), { col: A.gold, ws: 8, hs: 6 }))

  // ---- merge + per-vertex colour (silver base, white bib/belly/paws/muzzle, grey tabby stripes) + fur length attribute
  const geos = {}
  const furGeo = mergeSkinned(fur, bi)
  const P = furGeo.attributes.position, N = furGeo.attributes.normal
  const col = furGeo.attributes.color, len = new Float32Array(P.count)
  const base = hex(A.base), white = hex(A.white), stripe = hex(A.stripe), sd = hex(A.stripeDark), inner = hex(A.inner)
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ny = N.getY(i)
    const c = base.clone()
    const wob = Math.sin(y * 55 + x * 30) * 0.012 + Math.sin(z * 31 + y * 20) * 0.01
    // stripes
    let st = 0
    const isBody = z > -0.15 && z < 0.12 && y < 0.24
    if (isBody) st = sstep(0.25, 0.5, Math.sin((z + wob) * 150)) * sstep(0.095, 0.135, y) * (0.55 + 0.45 * sstep(-0.2, 0.7, ny))
    if (z < -0.12) st = Math.max(st, sstep(0.2, 0.45, Math.sin(y * 150 + z * 40)))                        // tail rings
    if (z > 0.1 && z < 0.215 && y > 0.185) {                                                               // forehead M + cheek lines
      const fx = Math.abs(x)
      st = Math.max(st, sstep(0.7, 0.9, Math.cos(fx * 150)) * sstep(0.215, 0.235, y) * sstep(0.12, 0.17, z))
      st = Math.max(st, sstep(0.75, 0.95, Math.sin((y - 0.19) * 190)) * sstep(0.026, 0.05, fx) * 0.8 * sstep(0.17, 0.2, z) * (1 - sstep(0.19, 0.215, z + 0.0)))
    }
    if (y < 0.085 && y > 0.04 && z > -0.14) st = Math.max(st, 0.6 * sstep(0.6, 0.85, Math.sin(y * 260)) * (z < 0.09 ? 1 : 0))   // leg bars
    c.lerp(stripe, st * 0.9).lerp(sd, st * st * 0.25)
    // whites: belly, chest bib, paws, muzzle, chin
    const belly = sstep(0.1, 0.075, y) * (z < 0.1 ? 1 : 0) + (ny < -0.45 ? 1 : 0) * (z < 0.15 ? 1 : 0)
    const bib = sstep(0.05, 0.02, Math.abs(x)) * (z > 0.07 && z < 0.2 && y < 0.17 ? 1 : 0) + (y < 0.14 && z > 0.1 && z < 0.2 ? 0.7 : 0)
    const paw = sstep(0.05, 0.026, y) * (z > -0.15 ? 1 : 0)
    const muzzle = (z > 0.185 && y < 0.205 ? sstep(0.185, 0.2, z) : 0) + (y < 0.18 && z > 0.14 ? sstep(0.18, 0.165, y) : 0)
    c.lerp(white, Math.min(1, belly * 0.85 + bib * 0.8 + paw * 0.9 + muzzle * 0.8))
    // soft breathing-colour variation + slightly warmer ear/cheek tone
    const v = 0.94 + 0.08 * hash(Math.floor(x * 400), Math.floor(y * 400), Math.floor(z * 400))
    c.multiplyScalar(v)
    col.setXYZ(i, c.r, c.g, c.b)
    // fur length: long ruff on chest/cheeks/tail/haunches, short on face/legs
    let L = 1
    if (z > 0.1 && z < 0.2 && y < 0.17) L = 1.5
    if (z < -0.14) L = 1.35
    if (y > 0.19 && z > 0.17) L = 0.45
    if (y < 0.05) L = 0.6
    len[i] = L
  }
  furGeo.setAttribute('furLen', new THREE.Float32BufferAttribute(len, 1))
  geos.fur = furGeo
  geos.eye = mergeSkinned(eyes, bi)
  geos.dark = mergeSkinned([...dark], bi)
  geos.whisk = mergeSkinned(whisk, bi)
  geos.collar = mergeSkinned(collar, bi)
  geos.gold = mergeSkinned(gold, bi)
  geos.inner = mergeSkinned(skinnish, bi)
  for (const k in geos) {                      // apply the leg-shortening squash to the finished meshes (colours were computed in the original frame)
    const p = geos[k].attributes.position
    for (let i = 0; i < p.count; i++) { p.setY(i, squash(p.getY(i))); p.setZ(i, zmap(p.getZ(i))) }
    geos[k].computeBoundingSphere()
  }
  return { rig, geos, appearance: A }
}
