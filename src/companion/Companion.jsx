// COMPANION SYSTEM: kitten presentation + following AI wiring + interaction + AI-ready animation states.
// Three independent concerns, all separate from the player controller:
//   1. appearance/rig (buildKitten / kittenObject)   2. following brain (companionBrain + navGrid)   3. state/interaction layer (this file)
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier, interactionGroups } from '@react-three/rapier'
import * as THREE from 'three'
import { createKittenObject } from './kittenObject.js'
import { buildKittenClips } from './kittenClips.js'
import { Animator } from '../character/animator.js'
import { lookAt } from '../character/ik.js'
import { NavGrid } from './navGrid.js'
import { CompanionBrain, AI_STATES } from './companionBrain.js'
import { world } from '../world.js'
import { camStore } from '../camStore.js'
import { GROUPS } from '../CameraRig.jsx'

const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const TREE_POS = [3.95, -13.1]
const SPAWN = { x: -0.70, z: -4.48, yaw: Math.PI + 0.25 }
// door gates (rect = x0,x1,z0,z1). The entrance is never walkable for the companion.
const GATES = [
  { id: 'bedroom', rect: [-5.1, -4.2, -6.78, -5.22], isOpen: () => (world.doors.bedroom?.t ?? 0) > 0.55 },
  { id: 'bathroom', rect: [-5.1, -4.2, -10.62, -9.48], isOpen: () => (world.doors.bathroom?.t ?? 0) > 0.55 },
  { id: 'balcony', rect: [-0.36, 1.2, -12.02, -11.56], isOpen: () => (world.doors.slider?.t ?? 0) > 0.85 },
  { id: 'entrance', rect: [0.5, 1.9, -0.25, 0.62], isOpen: () => false, always: 'blocked' },
]

// AI-ready animation states: drive the kitten's body language independently of movement. A future conversational AI only calls
// setAIState(name); nothing here talks to any network or holds credentials.
const AI_PRESENT = {
  Following: { posture: null, ears: 0, tilt: 0, nod: 0, squint: 0, purr: 0, tail: 0, lookPlayer: 0 },
  Listening: { posture: 'sit', ears: -0.3, tilt: 0.16, nod: 0, squint: 0, purr: 0, tail: 0, lookPlayer: 1 },
  Thinking: { posture: 'sit', ears: -0.05, tilt: -0.22, nod: 0, squint: 0.15, purr: 0, tail: 0.2, lookPlayer: 0.2 },
  Speaking: { posture: 'sit', ears: -0.22, tilt: 0.04, nod: 1, squint: 0, purr: 0, tail: 0.1, lookPlayer: 1 },
  Happy: { posture: 'sit', ears: -0.1, tilt: 0.1, nod: 0.3, squint: 0.55, purr: 1, tail: 1, lookPlayer: 0.8 },
  Curious: { posture: 'idle', ears: -0.35, tilt: 0.25, nod: 0, squint: 0, purr: 0, tail: 0.3, lookPlayer: 1, overlay: 'lookUp' },
  Resting: { posture: 'rest', ears: 0.1, tilt: 0, nod: 0, squint: 0.8, purr: 0.3, tail: 0, lookPlayer: 0 },
}

