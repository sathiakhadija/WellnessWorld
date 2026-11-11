// Rig-agnostic animation runtime: sampled clips, weighted base-state blending, masked overlay layers, shared
// locomotion phase and ground contact data. Used by BOTH the character and the kitten.
import * as THREE from 'three'

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), e = new THREE.Euler()
const FPS = 30

export class Clip {
  constructor(name, duration, nFrames, nBones, { loop = true, group = null } = {}) {
    this.name = name; this.duration = duration; this.n = nFrames; this.loop = loop; this.group = group
    this.q = new Float32Array(nFrames * nBones * 4)
    this.root = new Float32Array(nFrames * 3)
    this.nBones = nBones
    this.touched = new Uint8Array(nBones)
    this.refSpeed = 0                         // m/s covered by the stance foot at timeScale 1 (locomotion clips)
  }
  // sample frame f (float) of a bone into `out` quaternion
  sampleBone(bi, f, out) {
    const n = this.n, f0 = Math.floor(f) % n, f1 = this.loop ? (f0 + 1) % n : Math.min(f0 + 1, n - 1), a = f - Math.floor(f)
    const o0 = (f0 * this.nBones + bi) * 4, o1 = (f1 * this.nBones + bi) * 4
    qa.fromArray(this.q, o0); qb.fromArray(this.q, o1)
    out.copy(qa).slerp(qb, a)
  }
  sampleRoot(f, out) {
    const n = this.n, f0 = Math.floor(f) % n, f1 = this.loop ? (f0 + 1) % n : Math.min(f0 + 1, n - 1), a = f - Math.floor(f)
    for (let k = 0; k < 3; k++) out[k] = this.root[f0 * 3 + k] * (1 - a) + this.root[f1 * 3 + k] * a
  }
}

/** Pose helper handed to clip authors. Rotations are Euler deltas (radians, XYZ) from the rest pose, in the bone's parent frame. */
class Pose {
  constructor(rig) { this.rig = rig; this.q = rig.bones.map(() => new THREE.Quaternion()); this.root = [0, 0, 0]; this.touched = new Set() }
  reset() { this.q.forEach((q) => q.identity()); this.root = [0, 0, 0] }
  rot(name, x = 0, y = 0, z = 0) {
    const i = this.rig.index[name]; if (i === undefined) return this
    this.q[i].setFromEuler(e.set(x, y, z, 'XYZ')); this.touched.add(i); return this
  }
  add(name, x = 0, y = 0, z = 0) {                 // accumulate on top of an earlier rot() call
    const i = this.rig.index[name]; if (i === undefined) return this
    this.q[i].multiply(qa.setFromEuler(e.set(x, y, z, 'XYZ'))); this.touched.add(i); return this
  }
  move(x = 0, y = 0, z = 0) { this.root = [x, y, z]; return this }
}

/**
 * Author a clip from a pose function. poseFn(P, u, t) with u = normalised phase 0..1, t = seconds.
 * opts.ground: auto-compensate the hips height every frame so the lowest sole point rests on the floor (no float / sink).
 */
export function makeClip(rig, name, duration, poseFn, opts = {}) {
  const n = Math.max(2, Math.round(duration * FPS))
  const clip = new Clip(name, duration, n, rig.bones.length, opts)
  const P = new Pose(rig)
  const soles = opts.ground || opts.measure ? soleProbes(rig) : null
  const per = []
  for (let f = 0; f < n; f++) {
    P.reset()
    const u = f / n
    poseFn(P, u, u * duration)
    if (opts.ground) { applyPose(rig, P); const m = lowestSole(rig, soles); P.root[1] += -m.y + (opts.groundLift ? opts.groundLift(u) : 0) }
    for (let b = 0; b < rig.bones.length; b++) P.q[b].toArray(clip.q, (f * rig.bones.length + b) * 4)
    clip.root.set(P.root, f * 3)
    P.touched.forEach((b) => { clip.touched[b] = 1 })
    if (opts.measure) { applyPose(rig, P); per.push({ feet: footPoints(rig, soles), lift: opts.groundLift ? opts.groundLift(u) : 0 }) }
  }
  if (opts.measure) {                                // mean ground speed of the planted feet -> exact timeScale (no foot sliding)
    let sum = 0, cnt = 0; const cy = opts.contactY || 0.009
    for (let f = 0; f < n; f++) {
      const a = per[f], b = per[(f + 1) % n]
      for (let k = 0; k < a.feet.length; k++) {
        if (a.lift < 0.02 && b.lift < 0.02 && a.feet[k].y < a.lift + cy && b.feet[k].y < b.lift + cy) { sum += -(b.feet[k].z - a.feet[k].z) / (duration / n); cnt++ }
      }
    }
    clip.refSpeed = cnt ? sum / cnt : 0
    if (opts.duty) {                                   // quadrupeds: stance travel = full fore/aft paw sweep, planted for `duty` of the cycle
      let r = 0; const nf = per[0].feet.length
      for (let k = 0; k < nf; k++) { let lo = 1e9, hi = -1e9; for (const q of per) { lo = Math.min(lo, q.feet[k].z); hi = Math.max(hi, q.feet[k].z) } r += hi - lo }
      clip.refSpeed = (r / nf) / (opts.duty * duration)
    }
  }
  restoreRest(rig)
  return clip
}

