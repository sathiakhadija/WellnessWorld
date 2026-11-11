// Camera system: third-person follow, free-fly inspection, elevated "Sims-style" inspection.
// All modes: smooth damping, eased transitions between modes, ray-cast collision against the physics colliders.
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier, interactionGroups } from '@react-three/rapier'
import * as THREE from 'three'
import { input } from './input.js'
import { camStore, toast } from './camStore.js'
import { world } from './world.js'

// Collision groups. The player collides with world + glass. Camera rays only see "world" (not glass, not the player),
// so the free camera can look through / go out past the glazing onto the balcony but never through walls or floors.
export const GROUPS = { world: 0, glass: 1, player: 2, cameraRay: 3 }
const RAY_GROUPS = interactionGroups([GROUPS.cameraRay], [GROUPS.world])

// shared with the Player component (camera-relative walking)
export const rigShared = { followYaw: 0 }

const FOV = { follow: 50, free: 62, sims: 38 }
const MARGIN = 0.3
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const damp = (c, t, k, dt) => c + (t - c) * (1 - Math.exp(-k * dt))
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10)

const FOLLOW0 = { yaw: 0, pitch: 0.30, dist: 3.0 }
const SIMS0 = { yaw: 0.55, pitch: 0.95, dist: 12 }
const FREE0 = { pos: [-1.3, 1.65, -0.6], yaw: 0, pitch: -0.05 }
const SIMS_BOUNDS = { x: [-10.2, 5.8], z: [-14, 0.3] }
const FREE_BOUNDS = { x: [-10.4, 6.4], y: [0.35, 3.5], z: [-14.8, 1.6] }

function makeState() {
  return {
    mode: 'follow',
    f: { yaw: FOLLOW0.yaw, pitch: FOLLOW0.pitch, dist: FOLLOW0.dist, sy: FOLLOW0.yaw, sp: FOLLOW0.pitch, sd: FOLLOW0.dist, eff: FOLLOW0.dist },
    s: { yaw: SIMS0.yaw, pitch: SIMS0.pitch, dist: SIMS0.dist, sy: SIMS0.yaw, sp: SIMS0.pitch, sd: SIMS0.dist, eff: SIMS0.dist,
         pivot: new THREE.Vector3(-1.2, 0.9, -4.4), spivot: new THREE.Vector3(-1.2, 0.9, -4.4) },
    x: { pos: new THREE.Vector3(...FREE0.pos), vel: new THREE.Vector3(), yaw: FREE0.yaw, pitch: FREE0.pitch, sy: FREE0.yaw, sp: FREE0.pitch, dolly: 0 },
    trans: { t: 1, p0: new THREE.Vector3(), q0: new THREE.Quaternion(), fov0: 50 },
  }
}

const _e = new THREE.Euler(0, 0, 0, 'YXZ')
const _v = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _pivot = new THREE.Vector3()
const _pos = new THREE.Vector3()
const _q = new THREE.Quaternion()

