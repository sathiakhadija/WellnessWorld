// Far-bank waterfront (the middle layer of the Canary Wharf composition): quay wall + lit promenade, tree rows, passenger piers with landing stages,
// warm street lamps. Real metres, same frame as Skyline.jsx. The low-rise buildings themselves come from skylineData.js (bank*).
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { EYE_ABOVE_WATER } from './skylineData.js'
import { paint } from './exteriorShading.js'
import { patchHaze, ATMO_U } from './exteriorAtmo.js'
import { LIVE } from './atmosphere.js'

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

// far-bank frontage textures (Bible s04 embankment): lit ground-floor terraces/arcade + planted promenade ribbon (lawn, paving, path inlays, planters)
function arcadeTexture() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 64; const g = cv.getContext('2d'); let sd = 11; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647 }
  g.fillStyle = '#3d3540'; g.fillRect(0, 0, 1024, 64)
  for (let x = 0; x < 1024; x += 32) {                       // bays: lit shopfront glass under a stone arcade lintel, columns between
    const lit = r() < 0.72, hue = r()
    g.fillStyle = lit ? `rgb(${255},${Math.round(196 + 36 * hue)},${Math.round(120 + 70 * hue)})` : '#4b4350'; g.fillRect(x + 3, 14, 26, 40)
    g.fillStyle = '#6a5d66'; g.fillRect(x, 0, 32, 10)         // lintel
    g.fillStyle = '#2f2a33'; g.fillRect(x, 10, 3, 54)         // column
    if (lit) { g.fillStyle = 'rgba(255,235,190,0.55)'; g.fillRect(x + 6, 18, 20, 5) }
    if (r() < 0.4) { g.fillStyle = ['#a8566a', '#6f8a6a', '#c79a4e'][(r() * 3) | 0]; g.fillRect(x + 3, 10, 26, 5) }   // awning
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(9000 / 1024 / 0.9, 1); t.anisotropy = 4; return t
}
function promenadeTexture() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 32; const g = cv.getContext('2d'); let sd = 3; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647 }
  g.fillStyle = '#9a8f95'; g.fillRect(0, 0, 1024, 32)
  let x = 0; while (x < 1024) { const w = 40 + r() * 120, lawn = r() < 0.5
    if (lawn) { g.fillStyle = r() < 0.5 ? '#5f6e46' : '#6b7a4c'; g.fillRect(x, 4, w, 24); g.fillStyle = '#7b8a58'; for (let k = 0; k < w; k += 9) g.fillRect(x + k, 6 + ((k * 7) % 18), 4, 2) }
    else { g.fillStyle = '#b4a8ad'; g.fillRect(x, 4, w, 24); g.fillStyle = '#8c8189'; g.fillRect(x, 15, w, 2) }
    g.fillStyle = '#463e4a'; g.fillRect(x + w - 2, 3, 3, 26); x += w }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(9000 / 1024 / 0.5, 1); t.anisotropy = 4; return t
}

