// Procedural canvas textures for the private lift lobby (no external assets): light veined marble, dark veined marble, woven round rug, abstract blush-marble art,
// brushed-gold streaks, "Lift" sign and floor indicator. All colour maps are sRGB (colorSpace set), data maps are not used here.
import * as THREE from 'three'
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const tex = (cv, o = {}) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; Object.assign(t, o); return t }
function veins(g, R, W, H, n, colour, alpha, width) {
  for (let i = 0; i < n; i++) {
    let x = R() * W, y = R() * H, a = R() * Math.PI * 2
    g.beginPath(); g.moveTo(x, y)
    const len = 40 + R() * 90
    for (let k = 0; k < len; k++) { a += (R() - 0.5) * 0.55; x += Math.cos(a) * (3 + R() * 4); y += Math.sin(a) * (3 + R() * 4); g.lineTo(x, y) }
    g.strokeStyle = colour.replace('A', (alpha * (0.4 + R() * 0.6)).toFixed(3)); g.lineWidth = width * (0.4 + R() * 1.2); g.stroke()
  }
}
export function marbleLight() {
  const W = 1024, H = 768, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = rng(11)
  g.fillStyle = '#f3ebe3'; g.fillRect(0, 0, W, H)
  const cols = 4, rows = 3, tw = W / cols, th = H / rows
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {                                  // 0.8 m tiles, each with its own tone + veining (book-matched feel)
    g.save(); g.beginPath(); g.rect(c * tw, r * th, tw, th); g.clip()
    const tone = (R() - 0.5) * 14; g.fillStyle = `rgb(${243 + tone * 0.3},${235 + tone * 0.4},${227 + tone * 0.5})`; g.fillRect(c * tw, r * th, tw, th)
    g.translate(c * tw, r * th); veins(g, R, tw, th, 7, 'rgba(176,160,148,A)', 0.55, 1.6); veins(g, R, tw, th, 4, 'rgba(206,172,150,A)', 0.4, 3.2); veins(g, R, tw, th, 3, 'rgba(255,255,255,A)', 0.7, 2.4)
    g.restore()
  }
  g.strokeStyle = 'rgba(150,130,118,0.5)'; g.lineWidth = 2; for (let c = 0; c <= cols; c++) { g.beginPath(); g.moveTo(c * tw, 0); g.lineTo(c * tw, H); g.stroke() } for (let r = 0; r <= rows; r++) { g.beginPath(); g.moveTo(0, r * th); g.lineTo(W, r * th); g.stroke() }
  return tex(cv)
}
export function marbleDark() {
  const W = 512, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = rng(23)
  g.fillStyle = '#d9d3cf'; g.fillRect(0, 0, W, H)                                                // multiplied by the registry colour (dark) -> near-black base, veins keep contrast
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fillRect(0, 0, W, H)
  veins(g, R, W, H, 22, 'rgba(255,255,255,A)', 0.9, 1.4); veins(g, R, W, H, 10, 'rgba(255,255,255,A)', 0.8, 2.6); veins(g, R, W, H, 8, 'rgba(255,214,160,A)', 0.75, 1.8)
  return tex(cv)
}
export function rugTex() {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(5)
  g.fillStyle = '#e7dad0'; g.fillRect(0, 0, S, S)
  for (let r = 6; r < S / 2; r += 2.2) { g.beginPath(); g.arc(S / 2, S / 2, r, 0, 6.2832); g.strokeStyle = `rgba(${150 + R() * 60},${130 + R() * 50},${118 + R() * 40},${0.28 + R() * 0.3})`; g.lineWidth = 1.2 + R() * 1.4; g.stroke() }
  for (let i = 0; i < 2600; i++) { const a = R() * 6.2832, r = R() * S / 2; g.fillStyle = `rgba(255,255,255,${R() * 0.25})`; g.fillRect(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, 2, 1) }
  return tex(cv)
}
export function artTex() {
  const W = 640, H = 900, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = rng(31)
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#f3dcdc'); gr.addColorStop(0.5, '#e8c0c4'); gr.addColorStop(1, '#f6e8e4'); g.fillStyle = gr; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H, r = 80 + R() * 220; const rg = g.createRadialGradient(x, y, 0, x, y, r); const c = R() < 0.5 ? '214,140,160' : R() < 0.5 ? '255,245,240' : '196,120,140'; rg.addColorStop(0, `rgba(${c},${0.18 + R() * 0.25})`); rg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = rg; g.fillRect(0, 0, W, H) }
  veins(g, R, W, H, 16, 'rgba(255,255,255,A)', 0.55, 3); veins(g, R, W, H, 8, 'rgba(170,92,120,A)', 0.4, 2)
  return tex(cv)
}
export function brushedGold() {
  const W = 256, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = rng(77)
  g.fillStyle = '#d8d0c8'; g.fillRect(0, 0, W, H)
  for (let x = 0; x < W; x++) { const v = 200 + R() * 55; g.fillStyle = `rgba(${v},${v - 4},${v - 10},0.55)`; g.fillRect(x, 0, 1, H) }
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0.1)'); g.fillStyle = gr; g.fillRect(0, 0, W, H)
  return tex(cv)
}
export function ceilingGlow() {                      // cove light bounce on the ceiling: bright toward the walls, dim in the middle (used as emissive map)
  const W = 256, H = 192, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H)
  for (const [x0, y0, x1, y1] of [[0, 0, W, 0], [0, H, W, H], [0, 0, 0, H], [W, 0, W, H]]) { const gr = g.createLinearGradient(x0, y0, x0 + (x1 === x0 ? (x0 === 0 ? 40 : -40) : 0), y0 + (y1 === y0 ? (y0 === 0 ? 40 : -40) : 0)); gr.addColorStop(0, 'rgba(255,214,150,0.95)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H) }
  return tex(cv)
}
export function liftSign() {
  const W = 256, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')
  g.clearRect(0, 0, W, H); g.strokeStyle = '#ffe6bd'; g.fillStyle = '#ffe6bd'; g.lineWidth = 5; g.lineJoin = 'round'
  g.strokeRect(78, 30, 100, 118); g.beginPath(); g.moveTo(128, 30); g.lineTo(128, 148); g.stroke()                       // lift car with doors
  for (const x of [98, 128, 158]) { g.beginPath(); g.arc(x, 92, 7, 0, 6.2832); g.fill(); g.fillRect(x - 6, 102, 12, 28) }
  g.beginPath(); g.moveTo(102, 20); g.lineTo(110, 10); g.lineTo(118, 20); g.stroke(); g.beginPath(); g.moveTo(138, 10); g.lineTo(146, 20); g.lineTo(154, 10); g.stroke()
  g.font = '600 54px "Playfair Display", Georgia, serif'; g.textAlign = 'center'; g.fillText('Lift', 128, 212); g.fillRect(60, 226, 136, 3)
  return tex(cv)
}
export function indicator(label = '▲ PH') {
  const W = 256, H = 96, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')
  g.fillStyle = '#0d0b0a'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffb35a'; g.font = '700 56px "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, W / 2, H / 2 + 3)
  return tex(cv)
}
