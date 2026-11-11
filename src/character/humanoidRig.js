// Reusable humanoid skeleton. Bone names are the contract shared by the clip library, IK/look-at layers and any
// replacement body mesh: a different character only has to provide a mesh skinned to these bones.
import * as THREE from 'three'

// [name, parent, [x, y, z]] in WORLD rest coordinates (metres), T/A-pose, character faces +Z, +X = character's LEFT.
export const HUMANOID_JOINTS = [
  ['hips', null, [0, 0.86, 0]],
  ['spine', 'hips', [0, 0.97, 0]],
  ['chest', 'spine', [0, 1.13, 0]],
  ['neck', 'chest', [0, 1.30, 0.005]],
  ['head', 'neck', [0, 1.345, 0.005]],
  ...['L', 'R'].flatMap((S) => {
    const s = S === 'L' ? 1 : -1
    return [
      ['clavicle' + S, 'chest', [0.05 * s, 1.27, 0]],
      ['upperArm' + S, 'clavicle' + S, [0.185 * s, 1.25, 0]],
      ['lowerArm' + S, 'upperArm' + S, [0.243 * s, 0.985, 0.005]],
      ['hand' + S, 'lowerArm' + S, [0.285 * s, 0.745, 0.01]],
      ['upperLeg' + S, 'hips', [0.088 * s, 0.84, 0]],
      ['lowerLeg' + S, 'upperLeg' + S, [0.092 * s, 0.455, 0.012]],
      ['foot' + S, 'lowerLeg' + S, [0.092 * s, 0.088, -0.005]],
      ['toe' + S, 'foot' + S, [0.092 * s, 0.04, 0.115]],
    ]
  }),
]

/** Build the Bone hierarchy. `extra` lets a character add secondary bones (hair, earrings, props). */
export function buildSkeleton(joints, scale = 1) {
  const bones = [], byName = {}, world = {}
  for (const [name, parent, p] of joints) {
    const b = new THREE.Bone(); b.name = name
    world[name] = new THREE.Vector3(p[0] * scale, p[1] * scale, p[2] * scale)
    if (parent) { byName[parent].add(b); b.position.copy(world[name]).sub(world[parent]) } else b.position.copy(world[name])
    byName[name] = b; bones.push(b)
  }
  const root = bones[0]
  root.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(bones)       // inverses computed from the rest pose
  const index = {}; bones.forEach((b, i) => { index[b.name] = i })
  const rest = bones.map((b) => b.quaternion.clone())
  const restPos = bones.map((b) => b.position.clone())
  return { root, bones, byName, index, skeleton, world, rest, restPos }
}

/** The contract any replacement character has to satisfy (checked in the audit test). */
export const HUMANOID_REQUIRED = HUMANOID_JOINTS.map((j) => j[0])
