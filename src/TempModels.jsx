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

// The rabbit as the PLAYER: 0.55 m tall, procedural hop gait (static mesh): hops get faster/longer with speed, squash on landing, lean into the run.
export const RABBIT_PLAYER_HEIGHT = 0.55
export function RabbitPlayer({ speedRef }) {
  const obj = useNormalised(`${BASE}models/rabbit.glb`, RABBIT_PLAYER_HEIGHT, 0)
  const g = useRef(), ph = useRef(0), idle = useRef(0)
  useFrame((_, dt) => {
    if (!g.current) return
    const sp = speedRef?.current ?? 0
    const k = Math.min(sp / 5, 1)                                  // 0 idle .. 1 full sprint
    if (sp > 0.05) {
      ph.current += dt * (6 + sp * 2.6)                              // hop frequency rises with speed (walk ~3 Hz, sprint ~3.2+ Hz)
      const s = Math.sin(ph.current)
      const lift = Math.max(0, s)                                    // airborne half of the cycle
      g.current.position.y = lift * (0.07 + 0.16 * k)                // hop height
      g.current.rotation.x = 0.1 + 0.22 * k * (s > 0 ? 1 : 0.3)      // lean forward into the hop
      const land = Math.max(0, -s)                                   // grounded half: squash
      g.current.scale.set(1 + land * 0.06, 1 - land * 0.1 + lift * 0.06, 1 + land * 0.06)
    } else {                                                         // idle: slow breathing + occasional small hop
      idle.current += dt
      g.current.position.y = Math.max(0, Math.sin(idle.current * 1.1)) ** 8 * 0.05
      g.current.rotation.x *= 0.85
      const b = 1 + Math.sin(idle.current * 2.2) * 0.012
      g.current.scale.set(1, b, 1)
    }
  })
  return <group ref={g}><primitive object={obj} /></group>
}
