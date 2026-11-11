// Procedural modelling toolkit (no DCC tool is available in this environment, so every mesh is built from code).
// All geometry is authored directly in the rig's WORLD-ALIGNED rest pose, so bone inverse matrices are plain translations.
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const hex = (h) => new THREE.Color(h)

// Skin binding: `w` = [[boneName, weight], ...] (max 4). Resolved against a name->index map at the end.
function setSkin(geo, boneIndex, perVertexWeights) {
  const n = perVertexWeights.length
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) {
    const w = perVertexWeights[i]
    let tot = 0
    for (let k = 0; k < 4; k++) tot += w[k] ? w[k][1] : 0
    for (let k = 0; k < 4; k++) {
      if (w[k]) { si[i * 4 + k] = boneIndex[w[k][0]]; sw[i * 4 + k] = w[k][1] / tot }
    }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
}

const tmpT = new THREE.Vector3(), tmpU = new THREE.Vector3(), tmpV = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0)

/**
 * Loft elliptical rings along a path.
 * ring = { c:[x,y,z], rx, rz:number|[front,back], w:[[bone,weight]...], col?:hex|Color, k?:superellipse exponent (2=ellipse), mod?:(theta)=>scale }
 * `up` hint picks the cross-section frame (default +Z is the "front" direction).
 */
export function loft(rings, { seg = 20, cap0 = true, cap1 = true, hint = Z, uv = [1, 1] } = {}) {
  const R = rings.length
  const pos = [], col = [], uvs = [], wts = [], idx = []
  const frames = rings.map((r, i) => {
    const a = rings[Math.max(0, i - 1)].c, b = rings[Math.min(R - 1, i + 1)].c
    tmpT.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()
    tmpV.copy(hint).addScaledVector(tmpT, -hint.dot(tmpT))
    if (tmpV.lengthSq() < 1e-6) tmpV.copy(Y).addScaledVector(tmpT, -Y.dot(tmpT))
    tmpV.normalize()
    tmpU.crossVectors(tmpV, tmpT).normalize()           // lateral axis
    return { u: tmpU.clone(), v: tmpV.clone() }
  })
  for (let i = 0; i < R; i++) {
    const r = rings[i], f = frames[i]
    const rzF = Array.isArray(r.rz) ? r.rz[0] : r.rz, rzB = Array.isArray(r.rz) ? r.rz[1] : r.rz
    const rxL = Array.isArray(r.rx) ? r.rx[0] : r.rx, rxR = Array.isArray(r.rx) ? r.rx[1] : r.rx
    const c = r.col ? (r.col.isColor ? r.col : hex(r.col)) : hex('#ffffff')
    const k = r.k || 2
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2
      let cs = Math.cos(th), sn = Math.sin(th)
      const e = 2 / k
      const sx = Math.sign(cs) * Math.pow(Math.abs(cs), e), sz = Math.sign(sn) * Math.pow(Math.abs(sn), e)
      const m = r.mod ? r.mod(th, i) : 1
      const ex = sx * (sx >= 0 ? rxL : rxR) * m, ez = sz * (sz >= 0 ? rzF : rzB) * m
      pos.push(r.c[0] + f.u.x * ex + f.v.x * ez, r.c[1] + f.u.y * ex + f.v.y * ez, r.c[2] + f.u.z * ex + f.v.z * ez)
      const cc = r.colFn ? r.colFn(th, c) : c
      col.push(cc.r, cc.g, cc.b)
      uvs.push((j / seg) * uv[0], (i / (R - 1)) * uv[1])
      wts.push(r.w)
    }
  }
  const row = seg + 1
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1
    idx.push(a, c, b, b, c, d)
  }
  // caps: fan to a centre vertex that shares the end ring's colour/weights
  const cap = (ri, flip) => {
    const r = rings[ri], base = pos.length / 3
    pos.push(r.c[0], r.c[1], r.c[2]); const cc = r.col ? (r.col.isColor ? r.col : hex(r.col)) : hex('#fff')
    col.push(cc.r, cc.g, cc.b); uvs.push(0.5, ri ? 1 : 0); wts.push(r.w)
    for (let j = 0; j < seg; j++) { const a = ri * row + j; flip ? idx.push(base, a, a + 1) : idx.push(base, a + 1, a) }
  }
  if (cap0) cap(0, false)
  if (cap1) cap(R - 1, true)
  let g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(idx)
  g.userData.w = wts
  fixWinding(g)
  weldSeam(g, R, row)
  return g
}

function weldSeam(g, R, row) {
  const n = g.attributes.normal
  for (let i = 0; i < R; i++) {
    const a = i * row, b = a + row - 1
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l)
  }
}
// make triangles face away from the geometry centre (lofts can come out inside-out depending on path direction)
function fixWinding(g) {
  g.computeVertexNormals()
  const p = g.attributes.position, n = g.attributes.normal
  const c = new THREE.Vector3(); for (let i = 0; i < p.count; i++) c.add(new THREE.Vector3().fromBufferAttribute(p, i)); c.multiplyScalar(1 / p.count)
  let s = 0; const v = new THREE.Vector3(), nn = new THREE.Vector3()
  for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i).sub(c); nn.fromBufferAttribute(n, i); s += v.dot(nn) }
  if (s < 0) {
    const ix = g.index.array
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t }
    g.computeVertexNormals()
  }
}

/** Ellipsoid (optionally deformed) bound to a single bone (or weight list). */
export function ellipsoid(c, r, w, { col = '#fff', ws = 20, hs = 14, mod, rot, theta } = {}) {
  let g = theta ? new THREE.SphereGeometry(1, ws, hs, 0, Math.PI * 2, theta[0], theta[1] - theta[0]) : new THREE.SphereGeometry(1, ws, hs)
  g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g)
  const p = g.attributes.position, colr = [], wts = []
  const cc = col.isColor ? col : hex(col)
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    if (mod) mod(v)
    const u = v.clone()
    v.set(v.x * r[0], v.y * r[1], v.z * r[2])
    if (rot) v.applyEuler(rot)
    p.setXYZ(i, c[0] + v.x, c[1] + v.y, c[2] + v.z)
    const q = typeof col === 'function' ? col(u, v) : cc
    colr.push(q.r, q.g, q.b); wts.push(w)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3))
  g.userData.w = wts
  g.computeVertexNormals()
  return g
}

/** Merge parts (all indexed, each with userData.w per-vertex weights) into ONE skinned-ready geometry (smooth normals kept). */
export function mergeSkinned(parts, boneIndex) {
  const gs = parts.map((g) => {
    const x = g.clone()
    if (!x.attributes.color) { const n = x.attributes.position.count; x.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3)) }
    if (x.attributes.uv) x.deleteAttribute('uv')
    x.userData = { w: g.userData.w }
    return x
  })
  const w = gs.flatMap((g) => g.userData.w)
  const m = mergeGeometries(gs, false)
  setSkin(m, boneIndex, w)
  return m
}
export { setSkin }