export default function CameraRig({ playerRef, playerMeshRef }) {
  const { camera, gl, scene } = useThree()
  const { world, rapier } = useRapier()
  const S = useRef(null)
  if (!S.current) S.current = makeState()
  const ceilingRef = useRef(null)

  // ---------- input wiring ----------
  useEffect(() => {
    input.attach(gl.domElement)
    const st = S.current
    const setMode = (m) => { if (camStore.get().mode !== m) { camStore.set({ mode: m }); toast({ follow: 'Follow camera', free: 'Free camera — player stays put', sims: 'Inspection view — player stays put' }[m]) } }
    const order = ['follow', 'free', 'sims']
    input.hotkeys = {
      Digit1: () => setMode('follow'), Numpad1: () => setMode('follow'),
      Digit2: () => setMode('free'),   Numpad2: () => setMode('free'),
      Digit3: () => setMode('sims'),   Numpad3: () => setMode('sims'),
      KeyC: () => setMode(order[(order.indexOf(camStore.get().mode) + 1) % 3]),
      KeyH: () => camStore.set({ help: !camStore.get().help }),
      KeyN: () => { const c = !camStore.get().collide; camStore.set({ collide: c }); toast(c ? 'Camera collision ON' : 'Camera collision OFF (no-clip)') },
      KeyT: () => { const m = camStore.get().scrollMode === 'orbit' ? 'zoom' : 'orbit'; camStore.set({ scrollMode: m }); toast(`Two-finger scroll = ${m}`) },
      KeyI: () => { const v = !camStore.get().invertScroll; camStore.set({ invertScroll: v }); toast(v ? 'Scroll direction inverted' : 'Scroll direction normal') },
      KeyR: () => resetView(st, playerRef),
      KeyF: () => { if (camStore.get().mode === 'sims') focusPlayer(st, playerRef) },
    }
    // test / debug handle (also handy in the console)
    window.__ww = {
      mode: () => camStore.get().mode,
      cam: () => ({ pos: camera.position.toArray(), fov: camera.fov }),
      player: () => { const p = playerRef.current?.translation(); return p ? [p.x, p.y, p.z] : null },
      set: (m) => setMode(m),
      teleport: (x, y, z) => { playerRef.current?.setTranslation({ x, y, z }, true); playerRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true) },   // test hook
      fastAnim: (v) => { world.fastAnim = !!v },
      setFollowYaw: (y) => { st.f.yaw = st.f.sy = y },                                                                                              // test hook
      setFree: (x, y, z, yaw, pitch, fov) => {   // jump the free camera to an exact pose (used for screenshots/tests)
        camStore.set({ mode: 'free' }); st.mode = 'free'; st.trans.t = 1
        st.x.pos.set(x, y, z); st.x.vel.set(0, 0, 0); st.x.dolly = 0
        st.x.yaw = st.x.sy = yaw; st.x.pitch = st.x.sp = pitch; st.x.fov = fov || null
      },
    }
    return () => { input.detach(); input.hotkeys = {}; delete window.__ww }
  }, [gl, camera, playerRef])

  // ---------- per-frame ----------
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const st = S.current
    const { mode, collide, scrollMode, invertScroll } = camStore.get()
    input.scrollMode = scrollMode
    input.invertScroll = invertScroll
    if (mode !== st.mode) switchMode(st, mode, camera, playerRef)

    const inp = input.consume()
    const zoomKey = (input.down('Minus') || input.down('NumpadSubtract') ? 1 : 0) - (input.down('Equal') || input.down('NumpadAdd') ? 1 : 0)
    const zoom = inp.zoom + zoomKey * 40 * dt
    const fast = input.down('ShiftLeft') || input.down('ShiftRight')
    const raw = world.raw ? world.raw() : world

    // distance from `from` along unit `dir` to the first solid world surface, or null
    const castDist = (from, dir, maxLen) => {
      const hit = raw.castRay(new rapier.Ray(from, dir), maxLen, true, undefined, RAY_GROUPS)
      return hit ? (hit.timeOfImpact ?? hit.toi) : null
    }

    // ceiling is hidden in the inspection view so you can look down into the rooms
    if (!ceilingRef.current || ceilingRef.current.length < 2) {      // main ceiling + room ceilings (they mount after the GLB loads)
      const arr = []; scene.traverse((o) => { if (o.name && o.name.startsWith('WW_Ceiling') && o.isMesh) arr.push(o) }); ceilingRef.current = arr
    }
    for (const c of ceilingRef.current) c.visible = mode !== 'sims'

    const p = playerRef.current?.translation()
    let outPos, outQuat, outFov = mode === 'free' && st.x.fov ? st.x.fov : FOV[mode]

    if (mode === 'follow' || mode === 'sims') {
      const o = mode === 'follow' ? st.f : st.s
      const lim = mode === 'follow'
        ? { pmin: -0.12, pmax: 1.25, dmin: 1.1, dmax: 7 }
        : { pmin: 0.35, pmax: 1.45, dmin: 4, dmax: 26 }
      const rot = (input.down('KeyQ') ? 1 : 0) - (input.down('KeyE') ? 1 : 0)
      o.yaw += -inp.ox * 0.0055 + rot * dt * 1.6
      o.pitch = clamp(o.pitch + inp.oy * 0.0045, lim.pmin, lim.pmax)
      o.dist = clamp(o.dist * Math.exp(zoom * 0.02), lim.dmin, lim.dmax)
      o.sy = damp(o.sy, o.yaw, 12, dt); o.sp = damp(o.sp, o.pitch, 12, dt); o.sd = damp(o.sd, o.dist, 12, dt)

      if (mode === 'follow') {
        rigShared.followYaw = o.sy
        if (p) _pivot.set(p.x, p.y + 1.3, p.z)
      } else {
        // WASD / arrows / right-drag pan the pivot; the player is NOT moved
        const fx = -Math.sin(o.sy), fz = -Math.cos(o.sy), rx = Math.cos(o.sy), rz = -Math.sin(o.sy)
        const sp = (3 + o.sd * 0.35) * (fast ? 2 : 1) * dt
        const mf = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0)
        const mr = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0)
        const k = o.sd * 0.0016
        o.pivot.x += (fx * mf + rx * mr) * sp + (-inp.px * rx + inp.py * fx) * k
        o.pivot.z += (fz * mf + rz * mr) * sp + (-inp.px * rz + inp.py * fz) * k
        o.pivot.x = clamp(o.pivot.x, SIMS_BOUNDS.x[0], SIMS_BOUNDS.x[1])
        o.pivot.z = clamp(o.pivot.z, SIMS_BOUNDS.z[0], SIMS_BOUNDS.z[1])
        o.spivot.x = damp(o.spivot.x, o.pivot.x, 10, dt); o.spivot.z = damp(o.spivot.z, o.pivot.z, 10, dt); o.spivot.y = 0.9
        _pivot.copy(o.spivot)
      }

      const cp = Math.cos(o.sp)
      _dir.set(Math.sin(o.sy) * cp, Math.sin(o.sp), Math.cos(o.sy) * cp)
      let allowed = o.sd
      if (collide) {
        const t = castDist(_pivot, _dir, o.sd + MARGIN)
        if (t !== null) allowed = Math.max(0.5, Math.min(o.sd, t - MARGIN))
      }
      o.eff = allowed < o.eff ? allowed : damp(o.eff, allowed, 3, dt)   // snap in when blocked, ease back out
      _pos.copy(_pivot).addScaledVector(_dir, o.eff)
      _e.set(-o.sp, o.sy, 0)
      outQuat = _q.setFromEuler(_e); outPos = _pos
      if (mode === 'follow' && playerMeshRef.current) playerMeshRef.current.visible = o.eff > 0.9
    } else {
      // ---------- free camera ----------
      const x = st.x
      x.yaw += inp.ox * 0.0045
      x.pitch = clamp(x.pitch + inp.oy * 0.004, -1.5, 1.5)
      x.sy = damp(x.sy, x.yaw, 14, dt); x.sp = damp(x.sp, x.pitch, 14, dt)
      const cp = Math.cos(x.sp)
      const fwd = _dir.set(-Math.sin(x.sy) * cp, Math.sin(x.sp), -Math.cos(x.sy) * cp).clone()
      const right = new THREE.Vector3(Math.cos(x.sy), 0, -Math.sin(x.sy))
      const mf = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0)
      const mr = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0)
      const mu = (input.down('KeyE') || input.down('Space') ? 1 : 0) - (input.down('KeyQ') ? 1 : 0)
      const want = new THREE.Vector3().addScaledVector(fwd, mf).addScaledVector(right, mr).addScaledVector(_v.set(0, 1, 0), mu)
      if (want.lengthSq() > 1) want.normalize()
      want.multiplyScalar(3.2 * (fast ? 3 : 1))
      x.vel.lerp(want, 1 - Math.exp(-10 * dt))

      x.dolly += -zoom * 0.05
      const dollyStep = x.dolly * (1 - Math.exp(-12 * dt)); x.dolly -= dollyStep
      const step = x.vel.clone().multiplyScalar(dt)
        .addScaledVector(fwd, dollyStep)
        .addScaledVector(right, -inp.px * 0.004)
        .addScaledVector(_v.set(0, 1, 0), inp.py * 0.004)

      for (const ax of ['x', 'y', 'z']) {       // axis-by-axis so the camera slides along walls
        let d = step[ax]
        if (d === 0) continue
        if (collide) {
          const dirv = { x: 0, y: 0, z: 0 }; dirv[ax] = Math.sign(d)
          const t = castDist(x.pos, dirv, Math.abs(d) + MARGIN)
          if (t !== null) d = Math.sign(d) * Math.min(Math.abs(d), Math.max(0, t - MARGIN))
        }
        x.pos[ax] += d
      }
      if (collide) {
        x.pos.x = clamp(x.pos.x, FREE_BOUNDS.x[0], FREE_BOUNDS.x[1])
        x.pos.y = clamp(x.pos.y, FREE_BOUNDS.y[0], FREE_BOUNDS.y[1])
        x.pos.z = clamp(x.pos.z, FREE_BOUNDS.z[0], FREE_BOUNDS.z[1])
      } else {
        x.pos.y = clamp(x.pos.y, 0.05, 60)
        x.pos.clampLength(0, 120)
      }
      _e.set(x.sp, x.sy, 0)
      outQuat = _q.setFromEuler(_e); outPos = x.pos
      if (playerMeshRef.current) playerMeshRef.current.visible = true
    }

    // ---------- eased transition between modes ----------
    const tr = st.trans
    if (tr.t < 1) {
      tr.t = Math.min(1, tr.t + dt / 0.85)
      const w = smoother(tr.t)
      camera.position.lerpVectors(tr.p0, outPos, w)
      camera.quaternion.copy(tr.q0).slerp(outQuat, w)
      camera.fov = tr.fov0 + (outFov - tr.fov0) * w
    } else {
      camera.position.copy(outPos)
      camera.quaternion.copy(outQuat)
      camera.fov = damp(camera.fov, outFov, 6, dt)
    }
    camera.updateProjectionMatrix()
  })

  return null
}

