// Directional exterior, everything behind and beside the penthouse. Authored in REAL metres around the CAM1 eye (same frame as Skyline.jsx, rendered in the
// same 1/6-scaled group): front (-z) = the Thames + Canary Wharf (Skyline.jsx); this file = near-bank London neighbourhood (rear and both sides), a distant
// rear skyline, the embankment, boats on the river and the tower the penthouse sits on.
//   * ~900 city blocks on a 72 m street grid; each block = four terraces/mansion blocks around a courtyard with trees (merged into ONE mesh)
//   * street lamps as additive points, rooftops with chimneys, lit windows from a tiled facade texture, sun/sky shading baked into vertex colours
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EYE_ABOVE_WATER, SUN_AZ_DEG, SUN_EL_DEG } from './skylineData.js'

const GROUND_Y = -EYE_ABOVE_WATER
const RIVER_NEAR = -150                         // near river edge (real z). Everything with z > RIVER_NEAR is the near bank.
const PITCH = 72, BLOCK = 58, DEPTH = 13
const rad = (d) => (d * Math.PI) / 180
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

const SUN = new THREE.Vector3(Math.sin(rad(SUN_AZ_DEG)) * Math.cos(rad(SUN_EL_DEG)), Math.sin(rad(SUN_EL_DEG)), -Math.cos(rad(SUN_AZ_DEG)) * Math.cos(rad(SUN_EL_DEG)))
const SUN_COL = new THREE.Color(1.0, 0.74, 0.5), SKY_COL = new THREE.Color(0.42, 0.40, 0.58)

function shadeColor(base, n, k = 1) {   // low golden-hour sun from the river side + cool sky fill
  const lit = Math.max(0, n.dot(SUN)), up = 0.5 + 0.5 * n.y
  return new THREE.Color(
    base.r * (SKY_COL.r * (0.55 + 0.4 * up) + SUN_COL.r * lit * 1.15),
    base.g * (SKY_COL.g * (0.55 + 0.4 * up) + SUN_COL.g * lit * 1.15),
    base.b * (SKY_COL.b * (0.55 + 0.4 * up) + SUN_COL.b * lit * 1.15),
  ).multiplyScalar(k)
}

function houseTexture() {
  const W = 256, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d'); const R = rng(4)
  g.fillStyle = '#c9c4c0'; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 900; i++) { const v = 170 + Math.floor(R() * 60); g.fillStyle = `rgba(${v},${v - 6},${v - 10},0.35)`; g.fillRect(R() * W, R() * H, 4 + R() * 6, 2) }      // brick mottling
  for (let fl = 0; fl < 2; fl++) for (let bay = 0; bay < 4; bay++) {
    const x = bay * 64 + 18, y = fl * 64 + 12, lit = R() < 0.34
    g.fillStyle = '#efeae4'; g.fillRect(x - 3, y - 3, 34, 46)                                  // stone surround
    g.fillStyle = lit ? `rgb(255,${190 + Math.floor(R() * 40)},${110 + Math.floor(R() * 40)})` : '#4b4f66'; g.fillRect(x, y, 28, 40)   // window
    if (!lit) { g.fillStyle = 'rgba(255,190,150,0.25)'; g.fillRect(x, y, 28, 12) }
    g.fillStyle = 'rgba(40,30,30,0.55)'; g.fillRect(x + 13, y, 2, 40); g.fillRect(x, y + 19, 28, 2)   // glazing bars
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t
}

// ---- geometry accumulator -----------------------------------------------------------------------------------------------------------
class Acc {
  constructor() { this.p = []; this.uv = []; this.c = []; this.i = []; this.n = 0 }
  quad(a, b, c, d, uvs, col) {      // a,b,c,d counter-clockwise seen from the outside
    for (const v of [a, b, c, d]) { this.p.push(v.x, v.y, v.z); this.c.push(col.r, col.g, col.b) }
    for (const u of uvs) this.uv.push(u[0], u[1])
    this.i.push(this.n, this.n + 1, this.n + 2, this.n, this.n + 2, this.n + 3); this.n += 4
  }
  tri(a, b, c, uvs, col) {
    for (const v of [a, b, c]) { this.p.push(v.x, v.y, v.z); this.c.push(col.r, col.g, col.b) }
    for (const u of uvs) this.uv.push(u[0], u[1])
    this.i.push(this.n, this.n + 1, this.n + 2); this.n += 3
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); return g
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z)

