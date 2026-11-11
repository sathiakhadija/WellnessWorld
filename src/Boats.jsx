// Passenger boats on the Thames: a Thames-Clipper-style catamaran commuter and a white sightseeing cruiser, built from extruded hull / deck outlines,
// a lit window band, wheelhouse, railings, masts and running lights, with a foam wake and a soft reflected light path. Authored in real metres in the
// skyline group (see Skyline.jsx); shading is baked into vertex colours so they sit in the same golden-hour light as the rest of the exterior.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { EYE_ABOVE_WATER } from './skylineData.js'
import { SUN, paint } from './exteriorShading.js'

const GROUND_Y = -EYE_ABOVE_WATER

// plan outline (x = along the boat, +x = bow; y = across) extruded upward `h`, base at y0
function slab(points, h, y0) {
  const sh = new THREE.Shape(); points.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)))
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 6 })
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g
}
const hullOutline = (L, W, bow = 0.36, round = 0) => {            // pointed bow, square-ish transom
  const hl = L / 2, hw = W / 2
  return [[-hl, -hw * 0.92], [hl - L * bow, -hw], [hl - L * bow * 0.35, -hw * 0.72], [hl, -hw * 0.12], [hl, hw * 0.12], [hl - L * bow * 0.35, hw * 0.72], [hl - L * bow, hw], [-hl, hw * 0.92]]
}
const box = (cx, cy, cz, sx, sy, sz) => new THREE.BoxGeometry(sx, sy, sz).translate(cx, cy, cz)

function windowTexture(seed, lit) {
  const W = 256, H = 32, cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d'); let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  g.fillStyle = '#1b1d2c'; g.fillRect(0, 0, W, H)
  for (let x = 2; x < W; x += 16) {
    const on = r() < lit
    g.fillStyle = on ? `rgb(255,${205 + Math.floor(r() * 35)},${130 + Math.floor(r() * 50)})` : '#39405c'
    g.fillRect(x, 4, 13, H - 9)
    if (!on) { g.fillStyle = 'rgba(255,190,160,0.35)'; g.fillRect(x, 4, 13, 7) }          // sunset sky reflected in the glass
  }
  const t = new THREE.CanvasTexture(g.canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t
}

// returns { body: Geometry (vertex coloured), glass: [{geo, tex}], lights: [x,y,z, r,g,b ...] }
function buildBoat(type, heading) {
  const sun = SUN.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -heading)       // light direction in the boat's own frame
  const parts = []
  const add = (geo, hex, k = 1) => parts.push(paint(geo, hex, k, sun))
  let L, W, tex
  if (type === 'clipper') {
    L = 40; W = 9
    add(slab(hullOutline(L, W, 0.34), 2.0, -0.6), '#1d2a4c')                                        // navy hull
    add(slab(hullOutline(L * 0.97, W * 0.96, 0.34), 0.35, 1.4), '#f3eee6')                          // white gunwale band
    add(slab(hullOutline(L * 0.74, W * 0.86, 0.30).map(([x, z]) => [x - L * 0.09, z]), 2.5, 1.75), '#f1ece4')   // main cabin
    add(slab(hullOutline(L * 0.46, W * 0.74, 0.26).map(([x, z]) => [x - L * 0.2, z]), 2.3, 4.25), '#efe9e0')   // upper deck cabin
    add(box(-L * 0.2, 6.65, 0, L * 0.5, 0.18, W * 0.8), '#cfd3da')                                  // roof overhang
    add(box(L * 0.02, 6.2, 0, 3.4, 1.6, W * 0.5), '#e7e1d8')                                        // wheelhouse
    add(box(-L * 0.22, 7.5, 0, 0.18, 2.2, 0.18), '#9aa0ac'); add(box(-L * 0.22, 8.4, 0, 1.5, 0.12, 0.12), '#9aa0ac')   // mast + radar
    add(box(-L * 0.41, 1.35, 0, 1.0, 1.2, W * 0.5), '#ece6dc')                                      // stern housing
    add(slab([[-L * 0.5, -W * 0.34], [-L * 0.46, -W * 0.34], [-L * 0.46, W * 0.34], [-L * 0.5, W * 0.34]], 0.9, 1.7), '#d7413a')     // red transom stripe
    tex = [windowTexture(3, 0.7), windowTexture(8, 0.55)]
  } else {
    L = 32; W = 8
    add(slab(hullOutline(L, W, 0.30), 1.8, -0.5), '#f1ece5')                                         // white hull
    add(slab(hullOutline(L, W * 1.0, 0.30), 0.25, 1.2), '#2a3350')                                    // navy sheer line
    add(slab(hullOutline(L * 0.70, W * 0.84, 0.24).map(([x, z]) => [x - L * 0.06, z]), 2.5, 1.45), '#d9d6d2')   // glazed saloon
    add(box(-L * 0.06, 4.05, 0, L * 0.70, 0.2, W * 0.88), '#f4efe8')                                 // saloon roof = open top deck
    for (const sz of [-1, 1]) {                                                                       // top-deck railing + canopy posts
      add(box(-L * 0.06, 4.65, sz * W * 0.43, L * 0.68, 0.06, 0.06), '#ecece8')
      for (let i = 0; i < 9; i++) add(box(-L * 0.06 - L * 0.32 + i * (L * 0.64 / 8), 4.35, sz * W * 0.43, 0.05, 0.6, 0.05), '#d8d8d4')
    }
    add(box(-L * 0.1, 5.9, 0, L * 0.34, 0.14, W * 0.7), '#e9e3d6')                                    // canopy
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(box(-L * 0.1 + sx * L * 0.15, 5.0, sz * W * 0.32, 0.07, 1.7, 0.07), '#c8c8c6')
    add(box(L * 0.2, 4.7, 0, 3.0, 1.4, W * 0.4), '#f1ece4')                                          // wheelhouse
    add(box(-L * 0.38, 3.0, 0, 0.9, 1.9, 0.9), '#2d2f3c')                                            // funnel
    tex = [windowTexture(5, 0.8), windowTexture(21, 0.7)]
  }
  const body = mergeGeometries(parts.map((g) => { const c = g.clone(); if (!c.attributes.uv) c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2)); return c }))
  // window bands on both sides of the cabins (thin planes just proud of the walls)
  const glass = []
  const band = (xc, len, y, h, hw, t) => {
    for (const sz of [-1, 1]) {
      const g = new THREE.PlaneGeometry(len, h); g.translate(xc, y, 0); if (sz < 0) g.rotateY(Math.PI)
      g.translate(0, 0, sz * hw)
      g.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = v * (len / 4.2) })
      glass.push({ geo: g, tex: t })
    }
  }
  if (type === 'clipper') { band(-L * 0.09, L * 0.70, 3.0, 1.05, W * 0.43 + 0.02, tex[0]); band(-L * 0.2, L * 0.43, 5.4, 0.95, W * 0.37 + 0.02, tex[1]) }
  else band(-L * 0.06, L * 0.66, 2.7, 1.15, W * 0.42 + 0.02, tex[0])
  const lights = [[L * 0.46, 2.2, W * 0.28, 0.2, 1.0, 0.3], [L * 0.46, 2.2, -W * 0.28, 1.0, 0.2, 0.2], [-L * 0.2, 9.3, 0, 1, 0.95, 0.85]]
  return { body, glass, lights, L, W }
}