function switchMode(st, mode, camera, playerRef) {
  st.mode = mode
  st.trans.t = 0
  st.trans.p0.copy(camera.position)
  st.trans.q0.copy(camera.quaternion)
  st.trans.fov0 = camera.fov
  if (mode === 'free') {                       // continue from wherever the camera is now
    _e.setFromQuaternion(camera.quaternion, 'YXZ')
    const x = st.x
    x.pos.copy(camera.position); x.vel.set(0, 0, 0); x.dolly = 0
    x.yaw = x.sy = _e.y; x.pitch = x.sp = _e.x
  } else if (mode === 'sims') {
    focusPlayer(st, playerRef, true)
  } else if (mode === 'follow') {
    st.f.eff = Math.min(st.f.eff, st.f.sd)
  }
}

function focusPlayer(st, playerRef, snap = false) {
  const p = playerRef.current?.translation()
  if (!p) return
  st.s.pivot.set(p.x, 0.9, p.z)
  if (snap) st.s.spivot.copy(st.s.pivot)
}

function resetView(st, playerRef) {
  const mode = camStore.get().mode
  if (mode === 'follow') Object.assign(st.f, { yaw: FOLLOW0.yaw, pitch: FOLLOW0.pitch, dist: FOLLOW0.dist })
  if (mode === 'sims') { Object.assign(st.s, { yaw: SIMS0.yaw, pitch: SIMS0.pitch, dist: SIMS0.dist }); focusPlayer(st, playerRef) }
  if (mode === 'free') { st.x.pos.set(...FREE0.pos); st.x.vel.set(0, 0, 0); st.x.yaw = FREE0.yaw; st.x.pitch = FREE0.pitch }
  toast('View reset')
}
