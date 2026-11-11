// Procedural golden-hour sky + 3D Canary Wharf skyline + Thames. Replaces the baked dome backdrop.
// Colours are display (sRGB) colours sampled from the reference image, authored with toneMapped:false so they land as written.
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Boats } from './Boats.jsx'
import { Waterfront } from './Waterfront.jsx'
import { StreetVisuals } from './street/Street.jsx'
import { world, OFF } from './world.js'
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
uniform vec3 uSun; uniform float uTime;
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
  vec2 q = vec2(azr*5.5 + uTime*0.010, el*0.55);
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

// One shared set of sky uniforms: the dome, the image-based light and the river all read these, so a time-of-day change (atmosphere.js) updates them together.
export const SKY_U = {
  cZenith: { value: C(0.56, 0.58, 0.78) }, cUpper: { value: C(0.70, 0.67, 0.85) }, cMid: { value: C(0.88, 0.78, 0.82) },
  cPink: { value: C(0.93, 0.75, 0.76) }, cHorizon: { value: C(0.80, 0.66, 0.68) }, cBelow: { value: C(0.45, 0.42, 0.52) },
  cSunGlow: { value: C(0.55, 0.36, 0.22) }, cCloudHi: { value: C(1.0, 0.80, 0.78) }, cCloudLo: { value: C(0.70, 0.64, 0.80) },
  uSun: { value: new THREE.Vector3(Math.sin((SUN_AZ_DEG * Math.PI) / 180) * Math.cos((SUN_EL_DEG * Math.PI) / 180), Math.sin((SUN_EL_DEG * Math.PI) / 180), -Math.cos((SUN_AZ_DEG * Math.PI) / 180) * Math.cos((SUN_EL_DEG * Math.PI) / 180)) },
  uTime: { value: 0 },
}
export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { ...SKY_U }, vertexShader: skyVert, fragmentShader: skyFrag,
  })
}

