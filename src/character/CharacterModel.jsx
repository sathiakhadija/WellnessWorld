// PLAYER MODEL (presentation layer). Knows nothing about physics, cameras or doors: it receives movement from the controller
// (speedRef, parent yaw) and interaction requests through `world.character`. Replace this component (or the object it builds)
// to swap the character; the controller, camera, doors and companion keep working.
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createCharacterObject } from './characterObject.js'
import { buildHumanoidClips } from './humanoidClips.js'
import { Animator, restoreRest } from './animator.js'
import { twoBoneIK, lookAt } from './ik.js'
import { world } from '../world.js'

const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const ease = (t) => t * t * (3 - 2 * t)
const WALK = 1.3, RUN = 3.0
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3()

export const INTERACTIONS = {            // framework: each interaction = overlay clip + optional IK/look target + envelope
  door: { clip: 'reach', ik: 'handR', env: (u) => ease(Math.min(1, u / 0.3)) * (1 - ease(Math.max(0, (u - 0.7) / 0.3))), mask: 'upper' },
  pet: { clip: 'pet', ik: 'handR', env: (u) => ease(Math.min(1, u / 0.22)) * (1 - ease(Math.max(0, (u - 0.82) / 0.18))), mask: null },
  look: { clip: null, ik: null },
  sit: { clip: 'sitIdle', implemented: false },       // reserved: no seat exists yet
}

