// Street furniture and planting as reusable geometry, drawn once at the origin and instanced across the neighbourhood.
import * as THREE from 'three'
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Chunk, frame, C, rng } from './geo.js'
import { PAL } from './facade.js'
import PROPS from './baked/props.json'
import ORG from '../baked/street_organic.json'   // assets/blender/make_street_organic.py (Blender): car, leafy shrub, grass tuft, bicycle
const BAKED = { ...PROPS, ...ORG }   // produced by assets/blender/make_props.py (Blender 5.3 / bpy): lathe, bevel and swept-curve models

const F0 = frame(0, 0, 0, 0)
const iron = () => C('#26242b'), brass = () => C(PAL.brass), stone = () => C('#d4c8b0'), oak = () => C('#8a6a48')


// ---- Blender-baked props: triangle soup per material bucket -> creased-normal geometry (smooth on curves, crisp on bevel edges)
function bakedGeo(name) {
  const o = {}
  for (const [bucket, d] of Object.entries(BAKED[name])) {
    const n = d.p.length / 3, uv = new Float32Array(n * 2)
    // d.p holds positions and d.c colours interleaved per triangle in blocks of 9 -> unpack
    const P = new Float32Array(n * 3), Cc = new Float32Array(n * 3)
    P.set(d.p); Cc.set(d.c)
    for (let i = 0; i < n; i++) { uv[i * 2] = P[i * 3] + P[i * 3 + 2]; uv[i * 2 + 1] = P[i * 3 + 1] }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    o[bucket] = toCreasedNormals(g, 0.7)
  }
  return o
}
// returns { bucketKey: BufferGeometry }
const out = (ch) => { const o = {}; for (const k of Object.keys(ch.b)) o[k] = ch.b[k].geometry(); return o }

