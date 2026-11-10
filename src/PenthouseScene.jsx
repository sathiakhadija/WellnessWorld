// Wellness World - Penthouse V8 : React Three Fiber scene.
// Verified in headless Chromium (SwiftShader): GLB loads, trimesh colliders hold the player, camera modes work. See README.md.
import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import { Physics, RigidBody, CapsuleCollider, TrimeshCollider, interactionGroups } from '@react-three/rapier'
import * as THREE from 'three'
import CameraRig, { GROUPS, rigShared } from './CameraRig.jsx'
import HUD from './HUD.jsx'
import { input } from './input.js'
import { camStore } from './camStore.js'

function Penthouse({ onSpawn }) {
  const { scene } = useGLTF('/wellness_world_penthouse_v8.glb')
  const { visual, colliders } = useMemo(() => {
    const colliders = []
    scene.traverse((o) => {
      if (o.userData?.ww_collider) colliders.push(o)          // exported "extras" from Blender
      if (o.userData?.ww_role === 'player_spawn') onSpawn?.(o.getWorldPosition(new THREE.Vector3()))
      if (o.isMesh && !o.userData?.ww_collider) {
        o.castShadow = o.receiveShadow = true
        const m = o.material
        if (m?.name?.includes('Glass')) { m.transparent = true; m.opacity = 0.12; m.depthWrite = false; m.side = THREE.DoubleSide }
      }
    })
    scene.updateMatrixWorld(true)
    colliders.forEach((c) => {                                    // bake world transform into plain arrays for Rapier
      const g = c.geometry.clone().applyMatrix4(c.matrixWorld)
      c.userData.__pos = new Float32Array(g.attributes.position.array)
      c.userData.__idx = new Uint32Array(g.index.array)
      c.visible = false                                           // invisible physics-only meshes
    })
    return { visual: scene, colliders }
  }, [scene])
  return (
    <>
      <primitive object={visual} />
      {colliders.map((c) => (
        <RigidBody key={c.uuid} type="fixed" colliders={false}>
          <TrimeshCollider
            args={[c.userData.__pos, c.userData.__idx]}
            collisionGroups={interactionGroups([c.userData.ww_collider_kind === 'glass' ? GROUPS.glass : GROUPS.world])}
          />
        </RigidBody>
      ))}
    </>
  )
}

const walkDir = new THREE.Vector3()

function Player({ spawn, bodyRef, meshRef }) {
  const heading = useRef(0)
  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) return
    let speed = 0
    walkDir.set(0, 0, 0)
    if (camStore.get().mode === 'follow') {                       // free + inspect cameras never move the player
      const f = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0)
      const r = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0)
      const y = rigShared.followYaw                               // walk relative to where the camera looks
      walkDir.set(-Math.sin(y) * f + Math.cos(y) * r, 0, -Math.cos(y) * f - Math.sin(y) * r)
      if (walkDir.lengthSq()) { walkDir.normalize(); speed = input.down('ShiftLeft') || input.down('ShiftRight') ? 3.8 : 2.2 }
    }
    const lin = body.linvel()
    body.setLinvel({ x: walkDir.x * speed, y: lin.y, z: walkDir.z * speed }, true)
    if (speed > 0 && meshRef.current) {                           // turn the placeholder to face its walking direction
      const target = Math.atan2(walkDir.x, walkDir.z)
      let d = target - heading.current
      d = Math.atan2(Math.sin(d), Math.cos(d))
      heading.current += d * (1 - Math.exp(-12 * Math.min(delta, 0.05)))
      meshRef.current.rotation.y = heading.current
    }
  })
  return (
    <RigidBody ref={bodyRef} position={[spawn.x, spawn.y + 1, spawn.z]} enabledRotations={[false, false, false]} colliders={false}>
      <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} collisionGroups={interactionGroups([GROUPS.player], [GROUPS.world, GROUPS.glass])} />
      <group ref={meshRef}>
        <mesh position={[0, 0.8, 0]}><capsuleGeometry args={[0.3, 1.0]} /><meshStandardMaterial color="#f3e9dc" /></mesh>
        <mesh position={[0, 1.3, 0.27]}><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial color="#b9895a" /></mesh>
      </group>
    </RigidBody>
  )
}

export default function PenthouseScene() {
  const spawn = useMemo(() => ({ current: new THREE.Vector3(0, 0, 0) }), [])
  const bodyRef = useRef(null)
  const meshRef = useRef(null)
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows camera={{ fov: 50, near: 0.05, far: 400, position: [0, 1.7, 0] }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}>
        {/* skyline panorama rendered by the V8 script (RENDER_SKYLINE_DOME). */}
        <Suspense fallback={null}><Environment files="/wellness_world_skyline_dome.jpg" background /></Suspense>
        {/* golden-hour sun: Blender direction (0.42, 0.89, 0.16) -> three.js (x, z, -y) */}
        <directionalLight color="#ffc08a" intensity={3} position={[21, 8, -45]} castShadow shadow-mapSize={[2048, 2048]} />
        <hemisphereLight args={['#c9b8ff', '#8a5a3a', 0.6]} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.8, 0]}>
            <Penthouse onSpawn={(p) => spawn.current.copy(p)} />
            <Player spawn={spawn.current} bodyRef={bodyRef} meshRef={meshRef} />
            <CameraRig playerRef={bodyRef} playerMeshRef={meshRef} />
          </Physics>
        </Suspense>
      </Canvas>
      <HUD />
    </div>
  )
}
