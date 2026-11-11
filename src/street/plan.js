// Neighbourhood masterplan: places every district on the existing world coordinate system (street level GROUND_Y, river toward -z, the tower footprint
// x -62..32 / z -88..4, penthouse entrance axis x = 1.2). Pure data + geometry; no React. Street.jsx turns the result into meshes and colliders.
//
//   z +300  ┌───────────────────────── Romantic lane (west) ─┐
//           │   Neighbourhood Square (fountain)               │
//   z +210  ├──────── Grand Boulevard: Elegant (W) | Modern (E)┤
//   z + 47  ├──────── plaza gate ─────────────────────────────┤
//   z +  4  │  Forecourt + lobby pavilion (lift) ... tower base│   <- penthouse entrance, 87 m above
//           │  West walk | TOWER | East walk                   │
//   z -124  ├──────── Riverside piazza → ramps / stair ───────┤
//   z -146  └──────── Thames terrace (balustrade, skyline) ───┘
import * as THREE from 'three'
import { Chunk, frame, rng, C, GY, GROUND_Y, TERRACE_Y, rowWall } from './geo.js'
import { PAL, strip, pane, railing } from './facade.js'
import { townhouse, modernBlock, shopBuilding } from './buildings.js'

export const BX = 1.2                                   // penthouse entrance axis
export const TERR_H = TERRACE_Y - GY                    // terrace height above street level (≈4.4)
export const BOUNDS = { x0: -148, x1: 148, z0: -148, z1: 300 }
const col = (h) => new THREE.Color(h)
const G = { road: '#6b6a6d', slab: '#dbd2c2', sett: '#bdb0a0', grass: '#8aa356', gravel: '#d3c8b3', paint: '#ece6d8', dark: '#9b8f84' }

export const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function fit(total, lo, hi, R) { const n = Math.max(1, Math.round(total / ((lo + hi) / 2))); const w = []; let s = 0; for (let i = 0; i < n; i++) { w.push(lo + R() * (hi - lo)); s += w[i] } return w.map((x) => x * total / s) }
const pickR = (R, a) => a[Math.floor(R() * a.length) % a.length]

