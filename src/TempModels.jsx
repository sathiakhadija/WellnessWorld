// TEMPORARY stand-ins: "hot lemon girl" player (limon.glb) and cute rabbit pet (rabbit.glb). Both are static meshes (no rig), so motion is a
// procedural bob/sway/hop. The original pill avatar + geometric cat stay available via ?model=pill / ?pet=cat. GLBs were decimated with Blender
// (public/models/*.glb) from the supplied originals.
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const BASE = import.meta.env.BASE_URL || '/'
const Q = new URLSearchParams(window.location.search)
// Player model: default = the rabbit (playable pet). ?model=lemon brings back the lemon girl, ?model=pill the original pill avatar, ?model=v12 the experimental rig.
const MODEL = Q.get('model') || 'rabbit'
export const PLAYER_KIND = ['rabbit', 'lemon', 'pill', 'v12'].includes(MODEL) ? MODEL : 'rabbit'
export const TEMP_PLAYER = PLAYER_KIND === 'lemon' || PLAYER_KIND === 'rabbit'
// the standalone idle pet only shows when the player is NOT the rabbit (otherwise there would be two rabbits)
export const TEMP_PET = PLAYER_KIND !== 'rabbit' && Q.get('pet') !== 'cat' && PLAYER_KIND !== 'v12'

// scale a model to `height` metres, feet on y=0, centred on x/z, then rotate by `faceFix` about y so it faces +z
function useNormalised(url, height, faceFix) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const root = scene.clone(true)
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false } })
    const box = new THREE.Box3().setFromObject(root)
    const s = height / (box.max.y - box.min.y)
    const c = box.getCenter(new THREE.Vector3())
    const inner = new THREE.Group(); inner.add(root)
    root.position.set(-c.x, -box.min.y, -c.z); const g = new THREE.Group(); g.add(root); g.scale.setScalar(s)
    const out = new THREE.Group(); out.add(g); out.rotation.y = faceFix
    return out
  }, [scene, height, faceFix])
}

export const LIMON_HEIGHT = 1.62
export function LemonGirl({ speedRef }) {
  const obj = useNormalised(`${BASE}models/limon.glb`, LIMON_HEIGHT, 0)
  const ph = useRef(0), body = useRef()
  useFrame((_, dt) => {
    const sp = speedRef?.current ?? 0
    ph.current += dt * (2 + sp * 2.4)
    const amp = Math.min(sp / 3.2, 1)
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(ph.current)) * amp * 0.035
      body.current.rotation.z = Math.sin(ph.current) * amp * 0.05
      body.current.rotation.x = amp * 0.04
    }
  })
  return <group ref={body}><primitive object={obj} /></group>
}

export const RABBIT_HEIGHT = 0.34
export function Rabbit({ position = [0, 0, 0], rotationY = 0 }) {
  const obj = useNormalised(`${BASE}models/rabbit.glb`, RABBIT_HEIGHT, 0)
  const g = useRef()
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    g.current.position.y = Math.max(0, Math.sin(t * 1.1)) ** 8 * 0.04       // idle hop
    g.current.rotation.z = Math.sin(t * 0.9) * 0.03
  })
  return <group position={position} rotation={[0, rotationY, 0]}><group ref={g}><primitive object={obj} /></group></group>
}

// The rabbit as the PLAYER: rigged-by-parts (assets/blender/make_rabbit_rig.py splits the supplied GLB into body/head/ears/arms/feet/tail with joint pivots)
// and driven by a procedural run cycle: alternating legs + counter-swinging arms, forward lean, bouncing body with a flight phase when sprinting,
// ears streaming back and flopping, tail bob. Gait amplitude/frequency follow the speed (walk 2.5 .. fast 3.5 .. sprint 5 m/s).
export const RABBIT_PLAYER_HEIGHT = 0.55
export function RabbitPlayer({ speedRef }) {
  const { scene } = useGLTF(`${BASE}models/rabbit_rig.glb`)
  const rig = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false } })
    const box = new THREE.Box3().setFromObject(root)
    const k = RABBIT_PLAYER_HEIGHT / (box.max.y - box.min.y), c = box.getCenter(new THREE.Vector3())
    const inner = new THREE.Group(); inner.add(root); root.position.set(-c.x, -box.min.y, -c.z)
    const outer = new THREE.Group(); outer.add(inner); inner.scale.setScalar(k)
    const n = (name) => root.getObjectByName(name)
    const parts = { body: n('rabbit_body'), head: n('rabbit_head'), earL: n('ear_L'), earR: n('ear_R'), armL: n('arm_L'), armR: n('arm_R'), footL: n('foot_L'), footR: n('foot_R'), tail: n('tail') }
    const rest = {}; for (const [kk, o] of Object.entries(parts)) if (o) rest[kk] = o.rotation.clone()
    const restBody = parts.body ? parts.body.position.clone() : null
    return { outer, inner, parts, rest, restBody, k }
  }, [scene])
  const ph = useRef(0), t = useRef(0), lean = useRef(0), blend = useRef(0)
  useFrame((_, dt) => {
    const { parts: P, rest: R, inner, restBody } = rig
    const sp = speedRef?.current ?? 0
    t.current += dt
    const run = Math.min(sp / 5, 1)                                    // 0..1 (1 = sprint)
    blend.current += ((sp > 0.05 ? 1 : 0) - blend.current) * Math.min(1, dt * 9)   // smooth idle<->run blend
    const b = blend.current
    if (sp > 0.05) ph.current += dt * (9 + sp * 2.4)
    const s = Math.sin(ph.current), c = Math.cos(ph.current)
    const swing = (0.55 + 0.75 * run) * b
    const set = (o, key, dx = 0, dy = 0, dz = 0) => { if (o) o.rotation.set(R[key].x + dx, R[key].y + dy, R[key].z + dz) }
    set(P.footL, 'footL', s * swing * 1.1); set(P.footR, 'footR', -s * swing * 1.1)                       // legs alternate
    set(P.armL, 'armL', -s * swing * 1.25); set(P.armR, 'armR', s * swing * 1.25)                         // arms counter-swing
    const idleBreath = Math.sin(t.current * 2.2) * 0.012
    set(P.head, 'head', (-0.05 - 0.12 * run) * b + Math.sin(ph.current * 2) * 0.04 * b, 0, Math.sin(ph.current) * 0.05 * b)   // head nods with each stride
    const flop = Math.sin(ph.current * 2 - 0.9) * 0.18 * b
    set(P.earL, 'earL', (0.25 + 0.55 * run) * b + flop, 0, 0.08 * b * run); set(P.earR, 'earR', (0.25 + 0.55 * run) * b + flop * 0.9, 0, -0.08 * b * run)   // ears stream back + flop
    if (P.tail) set(P.tail, 'tail', Math.abs(s) * 0.25 * b, Math.sin(ph.current) * 0.3 * b)
    // body: forward lean + bounce (flight phase grows with speed) ; idle = slow breathing
    lean.current += ((0.1 + 0.28 * run) * b - lean.current) * Math.min(1, dt * 8)
    inner.rotation.x = lean.current
    const y = Math.max(0, Math.abs(c)) * (0.01 + 0.06 * run) * b                                         // whole-body lift (airborne at a sprint)
    rig.outer.position.y = y
    const sq = 1 + idleBreath * (1 - b)
    inner.scale.setScalar(rig.k)
    inner.scale.y = rig.k * sq
  })
  return <primitive object={rig.outer} />
}