// a building: centre (cx,cz), length L along local x, depth D along local z, height h, rotation about Y, roof 'gable' | 'flat'
function addBuilding(wall, roof, cx, cz, L, D, h, rot, base, roofCol, kind, R, tile) {
  const cs = Math.cos(rot), sn = Math.sin(rot)
  const P = (lx, y, lz) => V(cx + lx * cs + lz * sn, GROUND_Y + y, cz - lx * sn + lz * cs)
  const N = (lx, lz) => V(lx * cs + lz * sn, 0, -lx * sn + lz * cs)
  const hl = L / 2, hd = D / 2
  const u = L / (tile.w), v = h / (tile.h), ud = D / tile.w
  const faces = [
    [P(-hl, 0, hd), P(hl, 0, hd), P(hl, h, hd), P(-hl, h, hd), N(0, 1), u],       // +z face
    [P(hl, 0, -hd), P(-hl, 0, -hd), P(-hl, h, -hd), P(hl, h, -hd), N(0, -1), u],  // -z face
    [P(hl, 0, hd), P(hl, 0, -hd), P(hl, h, -hd), P(hl, h, hd), N(1, 0), ud],      // +x end
    [P(-hl, 0, -hd), P(-hl, 0, hd), P(-hl, h, hd), P(-hl, h, -hd), N(-1, 0), ud], // -x end
  ]
  for (const [a, b, c, d, n, uu] of faces) {
    const flip = (R() * 4) | 0, off = R()
    wall.quad(a, b, c, d, [[off, 0], [off + uu, 0], [off + uu, v], [off, v]], shadeColor(base, n, 0.92 + R() * 0.16))
  }
  if (kind === 'plain') {
    roof.quad(P(-hl, h, hd), P(hl, h, hd), P(hl, h, -hd), P(-hl, h, -hd), [[0, 0], [1, 0], [1, 1], [0, 1]], shadeColor(roofCol, V(0, 1, 0), 0.8))
  } else if (kind === 'flat') {
    const top = shadeColor(roofCol, V(0, 1, 0), 0.8)
    roof.quad(P(-hl, h, hd), P(hl, h, hd), P(hl, h, -hd), P(-hl, h, -hd), [[0, 0], [1, 0], [1, 1], [0, 1]], top)
    // parapet band + a plant room
    const pc = shadeColor(base, V(0, 1, 0), 0.5)
    roof.quad(P(-hl * 0.3, h, hd * 0.3), P(hl * 0.3, h, hd * 0.3), P(hl * 0.3, h + 2.4, hd * 0.3), P(-hl * 0.3, h + 2.4, hd * 0.3), [[0, 0], [1, 0], [1, 1], [0, 1]], pc)
    roof.quad(P(-hl * 0.3, h + 2.4, hd * 0.3), P(hl * 0.3, h + 2.4, hd * 0.3), P(hl * 0.3, h + 2.4, -hd * 0.3), P(-hl * 0.3, h + 2.4, -hd * 0.3), [[0, 0], [1, 0], [1, 1], [0, 1]], top)
  } else {
    const rh = D * (0.22 + R() * 0.1), ov = 0.0
    const nF = V(0, hd, rh).normalize().applyAxisAngle(V(0, 1, 0), rot), nB = V(0, hd, -rh).normalize().applyAxisAngle(V(0, 1, 0), rot)
    const slateF = shadeColor(roofCol, nF, 0.95), slateB = shadeColor(roofCol, nB, 0.95)
    roof.quad(P(-hl, h, hd), P(hl, h, hd), P(hl, h + rh, 0), P(-hl, h + rh, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], slateF)
    roof.quad(P(hl, h, -hd), P(-hl, h, -hd), P(-hl, h + rh, 0), P(hl, h + rh, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], slateB)
    const gc = shadeColor(base, N(1, 0), 0.9)
    roof.tri(P(hl, h, hd), P(hl, h, -hd), P(hl, h + rh, 0), [[0, 0], [1, 0], [0.5, 1]], gc)
    roof.tri(P(-hl, h, -hd), P(-hl, h, hd), P(-hl, h + rh, 0), [[0, 0], [1, 0], [0.5, 1]], shadeColor(base, N(-1, 0), 0.9))
    for (let k = 0; k < 2; k++) {              // chimney stacks along the ridge
      const lx = (R() - 0.5) * (L - 6), cw = 1.1, ch = rh + 2.2
      const ccol = shadeColor(base, V(0, 0, 1), 0.85)
      for (const [a, b, c, d, n] of [
        [P(lx - cw, h, cw), P(lx + cw, h, cw), P(lx + cw, h + ch, cw), P(lx - cw, h + ch, cw), N(0, 1)],
        [P(lx + cw, h, -cw), P(lx - cw, h, -cw), P(lx - cw, h + ch, -cw), P(lx + cw, h + ch, -cw), N(0, -1)],
        [P(lx + cw, h, cw), P(lx + cw, h, -cw), P(lx + cw, h + ch, -cw), P(lx + cw, h + ch, cw), N(1, 0)],
        [P(lx - cw, h, -cw), P(lx - cw, h, cw), P(lx - cw, h + ch, cw), P(lx - cw, h + ch, -cw), N(-1, 0)],
      ]) roof.quad(a, b, c, d, [[0.1, 0.1], [0.14, 0.1], [0.14, 0.14], [0.1, 0.14]], shadeColor(base, n, 0.85))
    }
  }
}

