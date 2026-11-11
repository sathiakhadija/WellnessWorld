// Kitten clip library (pose functions baked to sampled clips; see character/animator.js).
import { makeClip } from '../character/animator.js'

const TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos
const pos = (x) => Math.max(0, x)
const ease = (t) => t * t * (3 - 2 * t)

function tail(P, t, { base = 0, amp = 0.25, speed = TAU / 3, curl = 0, lift = 0 }) {
  for (let i = 0; i < 5; i++) {
    P.rot('tail' + i, -lift * (i === 0 ? 1 : 0.6) + 0.05 * i * 0 , curl * 0.35 + base + amp * sin(t * speed - i * 0.8) * (0.5 + i * 0.25), 0)
  }
}
function legs(P, ph, A, K, { front, hind }) {
  for (const [S, off] of [['L', 0], ['R', Math.PI]]) {
    // diagonal trot: fL + hR together
    const pf = ph + off, ph2 = ph + off + Math.PI
    const th = A * sin(pf), th2 = A * 1.1 * sin(ph2)
    const kf = 0.12 + K * Math.pow(pos(cos(pf + 0.4)), 1.3), kh = 0.2 + K * 1.1 * Math.pow(pos(cos(ph2 + 0.4)), 1.3)
    P.rot('fUp' + S, -th * front, 0, 0); P.rot('fLow' + S, kf * front, 0, 0); P.rot('fPaw' + S, th * front - kf * front + 0.15 * pos(-sin(pf)) , 0, 0)
    P.rot('hUp' + S, -th2 * hind + 0.05, 0, 0); P.rot('hLow' + S, kh * hind, 0, 0); P.rot('hPaw' + S, th2 * hind - kh * hind + 0.15 * pos(-sin(ph2)), 0, 0)
  }
}
function gait(P, u, t, { A, K, bounce, flex, head }) {
  const ph = u * TAU
  legs(P, ph, A, K, { front: 1, hind: 1 })
  P.rot('spine', flex * sin(ph * 2 + 0.6), 0.07 * sin(ph), 0); P.rot('chest', 0.5 * flex * sin(ph * 2 + 0.2), -0.07 * sin(ph), 0)
  P.rot('neck', -0.05 * sin(ph * 2), 0, 0); P.rot('head', head + 0.05 * sin(ph * 2 + 1), 0.04 * sin(ph), 0)
  tail(P, t, { base: 0, amp: 0.30, speed: TAU / 1.0 * (A > 0.6 ? 1.6 : 1), lift: 0.25 })
  P.rot('earL', 0, 0, 0); P.rot('earR', 0, 0, 0)
}