export function buildStreet() {
  const chunks = {}, mk = (n) => chunks[n] || (chunks[n] = new Chunk(n, rng(hash(n))))
  const inst = { plane: [], ornamental: [], clipped: [], lamp: [], bench: [], bollard: [], pathLight: [], table: [], chair: [], urn: [] }
  const put = (k, x, z, ry = 0, s = 1, y = GY) => inst[k].push([x, y, z, ry, s])
  const pools = [], halos = [], waters = [], jets = [], lightsAt = []
  const pois = {}
  const R = rng(2026)
  const W0 = frame(0, 0, 0, GY)

  // ---------- small helpers
  const surf = (ch, key, x0, x1, z0, z1, c, su, sv, layer = 1, y = GY) => ch.flat(frame(0, 0, 0, y + layer * 0.012), x0, x1, z0, z1, 0, col(c), layer >= 2 && key !== 'paint' && key !== 'grass' ? key + '2' : key, su, sv)
  const wall = (ch, x0, x1, z0, z1, h = 1.1, o = {}) => {
    ch.box(W0, x0, x1, 0, h, z0, z1, col(o.col || PAL.limestone), o.key || 'ashlar', 'fulrb', o.key === 'brick' ? 0.9 : 2.4, o.key === 'brick' ? 1 : 1.2)
    if (!o.nocap) ch.box(W0, x0 - 0.05, x1 + 0.05, h, h + 0.1, z0 - 0.05, z1 + 0.05, col('#e6decd'), 'trim', 'fulrb')
    if (!o.nosolid) ch.solid(W0, x0, x1, 0, h + 0.1, z0, z1, 'wall')
  }
  const hedge = (ch, x0, x1, z0, z1, h = 1.1, c = '#4f6038') => {
    ch.box(W0, x0, x1, 0, h, z0, z1, col(c), 'leaf', 'fulrb', 1, 1, 0.1)
    ch.box(W0, x0 + 0.05, x1 - 0.05, h, h + 0.12, z0 + 0.05, z1 - 0.05, col(c).multiplyScalar(1.12), 'leaf', 'u', 1, 1, 0.1)
    ch.solid(W0, x0, x1, 0, h + 0.1, z0, z1, 'hedge')
  }
  const lamp = (x, z, ry = 0) => { put('lamp', x, z, ry); pools.push([x, z, 7.5]); halos.push([x, GY + 4.9, z]) }
  const tree = (kind, x, z, s = 1, ry) => put(kind, x, z, ry ?? R() * 6.28, s)
  const grate = (ch, x, z, s = 1.3) => { ch.flat(frame(x, z, 0, GY + 0.03), -s / 2, s / 2, -s / 2, s / 2, 0, col('#5d5750'), 'sett', 1.6, 1.6); }
  const bench = (x, z, ry) => { put('bench', x, z, ry); const F = frame(x, z, ry, GY); mk('furniture').solid(F, -0.9, 0.9, 0, 0.5, -0.25, 0.25, 'bench') }

  // =====================================================================================================================================
  // 1. TOWER PODIUM: dresses the 7.5 m base of the existing tower on all four sides with real stone piers, deep-set glazing and a cornice
  // =====================================================================================================================================
  const podium = (F, len, h = 7.6, name = 'podium') => {
    const ch = mk(name), t = 0.9, n = Math.max(2, Math.round(len / 6.2)), bay = len / n, stone = col(PAL.limestone)
    ch.box(F, -len / 2, len / 2, 0, 0.7, -t, 0.25, col('#c3b8a3'), 'ashlar', 'fulr', 2.4, 1.2)                                            // plinth course
    const ops = []
    for (let i = 0; i < n; i++) { const cx = -len / 2 + (i + 0.5) * bay; ops.push({ x0: cx - bay / 2 + 1.0, x1: cx + bay / 2 - 1.0, sill: 0.7, head: h - 1.5 }) }
    rowWall(ch, F, -len / 2, len / 2, 0.7, h, ops.map((o) => ({ ...o, sill: o.sill - 0.7, head: o.head - 0.7 })), t, stone, 'ashlar', 2.4, 1.2)
    ops.forEach((o) => {
      const lit = R() < 0.5; pane(ch, F, o.x0, o.x1, o.sill, o.head, -t + 0.12, lit)
      const nm = Math.max(1, Math.round((o.x1 - o.x0) / 1.4)); for (let i = 1; i < nm; i++) { const x = o.x0 + (i / nm) * (o.x1 - o.x0); strip(ch, F, 'metal+', col(PAL.charcoal), x - 0.03, x + 0.03, o.sill, o.head, -t + 0.14) }
      strip(ch, F, 'metal+', col(PAL.charcoal), o.x0, o.x1, o.sill + (o.head - o.sill) * 0.62, o.sill + (o.head - o.sill) * 0.62 + 0.05, -t + 0.14)
      ch.box(F, o.x0 - 0.1, o.x1 + 0.1, o.sill - 0.12, o.sill, -0.05, 0.12, stone, 'trim+', 'fu')
    })
    ch.box(F, -len / 2 - 0.1, len / 2 + 0.1, h, h + 0.22, -t, 0.35, stone, 'trim', 'fulrd'); ch.box(F, -len / 2 - 0.15, len / 2 + 0.15, h + 0.22, h + 0.4, -t, 0.5, stone, 'trim', 'fulrd')
    ch.solid(F, -len / 2, len / 2, 0, h + 6, -t, 0.25, 'podium')
  }
  podium(frame((-62 + BX - 5.5) / 2, 4, 0), (BX - 5.5) - (-62))                                                                                    // south face, west of the lobby
  podium(frame((BX + 5.5 + 32) / 2, 4, 0), 32 - (BX + 5.5))                                                                                        // south face, east of the lobby
  podium(frame(32, -42, Math.PI / 2), 92); podium(frame(-62, -42, -Math.PI / 2), 92); podium(frame(-15, -88, Math.PI), 94)                           // east, west, river faces

  // =====================================================================================================================================
  // 2. LOBBY PAVILION + LIFT (the vertical connection to the penthouse)
  // =====================================================================================================================================
  {
    const ch = mk('pavilion'), FP = frame(BX, 4, 0), stone = col('#e1d7c2'), trav = col('#d9ccb2'), bronze = col('#8b6f47')
    const hw = 5.2, depth = 9, H = 4.8
    // floor
    ch.box(FP, -hw, hw, -0.01, 0.04, 0.9, depth, col('#e6dcc8'), 'slab', 'u', 1.8, 1.2)
    ch.box(FP, -hw + 0.4, hw - 0.4, 0.04, 0.045, 1.2, depth - 0.4, col('#c9bca4'), 'slab', 'u', 1.8, 1.2, 0)
    // back (lift) wall: stone cladding with a recessed opening for the lift
    const FB = frame(BX, 4.9, 0)
    rowWall(ch, FB, -hw, hw, 0, H, [{ x0: -0.95, x1: 0.95, sill: 0, head: 2.6 }], 0.9, trav, 'ashlar', 2.4, 1.2)
    ch.box(FB, -0.95, 0.95, 0, 0.01, -0.9, 0, col('#cdbf9f'), 'trim', 'u')
    ch.acc('glow').quad(...[[-0.9, 0.04, -0.82], [0.9, 0.04, -0.82], [0.9, 2.55, -0.82], [-0.9, 2.55, -0.82]].map(([x, y, z]) => [FB.x + x, FB.y + y, FB.z + z]), col('#ffdca8'), [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]])
    for (const s of [-1, 1]) ch.box(FB, s * 1.0 - 0.05, s * 1.0 + 0.05, 0, 2.7, -0.1, 0.06, col(PAL.brass), 'metal+', 'fulr')
    ch.box(FB, -1.05, 1.05, 2.6, 2.72, -0.1, 0.06, col(PAL.brass), 'metal+', 'fulr')
    ch.box(FB, -0.12, 0.12, 2.9, 3.0, 0.0, 0.05, col('#ffd9a0'), 'glow', 'f', 1, 1, 0)                                                                 // floor indicator
    pois.lift = { x: BX, z: 4.9, doorZ: 4.9 - 0.12, w: 0.9, h: 2.5, y: GY }
    // side glass walls (local x runs toward world -z on the +x side, toward +z on the -x side, so the interval flips)
    for (const s of [-1, 1]) {
      const FS = frame(BX + s * hw, 4, s * Math.PI / 2), nz = 6, lo = s > 0 ? -depth : 0.9, hi = s > 0 ? -0.9 : depth
      ch.box(FS, lo, hi, 0, 0.2, -0.3, 0.1, stone, 'ashlar', 'fu', 2.4, 1.2); ch.box(FS, lo, hi, 4.2, H, -0.3, 0.1, stone, 'ashlar', 'fud', 2.4, 1.2)
      for (let i = 0; i < nz; i++) { const a = lo + (i / nz) * (hi - lo), b = lo + ((i + 1) / nz) * (hi - lo); pane(ch, FS, a + 0.04, b - 0.04, 0.2, 4.2, 0, R() < 0.75); strip(ch, FS, 'metal+', col(PAL.charcoal), b - 0.04, b + 0.04, 0.2, 4.2, 0.03) }
      ch.solid(FS, lo, hi, 0, H, -0.2, 0.1, 'pavilion')
    }
    // front: beam + flanking glass, open central bay
    const FF = frame(BX, 4 + depth, 0)
    ch.box(FF, -hw - 0.3, hw + 0.3, 4.1, H, -0.3, 0.3, stone, 'ashlar', 'fulrbd', 2.4, 1.2)
    for (const s of [-1, 1]) { const a = s * 2.75, b = s * (hw - 0.05); for (let k = 0; k < 3; k++) { const x0 = a + (b - a) * k / 3, x1 = a + (b - a) * (k + 1) / 3; pane(ch, FF, Math.min(x0, x1) + 0.03, Math.max(x0, x1) - 0.03, 0.2, 4.1, 0, k !== 1); strip(ch, FF, 'metal+', col(PAL.charcoal), Math.min(x0, x1) - 0.03, Math.min(x0, x1) + 0.03, 0.2, 4.1, 0.02) }; ch.solid(FF, s * 2.7 - 0.05, s * hw, 0, H, -0.15, 0.15, 'pavilion'); ch.box(FF, s * 2.6 - 0.1, s * 2.6 + 0.1, 0, 4.1, -0.1, 0.1, stone, 'ashlar', 'fulrb') }
    // canopy slab with soffit lights, columns, fascia sign
    ch.box(FP, -hw - 1.3, hw + 1.3, H, H + 0.5, -0.0, depth + 3.0, stone, 'ashlar', 'fulrbd', 2.4, 1.2)
    for (const x of [-4.2, 0, 4.2]) for (const z of [11.2, 7.2, 3.2]) ch.box(FP, x - 0.9, x + 0.9, H - 0.02, H, z - 0.12, z + 0.12, col('#ffdcae'), 'glow', 'd', 1, 1, 0)
    for (const x of [-hw - 0.6, -2.7, 2.7, hw + 0.6]) { ch.box(FP, x - 0.22, x + 0.22, 0, H, depth + 2.2, depth + 2.62, stone, 'ashlar', 'fulrb', 2.4, 1.2); ch.solid(FP, x - 0.22, x + 0.22, 0, H, depth + 2.2, depth + 2.62, 'column') }
    ch.acc('sign').quad([FP.x - 3.4, GY + H + 0.06, FP.z + depth + 3.01], [FP.x + 3.4, GY + H + 0.06, FP.z + depth + 3.01], [FP.x + 3.4, GY + H + 0.5 - 0.06, FP.z + depth + 3.01], [FP.x - 3.4, GY + H + 0.5 - 0.06, FP.z + depth + 3.01], col('#ffffff'), [0, 0, 1], signQ(8), 1)
    ch.solid(FP, -hw - 1.3, hw + 1.3, H - 0.1, H + 0.6, 0, depth + 3.0, 'canopy')
    ch.solid(FP, -hw, hw, 0, H, 0, 0.95, 'liftwall')
    // furniture inside: two stone benches + urns beside the lift
    for (const s of [-1, 1]) { ch.box(FP, s * 3.4 - 1.1, s * 3.4 + 1.1, 0.04, 0.5, 5.6, 6.2, col('#cdbf9f'), 'ashlar', 'fulrbd', 2.4, 1.2); ch.solid(FP, s * 3.4 - 1.1, s * 3.4 + 1.1, 0, 0.5, 5.6, 6.2, 'bench'); put('urn', BX + s * 2.0, 4 + 1.6, 0, 1.0) }
    lightsAt.push({ x: BX, y: GY + 3.6, z: 4 + 5.5, color: '#ffcf94', intensity: 7, distance: 17 })
    halos.push([BX, GY + 4.1, 4 + 3], [BX, GY + 4.1, 4 + 7.5])
    pois.pavilion = { x: BX, z: 4 + depth + 3 }
    // steps up to the canopy line? flush: the court is level with the lobby floor
  }

  // =====================================================================================================================================
  // 3. PLAZA / FORECOURT / WALKS (ground, lawns, paths, hedges, planting)
  // =====================================================================================================================================
  {
    const g = mk('ground'), P = { x0: -125, x1: 80, z0: -132, z1: 47.2 }
    surf(g, 'grass', P.x0, P.x1, 4, P.z1, G.grass, 4, 4, 0)                                                         // south lawns (forecourt + wings)
    surf(g, 'grass', 36, P.x1, -124, 4, G.grass, 4, 4, 0); surf(g, 'grass', P.x0, -62, -124, 4, G.grass, 4, 4, 0)    // east + west walks
    surf(g, 'slab', P.x0, P.x1, -132, -88, G.slab, 1.8, 1.2, 0)                                                      // riverside piazza
        // forecourt axis: limestone setts with a shallow reflecting pool
    surf(g, 'slab', BX - 4.2, BX + 4.2, 13, 47.2, G.slab, 1.8, 1.2, 1)
    surf(g, 'sett', BX - 4.2, BX + 4.2, 40, 47.2, G.sett, 1.6, 1.6, 2)
    surf(g, 'slab', BX - 11, BX + 11, 13, 17.5, G.slab, 1.8, 1.2, 1)                                                  // forecourt apron in front of the pavilion
    surf(g, 'gravel', P.x0, P.x1, 38, 41, G.gravel, 2, 2, 1)                                                          // cross path
    surf(g, 'slab', 56, 64, -124, 41, G.slab, 1.8, 1.2, 1); surf(g, 'slab', -96, -88, -124, 41, G.slab, 1.8, 1.2, 1)  // walk paths
    surf(g, 'slab', 28, 56, 20, 23.5, G.slab, 1.8, 1.2, 1); surf(g, 'slab', -88, -34, 20, 23.5, G.slab, 1.8, 1.2, 1)  // connectors from the forecourt to the walks
    surf(g, 'slab', BX + 4.2, 34, 20, 23.5, G.slab, 1.8, 1.2, 1); surf(g, 'slab', -34, BX - 4.2, 20, 23.5, G.slab, 1.8, 1.2, 1)
    surf(g, 'gravel', 32.5, 36, -88, 4, G.gravel, 2, 2, 1); surf(g, 'gravel', -66, -62.5, -88, 4, G.gravel, 2, 2, 1)
    // reflecting pool on the axis (edge is a kerb the player cannot step into)
    const pool = { x0: BX - 1.4, x1: BX + 1.4, z0: 21, z1: 35 }
    wall(g, pool.x0 - 0.35, pool.x0, pool.z0 - 0.35, pool.z1 + 0.35, 0.42, { col: '#d8cdb5' }); wall(g, pool.x1, pool.x1 + 0.35, pool.z0 - 0.35, pool.z1 + 0.35, 0.42, { col: '#d8cdb5' })
    wall(g, pool.x0, pool.x1, pool.z0 - 0.35, pool.z0, 0.42, { col: '#d8cdb5' }); wall(g, pool.x0, pool.x1, pool.z1, pool.z1 + 0.35, 0.42, { col: '#d8cdb5' })
    g.flat(frame(0, 0, 0, GY + 0.3), pool.x0, pool.x1, pool.z0, pool.z1, 0, col('#2e2a36'), 'trim', 1, 1)
    waters.push({ x: BX, z: (pool.z0 + pool.z1) / 2, w: pool.x1 - pool.x0, d: pool.z1 - pool.z0, y: GY + 0.32, kind: 'pool' })
    // lawn edging hedges flanking the axis (with gaps for the connector paths)
    for (const s of [-1, 1]) {
      const xa = BX + s * 5.0, xb = BX + s * 6.1
      for (const [za, zb] of [[17.8, 19.4], [24.4, 37.4], [41.8, 46.4]]) hedge(g, Math.min(xa, xb), Math.max(xa, xb), za, zb, 1.0)
    }
    // boundary wall along the south edge of the plaza, with the boulevard gate
    const gateW = 14.4
    wall(g, P.x0, BX - 13.25, 46.2, 47.2, 1.5); wall(g, 14.4 + 0.0, P.x1, 46.2, 47.2, 1.5)
    for (const x of [-13.25, 14.4]) { g.box(W0, x - 0.5, x + 0.5, 0, 2.9, 45.8, 47.6, col(PAL.limestone), 'ashlar', 'fulrb', 2.4, 1.2); g.box(W0, x - 0.62, x + 0.62, 2.9, 3.05, 45.68, 47.72, col('#e6decd'), 'trim', 'fulrb'); g.box(W0, x - 0.2, x + 0.2, 3.05, 3.5, 46.4, 47.0, col('#ffdca2'), 'glow', 'fulrb', 1, 1, 0); g.solid(W0, x - 0.5, x + 0.5, 0, 3.6, 45.8, 47.6, 'gatepier'); halos.push([x, GY + 3.3, 46.7]) }
    // perimeter: west + east edge of the plaza (stone plinth + hedge), sealed with colliders
    wall(g, P.x0 - 0.8, P.x0, -132, 47.2, 1.5); wall(g, P.x1, P.x1 + 0.8, -132, 47.2, 1.5)
    hedge(g, P.x0 + 0.1, P.x0 + 1.6, -132, 47.2, 1.8, '#46583a'); hedge(g, P.x1 - 1.6, P.x1 - 0.1, -132, 47.2, 1.8, '#46583a')
    // forecourt lighting + trees
    for (let z = 20; z <= 44; z += 6) for (const s of [-1, 1]) { put('pathLight', BX + s * 4.7, z, 0); pools.push([BX + s * 4.7, z, 3.6]) }
    for (const [x, z] of [[-18, 26], [-30, 30], [-44, 24], [26, 26], [34, 31], [46, 22], [-38, 12], [40, 14]]) { tree('ornamental', x + (R() - 0.5) * 3, z + (R() - 0.5) * 2, 0.9 + R() * 0.35); }
    for (let i = 0; i < 12; i++) { const x = -118 + R() * 150, z = 5 + R() * 32; if (Math.abs(x - BX) < 12 || (x > -62 && x < 36 && z < 16)) continue; tree(R() < 0.5 ? 'plane' : 'ornamental', x, z, 0.8 + R() * 0.4) }
    for (let i = 0; i < 6; i++) { const x = 38 + R() * 38, z = 8 + R() * 28; if (Math.abs(x - 60) < 6) continue; tree(R() < 0.5 ? 'plane' : 'ornamental', x, z, 0.8 + R() * 0.4) }
    // east + west walks: clipped hedge borders, tree allées, benches, lamps
    for (const [xc, side] of [[60, 'E'], [-92, 'W']]) {
      for (const s of [-1, 1]) for (let z = -122; z < 36; z += 18) {
        if ((z + 122) % 36 === 18) continue
        hedge(g, xc + s * 4.9, xc + s * 5.9, z, z + 12, 0.9, '#506239')
      }
      for (let z = -112; z < 30; z += 14 + R() * 3) for (const s of [-1, 1]) tree(R() < 0.3 ? 'plane' : 'ornamental', xc + s * (9 + R() * 2.5), z + (R() - 0.5) * 3, 0.9 + R() * 0.4)
      for (let z = -100; z < 36; z += 40) { bench(xc - 4.2, z, Math.PI / 2); bench(xc + 4.2, z + 20, -Math.PI / 2) }
      for (let z = -118; z < 36; z += 24) lamp(xc + (side === 'E' ? 4.4 : -4.4), z, 0)
    }
    // west lawn grove (denser, parkier) + east lawn
    for (let i = 0; i < 26; i++) { const x = -122 + R() * 56, z = -120 + R() * 118; if (Math.abs(x + 92) < 7) continue; tree(R() < 0.55 ? 'plane' : 'ornamental', x, z, 0.85 + R() * 0.45) }
    for (let i = 0; i < 12; i++) { const x = 38 + R() * 40, z = -120 + R() * 118; if (Math.abs(x - 60) < 7) continue; tree(R() < 0.5 ? 'plane' : 'ornamental', x, z, 0.85 + R() * 0.4) }
    // piazza: tree grates under the tower + stone planters
    for (let x = -100; x <= 62; x += 18) { grate(g, x, -96); tree('ornamental', x, -96, 0.95); if (Math.abs(x - BX) > 2) lamp(x + 9, -94.5, 0) }
    for (let x = -112; x <= 72; x += 20) { grate(g, x, -121); tree('plane', x, -121, 0.9 + R() * 0.2); if (x < 40 && x > -100) bench(x + 10, -118, 0) }
    for (let x = -108; x <= 70; x += 36) { hedge(g, x - 6, x + 6, -107.2, -106.2, 0.7, '#506239') }
    pois.plaza = { x: 60, z: 30 }
  }

  // =====================================================================================================================================
  // 4. THAMES TERRACE: raised promenade over the quay wall, ramps + grand stair, balustrade, lamps, benches, trees; the river + skyline beyond
  // =====================================================================================================================================
  {
    const ch = mk('terrace'), x0 = -125, x1 = 80, zr = -146.6, zw = -132, H = TERR_H, stone = col(PAL.limestone)
    const FT = frame(0, 0, 0, GY)
    ch.box(FT, x0, x1, 0, H, zr, zw, stone, 'ashlar', 'f', 2.4, 1.2)                                                      // retaining wall (street side)
    ch.box(FT, x0, x1, -0.3, H, zr - 5.4, zr, col('#8e8579'), 'ashlar', 'b', 2.4, 1.2)                                   // quay wall (river side), the face the skyline view sees
    ch.box(FT, x0, x1, H - 0.02, H, zr - 5.4, zr, col('#cdbfa6'), 'slab', 'u', 1.8, 1.2, 0)
    ch.box(FT, x0, x1, H - 0.001, H, zr, zw, col(G.slab), 'slab', 'u', 1.8, 1.2, 0)
    ch.box(FT, x0, x1, H + 0.0, H + 0.011, zw - 3.5, zw - 0.0, col('#d1c6b2'), 'sett', 'u', 1.6, 1.6, 0)                    // setts band along the stair edge
    ch.solid(FT, x0, x1, -0.5, H, zr, zw, 'terrace')
    ch.solid(FT, x0, x1, 0, H + 1.2, zr - 0.7, zr - 0.2, 'balustrade')
    // balustrade along the river edge + the street-side edge (gaps at the stairs/ramps); balusters are detail geometry (LOD)
    const gaps = [[BX - 10, BX + 10], [-87, -77], [47, 57]]
    const bal = (xa, xb, z) => {
      ch.box(FT, xa, xb, H, H + 0.16, z - 0.2, z + 0.2, stone, 'trim', 'fulrb'); ch.box(FT, xa, xb, H + 0.9, H + 1.04, z - 0.22, z + 0.22, stone, 'trim', 'fulrb')
      const n = Math.max(1, Math.round((xb - xa) / 0.28)); for (let i = 0; i <= n; i++) { const x = xa + (i / n) * (xb - xa); ch.prism(FT, x, z, 0.06, 0.06, H + 0.16, H + 0.9, stone, 'trim+', 4, false) }
      for (let x = xa; x <= xb; x += 4) ch.box(FT, x - 0.14, x + 0.14, H + 0.16, H + 1.0, z - 0.14, z + 0.14, stone, 'trim', 'fulrb')
    }
    bal(x0, x1, zr + 0.35)
    let cur = x0; for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > cur) bal(cur, a, zw - 0.4); cur = b } if (cur < x1) bal(cur, x1, zw - 0.4)
    ch.solid(FT, x0, x1, H, H + 1.1, zr + 0.15, zr + 0.55, 'rail')
    cur = x0; for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > cur) ch.solid(FT, cur, a, H, H + 1.1, zw - 0.6, zw - 0.2, 'rail'); cur = b } if (cur < x1) ch.solid(FT, cur, x1, H, H + 1.1, zw - 0.6, zw - 0.2, 'rail')
    for (const x of [x0, x1]) ch.solid(FT, x - 0.4, x + 0.4, H, H + 1.6, zr - 0.2, zw, 'endwall')
    // ramps (gentle, 8°) and the grand stair on the axis
    const ramp = (xc, w) => {
      const F = frame(xc, -102, Math.PI, GY), L = 30, h = H
      ch.slope(F, [w / 2, 0.02, 0], [-w / 2, 0.02, 0], [-w / 2, h + 0.02, L], [w / 2, h + 0.02, L], col(G.slab), 'slab', 1.8, 1.2)
      for (const s of [-1, 1]) { ch.tri(F, [s * w / 2, 0, 0], [s * w / 2, 0, L], [s * w / 2, h, L], stone, 'ashlar', [s, 0, 0]); ch.box(F, s * w / 2 - 0.15, s * w / 2 + 0.15, 0, 0.55, 0, 2, stone, 'ashlar', 'fulr', 2.4, 1.2) }
      ch.ramp(F, -w / 2, w / 2, 0, 0, L, h)
      for (const s of [-1, 1]) ch.solid(F, s * w / 2 - 0.12, s * w / 2 + 0.12, 0, 2.2, 0, L, 'rampcheek')
    }
    ramp(-82, 10); ramp(52, 10)
    {  // grand stair
      const F = frame(BX, -123.4, Math.PI, GY), w = 20, n = 29, rise = H / n, tread = 0.3
      for (let k = 0; k < n; k++) ch.box(F, -w / 2, w / 2, 0, (k + 1) * rise, k * tread, n * tread, stone, 'ashlar', 'fu', 2.4, 1.2, 0.02)
      for (const s of [-1, 1]) { ch.tri(F, [s * w / 2, 0, 0], [s * w / 2, 0, n * tread], [s * w / 2, H, n * tread], stone, 'ashlar', [s, 0, 0]); ch.box(F, s * w / 2 - 0.2, s * w / 2 + 0.2, 0, 0.7, -0.2, 1.6, stone, 'ashlar', 'fulr', 2.4, 1.2) }
      ch.ramp(F, -w / 2, w / 2, 0, 0.08, n * tread + 0.2, H + 0.08)
      for (const s of [-1, 1]) ch.solid(F, s * w / 2 - 0.2, s * w / 2 + 0.2, 0, 2.4, 0, n * tread, 'stairwall')
      pois.stair = { x: BX, z: -122 }
    }
    // furniture on the terrace
    for (let x = -2400 + 22 * Math.ceil((x0 + 2400) / 22); x <= x1; x += 22) { put('lamp', x, zr + 1.2, 0, 1.0, TERRACE_Y); pools.push([x, zr + 1.2, 7.5, TERRACE_Y]); halos.push([x, TERRACE_Y + 4.9, zr + 1.2]) }
    for (let x = -112; x < 78; x += 31) { put('bench', x, zr + 3.2, 0, 1.0, TERRACE_Y); ch.solid(frame(x, zr + 3.2, 0, TERRACE_Y), -0.9, 0.9, 0, 0.5, -0.25, 0.25, 'bench') }
    for (let x = -118; x < 78; x += 16 + R() * 4) { grate(ch, x, -139, 1.3); put('plane', x, -139, R() * 6, 0.85 + R() * 0.3, TERRACE_Y) }
    pois.terrace = { x: BX, z: -139 }
    pois.river = { x: BX, z: -143.5 }
  }

  // =====================================================================================================================================
  // 5. GRAND BOULEVARD: carriageway, pavements, plane trees, lamps, crossings; Elegant Quarter (W) and Modern Quarter (E)
  // =====================================================================================================================================
  {
    const g = mk('boulevard'), Z0 = 47.2, Z1 = 210, xw = -12, xe = 14.4, rw = -5.8, re = 8.2
    surf(g, 'road', rw, re, Z0, Z1, G.road, 4, 4, 1)
    surf(g, 'slab', xw, rw, Z0, Z1, G.slab, 1.8, 1.2, 1); surf(g, 'slab', re, xe, Z0, Z1, G.slab, 1.8, 1.2, 1)
    for (const x of [rw, re]) g.box(W0, x - 0.15, x + 0.15, 0, 0.1, Z0, Z1, col('#cfc4b0'), 'ashlar', 'fulr', 2.4, 1.2, 0.02)       // kerb stones (visual)
    for (let z = Z0 + 3; z < Z1 - 6; z += 9) surf(g, 'paint', BX - 0.07, BX + 0.07, z, z + 3, G.paint, 1, 1, 2)
    for (const zc of [100, 160]) for (let x = rw + 0.5; x < re - 0.3; x += 1.0) surf(g, 'paint', x, x + 0.5, zc - 2, zc + 2, G.paint, 1, 1, 2)
    // side streets (asphalt cross-roads that end in walls with a gate), west and east
    const sideW = [[99, 111], [157, 169]], sideE = [[95, 107], [155, 167]]
    for (const [a, b] of sideW) {
      surf(g, 'slab', -62, xw, a, a + 1.8, G.slab, 1.8, 1.2, 1); surf(g, 'slab', -62, xw, b - 1.8, b, G.slab, 1.8, 1.2, 1); surf(g, 'road', -62, rw, a + 1.8, b - 1.8, G.road, 4, 4, 2)
      wall(g, -62.8, -27.25, a - 0.6, a, 3.2, { col: PAL.stock, key: 'brick' }); wall(g, -62.8, -27.25, b, b + 0.6, 3.2, { col: PAL.stock, key: 'brick' }); wall(g, -62.8, -62, a - 0.6, b + 0.6, 3.4, { col: PAL.stock, key: 'brick' })
      lamp(-40, a + 2.2, 0); lamp(-12.4, b - 0.9, 0)
      g.box(W0, -62.4, -62.0, 0, 3.0, (a + b) / 2 - 1.2, (a + b) / 2 + 1.2, col('#3e3b44'), 'wood', 'fr'); tree('plane', -67, (a + b) / 2 + 3, 0.9)
    }
    for (const [a, b] of sideE) {
      surf(g, 'slab', xe, 64, a, a + 1.8, G.slab, 1.8, 1.2, 1); surf(g, 'slab', xe, 64, b - 1.8, b, G.slab, 1.8, 1.2, 1); surf(g, 'road', re, 64, a + 1.8, b - 1.8, G.road, 4, 4, 2)
      wall(g, 36.4, 64.8, a - 0.6, a, 3.2, { col: PAL.stock, key: 'brick' }); wall(g, 36.4, 64.8, b, b + 0.6, 3.2, { col: PAL.stock, key: 'brick' }); wall(g, 64, 64.8, a - 0.6, b + 0.6, 3.4, { col: PAL.stock, key: 'brick' })
      lamp(46, a + 2.2, 0); lamp(14.8, b - 0.9, 0)
      g.box(W0, 63.6, 64.0, 0, 3.0, (a + b) / 2 - 1.2, (a + b) / 2 + 1.2, col('#3e3b44'), 'wood', 'fl'); tree('plane', 68.5, (a + b) / 2 - 3, 0.9)
    }
    // street trees (planes), lamps, benches
    const skip = (z, list) => list.some(([a, b]) => z > a - 3 && z < b + 3)
    for (let z = Z0 + 8; z < Z1 - 6; z += 13 + R() * 1.5) {
      if (!skip(z, sideW) && Math.abs(z - 100) > 4 && Math.abs(z - 160) > 4) { tree('plane', -8.9, z, 0.9 + R() * 0.3); grate(g, -8.9, z) }
      if (!skip(z + 3, sideE) && Math.abs(z - 100) > 4 && Math.abs(z - 160) > 4) { tree('plane', 11.3, z + 3, 0.9 + R() * 0.3); grate(g, 11.3, z + 3) }
    }
    for (let z = Z0 + 14; z < Z1 - 6; z += 26) { if (!skip(z, sideW)) lamp(-6.4, z, 0); if (!skip(z + 13, sideE)) lamp(9.0, z + 13, 0) }
    for (const z of [74, 134, 188]) { bench(-9.9, z, Math.PI / 2); bench(12.4, z + 8, -Math.PI / 2) }
    for (const zc of [100, 160]) for (const x of [rw - 0.6, re + 0.6]) { put('bollard', x, zc - 2.6, 0); put('bollard', x, zc + 2.6, 0) }

    // ---- Elegant Quarter: west terraces (facade plane at x = -14.25, facing +x) ----
    const elegant = mk('elegant'), blocksW = [[Z0, 99], [111, 157], [169, 210]]
    const MAIN = ['#ece3d0', '#decdae', '#e8dcc2', '#d3cab9', '#e0cdbf', '#cdd2c0', '#e6dcc9'], DOORS = ['#34473d', '#4d3548', '#2f3138', '#2d3345', '#5a3a3a', '#44504a', '#6a4d63']
    for (const [za, zb] of blocksW) {
      const ws = fit(zb - za, 5.4, 7.0, R); let z = za
      ws.forEach((w, i) => {
        const zc = z + w / 2; z += w
        const F = frame(-14.25, zc, Math.PI / 2), main = pickR(R, MAIN), brickUp = R() < 0.3
        townhouse(elegant, F, { w, d: 13, floors: R() < 0.12 ? 5 : 4, main, ground: new THREE.Color(main).lerp(new THREE.Color('#9f9482'), 0.28).getStyle(), upper: brickUp ? 'brick' : 'plaster', brick: R() < 0.5 ? PAL.stock : PAL.brick, doorBay: R() < 0.5 ? 0 : (w < 6.15 ? 1 : 2), door: pickR(R, DOORS), litP: 0.24, mansard: 2.1 + R() * 0.7, balc: R() < 0.6, side: PAL.stock, slate: R() < 0.7 ? PAL.slate : '#4a4650' })
      })
    }
    // ---- Modern Quarter: east mid-rises (facade plane at x = 14.4, facing -x) ----
    const modern = mk('modern'), blocksE = [[Z0, 95], [107, 155], [167, 210]]
    const MODS = [{ mat: 'ashlar', main: '#e0d6c0', fin: '#d4c9b1' }, { mat: 'plaster', main: '#e9e1d2', fin: '#dcd2c0' }, { mat: 'brick', main: '#bfa386', fin: '#a68a6f' }, { mat: 'ashlar', main: '#d7cdb8', fin: '#c8bda6' }]
    for (const [za, zb] of blocksE) {
      const nbk = Math.max(1, Math.round((zb - za) / 44)), ws = fit(zb - za, 36, 50, R); let z = za
      void nbk
      ws.forEach((w, i) => {
        const zc = z + w / 2, spec = pickR(R, MODS); z += w
        modernBlock(modern, frame(14.4, zc, -Math.PI / 2), { w, d: 22, floors: 6 + ((R() * 4) | 0), mat: spec.mat, main: spec.main, fin: spec.fin, balc: R() < 0.7, setback: R() < 0.65, litP: 0.28, back: '#cfc6b6' })
      })
    }
    pois.boulevard = { x: BX, z: 70 }
    pois.elegant = { x: -9, z: 130 }
    pois.modern = { x: 10, z: 128 }
  }

  // =====================================================================================================================================
  // 6. NEIGHBOURHOOD SQUARE (fountain, lime grid, benches, lamps) + its enclosing frontages
  // =====================================================================================================================================
  {
    const g = mk('square'), S = { x0: -50, x1: 50, z0: 210, z1: 282 }, cx = 0, cz = 246
    surf(g, 'slab', S.x0, S.x1, S.z0, S.z1, G.slab, 1.8, 1.2, 1)
    // paving ring + radial inlays (setts)
    const seg = 40
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, r0 = 8.4, r1 = 10.4
      const A = [cx + Math.cos(a0) * r0, GY + 0.036, cz + Math.sin(a0) * r0], B = [cx + Math.cos(a0) * r1, GY + 0.036, cz + Math.sin(a0) * r1], Cc = [cx + Math.cos(a1) * r1, GY + 0.036, cz + Math.sin(a1) * r1], D = [cx + Math.cos(a1) * r0, GY + 0.036, cz + Math.sin(a1) * r0]
      g.acc('sett').quad(A, D, Cc, B, col(G.sett), [0, 1, 0], [[A[0] / 1.6, A[2] / 1.6], [D[0] / 1.6, D[2] / 1.6], [Cc[0] / 1.6, Cc[2] / 1.6], [B[0] / 1.6, B[2] / 1.6]])
    }
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const F = frame(cx, cz, a, GY + 0.03); g.flat(F, 10.4, 44, -0.6, 0.6, 0, col(G.sett), 'sett', 1.6, 1.6) }
    // fountain: stepped basin
    const Fq = frame(cx, cz, 0, GY)
    g.prism(Fq, 0, 0, 5.4, 5.4, 0, 0.55, col('#d9cdb5'), 'trim', 28, false)
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 1) / 28) * Math.PI * 2, r0 = 4.8, r1 = 5.4, y = GY + 0.55
      g.acc('trim').quad([cx + Math.cos(a0) * r0, y, cz + Math.sin(a0) * r0], [cx + Math.cos(a0) * r1, y, cz + Math.sin(a0) * r1], [cx + Math.cos(a1) * r1, y, cz + Math.sin(a1) * r1], [cx + Math.cos(a1) * r0, y, cz + Math.sin(a1) * r0], col('#e4dac4'), [0, 1, 0])
    }
    g.prism(Fq, 0, 0, 1.5, 1.4, 0.3, 0.95, col('#d9cdb5'), 'trim', 16); g.prism(Fq, 0, 0, 0.75, 0.6, 0.95, 1.9, col('#d9cdb5'), 'trim', 12); g.prism(Fq, 0, 0, 2.2, 2.2, 0.95, 1.05, col('#e4dac4'), 'trim', 18)
    g.solid({ ...Fq }, -5.4, 5.4, 0, 0.6, -5.4, 5.4, 'fountain'); g.cols[g.cols.length - 1].cyl = true; g.cols[g.cols.length - 1].r = 5.4
    waters.push({ x: cx, z: cz, r: 4.8, y: GY + 0.45, kind: 'fountain' }); jets.push({ x: cx, z: cz, y: GY + 1.9 })
    // lime grid (clipped crowns), benches facing the fountain, lamps
    for (const x of [-40, -30, 30, 40]) for (const z of [222, 270]) { tree('clipped', x, z, 1.0, R() < 0.5 ? 0 : Math.PI / 2); grate(g, x, z, 1.5) }
    for (const x of [-22, 22]) for (const z of [260, 232]) { tree('clipped', x, z, 1.0, 0); grate(g, x, z, 1.5) }
    for (const x of [-46.5, 46.5]) for (let z = 222; z <= 274; z += 12) { tree('clipped', x, z, 1.0, Math.PI / 2); grate(g, x, z, 1.5) }
    for (const z of [276]) for (let x = -34; x <= 34; x += 12) { if (Math.abs(x) < 6) continue; tree('clipped', x, z, 1.0, 0); grate(g, x, z, 1.5) }
    for (const x of [-14, 14]) for (let z = 218; z <= 274; z += 14) { if (Math.abs(z - 246) < 16) continue; tree('clipped', x, z, 1.0, 0); grate(g, x, z, 1.5) }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, r = 13.2; bench(cx + Math.cos(a) * r, cz + Math.sin(a) * r, -a + Math.PI / 2 + Math.PI) }
    for (const x of [-46, -24, 0, 24, 46]) for (const z of [214, 278]) lamp(x, z, 0)
    for (const [x, z] of [[-36, 246], [36, 246]]) lamp(x, z, 0)
    pois.square = { x: 0, z: 230 }
    // bounding: south corners, between square and V10 context
    wall(g, S.x0, -27.4, 209.2, 210.2, 1.2); wall(g, 36.3, S.x1, 209.2, 210.2, 1.2)
    hedge(g, S.x0 - 0.6, S.x0, 209, 226.7, 1.8, '#46583a'); hedge(g, S.x0 - 0.6, S.x0, 263.3, 285, 1.8, '#46583a'); hedge(g, S.x1, S.x1 + 0.6, 209, 210, 1.8, '#46583a')

    // north side: grand terrace facing south (facade plane z = 282, rot = PI); a taller central house
    const north = mk('squareN'), ws = fit(100, 6.0, 8.0, R); let x = 50
    const MAIN = ['#ece3d0', '#decdae', '#e8dcc2', '#d3cab9', '#e0cdbf', '#cdd2c0'], DOORS = ['#34473d', '#4d3548', '#2f3138', '#2d3345', '#5a3a3a']
    ws.forEach((w, i) => {
      const xc = x - w / 2; x -= w
      const main = pickR(R, MAIN), mid = Math.abs(xc) < 8
      townhouse(north, frame(xc, 282 + 2.25, Math.PI), { w: mid ? 9 : w, d: 13, floors: mid ? 5 : 4, main, ground: new THREE.Color(main).lerp(new THREE.Color('#9f9482'), 0.28).getStyle(), upper: 'plaster', doorBay: R() < 0.5 ? 0 : 1, door: pickR(R, DOORS), litP: 0.26, mansard: 2.3, balc: true, side: PAL.stock })
    })
    // east side: two modern mid-rises facing west
    const eM = mk('squareE')
    modernBlock(eM, frame(50, 246 - 18, -Math.PI / 2), { w: 36, d: 20, floors: 7, mat: 'ashlar', main: '#ddd2bb', fin: '#cfc3ab', balc: true, setback: true, litP: 0.3 })
    modernBlock(eM, frame(50, 246 + 20, -Math.PI / 2), { w: 38, d: 20, floors: 6, mat: 'plaster', main: '#e8dfce', fin: '#dacfbb', balc: true, setback: false, litP: 0.3 })
    // south-east / south-west low frontages flanking the boulevard mouth
    // (the boulevard terraces already continue to z = 210)
  }

  // =====================================================================================================================================
  // 7. ROMANTIC QUARTER: pedestrian lane west of the square, café / bookshop / florist / boutique + more shops
  // =====================================================================================================================================
  {
    const g = mk('lane'), ch = mk('laneShops'), zc = 245, hwid = 4.3, LX1 = -50, LX0 = -142
    surf(g, 'sett', LX0, LX1, zc - hwid, zc + hwid, G.sett, 1.6, 1.6, 1)
    surf(g, 'slab', LX0, LX1, zc - hwid - 2.0, zc - hwid, G.slab, 1.8, 1.2, 1); surf(g, 'slab', LX0, LX1, zc + hwid, zc + hwid + 2.0, G.slab, 1.8, 1.2, 1)
    const SHOPS = [
      { id: 'cafe', sign: 0, w: 9.6, awning: '#6d5568', wall: 'brick', main: PAL.brick, stall: '#2f2a30', door: '#2b2630' },
      { id: 'books', sign: 1, w: 7.2, awning: '#8d9a85', wall: 'plaster', main: '#d9d1bf', stall: '#2f3d36', door: '#2f3d36' },
      { id: 'florist', sign: 2, w: 6.4, awning: '#d9cdb8', wall: 'plaster', main: '#cfc7b6', stall: '#3b3436', door: '#41584a' },
      { id: 'boutique', sign: 3, w: 6.8, awning: '#6d5568', wall: 'plaster', main: '#d9c9bf', stall: '#4a3a46', door: '#4a3a46' },
    ]
    const MORE = [{ sign: 4, awning: '#c9b79a' }, { sign: 5, awning: '#b4806e' }, { sign: 6, awning: '#8d9a85' }, { sign: 7, awning: '#9a8095' }, { sign: 4, awning: '#d9cdb8' }, { sign: 5, awning: '#6d5568' }]
    const WALLS = [['brick', PAL.brick], ['plaster', '#d9d1bf'], ['brick', PAL.stock], ['plaster', '#d9c9bf'], ['plaster', '#cdd2c0'], ['brick', '#b4806e'], ['plaster', '#e0d6c4']]
    const place = (side, list) => {                                  // side +1 = north (facing -z), -1 = south (facing +z)
      let x = LX1 + (side > 0 ? 0 : 0), k = 0
      for (const sp of list) {
        const w = sp.w, xc = x - w / 2; x -= w
        const F = side > 0 ? frame(xc, zc + hwid + 2.0, Math.PI) : frame(xc, zc - hwid - 2.0, 0)   // note: local +x runs toward world -x on the north side
        const rotLocal = side > 0
        shopBuilding(ch, F, { w, d: 12, floors: sp.floors ?? (R() < 0.3 ? 4 : 3), wall: sp.wall, main: sp.main, sign: sp.sign, awning: sp.awning, stall: sp.stall, door: sp.door, doorSide: R() < 0.5 ? 'l' : 'r', balc: R() < 0.5, roof: R() < 0.55 ? 'gable' : 'hip', side: PAL.stock })
        void rotLocal; k++
        if (sp.id === 'cafe') {                                         // outdoor tables + chairs on the paved forecourt
          for (let i = 0; i < 4; i++) { const tx = xc + (i - 1.5) * 1.9, tz = zc + side * (hwid - 0.9) + side * 0.0; put('table', tx, tz, 0); put('chair', tx - 0.55, tz, Math.PI / 2); put('chair', tx + 0.55, tz, -Math.PI / 2) }
        }
        if (sp.id === 'florist') {                                      // buckets of stems (restrained)
          for (let i = 0; i < 3; i++) { const fx = xc + (i - 1) * 1.1, fz = zc + side * (hwid + 2.0 - 0.9); ch.prism(frame(fx, fz, 0, GY), 0, 0, 0.2, 0.17, 0, 0.42, col('#6b6a70'), 'metal', 8); for (let j = 0; j < 5; j++) ch.prism(frame(fx, fz, 0, GY), (j - 2) * 0.05, ((j * 37) % 7 - 3) * 0.02, 0.06, 0.07, 0.42, 0.78 + (j % 3) * 0.06, col(['#d9b7c2', '#e8dfd2', '#b9a6c9', '#c9d1b4', '#e6c9b0'][j]), 'leaf', 5) }
        }
        if (sp.id === 'books') { ch.box(frame(xc, zc + side * (hwid + 2.0 - 0.9), side > 0 ? Math.PI : 0, GY), -0.6, 0.6, 0, 1.1, -0.25, 0.25, col('#4a3a2c'), 'wood', 'fulrb') }
        if (sp.id) pois[sp.id] = { x: xc + (side > 0 ? 0 : 0), z: zc + side * (hwid + 0.4) }
      }
    }
    const northList = [SHOPS[0], SHOPS[2], ...fit(40, 5.6, 7.4, R).map((w, i) => ({ w, ...MORE[i % MORE.length], wall: WALLS[i % WALLS.length][0], main: WALLS[i % WALLS.length][1], stall: '#3a3237', door: '#41584a' }))]
    const southList = [SHOPS[1], SHOPS[3], ...fit(42, 5.6, 7.4, R).map((w, i) => ({ w, ...MORE[(i + 2) % MORE.length], wall: WALLS[(i + 3) % WALLS.length][0], main: WALLS[(i + 3) % WALLS.length][1], stall: '#2f3d36', door: '#2f3138' }))]
    place(1, northList); place(-1, southList)
    // closing wall + arched gate at the west end of the lane
    wall(g, LX0 - 0.8, LX0, zc - hwid - 2, zc + hwid + 2, 3.6, { col: PAL.stock, key: 'brick' })
    g.box(W0, LX0 - 0.1, LX0 + 0.2, 0, 2.7, zc - 1.2, zc + 1.2, col('#3e3b44'), 'wood', 'fl'); g.box(W0, LX0 - 0.1, LX0 + 0.3, 2.7, 3.0, zc - 1.4, zc + 1.4, col('#e0d6c0'), 'trim', 'fulr')
    tree('plane', LX0 - 5, zc + 1, 1.1); tree('ornamental', LX0 - 4, zc - 6, 0.9)
    for (let x = -60; x > LX0 + 8; x -= 22) { lamp(x, zc - hwid + 0.4, 0); lamp(x - 11, zc + hwid - 0.4, 0) }
    // festoon lights across the lane (strung between facades; points + a thin catenary of boxes)
    for (const x of [-72, -98, -122]) {
      const n = 14
      for (let i = 0; i <= n; i++) { const t = i / n, z = zc - hwid - 1.2 + t * (2 * hwid + 2.4), y = GY + 5.4 - 0.9 * Math.sin(t * Math.PI); halos.push([x, y, z]); if (i < n) { const z2 = zc - hwid - 1.2 + ((i + 1) / n) * (2 * hwid + 2.4), y2 = GY + 5.4 - 0.9 * Math.sin(((i + 1) / n) * Math.PI); ch.box(frame(x, (z + z2) / 2, 0, (y + y2) / 2 - GY), -0.012, 0.012, -0.012, 0.012, -(z2 - z) / 2, (z2 - z) / 2, col('#2b2a30'), 'metal+', 'fulrb', 1, 1, 0) } }
    }
    pois.lane = { x: -78, z: zc }
  }

  // =====================================================================================================================================
  // finalise: collect colliders, instance lists, lights
  // =====================================================================================================================================
  const colliders = []
  for (const c of Object.values(chunks)) colliders.push(...c.cols)
  const stats = {}; for (const [k, c] of Object.entries(chunks)) stats[k] = c.tris
  return { chunks, inst, pools, halos, waters, jets, lightsAt, colliders, pois, stats }
}

const rw_ = () => -5.8 - 6.2, re_ = () => 8.2 + 6.2
const signQ = (i) => { const u0 = (i % 2) / 2, v1 = 1 - Math.floor(i / 2) / 5; return [[u0, v1 - 0.2], [u0 + 0.5, v1 - 0.2], [u0 + 0.5, v1], [u0, v1]] }
