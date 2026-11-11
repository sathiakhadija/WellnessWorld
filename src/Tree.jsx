// Ornamental cherry-blossom tree for the balcony: procedurally grown, asymmetric branching (tapered tubes, seeded), blossom clusters as ~2.5k instanced
// 5-petal flower cards (alpha-tested, per-instance pink variation) over a few hundred soft petal masses, in a lathed stone planter with trailing foliage.
// One draw call for the flowers, one for the wood, one for the planter set; ~40k triangles total.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, interactionGroups } from '@react-three/rapier'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GROUPS } from './CameraRig.jsx'

export const TREE_POS = [3.95, -0.35, -13.1]    // planter base on the balcony deck (deck top y = -0.35)

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

function taperedTube(pts, r0, r1, radial = 7) {
  const n = pts.length, pos = [], idx = [], nor = []
  const t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < n; i++) {
    t.copy(pts[Math.min(i + 1, n - 1)]).sub(pts[Math.max(i - 1, 0)]).normalize()
    a.crossVectors(Math.abs(t.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up, t).normalize(); b.crossVectors(t, a)
    const r = r0 + (r1 - r0) * (i / (n - 1))
    for (let k = 0; k < radial; k++) {
      const ang = (k / radial) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang)
      const nx = a.x * c + b.x * s, ny = a.y * c + b.y * s, nz = a.z * c + b.z * s
      pos.push(pts[i].x + nx * r, pts[i].y + ny * r, pts[i].z + nz * r); nor.push(nx, ny, nz)
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
    const a0 = i * radial + k, a1 = i * radial + ((k + 1) % radial), b0 = a0 + radial, b1 = a1 + radial
    idx.push(a0, b0, a1, a1, b0, b1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx)
  return g
}

function growTree() {
  const R = rng(11), tubes = [], anchors = []
  const jit = (v, k) => v.add(new THREE.Vector3((R() - 0.5) * k, (R() - 0.5) * k * 0.6, (R() - 0.5) * k)).normalize()
  const grow = (p, d, len, r, depth, maxDepth) => {
    const pts = [p.clone()], cur = p.clone(), dir = d.clone().normalize()
    const steps = 6
    for (let i = 0; i < steps; i++) {
      jit(dir, depth === 0 ? 0.42 : 0.75); dir.y += depth === 0 ? 0.05 : -0.02 + 0.07; dir.normalize()
      cur.addScaledVector(dir, len / steps); pts.push(cur.clone())
      if (depth >= 2 && i >= 1) anchors.push({ p: cur.clone(), w: depth })
    }
    tubes.push({ pts, r0: r, r1: r * 0.58 })
    if (depth === maxDepth) { anchors.push({ p: cur.clone(), w: 5 }); anchors.push({ p: cur.clone().addScaledVector(dir, 0.08), w: 5 }); return }
    const kids = depth === 0 ? 5 : 2 + Math.floor(R() * 2)
    for (let k = 0; k < kids; k++) {
      const f = depth === 0 ? 0.35 + 0.6 * (k / kids) + R() * 0.08 : 0.4 + R() * 0.6
      const base = pts[Math.min(steps, Math.round(f * steps))]
      const axis = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize()
      const nd = dir.clone().applyAxisAngle(axis, 0.45 + R() * 0.75)
      if (depth === 0) { nd.x += (k % 2 ? 1 : -1) * 0.5; nd.z += (R() - 0.5) * 0.9 }
      nd.y = Math.max(nd.y, -0.12 + 0.35 * (1 - depth / maxDepth))
      grow(base, nd, len * (0.62 + R() * 0.16), r * 0.58, depth + 1, maxDepth)
    }
    if (depth === 0) grow(pts[steps], dir.clone().add(new THREE.Vector3(0.1, 0.2, -0.05)), len * 0.55, r * 0.55, 1, maxDepth)   // continuation of the leader
  }
  grow(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.1, 1, 0.03), 1.25, 0.062, 0, 4)
  return { tubes, anchors }
}

function flowerTexture() {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S
  const g = cv.getContext('2d'); g.translate(S / 2, S / 2)
  for (let i = 0; i < 5; i++) {
    g.save(); g.rotate((i / 5) * Math.PI * 2)
    const grd = g.createRadialGradient(0, -14, 2, 0, -26, 34)
    grd.addColorStop(0, '#fff4f7'); grd.addColorStop(0.55, '#fdd2df'); grd.addColorStop(1, '#f5a6c0')
    g.fillStyle = grd; g.beginPath(); g.ellipse(0, -27, 17, 31, 0, 0, Math.PI * 2); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.0)'; g.restore()
  }
  g.fillStyle = '#e8648f'; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#f6d86a'; g.lineWidth = 2
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); g.stroke() }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t
}

function stoneTexture() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S
  const g = cv.getContext('2d'); g.fillStyle = '#e3d8c6'; g.fillRect(0, 0, S, S)
  const R = rng(3)
  for (let i = 0; i < 2600; i++) { const v = 150 + Math.floor(R() * 90); g.fillStyle = `rgba(${v},${v - 8},${v - 24},${0.1 + R() * 0.18})`; g.fillRect(R() * S, R() * S, 1 + R() * 3, 1 + R() * 3) }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.5); return t
}

