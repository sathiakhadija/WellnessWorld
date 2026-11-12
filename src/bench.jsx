// Hardware benchmark + quality presets (Directive §10). Nothing here is a performance claim: it only MEASURES.
//   ?quality=performance|balanced|high   (default balanced)   ?bench=1  shows the overlay; window.__bench.start(seconds) / .result() / .download()
import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

const q = new URLSearchParams(location.search)
export const QUALITY = ['performance', 'balanced', 'high'].includes(q.get('quality')) ? q.get('quality') : 'balanced'
export const PRESET = {
  performance: { dprMax: 1, shadow: 2048, ao: false },
  balanced: { dprMax: 1.5, shadow: 4096, ao: false },
  high: { dprMax: 2, shadow: 4096, ao: true },     // `ao` reserved for the SSAO option once the owner has measured its cost
}[QUALITY]
export const BENCH = q.get('bench') === '1'
const t0 = performance.now(); let loadMs = null

export function Bench() {
  const { gl } = useThree(), st = useRef({ on: false, d: [], t: 0, dur: 0, res: null })
  const [hud, setHud] = useState('')
  useEffect(() => {
    if (loadMs === null) loadMs = performance.now() - t0
    const summarize = (a) => {
      const s = [...a].sort((x, y) => x - y), n = s.length, p = (f) => s[Math.min(n - 1, Math.floor(n * f))], avg = a.reduce((x, y) => x + y, 0) / n
      return { frames: n, avgFps: +(1000 / avg).toFixed(1), avgMs: +avg.toFixed(2), p50Ms: +p(0.5).toFixed(2), p95Ms: +p(0.95).toFixed(2), p99Ms: +p(0.99).toFixed(2), worstMs: +s[n - 1].toFixed(2), lowFpsEvents_gt33ms: a.filter((x) => x > 33.3).length, hitches_gt50ms: a.filter((x) => x > 50).length }
    }
    window.__bench = {
      start(sec = 20) { st.current = { on: true, d: [], t: 0, dur: sec * 1000, res: null, startInfo: null }; return 'benchmark started: walk through a representative area for ' + sec + ' s' },
      result() { return st.current.res },
      download() { const r = st.current.res; if (!r) return 'no result yet'; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })); a.download = `ww-bench-${QUALITY}-${Date.now()}.json`; a.click(); return 'saved' },
      snapshot() { const i = gl.info; return { drawCalls: i.render.calls, triangles: i.render.triangles, lines: i.render.lines, points: i.render.points, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length } },
    }
    const iv = setInterval(() => { const i = gl.info; if (BENCH) setHud(`${QUALITY} · calls ${i.render.calls} · tris ${(i.render.triangles / 1000).toFixed(0)}k · tex ${i.memory.textures} · geo ${i.memory.geometries} · dpr ${gl.getPixelRatio().toFixed(2)} · ${gl.domElement.width}×${gl.domElement.height}${st.current.on ? ' · RECORDING' : ''}`) }, 500)
    window.__benchSummarize = summarize
    return () => clearInterval(iv)
  }, [gl])
  useFrame((_, dt) => {
    const s = st.current; if (!s.on) return
    s.d.push(dt * 1000); s.t += dt * 1000
    if (!s.startInfo) s.startInfo = window.__bench.snapshot()
    if (s.t >= s.dur) {
      s.on = false
      const i = window.__bench.snapshot()
      s.res = { when: new Date().toISOString(), quality: QUALITY, preset: PRESET, userAgent: navigator.userAgent, devicePixelRatio: window.devicePixelRatio, rendererDpr: gl.getPixelRatio(), canvas: [gl.domElement.width, gl.domElement.height], sceneLoadMs: Math.round(loadMs ?? 0), toneMapping: gl.toneMapping, shadowsEnabled: gl.shadowMap.enabled, ...window.__benchSummarize(s.d), lastFrame: i, textureMemoryNote: 'three.js does not expose bytes; use textures count + Safari Web Inspector → Graphics for GPU memory' }
      console.log('[bench]', s.res)
    }
  })
  return BENCH ? <BenchHud text={hud} /> : null
}
function BenchHud({ text }) {
  useEffect(() => {
    const el = document.createElement('div'); el.id = 'ww-bench-hud'; el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;font:11px/1.3 ui-monospace,monospace;background:#000a;color:#9f9;padding:4px 7px;border-radius:5px;pointer-events:none'
    document.body.appendChild(el); BenchHud.el = el; return () => el.remove()
  }, [])
  useEffect(() => { if (BenchHud.el) BenchHud.el.textContent = text }, [text])
  return null
}