const BRICKS = [[0.62, 0.36, 0.30], [0.55, 0.34, 0.28], [0.70, 0.58, 0.44], [0.60, 0.52, 0.45], [0.74, 0.66, 0.55], [0.48, 0.36, 0.34], [0.78, 0.70, 0.60]].map((a) => new THREE.Color(...a))
const SLATES = [[0.30, 0.31, 0.38], [0.36, 0.30, 0.30], [0.28, 0.28, 0.33]].map((a) => new THREE.Color(...a))

function buildNeighbourhood() {
  const R = rng(1337)
  const wall = new Acc(), roof = new Acc()
  const trees = [], lamps = [], lawns = new Acc()
  const tile = { w: 24, h: 6.4 }
  for (let ix = -22; ix <= 22; ix++) for (let iz = -2; iz <= 23; iz++) {
    const cx = ix * PITCH, cz = iz * PITCH + 18
    if (cz - BLOCK / 2 < RIVER_NEAR + 12) continue
    if (cx > -95 && cx < 70 && cz > -150 && cz < 50) continue            // the tower the penthouse sits on (+ plaza)
    const dist = Math.hypot(cx, cz), far = dist > 800
    const style = R()
    const base = BRICKS[(R() * BRICKS.length) | 0], slate = SLATES[(R() * SLATES.length) | 0]
    const mansion = style > 0.72
    const hBase = mansion ? 19 + R() * 9 : 10.5 + R() * 3.2
    const hh = far ? hBase * (1 + 0.15 * R()) : hBase
    const half = BLOCK / 2 - DEPTH / 2
    const sides = [
      { x: cx, z: cz + half, L: BLOCK, rot: 0 }, { x: cx, z: cz - half, L: BLOCK, rot: 0 },
      { x: cx + half, z: cz, L: BLOCK - 2 * DEPTH, rot: Math.PI / 2 }, { x: cx - half, z: cz, L: BLOCK - 2 * DEPTH, rot: Math.PI / 2 },
    ]
    for (const s of sides) {
      const h = hh * (0.85 + R() * 0.3)
      addBuilding(wall, roof, s.x, s.z, s.L, DEPTH, h, s.rot, base, slate, mansion ? 'flat' : 'gable', R, tile)
    }
    // courtyard: lawn + trees (near blocks only)
    const c0 = BLOCK / 2 - DEPTH
    const lawn = shadeColor(new THREE.Color(0.30, 0.38, 0.22), V(0, 1, 0), 1)
    lawns.quad(V(cx - c0, GROUND_Y + 0.15, cz + c0), V(cx + c0, GROUND_Y + 0.15, cz + c0), V(cx + c0, GROUND_Y + 0.15, cz - c0), V(cx - c0, GROUND_Y + 0.15, cz - c0), [[0, 0], [1, 0], [1, 1], [0, 1]], lawn)
    if (dist < 750) {
      const nt = 5 + ((R() * 4) | 0)
      for (let k = 0; k < nt; k++) trees.push([cx + (R() - 0.5) * 2 * (c0 - 3), cz + (R() - 0.5) * 2 * (c0 - 3), 4 + R() * 3.5])
      for (let k = 0; k < 6; k++) { const t = -BLOCK / 2 + 6 + k * 9.2; trees.push([cx + t, cz + BLOCK / 2 + 3.2, 3.4 + R() * 2]); trees.push([cx - t, cz - BLOCK / 2 - 3.2, 3.4 + R() * 2]) }
    }
    // street lamps along the block edges (every ~24 m), warm sodium
    if (dist < 1100) for (const e of [-1, 1]) for (let k = 0; k < 3; k++) {
      const t = -BLOCK / 2 + 6 + k * 23
      lamps.push([cx + t, GROUND_Y + 7, cz + e * (BLOCK / 2 + 4)]); lamps.push([cx + e * (BLOCK / 2 + 4), GROUND_Y + 7, cz + t])
    }
  }
  // the tower the penthouse stands on (shaft): x -60..30, z -86..2, from the ground up to the penthouse floor
  {
    const x0 = -62, x1 = 32, z0 = -88, z1 = 4, yTop = -14.5 - GROUND_Y
    const c = new THREE.Color(0.66, 0.60, 0.52)
    const tl = { w: 22, h: 6.4 }
    addBuilding(wall, roof, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, yTop, 0, c, SLATES[0], 'plain', rng(2), tl)
  }
  return { wall: wall.geometry(), roof: roof.geometry(), lawns: lawns.geometry(), trees, lamps }
}

function dotTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32
  const g = cv.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(0.35, 'rgba(255,190,100,0.8)'); gr.addColorStop(1, 'rgba(255,150,60,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv)
}

function GroundAndEmbankment() {
  const tex = useMemo(() => dotTexture(), [])
  const lamps = useMemo(() => {   // promenade along the near river edge
    const p = []; for (let x = -2400; x <= 2400; x += 22) p.push(x, GROUND_Y + 6, RIVER_NEAR + 10)
    return new THREE.Float32BufferAttribute(p, 3)
  }, [])
  const gLamps = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', lamps); return g }, [lamps])
  return (
    <>
      {/* street-level ground (dark asphalt/pavement) behind the embankment */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.3, RIVER_NEAR + 2300]}><planeGeometry args={[9000, 4600]} /><meshBasicMaterial color="#2c2833" /></mesh>
      {/* embankment wall + promenade */}
      <mesh position={[0, GROUND_Y + 2, RIVER_NEAR + 2]}><boxGeometry args={[9000, 4, 8]} /><meshBasicMaterial color="#4a4350" /></mesh>
      <mesh position={[0, GROUND_Y + 4.3, RIVER_NEAR + 12]}><boxGeometry args={[9000, 0.6, 16]} /><meshBasicMaterial color="#5a5260" /></mesh>
      <points geometry={gLamps}><pointsMaterial size={4} sizeAttenuation={false} map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    </>
  )
}