export default function CherryTree() {
  const swayRef = useRef()
  const built = useMemo(() => {
    const { tubes, anchors } = growTree()
    const wood = mergeGeometries(tubes.map((t) => taperedTube(t.pts, t.r0, t.r1)))
    const R = rng(77)
    // flower cards: clustered at branch tips and along the finer branches, denser toward the outside of the crown
    const flowers = []
    for (const a of anchors) {
      const n = a.w === 5 ? 34 : a.w === 4 ? 22 : 11
      const spread = a.w === 5 ? 0.17 : 0.12
      for (let i = 0; i < n; i++) {
        const g = () => (R() + R() + R() - 1.5) * 0.66
        flowers.push({ p: new THREE.Vector3(a.p.x + g() * spread * 2, a.p.y + g() * spread * 1.6 - 0.02, a.p.z + g() * spread * 2), s: 0.075 + R() * 0.07 })
      }
    }
    // petal masses: soft, slightly darker blobs that fill gaps so the crown reads as dense but not solid
    const masses = anchors.filter((a) => a.w >= 4 && R() > 0.35).map((a) => ({ p: a.p.clone().add(new THREE.Vector3((R() - 0.5) * 0.1, (R() - 0.3) * 0.1, (R() - 0.5) * 0.1)), s: 0.045 + R() * 0.05 }))
    return { wood, flowers, masses }
  }, [])

  const flowerMesh = useMemo(() => {
    const tex = flowerTexture()
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, emissive: new THREE.Color('#ff8fb4'), emissiveMap: tex, emissiveIntensity: 0.1 })
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, built.flowers.length)
    const o = new THREE.Object3D(), c = new THREE.Color(), R = rng(5)
    const pal = ['#ffffff', '#ffd6e4', '#f8b4cd', '#f59bbb', '#fde7ee', '#ffc7da']
    built.flowers.forEach((f, i) => {
      o.position.copy(f.p); o.rotation.set(R() * 6.28, R() * 6.28, R() * 6.28); o.scale.setScalar(f.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(pal[Math.floor(R() * pal.length)]).multiplyScalar(0.9 + R() * 0.15))
    })
    m.frustumCulled = false
    return m
  }, [built])

  const massMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#f1a7c2', roughness: 1, emissive: '#e0709a', emissiveIntensity: 0.06 }), built.masses.length)
    const o = new THREE.Object3D(), c = new THREE.Color(), R = rng(9)
    built.masses.forEach((f, i) => {
      o.position.copy(f.p); o.rotation.set(R() * 6, R() * 6, R() * 6); o.scale.set(f.s * (0.8 + R() * 0.5), f.s * (0.6 + R() * 0.4), f.s * (0.8 + R() * 0.5)); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(['#f4b3c9', '#ee93b4', '#f7c6d6'][Math.floor(R() * 3)]))
    })
    m.frustumCulled = false
    return m
  }, [built])

  const planter = useMemo(() => {
    const prof = [[0, 0], [0.2, 0], [0.25, 0.025], [0.3, 0.14], [0.345, 0.34], [0.35, 0.5], [0.375, 0.545], [0.37, 0.58], [0.335, 0.585], [0.31, 0.55], [0, 0.55]].map(([x, y]) => new THREE.Vector2(x, y))
    const body = new THREE.LatheGeometry(prof, 40)
    const soil = new THREE.CircleGeometry(0.31, 28); soil.rotateX(-Math.PI / 2); soil.translate(0, 0.5, 0)
    // trailing foliage over the rim
    const R = rng(21), leaves = []
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, rr = 0.3 + R() * 0.1, y = 0.58 - R() * (R() > 0.6 ? 0.28 : 0.05)
      const g = new THREE.IcosahedronGeometry(1, 0); g.scale(0.022 + R() * 0.016, 0.006, 0.04 + R() * 0.025); g.rotateY(a); g.rotateZ((R() - 0.5) * 0.8); g.translate(Math.cos(a) * rr, y, Math.sin(a) * rr)
      leaves.push(g)
    }
    return { body, soil, leaves: mergeGeometries(leaves) }
  }, [])
  const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.92, color: '#f0e6d4' }), [])

  useFrame(({ clock }) => { if (swayRef.current) { const t = clock.elapsedTime; swayRef.current.rotation.z = Math.sin(t * 0.7) * 0.006; swayRef.current.rotation.x = Math.sin(t * 0.55 + 1) * 0.004 } })

  return (
    <group position={TREE_POS}>
      <mesh geometry={planter.body} material={stoneMat} castShadow receiveShadow />
      <mesh geometry={planter.soil}><meshStandardMaterial color="#3a2a22" roughness={1} /></mesh>
      <mesh geometry={planter.leaves} castShadow><meshStandardMaterial color="#4f6f3c" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <group ref={swayRef} position={[0, 0.05, 0]}>
        <mesh geometry={built.wood} castShadow><meshStandardMaterial color="#3a3532" roughness={1} side={THREE.DoubleSide} /></mesh>
        <primitive object={massMesh} />
        <primitive object={flowerMesh} />
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.3, 0.35]} position={[0, 0.3, 0]} collisionGroups={interactionGroups([GROUPS.world])} />
      </RigidBody>
    </group>
  )
}
