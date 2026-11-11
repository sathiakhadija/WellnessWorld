// Look-dev studio (?studio=character|kitten|pair). Neutral backdrop, orbit camera, fixed views for the audit screenshots.
import React, { useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createCharacterObject } from '../character/characterObject.js'
import { createKittenObject } from '../companion/kittenObject.js'

const Q = new URLSearchParams(window.location.search)
const mode = Q.get('studio')

function View() {
  const { camera } = useThree()
  useEffect(() => {
    const view = Q.get('view') || 'front'
    const V = {
      front: [0, 0.82, 3.2, 0, 0.8, 0, 32], side: [3.2, 0.82, 0, 0, 0.8, 0, 32], rear: [0, 0.82, -3.2, 0, 0.8, 0, 32],
      face: [0.0, 1.46, 0.62, 0, 1.45, 0, 30], kfront: [0, 0.2, 0.75, 0, 0.16, 0, 30], kface: [0.1, 0.22, 0.42, 0, 0.2, 0.14, 30], kside: [0.8, 0.2, 0.1, 0, 0.15, 0, 30], kback: [-0.3, 0.3, -0.7, 0, 0.15, -0.1, 30], pair: [0.9, 0.8, 2.6, 0.3, 0.55, 0, 34], face34: [0.38, 1.48, 0.5, 0, 1.44, 0, 30], torso: [0, 1.2, 1.5, 0, 1.15, 0, 34],
    }[view] || [0, 0.82, 3.2, 0, 0.8, 0, 32]
    camera.position.set(V[0], V[1], V[2]); camera.lookAt(V[3], V[4], V[5]); camera.fov = V[6]; camera.updateProjectionMatrix()
  }, [])
  return null
}

function Kit({ x = 0, s = 1 }) {
  const obj = useMemo(() => createKittenObject(), [])
  return <primitive object={obj.group} position={[x, 0, 0]} scale={s} />
}

function Char() {
  const obj = useMemo(() => createCharacterObject(), [])
  return <primitive object={obj.group} />
}

export default function Studio() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#c9b7a6' }}>
      <Canvas shadows camera={{ fov: 32, near: 0.05, far: 100 }} gl={{ toneMapping: THREE.NeutralToneMapping, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#cdbcab']} />
        <hemisphereLight args={['#fff0e0', '#e8d4bc', 1.1]} />
        <directionalLight position={[2.5, 3.5, 3]} intensity={3.2} color="#ffe2c4" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2} shadow-camera-bottom={-2} />
        <directionalLight position={[-3, 2, -2]} intensity={1.0} color="#b8c8ff" />
        <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[20, 20]} /><meshStandardMaterial color="#d8c6b4" roughness={0.9} /></mesh>
        <View />
        {mode !== 'kitten' && <Char />}
        {mode === 'kitten' && <Kit />}
        {mode === 'pair' && <Kit x={0.55} />}
      </Canvas>
    </div>
  )
}
