// Cinematic time of day: five coordinated atmospheres (sky, sun/moon, bounce light, fog, exposure, window glow, street lamps, exterior tint) that blend smoothly.
// Golden hour is the signature default. The blend runs in <Atmosphere/> (inside the Canvas); this file is the data + the tiny store the HUD talks to.
import { useSyncExternalStore } from 'react'
import * as THREE from 'three'

const c = (r, g, b) => new THREE.Color(r, g, b)
// colours are in the same working space as the existing sky shader (r, g, b floats); hex strings are sRGB
export const PRESETS = {
  morning: {
    label: 'Soft Morning', icon: '🌤', sunAz: -42, sunEl: 20, sunCol: '#ffd9ae', sun: 2.9, hemiSky: '#e6efff', hemiGround: '#f0d9bd', hemi: 0.78, fill: 0.5, fillCol: '#cfdcf0',
    fog: '#d8d3d8', exp: 1.0, lit: 0.12, glow: 0.0, tint: [0.99, 1.0, 1.04], lamp: 0, win: 0.35,
    sky: { zen: c(0.50, 0.66, 0.92), upper: c(0.66, 0.78, 0.95), mid: c(0.86, 0.88, 0.95), pink: c(0.98, 0.90, 0.84), hor: c(0.93, 0.86, 0.82), below: c(0.55, 0.56, 0.62), glow: c(0.50, 0.40, 0.28), cHi: c(1, 0.95, 0.92), cLo: c(0.78, 0.80, 0.90) },
  },
  afternoon: {
    label: 'Bright Afternoon', icon: '☀️', sunAz: 8, sunEl: 46, sunCol: '#fff1d8', sun: 3.6, hemiSky: '#cfe4ff', hemiGround: '#d9c9a8', hemi: 0.85, fill: 0.5, fillCol: '#d5e3f6',
    fog: '#cdd8e6', exp: 0.95, lit: 0.06, glow: 0.0, tint: [1.04, 1.04, 1.02], lamp: 0, win: 0.3,
    sky: { zen: c(0.30, 0.55, 0.95), upper: c(0.45, 0.70, 1.0), mid: c(0.70, 0.85, 1.0), pink: c(0.86, 0.92, 1.0), hor: c(0.88, 0.90, 0.94), below: c(0.50, 0.55, 0.62), glow: c(0.50, 0.45, 0.30), cHi: c(1, 1, 1), cLo: c(0.82, 0.88, 0.98) },
  },
  golden: {
    label: 'Signature Golden Hour', icon: '🌇', sunAz: 25, sunEl: 9, sunCol: '#ffcfa6', sun: 3.5, hemiSky: '#ffeadf', hemiGround: '#e6d0c6', hemi: 0.95, fill: 0.75, fillCol: '#b8b4e4',
    fog: '#c3aab8', exp: 1.06, lit: 0.45, glow: 0.12, tint: [1, 1, 1], lamp: 1.0, win: 1.0,
    sky: { zen: c(0.56, 0.58, 0.78), upper: c(0.70, 0.67, 0.85), mid: c(0.88, 0.78, 0.82), pink: c(0.93, 0.75, 0.76), hor: c(0.80, 0.66, 0.68), below: c(0.45, 0.42, 0.52), glow: c(0.55, 0.36, 0.22), cHi: c(1.0, 0.80, 0.78), cLo: c(0.70, 0.64, 0.80) },
  },
  blue: {
    label: 'Blue Hour', icon: '🌆', sunAz: 40, sunEl: 5, sunCol: '#8aa0ff', sun: 0.6, hemiSky: '#8fa3e6', hemiGround: '#5a4a6a', hemi: 0.6, fill: 0.7, fillCol: '#8095d8',
    fog: '#5b567a', exp: 1.08, lit: 0.85, glow: 0.55, tint: [0.46, 0.50, 0.72], lamp: 1.0, win: 1.15,
    sky: { zen: c(0.10, 0.14, 0.34), upper: c(0.22, 0.26, 0.50), mid: c(0.45, 0.42, 0.66), pink: c(0.66, 0.52, 0.68), hor: c(0.74, 0.58, 0.64), below: c(0.20, 0.20, 0.32), glow: c(0.35, 0.20, 0.20), cHi: c(0.80, 0.65, 0.78), cLo: c(0.30, 0.32, 0.50) },
  },
  night: {
    label: 'Cosy Night', icon: '🌙', sunAz: -35, sunEl: 38, sunCol: '#9fb4ff', sun: 0.32, hemiSky: '#4a5a9a', hemiGround: '#2a2438', hemi: 0.42, fill: 0.55, fillCol: '#4a5a9a',
    fog: '#1a1a34', exp: 1.25, lit: 1.0, glow: 0.95, tint: [0.17, 0.20, 0.36], lamp: 1.15, win: 1.3,
    sky: { zen: c(0.02, 0.03, 0.09), upper: c(0.04, 0.06, 0.16), mid: c(0.08, 0.10, 0.24), pink: c(0.14, 0.12, 0.28), hor: c(0.20, 0.16, 0.30), below: c(0.05, 0.05, 0.12), glow: c(0.10, 0.08, 0.15), cHi: c(0.20, 0.20, 0.38), cLo: c(0.05, 0.06, 0.14) },
  },
}
export const ORDER = ['morning', 'afternoon', 'golden', 'blue', 'night']

// ---- store (HUD <-> canvas)
let snap = { preset: 'golden', auto: false, rev: 0, reduced: false }
const subs = new Set()
export const atmoStore = {
  get: () => snap,
  set(patch) { snap = { ...snap, ...patch }; subs.forEach((f) => f()) },
  subscribe(f) { subs.add(f); return () => subs.delete(f) },
}
export const useAtmo = () => useSyncExternalStore(atmoStore.subscribe, atmoStore.get)

// ---- live values read by the scene every frame (lamp strength, window glow...) -- blended in <Atmosphere/>
export const LIVE = { lamp: 1.0, win: 1.0, tint: new THREE.Color(1, 1, 1), sunDir: new THREE.Vector3(0.4, 0.16, -0.9), sunEl: 9 }

export const dirFrom = (az, el, out = new THREE.Vector3()) => { const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180; return out.set(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)) }
if (typeof window !== 'undefined') window.__atmo = atmoStore