function applyPose(rig, P) {
  rig.bones.forEach((b, i) => { b.quaternion.copy(P.q[i]); b.position.copy(rig.restPos[i]) })
  rig.bones[0].position.set(rig.restPos[0].x + P.root[0], rig.restPos[0].y + P.root[1], rig.restPos[0].z + P.root[2])
  rig.root.updateMatrixWorld(true)
}
export function restoreRest(rig) {
  rig.bones.forEach((b, i) => { b.quaternion.copy(rig.rest[i]); b.position.copy(rig.restPos[i]) })
  rig.root.updateMatrixWorld(true)
}
// sole probes: points (bone-local) that must rest on the floor. Rigs may supply `rig.soles` = [{S, pts:[[boneName, [x,y,z]]...]}];
// the humanoid default is heel (foot bone) + ball (toe bone) of each foot.
function soleProbes(rig) {
  if (rig.soles) return rig.soles.map((s) => ({ S: s.S, pts: s.pts.map(([bn, v]) => [rig.byName[bn], new THREE.Vector3(...v)]) }))
  return ['L', 'R'].map((S) => ({ S, pts: [[rig.byName['foot' + S], new THREE.Vector3(0, -0.086, -0.05)], [rig.byName['toe' + S], new THREE.Vector3(0, -0.04, 0.035)]] }))
}
const tv = new THREE.Vector3()
function probeWorld(pr) { return pr.pts.map(([b, v]) => b.localToWorld(tv.copy(v)).clone()) }
function lowestSole(rig, soles) {
  let y = 1e9
  for (const pr of soles) for (const p of probeWorld(pr)) y = Math.min(y, p.y)
  return { y }
}
function footPoints(rig, soles) {
  return soles.map((pr) => { const w = probeWorld(pr); let lo = w[0]; for (const p of w) if (p.y < lo.y) lo = p; return { y: lo.y, z: lo.z } })
}

const tq = new THREE.Quaternion(), accQ = new THREE.Quaternion(), tmpR = [0, 0, 0]

