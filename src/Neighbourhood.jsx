// Directional exterior, everything behind and beside the penthouse. Authored in REAL metres around the CAM1 eye (same frame as Skyline.jsx, rendered in the
// same 1/6-scaled group): front (-z) = the Thames + Canary Wharf (Skyline.jsx); this file = the near-bank London neighbourhood (rear and both sides),
// the embankment and the tower the penthouse sits on.   V10 composition (replaces the V9 uniform 72 m grid):
//   * three street-grid SECTORS at different angles (west / east / centre) separated by boulevards, with cells of varying size and a few pocket greens
//   * Victorian terraces (individual houses, brick/stucco colour variation, bay windows, chimney stacks, slate roofs) back-to-back around long gardens
//   * mansion blocks, contemporary white-render apartment slabs with set-back top floors around landscaped courts, two churches, tree-lined roads
//   * a landscaped green square (lawn, paths, pond, tree clusters) directly behind the tower, a paved plaza at its foot
//   * level of detail by distance: full houses (<260 m) -> shared roofs (<600 m) -> single massed rows (far); simplified distance fades into haze
import { useMemo } from 'react'
import * as THREE from 'three'
import { EYE_ABOVE_WATER } from './skylineData.js'
import { shadeColor } from './exteriorShading.js'
import { patchLitWindows } from './Skyline.jsx'

const GROUND_Y = -EYE_ABOVE_WATER
const RIVER_NEAR = -150                         // near river edge (real z). Everything with z > RIVER_NEAR is the near bank.
const ROAD = 12
const rad = (d) => (d * Math.PI) / 180
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

