// Procedural golden-hour sky + 3D Canary Wharf skyline + Thames. Replaces the baked dome backdrop.
// Colours are display (sRGB) colours sampled from the reference image, authored with toneMapped:false so they land as written.
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Boats } from './Boats.jsx'
import { ATMO_U, patchHaze, hazeVertex, hazeFragment } from './exteriorAtmo.js'
import { Waterfront } from './Waterfront.jsx'
import { NearBank } from './NearBank.jsx'
import { StreetVisuals } from './street/Street.jsx'
import { world, OFF } from './world.js'
import { WX } from './weather/weather.js'
import KIT from './baked/skyline_kit.json'   // produced by assets/blender/make_skyline_kit.py (Blender)
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
function facadeCanvas({ cols = 32, rows = 64, lit = 0.6, base, glassTop, glassBottom, warm, seed = 1, fin, band }) {
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
  // architectural articulation: pale vertical fins (every 4th mullion) and/or horizontal spandrel bands (every 8 half-floors), drawn over the glass
  if (fin) { g.fillStyle = fin; for (let c = 0; c < cols; c += 4) g.fillRect(c * cw - 1, 0, 2, cv.height) }
  if (band) { g.fillStyle = band; for (let r = 0; r < rows; r += 8) g.fillRect(0, r * ch + ch * 2 - 2, cv.width, 3) }
  return cv
}

const VARIANTS = {
  glass:  { lit: 0.42, base: '#50506e', glassTop: [128, 128, 160], glassBottom: [66, 70, 104], warm: [255, 232, 168], seed: 3 },
  glassD: { lit: 0.34, base: '#44445f', glassTop: [108, 108, 140], glassBottom: [56, 60, 90], warm: [255, 224, 158], seed: 9 },
  stone:  { lit: 0.60, base: '#7a6e7c', glassTop: [150, 134, 146], glassBottom: [106, 96, 112], warm: [255, 220, 150], seed: 5 },
  steel:  { lit: 0.22, base: '#8a8794', glassTop: [186, 176, 184], glassBottom: [120, 116, 136], warm: [255, 226, 170], seed: 11 },   // One Canada Square: pale stainless cladding, few lit floors
  blue:   { lit: 0.50, base: '#3f4d70', glassTop: [112, 128, 170], glassBottom: [52, 64, 108], warm: [255, 236, 190], seed: 13 },     // blue-glass towers, warm lit bands
  fin:    { lit: 0.40, base: '#4a4c68', glassTop: [112, 118, 150], glassBottom: [58, 64, 98], warm: [255, 228, 164], seed: 21, fin: 'rgba(196,190,200,0.85)' },       // pale stone fins over blue glass
  band:   { lit: 0.38, base: '#46465f', glassTop: [118, 112, 142], glassBottom: [60, 60, 92], warm: [255, 222, 156], seed: 23, band: 'rgba(170,160,170,0.9)' },       // horizontal spandrel bands
  warm:   { lit: 0.52, base: '#6e6270', glassTop: [168, 142, 140], glassBottom: [112, 94, 108], warm: [255, 214, 146], seed: 29, band: 'rgba(206,186,170,0.8)' },      // champagne / sandstone cladding
  dusk:   { lit: 0.30, base: '#3b3a52', glassTop: [118, 100, 128], glassBottom: [58, 54, 84], warm: [255, 210, 140], seed: 17 },      // mauve-reflecting glass
}
const HERO_STYLE = { 'One Canada Sq': 'steel', '25 Canada Sq (Citi) main': 'blue', '25 Canada Sq shoulder': 'blue', '8 Canada Sq (HSBC)': 'dusk', 'Barclays slab': 'band', 'west low tower': 'dusk', 'west block A': 'blue', 'west block B': 'fin', 'narrow tower': 'dusk', 'east tower': 'warm' }
export const GLOW = { value: 0.0 }          // emissive boost on lit windows (night / blue hour)
export const LIT = { value: 0.45 }          // fraction of lit windows that are switched on (ramps up slowly: the city "comes alive" over ~4 minutes)
export function patchLitWindows(mat, cells, mirrored = false) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLit = LIT; sh.uniforms.uGlow = GLOW
    sh.uniforms.uCells = { value: new THREE.Vector2(...cells) }
    hazeVertex(sh); hazeFragment(sh, mirrored)
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uLit, uGlow; uniform vec2 uCells; float gLit = 0.0;\nvoid main() {')
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec2 muv = vMapUv;
          ${mirrored ? 'muv.x += uRip * sin(vHzY * uInvExt * 0.55 + uRipT * 1.7) * (0.4 + 0.6 * sin(vHzY * uInvExt * 0.13 - uRipT * 0.9));' : ''}
          vec4 sd = texture2D(map, muv);
          float litM = smoothstep(0.35, 0.5, sd.r - sd.b) * smoothstep(0.7, 0.85, sd.r);
          vec2 cell = floor(muv * uCells);
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

// Plan ring (local x,z) per massing shape. Edge i runs p[i] -> p[i+1]; outward normal is (dz, -dx).
function ringFor(b) {
  const hw = b.w / 2, hd = b.d / 2
  if (b.shape === 'chamfer') { const c = Math.min(hw, hd) * 0.42; return [[-hw + c, -hd], [hw - c, -hd], [hw, -hd + c], [hw, hd - c], [hw - c, hd], [-hw + c, hd], [-hw, hd - c], [-hw, -hd + c]] }
  if (b.shape === 'round') { const n = 14, r = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; r.push([-Math.sin(t) * hw, -Math.cos(t) * hd]) } return r }
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]
}
// Profile: [height fraction, plan scale] pairs (a taper narrows the upper third); 'slant' lowers the back edge of the roof by 12 %.
const profileFor = (b) => (b.shape === 'taper' ? [[0, 1], [0.62, 1], [1, b.topScale || 0.74]] : [[0, 1], [1, 1]])
const topY = (b, z) => (b.shape === 'slant' ? b.h * (1 - 0.12 * (1 - (z / b.d + 0.5))) : b.h)

