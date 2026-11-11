// Animation clip library for the humanoid rig. Clips are authored as pose functions (no DCC keyframes available),
// baked to 30 fps sampled clips, ground-locked (no float/sink) and, for locomotion, calibrated against stance-foot speed
// so playback speed = ground speed / clip.refSpeed (no foot sliding).
import { makeClip } from './animator.js'

const TAU = Math.PI * 2
const sin = Math.sin, cos = Math.cos
const pos = (x) => Math.max(0, x)
const ease = (t) => t * t * (3 - 2 * t)
// forward leg/arm swing is a NEGATIVE X rotation in this rig (bones are world-aligned at rest); knees/elbows flex the opposite way
function leg(P, S, theta, knee, footExtra = 0) {
  P.rot('upperLeg' + S, -theta, 0, 0)
  P.rot('lowerLeg' + S, knee, 0, 0)
  P.rot('foot' + S, theta - knee + footExtra, 0, 0)
}
function gait(P, u, { A, K, armA, elbow, lean, bob, sway, twist, yawHead }) {
  const ph = u * TAU
  for (const [S, off, sgn] of [['L', 0, 1], ['R', Math.PI, -1]]) {
    const p = ph + off
    const theta = A * sin(p)                                    // + = forward
    const knee = 0.10 + K * Math.pow(pos(cos(p + 0.35)), 1.35)  // flexes through swing
    const toeOff = 0.38 * Math.pow(pos(-sin(p + 0.25)), 2) * (A / 0.4)   // push-off at the back of the stride
    leg(P, S, theta, knee, -toeOff * 0.0 + toeOff * 0.5)
    // arms counter-swing
    const th2 = armA * sin(p + Math.PI)
    P.rot('upperArm' + S, -th2, 0, -sgn * (0.10 + 0.04 * sin(p)))
    P.rot('lowerArm' + S, -(elbow + 0.45 * armA * pos(sin(p + Math.PI * 0.6))), 0, 0)
    P.rot('hand' + S, 0, 0, 0)
  }
  P.rot('hips', 0.02 + lean * 0.3, twist * sin(ph), sway * sin(ph))
  P.rot('spine', lean * 0.4, -twist * 0.8 * sin(ph), -sway * 0.5 * sin(ph))
  P.rot('chest', lean * 0.3, -twist * 0.9 * sin(ph), 0)
  P.rot('neck', -lean * 0.4, twist * 0.5 * sin(ph), 0)
  P.rot('head', -lean * 0.3, yawHead * sin(ph), 0)
}