function houseTexture() {
  const W = 256, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d'); const R = rng(4)
  g.fillStyle = '#d2cac2'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 1100; i++) { const v = 176 + Math.floor(R() * 56); g.fillStyle = `rgba(${v},${v - 8},${v - 14},0.38)`; g.fillRect(R() * W, R() * H, 4 + R() * 6, 2) }      // brick mottling
  g.fillStyle = 'rgba(70,52,44,0.16)'; for (let y = 3; y < H; y += 5) g.fillRect(0, y, W, 1)                                                             // brick courses
  for (let fl = 0; fl < 2; fl++) for (let bay = 0; bay < 4; bay++) {
    const x = bay * 64 + 18, y = fl * 64 + 12, lit = R() < 0.30
    g.fillStyle = '#f2eee6'; g.fillRect(x - 4, y - 4, 36, 4); g.fillRect(x - 3, y - 3, 34, 48)            // stone lintel + surround
    g.fillStyle = lit ? `rgb(255,${190 + Math.floor(R() * 40)},${110 + Math.floor(R() * 40)})` : '#454a64'; g.fillRect(x, y, 28, 40)   // sash window
    if (!lit) { g.fillStyle = 'rgba(255,190,150,0.28)'; g.fillRect(x, y, 28, 13) }
    g.fillStyle = 'rgba(244,240,232,0.85)'; g.fillRect(x + 13, y, 2, 40); g.fillRect(x, y + 19, 28, 2)   // white sash bars
    g.fillStyle = '#e8e2d8'; g.fillRect(x - 5, y + 42, 38, 4)                                             // sill
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t
}
function modernTexture() {
  const W = 256, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d'); const R = rng(9)
  g.fillStyle = '#e6dfd3'; g.fillRect(0, 0, W, H)
  for (let fl = 0; fl < 2; fl++) {
    const y = fl * 64
    for (let c = 0; c < 8; c++) {
      const x = c * 32, lit = R() < 0.36, timber = !lit && R() < 0.12
      if (timber) { g.fillStyle = '#9b7648'; g.fillRect(x + 1, y + 10, 30, 36); g.fillStyle = 'rgba(60,40,20,0.35)'; for (let k = 0; k < 7; k++) g.fillRect(x + 1, y + 12 + k * 5, 30, 1) }
      else {
        g.fillStyle = lit ? `rgb(255,${205 + Math.floor(R() * 30)},${130 + Math.floor(R() * 40)})` : '#4a587a'; g.fillRect(x + 2, y + 10, 28, 36)
        if (!lit) { g.fillStyle = 'rgba(255,196,170,0.34)'; g.fillRect(x + 2, y + 10, 28, 13) }
        g.fillStyle = '#33353f'; g.fillRect(x + 1, y + 9, 30, 2); g.fillRect(x + 1, y + 45, 30, 2)
      }
      g.fillStyle = '#33353f'; g.fillRect(x, y + 9, 2, 38)
    }
    g.fillStyle = '#f7f3ea'; g.fillRect(0, y + 50, W, 5); g.fillStyle = 'rgba(120,150,160,0.5)'; g.fillRect(0, y + 55, W, 7)     // balcony slab + glass balustrade
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t
}

// ---- geometry accumulator -----------------------------------------------------------------------------------------------------------
class Acc {
  constructor() { this.p = []; this.uv = []; this.c = []; this.i = []; this.n = 0 }
  quad(a, b, c, d, uvs, col) {      // a,b,c,d counter-clockwise seen from the outside
    for (const v of [a, b, c, d]) { this.p.push(v.x, v.y, v.z); this.c.push(col.r, col.g, col.b) }
    for (const u of uvs) this.uv.push(u[0], u[1])
    this.i.push(this.n, this.n + 1, this.n + 2, this.n, this.n + 2, this.n + 3); this.n += 4
  }
  tri(a, b, c, uvs, col) {
    for (const v of [a, b, c]) { this.p.push(v.x, v.y, v.z); this.c.push(col.r, col.g, col.b) }
    for (const u of uvs) this.uv.push(u[0], u[1])
    this.i.push(this.n, this.n + 1, this.n + 2); this.n += 3
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); return g
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z)

// a building: centre (cx,cz), length L along local x, depth D along local z, height h, rotation about Y, roof 'gable' | 'flat'
function addBuilding(wall, roof, cx, cz, L, D, h, rot, base, roofCol, kind, R, tile) {
  const cs = Math.cos(rot), sn = Math.sin(rot)
  const P = (lx, y, lz) => V(cx + lx * cs + lz * sn, GROUND_Y + y, cz - lx * sn + lz * cs)
  const N = (lx, lz) => V(lx * cs + lz * sn, 0, -lx * sn + lz * cs)
  const hl = L / 2, hd = D / 2
  const u = L / (tile.w), v = h / (tile.h), ud = D / tile.w
  const faces = [
    [P(-hl, 0, hd), P(hl, 0, hd), P(hl, h, hd), P(-hl, h, hd), N(0, 1), u],       // +z face
    [P(hl, 0, -hd), P(-hl, 0, -hd), P(-hl, h, -hd), P(hl, h, -hd), N(0, -1), u],  // -z face
    [P(hl, 0, hd), P(hl, 0, -hd), P(hl, h, -hd), P(hl, h, hd), N(1, 0), ud],      // +x end
    [P(-hl, 0, -hd), P(-hl, 0, hd), P(-hl, h, hd), P(-hl, h, -hd), N(-1, 0), ud], // -x end
  ]
  for (const [a, b, c, d, n, uu] of faces) {
    const flip = (R() * 4) | 0, off = R()
    wall.quad(a, b, c, d, [[off, 0], [off + uu, 0], [off + uu, v], [off, v]], shadeColor(base, n, 0.92 + R() * 0.16))
  }
  if (kind === 'plain') {
    roof.quad(P(-hl, h, hd), P(hl, h, hd), P(hl, h, -hd), P(-hl, h, -hd), [[0, 0], [1, 0], [1, 1], [0, 1]], shadeColor(roofCol, V(0, 1, 0), 0.8))
  } else if (kind === 'flat') {
    const top = shadeColor(roofCol, V(0, 1, 0), 0.8)
    roof.quad(P(-hl, h, hd), P(hl, h, hd), P(hl, h, -hd), P(-hl, h, -hd), [[0, 0], [1, 0], [1, 1], [0, 1]], top)
    // parapet band + a plant room
    const pc = shadeColor(base, V(0, 1, 0), 0.5)
    roof.quad(P(-hl * 0.3, h, hd * 0.3), P(hl * 0.3, h, hd * 0.3), P(hl * 0.3, h + 2.4, hd * 0.3), P(-hl * 0.3, h + 2.4, hd * 0.3), [[0, 0], [1, 0], [1, 1], [0, 1]], pc)
    roof.quad(P(-hl * 0.3, h + 2.4, hd * 0.3), P(hl * 0.3, h + 2.4, hd * 0.3), P(hl * 0.3, h + 2.4, -hd * 0.3), P(-hl * 0.3, h + 2.4, -hd * 0.3), [[0, 0], [1, 0], [1, 1], [0, 1]], top)
  } else {
    const rh = D * (0.22 + R() * 0.1), ov = 0.0
    const nF = V(0, hd, rh).normalize().applyAxisAngle(V(0, 1, 0), rot), nB = V(0, hd, -rh).normalize().applyAxisAngle(V(0, 1, 0), rot)
    const slateF = shadeColor(roofCol, nF, 0.95), slateB = shadeColor(roofCol, nB, 0.95)
    roof.quad(P(-hl, h, hd), P(hl, h, hd), P(hl, h + rh, 0), P(-hl, h + rh, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], slateF)
    roof.quad(P(hl, h, -hd), P(-hl, h, -hd), P(-hl, h + rh, 0), P(hl, h + rh, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], slateB)
    const gc = shadeColor(base, N(1, 0), 0.9)
    roof.tri(P(hl, h, hd), P(hl, h, -hd), P(hl, h + rh, 0), [[0, 0], [1, 0], [0.5, 1]], gc)
    roof.tri(P(-hl, h, -hd), P(-hl, h, hd), P(-hl, h + rh, 0), [[0, 0], [1, 0], [0.5, 1]], shadeColor(base, N(-1, 0), 0.9))
    for (let k = 0; k < 2; k++) {              // chimney stacks along the ridge
      const lx = (R() - 0.5) * (L - 6), cw = 1.1, ch = rh + 2.2
      const ccol = shadeColor(base, V(0, 0, 1), 0.85)
      for (const [a, b, c, d, n] of [
        [P(lx - cw, h, cw), P(lx + cw, h, cw), P(lx + cw, h + ch, cw), P(lx - cw, h + ch, cw), N(0, 1)],
        [P(lx + cw, h, -cw), P(lx - cw, h, -cw), P(lx - cw, h + ch, -cw), P(lx + cw, h + ch, -cw), N(0, -1)],
        [P(lx + cw, h, cw), P(lx + cw, h, -cw), P(lx + cw, h + ch, -cw), P(lx + cw, h + ch, cw), N(1, 0)],
        [P(lx - cw, h, -cw), P(lx - cw, h, cw), P(lx - cw, h + ch, cw), P(lx - cw, h + ch, -cw), N(-1, 0)],
      ]) roof.quad(a, b, c, d, [[0.1, 0.1], [0.14, 0.1], [0.14, 0.14], [0.1, 0.14]], shadeColor(base, n, 0.85))
    }
  }
}


const BRICKS = [[0.66, 0.40, 0.32], [0.58, 0.36, 0.30], [0.72, 0.60, 0.44], [0.64, 0.54, 0.44], [0.70, 0.46, 0.36], [0.52, 0.38, 0.34], [0.78, 0.70, 0.58]].map((a) => new THREE.Color(...a))
const STUCCO = [[0.84, 0.78, 0.66], [0.82, 0.68, 0.62], [0.74, 0.76, 0.70], [0.86, 0.84, 0.76]].map((a) => new THREE.Color(...a))
const SLATES = [[0.30, 0.31, 0.38], [0.36, 0.30, 0.30], [0.28, 0.28, 0.33]].map((a) => new THREE.Color(...a))
const RENDER = [[0.90, 0.86, 0.78], [0.80, 0.78, 0.76], [0.92, 0.90, 0.86], [0.70, 0.66, 0.62]].map((a) => new THREE.Color(...a))
const UP = V(0, 1, 0), UV0 = [[0, 0], [1, 0], [1, 1], [0, 1]]
const pick = (arr, R) => arr[(R() * arr.length) | 0]

// ---- terrace: a run of n individual houses (5.6 m wide), one long slate roof, chimney stacks on the party walls, ground-floor bays at close range
function addTerrace(wall, roof, cx, cz, n, rot, D, h, R, lod, tile) {
  const cs = Math.cos(rot), sn = Math.sin(rot), HW = 5.6, L = n * HW, hl = L / 2, hd = D / 2
  const P = (lx, y, lz) => V(cx + lx * cs + lz * sn, GROUND_Y + y, cz - lx * sn + lz * cs)
  const N = (lx, lz) => V(lx * cs + lz * sn, 0, -lx * sn + lz * cs)
  const rowBrick = pick(BRICKS, R), stuccoRow = R() < 0.18
  const slate = pick(SLATES, R), rh = D * 0.30
  const nF = N(0, 1), nB = N(0, -1), nE = N(1, 0), nW = N(-1, 0)
  const uw = HW / tile.w, vh = h / tile.h
  for (let i = 0; i < n; i++) {
    const x0 = -hl + i * HW, x1 = x0 + HW
    const base = (stuccoRow || R() < 0.1 ? pick(STUCCO, R) : rowBrick).clone().multiplyScalar(0.9 + R() * 0.2)
    const off = R() * 0.5
    wall.quad(P(x0, 0, hd), P(x1, 0, hd), P(x1, h, hd), P(x0, h, hd), [[off, 0], [off + uw, 0], [off + uw, vh], [off, vh]], shadeColor(base, nF, 0.96))
    if (lod < 2) wall.quad(P(x1, 0, -hd), P(x0, 0, -hd), P(x0, h, -hd), P(x1, h, -hd), [[off, 0], [off + uw, 0], [off + uw, vh], [off, vh]], shadeColor(base, nB, 0.9))
    if (lod === 0) {                                                                               // bay window: box proud of the front, ground floor
      const bx0 = x0 + 1.2, bx1 = x1 - 1.2, bd = 0.9, bh = 3.3, bc = shadeColor(base.clone().lerp(new THREE.Color(0.9, 0.87, 0.8), 0.45), nF, 0.95)
      wall.quad(P(bx0, 0, hd + bd), P(bx1, 0, hd + bd), P(bx1, bh, hd + bd), P(bx0, bh, hd + bd), [[0.02, 0.0], [0.24, 0.0], [0.24, 0.5], [0.02, 0.5]], bc)
      wall.quad(P(bx1, 0, hd + bd), P(bx1, 0, hd), P(bx1, bh, hd), P(bx1, bh, hd + bd), [[0.02, 0.0], [0.04, 0.0], [0.04, 0.5], [0.02, 0.5]], shadeColor(base, nE, 0.85))
      wall.quad(P(bx0, 0, hd), P(bx0, 0, hd + bd), P(bx0, bh, hd + bd), P(bx0, bh, hd), [[0.02, 0.0], [0.04, 0.0], [0.04, 0.5], [0.02, 0.5]], shadeColor(base, nW, 0.85))
      roof.quad(P(bx0, bh, hd + bd), P(bx1, bh, hd + bd), P(bx1, bh, hd), P(bx0, bh, hd), UV0, shadeColor(new THREE.Color(0.35, 0.34, 0.36), UP, 0.9))
    }
  }
  const ge = rowBrick.clone()
  const ew = D / tile.w
  wall.quad(P(hl, 0, hd), P(hl, 0, -hd), P(hl, h, -hd), P(hl, h, hd), [[0.1, 0], [0.1 + ew, 0], [0.1 + ew, vh], [0.1, vh]], shadeColor(ge, nE, 0.92))
  wall.quad(P(-hl, 0, -hd), P(-hl, 0, hd), P(-hl, h, hd), P(-hl, h, -hd), [[0.1, 0], [0.1 + ew, 0], [0.1 + ew, vh], [0.1, vh]], shadeColor(ge, nW, 0.92))
  const nRF = V(0, hd, rh).normalize().applyAxisAngle(V(0, 1, 0), rot), nRB = V(0, hd, -rh).normalize().applyAxisAngle(V(0, 1, 0), rot)
  roof.quad(P(-hl, h, hd), P(hl, h, hd), P(hl, h + rh, 0), P(-hl, h + rh, 0), UV0, shadeColor(slate, nRF, 0.98))
  roof.quad(P(hl, h, -hd), P(-hl, h, -hd), P(-hl, h + rh, 0), P(hl, h + rh, 0), UV0, shadeColor(slate, nRB, 0.98))
  roof.tri(P(hl, h, hd), P(hl, h, -hd), P(hl, h + rh, 0), [[0.1, 0.1], [0.14, 0.1], [0.12, 0.14]], shadeColor(rowBrick, nE, 0.9))
  roof.tri(P(-hl, h, -hd), P(-hl, h, hd), P(-hl, h + rh, 0), [[0.1, 0.1], [0.14, 0.1], [0.12, 0.14]], shadeColor(rowBrick, nW, 0.9))
  const step = lod === 0 ? 1 : 2                                                                    // chimney stacks on the party walls
  for (let i = 0; i <= n; i += step) {
    const lx = -hl + i * HW, cw = 0.55, ch = rh + (lod === 0 ? 2.0 : 1.6), z = 0.3
    for (const [a, b, c, d, nn] of [
      [P(lx - cw, h, z + 0.4), P(lx + cw, h, z + 0.4), P(lx + cw, h + ch, z + 0.4), P(lx - cw, h + ch, z + 0.4), nF],
      [P(lx + cw, h, z - 0.4), P(lx - cw, h, z - 0.4), P(lx - cw, h + ch, z - 0.4), P(lx + cw, h + ch, z - 0.4), nB],
      [P(lx + cw, h, z + 0.4), P(lx + cw, h, z - 0.4), P(lx + cw, h + ch, z - 0.4), P(lx + cw, h + ch, z + 0.4), nE],
      [P(lx - cw, h, z - 0.4), P(lx - cw, h, z + 0.4), P(lx - cw, h + ch, z + 0.4), P(lx - cw, h + ch, z - 0.4), nW],
    ]) roof.quad(a, b, c, d, [[0.1, 0.1], [0.14, 0.1], [0.14, 0.14], [0.1, 0.14]], shadeColor(rowBrick, nn, 0.85))
    roof.quad(P(lx - cw, h + ch, z - 0.4), P(lx - cw, h + ch, z + 0.4), P(lx + cw, h + ch, z + 0.4), P(lx + cw, h + ch, z - 0.4), UV0, shadeColor(new THREE.Color(0.2, 0.2, 0.22), UP, 0.8))
  }
}

// ---- church: nave with a steep gable roof, a square tower and a four-sided spire
function addChurch(wall, roof, cx, cz, rot, R, tile) {
  const stone = new THREE.Color(0.62, 0.55, 0.47), slate = SLATES[0]
  addBuilding(wall, roof, cx, cz, 30, 12, 13, rot, stone, slate, 'gable', R, tile)
  const cs = Math.cos(rot), sn = Math.sin(rot), tx = cx + 17 * cs, tz = cz - 17 * sn
  addBuilding(wall, roof, tx, tz, 7, 7, 26, rot, stone, slate, 'plain', R, tile)
  const P = (lx, y, lz) => V(tx + lx * cs + lz * sn, GROUND_Y + y, tz - lx * sn + lz * cs)
  const t = 3.5, ap = P(0, 26 + 15, 0)
  const corners = [P(-t, 26, t), P(t, 26, t), P(t, 26, -t), P(-t, 26, -t)]
  for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4], nn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(ap, a)).normalize(); roof.tri(a, b, ap, [[0.1, 0.1], [0.14, 0.1], [0.12, 0.14]], shadeColor(slate, nn, 1.0)) }
}