export function Waterfront({ mirrored = false }) {
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
    // stepped plinth under the wall + stone coping, so the edge reads as masonry, not a single slab
    parts.push(paint(box(0, GROUND_Y + 0.6, QZ - 0.4, 9000, 1.2, 1.2), '#665b63')); parts.push(paint(box(0, GROUND_Y + 3.52, QZ - 1.6, 9000, 0.22, 3.4), '#b3a7ac'))
    // slender lamp standards + a taller double-arm lamp at the pier roots
    for (let x = -3700; x < 3700; x += 16) { if (R() < 0.12) continue; lamps.push(x, GROUND_Y + 7, QZ - 4.5); if (x % 32 === 0) lamps.push(x + 1.2, GROUND_Y + 6.2, QZ - 4.5) }
    for (let x = -3700; x < 3700; x += 13 + R() * 14) { if (R() < 0.22) continue; trees.push([x + (R() - 0.5) * 3, QZ - 9 - R() * 6, 5.5 + R() * 4.5]) }
    // streak copies for the mirrored layer: the lamp's reflection is smeared down the water by the swell (fading brightness)
    const lc = [], lp = []
    for (let i = 0; i < lamps.length; i += 3) for (const [dy, k] of [[0, 1], [3, 0.6], [8, 0.34], [16, 0.16]]) { lp.push(lamps[i], lamps[i + 1] + dy, lamps[i + 2]); lc.push(k, k, k) }
    return { geo: mergeGeometries(parts.map((g) => { const c = g.clone(); return c })), lamps, trees, lampStreak: lp, lampColors: lc }
  }, [])
  const treeMesh = useMemo(() => {
    const mat = patchHaze(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: mirrored, depthWrite: !mirrored }), mirrored)
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, built.trees.length)
    const o = new THREE.Object3D(), c = new THREE.Color(), R = rng(5)
    const pal = ['#4c5a36', '#5b6232', '#6a5d30', '#3f4f35', '#7a5e32', '#566338']
    built.trees.forEach(([x, z, s], i) => {
      o.position.set(x, GROUND_Y + 3.6 + s * 0.95, z); o.scale.set(s * 0.78, s * 0.95, s * 0.78); o.rotation.y = R() * 6; o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(pal[(R() * pal.length) | 0]).multiplyScalar(0.8 + R() * 0.45))
    })
    m.frustumCulled = false; m.renderOrder = mirrored ? 5 : 0; return m
  }, [built, mirrored])
  // a second, smaller canopy tier on every tree (understorey/crown variation) so the tree line reads layered rather than as one row of blobs
  const treeMesh2 = useMemo(() => {
    const mat = patchHaze(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: mirrored, depthWrite: !mirrored }), mirrored)
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, built.trees.length)
    const o = new THREE.Object3D(), c = new THREE.Color(), R = rng(19)
    const pal = ['#6f7a40', '#7d7a3c', '#5e6c3c', '#8a7a3c']
    built.trees.forEach(([x, z, s], i) => {
      o.position.set(x + (R() - 0.5) * s * 0.5, GROUND_Y + 3.6 + s * (1.45 + R() * 0.3), z + (R() - 0.5) * s * 0.3); o.scale.set(s * 0.5, s * 0.55, s * 0.5); o.rotation.y = R() * 6; o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(pal[(R() * pal.length) | 0]).multiplyScalar(0.85 + R() * 0.3))
    })
    m.frustumCulled = false; m.renderOrder = mirrored ? 5 : 0; return m
  }, [built, mirrored])
  const lampGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(mirrored ? built.lampStreak : built.lamps, 3)); if (mirrored) g.setAttribute('color', new THREE.Float32BufferAttribute(built.lampColors, 3)); return g }, [built, mirrored])
  const arcadeTex = useMemo(arcadeTexture, []), promTex = useMemo(promenadeTexture, [])
  const mats = useMemo(() => ({
    geo: patchHaze(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: mirrored, depthWrite: !mirrored }), mirrored),
    arc: patchHaze(new THREE.MeshBasicMaterial({ map: arcadeTex, toneMapped: false, transparent: mirrored, depthWrite: !mirrored }), mirrored),
    prom: patchHaze(new THREE.MeshBasicMaterial({ map: promTex, toneMapped: false, transparent: mirrored, depthWrite: !mirrored }), mirrored),
    pts: new THREE.PointsMaterial({ size: mirrored ? 2.6 : 3.2, sizeAttenuation: false, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, vertexColors: mirrored }),
  }), [mirrored, arcadeTex, promTex])
  // the lit terraces glow with the evening; riverside lamps fade in with the lamp factor; their reflection follows the same reflectivity as the buildings
  useFrame(() => {
    const lamp = Math.min(1, LIVE.lamp), win = Math.min(1, LIVE.win)
    mats.pts.opacity = mirrored ? (0.12 + 0.88 * lamp) * Math.min(1, ATMO_U.uRefl.value * 1.4) : 0.2 + 0.8 * lamp
    const k = 0.45 + 0.55 * win; mats.arc.color.setRGB(k, k * (1 - 0.06 * win), k * (1 - 0.2 * win))
    mats.prom.color.setRGB(0.6 + 0.4 * (1 - lamp * 0.5), 0.6 + 0.4 * (1 - lamp * 0.5), 0.6 + 0.4 * (1 - lamp * 0.5))
  })
  return (
    <>
      <mesh geometry={built.geo} material={mats.geo} frustumCulled={false} renderOrder={mirrored ? 5 : 0} />
      {/* lit arcade of terraces, cafés and restaurants along the whole far-bank frontage */}
      <mesh position={[0, GROUND_Y + 3.6 + 3.2, QZ - 18]} material={mats.arc} frustumCulled={false} renderOrder={mirrored ? 5 : 0}><boxGeometry args={[9000, 6.4, 0.5]} /></mesh>
      {/* planted promenade ribbon: lawn panels, paving, planters */}
      <mesh position={[0, GROUND_Y + 3.67, QZ - 11]} rotation={[-Math.PI / 2, 0, 0]} material={mats.prom} frustumCulled={false} renderOrder={mirrored ? 5 : 0}><planeGeometry args={[9000, 14]} /></mesh>
      <primitive object={treeMesh} />
      <primitive object={treeMesh2} />
      <points geometry={lampGeo} material={mats.pts} frustumCulled={false} renderOrder={mirrored ? 5 : 0} />
    </>
  )
}