export function SkyDome() {
  const mat = useMemo(makeSkyMaterial, [])
  const { camera } = useThree()
  const ref = useMemo(() => ({ current: null }), [])
  useFrame(({ clock }) => { if (ref.current) ref.current.position.copy(camera.position); SKY_U.uTime.value = clock.elapsedTime })
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
  steel:  { lit: 0.22, base: '#8a8794', glassTop: [186, 176, 184], glassBottom: [120, 116, 136], warm: [255, 226, 170], seed: 11 },   // One Canada Square: pale stainless cladding, few lit floors
  blue:   { lit: 0.50, base: '#3f4d70', glassTop: [112, 128, 170], glassBottom: [52, 64, 108], warm: [255, 236, 190], seed: 13 },     // blue-glass towers, warm lit bands
  dusk:   { lit: 0.30, base: '#3b3a52', glassTop: [118, 100, 128], glassBottom: [58, 54, 84], warm: [255, 210, 140], seed: 17 },      // mauve-reflecting glass
}
const HERO_STYLE = { 'One Canada Sq': 'steel', '25 Canada Sq (Citi) main': 'blue', '25 Canada Sq shoulder': 'blue', '8 Canada Sq (HSBC)': 'dusk', 'Barclays slab': 'steel', 'west low tower': 'dusk', 'west block A': 'blue', 'west block B': 'glassD', 'narrow tower': 'dusk', 'east tower': 'glass' }
export const GLOW = { value: 0.0 }          // emissive boost on lit windows (night / blue hour)
export const LIT = { value: 0.45 }          // fraction of lit windows that are switched on (ramps up slowly: the city "comes alive" over ~4 minutes)
export function patchLitWindows(mat, cells) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLit = LIT; sh.uniforms.uGlow = GLOW
    sh.uniforms.uCells = { value: new THREE.Vector2(...cells) }
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uLit, uGlow; uniform vec2 uCells; float gLit = 0.0;\nvoid main() {')
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 sd = texture2D(map, vMapUv);
          float litM = smoothstep(0.35, 0.5, sd.r - sd.b) * smoothstep(0.7, 0.85, sd.r);
          vec2 cell = floor(vMapUv * uCells);
          float hh = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
          float on = 1.0 - smoothstep(uLit - 0.04, uLit + 0.04, hh);
          sd.rgb = mix(sd.rgb, vec3(0.16, 0.16, 0.24) * (0.7 + 0.3 * hh), litM * (1.0 - on));
          gLit = litM * on;
          diffuseColor *= sd;
        #endif`)
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.rgb += gLit * uGlow * vec3(1.0, 0.74, 0.42);')
  }
  return mat
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
  const lists = { glass: [], glassD: [], stone: [], steel: [], blue: [], dusk: [], roof: [] }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
  for (const b of layout) {
    if (!filter(b)) continue
    const key = b.tex || HERO_STYLE[b.parent || b.name] || (b.style === 'stone' ? 'stone' : (b.shade ?? 0.5) > 0.55 ? 'glassD' : 'glass')
    const floors = b.h / 3.9
    const bq = new THREE.Quaternion().setFromEuler(e.set(0, -b.rot + TWIST, 0))
    const base = new THREE.Matrix4().compose(new THREE.Vector3(b.x, -EYE_ABOVE_WATER + (b.y0 || 0), b.z), bq, new THREE.Vector3(1, 1, 1))
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
        const t = THREE.MathUtils.clamp((pos.getY(i) + EYE_ABOVE_WATER - (b.y0 || 0)) / b.h, 0, 1)
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
        : patchLitWindows(new THREE.MeshBasicMaterial({ map: variantTexture(k), vertexColors: true, toneMapped: false }), [32, 64])
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
      <mesh position={[0, b.h + (b.crownH || 0) + b.capH / 2, 0]} rotation={[0, Math.PI / 4, 0]} material={mat}><coneGeometry args={[b.w * 0.64, b.capH, 4, 1]} /></mesh>
      <mesh position={[0, b.h + (b.crownH || 0) + b.capH + 22, 0]}><sphereGeometry args={[2.2, 8, 6]} /><meshBasicMaterial color={C(1.0, 0.18, 0.1)} toneMapped={false} /></mesh>
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
// Real-time water: 5 travelling sine waves give a normal; sky colour is reflected through it (Fresnel), the low sun makes an elongated glitter path,
// and lit stretches of the far bank throw soft, wave-broken streaks toward the viewer. Wave detail fades with distance so nothing shimmers into noise.
const waterVert = /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const waterFrag = /* glsl */`
varying vec3 vW; uniform vec3 uCam, uSun, cDeep, cShallow, cGlint, cZenith, cUpper, cMid, cPink, cHorizon; uniform float uAlpha, uInvScale, uTime; uniform sampler2D uCols;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
vec3 skyCol(float el){
  vec3 col = mix(cHorizon, cPink, smoothstep(-1., 2.0, el));
  col = mix(col, cMid, smoothstep(1.5, 4.5, el)); col = mix(col, cUpper, smoothstep(4.0, 11., el)); return mix(col, cZenith, smoothstep(12., 55., el));
}
void main(){
  vec3 wr = vW * uInvScale; vec3 cam = uCam * uInvScale; vec3 rel = wr - cam; float dist = length(rel.xz);
  vec2 p = wr.xz;
  // waves: (dirx, dirz, wavelength m, amplitude m, speed rad/s)
  vec4 W0 = vec4(0.96, 0.28, 90., 0.50), W1 = vec4(-0.50, 0.86, 46., 0.28), W2 = vec4(0.20, -0.98, 24., 0.16), W3 = vec4(0.80, 0.60, 11., 0.06), W4 = vec4(-0.9, 0.44, 5., 0.025);
  vec2 g = vec2(0.); float hs = 0.;
  for (int i = 0; i < 5; i++) {
    vec4 w = i==0?W0 : i==1?W1 : i==2?W2 : i==3?W3 : W4;
    float k = 6.2832 / w.z, ph = k * dot(w.xy, p) + uTime * (0.5 + 8./w.z) * 1.0;
    float fade = smoothstep(0.004 * dist, 0.014 * dist, w.z);
    g += w.xy * (w.w * k * cos(ph) * fade); hs += w.w * sin(ph) * fade;
  }
  vec3 n = normalize(vec3(-g.x * 0.55, 1.0, -g.y * 0.55));
  vec3 v = normalize(cam - wr);
  vec3 R = reflect(-v, n); R.y = max(R.y, 0.004);
  float el = degrees(asin(clamp(R.y, 0., 1.)));
  vec3 sky = skyCol(el);
  float F = clamp(0.06 + 0.94 * pow(1. - max(dot(n, v), 0.), 4.), 0.0, 1.0);
  vec3 body = mix(cDeep, cShallow, smoothstep(0., 1.5, hs + 0.6) * 0.6);
  vec3 col = mix(body, sky, F);
  // sun path: elongated toward the viewer because wave slopes spread the reflected sun vertically
  float S = max(dot(R, normalize(uSun)), 0.);
  col += cGlint * (pow(S, 90.) * 3.6 + pow(S, 14.) * 0.28) * smoothstep(40., 260., dist);
  // lit far bank: soft vertical streaks broken by the swell
  float azr = atan(rel.x, -rel.z), aDeg = degrees(azr + hs * 0.0025);
  float lc = texture2D(uCols, vec2((aDeg + 180.) / 360., 0.5)).r;
  float sh = 0.5 + 0.5 * sin(dist * 0.085 + hs * 11. - uTime * 0.7);
  float streak = smoothstep(0.30, 0.95, sh * (0.55 + 0.7 * noise(vec2(aDeg * 5., dist * 0.012))));
  float reach = smoothstep(180., 700., dist) * (1.0 - smoothstep(960., 1120., dist));
  col += vec3(1.0, 0.58, 0.22) * lc * streak * reach * 0.55;
  // far haze: the river dissolves into the horizon colour
  col = mix(col, cHorizon, smoothstep(900., 2400., dist) * 0.35);
  gl_FragColor = vec4(col, uAlpha);
  #include <colorspace_fragment>
}`

// 1-D texture over azimuth (-180..180°): how much lit skyline stands at that bearing (drives the river's reflection streaks)
function litColumns(layout) {
  const N = 2048, data = new Uint8Array(N)
  for (const b of layout) {
    if (b.part) continue
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
  const mat = useMemo(() => {
    const sky = SKY_U
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, toneMapped: false,
      uniforms: {
        uCols: { value: null }, uCam: { value: new THREE.Vector3() }, uInvScale: { value: 1 / SCALE }, uAlpha: { value: 0.86 }, uTime: { value: 0 },
        uSun: sky.uSun, cZenith: sky.cZenith, cUpper: sky.cUpper, cMid: sky.cMid, cPink: sky.cPink, cHorizon: sky.cHorizon,
        cDeep: { value: C(0.17, 0.19, 0.28) }, cShallow: { value: C(0.30, 0.31, 0.40) }, cGlint: { value: C(0.95, 0.60, 0.30) },
      },
      vertexShader: waterVert, fragmentShader: waterFrag,
    })
  }, [])
  mat.uniforms.uCols.value = cols
  useFrame(({ clock }) => { mat.uniforms.uCam.value.copy(camera.position); mat.uniforms.uTime.value = clock.elapsedTime; mat.uniforms.uInvScale.value = 1 / (world.extScale || SCALE) })
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -EYE_ABOVE_WATER, -577]} material={mat} renderOrder={3}>
        <planeGeometry args={[9000, 854]} />
      </mesh>
      {/* land behind the far quay (the background city stands on it, not in the river) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -EYE_ABOVE_WATER + 3.3, -2500]}>
        <planeGeometry args={[9000, 3000]} /><meshBasicMaterial color={C(0.40, 0.36, 0.45)} />
      </mesh>
    </>
  )
}

export function Skyline() {
  const layout = useMemo(buildLayout, [])
  const geoms = useMemo(() => buildFacadeGeometries(layout), [layout])
  const mirrorGeoms = useMemo(() => buildFacadeGeometries(layout, (b) => b.hero || b.h > 60), [layout])
  const one = layout.find((b) => b.name === 'One Canada Sq')
  // the skyline lives in "real metre" space around the CAM1 eye; scale it down and pin it to the room's eye height
  // Seen from the penthouse the exterior is compressed (scale 1/6, pinned to the room's eye height). When the player is down on the street the very same
  // world is drawn 1:1 with its origin at the scene origin, so street coordinates == scene coordinates and the Thames, skyline and neighbourhood agree.
  const g = useRef()
  useFrame(() => {
    const street = world.level === 'street', s = street ? 1 : SCALE
    if (!g.current) return
    g.current.scale.setScalar(s); g.current.position.set(0, street ? 0 : 1.7, street ? 0 : -0.4); world.extScale = s
  })
  return (
    <group ref={g} name="exterior" position={[0, 1.7, -0.4]} scale={[SCALE, SCALE, SCALE]}>
      <FacadeMeshes geoms={geoms} />
      {!OFF.has('hood') && <Boats />}
      {/* near-bank ground out to the haze: the compact neighbourhood no longer floats in the void now the old V10 sprawl is gone */}
      <mesh position={[0, -EYE_ABOVE_WATER - 0.45, 2000]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[9000, 4290]} /><meshLambertMaterial color="#b4c19c" />
      </mesh>
      <PyramidCap b={one} />
      <Waterfront />
      {!OFF.has('street') && <StreetVisuals />}
      {/* mirrored copy under the water plane = reflections of the lit towers */}
      <group scale={[1, -1, 1]} position={[0, -2 * EYE_ABOVE_WATER, 0]}><FacadeMeshes geoms={mirrorGeoms} mirrored /></group>
      <River layout={layout} />
    </group>
  )
}