export class Animator {
  constructor(rig, clips) {
    this.rig = rig; this.clips = clips
    this.nb = rig.bones.length
    this.w = {}; this.target = {}; this.time = {}; this.speed = {}; this.groupPhase = {}
    for (const k in clips) { this.w[k] = 0; this.target[k] = 0; this.time[k] = 0; this.speed[k] = 1 }
    this.layers = []
    this.rate = 6
    this.masks = {}
  }
  /** Weighted base states, e.g. {idle:0.3, walk:0.7}. Weights damp towards the targets at `rate` per second. */
  setBase(t, rate = 6) { for (const k in this.target) this.target[k] = t[k] || 0; this.rate = rate }
  setSpeed(name, s) { this.speed[name] = s }
  /** Masked overlay (upper-body gesture etc.). mask: Float32Array per bone (0..1) or null = whole body. */
  play(name, { mask = null, fadeIn = 0.2, fadeOut = 0.25, speed = 1, hold = 0, loop = null, tag = name } = {}) {
    const clip = this.clips[name]; if (!clip) return null
    const L = { clip, name, tag, t: 0, w: 0, mask, fadeIn, fadeOut, speed, hold, state: 'in', loop: loop ?? clip.loop, age: 0, done: false }
    this.layers.push(L); return L
  }
  release(L) { if (L && L.state !== 'out') L.state = 'out' }
  isPlaying(tag) { return this.layers.some((l) => l.tag === tag && !l.done) }
  update(dt) {
    const a = 1 - Math.exp(-this.rate * dt)
    // 1) base weights
    let tot = 0
    for (const k in this.w) { this.w[k] += (this.target[k] - this.w[k]) * a; if (this.w[k] < 0.002 && this.target[k] === 0) this.w[k] = 0; tot += this.w[k] }
    const bones = this.rig.bones, root = this.rig.restPos[0]
    for (let b = 0; b < this.nb; b++) bones[b].quaternion.copy(this.rig.rest[b])
    let cum = 0; const rt = [0, 0, 0]
    // advance clip clocks (grouped clips share one phase so walk<->run blends keep the feet in step)
    const gp = {}
    for (const k in this.w) {
      const c = this.clips[k]
      if (this.w[k] <= 0 && !(c.group && this.groupPhase[c.group] !== undefined)) continue
      if (c.group) {
        gp[c.group] = gp[c.group] || { rate: 0, w: 0 }
        gp[c.group].rate += this.speed[k] / c.duration * this.w[k]; gp[c.group].w += this.w[k]
      }
    }
    for (const g in gp) { const r = gp[g].w > 0 ? gp[g].rate / gp[g].w : 0; this.groupPhase[g] = ((this.groupPhase[g] || 0) + r * dt) % 1 }
    for (const k in this.w) {
      const wk = this.w[k]; if (wk <= 0) continue
      const c = this.clips[k]
      let f
      if (c.group) f = (this.groupPhase[c.group] || 0) * c.n
      else { this.time[k] += dt * this.speed[k]; if (c.loop) this.time[k] %= c.duration; else this.time[k] = Math.min(this.time[k], c.duration); f = this.time[k] / c.duration * c.n }
      const mix = wk / (cum + wk)
      for (let b = 0; b < this.nb; b++) {
        if (!c.touched[b] && cum === 0) { continue }
        c.sampleBone(b, f, tq)
        if (cum === 0) bones[b].quaternion.copy(tq)
        else bones[b].quaternion.slerp(tq, mix)
      }
      if (cum > 0) { for (let b = 0; b < this.nb; b++) if (!c.touched[b]) bones[b].quaternion.slerp(this.rig.rest[b], mix) }
      c.sampleRoot(f, tmpR)
      for (let i = 0; i < 3; i++) rt[i] = cum === 0 ? tmpR[i] : rt[i] + (tmpR[i] - rt[i]) * mix
      cum += wk
    }
    // 2) overlays
    for (const L of this.layers) {
      L.age += dt
      const c = L.clip
      L.t += dt * L.speed
      if (L.state === 'in') { L.w = Math.min(1, L.w + dt / Math.max(1e-3, L.fadeIn)); if (L.w >= 1) L.state = 'hold' }
      if (L.state === 'hold' && !L.loop && L.t >= c.duration - L.fadeOut) L.state = 'out'
      if (L.state === 'hold' && L.hold > 0 && L.age >= L.hold) L.state = 'out'
      if (L.state === 'out') { L.w = Math.max(0, L.w - dt / Math.max(1e-3, L.fadeOut)); if (L.w <= 0) L.done = true }
      if (L.w <= 0) continue
      const ph = L.loop ? (L.t % c.duration) : Math.min(L.t, c.duration - 1e-3)
      const f = ph / c.duration * c.n
      const sw = L.w * L.w * (3 - 2 * L.w)
      for (let b = 0; b < this.nb; b++) {
        const m = (L.mask ? L.mask[b] : 1) * sw
        if (m <= 0 || !c.touched[b]) continue
        c.sampleBone(b, f, tq)
        bones[b].quaternion.slerp(tq, m)
      }
      c.sampleRoot(f, tmpR)
      const mr = (L.mask ? L.mask[0] : 1) * sw
      for (let i = 0; i < 3; i++) rt[i] += (tmpR[i] - rt[i]) * mr
    }
    this.layers = this.layers.filter((l) => !l.done)
    bones[0].position.set(root.x + rt[0], root.y + rt[1], root.z + rt[2])
  }
  /** mask helper: 1 for the named bones (and optionally their descendants) */
  makeMask(names, { descendants = true, value = 1 } = {}) {
    const m = new Float32Array(this.nb)
    const mark = (b) => { m[this.rig.index[b.name]] = value; if (descendants) b.children.forEach((c) => c.isBone && mark(c)) }
    names.forEach((n) => this.rig.byName[n] && mark(this.rig.byName[n]))
    return m
  }
}