function buildNeighbourhood() {
  const wall = new Acc(), modern = new Acc(), roof = new Acc(), ground = new Acc()
  const trees = [], lamps = []
  const tileV = { w: 11.2, h: 6.4 }, tileM = { w: 19.2, h: 6.4 }
  const road = shadeColor(new THREE.Color(0.20, 0.19, 0.22), UP, 1)
  void road
  const plaza = { x0: -125, x1: 80, z0: -150, z1: 62 }
  const park = { cx: 0, cz: 185, w: 240, h: 180 }
  const carve = [{ x0: -134, x1: 90, z0: 0, z1: 134 }]   // the walkable street-level neighbourhood (src/street)
  const modernRects = [{ x0: 135, x1: 330, z0: 50, z1: 280 }, { x0: -330, x1: -135, z0: 50, z1: 280 }]
  const T = (cx, cz, rot) => { const cs = Math.cos(rot), sn = Math.sin(rot); return (lx, y, lz) => V(cx + lx * cs + lz * sn, GROUND_Y + y, cz - lx * sn + lz * cs) }
  const flat = (acc, cx, cz, rot, x0, x1, z0, z1, y, col) => { const P = T(cx, cz, rot); acc.quad(P(x0, y, z1), P(x1, y, z1), P(x1, y, z0), P(x0, y, z0), UV0, shadeColor(col, UP, 1)) }
  const addTree = (x, z, s, minD = 0) => { trees.push([x, z, s]) }

  // ---- plaza at the foot of the tower + riverside promenade
  flat(ground, 0, 0, 0, plaza.x0, plaza.x1, plaza.z0 + 30, plaza.z1, 0.12, new THREE.Color(0.62, 0.57, 0.56))
  flat(ground, 0, 0, 0, -2600, 2600, RIVER_NEAR + 2, RIVER_NEAR + 26, 0.14, new THREE.Color(0.58, 0.54, 0.54))
  for (let x = -1500; x < 1500; x += 14 + (x % 5)) { if (x > -140 && x < 95) continue; addTree(x, RIVER_NEAR + 14, 4.2 + ((x * 7) % 3)) }
  // ---- tower shaft the penthouse stands on
  addBuilding(wall, roof, -15, -42, 94, 92, -14.5 - GROUND_Y, 0, new THREE.Color(0.66, 0.60, 0.52), SLATES[0], 'plain', rng(2), { w: 22, h: 6.4 })

  // ---- green square behind the tower
  if (false) {
    const { cx, cz, w, h } = park, R = rng(41)
    flat(ground, cx, cz, 0, -w / 2 - 10, w / 2 + 10, -h / 2 - 10, h / 2 + 10, 0.1, new THREE.Color(0.56, 0.52, 0.52))                    // surrounding pavement / ring road kerb
    flat(ground, cx, cz, 0, -w / 2, w / 2, -h / 2, h / 2, 0.2, new THREE.Color(0.40, 0.52, 0.27))                                          // lawn
    for (const [a, b] of [[-1, 1], [1, 1]]) {                                                                                               // diagonal paths
      const ang = Math.atan2(h, w) * a * b, P = T(cx, cz, ang), len = Math.hypot(w, h)
      ground.quad(P(-len / 2, 0.3, 2.2), P(len / 2, 0.3, 2.2), P(len / 2, 0.3, -2.2), P(-len / 2, 0.3, -2.2), UV0, shadeColor(new THREE.Color(0.72, 0.64, 0.54), UP, 1))
    }
    flat(ground, cx, cz, 0, -w / 2, w / 2, -2.2, 2.2, 0.31, new THREE.Color(0.72, 0.64, 0.54)); flat(ground, cx, cz, 0, -2.2, 2.2, -h / 2, h / 2, 0.31, new THREE.Color(0.72, 0.64, 0.54))
    const pond = [], rr = 17; for (let i = 0; i < 24; i++) pond.push(V(cx + Math.cos((i / 24) * 6.2832) * rr, GROUND_Y + 0.4, cz + Math.sin((i / 24) * 6.2832) * rr))
    for (let i = 1; i < 23; i++) ground.tri(pond[0], pond[i + 1], pond[i], [[0, 0], [1, 0], [1, 1]], new THREE.Color(0.52, 0.50, 0.68))   // pond reflecting the sunset sky
    for (let i = 0; i < 70; i++) { const a = R() * 6.2832, d = 26 + R() * 78; const x = cx + Math.cos(a) * d * (w / 180), z = cz + Math.sin(a) * d * (h / 180) * 0.95; if (Math.abs(x - cx) < 4 || Math.abs(z - cz) < 4) continue; addTree(x, z, 5 + R() * 5) }
    for (let x = -w / 2 + 6; x < w / 2; x += 11) { addTree(cx + x, cz + h / 2 + 5, 5 + R() * 2); addTree(cx + x, cz - h / 2 - 5, 5 + R() * 2) }
    for (let z = -h / 2 + 6; z < h / 2; z += 11) { addTree(cx + w / 2 + 5, cz + z, 5 + R() * 2); addTree(cx - w / 2 - 5, cz + z, 5 + R() * 2) }
    // bandstand
    const P = T(cx + 40, cz - 30, 0); for (let i = 0; i < 8; i++) { const a0 = (i / 8) * 6.2832, a1 = ((i + 1) / 8) * 6.2832, r = 4.2
      const p0 = P(Math.cos(a0) * r, 0, Math.sin(a0) * r), p1 = P(Math.cos(a1) * r, 0, Math.sin(a1) * r), q0 = P(Math.cos(a0) * r, 3.4, Math.sin(a0) * r), q1 = P(Math.cos(a1) * r, 3.4, Math.sin(a1) * r)
      roof.quad(p1, p0, q0, q1, UV0, shadeColor(new THREE.Color(0.86, 0.84, 0.78), V(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)), 1)); roof.tri(q0, q1, P(0, 5.6, 0), [[0, 0], [1, 0], [0.5, 1]], shadeColor(new THREE.Color(0.36, 0.42, 0.40), UP, 1)) }
  }

  // ---- cells
  const SECTORS = [
    { x0: -1500, x1: -75, z0: -125, z1: 1500, rot: -0.12, seed: 3 },
    { x0: 40, x1: 1500, z0: -125, z1: 1500, rot: 0.10, seed: 5 },
    { x0: -420, x1: 420, z0: 62, z1: 1500, rot: 0.03, seed: 8 },
  ]
  const inRect = (x, z, r, mx = 0, mz = 0) => x > r.x0 - mx && x < r.x1 + mx && z > r.z0 - mz && z < r.z1 + mz
  let churches = 0
  for (const [si, sec] of SECTORS.entries()) {
    const R = rng(sec.seed * 1009), mx = (sec.x0 + sec.x1) / 2, mz = (sec.z0 + sec.z1) / 2, hx = (sec.x1 - sec.x0) / 2, hz = (sec.z1 - sec.z0) / 2
    const cs = Math.cos(sec.rot), sn = Math.sin(sec.rot)
    for (let v = -hz; v < hz;) {
      const ch = 54 + R() * 26
      for (let u = -hx; u < hx;) {
        const cw = 56 + R() * 26, lu = u + cw / 2, lv = v + ch / 2
        u += cw + ROAD
        const cx = mx + lu * cs + lv * sn, cz = mz - lu * sn + lv * cs
        if (cx < sec.x0 || cx > sec.x1 || cz < sec.z0 || cz > sec.z1) continue
        if (cz - ch / 2 < RIVER_NEAR + 28) continue                                        // keep every block (rotated cells overhang) behind the promenade, never over the water
        if (si < 2 && inRect(cx, cz, SECTORS[2], cw / 2, ch / 2)) continue                // centre sector owns the middle
        if (inRect(cx, cz, plaza, cw / 2, ch / 2)) continue
        if (carve.some((r) => inRect(cx, cz, r, cw / 2, ch / 2))) continue                // street-level neighbourhood owns this ground
        const dist = Math.hypot(cx, cz)
        if (dist > 1350) continue
        const lod = dist < 260 ? 0 : dist < 600 ? 1 : 2
        const rot = sec.rot
        const inModern = modernRects.some((r) => inRect(cx, cz, r))
        let kind = inModern ? 'modern' : null
        if (!kind) { const k = R(); kind = k < 0.64 ? 'victorian' : k < 0.78 ? 'mansion' : k < 0.87 ? 'modernMix' : k < 0.95 ? 'green' : 'victorian' }
        if (kind === 'modernMix') kind = dist < 900 ? 'modern' : 'mansion'
        if (!inModern && churches < 2 && dist > 230 && dist < 520 && si === (churches === 0 ? 1 : 0) && R() < 0.3) { kind = 'church'; churches++ }
        const P = T(cx, cz, rot)
        flat(ground, cx, cz, rot, -cw / 2, cw / 2, -ch / 2, ch / 2, 0.1, new THREE.Color(0.50, 0.46, 0.46))             // pavement under the block
        // tree-lined streets (both kerbs)
        if (lod < 2) {
          const sp = lod === 0 ? 11 : 15
          for (let t = -cw / 2 + 4; t < cw / 2; t += sp + R() * 4) { if (R() < 0.12) continue; const p1 = P(t, 0, ch / 2 + 2.3), p2 = P(t, 0, -ch / 2 - 2.3); trees.push([p1.x, p1.z, 3.6 + R() * 2.2]); trees.push([p2.x, p2.z, 3.6 + R() * 2.2]) }
          for (let t = -ch / 2 + 6; t < ch / 2; t += sp + R() * 4) { if (R() < 0.12) continue; const p1 = P(cw / 2 + 2.3, 0, t), p2 = P(-cw / 2 - 2.3, 0, t); trees.push([p1.x, p1.z, 3.6 + R() * 2.2]); trees.push([p2.x, p2.z, 3.6 + R() * 2.2]) }
        }
        if (dist < 900) for (const e of [-1, 1]) for (let k = 0; k < 3; k++) { const t = -cw / 2 + 8 + k * (cw / 3), p = P(t, 0, e * (ch / 2 + 5.2)); lamps.push([p.x, GROUND_Y + 6.5, p.z]) }
        if (kind === 'victorian') {
          const D = 10, n = Math.max(4, Math.floor((cw - 8) / 5.6)), h = 9.6 + R() * 2.4
          const garden = new THREE.Color(0.40, 0.50, 0.28)
          flat(ground, cx, cz, rot, -cw / 2 + 2, cw / 2 - 2, -(ch / 2 - D - 3), ch / 2 - D - 3, 0.2, garden)
          for (const side of [1, -1]) {
            const r2 = rot + (side < 0 ? Math.PI : 0), p = P(0, 0, side * (ch / 2 - D / 2 - 2.0))
            if (lod === 2) addBuilding(wall, roof, p.x, p.z, n * 5.6, D, h, r2, pick(BRICKS, R), SLATES[0], 'gable', R, tileV)
            else addTerrace(wall, roof, p.x, p.z, n, r2, D, h, R, lod, tileV)
          }
          if (lod === 0) for (let i = 0; i < 7; i++) { const p = P((R() - 0.5) * (cw - 14), 0, (R() - 0.5) * (ch - 2 * D - 14)); addTree(p.x, p.z, 3.5 + R() * 3.5) }
        } else if (kind === 'mansion') {
          const hh = 19 + R() * 8, base = pick(BRICKS, R), half = Math.min(cw, ch) / 2 - 6
          const sidesM = [[0, ch / 2 - 6.5, cw - 6, 0], [0, -ch / 2 + 6.5, cw - 6, Math.PI]], rotM = rot
          for (const [lx, lz, L, ex] of sidesM) { const p = P(lx, 0, lz); addBuilding(wall, roof, p.x, p.z, L, 13, hh * (0.9 + R() * 0.2), rotM + ex, base, SLATES[1], lod === 2 ? 'plain' : (R() < 0.5 ? 'flat' : 'gable'), R, tileV) }
          flat(ground, cx, cz, rot, -cw / 2 + 4, cw / 2 - 4, -ch / 2 + 13, ch / 2 - 13, 0.2, new THREE.Color(0.38, 0.50, 0.28))
          if (lod < 2) for (let i = 0; i < 5; i++) { const p = P((R() - 0.5) * (cw - 16), 0, (R() - 0.5) * (ch - 36)); addTree(p.x, p.z, 4 + R() * 3.5) }
          void half
        } else if (kind === 'modern') {
          const base = pick(RENDER, R), nb = 2 + ((R() * 2) | 0)
          flat(ground, cx, cz, rot, -cw / 2 + 2, cw / 2 - 2, -ch / 2 + 2, ch / 2 - 2, 0.2, new THREE.Color(0.40, 0.52, 0.30))                  // landscaped court
          for (let i = 0; i < nb; i++) {
            const L = 36 + R() * 18, hh = 17 + R() * 20, ang = rot + (i % 2 ? Math.PI / 2 : 0) + (R() - 0.5) * 0.12
            const lx = (i === 0 ? -1 : i === 1 ? 1 : 0) * (cw / 2 - 14) * (i % 2 ? 0.6 : 0.2), lz = (i - (nb - 1) / 2) * (ch / nb)
            const p = P(lx, 0, lz)
            addBuilding(modern, roof, p.x, p.z, L, 15, hh, ang, base, new THREE.Color(0.55, 0.55, 0.58), 'plain', R, tileM)
          }
          if (lod < 2) for (let i = 0; i < 8; i++) { const p = P((R() - 0.5) * (cw - 12), 0, (R() - 0.5) * (ch - 12)); addTree(p.x, p.z, 3.5 + R() * 3.5) }
        } else if (kind === 'green') {
          flat(ground, cx, cz, rot, -cw / 2 + 3, cw / 2 - 3, -ch / 2 + 3, ch / 2 - 3, 0.2, new THREE.Color(0.40, 0.52, 0.27))
          flat(ground, cx, cz, rot, -cw / 2 + 3, cw / 2 - 3, -1.6, 1.6, 0.3, new THREE.Color(0.72, 0.64, 0.54)); flat(ground, cx, cz, rot, -1.6, 1.6, -ch / 2 + 3, ch / 2 - 3, 0.3, new THREE.Color(0.72, 0.64, 0.54))
          if (lod < 2) for (let i = 0; i < 16; i++) { const p = P((R() - 0.5) * (cw - 10), 0, (R() - 0.5) * (ch - 10)); if (Math.abs(p.x - cx) < 3 && Math.abs(p.z - cz) < 3) continue; addTree(p.x, p.z, 4 + R() * 4) }
        } else if (kind === 'church') {
          flat(ground, cx, cz, rot, -cw / 2 + 2, cw / 2 - 2, -ch / 2 + 2, ch / 2 - 2, 0.2, new THREE.Color(0.40, 0.50, 0.28))
          addChurch(wall, roof, cx - 8 * Math.cos(rot), cz + 8 * Math.sin(rot), rot, R, tileV)
          for (let i = 0; i < 10; i++) { const p = P((R() - 0.5) * (cw - 8), 0, (R() - 0.5) * (ch - 8)); if (Math.abs(p.z - cz) < 12 && Math.abs(p.x - cx) < 26) continue; addTree(p.x, p.z, 4 + R() * 3) }
        }
      }
      v += ch + ROAD
    }
  }
  return { wall: wall.geometry(), modern: modern.geometry(), roof: roof.geometry(), ground: ground.geometry(), trees, lamps }
}

function dotTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32
  const g = cv.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(0.35, 'rgba(255,190,100,0.8)'); gr.addColorStop(1, 'rgba(255,150,60,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv)
}

function GroundAndEmbankment() {
  const tex = useMemo(() => dotTexture(), [])
  const lamps = useMemo(() => {   // promenade along the near river edge
    const p = []; for (let x = -2400; x <= 2400; x += 22) { if (x > -135 && x < 90) continue; p.push(x, GROUND_Y + 6, RIVER_NEAR + 10) }       // (the street-level terrace has its own lamp standards)
    return new THREE.Float32BufferAttribute(p, 3)
  }, [])
  const gLamps = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', lamps); return g }, [lamps])
  return (
    <>
      {/* street-level ground (dark asphalt/pavement) behind the embankment */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.3, RIVER_NEAR + 2300]}><planeGeometry args={[9000, 4600]} /><meshBasicMaterial color="#4f4a55" /></mesh>
      {/* embankment wall + promenade */}
      {/* (the stretch x -130..85 in front of the tower is rebuilt as the walkable Thames terrace in src/street) */}
      <mesh position={[-2315, GROUND_Y + 2, RIVER_NEAR + 2]}><boxGeometry args={[4370, 4, 8]} /><meshBasicMaterial color="#4a4350" /></mesh>
      <mesh position={[2292.5, GROUND_Y + 2, RIVER_NEAR + 2]}><boxGeometry args={[4415, 4, 8]} /><meshBasicMaterial color="#4a4350" /></mesh>
      <mesh position={[-2315, GROUND_Y + 4.3, RIVER_NEAR + 12]}><boxGeometry args={[4370, 0.6, 16]} /><meshBasicMaterial color="#5a5260" /></mesh>
      <mesh position={[2292.5, GROUND_Y + 4.3, RIVER_NEAR + 12]}><boxGeometry args={[4415, 0.6, 16]} /><meshBasicMaterial color="#5a5260" /></mesh>
      <points geometry={gLamps}><pointsMaterial size={4} sizeAttenuation={false} map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    </>
  )
}


