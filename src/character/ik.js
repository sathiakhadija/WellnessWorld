// Analytic two-bone IK + look-at helpers (rig agnostic; operate on real bone world transforms).
import * as THREE from 'three'
const A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), D = new THREE.Vector3(), N = new THREE.Vector3()
const qd = new THREE.Quaternion(), qp = new THREE.Quaternion(), qw = new THREE.Quaternion(), qt = new THREE.Quaternion(), qid = new THREE.Quaternion()

function aim(bone, from, to) {                       // rotate `bone` so the world direction `from` becomes `to`
  qd.setFromUnitVectors(from, to)
  bone.parent.getWorldQuaternion(qp)
  bone.getWorldQuaternion(qw)
  qt.copy(qp).invert().multiply(qd).multiply(qw)     // parentInv * delta * boneWorld
  bone.quaternion.copy(qt)
  bone.updateMatrixWorld(true)
}

/** Reach: place `end` at world `target`. weight 0..1 blends from the current FK pose. pole = bend direction hint. */
export function twoBoneIK(root, mid, end, target, weight, pole) {
  if (weight <= 0.001) return
  const q0r = root.quaternion.clone(), q0m = mid.quaternion.clone()
  root.updateMatrixWorld(true)
  root.getWorldPosition(A); mid.getWorldPosition(B); end.getWorldPosition(Cc)
  const l1 = A.distanceTo(B), l2 = B.distanceTo(Cc)
  D.copy(target).sub(A)
  let d = D.length(); const dmax = (l1 + l2) * 0.995, dmin = Math.abs(l1 - l2) + 0.01
  d = Math.min(dmax, Math.max(dmin, d)); D.normalize()
  const a1 = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
  N.copy(pole).addScaledVector(D, -pole.dot(D)).normalize()     // pole projected orthogonal to the reach direction
  const Bn = A.clone().addScaledVector(D, Math.cos(a1) * l1).addScaledVector(N, Math.sin(a1) * l1)
  aim(root, B.clone().sub(A).normalize(), Bn.clone().sub(A).normalize())
  mid.getWorldPosition(B); end.getWorldPosition(Cc)
  const T = A.clone().addScaledVector(D, d)
  aim(mid, Cc.clone().sub(B).normalize(), T.clone().sub(B).normalize())
  if (weight < 1) { root.quaternion.slerpQuaternions(q0r, root.quaternion, weight); mid.quaternion.slerpQuaternions(q0m, mid.quaternion, weight) }
  root.updateMatrixWorld(true)
}

const fwd = new THREE.Vector3(0, 0, 1), loc = new THREE.Vector3(), eul = new THREE.Euler()
/** Look at a world point with yaw/pitch limits distributed over neck/head/eyes (additive on top of the current pose). */
export function lookAt(model, neck, head, eyes, target, weight, { maxYaw = 1.0, maxPitch = 0.5, eyeYaw = 0.35, eyePitch = 0.25 } = {}) {
  if (weight <= 0.001) return
  head.updateMatrixWorld(true)
  loc.copy(target); model.worldToLocal(loc)                      // into the character's frame (faces +Z)
  const hp = new THREE.Vector3(); head.getWorldPosition(hp); model.worldToLocal(hp)
  loc.sub(hp)
  const yaw = Math.atan2(loc.x, loc.z), pitch = Math.atan2(-loc.y, Math.hypot(loc.x, loc.z))
  const cy = Math.max(-maxYaw, Math.min(maxYaw, yaw)), cp = Math.max(-maxPitch, Math.min(maxPitch, pitch))
  const apply = (b, f, yawAmt, pitchAmt) => { eul.set(pitchAmt * f * weight, yawAmt * f * weight, 0, 'XYZ'); qd.setFromEuler(eul); b.quaternion.multiply(qd) }
  apply(neck, 0.4, cy, cp * 0.5); apply(head, 0.6, cy, cp * 0.8)
  const ey = Math.max(-eyeYaw, Math.min(eyeYaw, yaw - cy * 1.0)), ep = Math.max(-eyePitch, Math.min(eyePitch, pitch - cp))
  for (const e of eyes) if (e) { eul.set(ep * weight, ey * weight + cy * 0.0, 0, 'XYZ'); e.quaternion.setFromEuler(eul) }
}
