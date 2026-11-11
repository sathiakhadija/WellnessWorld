// Offline animation QA (no GPU needed): foot sliding, float/sink, rig contract, clip inventory.
import * as THREE from 'three'
import { buildCharacter } from '../src/character/buildCharacter.js'
import { buildHumanoidClips } from '../src/character/humanoidClips.js'
import { Animator } from '../src/character/animator.js'
import { HUMANOID_REQUIRED } from '../src/character/humanoidRig.js'
import { buildKitten } from '../src/companion/buildKitten.js'
import { buildKittenClips } from '../src/companion/kittenClips.js'
import { KITTEN_REQUIRED } from '../src/companion/kittenRig.js'

let fails = 0
const ok = (c, m, extra = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra ? '  ' + extra : '')); if (!c) fails++ }

function bodyBounds(geos, rig) {
  rig.root.updateMatrixWorld(true)
  const box = new THREE.Box3()
  for (const k of Object.keys(geos)) { const p = geos[k].attributes.position; for (let i = 0; i < p.count; i++) box.expandByPoint(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i))) }
  return box
}

// ---------- character
const C = buildCharacter()
const clips = buildHumanoidClips(C.rig)
const box = bodyBounds(C.geos, C.rig)
const H = box.max.y - box.min.y
ok(Math.abs(H - 1.57) < 0.03, 'character height ~157 cm', `(${(H * 100).toFixed(1)} cm, min y ${box.min.y.toFixed(3)})`)
ok(box.min.y > -0.005 && box.min.y < 0.01, 'soles at floor level in rest pose')
ok(HUMANOID_REQUIRED.every((n) => C.rig.index[n] !== undefined), 'humanoid rig contract: all required bones present', `(${C.rig.bones.length} bones)`)
for (const n of ['idle', 'walk', 'run', 'turnL', 'turnR', 'reach', 'pet', 'sitIdle']) ok(!!clips[n], 'clip ' + n)

function simulate(rigPack, clipsObj, setup, speed, seconds, fps = 60) {
  const rig = rigPack.rig, anim = new Animator(rig, clipsObj)
  setup(anim, speed)
  for (let i = 0; i < fps * 1.0; i++) anim.update(1 / fps)         // settle blend
  const dt = 1 / fps, rec = []
  const probes = rig.soles ? rig.soles.map((s) => ({ pts: s.pts.map(([b, v]) => [rig.byName[b], new THREE.Vector3(...v)]) })) : ['L', 'R'].map((S) => ({ pts: [[rig.byName['foot' + S], new THREE.Vector3(0, -0.086, -0.05)], [rig.byName['toe' + S], new THREE.Vector3(0, -0.04, 0.035)]] }))
  for (let i = 0; i < fps * seconds; i++) {
    anim.update(dt); rig.root.updateMatrixWorld(true)
    rec.push(probes.map((pr) => { let lo = null; for (const [b, v] of pr.pts) { const w = b.localToWorld(v.clone()); if (!lo || w.y < lo.y) lo = w } return lo }))
  }
  // lowest point of all feet each frame (float / sink) and planted-foot ground speed
  let minY = 1e9, maxLow = -1e9; const slide = []
  for (let i = 0; i < rec.length; i++) {
    const lowest = Math.min(...rec[i].map((p) => p.y)); minY = Math.min(minY, lowest); maxLow = Math.max(maxLow, lowest)
    if (i > 0) rec[i].forEach((p, k) => { if (p.y < (rig.soles ? 0.004 : 0.006) + (rig.soles && rig.__lift ? 0 : 0) && rec[i - 1][k].y < (rig.soles ? 0.004 : 0.006)) slide.push(-(p.z - rec[i - 1][k].z) / dt) })
  }
  const mean = slide.reduce((a, b) => a + b, 0) / Math.max(1, slide.length)
  const err = slide.map((s) => Math.abs(s - speed)); err.sort((a, b) => a - b)
  return { minY, maxLow, mean, p90: err[Math.floor(err.length * 0.9)] ?? 0, n: slide.length }
}
for (const [name, speed, w] of [['walk', 1.3, { walk: 1 }], ['run', 3.0, { run: 1 }]]) {
  const r = simulate(C, clips, (a, s) => { a.setBase(w, 50); a.setSpeed(name, s / clips[name].refSpeed) }, speed, 3)
  ok(r.minY > -0.012 && r.maxLow < 0.07, `character ${name}: no sinking / floating`, `(lowest sole y ${r.minY.toFixed(3)} .. ${r.maxLow.toFixed(3)} m)`)
  ok(Math.abs(r.mean - speed) / speed < 0.12, `character ${name}: planted-foot speed matches ground speed (${speed} m/s)`, `(mean ${r.mean.toFixed(2)}, p90 error ${r.p90.toFixed(2)} m/s, ${r.n} samples)`)
}
{ const r = simulate(C, clips, (a) => { a.setBase({ idle: 1 }, 50) }, 0, 8)
  ok(r.minY > -0.01 && r.maxLow < 0.03, 'character idle: feet stay on the floor', `(${r.minY.toFixed(3)} .. ${r.maxLow.toFixed(3)})`) }

// ---------- kitten
const K = buildKitten()
const kc = buildKittenClips(K.rig)
const kb = bodyBounds(K.geos, K.rig)
ok(KITTEN_REQUIRED.every((n) => K.rig.index[n] !== undefined), 'kitten rig contract', `(${K.rig.bones.length} bones)`)
ok(kb.max.y - kb.min.y < 0.36 && kb.max.y - kb.min.y > 0.2, 'kitten reads as a young cat (small)', `(${((kb.max.y - kb.min.y) * 100).toFixed(1)} cm tall incl. tail, ${((kb.max.z - kb.min.z) * 100).toFixed(1)} cm long)`)
ok(kb.min.y > -0.01 && kb.min.y < 0.02, 'kitten paws at floor level in rest pose', `(${kb.min.y.toFixed(3)})`)
for (const n of ['idle', 'walk', 'trot', 'sit', 'rest', 'lookUp', 'petReact']) ok(!!kc[n], 'kitten clip ' + n)
for (const [name, speed] of [['walk', 0.6], ['trot', 1.9]]) {
  const r = simulate(K, kc, (a, s) => { a.setBase({ [name]: 1 }, 50); a.setSpeed(name, s / kc[name].refSpeed) }, speed, 3)
  ok(r.minY > -0.01 && r.maxLow < 0.03, `kitten ${name}: no sinking / floating`, `(${r.minY.toFixed(3)} .. ${r.maxLow.toFixed(3)})`)
  console.log(`INFO kitten ${name}: planted-paw mean ground speed ${r.mean.toFixed(2)} m/s vs commanded ${speed} (${r.n} samples)`)
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0)
