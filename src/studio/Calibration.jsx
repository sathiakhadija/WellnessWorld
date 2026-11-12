// Material Calibration Studio (localhost): ?studio=calib&preset=neutral|golden|blue|interior_evening|overcast|rainy_evening
// Same layout (src/palette/calib_layout.json, Blender z-up -> three y-up: (x,y,z)->(x,z,-y)) and presets (presets.json) as assets/blender/make_calibration.py.
// Colour management: AgX tone mapping (Blender view transform AgX), sRGB output, exposure from the preset, physical light units (see unit conversion below).
// Unit matching (verified numerically against the Cycles render): Blender SUN strength S (irradiance) gives diffuse radiance albedo*S*cos/pi, which is exactly three's DirectionalLight intensity I=S (r155+ physical units). Blender uniform WORLD colour*strength W gives radiance albedo*W -> environment map of that colour (no extra light). Blender POINT P watts <-> three candela I = P/(4*pi).
// Window hooks for the compare script: window.__calib = { ready, project(x,y,z)->[px,py] , info }
import React, { useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import LAY from '../palette/calib_layout.json'
import PRE from '../palette/presets.json'
import { ww, wwEntry, REGISTRY } from '../palette.js'

const Q = new URLSearchParams(window.location.search)
const presetName = Q.get('preset') || 'neutral'
const P = PRE[presetName] || PRE.neutral
const B2T = ([x, y, z]) => [x, z, -y]                         // Blender (z-up) -> three (y-up)
const srgb = (a) => new THREE.Color().setRGB(a[0] / 255, a[1] / 255, a[2] / 255, THREE.SRGBColorSpace)
const plain = (rgb, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color: srgb(rgb), roughness: rough, metalness: metal })

function Cam() {
  const { camera, size, gl } = useThree()
  useEffect(() => {
    const c = LAY.camera, aspect = size.width / size.height
    const hf = (c.fov * Math.PI) / 180, vf = 2 * Math.atan(Math.tan(hf / 2) / aspect)           // Blender fov is horizontal (sensor fit auto, landscape)
    camera.fov = (vf * 180) / Math.PI; camera.aspect = aspect; camera.near = 0.1; camera.far = 200
    camera.position.set(...B2T(c.pos)); camera.lookAt(...B2T(c.target)); camera.updateProjectionMatrix(); camera.updateMatrixWorld()
    gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = Math.pow(2, P.exposure || 0); gl.outputColorSpace = THREE.SRGBColorSpace
    window.__calib = {
      preset: presetName, info: { toneMapping: 'AgX', exposureEV: P.exposure || 0, colorSpace: 'sRGB', three: THREE.REVISION },
      project: (x, y, z) => { const v = new THREE.Vector3(...B2T([x, y, z])).project(camera); return [(v.x * 0.5 + 0.5) * size.width, (-v.y * 0.5 + 0.5) * size.height] },
    }
    setTimeout(() => { window.__calib.ready = true }, 600)
  }, [camera, size, gl])
  return null
}

const mat = (id) => ww(id, {}, 'calib')
// Uniform sky environment == Blender's uniform World colour*strength: gives matching diffuse ambient AND reflections for metals/glass (no separate ambient light => no double counting).
function SkyEnv() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const env = new THREE.Scene(); const c = srgb(P.sky); env.background = new THREE.Color(c.r * P.skyStrength, c.g * P.skyStrength, c.b * P.skyStrength)
    const pm = new THREE.PMREMGenerator(gl); const rt = pm.fromScene(env, 0, 0.1, 100); scene.environment = rt.texture; scene.environmentIntensity = 1
    return () => { rt.dispose(); pm.dispose() }
  }, [gl, scene])
  return null
}
function Lights() {
  const a = (P.sunAz * Math.PI) / 180, e = ((90 - P.sunElev) * Math.PI) / 180   // same convention as the Blender script: tilt from vertical = 90 - elevation
  // Blender sun rotation (elev about X from straight-down? we mirror the Blender script: rotation_euler=(elev,0,az) on a -Z-pointing sun) -> direction the light travels:
  const rx = e, rz = a; const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(rx, 0, rz, 'XYZ'))   // Blender frame
  const from = new THREE.Vector3(...B2T([-dir.x * 30, -dir.y * 30, -dir.z * 30]))
  return (
    <>
      <SkyEnv />
      {P.sunStrength > 0 && <directionalLight position={from.toArray()} color={srgb(P.sunColor)} intensity={P.sunStrength} castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={80} shadow-bias={-0.0003} shadow-normalBias={0.02} shadow-radius={5} />}
      {(P.lamps || []).map((l, i) => <pointLight key={i} position={B2T(l[0])} color={srgb(l[1])} intensity={l[2] / (4 * Math.PI)} decay={2} distance={0} castShadow shadow-bias={-0.0005} />)}
    </>
  )
}