export function lampGeo(h = 4.8) { return bakedGeo('lamp') }
export function lampGeoOld(h = 4.8) {
  const c = new Chunk('lamp', rng(3)), I = iron()
  c.box(F0, -0.22, 0.22, 0, 0.2, -0.22, 0.22, I, 'metal', 'fulrb', 1, 1, 0)
  c.prism(F0, 0, 0, 0.17, 0.12, 0.2, 0.9, I, 'metal', 8)
  c.prism(F0, 0, 0, 0.075, 0.055, 0.9, h - 0.6, I, 'metal', 8)
  c.prism(F0, 0, 0, 0.13, 0.095, h - 0.66, h - 0.56, brass(), 'metal', 8)
  c.box(F0, -0.18, 0.18, h - 0.56, h - 0.5, -0.18, 0.18, I, 'metal', 'fulrb', 1, 1, 0)
  c.box(F0, -0.14, 0.14, h - 0.5, h - 0.06, -0.14, 0.14, C('#ffdca2'), 'glow', 'fulrb', 1, 1, 0)
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) c.box(F0, sx * 0.145 - 0.012, sx * 0.145 + 0.012, h - 0.5, h - 0.06, sz * 0.145 - 0.012, sz * 0.145 + 0.012, I, 'metal', 'fulrb', 1, 1, 0)
  const y0 = h - 0.06, y1 = h + 0.2, a = 0.21
  c.tri(F0, [-a, y0, -a], [a, y0, -a], [0, y1, 0], I, 'metal', [0, 0.5, -1]); c.tri(F0, [a, y0, a], [-a, y0, a], [0, y1, 0], I, 'metal', [0, 0.5, 1])
  c.tri(F0, [a, y0, -a], [a, y0, a], [0, y1, 0], I, 'metal', [1, 0.5, 0]); c.tri(F0, [-a, y0, a], [-a, y0, -a], [0, y1, 0], I, 'metal', [-1, 0.5, 0])
  c.prism(F0, 0, 0, 0.03, 0.01, y1, y1 + 0.22, brass(), 'metal', 6)
  return out(c)
}
export function benchGeo() { return bakedGeo('bench') }
export function benchGeoOld() {
  const c = new Chunk('bench', rng(4)), I = iron(), W = oak()
  for (const sx of [-0.78, 0.78]) {
    c.box(F0, sx - 0.03, sx + 0.03, 0, 0.45, -0.22, 0.22, I, 'metal', 'fulrb', 1, 1, 0)
    c.box(F0, sx - 0.03, sx + 0.03, 0.45, 0.95, 0.18, 0.22, I, 'metal', 'fulrb', 1, 1, 0)
  }
  for (let i = 0; i < 4; i++) c.box(F0, -0.85, 0.85, 0.45, 0.5, -0.22 + i * 0.1, -0.22 + i * 0.1 + 0.085, W, 'wood', 'fulrb', 1, 1, 0.05)
  for (let i = 0; i < 3; i++) c.box(F0, -0.85, 0.85, 0.6 + i * 0.12, 0.6 + i * 0.12 + 0.09, 0.18, 0.21, W, 'wood', 'fulrb', 1, 1, 0.05)
  return out(c)
}
export function bollardGeo() {
  const c = new Chunk('bol', rng(5))
  c.prism(F0, 0, 0, 0.13, 0.11, 0, 0.78, iron(), 'metal', 8)
  c.prism(F0, 0, 0, 0.13, 0.13, 0.78, 0.84, brass(), 'metal', 8)
  return out(c)
}
// low garden bollard light (forecourt)
export function pathLightGeo() {
  const c = new Chunk('pl', rng(6))
  c.prism(F0, 0, 0, 0.09, 0.08, 0, 0.5, stone(), 'trim', 8)
  c.box(F0, -0.1, 0.1, 0.5, 0.86, -0.1, 0.1, C('#ffdca2'), 'glow', 'fulrb', 1, 1, 0)
  c.box(F0, -0.13, 0.13, 0.86, 0.92, -0.13, 0.13, stone(), 'trim', 'fulrb', 1, 1, 0)
  return out(c)
}
export function chairGeo() { return bakedGeo('chair') }
export function chairGeoOld() {
  const c = new Chunk('chair', rng(7)), W = C('#57473f')
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [0.18, 0.18], [-0.18, 0.18]]) c.box(F0, x - 0.015, x + 0.015, 0, 0.45, z - 0.015, z + 0.015, iron(), 'metal', 'fulrb', 1, 1, 0)
  c.box(F0, -0.21, 0.21, 0.45, 0.49, -0.21, 0.21, W, 'wood', 'fulrb', 1, 1, 0.04)
  c.box(F0, -0.21, 0.21, 0.49, 0.9, -0.22, -0.19, W, 'wood', 'fulrb', 1, 1, 0.04)
  return out(c)
}
export function tableGeo() { return bakedGeo('table') }
export function tableGeoOld() {
  const c = new Chunk('tbl', rng(8))
  c.prism(F0, 0, 0, 0.35, 0.35, 0.72, 0.755, C('#d9cfbf'), 'trim', 14)
  c.prism(F0, 0, 0, 0.03, 0.03, 0, 0.72, iron(), 'metal', 6); c.prism(F0, 0, 0, 0.22, 0.2, 0, 0.03, iron(), 'metal', 10)
  return out(c)
}
export function urnGeo() { return bakedGeo('urn') }
export function urnGeoOld() {
  const c = new Chunk('urn', rng(9))
  c.prism(F0, 0, 0, 0.5, 0.5, 0, 0.12, stone(), 'trim', 10); c.prism(F0, 0, 0, 0.36, 0.52, 0.12, 0.8, stone(), 'trim', 10); c.prism(F0, 0, 0, 0.58, 0.58, 0.8, 0.9, stone(), 'trim', 10)
  c.prism(F0, 0, 0, 0.5, 0.5, 0.88, 0.92, C('#4b3a2c'), 'leaf', 10)
  return out(c)
}

