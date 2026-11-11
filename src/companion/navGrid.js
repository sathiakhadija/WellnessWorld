// Navigation grid for the companion. Static blockers are probed from the physics world once; doors are "gates" that open/close live.
// Pure data + A*: no React, no three, so it can be unit-tested and reused by any future companion.
export class NavGrid {
  constructor({ x0 = -10.4, x1 = 6.4, z0 = -14.6, z1 = 0.6, cell = 0.1 } = {}) {
    this.x0 = x0; this.z0 = z0; this.cell = cell
    this.nx = Math.ceil((x1 - x0) / cell); this.nz = Math.ceil((z1 - z0) / cell)
    this.blocked = new Uint8Array(this.nx * this.nz)
    this.gate = new Int8Array(this.nx * this.nz).fill(-1)
    this.gates = []
    this.margin = new Uint8Array(this.nx * this.nz)      // soft clearance cost near blockers (keeps paths off walls/rails)
  }
  ix(x) { return Math.floor((x - this.x0) / this.cell) }
  iz(z) { return Math.floor((z - this.z0) / this.cell) }
  cx(i) { return this.x0 + (i + 0.5) * this.cell }
  cz(j) { return this.z0 + (j + 0.5) * this.cell }
  idx(i, j) { return j * this.nx + i }
  inside(i, j) { return i >= 0 && j >= 0 && i < this.nx && j < this.nz }
  /** probe(x, z) -> true when the cell centre is NOT standable (wall, furniture, rail margin, no floor). */
  build(probe) {
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) this.blocked[this.idx(i, j)] = probe(this.cx(i), this.cz(j)) ? 1 : 0
    this.computeMargin()
  }
  computeMargin() {
    const r = 2
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      let m = 0
      if (!this.blocked[this.idx(i, j)]) {
        for (let b = -r; b <= r && !m; b++) for (let a = -r; a <= r; a++) { if (this.inside(i + a, j + b) && this.blocked[this.idx(i + a, j + b)]) { m = 1; break } }
      }
      this.margin[this.idx(i, j)] = m
    }
  }
  /** gates: [{ id, rect:[x0,x1,z0,z1], isOpen: () => bool, always?: 'blocked' }]. Gate cells are free in the static grid and live-gated here. */
  setGates(gates) {
    this.gates = gates
    this.gate.fill(-1)
    gates.forEach((g, gi) => {
      const [a, b, c, d] = g.rect
      for (let j = this.iz(c); j <= this.iz(d); j++) for (let i = this.ix(a); i <= this.ix(b); i++) if (this.inside(i, j)) { this.gate.set([gi], this.idx(i, j)); this.blocked[this.idx(i, j)] = g.always === 'blocked' ? 1 : 0 }
    })
    this.state = gates.map(() => false)
  }
  refreshGates() { this.state = this.gates.map((g) => (g.always === 'blocked' ? false : !!g.isOpen())) }
  free(i, j) {
    if (!this.inside(i, j)) return false
    const k = this.idx(i, j)
    if (this.blocked[k]) return false
    const g = this.gate[k]
    return g < 0 || this.state[g]
  }
  freeAt(x, z) { return this.free(this.ix(x), this.iz(z)) }
  nearestFree(x, z, maxR = 12) {
    const i0 = this.ix(x), j0 = this.iz(z)
    if (this.free(i0, j0)) return [i0, j0]
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = 1e9
      for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
        if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue
        if (this.free(i0 + a, j0 + b)) { const d = a * a + b * b; if (d < bd) { bd = d; best = [i0 + a, j0 + b] } }
      }
      if (best) return best
    }
    return null
  }
  /** line of sight across free cells (supercover-ish sampling at half-cell steps). */
  los(ax, az, bx, bz, soft = false) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / (this.cell * 0.5)))
    for (let s = 0; s <= n; s++) {
      const t = s / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t
      const i = this.ix(x), j = this.iz(z)
      if (!this.free(i, j)) return false
      if (soft && this.margin[this.idx(i, j)] && s > 0 && s < n) return false
    }
    return true
  }
  /** Reachable set from a start cell (flood fill respecting live gates). Returns Uint8Array(1 = reachable). */
  flood(sx, sz) {
    const seen = new Uint8Array(this.nx * this.nz)
    const s = this.nearestFree(sx, sz, 4); if (!s) return seen
    const q = [this.idx(s[0], s[1])]; seen[q[0]] = 1
    for (let h = 0; h < q.length; h++) {
      const k = q[h], i = k % this.nx, j = (k / this.nx) | 0
      for (const [a, b] of N8) { const ni = i + a, nj = j + b; if (this.free(ni, nj) && !seen[this.idx(ni, nj)]) { if (a && b && !(this.free(i + a, j) && this.free(i, j + b))) continue; seen[this.idx(ni, nj)] = 1; q.push(this.idx(ni, nj)) } }
    }
    return seen
  }
  /** Closest reachable cell to a world point (used when the wanted spot is behind a closed door). */
  closestReachable(seen, tx, tz) {
    let best = -1, bd = 1e9
    for (let k = 0; k < seen.length; k++) if (seen[k]) {
      const i = k % this.nx, j = (k / this.nx) | 0, dx = this.cx(i) - tx, dz = this.cz(j) - tz, d = dx * dx + dz * dz
      if (d < bd) { bd = d; best = k }
    }
    return best < 0 ? null : [best % this.nx, (best / this.nx) | 0]
  }
  /** A* from world a to world b; returns smoothed waypoints [{x,z}] (excluding the start) or null. */
  path(ax, az, bx, bz) {
    const s = this.nearestFree(ax, az, 4), t = this.nearestFree(bx, bz, 8)
    if (!s || !t) return null
    const W = this.nx, size = this.nx * this.nz
    const g = new Float32Array(size).fill(1e9), came = new Int32Array(size).fill(-1), closed = new Uint8Array(size)
    const heap = new MinHeap()
    const sk = this.idx(s[0], s[1]), tk = this.idx(t[0], t[1])
    g[sk] = 0; heap.push(sk, 0)
    const hfun = (i, j) => Math.hypot(i - t[0], j - t[1])
    while (heap.size) {
      const k = heap.pop()
      if (closed[k]) continue
      closed[k] = 1
      if (k === tk) break
      const i = k % W, j = (k / W) | 0
      for (const [a, b] of N8) {
        const ni = i + a, nj = j + b
        if (!this.free(ni, nj)) continue
        if (a && b && !(this.free(i + a, j) && this.free(i, j + b))) continue
        const nk = this.idx(ni, nj)
        const ng = g[k] + (a && b ? 1.414 : 1) + (this.margin[nk] ? 1.6 : 0)
        if (ng < g[nk]) { g[nk] = ng; came[nk] = k; heap.push(nk, ng + hfun(ni, nj)) }
      }
    }
    if (g[tk] >= 1e9) return null
    const cells = []
    for (let k = tk; k !== -1; k = came[k]) cells.push(k)
    cells.reverse()
    let pts = cells.map((k) => ({ x: this.cx(k % W), z: this.cz((k / W) | 0) }))
    // string-pull with soft clearance first, then plain LOS
    const out = []; let a = 0
    while (a < pts.length - 1) {
      let b = pts.length - 1
      while (b > a + 1 && !this.los(pts[a].x, pts[a].z, pts[b].x, pts[b].z, true)) b--
      out.push(pts[b]); a = b
    }
    return out
  }
}
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
class MinHeap {
  constructor() { this.k = []; this.p = []; this.size = 0 }
  push(key, pr) { let i = this.size++; this.k[i] = key; this.p[i] = pr; while (i > 0) { const u = (i - 1) >> 1; if (this.p[u] <= this.p[i]) break; this.sw(i, u); i = u } }
  pop() { const r = this.k[0]; this.size--; if (this.size > 0) { this.k[0] = this.k[this.size]; this.p[0] = this.p[this.size]; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < this.size && this.p[l] < this.p[m]) m = l; if (rr < this.size && this.p[rr] < this.p[m]) m = rr; if (m === i) break; this.sw(i, m); i = m } } return r }
  sw(a, b) { [this.k[a], this.k[b]] = [this.k[b], this.k[a]];[this.p[a], this.p[b]] = [this.p[b], this.p[a]] }
}
