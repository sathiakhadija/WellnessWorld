// Procedural golden-hour sky + 3D Canary Wharf skyline + Thames. Replaces the baked dome backdrop.
// Colours are display (sRGB) colours sampled from the reference image, authored with toneMapped:false so they land as written.
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Neighbourhood, Boats, rearLayout } from './Neighbourhood.jsx'
import { OFF } from './world.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildLayout, SCALE, EYE_ABOVE_WATER, SUN_AZ_DEG, SUN_EL_DEG, TWIST } from './skylineData.js'

export const HAZE = '#b49fae'   // fog / distant haze colour (reference: far city band ≈ 0.64,0.57,0.61 behind lit towers)
const C = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace)

// ---------------------------------------------------------------- sky
const skyVert = /* glsl */`
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const skyFrag = /* glsl */`
varying vec3 vDir;
uniform vec3 cZenith, cUpper, cMid, cPink, cHorizon, cBelow, cSunGlow, cCloudHi, cCloudLo;
uniform vec3 uSun;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(7.1,3.7); a*=.5; } return v; }
void main(){
  vec3 d = normalize(vDir);
  float el = degrees(asin(clamp(d.y,-1.,1.)));               // elevation
  float azr = atan(d.x, -d.z);                                // from -z toward +x
  // vertical gradient sampled from the reference: lavender above, pink low, hazy at the horizon
  vec3 col = mix(cHorizon, cPink, smoothstep(-1., 2.0, el));
  col = mix(col, cMid,   smoothstep(1.5, 4.5, el));
  col = mix(col, cUpper, smoothstep(4.0, 11., el));
  col = mix(col, cZenith,smoothstep(12., 55., el));
  // streaky stratus (stretched along the horizon), lit pink on the underside near the sun
  vec2 q = vec2(azr*5.5, el*0.55);
  float n = fbm(q*vec2(1.0,2.6) + vec2(3.0,0.0)) * 0.65 + fbm(q*vec2(2.2,5.5) + 11.) * 0.35;
  float band = smoothstep(1.5, 5., el) * (1.0 - smoothstep(26., 44., el));
  float cl = smoothstep(0.46, 0.78, n) * band;
  float sunAz = atan(uSun.x, -uSun.z);
  float toSun = 0.5 + 0.5*cos(azr - sunAz);
  vec3 cloudCol = mix(cCloudLo, cCloudHi, smoothstep(0.35, 0.95, toSun));
  col = mix(col, cloudCol, cl * 0.78);
  // soft sun glow (no disc; the sun sits behind haze)
  float s = max(dot(d, normalize(uSun)), 0.);
  col += cSunGlow * (pow(s, 24.) * 0.55 + pow(s, 5.) * 0.22);
  // below the horizon: haze fades to the river colour (the river plane itself covers most of this)
  col = mix(col, cBelow, smoothstep(0., -14., el));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`

export function makeSkyMaterial() {
  const sun = new THREE.Vector3(
    Math.sin((SUN_AZ_DEG * Math.PI) / 180) * Math.cos((SUN_EL_DEG * Math.PI) / 180),
    Math.sin((SUN_EL_DEG * Math.PI) / 180),
    -Math.cos((SUN_AZ_DEG * Math.PI) / 180) * Math.cos((SUN_EL_DEG * Math.PI) / 180))
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      cZenith: { value: C(0.56, 0.58, 0.78) }, cUpper: { value: C(0.70, 0.67, 0.85) }, cMid: { value: C(0.88, 0.78, 0.82) },
      cPink: { value: C(0.93, 0.75, 0.76) }, cHorizon: { value: C(0.80, 0.66, 0.68) }, cBelow: { value: C(0.45, 0.42, 0.52) },
      cSunGlow: { value: C(0.55, 0.36, 0.22) }, cCloudHi: { value: C(1.0, 0.80, 0.78) }, cCloudLo: { value: C(0.70, 0.64, 0.80) },
      uSun: { value: sun },
    },
    vertexShader: skyVert, fragmentShader: skyFrag,
  })
}

export function SkyDome() {
  const mat = useMemo(makeSkyMaterial, [])
  const { camera } = useThree()
  const ref = useMemo(() => ({ current: null }), [])
  useFrame(() => { if (ref.current) ref.current.position.copy(camera.position) })
  return <mesh ref={(m) => (ref.current = m)} material={mat} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[600, 48, 32]} /></mesh>
}

// ---------------------------------------------------------------- facades
// Curtain-wall facade tile: 32 window columns x 64 half-floors. Whole floors light up in horizontal runs (office banding) over smooth
// sunset-reflecting glass, like the reference; random per-window speckle reads as noise at distance, so it is kept very low.
function facadeCanvas({ cols = 32, rows = 64, lit = 0.6, base, glassTop, glassBottom, warm, seed = 1 }) {
  const cw = 6, ch = 6
  const cv = document.createElement('canvas'); cv.width = cols * cw; cv.height = rows * ch
  const g = cv.getContext('2d')
  g.fillStyle = base; g.fillRect(0, 0, cv.width, cv.height)
  let s = seed
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  for (let r = 0; r < rows; r++) {
    // glass: smooth vertical gradient (sky reflection), tiny jitter
    const t = r / rows
    const m = (a, b) => a + (b - a) * t
    const litFloor = (r % 2 === 0) ? rnd() < lit : undefined
    for (let c = 0; c < cols; c++) {
      const j = 1 + (rnd() - 0.5) * 0.05
      g.fillStyle = `rgb(${Math.round(m(glassTop[0], glassBottom[0]) * j)},${Math.round(m(glassTop[1], glassBottom[1]) * j)},${Math.round(m(glassTop[2], glassBottom[2]) * j)})`
      g.fillRect(c * cw, r * ch, cw - 1, ch - 1)
    }
    if (r % 2 === 0 && litFloor) {              // a run of lit windows on this floor
      let c = Math.floor(rnd() * 6)
      while (c < cols) {
        const run = 3 + Math.floor(rnd() * 9)
        for (let k = 0; k < run && c + k < cols; k++) {
          const q = 0.86 + rnd() * 0.14
          g.fillStyle = `rgb(${Math.round(warm[0] * q)},${Math.round(warm[1] * q)},${Math.round(warm[2] * q * 0.95)})`
          g.fillRect((c + k) * cw, r * ch, cw - 1, ch * 2 - 2)
        }
        c += run + 2 + Math.floor(rnd() * 8)
      }
    }
  }
  return cv
}

const VARIANTS = {
  glass:  { lit: 0.42, base: '#50506e', glassTop: [128, 128, 160], glassBottom: [66, 70, 104], warm: [255, 232, 168], seed: 3 },
  glassD: { lit: 0.34, base: '#44445f', glassTop: [108, 108, 140], glassBottom: [56, 60, 90], warm: [255, 224, 158], seed: 9 },
  stone:  { lit: 0.60, base: '#7a6e7c', glassTop: [150, 134, 146], glassBottom: [106, 96, 112], warm: [255, 220, 150], seed: 5 },
}
const texCache = {}
function variantTexture(key) {
  if (!texCache[key]) {
    const t = new THREE.CanvasTexture(facadeCanvas(VARIANTS[key]))
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4
    texCache[key] = t
  }
  return texCache[key]
}
const FACE_DEFS = [   // side faces: [normal angle about Y, local offset axis]
  { ry: 0, sx: 0, sz: 1, useW: true }, { ry: Math.PI, sx: 0, sz: -1, useW: true },
  { ry: Math.PI / 2, sx: 1, sz: 0, useW: false }, { ry: -Math.PI / 2, sx: -1, sz: 0, useW: false },
]
const SUN_H = new THREE.Vector2(Math.sin((SUN_AZ_DEG * Math.PI) / 180), -Math.cos((SUN_AZ_DEG * Math.PI) / 180))

// Merge every facade into one mesh per texture variant: window repeat is baked into UVs, face shading into vertex colours.
export function buildFacadeGeometries(layout, filter = () => true) {
  const lists = { glass: [], glassD: [], stone: [], roof: [] }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
  for (const b of layout) {
    if (!filter(b)) continue
    const key = b.style === 'stone' ? 'stone' : (b.shade ?? 0.5) > 0.55 ? 'glassD' : 'glass'
    const floors = b.h / 3.9
    const bq = new THREE.Quaternion().setFromEuler(e.set(0, -b.rot + TWIST, 0))
    const base = new THREE.Matrix4().compose(new THREE.Vector3(b.x, -EYE_ABOVE_WATER, b.z), bq, new THREE.Vector3(1, 1, 1))
    for (const f of FACE_DEFS) {
      const fw = f.useW ? b.w : b.d
      const g = new THREE.PlaneGeometry(fw, b.h)
      const uv = g.attributes.uv
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (fw / 1.7)) / 32, (uv.getY(i) * (b.h / 1.95)) / 64)
      const off = f.useW ? b.d / 2 : b.w / 2
      q.setFromEuler(e.set(0, f.ry, 0))
      m4.compose(new THREE.Vector3(f.sx * off, b.h / 2, f.sz * off), q, new THREE.Vector3(1, 1, 1))
      g.applyMatrix4(m4).applyMatrix4(base)
      // shading: faces turned toward the sun are warmer/brighter, others stay in blue shade (towers are mostly backlit in the reference)
      const nWorld = new THREE.Vector3(f.sx, 0, f.sz).applyQuaternion(bq)
      const lit = 0.5 + 0.5 * new THREE.Vector2(nWorld.x, nWorld.z).dot(SUN_H)
      const tint = 0.80 + 0.20 * lit
      const col = new Float32Array(g.attributes.position.count * 3)
      const pos = g.attributes.position
      for (let i = 0; i < pos.count; i++) {   // vertex y is already in tower-local space + base offset
        const t = THREE.MathUtils.clamp((pos.getY(i) + EYE_ABOVE_WATER) / b.h, 0, 1)
        const k = tint * (0.62 + 0.34 * t)
        col[i * 3] = k * 1.03; col[i * 3 + 1] = k; col[i * 3 + 2] = k * 0.97
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      lists[key].push(g)
    }
    const roof = new THREE.PlaneGeometry(b.w, b.d); roof.rotateX(-Math.PI / 2); roof.translate(0, b.h, 0).applyMatrix4(base)
    lists.roof.push(roof)
  }
  const out = {}
  for (const k of Object.keys(lists)) {
    if (!lists[k].length) continue
    for (const g of lists[k]) { if (!g.attributes.color) { const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)) } }
    out[k] = mergeGeometries(lists[k])
  }
  return out
}

export function FacadeMeshes({ geoms, mirrored = false }) {
  const mats = useMemo(() => {
    const o = {}
    for (const k of Object.keys(geoms)) {
      o[k] = k === 'roof'
        ? new THREE.MeshBasicMaterial({ color: C(0.30, 0.28, 0.34), toneMapped: false })
        : new THREE.MeshBasicMaterial({ map: variantTexture(k), vertexColors: true, toneMapped: false })
      if (mirrored) { o[k].transparent = true; o[k].opacity = 0.5; o[k].side = THREE.DoubleSide; o[k].depthWrite = false }
    }
    return o
  }, [geoms, mirrored])
  return <>{Object.keys(geoms).map((k) => <mesh key={k} geometry={geoms[k]} material={mats[k]} frustumCulled={false} />)}</>
}

function PyramidCap({ b }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: C(0.70, 0.64, 0.66), toneMapped: false }), [])
  return (
    <group position={[b.x, -EYE_ABOVE_WATER, b.z]} rotation={[0, -b.rot + TWIST, 0]}>
      <mesh position={[0, b.h + b.capH / 2, 0]} rotation={[0, Math.PI / 4, 0]} material={mat}><coneGeometry args={[b.w * 0.72, b.capH, 4, 1]} /></mesh>
    </group>
  )
}

function Quay() {
  // far-bank promenade: a thin ribbon of warm lights along the waterline
  const tex = useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 16
    const g = cv.getContext('2d'); g.fillStyle = '#2c2a34'; g.fillRect(0, 0, 512, 16)
    let s = 5; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    for (let i = 0; i < 150; i++) { g.fillStyle = `rgba(255,${190 + Math.floor(rnd() * 50)},${110 + Math.floor(rnd() * 60)},${0.65 + rnd() * 0.35})`; g.fillRect(Math.floor(rnd() * 508), 3 + Math.floor(rnd() * 9), 3, 3) }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(10, 1); return t
  }, [])
  tex.repeat.set(220, 1)
  return (
    <mesh position={[0, -EYE_ABOVE_WATER + 3, -1012]}>
      <boxGeometry args={[9000, 6, 4]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

// ---------------------------------------------------------------- river
const waterVert = /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const waterFrag = /* glsl */`
varying vec3 vW; uniform vec3 uCam, cNear, cFar, cGlint; uniform float uAlpha, uSunAz, uInvScale, uTime; uniform sampler2D uCols;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec3 wr = vW * uInvScale; vec3 rel = wr - uCam * uInvScale; float dist = length(rel.xz);
  vec3 col = mix(cNear, cFar, smoothstep(40., 190., dist));
  // ripples: stretched across the view direction so they read as horizontal streaks
  float rip = noise(vec2(wr.x*0.9 + uTime*0.35, wr.z*0.18 - uTime*0.12)) * 0.6 + noise(vec2(wr.x*2.6 - uTime*0.5, wr.z*0.5 + uTime*0.2)) * 0.4;
  col *= 0.94 + 0.12*rip;
  // sun glitter column under the sun azimuth
  float azr = atan(rel.x, -rel.z);
  float g = exp(-pow((azr - uSunAz)*4.0, 2.)) * smoothstep(0.62, 0.95, rip) * smoothstep(60., 200., dist);
  col += cGlint * g * 0.25;
  // reflected city lights: vertical dashes (constant azimuth, varying distance) under every lit stretch of skyline
  float aDeg = degrees(azr);
  float lc = texture2D(uCols, vec2((aDeg + 180.) / 360., 0.5)).r;
  float dash = smoothstep(0.62, 0.95, noise(vec2(aDeg * 7., dist * 0.035 + uTime*0.25)) * 0.6 + noise(vec2(aDeg * 19., dist * 0.09 - uTime*0.4)) * 0.4);
  float reach = smoothstep(120., 1000., dist) * (1.0 - smoothstep(1000., 1180., dist));
  col += vec3(1.0, 0.60, 0.24) * lc * dash * reach * 0.62;
  gl_FragColor = vec4(col, uAlpha);
  #include <colorspace_fragment>
}`

// 1-D texture over azimuth (-180..180°): how much lit skyline stands at that bearing (drives the river's reflection streaks)
function litColumns(layout) {
  const N = 2048, data = new Uint8Array(N)
  for (const b of layout) {
    const aDeg = (Math.atan2(b.x, -b.z) * 180) / Math.PI
    const D = Math.hypot(b.x, b.z)
    const half = ((Math.atan(b.w / 2 / D) * 180) / Math.PI) * 1.1
    const strength = b.band ? 0.55 : b.hero ? 0.55 + Math.min(0.45, b.h / 450) : 0.28
    for (let u = Math.floor(((aDeg - half + 180) / 360) * N); u <= Math.ceil(((aDeg + half + 180) / 360) * N); u++) {
      if (u >= 0 && u < N) data[u] = Math.max(data[u], Math.round(255 * strength))
    }
  }
  const t = new THREE.DataTexture(data, N, 1, THREE.RedFormat, THREE.UnsignedByteType)
  t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true
  return t
}

function River({ layout }) {
  const { camera } = useThree()
  const cols = useMemo(() => litColumns(layout), [layout])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      uCols: { value: null }, uCam: { value: new THREE.Vector3() }, uInvScale: { value: 1 / SCALE }, uAlpha: { value: 0.78 }, uTime: { value: 0 }, uSunAz: { value: (SUN_AZ_DEG * Math.PI) / 180 },
      cNear: { value: C(0.52, 0.47, 0.60) }, cFar: { value: C(0.44, 0.38, 0.42) }, cGlint: { value: C(0.55, 0.40, 0.26) },
    },
    vertexShader: waterVert, fragmentShader: waterFrag,
  }), [])
  mat.uniforms.uCols.value = cols
  useFrame(({ clock }) => { mat.uniforms.uCam.value.copy(camera.position); mat.uniforms.uTime.value = clock.elapsedTime })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -EYE_ABOVE_WATER, -1700]} material={mat} renderOrder={3}>
      <planeGeometry args={[9000, 3100]} />
    </mesh>
  )
}

export function Skyline() {
  const layout = useMemo(buildLayout, [])
  const geoms = useMemo(() => buildFacadeGeometries(layout), [layout])
  const mirrorGeoms = useMemo(() => buildFacadeGeometries(layout, (b) => b.hero || b.h > 60), [layout])
  const rearGeoms = useMemo(() => buildFacadeGeometries(rearLayout()), [])
  const one = layout.find((b) => b.name === 'One Canada Sq')
  // the skyline lives in "real metre" space around the CAM1 eye; scale it down and pin it to the room's eye height
  return (
    <group position={[0, 1.7, -0.4]} scale={[SCALE, SCALE, SCALE]}>
      <FacadeMeshes geoms={geoms} />
      <FacadeMeshes geoms={rearGeoms} />
      {!OFF.has('hood') && <Neighbourhood />}
      {!OFF.has('hood') && <Boats />}
      <PyramidCap b={one} />
      <Quay />
      {/* mirrored copy under the water plane = reflections of the lit towers */}
      <group scale={[1, -1, 1]} position={[0, -2 * EYE_ABOVE_WATER, 0]}><FacadeMeshes geoms={mirrorGeoms} mirrored /></group>
      <River layout={layout} />
    </group>
  )
}