// Merge every facade into one mesh per texture variant: window repeat is baked into UVs, face shading into vertex colours.
export function buildFacadeGeometries(layout, filter = () => true) {
  const lists = { glass: [], glassD: [], stone: [], steel: [], blue: [], dusk: [], fin: [], band: [], warm: [], roof: [] }
  const e = new THREE.Euler(), v = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3()
  for (const b of layout) {
    if (!filter(b)) continue
    const key = b.tex || HERO_STYLE[b.parent || b.name] || (b.style === 'stone' ? 'stone' : (b.shade ?? 0.5) > 0.55 ? 'glassD' : 'glass')
    const bq = new THREE.Quaternion().setFromEuler(e.set(0, -b.rot + TWIST, 0))
    const base = new THREE.Matrix4().compose(new THREE.Vector3(b.x, -EYE_ABOVE_WATER + (b.y0 || 0), b.z), bq, new THREE.Vector3(1, 1, 1))
    const ring = ringFor(b), prof = profileFor(b), n = ring.length
    const ptAt = (i, lv) => { const [fy, sc] = prof[lv]; const [x, z] = ring[i % n]; const yy = fy >= 1 ? topY(b, z) : b.h * fy; return [x * sc, yy, z * sc] }
    const pos = [], uvs = [], col = [], idx = []
    for (let i = 0; i < n; i++) {
      const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % n]
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), nx = dz / len, nz = -dx / len
      const nWorld = new THREE.Vector3(nx, 0, nz).applyQuaternion(bq)
      const lit = 0.5 + 0.5 * (nWorld.x * SUN_H.x + nWorld.z * SUN_H.y), tint = 0.80 + 0.20 * lit
      for (let lv = 0; lv < prof.length - 1; lv++) {
        const A = ptAt(i, lv), B = ptAt(i + 1, lv), Cc = ptAt(i + 1, lv + 1), D = ptAt(i, lv + 1)
        const vbase = pos.length / 3
        for (const [P, uu, vv] of [[A, 0, A[1]], [B, 1, B[1]], [Cc, 1, Cc[1]], [D, 0, D[1]]]) {
          pos.push(P[0], P[1], P[2]); uvs.push((uu * len) / 1.7 / 32, (vv / 1.95) / 64)
          const t = Math.min(1, Math.max(0, P[1] / b.h)), k = tint * (0.62 + 0.34 * t); col.push(k * 1.03, k, k * 0.97)
        }
        // winding: make the triangle normal point outward
        pa.set(...A); pb.set(...B); pc.set(...Cc)
        const tn = pb.clone().sub(pa).cross(pc.clone().sub(pa))
        if (tn.x * nx + tn.z * nz >= 0) idx.push(vbase, vbase + 1, vbase + 2, vbase, vbase + 2, vbase + 3)
        else idx.push(vbase, vbase + 2, vbase + 1, vbase, vbase + 3, vbase + 2)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx)
    g.applyMatrix4(base); lists[key].push(g)
    // roof: fan over the top ring (sloped for 'slant')
    const top = prof.length - 1, rp = [], ri = []
    for (let i = 0; i < n; i++) { const P = ptAt(i, top); rp.push(P[0], P[1], P[2]) }
    for (let i = 1; i < n - 1; i++) ri.push(0, i + 1, i)
    const roof = new THREE.BufferGeometry(); roof.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); roof.setIndex(ri); roof.computeVertexNormals(); roof.applyMatrix4(base)
    roof.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2)); roof.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3))
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
        ? patchHaze(new THREE.MeshBasicMaterial({ color: C(0.30, 0.28, 0.34), toneMapped: false }), mirrored)
        : patchLitWindows(new THREE.MeshBasicMaterial({ map: variantTexture(k), vertexColors: true, toneMapped: false }), [32, 64], mirrored)
      if (mirrored) { o[k].transparent = true; o[k].side = THREE.DoubleSide; o[k].depthWrite = false }
    }
    return o
  }, [geoms, mirrored])
  return <>{Object.keys(geoms).map((k) => <mesh key={k} geometry={geoms[k]} material={mats[k]} frustumCulled={false} renderOrder={mirrored ? 5 : 0} />)}</>
}