function Board() {
  const items = useMemo(() => {
    const out = []
    const box = (key, id, pos, scale, m) => out.push(<mesh key={key} position={B2T(pos)} scale={[scale[0], scale[2], scale[1]]} castShadow receiveShadow material={m || mat(id)}><boxGeometry /></mesh>)
    const sph = (key, pos, r, m) => out.push(<mesh key={key} position={B2T(pos)} castShadow receiveShadow material={m}><sphereGeometry args={[r, 48, 24]} /></mesh>)
    out.push(<mesh key="floor" rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={plain([118, 118, 118], 0.8)}><planeGeometry args={[40, 40]} /></mesh>)   // linear 0.18 == sRGB 118
    LAY.swatches.forEach(([id, x, y]) => box('sw' + id, id, [x, y, 0.01], [0.6, 0.6, 0.02]))
    LAY.spheres.forEach(([id, x, y]) => sph('sp' + id, [x, y, 0.4], 0.4, mat(id)))
    LAY.arch.forEach(([id, x, y]) => box('ar' + id, id, [x, y, 0.25], [1.0, 0.3, 0.5]))
    LAY.rough_ramp.forEach(([x, y, r], k) => { sph('rm' + k, [x, y, 0.3], 0.3, plain([188, 188, 188], r, 0)); sph('rb' + k, [x, y + 1, 0.3], 0.3, new THREE.MeshStandardMaterial({ color: new THREE.Color(REGISTRY.WW_BRASS_ANTIQUE.hex), roughness: r, metalness: 1 })) })
    LAY.neutrals.forEach(([n, v, x, y]) => sph('ne' + n, [x, y, 0.3], 0.3, plain([v, v, v], 0.6)))
    const [x0, y0] = LAY.colorchecker.origin
    LAY.colorchecker.patches.forEach((rgb, i) => { const r = Math.floor(i / 6), c = i % 6; box('cc' + i, null, [x0 + c * 0.27, y0 - r * 0.27, 0.01], [0.25, 0.25, 0.01], plain(rgb, 0.75)) })
    LAY.shadow.forEach(([id, x, y, kind]) => {
      if (kind === 'block') box('shb', id, [x, y, 0.4], [0.8, 0.8, 0.8])
      if (kind === 'pole') out.push(<mesh key="shp" position={B2T([x, y, 0.9])} castShadow material={mat(id)}><cylinderGeometry args={[0.03, 0.03, 1.8, 16]} /></mesh>)
      if (kind === 'float') sph('shf', [x, y, 0.8], 0.2, mat(id))
    })
    LAY.glass.forEach(([id, x, y, kind]) => {
      const gm = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, transmission: 1, ior: 1.5, thickness: 0.4, transparent: false })
      if (kind === 'pane') out.push(<mesh key="gp" position={B2T([x, y, 0.5])} scale={[1, 1, 0.04]} castShadow material={gm}><boxGeometry /></mesh>)
      if (kind === 'sphere') sph('gs', [x, y, 0.4], 0.4, gm)
      if (kind === 'mirror') sph('gm', [x, y, 0.4], 0.4, plain([230, 230, 230], 0.02, 1))
    })
    LAY.foliage.forEach(([id, x, y, kind]) => {
      if (kind === 'leaf') for (let k = 0; k < 7; k++) out.push(<mesh key={'fl' + x + k} position={B2T([x + 0.12 * (k - 3), y, 0.35 + 0.05 * k])} rotation={[Math.PI / 2 - (60 + 5 * k) * Math.PI / 180, 0, 0]} castShadow receiveShadow material={ww(id, { side: THREE.DoubleSide }, 'calibleaf')}><planeGeometry args={[0.35, 0.35]} /></mesh>)
      if (kind === 'bark') out.push(<mesh key="fb" position={B2T([x, y, 0.6])} castShadow receiveShadow material={mat(id)}><cylinderGeometry args={[0.15, 0.15, 1.2, 24]} /></mesh>)
    })
    return out
  }, [])
  return <group>{items}</group>
}

function Labels() {
  const [pos, setPos] = React.useState([])
  useEffect(() => {
    const t = setInterval(() => { if (window.__calib?.ready) { clearInterval(t); setPos([...LAY.swatches.map(([id, x, y]) => [id, ...window.__calib.project(x, y - 0.42, 0.02)]), ...LAY.spheres.map(([id, x, y]) => ['S:' + id, ...window.__calib.project(x, y - 0.55, 0)])]) } }, 200)
    return () => clearInterval(t)
  }, [])
  if (Q.get('labels') === '0') return null
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', font: '6px/1 monospace', color: '#111' }}>{pos.map(([id, x, y]) => <div key={id} data-ww-id={id} style={{ position: 'absolute', left: x, top: y, width: 46, transform: 'translateX(-50%)', textAlign: 'center', wordBreak: 'break-all', lineHeight: 1 }}>{id.replace('WW_', '').replace('S:', '').replace(/_/g, ' ')}</div>)}</div>
}
export default function Calibration() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#777' }}>
      <Canvas shadows="soft" dpr={1} gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ position: [0, 5, 10], fov: 30 }}>
        <Cam /><Lights /><Board />
      </Canvas>
      <Labels />
    </div>
  )
}
