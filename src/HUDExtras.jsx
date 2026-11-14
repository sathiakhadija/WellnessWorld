// Compact GPS / minimap (drawn from the real masterplan data, so it can never drift from the world), the five-atmosphere picker and the discovery counter.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCam } from './camStore.js'
import { world } from './world.js'
import { getStreet } from './street/Street.jsx'
import { BX } from './street/plan.js'
import { ORDER, PRESETS, atmoStore, useAtmo } from './atmosphere.js'
import { useDiscoveries } from './discoveries.js'
import { KINDS, KIND_ORDER, weatherStore, useWeather, setWeather } from './weather/weather.js'

const X0 = -132, X1 = 88, Z0 = -168, Z1 = 130, S = 2.5                      // base map: world metres -> px (river at the top)
const COL = { road: '#4c4a55', slab: '#d8cfbd', sett: '#b8a893', gravel: '#cfc3ab', grass: '#9bb872', paint: '#e8e1d2' }
const FEATURES = [['lift', 'Lobby & lift'], ['courtyard', 'Courtyard'], ['fountain', 'Garden Square'], ['lane', 'Romantic Lane'], ['cafe', 'Café Violette'], ['books', 'The Quiet Page'], ['florist', 'Fleur'], ['boutique', 'Maison Sauvage'], ['bakery', 'Boulangerie'], ['viewpoint', 'Sunset viewpoint'], ['quayCafe', 'The Quay'], ['romantic', 'Romantic corner'], ['ferry', 'Ferry landing (reserved)']]

function bakeMap(built) {
  const W = Math.round((X1 - X0) * S), H = Math.round((Z1 - Z0) * S), cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d'), px = (x) => (x - X0) * S, pz = (z) => (z - Z0) * S
  g.fillStyle = '#7ea06a'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#7f9bc6'; g.fillRect(0, 0, W, pz(-146.6))                                   // the Thames
  const surf = built.map.surf.slice().sort((a, b) => a[5] - b[5])
  for (const [key, x0, x1, z0, z1] of surf) { const k = key.replace('2', ''); if (!COL[k] || k === 'paint') continue; g.fillStyle = COL[k]; g.fillRect(px(x0), pz(z0), (x1 - x0) * S, (z1 - z0) * S) }
  g.lineCap = 'round'; g.lineJoin = 'round'
  for (const [key, pts, w] of built.map.rib) { g.strokeStyle = COL[key.replace('2', '')] || COL.slab; g.lineWidth = w * S; g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z)))); g.stroke() }
  g.fillStyle = '#e4dac6'; g.fillRect(px(-125), pz(-146.6), 205 * S, 14.6 * S)                // promenade
  for (const w of built.waters) { g.fillStyle = '#8aa8d4'; if (w.kind === 'pool') g.fillRect(px(w.x - w.w / 2), pz(w.z - w.d / 2), w.w * S, w.d * S); else { g.beginPath(); g.arc(px(w.x), pz(w.z), w.r * S, 0, 6.3); g.fill() } }
  const B = new Set(['building', 'mass', 'wing', 'cafe', 'podium', 'lobbywall', 'lobbyglass'])
  g.fillStyle = '#a58f86'
  g.fillRect(px(-62), pz(-88), 94 * S, 92 * S); g.fillStyle = '#7c6d73'; g.fillRect(px(-62) + 3, pz(-88) + 3, 94 * S - 6, 92 * S - 6)
  g.fillStyle = '#b79c8c'
  for (const c of built.colliders) {
    if (!B.has(c.tag) || c.hy < 1.5 || c.q) continue
    g.save(); g.translate(px(c.x), pz(c.z)); g.rotate(c.rot || 0); g.fillRect(-c.hx * S, -c.hz * S, c.hx * 2 * S, c.hz * 2 * S); g.restore()
  }
  g.fillStyle = 'rgba(60,92,54,0.9)'
  for (const k of ['plane', 'ornamental', 'clipped']) for (const [x, , z, , s] of built.inst[k]) { g.beginPath(); g.arc(px(x), pz(z), (k === 'plane' ? 3.6 : 2.2) * s * S * 0.55, 0, 6.3); g.fill() }
  g.fillStyle = 'rgba(33,30,40,.55)'; g.font = `600 ${Math.round(3.2 * S)}px -apple-system, system-ui, sans-serif`; g.textAlign = 'center'
  g.fillText('THAMES', px(-30), pz(-156))
  return cv
}

