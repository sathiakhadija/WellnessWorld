// Street furniture and planting as reusable geometry, drawn once at the origin and instanced across the neighbourhood.
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Chunk, frame, C, rng } from './geo.js'
import { PAL } from './facade.js'

const F0 = frame(0, 0, 0, 0)
const iron = () => C('#26242b'), brass = () => C(PAL.brass), stone = () => C('#d4c8b0'), oak = () => C('#8a6a48')

// returns { bucketKey: BufferGeometry }
const out = (ch) => { const o = {}; for (const k of Object.keys(ch.b)) o[k] = ch.b[k].geometry(); return o }

export function lampGeo(h = 4.8) {
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
export function benchGeo() {
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
export function chairGeo() {
  const c = new Chunk('chair', rng(7)), W = C('#57473f')
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [0.18, 0.18], [-0.18, 0.18]]) c.box(F0, x - 0.015, x + 0.015, 0, 0.45, z - 0.015, z + 0.015, iron(), 'metal', 'fulrb', 1, 1, 0)
  c.box(F0, -0.21, 0.21, 0.45, 0.49, -0.21, 0.21, W, 'wood', 'fulrb', 1, 1, 0.04)
  c.box(F0, -0.21, 0.21, 0.49, 0.9, -0.22, -0.19, W, 'wood', 'fulrb', 1, 1, 0.04)
  return out(c)
}
export function tableGeo() {
  const c = new Chunk('tbl', rng(8))
  c.prism(F0, 0, 0, 0.35, 0.35, 0.72, 0.755, C('#d9cfbf'), 'trim', 14)
  c.prism(F0, 0, 0, 0.03, 0.03, 0, 0.72, iron(), 'metal', 6); c.prism(F0, 0, 0, 0.22, 0.2, 0, 0.03, iron(), 'metal', 10)
  return out(c)
}
export function urnGeo() {
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
export function treeGeo(kind) {
  const c = new Chunk('tree', rng(11)), bark = C(kind === 'plane' ? '#7a6f60' : '#5a4a3a')
  let lumps = []
  if (kind === 'plane') {                                        // London plane: tall clear trunk, broad irregular crown
    c.prism(F0, 0, 0, 0.30, 0.2, 0, 4.6, bark, 'trunk', 7)
    c.prism(F0, 0.0, 0, 0.2, 0.12, 4.4, 6.2, bark, 'trunk', 6)
    const R = rng(17)
    for (let i = 0; i < 6; i++) lumps.push(lump(1, (R() - 0.5) * 4.4, 6.4 + R() * 3.0, (R() - 0.5) * 4.4, 2.4 + R() * 0.9, 1.9 + R() * 0.7, 2.4 + R() * 0.9, i * 7))
    lumps.push(lump(1, 0, 8.2, 0, 3.0, 1.9, 3.0, 99))
  } else if (kind === 'ornamental') {                           // rounded specimen tree for the forecourt / walks
    c.prism(F0, 0, 0, 0.2, 0.13, 0, 2.6, bark, 'trunk', 7)
    const R = rng(23)
    for (let i = 0; i < 4; i++) lumps.push(lump(1, (R() - 0.5) * 1.8, 3.6 + R() * 1.2, (R() - 0.5) * 1.8, 1.7 + R() * 0.5, 1.5 + R() * 0.4, 1.7 + R() * 0.5, i * 5))
  } else {                                                       // 'clipped' pleached lime: a trimmed block crown on clear stems
    c.prism(F0, -0.9, 0, 0.1, 0.08, 0, 2.7, bark, 'trunk', 6); c.prism(F0, 0.9, 0, 0.1, 0.08, 0, 2.7, bark, 'trunk', 6)
    const g = new THREE.BoxGeometry(3.4, 1.9, 1.5, 3, 2, 2).toNonIndexed(), p = g.attributes.position, col = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(i, p.getX(i) + (hash3(p.getX(i), p.getY(i), p.getZ(i)) - 0.5) * 0.18, p.getY(i) + 3.7 + (hash3(p.getZ(i), p.getX(i), 3) - 0.5) * 0.12, p.getZ(i) + (hash3(p.getY(i), 1, p.getZ(i)) - 0.5) * 0.14)
      const k = 0.7 + 0.28 * (p.getY(i) - 2.75) / 1.9; col[i * 3] = k * 1.04; col[i * 3 + 1] = k; col[i * 3 + 2] = k * 0.86
    }
    g.computeVertexNormals(); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); lumps = [g]
  }
  return { trunk: c.b.trunk.geometry(), canopy: merge(lumps) }
}
