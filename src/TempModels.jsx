// TEMPORARY stand-ins: "hot lemon girl" player (limon.glb) and cute rabbit pet (rabbit.glb). Both are static meshes (no rig), so motion is a
// procedural bob/sway/hop. The original pill avatar + geometric cat stay available via ?model=pill / ?pet=cat. GLBs were decimated with Blender
// (public/models/*.glb) from the supplied originals.
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const BASE = import.meta.env.BASE_URL || '/'
const Q = new URLSearchParams(window.location.search)
export const TEMP_PLAYER = Q.get('model') !== 'pill' && Q.get('model') !== 'v12'
export const TEMP_PET = Q.get('pet') !== 'cat' && Q.get('model') !== 'v12'

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