const CSS = `
.wwx-mini{position:fixed;right:16px;top:64px;z-index:5;color:#f4ebe0;font:12px -apple-system,system-ui,sans-serif;background:rgba(26,19,30,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,214,170,.2);border-radius:16px;padding:8px;box-shadow:0 6px 24px rgba(0,0,0,.28)}
.wwx-mini canvas{display:block;border-radius:10px;background:#7ea06a}
.wwx-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;font-size:11px;letter-spacing:.04em}
.wwx-bar button{all:unset;cursor:pointer;opacity:.85;padding:0 4px;font-size:13px}.wwx-bar button:hover{opacity:1}
.wwx-bar b{font-weight:600;color:#ecd2a6}
.wwx-atmo{position:fixed;left:16px;bottom:16px;z-index:5;display:flex;gap:4px;align-items:center;background:rgba(26,19,30,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,214,170,.2);border-radius:999px;padding:5px 8px;font:12px -apple-system,system-ui,sans-serif;color:#f4ebe0}
.wwx-atmo button{all:unset;cursor:pointer;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:16px;opacity:.7;transition:all .2s}
.wwx-atmo button:hover{opacity:1;background:rgba(255,255,255,.1)}.wwx-atmo button.on{opacity:1;background:rgba(236,210,166,.28);box-shadow:0 0 0 1px rgba(236,210,166,.5)}
.wwx-atmo .lbl{padding:0 8px 0 6px;font-size:11.5px;letter-spacing:.03em;opacity:.9;min-width:112px}.wwx-atmo .auto{font-size:11px;width:auto;padding:0 9px;border-radius:999px}

.wwx-nav{position:fixed;right:16px;top:16px;z-index:7;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font:12px -apple-system,system-ui,sans-serif;color:#f4ebe0}
.wwx-nav .bar{display:flex;gap:6px;background:rgba(26,19,30,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,214,170,.2);border-radius:999px;padding:5px 6px}
.wwx-nav .bar button{all:unset;cursor:pointer;display:flex;align-items:center;gap:6px;height:30px;padding:0 14px;border-radius:999px;font-size:12.5px;letter-spacing:.03em;opacity:.85;transition:all .2s}
.wwx-nav .bar button:hover{opacity:1;background:rgba(255,255,255,.1)}.wwx-nav .bar button.on{opacity:1;background:rgba(236,210,166,.28);box-shadow:0 0 0 1px rgba(236,210,166,.5)}
.wwx-nav .bar button:focus-visible{outline:2px solid #ecd2a6;outline-offset:2px}
.wwx-panel{display:flex;flex-direction:column;gap:10px;background:rgba(26,19,30,.78);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(255,214,170,.2);border-radius:18px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.28)}
.wwx-panel[hidden]{display:none}
.wwx-panel h3{margin:0;font:600 11px -apple-system,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#ecd2a6;opacity:.9}
.wwx-panel .sec{display:flex;flex-direction:column;gap:4px}
.wwx-panel .wwx-wx,.wwx-panel .wwx-atmo{position:static;left:auto;bottom:auto;background:none;border:0;border-radius:0;padding:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}

.wwx-wx{position:fixed;left:16px;bottom:64px;z-index:5;display:flex;flex-direction:column;gap:6px;color:#f4ebe0;font:12px -apple-system,system-ui,sans-serif;background:rgba(26,19,30,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:6px 8px}
.wwx-wx .row{display:flex;gap:4px;align-items:center}
.wwx-wx button{all:unset;cursor:pointer;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:16px;opacity:.7;transition:all .2s}
.wwx-wx button:hover{opacity:1;background:rgba(255,255,255,.1)}.wwx-wx button.on{opacity:1;background:rgba(160,190,230,.28);box-shadow:0 0 0 1px rgba(170,200,240,.55)}
.wwx-wx .lbl{padding:0 8px 0 6px;font-size:11.5px;letter-spacing:.03em;opacity:.9;min-width:98px}
.wwx-wx .set{display:flex;gap:8px;align-items:center;font-size:11px;padding:2px 4px 4px}.wwx-wx .set input[type=range]{width:92px;accent-color:#a9c4ec}
.wwx-wx .set button{width:auto;height:24px;border-radius:999px;padding:0 9px;font-size:11px}
.wwx-wx .set select{background:rgba(255,255,255,.1);color:#f4ebe0;border:0;border-radius:8px;padding:2px 4px;font-size:11px}
`

