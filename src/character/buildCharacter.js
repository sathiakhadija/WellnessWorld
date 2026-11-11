// Procedurally modelled player character (157 cm, curvy). Modelled from scratch in code with a loft/ellipsoid toolkit,
// skinned to the reusable humanoid skeleton. NOT a DCC-authored asset: see docs/V12_REPORT.md for the fidelity gap.
import * as THREE from 'three'
import { loft, ellipsoid, mergeSkinned, hex, setSkin } from './loft.js'
import { HUMANOID_JOINTS, buildSkeleton } from './humanoidRig.js'
import { PLAYER_APPEARANCE } from './appearance.js'

const lerp = (a, b, t) => a + (b - a) * t
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const mixc = (a, b, t) => hex(a).lerp(hex(b), t)

// weights from joint heights along a chain: [[bone, y], ...] sorted ascending in y
function chainW(y, chain) {
  if (y <= chain[0][1]) return [[chain[0][0], 1]]
  for (let i = 0; i < chain.length - 1; i++) {
    const [a, ya] = chain[i], [b, yb] = chain[i + 1]
    if (y <= yb) { const t = sstep(ya, yb, y); return [[a, 1 - t], [b, t]] }
  }
  return [[chain[chain.length - 1][0], 1]]
}
// weights along a limb: descending y chain (top -> bottom)
const limbW = (y, chain) => chainW(y, [...chain].reverse())

// ---- body profile: [y, halfWidth, frontDepth, backDepth]
const BODY = [
  [0.72, 0.150, 0.110, 0.115], [0.80, 0.192, 0.125, 0.150], [0.88, 0.205, 0.132, 0.162], [0.96, 0.188, 0.128, 0.142],
  [1.04, 0.168, 0.122, 0.118], [1.11, 0.170, 0.132, 0.108], [1.18, 0.178, 0.156, 0.106], [1.24, 0.180, 0.128, 0.102],
  [1.29, 0.150, 0.095, 0.088], [1.325, 0.075, 0.070, 0.066], [1.36, 0.052, 0.054, 0.052],
]
function body(y) {
  for (let i = 0; i < BODY.length - 1; i++) {
    const a = BODY[i], b = BODY[i + 1]
    if (y <= b[0]) { const t = (y - a[0]) / (b[0] - a[0]); return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)] }
  }
  return BODY[BODY.length - 1].slice(1)
}
const TORSO_CHAIN = [['hips', 0.86], ['spine', 0.97], ['chest', 1.13], ['neck', 1.30]]

// ---- head (deformed sphere, soft round face with full cheeks)
const HC = [0, 1.452, 0.008], HR = [0.088, 0.112, 0.098]
function makeHead(A) {
  const g = ellipsoid(HC, HR, [['head', 1]], {
    ws: 56, hs: 44,
    mod: (v) => {
      if (v.y < 0) {
        const t = -v.y
        v.x *= 1 - 0.30 * Math.pow(t, 1.6)
        v.z *= 1 - 0.10 * Math.pow(t, 2.2)
        if (t > 0.55) v.y *= 1.0
      }
      const cheek = sstep(0.35, 0.7, Math.abs(v.x)) * (1 - sstep(0.25, 0.7, Math.abs(v.y + 0.25))) * sstep(0.0, 0.5, v.z)
      v.x *= 1 + 0.07 * cheek; v.z *= 1 + 0.025 * cheek
      if (v.y > 0.35 && v.z > 0) v.z *= 0.975
    },
    col: (u) => {
      const cheek = sstep(0.3, 0.65, Math.abs(u.x)) * (1 - sstep(0.15, 0.55, Math.abs(u.y + 0.22))) * sstep(0.2, 0.7, u.z)
      const nose = (1 - sstep(0.0, 0.18, Math.abs(u.x))) * (1 - sstep(0.0, 0.2, Math.abs(u.y + 0.22))) * sstep(0.7, 0.95, u.z)
      return mixc(A.skinLight, A.blush, cheek * 0.45 + nose * 0.2)
    },
  })
  const P = g.attributes.position
  const surfaceZ = (x, y) => {
    let best = -9, bx = 0
    for (let i = 0; i < P.count; i++) {
      if (Math.abs(P.getX(i) - x) < 0.0055 && Math.abs(P.getY(i) - y) < 0.0055 && P.getZ(i) > best) best = P.getZ(i)
    }
    return best
  }
  return { g, surfaceZ }
}

