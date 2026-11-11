// Far-bank waterfront (the middle layer of the Canary Wharf composition): quay wall + lit promenade, tree rows, passenger piers with landing stages,
// warm street lamps. Real metres, same frame as Skyline.jsx. The low-rise buildings themselves come from skylineData.js (bank*).
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { EYE_ABOVE_WATER } from './skylineData.js'
import { paint } from './exteriorShading.js'

const GROUND_Y = -EYE_ABOVE_WATER
const QZ = -1004                                  // quay edge (real z)
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const box = (cx, cy, cz, sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz).translate(cx, cy, cz)

function dotTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32
  const g = cv.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(0.3, 'rgba(255,196,110,0.85)'); gr.addColorStop(1, 'rgba(255,150,60,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv)
}

export function Waterfront() {
  const dot = useMemo(dotTexture, [])
  const built = useMemo(() => {
    const R = rng(77), parts = [], lamps = [], trees = [], pierX = [-2600, -1700, -1050, -520, -150, 190, 520, 900, 1500, 2200, 3000]
    parts.push(paint(box(0, GROUND_Y + 1.6, QZ - 1.5, 9000, 3.4, 3), '#7d7078'))                    // quay wall
    parts.push(paint(box(0, GROUND_Y + 3.4, QZ - 14, 9000, 0.4, 24), '#9c8f94'))                   // paved promenade
    parts.push(paint(box(0, GROUND_Y + 3.65, QZ - 2.2, 9000, 0.5, 0.5), '#3a3640'))               // railing line along the water edge
    // piers: slim deck, handrail, lit landing stage (pontoon) with a small canopy
    for (const x of pierX) {
      const len = 34 + R() * 26
      parts.push(paint(box(x, GROUND_Y + 2.4, QZ + len / 2 - 1, 5.5, 0.5, len), '#8d8189'))
      for (const sx of [-1, 1]) parts.push(paint(box(x + sx * 2.7, GROUND_Y + 3.1, QZ + len / 2 - 1, 0.12, 0.9, len), '#34313b'))
      parts.push(paint(box(x, GROUND_Y + 1.5, QZ + len - 1, 11, 0.9, 17), '#5f5864'))             // pontoon
      parts.push(paint(box(x, GROUND_Y + 4.6, QZ + len - 1, 9, 0.3, 11), '#d8d0c6'))              // canopy roof
      for (const cx of [-4, 4]) for (const cz of [-4, 4]) parts.push(paint(box(x + cx, GROUND_Y + 3.0, QZ + len - 1 + cz, 0.16, 3, 0.16), '#2e2c36'))
      for (let t = 0; t < len; t += 7) lamps.push(x - 2.9, GROUND_Y + 4.4, QZ + t - 4)
      for (const cx of [-4, 4]) lamps.push(x + cx, GROUND_Y + 4.3, QZ + len - 1)
    }
    // lamps along the promenade (every ~16 m, with gaps), tree rows between
    for (let x = -3700; x < 3700; x += 16) { if (R() < 0.12) continue; lamps.push(x, GROUND_Y + 7, QZ - 4.5) }
    for (let x = -3700; x < 3700; x += 13 + R() * 14) { if (R() < 0.22) continue; trees.push([x + (R() - 0.5) * 3, QZ - 9 - R() * 6, 5.5 + R() * 4.5]) }
    return { geo: mergeGeometries(parts.map((g) => { const c = g.clone(); return c })), lamps, trees }
  }, [])
  const treeMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), built.trees.length)
    const o = new THREE.Object3D(), c = new THREE.Color(), R = rng(5)
    const pal = ['#4c5a36', '#5b6232', '#6a5d30', '#3f4f35', '#7a5e32', '#566338']
    built.trees.forEach(([x, z, s], i) => {
      o.position.set(x, GROUND_Y + 3.6 + s * 0.95, z); o.scale.set(s * 0.78, s * 0.95, s * 0.78); o.rotation.y = R() * 6; o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(pal[(R() * pal.length) | 0]).multiplyScalar(0.8 + R() * 0.45))
    })
    m.frustumCulled = false; return m
  }, [built])
  const lampGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(built.lamps, 3)); return g }, [built])
  return (
    <>
      <mesh geometry={built.geo} frustumCulled={false}><meshBasicMaterial vertexColors /></mesh>
      <primitive object={treeMesh} />
      <points geometry={lampGeo} frustumCulled={false}><pointsMaterial size={3.2} sizeAttenuation={false} map={dot} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    </>
  )
}