// ---- trees. Returns { trunk, canopy } geometries (canopy has a vertex-colour gradient; the instance colour tints it per tree)
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s) }
function lump(r, cx, cy, cz, sx, sy, sz, seed) {
  let g = new THREE.IcosahedronGeometry(r, 1); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g)           // shared vertices -> smooth normals
  const p = g.attributes.position, col = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + (hash3(x + seed, y, z) - 0.5) * 0.28
    p.setXYZ(i, cx + x * sx * n, cy + y * sy * n, cz + z * sz * n)
  }
  g.computeVertexNormals()
  const top = cy + r * sy
  for (let i = 0; i < p.count; i++) { const k = (0.6 + 0.5 * Math.max(0, Math.min(1, (p.getY(i) - (cy - r * sy)) / (top - (cy - r * sy))))) * (0.9 + 0.2 * hash3(p.getX(i) * 3, p.getY(i) * 3, p.getZ(i) * 3)); col[i * 3] = k * 1.02; col[i * 3 + 1] = k; col[i * 3 + 2] = k * 0.82 }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g.toNonIndexed()
}
const merge = (gs) => {
  const n = gs.reduce((s, g) => s + g.attributes.position.count, 0), P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3)
  let o = 0
  for (const g of gs) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); Cc.set(g.attributes.color.array, o * 3); o += g.attributes.position.count }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); return m
}
// Branching trees: tapered limbs (3 generations, irregular angles) + alpha-tested leaf-spray cards clustered on the outer twigs.
// Species differ in trunk height, limb count/spread and crown shape. One shared leaf texture (leafTexture) drives every canopy.
export function leafTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256
  const g = cv.getContext('2d'); let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = 18 + r() * 88, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, rot = a + (r() - 0.5) * 1.4, L = 34 + r() * 22, W = 15 + r() * 8
    const v = 170 + (r() * 85) | 0
    g.save(); g.translate(x, y); g.rotate(rot)
    g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(L * 0.2, -W, L * 0.8, -W * 0.8, L, 0); g.bezierCurveTo(L * 0.8, W * 0.8, L * 0.2, W, 0, 0); g.fill()
    g.strokeStyle = `rgba(90,90,90,.55)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(L * 0.95, 0); g.stroke()
    g.restore()
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; return t
}
export function treeGeo(kind) {
  const R = rng(kind === 'plane' ? 17 : kind === 'ornamental' ? 23 : 29)
  const bark = C(kind === 'plane' ? '#6b6152' : '#4a3b2e'), barkLt = C(kind === 'plane' ? '#8c826c' : '#66533f')
  const TP = [], TC = [], TU = [], TI = []                       // trunk arrays
  const LP = [], LN = [], LC = [], LU = [], LI = []              // leaf-card arrays
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const tips = []
  const tube = (pts, r0, r1, sides = 6) => {
    const base = TP.length / 3, n = pts.length
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), p = pts[i], d = (pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)])).normalize()
      const up = Math.abs(d.y) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0), u = new THREE.Vector3().crossVectors(d, up).normalize(), w = new THREE.Vector3().crossVectors(d, u)
      const rad = r0 + (r1 - r0) * t
      for (let k = 0; k <= sides; k++) {
        const a = (k / sides) * Math.PI * 2, wob = 1 + (R() - 0.5) * 0.12
        TP.push(p.x + (u.x * Math.cos(a) + w.x * Math.sin(a)) * rad * wob, p.y + (u.y * Math.cos(a) + w.y * Math.sin(a)) * rad * wob, p.z + (u.z * Math.cos(a) + w.z * Math.sin(a)) * rad * wob)
        const m = 0.55 + 0.45 * ((k + i) % 2), c = bark.clone().lerp(barkLt, 0.35 * m * R()); TC.push(c.r, c.g, c.b); TU.push(k / sides * 2, p.y * 0.5)
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) { const a = base + i * (sides + 1) + k, b = a + 1, c = a + sides + 1, d = c + 1; TI.push(a, b, c, b, d, c) }
  }
  const bend = (dir, amt) => dir.clone().add(v3((R() - 0.5) * amt, (R() - 0.5) * amt * 0.6, (R() - 0.5) * amt)).normalize()
  const grow = (p, dir, len, rad, depth, maxD, spec) => {
    const pts = [p.clone()]; let q = p.clone(), d = dir.clone()
    const segs = depth >= 2 ? 2 : 3
    for (let i = 1; i <= segs; i++) { d = bend(d, 0.35 - depth * 0.06).lerp(v3(0, 0.25 * spec.lift, 0), 0.12).normalize(); q = q.clone().addScaledVector(d, len / segs); pts.push(q) }
    tube(pts, rad, rad * (depth === maxD ? 0.55 : 0.62), depth === 0 ? 6 : depth === 1 ? 5 : 3)
    if (depth === maxD) { tips.push({ p: q.clone(), d: d.clone(), len }); return }
    const kids = spec.kids[depth]
    for (let k = 0; k < kids; k++) {
      const at = pts[1 + ((k + (R() < 0.5 ? 0 : 1)) % (pts.length - 1))].clone(), ang = (k / kids) * Math.PI * 2 + R() * 1.3, spread = spec.spread * (0.75 + R() * 0.5)
      const nd = d.clone().multiplyScalar(0.55).add(v3(Math.cos(ang) * spread, 0.25 + R() * 0.35, Math.sin(ang) * spread)).normalize()
      grow(at, nd, len * (spec.shrink + R() * 0.12), rad * 0.6, depth + 1, maxD, spec)
    }
    if (depth < maxD) { const cont = d.clone().lerp(v3(0, 1, 0), 0.25).normalize(); if (depth === 0 && spec.leader) grow(q, cont, len * 0.8, rad * 0.6, depth + 1, maxD, spec) }
  }
  let crown = v3(0, 6, 0)
  if (kind === 'plane') {                                          // London plane: tall dappled trunk, 4 strong limbs, broad open crown
    tube([v3(0, 0, 0), v3(0.05, 1.8, 0.03), v3(-0.04, 3.6, 0.02), v3(0.03, 5.0, -0.02)], 0.32, 0.19, 12)
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + R() * 0.8; grow(v3(0.03, 4.6 + R() * 0.7, -0.02), v3(Math.cos(a) * 0.7, 0.8, Math.sin(a) * 0.7).normalize(), 3.2 + R() * 0.8, 0.17, 1, 3, { kids: [0, 3, 3], spread: 0.9, shrink: 0.7, lift: 1, leader: false }) }
    crown = v3(0, 8.0, 0)
  } else if (kind === 'ornamental') {                              // blossom / magnolia type: short trunk, low rounded multi-limb crown
    tube([v3(0, 0, 0), v3(0.03, 0.9, 0.02), v3(-0.03, 1.8, 0), v3(0.0, 2.3, 0.02)], 0.2, 0.13, 7)
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + R(); grow(v3(0, 2.1 + R() * 0.3, 0), v3(Math.cos(a) * 0.8, 0.7, Math.sin(a) * 0.8).normalize(), 1.9 + R() * 0.4, 0.1, 1, 3, { kids: [0, 3, 3], spread: 0.85, shrink: 0.72, lift: 0.8, leader: false }) }
    crown = v3(0, 4.0, 0)
  } else {                                                         // 'clipped' pleached lime: two clear stems, flat-sided block of foliage
    for (const x of [-0.9, 0.9]) tube([v3(x, 0, 0), v3(x, 1.3, 0), v3(x, 2.7, 0)], 0.1, 0.07, 6)
    for (let i = 0; i < 70; i++) tips.push({ p: v3((R() - 0.5) * 3.2, 2.9 + R() * 1.7, (R() - 0.5) * 1.1), d: v3(0, 1, 0), len: 0.8 })
    crown = v3(0, 3.8, 0)
  }
  // leaf-spray cards: clusters on each tip (and a few strays on the way) with soft, crown-radial normals so the canopy shades as one volume
  const green = [C('#b9cf8e'), C('#9db577'), C('#86a066'), C('#c8d79a'), C('#76905a')], tmp = v3(0, 0, 0)   // palette foliage greens (#718451 / #3E5736 family), no lime, tmp = v3(0, 0, 0)
  const card = (cx, cy, cz, size, clusterR) => {
    const n = v3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), u = new THREE.Vector3().crossVectors(n, Math.abs(n.y) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0)).normalize(), w = new THREE.Vector3().crossVectors(n, u)
    const rot = R() * 6.28, cu = u.clone().multiplyScalar(Math.cos(rot)).addScaledVector(w, Math.sin(rot)), cw = new THREE.Vector3().crossVectors(n, cu)
    const sn = tmp.set(cx - crown.x, (cy - crown.y) * 0.8 + 0.4, cz - crown.z).normalize().clone()
    const hRel = Math.max(0, Math.min(1, (cy - (crown.y - 2.5)) / 5)), base = green[(R() * green.length) | 0], k = 0.72 + 0.7 * hRel * hRel + 0.15 * R()
    const base0 = LP.length / 3
    for (const [a, b, uu, vv] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
      LP.push(cx + (cu.x * a + cw.x * b) * size, cy + (cu.y * a + cw.y * b) * size, cz + (cu.z * a + cw.z * b) * size)
      LN.push(sn.x, sn.y, sn.z); LC.push(base.r * k, base.g * k, base.b * k * 0.95); LU.push(uu, vv)
    }
    LI.push(base0, base0 + 1, base0 + 2, base0, base0 + 2, base0 + 3)
  }
  const per = kind === 'plane' ? 15 : kind === 'ornamental' ? 10 : 1, size = kind === 'plane' ? 1.02 : kind === 'ornamental' ? 0.84 : 0.8
  for (const t of tips) for (let i = 0; i < per; i++) card(t.p.x + (R() - 0.5) * 2.4, t.p.y + (R() - 0.35) * 1.6, t.p.z + (R() - 0.5) * 2.4, size * (0.8 + R() * 0.5))
  const mk = (P, Nn, Cc, U, I, norm) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I)
    if (Nn) g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); else g.computeVertexNormals(); return g
  }
  return { trunk: mk(TP, null, TC, TU, TI), canopy: mk(LP, LN, LC, LU, LI) }
}

// ---- Phase 1-3 additions: parked cars, bicycles, shrubs, planters (all instanced; muted palette, nothing garish)
export function carGeo(bodyHex) {
  const g = bakedGeo('car2'), tint = C(bodyHex), a = g.carbody.attributes.color
  for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * tint.r, a.getY(i) * tint.g, a.getZ(i) * tint.b)
  const merged = merge([g.carbody, g.metal].map((x) => { if (!x.attributes.color) throw new Error('no colour'); return x }))
  return { metal: merged, glass: g.glass, glow: g.glow }
}
export function carGeoOld(bodyHex) {
  const c = new Chunk('car', rng(31)), B = C(bodyHex), D = C('#23222a')
  const L = 2.05, W = 0.89
  c.box(F0, -W, W, 0.28, 0.86, -L, L, B, 'metal', 'fulrb', 1, 1, 0.05)                                          // lower body
  c.box(F0, -W + 0.04, W - 0.04, 0.86, 1.32, -1.15, 1.0, B, 'metal', 'fulrb', 1, 1, 0.05)                          // cabin shell
  const g = C('#2a2d38')
  c.box(F0, -W + 0.07, W - 0.07, 0.9, 1.28, -1.17, 1.02, g, 'glass', 'fulrb', 1, 1, 0)                              // glazing (slightly proud so it reads as windows)
  c.box(F0, -W + 0.1, W - 0.1, 1.31, 1.35, -1.0, 0.85, B, 'metal', 'u', 1, 1, 0)                                    // roof
  for (const [x, z] of [[-W, -1.28], [W, -1.28], [-W, 1.28], [W, 1.28]]) c.box(F0, x - 0.1, x + 0.1, 0, 0.62, z - 0.32, z + 0.32, D, 'metal', 'fulrb', 1, 1, 0)   // wheels
  c.box(F0, -W - 0.02, W + 0.02, 0.28, 0.4, -L - 0.03, L + 0.03, D, 'metal', 'fulrb', 1, 1, 0)                      // bumper line
  c.box(F0, -0.7, -0.35, 0.62, 0.7, L - 0.0, L + 0.02, C('#ffe2b0'), 'glow', 'f', 1, 1, 0); c.box(F0, 0.35, 0.7, 0.62, 0.7, L - 0.0, L + 0.02, C('#ffe2b0'), 'glow', 'f', 1, 1, 0)
  c.box(F0, -0.7, -0.35, 0.62, 0.7, -L - 0.02, -L, C('#a2323a'), 'glow', 'b', 1, 1, 0); c.box(F0, 0.35, 0.7, 0.62, 0.7, -L - 0.02, -L, C('#a2323a'), 'glow', 'b', 1, 1, 0)
  return out(c)
}
export function bikeGeo() { return bakedGeo('bike2') }
export function bikeGeoOld() {
  const c = new Chunk('bike', rng(32)), I = C('#2b2a30'), S = C('#8a9484')
  for (const z of [-0.45, 0.45]) { for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; c.box(F0, -0.012, 0.012, 0.33 + Math.sin(a) * 0.3 - 0.015, 0.33 + Math.sin(a) * 0.3 + 0.015, z + Math.cos(a) * 0.3 - 0.03, z + Math.cos(a) * 0.3 + 0.03, I, 'metal', 'fulrb', 1, 1, 0) } }
  c.box(F0, -0.012, 0.012, 0.35, 0.82, -0.45, -0.03, S, 'metal', 'fulrb', 1, 1, 0); c.box(F0, -0.012, 0.012, 0.35, 0.8, -0.03, 0.45, S, 'metal', 'fulrb', 1, 1, 0)
  c.box(F0, -0.012, 0.012, 0.8, 0.84, -0.1, 0.05, S, 'metal', 'fulrb', 1, 1, 0); c.box(F0, -0.2, 0.2, 0.96, 0.99, 0.43, 0.47, I, 'metal', 'fulrb', 1, 1, 0)
  c.box(F0, -0.05, 0.05, 0.86, 0.9, -0.5, -0.3, I, 'metal', 'fulrb', 1, 1, 0)
  return out(c)
}
const shrubTone = (k) => C(['#56693f', '#4d6039', '#627547', '#5a6a46'][k % 4])
export function shrubGeo() { return bakedGeo('shrub_o0') }
export function shrubGeoOld() {                                      // dense clipped evergreen mound
  const c = new Chunk('shrub', rng(33))
  c.prism(F0, 0, 0, 0.55, 0.48, 0.0, 0.5, shrubTone(0), 'leaf', 9); c.prism(F0, 0, 0, 0.48, 0.3, 0.5, 0.82, shrubTone(1), 'leaf', 9)
  return out(c)
}
export function grassGeo() { return bakedGeo('grass_o') }
export function grassGeoOld() {                                      // ornamental grass tuft
  const c = new Chunk('grass', rng(34))
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283, r = 0.07 + (i % 3) * 0.05; c.tri(F0, [Math.cos(a) * r - 0.025, 0, Math.sin(a) * r], [Math.cos(a) * r + 0.025, 0, Math.sin(a) * r], [Math.cos(a) * (r + 0.28), 0.62 + (i % 4) * 0.07, Math.sin(a) * (r + 0.28)], C(['#9aa163', '#b2a875', '#8d9a5c'][i % 3]), 'leaf', [Math.cos(a), 0.2, Math.sin(a)]) }
  return out(c)
}
export function planterGeo() {                                    // stone box planter with a clipped top
  const c = new Chunk('planter', rng(35))
  c.box(F0, -0.55, 0.55, 0, 0.62, -0.4, 0.4, C('#d2c7b1'), 'trim', 'fulrb', 1, 1, 0.03)
  c.box(F0, -0.5, 0.5, 0.62, 0.7, -0.35, 0.35, C('#4a3a2c'), 'leaf', 'u', 1, 1, 0)
  c.prism(F0, -0.2, 0, 0.3, 0.22, 0.7, 1.15, shrubTone(2), 'leaf', 8); c.prism(F0, 0.25, 0.05, 0.25, 0.18, 0.7, 1.0, shrubTone(3), 'leaf', 8)
  return out(c)
}