export function buildCharacter(A = PLAYER_APPEARANCE) {
  const head = makeHead(A)
  const EYE_Y = 1.456, EYE_X = 0.037
  const eyeZ = head.surfaceZ(EYE_X, EYE_Y)
  // ---- extra joints: eyes + lids (blink / look-at), hair chains (secondary motion), earrings
  const extra = []
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    extra.push(['eye' + S, 'head', [EYE_X * s, EYE_Y, eyeZ - 0.006]])
    extra.push(['lid' + S, 'head', [EYE_X * s, EYE_Y, eyeZ - 0.006]])
    extra.push(['jhumka' + S, 'head', [0.085 * s, 1.44, -0.004]])
  }
  const CH = {   // hair chains: [x, y, z] knots from the scalp downwards
    BL: [[0.062, 1.52, -0.075], [0.085, 1.37, -0.108], [0.10, 1.22, -0.128], [0.105, 1.08, -0.138], [0.10, 0.96, -0.14]],
    BM: [[0.0, 1.53, -0.085], [0.0, 1.37, -0.115], [0.0, 1.22, -0.135], [0.0, 1.08, -0.145], [0.0, 0.95, -0.148]],
    BR: [[-0.062, 1.52, -0.075], [-0.085, 1.37, -0.108], [-0.10, 1.22, -0.128], [-0.105, 1.08, -0.138], [-0.10, 0.96, -0.14]],
    FL: [[0.082, 1.51, 0.01], [0.105, 1.36, 0.045], [0.125, 1.23, 0.095], [0.12, 1.12, 0.135], [0.115, 1.03, 0.14]],
    FR: [[-0.082, 1.51, 0.01], [-0.105, 1.36, 0.045], [-0.125, 1.23, 0.095], [-0.12, 1.12, 0.135], [-0.115, 1.03, 0.14]],
  }
  const hairBones = {}
  for (const k in CH) {
    let parent = 'head'
    CH[k].forEach((p, i) => {
      const nm = `hair${k}${i}`; extra.push([nm, parent, p]); parent = nm
    })
    hairBones[k] = CH[k].map((_, i) => `hair${k}${i}`)
  }
  const rig = buildSkeleton([...HUMANOID_JOINTS, ...extra])
  const bi = rig.index
  const parts = { skin: [], eye: [], hair: [], top: [], denim: [], shoe: [], gold: [] }

  // =========================== SKIN ===========================
  parts.skin.push(head.g)
  const skinCol = (y, c0 = A.skin) => hex(c0)
  // neck
  parts.skin.push(loft([
    { c: [0, 1.29, 0.003], rx: 0.058, rz: 0.06, col: A.skin, w: [['chest', 0.5], ['neck', 0.5]] },
    { c: [0, 1.335, 0.006], rx: 0.049, rz: 0.052, col: A.skin, w: [['neck', 1]] },
    { c: [0, 1.385, 0.012], rx: 0.047, rz: 0.05, col: A.skin, w: [['neck', 0.4], ['head', 0.6]] },
  ], { seg: 18 }))
  // torso, built from the body profile (the top/jeans are shells on top of this)
  {
    const ys = []; for (let y = 0.72; y <= 1.345; y += 0.026) ys.push(y)
    parts.skin.push(loft(ys.map((y) => {
      const [hw, f, b] = body(y)
      const mid = sstep(1.04, 1.14, y) * (1 - sstep(1.18, 1.22, y))
      return { c: [0, y, (f - b) * 0.5 * 0.0], rx: hw, rz: [f, b], k: 2.25, w: chainW(y, TORSO_CHAIN), col: mixc(A.skin, A.skinLight, 0.3), colFn: undefined }
    }), { seg: 28 }))
  }
  // arms (slightly full upper arm), hands
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    const up = bi['upperArm' + S], sh = rig.world['upperArm' + S], el = rig.world['lowerArm' + S], wr = rig.world['hand' + S]
    const chain = [['clavicle' + S, 1.30], ['upperArm' + S, 1.25], ['lowerArm' + S, 0.985], ['hand' + S, 0.745]]
    const path = []
    const put = (p, rx, rz) => path.push({ c: [p.x, p.y, p.z], rx, rz, k: 2.1, col: A.skin, w: limbW(p.y, chain) })
    const lerpP = (a, b, t) => new THREE.Vector3().lerpVectors(a, b, t)
    parts.skin.push(ellipsoid([0.178 * s, 1.252, 0], [0.060, 0.062, 0.058], [['upperArm' + S, 0.7], ['clavicle' + S, 0.3]], { col: A.skin, ws: 18, hs: 12 }))
    for (let t = 0; t <= 1.001; t += 0.125) put(lerpP(sh, el, t), lerp(0.056, 0.043, t), lerp(0.054, 0.042, t))
    for (let t = 0.125; t <= 1.001; t += 0.125) put(lerpP(el, wr, t), lerp(0.041, 0.029, Math.pow(t, 0.8)), lerp(0.039, 0.027, Math.pow(t, 0.8)))
    parts.skin.push(loft(path, { seg: 16 }))
    const hb = 'hand' + S
    const tilt = new THREE.Euler(0, 0, -0.1 * s)
    parts.skin.push(ellipsoid([wr.x + 0.004 * s, wr.y - 0.038, wr.z + 0.004], [0.027, 0.046, 0.016], [[hb, 1]], { col: A.skin, rot: tilt }))
    parts.skin.push(ellipsoid([wr.x + 0.008 * s, wr.y - 0.098, wr.z + 0.006], [0.023, 0.046, 0.012], [[hb, 1]], { col: A.skin, rot: tilt }))
    parts.skin.push(ellipsoid([wr.x - 0.027 * s, wr.y - 0.05, wr.z + 0.016], [0.010, 0.029, 0.010], [[hb, 1]], { col: A.skin, rot: new THREE.Euler(0, 0, 0.35 * s) }))
  }
  // ears
  for (const s of [1, -1]) parts.skin.push(ellipsoid([0.083 * s, 1.452, -0.004], [0.007, 0.021, 0.014], [['head', 1]], { col: A.skin }))
  // nose
  const noseZ = head.surfaceZ(0, 1.432)
  const noseCol = mixc(A.skin, A.blush, 0.25)
  parts.skin.push(ellipsoid([0, 1.436, noseZ + 0.004], [0.0078, 0.0095, 0.0082], [['head', 1]], { col: noseCol, ws: 14, hs: 10 }))
  for (const s of [1, -1]) parts.skin.push(ellipsoid([0.0082 * s, 1.4305, noseZ + 0.0012], [0.0045, 0.0048, 0.0050], [['head', 1]], { col: noseCol, ws: 10, hs: 8 }))
  // lips (full)
  const lipZ = head.surfaceZ(0, 1.398)
  parts.skin.push(ellipsoid([0, 1.4015, lipZ + 0.0012], [0.0225, 0.0046, 0.0068], [['head', 1]], { col: A.lips, ws: 18, hs: 10 }))
  parts.skin.push(ellipsoid([0, 1.3925, lipZ + 0.0013], [0.0200, 0.0062, 0.0074], [['head', 1]], { col: mixc(A.lips, '#b3665c', 0.4), ws: 18, hs: 10 }))
  parts.skin.push(ellipsoid([0, 1.3985, lipZ + 0.0024], [0.0200, 0.0011, 0.0036], [['head', 1]], { col: '#4a221f', ws: 12, hs: 6 }))
  // eyelids: skin caps on lid bones (blink = rotate about X)
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    parts.skin.push(ellipsoid([EYE_X * s, EYE_Y, eyeZ - 0.006], [0.0152, 0.0145, 0.0112], [[`lid${S}`, 1]], {
      theta: [0, 1.25], ws: 16, hs: 8, col: (u) => (u.y < 0.48 ? hex('#1e1311') : mixc(A.skinLight, A.skin, 0.4)),
    }))
  }

  // =========================== EYES ===========================
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    const c = [EYE_X * s, EYE_Y, eyeZ - 0.006], w = [[`eye${S}`, 1]]
    parts.eye.push(ellipsoid(c, [0.0138, 0.0128, 0.0098], w, { col: '#f1ebe4', ws: 18, hs: 12 }))
    parts.eye.push(ellipsoid([c[0], c[1], c[2] + 0.0058], [0.0094, 0.0094, 0.0050], w, { col: A.eyeIris, ws: 16, hs: 10 }))
    parts.eye.push(ellipsoid([c[0], c[1], c[2] + 0.0092], [0.0046, 0.0046, 0.0026], w, { col: '#050303', ws: 12, hs: 8 }))
    parts.eye.push(ellipsoid([c[0] + 0.0034 * s, c[1] + 0.0042, c[2] + 0.0112], [0.0021, 0.0021, 0.0015], w, { col: '#ffffff', ws: 8, hs: 6 }))
  }
  // brows (natural, soft arch): tapered tube along an arc
  for (const [s] of [[1], [-1]]) {
    const pts = []
    const N = 9
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), x = lerp(0.016, 0.060, t) * s
      const y = 1.488 + 0.010 * Math.sin(t * Math.PI * 0.85) - 0.007 * t * t
      pts.push({ c: [x, y, head.surfaceZ(x, y) + 0.0012], rx: 0.0034, rz: lerp(0.0048, 0.0016, Math.pow(t, 1.4)) * (t < 0.15 ? 0.8 : 1) + 0.0004, w: [['head', 1]], col: '#150e0c' })
    }
    // tube cross-section axis: rings flow along x so lateral = vertical-ish
    parts.hair.push(loft(pts.map((p) => ({ ...p, rx: p.rz * 0.95, rz: 0.0027 })), { seg: 8, hint: new THREE.Vector3(0, 0, 1) }))
  }

  // =========================== HAIR ===========================
  const hairCol = hex(A.hair)
  const hw = (y, k) => {                                // weights over head + chain bones by y
    const kn = CH[k]; const chain = [['head', kn[0][1] + 0.06], ...kn.map((p, i) => [`hair${k}${i}`, p[1]])]
    return limbW(y, chain.slice().reverse().reverse())
  }
  const hairWeights = (y, k) => {
    const kn = CH[k], names = ['head', ...kn.map((_, i) => `hair${k}${i}`)], ys = [kn[0][1] + 0.05, ...kn.map((p) => p[1])]
    // descending y chain
    for (let i = 0; i < ys.length - 1; i++) {
      if (y >= ys[i + 1]) { const t = sstep(ys[i], ys[i + 1], y); return [[names[i], 1 - t], [names[i + 1], t]] }
    }
    return [[names[names.length - 1], 1]]
  }
  // scalp cap (skull shell with a hairline), slightly volumised
  parts.hair.push(ellipsoid([HC[0], HC[1] + 0.004, HC[2] - 0.004], [HR[0] + 0.0105, HR[1] + 0.0095, HR[2] + 0.0105], [['head', 1]], {
    ws: 56, hs: 44, col: (u) => hairCol.clone().lerp(hex('#241f2a'), sstep(0.2, 1, u.y) * 0.5 * (0.5 + 0.5 * Math.sin(u.x * 18))),
    mod: (v) => {
      const front = sstep(0.18, 0.62, v.z) * (1 - sstep(0.62, 0.9, v.y))          // hairline: sink the face area into the skull
      v.multiplyScalar(1 - 0.22 * front)
      const low = 1 - sstep(-0.35, -0.1, v.y)
      v.multiplyScalar(1 - 0.18 * low * (v.z > -0.45 ? 1 : 0.2))
      // volume + soft parting wave
      v.x *= 1.0 + 0.04 * Math.sin(v.y * 6 + v.z * 3)
    },
  }))
  // long wavy locks (layered); each a flattened ribbon-tube weighted to a hair chain
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const lock = (k, x0, y0, z0, length, width, phase, amp, layer, outward) => {
    const kn = CH[k], N = 14, rings = []
    const front = k[0] === 'F'
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1)
      const y = y0 - t * length
      let x, z
      if (front) {
        const base = kn.reduce((best, p) => (Math.abs(p[1] - y) < Math.abs(best[1] - y) ? p : best), kn[0])
        x = lerp(x0, base[0] * 1.05 + Math.sign(x0) * outward, sstep(0, 0.5, t))
        z = lerp(z0, base[2] + 0.012 + layer * 0.004, sstep(0, 0.6, t))
      } else {
        const b = body(Math.max(0.9, Math.min(1.3, y)))
        x = x0 * (1 + 0.3 * t) + outward * t
        z = Math.min(z0, -b[2] - 0.016 - layer * 0.007 + (y > 1.34 ? -0.012 : 0))
        if (y > 1.34) z = lerp(z0, -0.112 - layer * 0.006, sstep(1.5, 1.34, y))
      }
      x += Math.sin(t * 9.5 + phase) * amp * (0.35 + t)
      z += Math.cos(t * 7.5 + phase * 1.3) * amp * 0.45 * t
      const taper = 1 - 0.8 * Math.pow(t, 2.6)
      rings.push({
        c: [x, y, z], rx: (width * 0.8) * (0.9 + 0.35 * Math.sin(t * 3.14)) * taper + 0.002, rz: (width * 0.7) * (0.9 + 0.3 * Math.sin(t * 3.14)) * taper + 0.003,
        w: hairWeights(y, k), k: 2.0,
        col: hairCol.clone().lerp(hex('#2c2631'), (0.18 + 0.4 * (0.5 + 0.5 * Math.sin(t * 10 + phase))) * (1 - layer * 0.05)),
      })
    }
    parts.hair.push(loft(rings, { seg: 8, cap0: false, cap1: true }))
  }
  const nBack = 40
  for (let i = 0; i < nBack; i++) {
    const a = (i / (nBack - 1)) * 2 - 1                  // -1 .. 1 across the back
    const k = a < -0.33 ? 'BR' : a > 0.33 ? 'BL' : 'BM'
    const layer = i % 3
    lock(k, a * 0.082, 1.53 - Math.abs(a) * 0.05 - layer * 0.012, -0.082 - (1 - a * a) * 0.012, 0.50 + rnd() * 0.12 - Math.abs(a) * 0.05, 0.024 + rnd() * 0.01, rnd() * 6.28, 0.011 + rnd() * 0.008, layer, a * 0.015)
  }
  for (const [k, s] of [['FL', 1], ['FR', -1]]) {
    for (let i = 0; i < 5; i++) lock(k, s * (0.082 + i * 0.002), 1.52 - i * 0.008, 0.012 - i * 0.012, 0.42 + rnd() * 0.1, 0.021 + rnd() * 0.006, rnd() * 6.28, 0.008 + rnd() * 0.006, i, s * i * 0.003)
  }
  // =========================== CLOTHES ===========================
  // crop top: shell over the bust/ribs, sleeves to mid upper-arm
  {
    const rings = []
    for (let y = 1.155; y <= 1.318; y += 0.0126) {
      const [hw2, f, b] = body(y)
      const edge = sstep(1.155, 1.17, y)
      rings.push({ c: [0, y, 0], rx: hw2 + 0.006 + (1 - edge) * 0.002, rz: [f + 0.0075, b + 0.006], k: 2.25, w: chainW(y, TORSO_CHAIN), col: mixc(A.top, '#262629', Math.max(0, (y - 1.2) * 4) * 0.35) })
    }
    parts.top.push(loft(rings, { seg: 28, cap0: false, cap1: false }))
    for (const [S, s] of [['L', 1], ['R', -1]]) {
      const sh = rig.world['upperArm' + S], el = rig.world['lowerArm' + S]
      const chain = [['clavicle' + S, 1.30], ['upperArm' + S, 1.25], ['lowerArm' + S, 0.985]]
      const path = []
      for (let i = 0; i <= 5; i++) {
        const t = i / 5, p = new THREE.Vector3().lerpVectors(sh, el, t * 0.36)
        path.push({ c: [p.x, p.y, p.z], rx: lerp(0.0625, 0.0615, t), rz: lerp(0.0605, 0.0595, t), k: 2.1, w: limbW(p.y, chain), col: A.top })
      }
      parts.top.push(loft(path, { seg: 18, cap0: false, cap1: false }))
      parts.top.push(ellipsoid([0.178 * s, 1.252, 0], [0.0655, 0.0665, 0.0625], [['upperArm' + S, 0.7], ['clavicle' + S, 0.3]], { col: A.top, ws: 18, hs: 12 }))
    }
  }
  // baggy light-wash jeans: pelvis + two wide legs with folds and pooling at the hem
  {
    const fold = (th, i, amp) => 1 + amp * Math.sin(3 * th + i * 0.85) + amp * 0.5 * Math.sin(5 * th - i * 1.3)
    const dn = hex(A.denim), dd = hex(A.denimDark)
    const waistRings = []
    for (let y = 1.07; y >= 0.69; y -= 0.027) {
      const [hw2, f, b] = body(y)
      const wb = y > 1.045 ? 1 : 0
      waistRings.push({ c: [0, y, 0], rx: (hw2 + 0.012 + (y < 0.9 ? 0.004 : 0)) * (y < 0.76 ? 0.94 : 1), rz: [f + 0.012, b + 0.013], k: 2.25, w: chainW(y, [['spine', 0.97], ['hips', 0.86], ['upperLegL', 0.7]].reverse()), col: wb ? dd : dn, colFn: (th, c) => c.clone().lerp(dd, Math.max(0, Math.sin(th * 2 + y * 9)) * 0.18) })
    }
    parts.denim.push(loft(waistRings, { seg: 28, cap0: true, cap1: true }))
    for (const [S, s] of [['L', 1], ['R', -1]]) {
      const hip = rig.world['upperLeg' + S], kn = rig.world['lowerLeg' + S], an = rig.world['foot' + S]
      const chain = [['hips', 0.93], ['upperLeg' + S, 0.84], ['lowerLeg' + S, 0.455], ['foot' + S, 0.09]]
      const rings = [], N = 26
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1)
        const y = lerp(0.83, 0.098, t)
        // leg axis: hip -> knee -> ankle
        const p = y > kn.y ? new THREE.Vector3().lerpVectors(hip, kn, (hip.y - Math.min(hip.y, y)) / (hip.y - kn.y)) : new THREE.Vector3().lerpVectors(kn, an, (kn.y - y) / (kn.y - an.y))
        if (y > hip.y) p.set(hip.x * 0.9, y, 0)
        const thigh = y > 0.8 ? lerp(0.118, 0.12, 0) : 0
        const r = y > kn.y ? lerp(0.124, 0.116, (0.83 - y) / (0.83 - kn.y)) : lerp(0.116, 0.142, (kn.y - y) / (kn.y - 0.098))
        const pool = y < 0.22 ? 1 + 0.045 * Math.sin((0.22 - y) * 55) * (0.22 - y) * 7 : 1
        const amp = 0.03 * sstep(0.83, 0.6, y)
        rings.push({
          c: [p.x, y, p.z + (y < 0.3 ? 0.018 * (0.3 - y) / 0.3 : 0)],
          rx: r * pool, rz: [r * 0.97 * pool, r * 1.02 * pool], k: 2.1, w: limbW(y, chain), col: dn,
          mod: (th, ii) => fold(th, i, amp) * (1 + (i > N - 6 ? 0.012 * (i % 2) : 0)),
          colFn: (th, c) => c.clone().lerp(dd, Math.max(0, -(fold(th, i, 1) - 1) * 0.55) * (amp > 0 ? 1 : 0.2) + (y < 0.16 ? 0.25 : 0)).lerp(hex('#c4d4e4'), (y > 0.45 && y < 0.8 && Math.sin(th) > 0.4) ? 0.35 : 0),
        })
      }
      parts.denim.push(loft(rings, { seg: 28, cap0: false, cap1: false }))
      // hem ring (turned-up inner colour)
      parts.denim.push(loft([
        { c: [an.x, 0.100, an.z + 0.022], rx: 0.143, rz: [0.142, 0.143], w: [['lowerLeg' + S, 0.3], ['foot' + S, 0.7]], col: dd, k: 2.1 },
        { c: [an.x, 0.094, an.z + 0.022], rx: 0.132, rz: [0.131, 0.132], w: [['lowerLeg' + S, 0.3], ['foot' + S, 0.7]], col: dd, k: 2.1 },
      ], { seg: 28, cap0: false, cap1: false }))
    }
  }
  // trainers
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    const an = rig.world['foot' + S]
    const R = [
      [-0.085, 0.046, 0.034, 0.040, 0.044], [-0.05, 0.047, 0.042, 0.046, 0.043], [0.0, 0.042, 0.046, 0.044, 0.039],
      [0.06, 0.036, 0.048, 0.034, 0.035], [0.12, 0.031, 0.047, 0.028, 0.030], [0.17, 0.026, 0.040, 0.023, 0.025], [0.205, 0.020, 0.024, 0.014, 0.018],
    ]
    const rings = R.map(([z, cy, rx, up, dn2], i) => ({
      c: [an.x + 0.002 * s, cy, an.z + 0.01 + z], rx, rz: [up, dn2], k: 2.5, w: z > 0.09 ? [['toe' + S, 0.9], ['foot' + S, 0.1]] : z > 0.0 ? [['foot' + S, 0.6], ['toe' + S, 0.4]] : [['foot' + S, 1]],
      col: hex(A.shoe),
      colFn: (th) => (Math.sin(th) < -0.52 ? hex(A.sole) : hex(A.shoe)).clone().multiplyScalar(0.96 + 0.04 * Math.cos(th * 3)),
    }))
    parts.shoe.push(loft(rings, { seg: 20, hint: new THREE.Vector3(0, 1, 0) }))
  }
  // =========================== JEWELLERY ===========================
  for (const [S, s] of [['L', 1], ['R', -1]]) {
    const c = [0.085 * s, 1.44, -0.004]
    parts.gold.push(ellipsoid([c[0], c[1] + 0.002, c[2] + 0.002], [0.0055, 0.0055, 0.0055], [['head', 1]], { col: A.gold, ws: 10, hs: 8 }))
    parts.gold.push(ellipsoid([c[0], c[1] - 0.012, c[2] + 0.002], [0.0075, 0.0095, 0.0075], [[`jhumka${S}`, 1]], { col: A.gold, ws: 12, hs: 8 }))
    parts.gold.push(ellipsoid([c[0], c[1] - 0.0225, c[2] + 0.002], [0.0028, 0.0028, 0.0028], [[`jhumka${S}`, 1]], { col: A.gold, ws: 8, hs: 6 }))
  }
  {   // thin chain + pendant
    const pts = []
    const N = 16
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), a = Math.PI * (0.18 + 0.64 * t)
      const x = Math.cos(a) * 0.058 * (a > Math.PI / 2 ? -1 : 1) * 0, ang = (t - 0.5) * Math.PI * 1.15
      const px = Math.sin(ang) * 0.062, pz = Math.cos(ang) * 0.058 + 0.004, py = 1.318 - (1 - Math.cos(ang)) * 0.05 - (1 - Math.abs(ang) / 1.0) * 0.0
      pts.push({ c: [px, 1.32 - 0.04 * Math.pow(1 - Math.abs(t - 0.5) * 2, 1.2), pz], rx: 0.0016, rz: 0.0016, w: [['chest', 0.5], ['neck', 0.5]], col: A.gold })
    }
    parts.gold.push(loft(pts, { seg: 6, cap0: true, cap1: true }))
    parts.gold.push(ellipsoid([0, 1.272, 0.07], [0.006, 0.008, 0.002], [['chest', 1]], { col: A.gold, ws: 10, hs: 8 }))
  }

  // =========================== BUILD GEOMETRIES ===========================
  const geos = {}
  for (const k in parts) if (parts[k].length) geos[k] = mergeSkinned(parts[k], bi)
  return { rig, geos, hairBones, eyeY: EYE_Y, appearance: A }
}
