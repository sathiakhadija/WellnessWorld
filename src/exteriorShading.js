// Shared golden-hour shading for the unlit exterior meshes (boats, waterfront, neighbourhood): sun/sky shading is baked into vertex colours.
import * as THREE from 'three'
import { SUN_AZ_DEG, SUN_EL_DEG } from './skylineData.js'
const rad = (d) => (d * Math.PI) / 180
export const SUN = new THREE.Vector3(Math.sin(rad(SUN_AZ_DEG)) * Math.cos(rad(SUN_EL_DEG)), Math.sin(rad(SUN_EL_DEG)), -Math.cos(rad(SUN_AZ_DEG)) * Math.cos(rad(SUN_EL_DEG)))
export const SUN_COL = new THREE.Color(1.0, 0.74, 0.5), SKY_COL = new THREE.Color(0.46, 0.43, 0.60)
export function shadeColor(base, n, k = 1, sun = SUN) {
  const lit = Math.max(0, n.dot(sun)), up = 0.5 + 0.5 * n.y
  return new THREE.Color(
    base.r * (SKY_COL.r * (0.55 + 0.4 * up) + SUN_COL.r * lit * 1.15),
    base.g * (SKY_COL.g * (0.55 + 0.4 * up) + SUN_COL.g * lit * 1.15),
    base.b * (SKY_COL.b * (0.55 + 0.4 * up) + SUN_COL.b * lit * 1.15),
  ).multiplyScalar(k)
}
// give a geometry per-vertex colours from its normals (sun = sun direction in the geometry's own frame)
export function paint(geo, hex, k = 1, sun = SUN) {
  const g = geo.index ? geo.toNonIndexed() : geo
  if (!g.attributes.normal) g.computeVertexNormals()
  const pos = g.attributes.position, nor = g.attributes.normal, col = new Float32Array(pos.count * 3)
  const base = new THREE.Color(hex), n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(nor, i); const c = shadeColor(base, n, k, sun)
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  if (g.attributes.uv === undefined) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2))
  return g
}
