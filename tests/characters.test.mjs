// Character integration unit tests (pure logic; run: node tests/characters.test.mjs)
import assert from 'node:assert/strict'
import { resolveClip, CharacterStateMachine } from '../src/characters/animStates.js'
import { CHARACTERS, byId, CLIP_ALIASES } from '../src/characters/registry.js'

const full = ['Idle', 'Walk', 'Run', 'Jump', 'Sit', 'Sleep', 'Wave', 'Cheer', 'emote_happy']
assert.equal(resolveClip(full, 'run').clip, 'Run')
assert.equal(resolveClip(full, 'emote_happy').clip, 'emote_happy')
// partial set falls back: no Run -> Walk, no Sleep -> Sit, no Cheer -> Wave, nothing -> null
assert.deepEqual(resolveClip(['Idle', 'Walk'], 'run'), { clip: 'Walk', state: 'walk' })
assert.equal(resolveClip(['Idle', 'Sit'], 'sleep').clip, 'Sit')
assert.equal(resolveClip(['Idle', 'Wave'], 'cheer').clip, 'Wave')
assert.equal(resolveClip([], 'idle').clip, null)
assert.equal(resolveClip(['IDLE_LOOP'], 'idle').clip, 'IDLE_LOOP')           // case-insensitive alias match

const sm = new CharacterStateMachine()
assert.equal(sm.next({ speed: 0 }), 'idle'); assert.equal(sm.next({ speed: 1 }), 'walk'); assert.equal(sm.next({ speed: 4 }), 'run')
sm.trigger('sit'); assert.equal(sm.next({ speed: 0 }), 'sit'); assert.equal(sm.next({ speed: 2 }), 'walk')     // moving cancels sit
assert.equal(sm.next({ speed: 0 }), 'idle')
sm.trigger('wave'); assert.equal(sm.next({ speed: 0 }), 'wave'); assert.equal(sm.next({ speed: 0 }, true), 'idle')   // one-shot returns to idle when done
assert.equal(sm.next({ speed: 0, airborne: true }), 'jump')

// registry: builtins untouched, Momo registered as gltf upright biped, placeholder is dev-only + flagged
assert.equal(byId('rabbit').kind, 'builtin'); assert.equal(CHARACTERS[0].id, 'rabbit')
assert.equal(byId('momo').kind, 'gltf'); assert.equal(byId('momo').locomotion, 'upright-biped'); assert.ok(byId('momo').url.endsWith('models/momo.glb'))
assert.ok(byId('tech_placeholder').devOnly && byId('tech_placeholder').placeholder)
for (const k of ['idle', 'walk', 'run', 'jump', 'sit', 'sleep', 'wave', 'cheer']) assert.ok(CLIP_ALIASES[k].length)
console.log('characters: all assertions passed')