// Blender-modelled roof kit (gable / hip / mansard / sawtooth / plant) placed on the low-rise far bank + background buildings: real rooflines instead of flat lids.
const ROOF_TINTS = { stone: ['#5a4d58', '#6b5a58', '#4d4a58', '#7a5d52'], modern: ['#6c6a78', '#7c7b86', '#5a5d6e'] }
function kitGeometry(name, bucket) {
  const d = KIT[name][bucket], n = d.p.length / 3, P = new Float32Array(d.p), C = new Float32Array(n * 3), g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.computeVertexNormals()
  const nr = g.attributes.normal
  for (let i = 0; i < n; i++) {                                    // per-face shade baked into vertex colour (sun side lighter, shadow side cooler)
    const sun = Math.max(0, nr.getX(i) * SUN_H.x + nr.getZ(i) * SUN_H.y), k = 0.62 + 0.3 * Math.max(0, nr.getY(i)) + 0.28 * sun
    C[i * 3] = k * (1 + 0.04 * sun); C[i * 3 + 1] = k; C[i * 3 + 2] = k * (1 - 0.03 * sun + 0.04 * (1 - sun))
  }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3)); return g
}
function Roofs({ layout }) {
  const sets = useMemo(() => {
    const byKind = {}
    for (const b of layout) if (b.roof) (byKind[b.roof] ||= []).push(b)
    const out = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let seed = 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (const [kind, list] of Object.entries(byKind)) {
      const name = 'roof_' + kind
      if (!KIT[name]) continue
      for (const bucket of Object.keys(KIT[name])) {
        const mat = patchHaze(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), false)
        const mesh = new THREE.InstancedMesh(kitGeometry(name, bucket), mat, list.length)
        list.forEach((b, i) => {
          q.setFromEuler(e.set(0, -b.rot + TWIST, 0))
          m4.compose(new THREE.Vector3(b.x, -EYE_ABOVE_WATER + (b.y0 || 0) + b.h, b.z), q, new THREE.Vector3(b.w, b.roofH, b.d)); mesh.setMatrixAt(i, m4)  
          const pal = b.style === 'stone' ? ROOF_TINTS.stone : ROOF_TINTS.modern
          mesh.setColorAt(i, bucket === 'glass' ? col.set('#9fb0c8') : col.set(pal[(rnd() * pal.length) | 0]).multiplyScalar(0.85 + rnd() * 0.3))
        })
        mesh.frustumCulled = false; out.push(mesh)
      }
    }
    return out
  }, [layout])
  return <>{sets.map((m, i) => <primitive key={i} object={m} />)}</>
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
varying vec3 vW; uniform vec3 uCam, uSun, cDeep, cShallow, cGlint, cZenith, cUpper, cMid, cPink, cHorizon; uniform float uAlpha, uInvScale, uTime, uRain, uCloud, uNight; uniform sampler2D uCols;
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
    g += w.xy * (w.w * k * cos(ph) * fade * (1. + 1.5 * uRain)); hs += w.w * sin(ph) * fade;
  }
  // rain: fine pitter-patter chop breaks the reflections up (Bible s04: reflections respond to weather)
  g += uRain * 0.22 * vec2(noise(p * 1.7 + uTime * 1.1) - 0.5, noise(p * 1.9 - uTime * 0.9 + 9.) - 0.5) * smoothstep(0.004 * dist, 0.02 * dist, 6.);
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
  col += cGlint * (pow(S, 90.) * 3.6 + pow(S, 14.) * 0.28) * smoothstep(40., 260., dist) * (1. - 0.85 * uCloud);
  // lit far bank: soft vertical streaks broken by the swell
  float azr = atan(rel.x, -rel.z), aDeg = degrees(azr + hs * 0.0025);
  float lc = texture2D(uCols, vec2((aDeg + 180.) / 360., 0.5)).r;
  float sh = 0.5 + 0.5 * sin(dist * 0.085 + hs * 11. - uTime * 0.7);
  float streak = smoothstep(0.30, 0.95, sh * (0.55 + 0.7 * noise(vec2(aDeg * 5., dist * 0.012))));
  float reach = smoothstep(180., 700., dist) * (1.0 - smoothstep(960., 1120., dist));
  col += vec3(1.0, 0.58, 0.22) * lc * streak * reach * 0.55 * (0.4 + 0.9 * uNight) * (1. - 0.45 * uRain);
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
        uCols: { value: null }, uCam: { value: new THREE.Vector3() }, uInvScale: { value: 1 / SCALE }, uAlpha: { value: 0.86 }, uTime: { value: 0 }, uRain: { value: 0 }, uCloud: { value: 0 }, uNight: { value: 0 },
        uSun: sky.uSun, cZenith: sky.cZenith, cUpper: sky.cUpper, cMid: sky.cMid, cPink: sky.cPink, cHorizon: sky.cHorizon,
        cDeep: { value: C(0.17, 0.19, 0.28) }, cShallow: { value: C(0.30, 0.31, 0.40) }, cGlint: { value: C(0.95, 0.60, 0.30) },
      },
      vertexShader: waterVert, fragmentShader: waterFrag,
    })
  }, [])
  mat.uniforms.uCols.value = cols
  useFrame(({ clock }) => { mat.uniforms.uCam.value.copy(camera.position); mat.uniforms.uTime.value = clock.elapsedTime; mat.uniforms.uInvScale.value = 1 / (world.extScale || SCALE); mat.uniforms.uRain.value = WX.rain; mat.uniforms.uCloud.value = WX.cloud; mat.uniforms.uNight.value = Math.min(1, GLOW.value / 0.55) })
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
    // Bible s04: atmospheric perspective + reflection strength follow time of day and weather
    const U = ATMO_U, night = Math.min(1, GLOW.value / 0.55)
    U.uHazeCol.value.copy(SKY_U.cHorizon.value); U.uHazeK.value = 0.00013 * (1 + 2.4 * WX.rain + 0.9 * WX.cloud); U.uInvExt.value = 1 / s
    U.uRefl.value = (0.36 + 0.3 * night) * (1 - 0.6 * WX.rain) * (1 - 0.2 * WX.cloud)
    U.uRip.value = 0.018 + 0.03 * WX.wind + 0.05 * WX.rain; U.uRipT.value = performance.now() / 1000
    U.uWaterY.value = g.current.position.y - EYE_ABOVE_WATER * s
  })
  return (
    <group ref={g} name="exterior" position={[0, 1.7, -0.4]} scale={[SCALE, SCALE, SCALE]}>
      <FacadeMeshes geoms={geoms} />
      <Roofs layout={layout} />
      {!OFF.has('hood') && <Boats />}
      <NearBank />
      <PyramidCap b={one} />
      <Waterfront />
      {!OFF.has('street') && <StreetVisuals />}
      {/* mirrored copy under the water plane = reflections of the lit towers */}
      <group scale={[1, -1, 1]} position={[0, -2 * EYE_ABOVE_WATER, 0]}><FacadeMeshes geoms={mirrorGeoms} mirrored /><Waterfront mirrored /></group>
      <River layout={layout} />
    </group>
  )
}
