// Wellness World - Penthouse V8 : minimal React Three Fiber scene.
// Needs:  npm i three @react-three/fiber @react-three/drei @react-three/rapier
// Put wellness_world_penthouse_v8.glb (and optionally the dome .jpg) in your /public folder.
// Verified: loads in headless Chromium (SwiftShader), trimesh colliders hold the player on the floor, WASD moves. See README.md.
import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, useKeyboardControls, KeyboardControls } from '@react-three/drei'
import { Physics, RigidBody, CapsuleCollider, TrimeshCollider } from '@react-three/rapier'
import * as THREE from 'three'

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
          <TrimeshCollider args={[c.userData.__pos, c.userData.__idx]} />
        </RigidBody>
      ))}
    </>
  )
}

function Player({ spawn }) {
  const body = useRef()
  const [, get] = useKeyboardControls()
  useFrame((state) => {
    if (!body.current) return
    const { forward, back, left, right } = get()
    const v = new THREE.Vector3((right ? 1 : 0) - (left ? 1 : 0), 0, (back ? 1 : 0) - (forward ? 1 : 0))
    if (v.lengthSq()) v.normalize().multiplyScalar(2.2)
    const lin = body.current.linvel()
    body.current.setLinvel({ x: v.x, y: lin.y, z: v.z }, true)
    const p = body.current.translation()
    state.camera.position.lerp(new THREE.Vector3(p.x, p.y + 1.9, p.z + 2.6), 0.1)
    state.camera.lookAt(p.x, p.y + 1.2, p.z)
  })
  return (
    <RigidBody ref={body} position={[spawn.x, spawn.y + 1, spawn.z]} enabledRotations={[false, false, false]} colliders={false}>
      <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} />
      <mesh position={[0, 0.8, 0]}><capsuleGeometry args={[0.3, 1.0]} /><meshStandardMaterial color="#f3e9dc" /></mesh>
    </RigidBody>
  )
}

export default function PenthouseScene() {
  const spawn = useMemo(() => ({ current: new THREE.Vector3(0, 0, 0) }), [])
  const map = [
    { name: 'forward', keys: ['ArrowUp', 'KeyW'] }, { name: 'back', keys: ['ArrowDown', 'KeyS'] },
    { name: 'left', keys: ['ArrowLeft', 'KeyA'] }, { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  ]
  return (
    <KeyboardControls map={map}>
      <Canvas shadows camera={{ fov: 50, position: [0, 1.7, 0] }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}>
        {/* skyline panorama rendered by the V8 script (RENDER_SKYLINE_DOME). If it is missing, remove this line. */}
        <Suspense fallback={null}><Environment files="/wellness_world_skyline_dome.jpg" background /></Suspense>
        {/* golden-hour sun: Blender direction (0.42, 0.89, 0.16) -> three.js (x, z, -y) */}
        <directionalLight color="#ffc08a" intensity={3} position={[21, 8, -45]} castShadow shadow-mapSize={[2048, 2048]} />
        <hemisphereLight args={['#c9b8ff', '#8a5a3a', 0.6]} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.8, 0]}>
            <Penthouse onSpawn={(p) => spawn.current.copy(p)} />
            <Player spawn={spawn.current} />
          </Physics>
        </Suspense>
      </Canvas>
    </KeyboardControls>
  )
}
