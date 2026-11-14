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
export function marbleLight(grout = true, soft = !grout) {
  const W = 1024, H = 768, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = rng(11)
  g.fillStyle = '#f3ebe3'; g.fillRect(0, 0, W, H)
  const cols = 4, rows = 3, tw = W / cols, th = H / rows
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {                                  // 0.8 m tiles, each with its own tone + veining (book-matched feel)
    g.save(); g.beginPath(); g.rect(c * tw, r * th, tw, th); g.clip()
    const tone = (R() - 0.5) * 14; g.fillStyle = `rgb(${243 + tone * 0.3},${235 + tone * 0.4},${227 + tone * 0.5})`; g.fillRect(c * tw, r * th, tw, th)
    g.translate(c * tw, r * th); veins(g, R, tw, th, 7, 'rgba(176,160,148,A)', 0.55, 1.6); veins(g, R, tw, th, 4, 'rgba(206,172,150,A)', 0.4, 3.2); veins(g, R, tw, th, 3, 'rgba(255,255,255,A)', 0.7, 2.4)
    g.restore()
  }
  if (soft) { g.fillStyle = 'rgba(243,235,227,0.42)'; g.fillRect(0, 0, W, H) }       // feature marble: softer veining
  if (grout) { g.strokeStyle = 'rgba(150,130,118,0.5)'; g.lineWidth = 2; for (let c = 0; c <= cols; c++) { g.beginPath(); g.moveTo(c * tw, 0); g.lineTo(c * tw, H); g.stroke() } for (let r = 0; r <= rows; r++) { g.beginPath(); g.moveTo(0, r * th); g.lineTo(W, r * th); g.stroke() } }
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
export function plaster() {                 // Task 003: warm ivory limewash — soft low-frequency mottling so the walls are not a flat colour
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(91)
  g.fillStyle = '#e9dccb'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S, r = 40 + R() * 140, rg = g.createRadialGradient(x, y, 0, x, y, r); const v = R() < 0.5 ? '255,248,236' : '196,176,150'; rg.addColorStop(0, `rgba(${v},${0.05 + R() * 0.06})`); rg.addColorStop(1, `rgba(${v},0)`); g.fillStyle = rg; g.fillRect(0, 0, S, S) }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '120,100,80'},${R() * 0.035})`; g.fillRect(R() * S, R() * S, 2, 2) }
  return tex(cv, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping })
}
export function walnut() {                  // Task 003: dark walnut, grain running vertically (uv v = height)
  const W = 256, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = rng(57)
  g.fillStyle = '#4a3326'; g.fillRect(0, 0, W, H)
  for (let x = 0; x < W; x += 1) { const v = 40 + R() * 40; g.fillStyle = `rgba(${v + 22},${v + 8},${v - 6},${0.35 + R() * 0.3})`; g.fillRect(x, 0, 1 + (R() < 0.2 ? 1 : 0), H) }
  for (let i = 0; i < 40; i++) { const x = R() * W; g.strokeStyle = `rgba(20,12,8,${0.15 + R() * 0.25})`; g.lineWidth = 0.8 + R() * 1.6; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= H; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 3, y); g.stroke() }
  return tex(cv, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping })
}
export function indicator(label = '▲ PH') {
  const W = 256, H = 96, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')
  g.fillStyle = '#120e0b'; g.fillRect(0, 0, W, H); g.fillStyle = '#ead5a8'; g.font = '500 44px "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, W / 2, H / 2 + 3)
  return tex(cv)
}

export function marbleFeature() {            // Task 003 refinement: cream feature marble — a few long, soft grey/gold veins (no tile grid, no hairline cracks)
  const W = 1024, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = rng(404)
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#f4ece1'); bg.addColorStop(0.5, '#efe4d6'); bg.addColorStop(1, '#f2e8db'); g.fillStyle = bg; g.fillRect(0, 0, W, H)
  for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H, r = 90 + R() * 220, rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${R() < 0.5 ? '255,250,242' : '214,196,172'},${0.12 + R() * 0.1})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H) }
  const vein = (col, w) => {
    let x = R() * W, y = -20, a = Math.PI / 2 + (R() - 0.5) * 0.9; const pts = [[x, y]]
    for (let k = 0; k < 90; k++) { a += (R() - 0.5) * 0.22; x += Math.cos(a) * 14; y += Math.sin(a) * 14; pts.push([x, y]) }
    for (const [lw, al] of [[w * 5, 0.08], [w * 2.4, 0.16], [w, 0.55]]) { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.strokeStyle = col.replace('A', (al * (0.6 + R() * 0.5)).toFixed(3)); g.lineWidth = lw; g.lineJoin = 'round'; g.stroke() }
  }
  for (let i = 0; i < 13; i++) vein('rgba(128,112,100,A)', 1.5); for (let i = 0; i < 7; i++) vein('rgba(190,146,96,A)', 1.9)
  return tex(cv, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping })
}
export function rugRect() {                  // beige woven rug with a darker border band and fine inner line (rectangular, ~1.9 x 1.25 m)
  const W = 760, H = 500, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), R = rng(8)
  g.fillStyle = '#dccfbe'; g.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 2) { g.fillStyle = `rgba(${150 + R() * 70},${135 + R() * 60},${115 + R() * 50},${0.1 + R() * 0.12})`; g.fillRect(0, y, W, 1) }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.18})`; g.fillRect(R() * W, R() * H, 2, 1) }
  g.strokeStyle = 'rgba(160,138,112,0.9)'; g.lineWidth = 26; g.strokeRect(26, 26, W - 52, H - 52)
  g.strokeStyle = 'rgba(190,168,138,0.9)'; g.lineWidth = 3; g.strokeRect(62, 62, W - 124, H - 124); g.strokeRect(70, 70, W - 140, H - 140)
  g.fillStyle = 'rgba(176,150,118,0.35)'; for (let x = 100; x < W - 100; x += 40) for (let y = 100; y < H - 100; y += 40) { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.fill() }
  return tex(cv)
}

