import { Fragment, useRef } from 'react'
import { DESTINATIONS } from './destinations.js'
import { world } from './world.js'
import { useCam, camStore } from './camStore.js'
import { Atmospheres, Minimap, Grade, WeatherPanel } from './HUDExtras.jsx'
import { CharacterPicker } from './characters/CharacterPicker.jsx'

const MODES = [
  { id: 'follow', key: '1', label: 'Follow' },
  { id: 'free', key: '2', label: 'Free camera' },
  { id: 'sims', key: '3', label: 'Inspect (Sims view)' },
]

const HELP = {
  follow: [
    ['Arrows / WASD', 'walk (relative to the camera)'],
    ['Shift', 'fast walk · Shift+Space sprint · Z relaxed stroll'],
    ['M', 'map  ·  [ ]  time of day'],
    ['Drag, or two-finger scroll', 'orbit around you'],
    ['Pinch, mouse wheel, + / −', 'zoom'],
    ['Q / E', 'rotate camera'],
    ['Enter', 'open doors · Go Outside'],
    ['V', 'clean view (hide character + HUD)'],
  ],
  free: [
    ['Arrows / WASD', 'fly (the player stays still)'],
    ['E / Q  or  Space', 'up / down'],
    ['Shift', 'fly faster'],
    ['Drag, or two-finger scroll', 'look around'],
    ['Pinch, mouse wheel, + / −', 'dolly forward / back'],
    ['Shift-drag or right-drag', 'slide sideways / up'],
  ],
  sims: [
    ['Arrows / WASD', 'pan the view (player stays still)'],
    ['Drag, or two-finger scroll', 'orbit'],
    ['Pinch, mouse wheel, + / −', 'zoom'],
    ['Shift-drag or right-drag', 'pan'],
    ['Q / E', 'rotate'],
    ['F', 'centre on the player'],
  ],
}

const css = `
.ww-hud{position:fixed;left:16px;top:16px;width:300px;color:#f4ebe0;font:13px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;
  background:rgba(26,19,30,.58);-webkit-backdrop-filter:blur(18px) saturate(1.2);backdrop-filter:blur(18px) saturate(1.2);
  border:1px solid rgba(255,214,170,.18);border-radius:14px;padding:12px 14px;user-select:none;-webkit-user-select:none;z-index:5}
.ww-hud h1{margin:0 0 8px;font-size:10.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:#e9c79b}
.ww-modes{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.ww-modes button{display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer;color:inherit;font:inherit;background:rgba(255,255,255,.05);
  border:1px solid transparent;border-radius:8px;padding:5px 8px}
.ww-modes button:hover{background:rgba(255,255,255,.1)}
.ww-modes button.on{background:rgba(233,199,155,.22);border-color:rgba(233,199,155,.55)}
.ww-modes kbd,.ww-foot kbd{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(0,0,0,.35);border-radius:4px;padding:0 5px;color:#e9c79b}
.ww-help{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:0 0 8px}
.ww-help dt{color:#e9c79b;white-space:nowrap}.ww-help dd{margin:0;opacity:.88}
.ww-foot{opacity:.8;font-size:11.5px;border-top:1px solid rgba(255,255,255,.1);padding-top:7px}
.ww-foot b{color:#e9c79b;font-weight:600}
.ww-min{position:fixed;left:16px;top:16px;z-index:5;cursor:pointer;color:#f4ebe0;font:12px -apple-system,system-ui,sans-serif;
  background:rgba(26,19,30,.58);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,214,170,.18);border-radius:999px;padding:6px 12px}
.ww-prompt{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);color:#2a1a10;font:600 13px -apple-system,system-ui,sans-serif;pointer-events:none;background:rgba(246,214,170,.92);border-radius:999px;padding:8px 18px;z-index:6;transition:opacity .2s;box-shadow:0 4px 18px rgba(0,0,0,.25)}
.ww-prompt kbd{font:600 11px ui-monospace,Menlo,monospace;background:rgba(0,0,0,.14);border-radius:4px;padding:1px 6px;margin-right:6px}
.ww-prompt{transition:opacity .35s ease, transform .35s ease}
.ww-ov{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;color:#f6e9d6;
  background:radial-gradient(ellipse at 50% 40%,#4a3322 0%,#1b1410 70%);font:300 15px/1.5 -apple-system,system-ui,sans-serif;transition:opacity .9s ease;padding:24px}
.ww-ov h2{margin:0;font:300 34px/1.1 Georgia,'Times New Roman',serif;letter-spacing:.04em}
.ww-ov p{margin:0;max-width:420px;opacity:.8}.ww-ov kbd{font:600 12px ui-monospace,Menlo,monospace;background:rgba(255,255,255,.14);border-radius:4px;padding:2px 8px}
.ww-ov,.ww-prompt,.wwx-atmo button{}@media (prefers-reduced-motion:reduce){.ww-ov{transition:none!important}.ww-prompt{transition:none!important}}
.ww-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);color:#f4ebe0;font:13px -apple-system,system-ui,sans-serif;pointer-events:none;
  background:rgba(26,19,30,.7);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-radius:999px;padding:8px 16px;z-index:6;transition:opacity .25s}
`

export default function HUD() {
  const c = useCam()
  const last = useRef('')
  if (c.prompt) last.current = c.prompt            // keep the text while the pill fades out
  const show = !!c.prompt && !c.clean && c.transition === 'idle'
  const dest = DESTINATIONS[c.dest] || { title: 'Outside', sub: '' }
  const ov = c.transition === 'overlay'
  return (
    <>
      <style>{css}</style>
      {c.clean ? null : c.help ? (
        <div className="ww-hud">
          <h1>Wellness World · Camera</h1>
          <div className="ww-modes">
            {MODES.map((m) => (
              <button key={m.id} className={c.mode === m.id ? 'on' : ''} onClick={() => camStore.set({ mode: m.id })}>
                <kbd>{m.key}</kbd>{m.label}
              </button>
            ))}
          </div>
          <dl className="ww-help">
            {HELP[c.mode].map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
          </dl>
          <div className="ww-foot">
            <div><kbd>C</kbd> next camera · <kbd>R</kbd> reset view · <kbd>H</kbd> hide help</div>
            <div><kbd>N</kbd> collision <b>{c.collide ? 'on' : 'off'}</b> · <kbd>T</kbd> scroll = <b>{c.scrollMode}</b> · <kbd>I</kbd> invert scroll{c.invertScroll ? ' (on)' : ''}</div>
          </div>
          <CharacterPicker />
        </div>
      ) : (
        <div className="ww-min" onClick={() => camStore.set({ help: true })}>Controls · H</div>
      )}
      <Grade /><Atmospheres /><WeatherPanel /><Minimap />
      <div className="ww-prompt" style={{ opacity: show ? 1 : 0, transform: `translateX(-50%) translateY(${show ? 0 : 6}px)` }}><kbd>Enter</kbd>{last.current}</div>
      <div className="ww-toast" style={{ opacity: c.toast ? 1 : 0 }}>{c.toast}</div>
      <div className="ww-ov" style={{ opacity: ov ? 1 : 0, pointerEvents: ov ? 'auto' : 'none' }}>
        <h2>{dest.title}</h2><p>{dest.sub}</p><p style={{ opacity: 0.45, fontSize: 12 }}><kbd>Space</kbd> to skip</p>
        {false && <button style={{ marginTop: 6, cursor: 'pointer', font: 'inherit', color: 'inherit', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 999, padding: '6px 18px' }} onClick={() => world.returnHome && world.returnHome()}>Return</button>}
      </div>
    </>
  )
}