export function buildKittenClips(rig) {
  const C = {}
  C.idle = makeClip(rig, 'idle', 6, (P, u, t) => {
    const br = sin(t * TAU / 2.4)
    P.rot('spine', 0.015 * br, 0, 0); P.rot('chest', 0.025 * br, 0, 0)
    P.rot('neck', 0.0, 0.06 * sin(t * TAU / 6), 0); P.rot('head', 0.03 * sin(t * TAU / 6 + 1), 0.16 * sin(t * TAU / 6 + 0.5), 0.05 * sin(t * TAU / 3))
    const tw1 = pos(sin(t * TAU / 6 * 1 + 2.1) - 0.93) * 12, tw2 = pos(sin(t * TAU / 6 * 2 + 0.4) - 0.9) * 9   // occasional ear twitches
    P.rot('earL', 0, 0, -0.35 * tw1 + 0.04 * sin(t)); P.rot('earR', 0, 0, 0.35 * tw2)
    for (const S of ['L', 'R']) { P.rot('fUp' + S, 0.02, 0, 0); P.rot('hUp' + S, 0.05, 0, 0); P.rot('hLow' + S, 0.12, 0, 0); P.rot('hPaw' + S, -0.17, 0, 0) }
    tail(P, t, { base: 0, amp: 0.38, speed: TAU / 3.0, lift: 0.5 })
  }, { ground: true })
  C.walk = makeClip(rig, 'walk', 0.62, (P, u, t) => gait(P, u, t, { A: 0.8, K: 3.4, bounce: 0, flex: 0.05, head: 0.0 }), { ground: true, measure: true, group: 'loco', contactY: 0.004 })
  C.trot = makeClip(rig, 'trot', 0.42, (P, u, t) => gait(P, u, t, { A: 1.0, K: 3.4, bounce: 0, flex: 0.12, head: -0.08 }), { ground: true, measure: true, group: 'loco', contactY: 0.004, groundLift: (u) => 0.012 * Math.pow(sin(u * TAU), 2) })
  // sit: haunches down, front legs straight, head up, tail wrapped to the side
  C.sit = makeClip(rig, 'sit', 6, (P, u, t) => {
    const br = sin(t * TAU / 2.6)
    P.rot('root', -0.55, 0, 0)
    for (const S of ['L', 'R']) {
      P.rot('fUp' + S, 0.55, 0, 0); P.rot('fLow' + S, 0, 0, 0); P.rot('fPaw' + S, 0, 0, 0)
      P.rot('hUp' + S, -1.15, 0, 0); P.rot('hLow' + S, 1.9, 0, 0); P.rot('hPaw' + S, -0.75, 0, 0)
    }
    P.rot('spine', 0.1 + 0.02 * br, 0, 0); P.rot('chest', 0.15 + 0.03 * br, 0, 0)
    P.rot('neck', -0.1, 0.05 * sin(t * TAU / 6), 0); P.rot('head', -0.12, 0.2 * sin(t * TAU / 7 + 0.5), 0.04 * sin(t * TAU / 3))
    P.move(0, -0.040, -0.012)
    const tw = pos(sin(t * TAU / 6 + 2.1) - 0.93) * 12
    P.rot('earL', 0, 0, -0.35 * tw); P.rot('earR', 0, 0, 0)
    for (let i = 0; i < 5; i++) P.rot('tail' + i, 0.3, 0.55 + 0.05 * sin(t * TAU / 4 - i), 0)
  }, {})
  // rest: curled loaf, head down, tail wrapped round; slow breathing
  C.rest = makeClip(rig, 'rest', 6, (P, u, t) => {
    const br = sin(t * TAU / 3.0)
    P.rot('root', -0.05, 0, 0)
    for (const S of ['L', 'R']) {
      P.rot('fUp' + S, 1.25, 0, 0); P.rot('fLow' + S, -2.2, 0, 0); P.rot('fPaw' + S, 1.0, 0, 0)
      P.rot('hUp' + S, -1.35, 0, S === 'L' ? -0.2 : 0.2); P.rot('hLow' + S, 2.2, 0, 0); P.rot('hPaw' + S, -0.8, 0, 0)
    }
    P.rot('spine', 0.1 + 0.03 * br, 0.12, 0); P.rot('chest', 0.12 + 0.03 * br, 0.2, 0); P.rot('neck', 0.35, 0.35, 0.1); P.rot('head', 0.35, 0.2, 0.12)
    P.move(0, -0.05, 0)
    for (let i = 0; i < 5; i++) P.rot('tail' + i, 0.1, 0.8 + 0.1 * i, 0)
    P.rot('earL', 0.2, 0, 0.2); P.rot('earR', 0.2, 0, -0.2)
  }, {})
  // overlays (head/ear/tail only unless noted)
  C.lookUp = makeClip(rig, 'lookUp', 2.4, (P, u) => {
    const k = ease(Math.min(1, u / 0.25)) * (1 - ease(Math.max(0, (u - 0.75) / 0.25)))
    P.rot('neck', -0.45 * k, 0, 0.12 * k); P.rot('head', -0.40 * k, 0, 0.22 * k)
    P.rot('earL', -0.25 * k, 0, 0); P.rot('earR', -0.25 * k, 0, 0)
    P.rot('chest', -0.06 * k, 0, 0)
  }, { loop: false })
  C.petReact = makeClip(rig, 'petReact', 3.2, (P, u, t) => {
    const k = ease(Math.min(1, u / 0.18)) * (1 - ease(Math.max(0, (u - 0.85) / 0.15)))
    P.rot('chest', -0.08 * k, 0, 0); P.rot('spine', -0.04 * k, 0, 0)
    P.rot('neck', -0.30 * k, 0, 0.1 * k); P.rot('head', -0.30 * k + 0.03 * sin(t * TAU * 2.2) * k, 0.12 * k, 0.16 * k)
    P.rot('earL', 0.15 * k, 0, -0.18 * k); P.rot('earR', 0.15 * k, 0, 0.18 * k)
    for (let i = 0; i < 5; i++) P.rot('tail' + i, -0.55 * k + 0.0, 0.18 * k * sin(t * TAU * 1.2 - i * 0.9), 0)
  }, { loop: false })
  return C
}