export function buildHumanoidClips(rig) {
  const C = {}
  // ---- idle: breathing, weight shift, head drift (8 s loop so the motion never looks metronomic)
  C.idle = makeClip(rig, 'idle', 8, (P, u, t) => {
    const br = sin(t * TAU / 4)                                // ~15 breaths/min
    const ws = sin(t * TAU / 8)                                // slow weight shift
    P.rot('hips', 0.0, 0.015 * sin(t * TAU / 8), 0.028 * ws)
    P.rot('spine', 0.012 * br, 0, -0.018 * ws)
    P.rot('chest', 0.022 * br, 0.02 * sin(t * TAU / 8 + 1), -0.01 * ws)
    P.rot('neck', 0.01 - 0.01 * br, 0.04 * sin(t * TAU / 8 + 0.6), 0.012 * ws)
    P.rot('head', 0.015 + 0.02 * sin(t * TAU / 8 + 2), 0.10 * sin(t * TAU / 8 + 0.6) + 0.04 * sin(t * TAU / 3), 0.015 * ws)
    for (const [S, sg] of [['L', 1], ['R', -1]]) {
      const loaded = sg * ws                                  // + = leg carries the weight
      P.rot('upperLeg' + S, -0.02 + 0.03 * pos(-loaded), 0, sg * 0.01)
      P.rot('lowerLeg' + S, 0.03 + 0.07 * pos(-loaded), 0, 0)
      P.rot('foot' + S, -0.01 - 0.04 * pos(-loaded), 0, 0)
      P.rot('clavicle' + S, 0, 0, -sg * 0.02 * br)
      P.rot('upperArm' + S, 0.03 * sin(t * TAU / 4 + sg), 0, -sg * (0.07 + 0.01 * br))
      P.rot('lowerArm' + S, -0.12 - 0.02 * br, 0, 0)
      P.rot('hand' + S, 0, 0, 0)
    }
    P.move(0.012 * ws, 0, 0)
  }, { ground: true })

  // ---- walk (stance-foot calibrated), run
  C.walk = makeClip(rig, 'walk', 1.1, (P, u) => gait(P, u, { A: 0.78, K: 1.15, armA: 0.42, elbow: 0.25, lean: 0.03, bob: 0, sway: 0.045, twist: 0.12, yawHead: 0.03 }),
    { ground: true, measure: true, group: 'loco' })
  C.run = makeClip(rig, 'run', 0.72, (P, u) => gait(P, u, { A: 0.50, K: 1.9, armA: 0.85, elbow: 1.35, lean: 0.20, bob: 0, sway: 0.03, twist: 0.20, yawHead: 0.05 }),
    { ground: true, measure: true, group: 'loco', groundLift: (u) => 0.05 * Math.pow(sin(u * TAU), 2) })

  // ---- turn in place (little pivot steps); L/R differ by the leading twist of spine/head
  for (const [nm, sg] of [['turnL', 1], ['turnR', -1]]) {
    C[nm] = makeClip(rig, nm, 0.9, (P, u) => {
      const ph = u * TAU
      for (const [S, off] of [['L', 0], ['R', Math.PI]]) {
        const p = ph + off
        leg(P, S, 0.20 * sin(p), 0.05 + 0.55 * Math.pow(pos(cos(p + 0.3)), 1.4))
        P.rot('hips', 0, 0, 0.02 * sin(ph))
        P.rot('upperArm' + S, 0, 0, (S === 'L' ? -1 : 1) * 0.10)
        P.rot('lowerArm' + S, -0.2, 0, 0)
      }
      P.rot('spine', 0.0, sg * 0.10, 0); P.rot('chest', 0, sg * 0.12, 0); P.rot('neck', 0, sg * 0.18, 0); P.rot('head', 0, sg * 0.22, 0)
    }, { ground: true, group: 'turn' })
  }

  // ---- interaction clips (overlays) ----
  // reach: right arm out to the door handle / object (IK refines the hand target at runtime)
  C.reach = makeClip(rig, 'reach', 1.4, (P, u) => {
    const k = ease(Math.min(1, u / 0.3)) * (1 - ease(Math.max(0, (u - 0.7) / 0.3)))
    P.rot('chest', 0.05 * k, -0.18 * k, 0); P.rot('spine', 0.04 * k, -0.08 * k, 0)
    P.rot('clavicleR', 0, 0, 0.06 * k)
    P.rot('upperArmR', -1.30 * k, -0.05 * k, 0.25 * k)
    P.rot('lowerArmR', -0.35 * k, 0, 0)
    P.rot('handR', -0.15 * k, 0, 0)
    P.rot('head', 0.05 * k, 0.12 * k, 0)
  }, { loop: false })
  // pet: crouch + lean + stroking motion with the right hand, left hand rests on the knee
  C.pet = makeClip(rig, 'pet', 4.0, (P, u, t) => {
    const k = ease(Math.min(1, u / 0.22)) * (1 - ease(Math.max(0, (u - 0.82) / 0.18)))
    const stroke = sin(t * TAU / 0.9)
    for (const S of ['L', 'R']) {
      leg(P, S, 1.05 * k, 1.95 * k, 0)
      P.rot('upperLeg' + S, -1.05 * k, S === 'L' ? 0.05 * k : -0.05 * k, S === 'L' ? 0.08 * k : -0.08 * k)
    }
    P.rot('hips', 0.0, 0, 0)
    P.rot('spine', 0.34 * k, 0, 0); P.rot('chest', 0.28 * k, 0, 0); P.rot('neck', 0.12 * k, 0, 0); P.rot('head', 0.18 * k, 0, 0)
    P.rot('upperArmR', (-0.85 + 0.10 * stroke) * k, -0.08 * k, 0.12 * k)
    P.rot('lowerArmR', (-0.50 - 0.18 * stroke) * k, 0, 0)
    P.rot('handR', 0.30 * k * sin(t * TAU / 0.9 + 1), 0, 0)
    P.rot('upperArmL', -0.55 * k, 0, -0.1 * k); P.rot('lowerArmL', -0.7 * k, 0, 0)
  }, { loop: false, ground: true })
  // look: subtle head turn pose, additive-style overlay (head/neck only; actual aim is procedural)
  C.sitIdle = makeClip(rig, 'sitIdle', 4, (P, u, t) => {      // reserved for the future sitting interaction (not wired to any seat yet)
    for (const S of ['L', 'R']) { leg(P, S, 1.45, 1.55, 0.0) }
    P.rot('spine', 0.05, 0, 0); P.rot('head', 0.03 * sin(t * TAU / 4), 0, 0)
    P.move(0, -0.42, -0.05)
  }, { ground: false })
  return C
}
