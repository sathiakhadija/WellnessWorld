// Placeholder avatar + cat, built from primitives at real-world proportions (avatar 1.55 m, cat 0.30 m seated) so the scale of the
// 3.8 m-high penthouse reads correctly. Styled after the reference (cream knit sweater, wide cream trousers, long dark hair with a gold clip).
// Replace with rigged GLBs later; the Player only needs a group that faces +z.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const CREAM = '#efe3d0', SWEATER = '#f2e8d8', SKIN = '#e9c3a1', HAIR = '#1c1311', SHOE = '#c9a67a', GOLD = '#d4a64a'

export const AVATAR_HEIGHT = 1.55

export function Avatar({ speedRef }) {
  const legL = useRef(), legR = useRef(), armL = useRef(), armR = useRef(), body = useRef()
  const phase = useRef(0)
  useFrame((_, dt) => {
    const sp = speedRef?.current ?? 0
    phase.current += dt * (2 + sp * 2.4)
    const amp = Math.min(sp / 3.2, 1) * 0.55
    const s = Math.sin(phase.current) * amp
    if (legL.current) { legL.current.rotation.x = s; legR.current.rotation.x = -s }
    if (armL.current) { armL.current.rotation.x = -s * 0.8; armR.current.rotation.x = s * 0.8 }
    if (body.current) body.current.position.y = Math.abs(Math.sin(phase.current)) * amp * 0.03   // tiny walking bob
  })
  return (
    <group ref={body}>
      {/* legs: pivot at the hip (y 0.80) */}
      {[[-0.085, legL], [0.085, legR]].map(([x, ref], i) => (
        <group key={i} ref={ref} position={[x, 0.80, 0]}>
          <mesh position={[0, -0.40, 0]}><cylinderGeometry args={[0.085, 0.115, 0.76, 16]} /><meshStandardMaterial color={CREAM} roughness={0.9} /></mesh>
          <mesh position={[0, -0.78, 0.04]}><boxGeometry args={[0.1, 0.05, 0.25]} /><meshStandardMaterial color={SHOE} roughness={0.6} /></mesh>
        </group>
      ))}
      {/* torso (chunky knit sweater) */}
      <mesh position={[0, 1.04, 0]} scale={[1.18, 1, 0.78]}><cylinderGeometry args={[0.14, 0.155, 0.50, 20]} /><meshStandardMaterial color={SWEATER} roughness={1} /></mesh>
      <mesh position={[0, 1.30, 0]} scale={[1.55, 0.55, 0.95]}><sphereGeometry args={[0.1, 16, 12]} /><meshStandardMaterial color={SWEATER} roughness={1} /></mesh>
      {/* arms: pivot at the shoulder (y 1.27) */}
      {[[-0.2, armL], [0.2, armR]].map(([x, ref], i) => (
        <group key={i} ref={ref} position={[x, 1.27, 0]}>
          <mesh position={[0, -0.26, 0]}><cylinderGeometry args={[0.052, 0.062, 0.52, 14]} /><meshStandardMaterial color={SWEATER} roughness={1} /></mesh>
          <mesh position={[0, -0.55, 0]}><sphereGeometry args={[0.04, 12, 10]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
        </group>
      ))}
      {/* neck + head */}
      <mesh position={[0, 1.36, 0]}><cylinderGeometry args={[0.042, 0.05, 0.08, 12]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
      <mesh position={[0, 1.45, 0.005]} scale={[0.92, 1.05, 0.95]}><sphereGeometry args={[0.105, 24, 20]} /><meshStandardMaterial color={SKIN} roughness={0.65} /></mesh>
      {/* long dark hair, bun and gold clip at the back (the avatar faces +z, so the back is -z) */}
      <mesh position={[0, 1.48, -0.018]} scale={[1, 0.95, 1]}><sphereGeometry args={[0.112, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} /><meshStandardMaterial color={HAIR} roughness={0.55} /></mesh>
      <mesh position={[0, 1.2, -0.085]} scale={[1.1, 1, 0.55]}><capsuleGeometry args={[0.1, 0.42, 8, 16]} /><meshStandardMaterial color={HAIR} roughness={0.55} /></mesh>
      <mesh position={[0, 1.52, -0.105]}><sphereGeometry args={[0.052, 14, 12]} /><meshStandardMaterial color={HAIR} roughness={0.55} /></mesh>
      <mesh position={[0, 1.50, -0.14]}><boxGeometry args={[0.07, 0.025, 0.012]} /><meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.3} /></mesh>
    </group>
  )
}

// White cat sitting, 0.30 m tall, with a pink bow (from the reference).
export function Cat({ position = [0, 0, 0], rotationY = 0 }) {
  const tail = useRef()
  useFrame(({ clock }) => { if (tail.current) tail.current.rotation.z = Math.sin(clock.elapsedTime * 1.4) * 0.12 })
  const fur = { color: '#f7f2ea', roughness: 1 }
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.115, 0]} scale={[1, 1.12, 0.92]}><sphereGeometry args={[0.115, 20, 16]} /><meshStandardMaterial {...fur} /></mesh>
      <mesh position={[0, 0.27, 0.035]}><sphereGeometry args={[0.075, 20, 16]} /><meshStandardMaterial {...fur} /></mesh>
      {[-0.045, 0.045].map((x, i) => (
        <mesh key={i} position={[x, 0.335, 0.025]} rotation={[0.15, 0, x > 0 ? -0.25 : 0.25]}><coneGeometry args={[0.028, 0.055, 4]} /><meshStandardMaterial {...fur} /></mesh>
      ))}
      <mesh position={[0, 0.215, 0.085]}><boxGeometry args={[0.05, 0.022, 0.012]} /><meshStandardMaterial color="#e48fa6" roughness={0.6} /></mesh>
      <group ref={tail} position={[0.07, 0.03, -0.1]}>
        <mesh position={[0.06, 0.02, -0.04]} rotation={[0, 0.6, 1.2]}><capsuleGeometry args={[0.028, 0.16, 6, 10]} /><meshStandardMaterial {...fur} /></mesh>
      </group>
    </group>
  )
}