export function WeatherPanel() {
  const w = useWeather(), c = useCam(), [open, setOpen] = useState(false)
  useEffect(() => {
    const on = (e) => { if (e.metaKey || e.ctrlKey || e.altKey) return; const i = KIND_ORDER.indexOf(weatherStore.get().kind); if (e.key === ';') setWeather(KIND_ORDER[(i + KIND_ORDER.length - 1) % KIND_ORDER.length]); if (e.key === "'") setWeather(KIND_ORDER[(i + 1) % KIND_ORDER.length]) }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])
  if (c.clean) return null
  return (
    <div className="wwx-wx" role="group" aria-label="Weather">
      <style>{CSS}</style>
      <div className="row">
        {KIND_ORDER.map((k) => <button key={k} className={w.kind === k ? 'on' : ''} title={KINDS[k].label} aria-label={KINDS[k].label} onClick={() => setWeather(k)}>{KINDS[k].icon}</button>)}
        <span className="lbl">{KINDS[w.kind].label}</span>
        <button title="Rain sound + quality" aria-label="Weather settings" onClick={() => setOpen(!open)}>{open ? '▾' : '⚙︎'}</button>
      </div>
      {open && (
        <div className="set">
          <span title="Rain volume">🔊</span>
          <input type="range" min="0" max="1" step="0.05" value={w.vol} aria-label="Rain volume" onChange={(e) => weatherStore.set({ vol: parseFloat(e.target.value) })} />
          <button className={w.mute ? 'on' : ''} onClick={() => weatherStore.set({ mute: !w.mute })}>{w.mute ? 'Muted' : 'Mute'}</button>
          <select aria-label="Weather quality" value={w.quality} onChange={(e) => weatherStore.set({ quality: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
        </div>
      )}
    </div>
  )
}

export function Atmospheres() {
  const a = useAtmo(), c = useCam()
  useEffect(() => {
    atmoStore.set({ reduced: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false })
    const on = (e) => { if (e.metaKey || e.ctrlKey || e.altKey) return; const i = ORDER.indexOf(atmoStore.get().preset); if (e.key === ']') atmoStore.set({ preset: ORDER[(i + 1) % 5] }); if (e.key === '[') atmoStore.set({ preset: ORDER[(i + 4) % 5] }) }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])
  if (c.clean) return null
  return (
    <div className="wwx-atmo" role="group" aria-label="Time of day">
      <style>{CSS}</style>
      {ORDER.map((k) => <button key={k} className={a.preset === k ? 'on' : ''} title={PRESETS[k].label} aria-label={PRESETS[k].label} onClick={() => atmoStore.set({ preset: k })}>{PRESETS[k].icon}</button>)}
      <span className="lbl">{PRESETS[a.preset].label}</span>
      <button className={'auto' + (a.auto ? ' on' : '')} title="Automatic day–night progression" onClick={() => atmoStore.set({ auto: !a.auto })}>{a.auto ? '⟳ auto' : '⟳'}</button>
    </div>
  )
}

// Top-right navigation bar -> Settings -> Weather and time controls. The two original panels stay mounted (just hidden while closed) so their
// keyboard shortcuts (; ' [ ]) and all behaviour are exactly as before; only their on-screen location changed.
export function SettingsMenu() {
  const c = useCam(), [open, setOpen] = useState(false)
  useEffect(() => {
    const on = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])
  return (
    <>
      <div className="wwx-nav" style={c.clean ? { display: 'none' } : undefined}>
        <style>{CSS}</style>
        <nav className="bar" aria-label="Game navigation">
          <button className={open ? 'on' : ''} aria-expanded={open} aria-controls="wwx-settings" onClick={() => setOpen(!open)}>⚙︎ Settings</button>
        </nav>
        <div id="wwx-settings" className="wwx-panel" role="region" aria-label="Settings" hidden={!open}>
          <div className="sec"><h3>Weather</h3><WeatherPanel /></div>
          <div className="sec"><h3>Time of day</h3><Atmospheres /></div>
        </div>
      </div>
    </>
  )
}

export function Minimap() {
  const c = useCam(), d = useDiscoveries(), [open, setOpen] = useState(false), [level, setLevel] = useState('penthouse')
  const ref = useRef(), built = useMemo(getStreet, []), base = useRef(null)
  useEffect(() => { const t = setInterval(() => setLevel(world.level), 300); return () => clearInterval(t) }, [])
  useEffect(() => { const on = (e) => { if (e.key === 'm' || e.key === 'M') setOpen((o) => !o) }; window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on) }, [])
  const dim = open ? { w: 300, h: 390 } : { w: 168, h: 168 }
  useEffect(() => {
    if (level !== 'street' || c.clean) return
    if (!base.current) base.current = bakeMap(built)
    const cv = ref.current; if (!cv) return
    const g = cv.getContext('2d'); let raf = 0, stop = false
    const draw = () => {
      if (stop) return
      const p = world.player, sc = open ? Math.min(dim.w / ((X1 - X0) * S), dim.h / ((Z1 - Z0) * S)) : 0.56        // canvas px per base px
      g.clearRect(0, 0, dim.w, dim.h); g.fillStyle = '#7ea06a'; g.fillRect(0, 0, dim.w, dim.h)
      let ox, oy                                                                                             // where base px (0,0) lands on the canvas
      if (open) { ox = (dim.w - (X1 - X0) * S * sc) / 2; oy = (dim.h - (Z1 - Z0) * S * sc) / 2 } else { ox = dim.w / 2 - (p.x - X0) * S * sc; oy = dim.h / 2 - (p.z - Z0) * S * sc }
      g.imageSmoothingQuality = 'high'; g.drawImage(base.current, ox, oy, base.current.width * sc, base.current.height * sc)
      const mx = (x) => ox + (x - X0) * S * sc, mz = (z) => oy + (z - Z0) * S * sc
      for (const [k, label] of FEATURES) {                                                                    // destination markers
        const f = built.pois[k]; if (!f) continue
        const x = mx(f.x), y = mz(f.z); if (x < -4 || y < -4 || x > dim.w + 4 || y > dim.h + 4) continue
        g.fillStyle = '#f0c98a'; g.strokeStyle = '#3a2a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - 4.5); g.lineTo(x + 4, y); g.lineTo(x, y + 4.5); g.lineTo(x - 4, y); g.closePath(); g.fill(); g.stroke()
        if (open) { g.fillStyle = '#2a1f24'; g.font = '600 9.5px -apple-system, system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.75)'; g.strokeText(label, x, y - 8); g.fillText(label, x, y - 8) }
      }
      const yaw = world.heading ?? 0, x = mx(p.x), y = mz(p.z)                                                // the player: gold arrow showing heading
      g.save(); g.translate(x, y); g.rotate(-yaw + Math.PI); g.fillStyle = '#c2543a'; g.strokeStyle = '#fff'; g.lineWidth = 1.6
      g.beginPath(); g.moveTo(0, 7); g.lineTo(5, -5); g.lineTo(0, -2); g.lineTo(-5, -5); g.closePath(); g.fill(); g.stroke(); g.restore()
      g.fillStyle = 'rgba(20,16,26,.7)'; g.font = '600 10px -apple-system, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('N ↑ Thames', 7, 14)
      raf = setTimeout(draw, 100)
    }
    draw(); return () => { stop = true; clearTimeout(raf) }
  }, [level, open, c.clean, built])
  if (level !== 'street' || c.clean) return null
  return (
    <div className="wwx-mini">
      <style>{CSS}</style>
      <div className="wwx-bar"><b>Neighbourhood</b><span title="Discoveries found">✨ {d.n}/{built.discoveries.length}</span><button title="Expand / collapse (M)" onClick={() => setOpen(!open)}>{open ? '⤡' : '⤢'}</button></div>
      <canvas ref={ref} width={dim.w} height={dim.h} style={{ width: dim.w, height: dim.h }} />
    </div>
  )
}
void BX


// Cinematic grade: a soft vignette + warm/cool wash over the canvas (pure CSS, no extra render pass) tuned per atmosphere. Stays on in clean view.
const GRADE = {
  morning: ['rgba(90,100,130,0.16)', 'rgba(255,230,200,0.05)', 'rgba(200,215,255,0.03)'],
  afternoon: ['rgba(70,80,100,0.12)', 'rgba(255,240,210,0.03)', 'rgba(0,0,0,0)'],
  golden: ['rgba(120,50,86,0.28)', 'rgba(255,160,100,0.08)', 'rgba(255,150,190,0.05)'],
  blue: ['rgba(26,28,84,0.42)', 'rgba(255,170,110,0.05)', 'rgba(110,120,255,0.08)'],
  night: ['rgba(8,8,40,0.5)', 'rgba(255,170,100,0.04)', 'rgba(60,70,160,0.08)'],
}
export function Grade() {
  const a = useAtmo(), [v, lo, hi] = GRADE[a.preset] || GRADE.golden
  return <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4, transition: 'background 1.2s',
    background: `radial-gradient(ellipse 75% 70% at 50% 46%, rgba(0,0,0,0) 52%, ${v} 100%), linear-gradient(to top, ${lo}, rgba(0,0,0,0) 38%), linear-gradient(to bottom, ${hi}, rgba(0,0,0,0) 35%)` }} />
}