export default function CharacterModel({ speedRef }) {
  const holder = useRef()
  const S = useMemo(() => {
    const obj = createCharacterObject()
    const clips = buildHumanoidClips(obj.rig)
    const anim = new Animator(obj.rig, clips)
    const upper = anim.makeMask(['spine'])
    upper[obj.rig.index.hips] = 0
    const hair = Object.fromEntries(Object.entries(obj.hairBones).map(([k, names]) => [k, { names: names.slice(1), ang: [0, 0], vel: [0, 0] }]))
    return { obj, clips, anim, upper, hair, blinkT: 2.5, blink: 0, prevHead: new THREE.Vector3(), prevVel: new THREE.Vector3(), yaw: null, lookW: 0, active: null, ikW: 0, t: 0, sinceFirst: 0 }
  }, [])
  const { obj } = S

  useEffect(() => {
    const api = {
      group: obj.group, rig: obj.rig, animator: S.anim, clips: S.clips,
      get busy() { return !!S.active },
      /** run an interaction from INTERACTIONS; target = () => Vector3 world position for IK/look */
      interact(name, { target = null, speed = 1 } = {}) {
        const I = INTERACTIONS[name]; if (!I || I.implemented === false || !I.clip) return false
        if (S.active) return false
        const L = S.anim.play(I.clip, { mask: I.mask === 'upper' ? S.upper : null, fadeIn: name === 'pet' ? 0.4 : 0.25, fadeOut: 0.3, speed })
        S.active = { name, I, L, target }
        return true
      },
      lookAt(fn) { S.lookFn = fn },
      isInteracting: () => !!S.active,
      blinkNow() { S.blinkT = 0 },
    }
    world.character = api
    return () => { if (world.character === api) world.character = null }
  }, [obj, S])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, world.fastAnim ? 0.4 : 0.05)
    const anim = S.anim, rig = obj.rig
    S.t += dt
    const speed = speedRef ? speedRef.current : 0
    const parent = holder.current?.parent
    // --- controller -> presentation: yaw rate from the parent group's rotation
    let yawRate = 0
    if (parent) { const y = parent.rotation.y; if (S.yaw !== null) { let d = y - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yawRate = d / Math.max(dt, 1e-3) } S.yaw = y }
    S.yawRate = (S.yawRate || 0) + (yawRate - (S.yawRate || 0)) * (1 - Math.exp(-10 * dt))
    // --- base state blend: idle <-> walk <-> run, turn-in-place when stationary and rotating
    const wRun = clamp((speed - WALK) / (RUN - WALK), 0, 1)
    const wWalk = clamp(speed / WALK, 0, 1) * (1 - wRun)
    let wTurn = 0
    if (speed < 0.15 && !S.active) wTurn = clamp((Math.abs(S.yawRate) - 0.5) / 1.2, 0, 1)
    const wIdle = Math.max(0, 1 - wWalk - wRun - wTurn)
    const dir = S.yawRate >= 0 ? 'turnL' : 'turnR'
    anim.setBase({ idle: wIdle, walk: wWalk, run: wRun, [dir]: wTurn }, 9)
    anim.setSpeed('walk', Math.max(0.2, speed) / S.clips.walk.refSpeed)    // timeScale = ground speed / clip stance speed: feet stay planted
    anim.setSpeed('run', Math.max(0.2, speed) / S.clips.run.refSpeed)
    anim.setSpeed('turnL', clamp(Math.abs(S.yawRate) / 2.5, 0.5, 1.8)); anim.setSpeed('turnR', clamp(Math.abs(S.yawRate) / 2.5, 0.5, 1.8))
    anim.update(dt)
    rig.root.updateMatrixWorld(true)
    // --- interaction layer: IK + look targets follow the clip envelope
    let ikW = 0
    if (S.active) {
      const A = S.active, L = A.L
      if (L.done || !anim.layers.includes(L)) { S.active = null }
      else {
        const u = Math.min(1, L.t / L.clip.duration)
        ikW = A.I.env(u)
        if (A.I.ik && A.target) {
          const tp = A.target(); if (tp) twoBoneIK(rig.byName.upperArmR, rig.byName.lowerArmR, rig.byName.handR, tp, ikW * 0.9, tmp2.set(0.6, -0.2, -0.5))
        }
      }
    }
    // --- look-at (kitten / interaction target), blended in and out
    const lf = S.lookFn ? S.lookFn() : null
    const lw = lf ? 1 : 0
    S.lookW += (lw * (lf && lf.w !== undefined ? lf.w : 1) - S.lookW) * (1 - Math.exp(-4 * dt))
    if (S.lookW > 0.01 && lf) lookAt(obj.group.parent || obj.group, rig.byName.neck, rig.byName.head, [rig.byName.eyeL, rig.byName.eyeR], lf.p, S.lookW)
    else { rig.byName.eyeL.quaternion.identity(); rig.byName.eyeR.quaternion.identity() }
    // --- blink (procedural lids): lid cap rotates about X; negative = open
    S.blinkT -= dt
    if (S.blinkT <= 0) { S.blink = 0.0001; S.blinkT = 2.2 + Math.random() * 3.8 }
    let bl = 0
    if (S.blink > 0) { S.blink += dt; const p = S.blink / 0.16; bl = p < 1 ? Math.sin(p * Math.PI) : 0; if (p >= 1) S.blink = 0 }
    const open = -0.5 + 1.65 * bl
    rig.byName.lidL.quaternion.setFromEuler(new THREE.Euler(open, 0, 0))
    rig.byName.lidR.quaternion.setFromEuler(new THREE.Euler(open, 0, 0))
    // --- hair: damped springs driven by head acceleration (local frame) + a faint idle sway
    const head = rig.byName.head
    head.getWorldPosition(tmp)
    const gp = obj.group
    const vel = tmp.clone().sub(S.prevHead).multiplyScalar(1 / Math.max(dt, 1e-3))
    const acc = vel.clone().sub(S.prevVel).multiplyScalar(1 / Math.max(dt, 1e-3))
    S.prevHead.copy(tmp); S.prevVel.copy(vel)
    if (S.sinceFirst++ > 2) {
      gp.updateWorldMatrix(true, false)
      const q = new THREE.Quaternion(); gp.getWorldQuaternion(q); acc.applyQuaternion(q.invert()); acc.clampLength(0, 18)
      const sway = Math.sin(S.t * 1.3) * 0.015
      for (const k in S.hair) {
        const h = S.hair[k]
        const stiff = 46, damp = 7.5
        const fx = acc.z * 0.012 + sway, fz = -acc.x * 0.012 - acc.y * 0.0
        h.vel[0] += (-stiff * h.ang[0] - damp * h.vel[0] + fx * 60) * dt; h.ang[0] = clamp(h.ang[0] + h.vel[0] * dt, -0.5, 0.5)
        h.vel[1] += (-stiff * h.ang[1] - damp * h.vel[1] + fz * 60) * dt; h.ang[1] = clamp(h.ang[1] + h.vel[1] * dt, -0.5, 0.5)
        h.names.forEach((nm, i) => {
          const b = rig.byName[nm]; const f = 0.55 + i * 0.3
          b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(h.ang[0] * f, 0, h.ang[1] * f * (k[0] === 'F' ? 0.6 : 1))))
        })
      }
    }
    rig.root.updateMatrixWorld(true)
  })
  return <group ref={holder}><primitive object={obj.group} /></group>
}
