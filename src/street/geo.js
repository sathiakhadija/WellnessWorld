// Street-level geometry kit: a tiny box/prism/roof accumulator that writes merged, vertex-coloured, metre-UV'd geometry into material buckets,
// plus a collider registry. Everything is authored in a local frame F = { x, z, rot, y } (local +z = the facade's outward normal) so one
// generator can be placed anywhere, facing any way. Same convention as src/Neighbourhood.jsx's T(): world = (x + lx*cos + lz*sin, z - lx*sin + lz*cos).
import * as THREE from 'three'
import { EYE_ABOVE_WATER } from '../skylineData.js'

export const GROUND_Y = -EYE_ABOVE_WATER
export const GY = GROUND_Y + 0.2                     // walkable street level (world y). The V10 city's ground meshes sit at GROUND_Y+0.1/+0.2; ours are on top.
export const TERRACE_Y = GROUND_Y + 4.6              // Thames promenade level (same as the V10 embankment terrace)

export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
export const pick = (R, a) => a[Math.floor(R() * a.length) % a.length]
export const C = (h) => new THREE.Color(h)
export const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t)

export const frame = (x, z, rot = 0, y = GY) => ({ x, z, rot, y, c: Math.cos(rot), s: Math.sin(rot) })
export const toWorld = (F, lx, ly, lz) => [F.x + lx * F.c + lz * F.s, F.y + ly, F.z - lx * F.s + lz * F.c]
export const dirWorld = (F, nx, ny, nz) => [nx * F.c + nz * F.s, ny, -nx * F.s + nz * F.c]
// child frame at local (lx, lz) of F, rotated by dr
export const sub = (F, lx, lz, dr = 0, ly = 0) => { const [x, y, z] = toWorld(F, lx, ly, lz); return frame(x, z, F.rot + dr, y) }

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3()

export class Acc {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.i = []; this.k = 0 }
  // one planar quad given four WORLD corners (any winding); `nrm` is the wanted outward normal; uvs derived from metres (su, sv) unless given
  quad(A, B, Cc, D, col, nrm, uvs, tint = 1) {
    _a.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); _b.set(Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]); _c.crossVectors(_a, _b)
    let P = [A, B, Cc, D], U = uvs
    if (nrm && _c.dot(_a.set(nrm[0], nrm[1], nrm[2])) < 0) { P = [A, D, Cc, B]; if (U) U = [U[0], U[3], U[2], U[1]] }
    else if (!nrm) nrm = [_c.x, _c.y, _c.z]
    _c.set(nrm[0], nrm[1], nrm[2]).normalize()
    const r = col.r * tint, g = col.g * tint, b = col.b * tint
    for (let j = 0; j < 4; j++) {
      this.p.push(P[j][0], P[j][1], P[j][2]); this.n.push(_c.x, _c.y, _c.z); this.c.push(r, g, b)
      this.uv.push(U ? U[j][0] : 0, U ? U[j][1] : 0)
    }
    const k = this.k; this.i.push(k, k + 1, k + 2, k, k + 2, k + 3); this.k += 4
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setIndex(this.k > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1))
    g.computeBoundingSphere(); g.computeBoundingBox(); return g
  }
  get tris() { return this.i.length / 3 }
}

// A chunk = one district's worth of geometry (one mesh per material bucket) + its colliders. Keys ending in '+' are detail buckets (LOD'd by distance).
export class Chunk {
  constructor(name, R) { this.name = name; this.b = {}; this.R = R || rng(7); this.cols = [] }
  acc(k) { return this.b[k] || (this.b[k] = new Acc()) }

