// Animation state machine for imported rigged characters (pure logic, unit-testable without WebGL).
// Inputs each frame: speed (m/s), airborne flag, requested one-shot/hold action. Output: the state name to play.
import { CLIP_ALIASES, CLIP_FALLBACK, ONE_SHOT, HOLD } from './registry.js'

// thresholds shared with the existing procedural walker (walk 2.5, fast 3.5, sprint 5 m/s)
export const RUN_SPEED = 3.2, WALK_SPEED = 0.15

export function resolveClip(clipNames, state, aliases = CLIP_ALIASES) {
  const lower = new Map(clipNames.map((n) => [n.toLowerCase(), n]))
  let s = state
  for (let guard = 0; guard < 6 && s; guard++) {
    for (const a of aliases[s] || [s]) if (lower.has(a.toLowerCase())) return { clip: lower.get(a.toLowerCase()), state: s }
    s = CLIP_FALLBACK[s]
  }
  return { clip: null, state: null }
}

export class CharacterStateMachine {
  constructor() { this.action = null; this.actionT = 0; this.held = null }
  trigger(name) { if (HOLD.has(name)) { this.held = name; this.action = null } else if (ONE_SHOT.has(name)) { this.action = name; this.actionT = 0 } }
  release() { this.held = null; this.action = null }
  // returns the desired state; `oneShotDone` lets the mixer report that a one-shot clip finished
  next({ speed = 0, airborne = false }, oneShotDone = false) {
    if (oneShotDone) this.action = null
    if (speed > WALK_SPEED) this.held = null                      // moving cancels sit/sleep
    if (airborne) return 'jump'
    if (this.action) return this.action
    if (this.held) return this.held
    if (speed > RUN_SPEED) return 'run'
    if (speed > WALK_SPEED) return 'walk'
    return 'idle'
  }
}
