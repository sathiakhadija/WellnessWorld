// Procedural, tileable surface textures (canvas) for the street level. All are greyscale-ish detail that MULTIPLIES the vertex colour, and all are
// authored at a real-world tile size so geometry UVs (metres / tile) give correctly scaled brick, stone and paving. Matte, low contrast: no glossy streets.
import * as THREE from 'three'
import { rng } from './geo.js'

const mk = (w, h, draw) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const g = cv.getContext('2d'); draw(g, w, h)
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}
const gray = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${Math.round(c * 0.985)},${Math.round(c * 0.955)})` }
const speckle = (g, w, h, R, n, amp, size = 1.5) => { for (let i = 0; i < n; i++) { const v = 128 + (R() - 0.5) * amp; g.fillStyle = `rgba(${v},${v},${v},0.18)`; g.fillRect(R() * w, R() * h, size * (0.5 + R()), size * (0.5 + R())) } }

// brick: tile = 0.9 m x 1.0 m, 4 stretchers x 12 courses (stretcher bond)
export const brickTex = () => mk(256, 256, (g, w, h) => {
  const R = rng(11); g.fillStyle = gray(196); g.fillRect(0, 0, w, h)
  const bw = w / 4, bh = h / 12
  for (let r = 0; r < 12; r++) for (let c = -1; c < 4; c++) {
    const off = (r % 2) * bw / 2, x = c * bw + off, y = r * bh, v = 232 + (R() - 0.5) * 42
    g.fillStyle = gray(v); g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3)
    if (R() < 0.12) { g.fillStyle = 'rgba(70,40,30,0.12)'; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3) }
  }
  speckle(g, w, h, R, 900, 70, 1.8)
})
// ashlar limestone: tile = 2.4 m x 1.2 m, two courses of 1.2 m x 0.6 m blocks (stacked bond offset)
export const ashlarTex = () => mk(512, 256, (g, w, h) => {
  const R = rng(23); g.fillStyle = gray(190); g.fillRect(0, 0, w, h)
  for (let r = 0; r < 2; r++) for (let c = -1; c < 2; c++) {
    const x = c * (w / 2) + (r % 2) * (w / 4), y = r * (h / 2), v = 244 + (R() - 0.5) * 20
    g.fillStyle = gray(v); g.fillRect(x + 1.5, y + 1.5, w / 2 - 3, h / 2 - 3)
  }
  speckle(g, w, h, R, 1400, 50, 1.4)
})
// smooth lime render / stucco with faint trowel noise: tile 3 m
export const plasterTex = () => mk(256, 256, (g, w, h) => {
  const R = rng(5); g.fillStyle = gray(240); g.fillRect(0, 0, w, h)
  speckle(g, w, h, R, 2600, 38, 3.2)
})
// large-format paving slabs: tile = 1.8 m x 1.2 m (2 x 2 slabs of 0.9 x 0.6). Natural limestone/sandstone variation: per-slab tint + veining, crisp darker joints.
export const slabTex = () => mk(512, 256, (g, w, h) => {
  const R = rng(31); g.fillStyle = 'rgb(168,160,150)'; g.fillRect(0, 0, w, h)
  const tints = [[238, 232, 220], [232, 224, 210], [236, 226, 216], [226, 224, 214], [240, 230, 214]]
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const t = tints[(R() * tints.length) | 0], k = 0.94 + R() * 0.08, x0 = c * w / 2 + 2, y0 = r * h / 2 + 2, ww = w / 2 - 4, hh = h / 2 - 4
    const gr = g.createLinearGradient(x0, y0, x0 + ww, y0 + hh); gr.addColorStop(0, `rgb(${t[0] * k},${t[1] * k},${t[2] * k})`); gr.addColorStop(1, `rgb(${t[0] * k * 0.95},${t[1] * k * 0.95},${t[2] * k * 0.96})`)
    g.fillStyle = gr; g.fillRect(x0, y0, ww, hh)
    for (let v = 0; v < 3; v++) { g.strokeStyle = `rgba(150,140,128,${0.08 + R() * 0.08})`; g.lineWidth = 1 + R(); g.beginPath(); g.moveTo(x0 + R() * ww, y0); g.bezierCurveTo(x0 + R() * ww, y0 + hh * 0.3, x0 + R() * ww, y0 + hh * 0.7, x0 + R() * ww, y0 + hh); g.stroke() }
  }
  speckle(g, w, h, R, 1400, 30, 1.6)
})
// granite setts (cobbles): tile = 1.6 m x 1.6 m of 0.1 m setts in staggered rows. Each sett has its own warm/cool grey tint, a lit top edge and a dark joint.
export const settTex = () => mk(512, 512, (g, w, h) => {
  const R = rng(41); g.fillStyle = 'rgb(96,90,86)'; g.fillRect(0, 0, w, h)
  const n = 16, s = w / n, hues = [[214, 204, 194], [204, 200, 198], [222, 206, 190], [198, 192, 188], [226, 212, 200], [190, 188, 190], [216, 196, 184]]
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const off = (r % 2) * s / 2, t = hues[(R() * hues.length) | 0], k = 0.82 + R() * 0.26, x = c * s + off + 1.5, y = r * s + 1.5, ww = s - 3, hh = s - 3
    g.fillStyle = `rgb(${t[0] * k},${t[1] * k},${t[2] * k})`; g.beginPath(); g.roundRect ? g.roundRect(x, y, ww, hh, 5) : g.rect(x, y, ww, hh); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x + 2, y + 1, ww - 4, 2); g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(x + 2, y + hh - 3, ww - 4, 2)
    if (R() < 0.25) { g.fillStyle = 'rgba(70,64,58,0.10)'; g.fillRect(x + R() * ww * 0.5, y + R() * hh * 0.5, ww * 0.35, hh * 0.3) }
  }
})
// asphalt: tile 4 m. warm dark grey, fine aggregate, matte
export const asphaltTex = () => mk(256, 256, (g, w, h) => {
  const R = rng(55); g.fillStyle = gray(196); g.fillRect(0, 0, w, h)
  speckle(g, w, h, R, 5200, 110, 2)
})
export const grassTex = () => mk(256, 256, (g, w, h) => {
  const R = rng(66); g.fillStyle = gray(220); g.fillRect(0, 0, w, h)
  for (let i = 0; i < 5200; i++) { const v = 200 + (R() - 0.5) * 70; g.fillStyle = `rgba(${v},${v},${v * 0.9},0.35)`; g.fillRect(R() * w, R() * h, 1.4, 3.2) }
})
export const gravelTex = () => mk(256, 256, (g, w, h) => {
  const R = rng(77); g.fillStyle = gray(200); g.fillRect(0, 0, w, h)
  for (let i = 0; i < 3400; i++) { const v = 150 + R() * 100; g.fillStyle = `rgba(${v},${v * 0.97},${v * 0.92},0.8)`; g.beginPath(); g.arc(R() * w, R() * h, 0.8 + R() * 1.8, 0, 6.3); g.fill() }
})
export const dotTex = () => mk(32, 32, (g) => {
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(0.3, 'rgba(255,196,110,0.85)'); gr.addColorStop(1, 'rgba(255,150,60,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32)
})
// soft pool of lamplight on the ground (additive decal)
export const poolTex = () => mk(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,200,130,0.55)'); gr.addColorStop(0.5, 'rgba(255,170,90,0.2)'); gr.addColorStop(1, 'rgba(255,150,70,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
})

// shop signs: an atlas of painted fascia boards. SIGNS[i] is drawn in cell i of a 2 x 4 grid (each 512 x 128)
export const SIGNS = [
  { text: 'Café Violette', bg: '#3b2f3a', fg: '#efe3d0', sub: 'coffee · patisserie' },
  { text: 'The Quiet Page', bg: '#2f3d36', fg: '#efe3d0', sub: 'books' },
  { text: 'Fleur', bg: '#e9dfd2', fg: '#4a3a46', sub: 'florist' },
  { text: 'Maison Sauvage', bg: '#6d5568', fg: '#f3ebe0', sub: 'boutique' },
  { text: 'Maison Home', bg: '#e6dcc9', fg: '#3b3338', sub: 'boutique homewares' },
  { text: 'Boulangerie', bg: '#c9b79a', fg: '#33292b', sub: 'bread · pastry' },
  { text: 'Papier & Co.', bg: '#37363f', fg: '#efe3d0', sub: 'books · stationery' },
  { text: 'Café Vivienne', bg: '#2c3a31', fg: '#efe3d0', sub: 'café · brasserie' },
  { text: 'Wellness World', bg: '#ebe3d4', fg: '#3a3036', sub: 'residences' },
  { text: 'The Quay', bg: '#2f3d36', fg: '#efe3d0', sub: 'riverside kitchen' },
  { text: 'Quay & Co', bg: '#6d5568', fg: '#f3ebe0', sub: 'wine bar' },
  { text: 'Atelier Bordeaux', bg: '#5a2a35', fg: '#efe3d0', sub: 'boutique' },
]
export const signAtlas = () => mk(1024, 768, (g, w, h) => {
  const cw = w / 2, chh = h / 6
  SIGNS.forEach((s, i) => {
    const x = (i % 2) * cw, y = Math.floor(i / 2) * chh
    g.fillStyle = s.bg; g.fillRect(x, y, cw, chh)
    g.strokeStyle = s.fg; g.globalAlpha = 0.55; g.lineWidth = 3; g.strokeRect(x + 8, y + 8, cw - 16, chh - 16); g.globalAlpha = 1
    g.fillStyle = s.fg; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `500 52px Georgia, 'Times New Roman', serif`; g.fillText(s.text, x + cw / 2, y + chh * 0.42)
    g.font = `400 20px -apple-system, system-ui, sans-serif`; g.globalAlpha = 0.8; g.fillText(s.sub.toUpperCase().split('').join(' '), x + cw / 2, y + chh * 0.78); g.globalAlpha = 1
  })
})
export const signUV = (i) => { const u0 = (i % 2) / 2, v1 = 1 - Math.floor(i / 2) / 6; return [u0, v1 - 1 / 6, u0 + 0.5, v1] }
