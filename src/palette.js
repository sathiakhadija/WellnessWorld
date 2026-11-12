// Wellness World palette + shared material registry (game side). Source of truth: src/palette/registry.src.json -> `node scripts/build_palette.mjs`.
// RULES for environments (docs/bible/PALETTE_USAGE.md): pick colours/materials ONLY via ww('WW_ID') / wwColor('WW_ID'); never write a free hex for architecture.
// Colour space: registry hex is sRGB. THREE.Color(hex) converts sRGB->linear once (ColorManagement enabled), so we hand it the hex, never pre-linearised values (no double gamma).
// Linear RGB values in the JSON are for Blender (Principled BSDF takes linear) and for the audit.
import * as THREE from 'three'
import REG from './palette/registry.json'

export const REGISTRY = Object.fromEntries(REG.materials.map((m) => [m.id, m]))
export const REGISTRY_LIST = REG.materials
export const REGISTRY_GAPS = REG.gaps
export const LAMP_K = { warmLow: 2700, warmHigh: 3200 }

export function wwEntry(id) { const e = REGISTRY[id]; if (!e) throw new Error('[palette] unknown material id ' + id); return e }
export function wwColor(id, alt = false) { const e = wwEntry(id); return new THREE.Color(alt && e.alt ? e.alt : e.hex) }

const CACHE = new Map()
// One shared MeshStandardMaterial per canonical id (+ optional variant key) — prevents duplicate materials. `over` may tweak roughness/map/etc. for a documented variant.
export function ww(id, over = {}, variant = '') {
  const key = id + '|' + variant
  if (CACHE.has(key)) return CACHE.get(key)
  const e = wwEntry(id)
  const glass = e.cat === 'glass'
  const p = { color: new THREE.Color(e.hex), roughness: e.rough ?? 0.8, metalness: e.metal ?? 0 }
  if (glass) Object.assign(p, { transparent: true, opacity: e.glass?.opacity ?? 0.12, depthWrite: false })
  const m = new THREE.MeshStandardMaterial({ ...p, ...over })
  m.name = id + (variant ? ':' + variant : '')
  m.userData.wwId = id
  CACHE.set(key, m)
  return m
}
export const wwMaterials = () => [...CACHE.values()]

// sRGB hex helpers (audit/calibration)
export const hexToLinear = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b] }