export default function Companion() {
  const { world: rw, rapier } = useRapier()
  const { camera } = useThree()
  const holder = useRef()
  const S = useMemo(() => {
    const obj = createKittenObject()
    const clips = buildKittenClips(obj.rig)
    const anim = new Animator(obj.rig, clips)
    const grid = new NavGrid()
    const brain = new CompanionBrain(grid, { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw })
    brain.setMode('sit')
    return { obj, clips, anim, grid, brain, frames: 0, ready: false, ai: 'Following', pet: null, blinkT: 3, blink: 0, t: 0, nod: 0, tail: 0, earV: 0, tiltV: 0, purrAmt: 0, squintV: 0, aiOver: null, lastAI: null }
  }, [])
  const { obj, anim, brain, grid } = S
  const v1 = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    brain.isVisible = (x, z) => { v1.set(x, 0.15, z).project(camera); return v1.z < 1 && Math.abs(v1.x) < 1.05 && Math.abs(v1.y) < 1.05 }
    const it = {
      id: 'kitten', label: 'kitten', x: brain.x, z: brain.z, range: 1.7, penalty: 0.55,
      isOpen: () => false,
      prompt: () => (S.pet ? '' : '🐾 Pet Kitten'),
      toggle: () => { startPet(); return false },
    }
    S.it = it
    world.interactables.push(it)
    const api = {
      brain, grid, state: () => ({ x: brain.x, z: brain.z, yaw: brain.yaw, speed: brain.speed, mode: brain.mode, ai: S.ai, fade: brain.fade, pet: S.pet ? S.pet.phase : null, ready: S.ready, relocations: brain.relocations, stats: brain.stats, stuck: brain.stuckT }),
      setAIState: (n) => { if (AI_PRESENT[n]) { S.ai = n; S.lastAI = null } },
      aiStates: AI_STATES,
      petNow: () => startPet(),
      place: (x, z) => { brain.x = x; brain.z = z; brain.path = null; brain.speed = 0 },       // test hook
      hold: (v) => { S.hold = !!v },
      relocate: () => brain.relocate(world.player),
      anim, obj, world,
      pose: () => { const h = obj.rig.byName.head.getWorldPosition(new THREE.Vector3()); return h.toArray() },
      nav: (x, z) => grid.freeAt(x, z),
    }
    world.companionApi = api
    return () => { const i = world.interactables.indexOf(it); if (i >= 0) world.interactables.splice(i, 1); if (world.companionApi === api) world.companionApi = null }
  }, [])

  function startPet() {
    if (S.pet || world.playerLock || !S.ready) return
    const p = world.player
    let dx = brain.x - p.x, dz = brain.z - p.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d
    S.pet = { phase: 'face', t: 0, pin: { x: p.x + dx * 0.62, z: p.z + dz * 0.62 }, yaw: Math.atan2(dx, dz) }
    world.playerLock = true; world.faceYaw = S.pet.yaw
    if (!grid.freeAt(S.pet.pin.x, S.pet.pin.z)) S.pet.pin = { x: brain.x, z: brain.z }
    brain.pinned = S.pet.pin; brain.setMode('approach')
  }

  function buildGrid() {
    const ballShape = new rapier.Ball(0.13)
    const qid = { x: 0, y: 0, z: 0, w: 1 }
    const gr = interactionGroups([GROUPS.player], [GROUPS.world, GROUPS.glass])
    const ray = (x, z) => rw.castRay(new rapier.Ray({ x, y: 0.7, z }, { x: 0, y: -1, z: 0 }), 1.4, true, undefined, gr)
    const probe = (x, z) => {
      if (Math.hypot(x - TREE_POS[0], z - TREE_POS[1]) < 0.6) return true
      const hit = ray(x, z)
      if (!hit || Math.abs(0.7 - hit.timeOfImpact) > 0.95 || 0.7 - hit.timeOfImpact < -0.1 || 0.7 - hit.timeOfImpact > 0.18) return true   // no floor, or not flat deck/floor
      let blocked = false
      rw.intersectionsWithShape({ x, y: 0.3, z }, qid, ballShape, () => { blocked = true; return false }, undefined, gr)
      return blocked
    }
    grid.build(probe)
    grid.setGates(GATES)
    S.ready = true
  }

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, world.fastAnim ? 0.4 : 0.05)
    S.t += dt
    S.frames++
    if (!S.ready && S.frames > 12) buildGrid()
    const pl = world.player
    const cam = camStore.get()
    const clean = cam.clean
    // ----- brain
    if (S.ready && !S.hold) {
      let running = false
      brain.update(dt, pl, { running: false })
    }
    world.companion.x = brain.x; world.companion.z = brain.z
    if (S.it) { S.it.x = brain.x; S.it.z = brain.z }
    // ----- pet sequence
    const P = S.pet, ch = world.character
    if (P) {
      P.t += dt
      const dPin = Math.hypot(brain.x - P.pin.x, brain.z - P.pin.z)
      if (P.phase === 'face') {
        const faced = ch && Math.abs(Math.atan2(Math.sin((ch.group.parent?.rotation.y ?? 0) - P.yaw), Math.cos((ch.group.parent?.rotation.y ?? 0) - P.yaw))) < 0.3
        if ((faced && dPin < 0.18) || P.t > 3.2) {
          P.phase = 'petting'; P.t = 0; brain.setMode('pet'); brain.pinned = { x: brain.x, z: brain.z }
          if (ch) ch.interact('pet', { target: () => obj.rig.byName.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.035, 0)) })
          anim.play('petReact', { fadeIn: 0.35, fadeOut: 0.5 })
          S.petAI = S.ai; S.ai = 'Happy'
        }
      } else if (P.phase === 'petting') {
        if (P.t > 3.9 && !(ch && ch.isInteracting())) { P.phase = 'done' }
        else if (P.t > 5.5) P.phase = 'done'
        if (!S.pet) return
      }
      if (P.phase === 'done') {
        S.pet = null; world.playerLock = false; world.faceYaw = null; brain.pinned = null; brain.setMode('follow')
        S.happyT = 2.2
      }
    }
    if (S.happyT > 0) { S.happyT -= dt; if (S.happyT <= 0 && S.ai === 'Happy') S.ai = S.petAI && S.petAI !== 'Happy' ? S.petAI : 'Following' }
    // ----- placement
    const g = holder.current
    g.position.set(brain.x, 0, brain.z); g.rotation.y = brain.yaw
    const f = clamp(brain.fade, 0.001, 1)
    g.scale.setScalar(f); g.visible = !clean && brain.fade > 0.01
    // ----- animation state from movement + AI state
    const A = AI_PRESENT[S.ai] || AI_PRESENT.Following
    const v = brain.speed
    const moving = v > 0.06
    const wTrot = clamp((v - 0.8) / 0.9, 0, 1)
    const wWalk = clamp(v / 0.55, 0, 1) * (1 - wTrot)
    let posture = 'idle'
    if (!moving) {
      posture = A.posture || (brain.mode === 'sit' || brain.mode === 'pet' || brain.mode === 'approach' ? 'sit' : brain.mode === 'rest' ? 'rest' : 'idle')
      if (brain.mode === 'rest' && !A.posture) posture = 'rest'
    }
    const wMove = wWalk + wTrot
    const rest = 1 - wMove
    anim.setBase({ walk: wWalk, trot: wTrot, idle: posture === 'idle' ? rest : 0, sit: posture === 'sit' ? rest : 0, rest: posture === 'rest' ? rest : 0 }, 7)
    anim.setSpeed('walk', Math.max(0.2, v) / S.clips.walk.refSpeed)
    anim.setSpeed('trot', Math.max(0.2, v) / S.clips.trot.refSpeed)
    if (A.overlay && S.lastAI !== S.ai) { anim.play(A.overlay, { fadeIn: 0.3, fadeOut: 0.5 }) }
    S.lastAI = S.ai
    anim.update(dt)
    obj.rig.root.updateMatrixWorld(true)
    // ----- procedural layer: ears / head tilt / nod / lids / purr / tail excitement / look at player
    const k = 1 - Math.exp(-6 * dt)
    S.earV += (A.ears - S.earV) * k; S.tiltV += (A.tilt - S.tiltV) * k; S.squintV += (A.squint - S.squintV) * k; S.purrAmt += (A.purr - S.purrAmt) * k; S.tail += (A.tail - S.tail) * k
    S.nod += (A.nod - S.nod) * k
    const R = obj.rig.byName
    const mul = (b, x, y, z) => b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)))
    mul(R.earL, S.earV, 0, 0); mul(R.earR, S.earV, 0, 0)
    mul(R.head, S.nod * 0.07 * Math.sin(S.t * 9), 0, S.tiltV)
    for (let i = 1; i < 5; i++) mul(R['tail' + i], -S.tail * 0.12, S.tail * 0.18 * Math.sin(S.t * 9 - i), 0)
    if (S.purrAmt > 0.02) { const s = 1 + 0.012 * S.purrAmt * Math.sin(S.t * 2 * Math.PI * 24); R.chest.scale.set(1, s, 1) } else R.chest.scale.set(1, 1, 1)
    // look at the player when the state asks for it (listening, speaking, petting) or when sitting nearby
    const lp = S.pet ? 1 : A.lookPlayer || (!moving && (brain.mode === 'sit' || brain.mode === 'settle') ? 0.55 : 0)
    if (lp > 0.01) { const tgt = new THREE.Vector3(pl.x, 1.25, pl.z); lookAt(g, R.neck, R.head, [], tgt, lp * 0.8, { maxYaw: 0.9, maxPitch: 0.55 }) }
    // blink (squint holds the lids part-closed)
    S.blinkT -= dt
    if (S.blinkT <= 0) { S.blink = 0.0001; S.blinkT = 2 + Math.random() * 4 }
    let bl = 0
    if (S.blink > 0) { S.blink += dt; const p = S.blink / 0.17; bl = p < 1 ? Math.sin(p * Math.PI) : 0; if (p >= 1) S.blink = 0 }
    const closed = Math.max(bl, S.squintV, anim.isPlaying('petReact') ? 0.75 : 0)
    const rot = -0.75 + 1.75 * closed
    R.lidL.quaternion.setFromEuler(new THREE.Euler(rot, 0, 0)); R.lidR.quaternion.setFromEuler(new THREE.Euler(rot, 0, 0))
    obj.rig.root.updateMatrixWorld(true)
  })
  return <group ref={holder} position={[SPAWN.x, 0, SPAWN.z]}><primitive object={obj.group} /></group>
}