// ---- Decor textures (Task 003 refinement 5): every shelf / console object gets a real surface. UVs are box-projected in metres in Lobby.jsx (kit()), so each texture tiles per `tile` metres.
const REP = { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping }
export function clothTex(base, kind = 'cloth', seed = 3) {            // book cover: woven cloth or fine-grain leather with a debossed border frame
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  if (kind === 'cloth') { for (let y = 0; y < S; y += 2) { g.fillStyle = `rgba(0,0,0,${0.06 + R() * 0.07})`; g.fillRect(0, y, S, 1) } for (let x = 0; x < S; x += 2) { g.fillStyle = `rgba(255,255,255,${0.04 + R() * 0.06})`; g.fillRect(x, 0, 1, S) } }
  else { for (let i = 0; i < 5200; i++) { const x = R() * S, y = R() * S, r = 0.6 + R() * 1.3; g.fillStyle = R() < 0.5 ? `rgba(0,0,0,${0.03 + R() * 0.05})` : `rgba(255,235,210,${0.02 + R() * 0.035})`; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill() } for (let i = 0; i < 24; i++) { g.strokeStyle = `rgba(0,0,0,${0.08 + R() * 0.1})`; g.lineWidth = 0.7; g.beginPath(); let x = R() * S, y = R() * S; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 40; g.lineTo(x, y) } g.stroke() } }
  return tex(cv, REP)
}
export function labelTex() {                                          // cream spine / cover label with a gilt border and printed title lines
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(8)
  g.fillStyle = '#efe4cc'; g.fillRect(0, 0, S, S)
  g.strokeStyle = '#a07c3c'; g.lineWidth = 3; g.strokeRect(5, 5, S - 10, S - 10); g.lineWidth = 1; g.strokeRect(11, 11, S - 22, S - 22)
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(48,34,24,${0.7 + R() * 0.25})`; const w = 40 + R() * 50, y = 24 + i * 15; g.fillRect((S - w) / 2, y, w, i === 0 ? 6 : 3) }
  return tex(cv, REP)
}
export function paperTex() {                                          // page block: stacked leaves seen edge-on, warm and slightly uneven
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(21)
  g.fillStyle = '#efe6d0'; g.fillRect(0, 0, S, S)
  for (let y = 0; y < S; y += 2) { g.fillStyle = `rgba(120,96,64,${0.1 + R() * 0.16})`; g.fillRect(0, y, S, 1) }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,120,80,${R() * 0.1})`; g.fillRect(R() * S, 0, 1 + R() * 3, S) }
  return tex(cv, REP)
}
export function glazeTex(base, fleck = '#7a6044', seed = 5, clouds = true) {       // ceramic glaze: tonal clouds, iron flecks, hairline crazing
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let i = 0; i < (clouds ? 40 : 0); i++) { const x = R() * S, y = R() * S, r = 30 + R() * 80, rg = g.createRadialGradient(x, y, 0, x, y, r); const v = R() < 0.5 ? '255,250,240' : '120,100,80'; rg.addColorStop(0, `rgba(${v},${0.06 + R() * 0.08})`); rg.addColorStop(1, `rgba(${v},0)`); g.fillStyle = rg; g.fillRect(0, 0, S, S) }
  for (let i = 0; i < 380; i++) { g.fillStyle = fleck + Math.floor(40 + R() * 90).toString(16).padStart(2, '0'); const r = 0.5 + R() * 1.4; g.beginPath(); g.arc(R() * S, R() * S, r, 0, 6.3); g.fill() }
  for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(90,70,50,0.12)'; g.lineWidth = 0.6; g.beginPath(); let x = R() * S, y = R() * S; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 36; y += (R() - 0.5) * 36; g.lineTo(x, y) } g.stroke() }
  return tex(cv, REP)
}
export function leafTex(base, seed = 9) {                             // foliage: mottled green with fine branching veins and lighter margins
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(seed)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 50; i++) { const x = R() * S, y = R() * S, r = 20 + R() * 50, rg = g.createRadialGradient(x, y, 0, x, y, r); const v = R() < 0.5 ? '190,220,140' : '10,40,20'; rg.addColorStop(0, `rgba(${v},${0.12 + R() * 0.12})`); rg.addColorStop(1, `rgba(${v},0)`); g.fillStyle = rg; g.fillRect(0, 0, S, S) }
  for (let i = 0; i < 14; i++) { const x0 = R() * S, y0 = R() * S; for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(225,240,170,${0.18 + R() * 0.12})`; g.lineWidth = 0.9; g.beginPath(); const x = x0 + k * 7, y = y0 + k * 3; g.moveTo(x, y); g.lineTo(x + s * 18, y + 14 + R() * 6); g.stroke() } g.strokeStyle = 'rgba(235,245,180,0.3)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 50, y0 + 21); g.stroke() }
  return tex(cv, REP)
}
export function barkTex() {                                           // twig bark: vertical fissures with lenticels
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(14)
  g.fillStyle = '#4b382a'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${R() < 0.5 ? '20,12,8' : '130,104,80'},${0.2 + R() * 0.25})`; g.lineWidth = 0.7 + R() * 1.5; const x = R() * S; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= S; y += 16) g.lineTo(x + (R() - 0.5) * 4, y); g.stroke() }
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(200,180,150,0.45)'; g.fillRect(R() * S, R() * S, 3, 1) }
  return tex(cv, REP)
}
export function bronzeBrushed(base = '#8a6a45') {                     // brushed metal: fine linear streaks + soft patina
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), R = rng(33)
  g.fillStyle = base; g.fillRect(0, 0, S, S)
  for (let y = 0; y < S; y++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,226,170' : '40,24,10'},${R() * 0.14})`; g.fillRect(0, y, S, 1) }
  for (let i = 0; i < 12; i++) { const x = R() * S, y = R() * S, rg = g.createRadialGradient(x, y, 0, x, y, 50); rg.addColorStop(0, 'rgba(60,40,20,0.12)'); rg.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = rg; g.fillRect(0, 0, S, S) }
  return tex(cv, REP)
}