  // ---- axis-aligned (in F) box. faces: f=+z b=-z u=+y d=-y l=-x r=+x. UV in metres / (su, sv) so textures tile at real scale.
  box(F, x0, x1, y0, y1, z0, z1, col, key = 'plaster', faces = 'fulrb', su = 1, sv = 1, jit = 0.025) {
    if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; if (z1 < z0) [z0, z1] = [z1, z0]
    const a = this.acc(key), W = (lx, ly, lz) => toWorld(F, lx, ly, lz)
    const t = 1 + (this.R() - 0.5) * 2 * jit
    const uv = (u0, u1, v0, v1) => [[u0 / su, v0 / sv], [u1 / su, v0 / sv], [u1 / su, v1 / sv], [u0 / su, v1 / sv]]
    if (faces.includes('f')) a.quad(W(x0, y0, z1), W(x1, y0, z1), W(x1, y1, z1), W(x0, y1, z1), col, dirWorld(F, 0, 0, 1), uv(x0, x1, y0, y1), t)
    if (faces.includes('b')) a.quad(W(x1, y0, z0), W(x0, y0, z0), W(x0, y1, z0), W(x1, y1, z0), col, dirWorld(F, 0, 0, -1), uv(-x1, -x0, y0, y1), t)
    if (faces.includes('r')) a.quad(W(x1, y0, z1), W(x1, y0, z0), W(x1, y1, z0), W(x1, y1, z1), col, dirWorld(F, 1, 0, 0), uv(-z1, -z0, y0, y1), t * 0.97)
    if (faces.includes('l')) a.quad(W(x0, y0, z0), W(x0, y0, z1), W(x0, y1, z1), W(x0, y1, z0), col, dirWorld(F, -1, 0, 0), uv(z0, z1, y0, y1), t * 0.97)
    if (faces.includes('u')) a.quad(W(x0, y1, z1), W(x1, y1, z1), W(x1, y1, z0), W(x0, y1, z0), col, [0, 1, 0], uv(x0, x1, z0, z1), t * 1.02)
    if (faces.includes('d')) a.quad(W(x0, y0, z0), W(x1, y0, z0), W(x1, y0, z1), W(x0, y0, z1), col, [0, -1, 0], uv(x0, x1, z0, z1), t * 0.9)
  }
  // flat horizontal slab (ground surfaces): normal up, metre UVs
  flat(F, x0, x1, z0, z1, y, col, key, su = 1, sv = 1) { this.box(F, x0, x1, y - 0.001, y, z0, z1, col, key, 'u', su, sv, 0) }
  // regular n-gon prism about local (cx, cz): columns, lamp poles, trunks, pots, fountain basins. r1 = bottom radius, r2 = top radius
  prism(F, cx, cz, r1, r2, y0, y1, col, key = 'metal', n = 8, caps = true, rot0 = Math.PI / n) {
    const a = this.acc(key), W = (lx, ly, lz) => toWorld(F, lx, ly, lz)
    for (let i = 0; i < n; i++) {
      const t0 = rot0 + (i / n) * Math.PI * 2, t1 = rot0 + ((i + 1) / n) * Math.PI * 2, tm = (t0 + t1) / 2
      const p0 = W(cx + Math.cos(t0) * r1, y0, cz + Math.sin(t0) * r1), p1 = W(cx + Math.cos(t1) * r1, y0, cz + Math.sin(t1) * r1)
      const q1 = W(cx + Math.cos(t1) * r2, y1, cz + Math.sin(t1) * r2), q0 = W(cx + Math.cos(t0) * r2, y1, cz + Math.sin(t0) * r2)
      a.quad(p0, p1, q1, q0, col, dirWorld(F, Math.cos(tm), 0, Math.sin(tm)), [[i / n, 0], [(i + 1) / n, 0], [(i + 1) / n, 1], [i / n, 1]], 1 + Math.cos(tm) * 0.04)
      if (caps) a.quad(W(cx, y1, cz), q0, q1, q1, col, [0, 1, 0], null, 1.03)
    }
  }
  // sloped roof / ramp plane through four LOCAL corners (ccw from outside). Used for hips, gables, mansards, awnings, ramps.
  slope(F, p0, p1, p2, p3, col, key = 'roof', su = 2, sv = 2, tint = 1) {
    const W = (p) => toWorld(F, p[0], p[1], p[2])
    const A = W(p0), B = W(p1), Cc = W(p2), D = W(p3)
    const ux = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), vx = Math.hypot(D[0] - A[0], D[1] - A[1], D[2] - A[2])
    this.acc(key).quad(A, B, Cc, D, col, null, [[0, 0], [ux / su, 0], [ux / su, vx / sv], [0, vx / sv]], tint)
  }
  tri(F, p0, p1, p2, col, key = 'roof', outward) {
    const W = (p) => toWorld(F, p[0], p[1], p[2]), a = this.acc(key)
    let A = W(p0), B = W(p1), Cc = W(p2)
    _a.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]); _b.set(Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]); _c.crossVectors(_a, _b)
    if (outward) { const o = dirWorld(F, ...outward); if (_c.dot(_a.set(o[0], o[1], o[2])) < 0) [B, Cc] = [Cc, B] }
    _c.crossVectors(_a.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]), _b.set(Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2])).normalize()
    for (const P of [A, B, Cc]) { a.p.push(P[0], P[1], P[2]); a.n.push(_c.x, _c.y, _c.z); a.c.push(col.r, col.g, col.b); a.uv.push(0, 0) }
    a.i.push(a.k, a.k + 1, a.k + 2); a.k += 3
  }
  // physical collider box (local extents in F), registered in world coordinates
  solid(F, x0, x1, y0, y1, z0, z1, tag) {
    const [cx, cy, cz] = toWorld(F, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    this.cols.push({ x: cx, y: cy, z: cz, hx: Math.abs(x1 - x0) / 2, hy: Math.abs(y1 - y0) / 2, hz: Math.abs(z1 - z0) / 2, rot: F.rot, tag })
  }
  // invisible sloped walking surface from (zA, yA) to (zB, yB) across local x0..x1 (stairs, ramps, thresholds); the top face passes through both points
  ramp(F, x0, x1, zA, yA, zB, yB, th = 0.2, tag = 'ramp') {
    const dy = yB - yA, dz = zB - zA, L = Math.hypot(dy, dz), ang = Math.atan2(-dy, dz)
    const nx = 0, ny = Math.cos(ang), nz = Math.sin(ang)
    const mz = (zA + zB) / 2 - nz * th / 2, my = (yA + yB) / 2 - ny * th / 2
    const [cx, cy, cz] = toWorld(F, (x0 + x1) / 2, my, mz)
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), F.rot).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang))
    this.cols.push({ x: cx, y: cy, z: cz, hx: Math.abs(x1 - x0) / 2, hy: th / 2, hz: L / 2, q: [q.x, q.y, q.z, q.w], tag })
    void nx
  }
  get tris() { return Object.values(this.b).reduce((s, a) => s + a.tris, 0) }
}