export function Neighbourhood() {
  const built = useMemo(buildNeighbourhood, [])
  const tex = useMemo(houseTexture, [])
  const dot = useMemo(dotTexture, [])
  const treeMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), built.trees.length)
    const o = new THREE.Object3D(), c = new THREE.Color(), R = rng(8)
    const pal = ['#3a4a31', '#46532f', '#56522c', '#2f3f33', '#6a4e2c', '#4d5a36']
    built.trees.forEach(([x, z, s], i) => {
      o.position.set(x, GROUND_Y + s * 0.95, z); o.scale.set(s * 0.75, s, s * 0.75); o.rotation.y = R() * 6; o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(pal[(R() * pal.length) | 0]).multiplyScalar(0.8 + R() * 0.35))
    })
    m.frustumCulled = false; return m
  }, [built])
  const lampGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(built.lamps.flat(), 3)); return g }, [built])
  return (
    <>
      <GroundAndEmbankment />
      <mesh geometry={built.lawns}><meshBasicMaterial vertexColors /></mesh>
      <mesh geometry={built.wall} frustumCulled={false}><meshBasicMaterial map={tex} vertexColors /></mesh>
      <mesh geometry={built.roof} frustumCulled={false}><meshBasicMaterial map={tex} vertexColors side={THREE.DoubleSide} /></mesh>
      <primitive object={treeMesh} />
      <points geometry={lampGeo} frustumCulled={false}><pointsMaterial size={3} sizeAttenuation={false} map={dot} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    </>
  )
}

// ---- boats on the Thames --------------------------------------------------------------------------------------------------------------
function streakTexture() {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128
  const g = cv.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128)
  gr.addColorStop(0, 'rgba(255,190,100,0.0)'); gr.addColorStop(0.1, 'rgba(255,190,100,0.55)'); gr.addColorStop(1, 'rgba(255,150,70,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 32, 128)
  for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 10 + i * 8, 32, 2) }
  return new THREE.CanvasTexture(cv)
}

function Boat({ z, x0, speed, scale = 1, color = '#e9e2da' }) {
  const ref = useRef()
  const streak = useMemo(streakTexture, [])
  const warm = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd48a', toneMapped: false }), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const span = 1900, t = (x0 + speed * clock.elapsedTime + span) % (2 * span) - span
    ref.current.position.x = t
  })
  const L = 38, W = 8
  return (
    <group ref={ref} position={[x0, GROUND_Y, z]} scale={scale} rotation={[0, speed < 0 ? Math.PI : 0, 0]}>
      <mesh position={[0, 2.2, 0]}><boxGeometry args={[L, 4.4, W]} /><meshBasicMaterial color="#3b2f33" /></mesh>
      <mesh position={[0, 5.3, 0]}><boxGeometry args={[L * 0.82, 3.2, W * 0.86]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={[-1, 8.2, 0]}><boxGeometry args={[L * 0.5, 2.8, W * 0.7]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={[0, 5.4, W * 0.435]} material={warm}><boxGeometry args={[L * 0.74, 1.3, 0.2]} /></mesh>
      <mesh position={[0, 5.4, -W * 0.435]} material={warm}><boxGeometry args={[L * 0.74, 1.3, 0.2]} /></mesh>
      <mesh position={[-1, 8.3, W * 0.355]} material={warm}><boxGeometry args={[L * 0.44, 1.1, 0.2]} /></mesh>
      <mesh position={[0, 9.8, 0]} material={warm}><boxGeometry args={[L * 0.6, 0.35, 0.35]} /></mesh>
      {/* warm light streak on the water toward the viewer (+z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 70 * 0.5 + 3]}><planeGeometry args={[L * 0.8, 70]} /><meshBasicMaterial map={streak} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  )
}

export function Boats() {
  return (
    <>
      <Boat z={-360} x0={-380} speed={5} />
      <Boat z={-250} x0={420} speed={-3.5} scale={0.62} color="#d9524a" />
      <Boat z={-520} x0={900} speed={-4.5} scale={0.8} />
    </>
  )
}

// distant rear city (north of the penthouse): mid/high-rise clusters at the rear horizon so the back view is "established London", not empty
export function rearLayout() {
  const R = rng(99), out = []
  for (let i = 0; i < 70; i++) {
    const azDeg = 110 + R() * 140, D = 1700 + R() * 2200, a = rad(azDeg)
    const h = R() > 0.85 ? 90 + R() * 90 : 30 + R() * 55, w = 24 + R() * 40
    out.push({ name: 'rear' + i, style: R() > 0.5 ? 'stone' : 'glass', hero: false, x: D * Math.sin(a), z: -D * Math.cos(a), w, d: w * (0.7 + R() * 0.6), h: h + 80, rot: a + (R() - 0.5) * 0.6, shade: R() })
  }
  return out
}