export function Neighbourhood() {
  const built = useMemo(buildNeighbourhood, [])
  const tex = useMemo(houseTexture, [])
  const mtex = useMemo(modernTexture, [])
  const dot = useMemo(dotTexture, [])
  const matWall = useMemo(() => patchLitWindows(new THREE.MeshBasicMaterial({ map: tex, vertexColors: true }), [4, 2]), [tex])
  const matMod = useMemo(() => patchLitWindows(new THREE.MeshBasicMaterial({ map: mtex, vertexColors: true }), [8, 2]), [mtex])
  const treeMesh = useMemo(() => {
    const tg = new THREE.IcosahedronGeometry(1, 1), tp = tg.attributes.position, tc = new Float32Array(tp.count * 3)
    for (let i = 0; i < tp.count; i++) { const k = 0.55 + 0.45 * (tp.getY(i) * 0.5 + 0.5) + 0.12 * tp.getX(i); tc[i * 3] = k * 1.04; tc[i * 3 + 1] = k; tc[i * 3 + 2] = k * 0.92 }
    tg.setAttribute('color', new THREE.BufferAttribute(tc, 3))
    const m = new THREE.InstancedMesh(tg, new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true }), built.trees.length)
    const o = new THREE.Object3D(), c = new THREE.Color(), R = rng(8)
    const pal = ['#4d5c36', '#5a6532', '#6c6130', '#3f5036', '#7a5d30', '#566a38', '#625c2e']
    built.trees.forEach(([x, z, s], i) => {
      o.position.set(x, GROUND_Y + s * 1.25, z); o.scale.set(s * 0.8, s * 0.95, s * 0.8); o.rotation.y = R() * 6; o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(pal[(R() * pal.length) | 0]).multiplyScalar(0.78 + R() * 0.4))
    })
    m.frustumCulled = false; return m
  }, [built])
  const lampGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(built.lamps.flat(), 3)); return g }, [built])
  return (
    <>
      <GroundAndEmbankment />
      <mesh geometry={built.ground} frustumCulled={false}><meshBasicMaterial vertexColors /></mesh>
      <mesh geometry={built.wall} frustumCulled={false} material={matWall} />
      <mesh geometry={built.modern} frustumCulled={false} material={matMod} />
      <mesh geometry={built.roof} frustumCulled={false}><meshBasicMaterial vertexColors side={THREE.DoubleSide} /></mesh>
      <primitive object={treeMesh} />
      <points geometry={lampGeo} frustumCulled={false}><pointsMaterial size={3} sizeAttenuation={false} map={dot} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    </>
  )
}

// distant rear city (north of the penthouse): mid/high-rise clusters at the rear horizon so the back view is "established London", not empty
export function rearLayout() {
  const R = rng(99), out = []
  for (let i = 0; i < 70; i++) {
    const azDeg = 110 + R() * 140, D = 1700 + R() * 2200, a = rad(azDeg)
    const h = R() > 0.85 ? 90 + R() * 90 : 30 + R() * 55, w = 24 + R() * 40
    out.push({ name: 'rear' + i, style: R() > 0.5 ? 'stone' : 'glass', hero: false, x: D * Math.sin(a), z: -D * Math.cos(a), w, d: w * (0.7 + R() * 0.6), h: h + 80, rot: a + (R() - 0.5) * 0.6, shade: R() })
  }
  return out
}