let wakeTex
function wakeTexture() {
  if (wakeTex) return wakeTex
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256
  const g = cv.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256)
  gr.addColorStop(0, 'rgba(255,238,220,0.85)'); gr.addColorStop(0.35, 'rgba(255,225,200,0.38)'); gr.addColorStop(1, 'rgba(255,220,200,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256)
  g.globalCompositeOperation = 'destination-in'
  const m = g.createLinearGradient(0, 0, 128, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.5, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = m; g.fillRect(0, 0, 128, 256)
  g.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 38; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * 128, Math.random() * 256, 1 + Math.random() * 2, 5 + Math.random() * 18) }
  wakeTex = new THREE.CanvasTexture(cv); wakeTex.colorSpace = THREE.SRGBColorSpace; return wakeTex
}
let glowTex
function reflectTexture() {
  if (glowTex) return glowTex
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256
  const g = cv.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256)
  gr.addColorStop(0, 'rgba(255,190,110,0.28)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256)
  g.globalCompositeOperation = 'destination-in'
  const m = g.createLinearGradient(0, 0, 64, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.5, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, 64, 256)
  g.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 14 + i * 20 + Math.random() * 6, 64, 3) }
  glowTex = new THREE.CanvasTexture(cv); glowTex.colorSpace = THREE.SRGBColorSpace; return glowTex
}

function Boat({ type, z, x0, speed, scale = 1, phase = 0 }) {
  const outer = useRef(), hull = useRef()
  const heading = speed < 0 ? Math.PI : 0
  const b = useMemo(() => buildBoat(type, heading), [type, heading])
  const wake = useMemo(wakeTexture, []), refl = useMemo(reflectTexture, [])
  const lightGeo = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.lights.flatMap((l) => l.slice(0, 3)), 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.lights.flatMap((l) => l.slice(3)), 3)); return g
  }, [b])
  const glassMats = useMemo(() => b.glass.map((q) => new THREE.MeshBasicMaterial({ map: q.tex, toneMapped: false, color: '#ffe6c4', side: THREE.DoubleSide })), [b])
  useFrame(({ clock }) => {
    if (!outer.current) return
    const span = 1900, t = ((x0 + speed * clock.elapsedTime + span) % (2 * span) + 2 * span) % (2 * span) - span
    outer.current.position.x = t
    if (hull.current) { hull.current.position.y = Math.sin(clock.elapsedTime * 0.8 + phase) * 0.12; hull.current.rotation.x = Math.sin(clock.elapsedTime * 0.6 + phase) * 0.008 }
  })
  const L = b.L, W = b.W
  return (
    <group ref={outer} position={[x0, GROUND_Y, z]} scale={scale}>
      <group ref={hull} rotation={[0, heading, 0]}>
        <mesh geometry={b.body} frustumCulled={false}><meshBasicMaterial vertexColors /></mesh>
        {b.glass.map((q, i) => <mesh key={i} geometry={q.geo} material={glassMats[i]} frustumCulled={false} />)}
        <points geometry={lightGeo} frustumCulled={false}><pointsMaterial size={4} sizeAttenuation={false} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
        {/* foam wake behind the stern + bow wave */}
        <group rotation={[0, -Math.PI / 2, 0]} position={[-L * 0.5 - 38, 0.18, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
            <planeGeometry args={[W * 2.6, 76]} /><meshBasicMaterial map={wake} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      </group>
      {/* warm light path on the water toward the viewer (+z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 30]} renderOrder={4}>
        <planeGeometry args={[W * 0.9, 60]} /><meshBasicMaterial map={refl} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Boats() {
  return (
    <>
      <Boat type="clipper" z={-330} x0={-420} speed={5.2} phase={0} />
      <Boat type="cruiser" z={-250} x0={520} speed={-3.0} scale={0.9} phase={2} />
      <Boat type="clipper" z={-560} x0={1050} speed={-4.6} scale={0.85} phase={4} />
      <Boat type="cruiser" z={-690} x0={-950} speed={2.8} scale={0.8} phase={1} />
    </>
  )
}