// an axis-aligned world rectangle (for world-space ground work): frame at its centre with rot 0
export const rectFrame = (x0, x1, z0, z1, y = GY) => ({ F: frame((x0 + x1) / 2, (z0 + z1) / 2, 0, y), w: x1 - x0, d: z1 - z0 })

// --- facade modules -------------------------------------------------------------------------------------------------------------------------

// Row of wall with rectangular openings, built from real boxes so the reveals are real depth. Openings: [{x0,x1,sill,head}] (local x, heights above y0).
// Wall occupies local z in [-t, 0] (outer face at z=0).
export function rowWall(ch, F, xs0, xs1, y0, y1, ops, t, col, key, su = 1, sv = 1, opt = {}) {
  const o = [...ops].sort((a, b) => a.x0 - b.x0)
  let x = xs0
  const face = opt.faces || 'flulr'
  for (const op of o) {
    if (op.x0 > x + 1e-4) ch.box(F, x, op.x0, y0, y1, -t, 0, col, key, 'flr', su, sv)                                       // pier
    if (op.sill > 1e-4) ch.box(F, op.x0, op.x1, y0, y0 + op.sill, -t, 0, col, key, 'fu', su, sv)                              // under-sill panel
    if (op.head < y1 - y0 - 1e-4) ch.box(F, op.x0, op.x1, y0 + op.head, y1, -t, 0, col, key, 'fd', su, sv)                    // lintel panel
    x = op.x1
  }
  if (xs1 > x + 1e-4) ch.box(F, x, xs1, y0, y1, -t, 0, col, key, 'flr', su, sv)
  void face
}
