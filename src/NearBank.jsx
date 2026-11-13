// Near-bank district ground + embankment (Audit B03.01/05/06/07/09/10): replaces the raw olive plane with a real street grid (asphalt, pavements, courtyard greens)
// aligned with the perimeter blocks from skylineData.addNearBank, and continues the Thames-terrace cross-section (retaining wall, raised promenade, railing)
// past the playable parcel so the river edge never reads as an unexplained slab. Lives inside the exterior group (street coordinates == exterior coordinates).
import { useMemo } from 'react'
import * as THREE from 'three'
import { patchHaze } from './exteriorAtmo.js'
import { NB } from './skylineData.js'
import { GROUND_Y, TERRACE_Y } from './street/geo.js'

function groundTexture() {
  const W = 256, H = 240, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d'), sx = W / NB.PX, sz = H / NB.PZ
  g.fillStyle = '#7d756f'; g.fillRect(0, 0, W, H)                                      // pavement / block base
  const rr = (x0, z0, x1, z1, col) => { g.fillStyle = col; g.fillRect(x0 * sx, z0 * sz, (x1 - x0) * sx, (z1 - z0) * sz) }
  // streets run along the tile edges (centre line = edge), 14 m wide with 2.2 m pavements; tile wraps so draw half-widths at both edges
  for (const [a, b] of [[0, 7], [NB.PX - 7, NB.PX]]) rr(a, 0, b, NB.PZ, '#3c3a42')
  for (const [a, b] of [[0, 7], [NB.PZ - 7, NB.PZ]]) rr(0, a, NB.PX, b, '#3c3a42')
  for (const [a, b] of [[7, 9.2], [NB.PX - 9.2, NB.PX - 7]]) rr(a, 0, b, NB.PZ, '#a39a92')
  for (const [a, b] of [[7, 9.2], [NB.PZ - 9.2, NB.PZ - 7]]) rr(0, a, NB.PX, b, '#a39a92')
  rr(7, 7, NB.PX - 7, NB.PZ - 7, '#6b6a60')                                             // block footprint (mostly under buildings)
  rr(11, 7 + 15, NB.PX - 11, NB.PZ - 7 - 15, '#56694a')                                // courtyard garden between the two rows
  rr(NB.PX / 2 - 2, 7 + 15, NB.PX / 2 + 2, NB.PZ - 7 - 15, '#a89f8f')                  // path
  g.fillStyle = '#c9c1b3'; for (let i = 0; i < 6; i++) { g.fillRect(0, 0, 0, 0) }
  g.fillStyle = 'rgba(224,214,190,0.5)'                                                  // road centre dashes
  for (let z = 4; z < NB.PZ; z += 9) g.fillRect(-0.3 * sx + 0, z * sz, 0.6 * sx, 3 * sz), g.fillRect(NB.PX * sx - 0.6 * sx, z * sz, 0.6 * sx, 3 * sz)
  for (let x = 4; x < NB.PX; x += 9) g.fillRect(x * sx, 0, 3 * sx, 0.6 * sz), g.fillRect(x * sx, NB.PZ * sz - 0.6 * sz, 3 * sx, 0.6 * sz)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  t.repeat.set(9000 / NB.PX, 4290 / NB.PZ); return t
}
function stoneTexture(rep) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')
  g.fillStyle = '#b6ac9f'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(70,62,56,0.45)'; g.lineWidth = 1
  for (let i = 0; i <= 64; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(rep[0], rep[1]); return t
}
function railTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#25232b'
  g.fillRect(0, 2, 64, 5); g.fillRect(0, 56, 64, 5); for (let i = 4; i < 64; i += 10) g.fillRect(i, 7, 3, 49)
  g.fillRect(0, 0, 3, 64)
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t
}

const SEG = [[-3000, -140], [95, 3000]]                                                  // embankment extension either side of the playable terrace (x -125..80 is built in plan.js)
export function NearBank() {
  const m = useMemo(() => {
    const ground = patchHaze(new THREE.MeshLambertMaterial({ map: groundTexture() }))
    const rail = railTexture(); rail.repeat.set(1, 1)
    return {
      ground,
      wall: patchHaze(new THREE.MeshLambertMaterial({ color: '#8d8278' })),
      deck: patchHaze(new THREE.MeshLambertMaterial({ map: stoneTexture([1, 1]), color: '#d8d0c4' })),
      rail: patchHaze(new THREE.MeshBasicMaterial({ map: rail, alphaTest: 0.5, side: THREE.DoubleSide, color: '#ffffff' })),
      lamp: new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }),
      post: new THREE.MeshLambertMaterial({ color: '#2a2830' }),
    }
  }, [])
  const H = TERRACE_Y - GROUND_Y, zr = -150, zw = -132, Z = (zr + zw) / 2
  return (
    <>
      {/* street-grid ground out to the haze (v=1 edge is z=-145, matching the block grid) */}
      <mesh position={[0, GROUND_Y - 0.45, 2000]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false} material={m.ground}><planeGeometry args={[9000, 4290]} /></mesh>
      {SEG.map(([a, b], i) => { const L = b - a, cx = (a + b) / 2, tex = stoneTexture([L / 4, 4.5]), rm = m.rail.clone(); rm.map = rm.map.clone(); rm.map.needsUpdate = true; rm.map.repeat.set(L / 2, 1); return (
        <group key={i}>
          <mesh position={[cx, GROUND_Y + H / 2 - 0.3, zr + 0.4]} material={m.wall} frustumCulled={false}><boxGeometry args={[L, H + 0.6, 0.8]} /></mesh>
          <mesh position={[cx, TERRACE_Y - 0.05, Z]} frustumCulled={false}><boxGeometry args={[L, 0.1, zw - zr]} /><meshLambertMaterial map={tex} color="#d8d0c4" /></mesh>
          <mesh position={[cx, GROUND_Y + H / 2 - 0.2, zw]} material={m.wall} frustumCulled={false}><boxGeometry args={[L, H + 0.4, 0.5]} /></mesh>
          <mesh position={[cx, TERRACE_Y + 0.52, zr + 0.55]} material={rm} frustumCulled={false}><planeGeometry args={[L, 1.05]} /></mesh>
        </group>) })}
    </>
  )
}
