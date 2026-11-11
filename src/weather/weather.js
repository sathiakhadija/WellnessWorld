// Weather core (modular: rain today; snow / thunder / seasons plug in by adding a KIND and reading WX).
//  * weatherStore  = what the user chose (kind, audio volume/mute, quality)  -> React via useWeather()
//  * WX            = live, smoothed state read every frame by every effect (sky, lights, rain particles, window shader, ground wetness, audio)
//  * stepWeather() = advances WX toward the target kind; called once per frame by <Atmosphere/>
// Future automatic weather: registerWeatherProvider((dt, t) => kindOrNull) – the provider's answer replaces the manual target when it returns one.
import { useSyncExternalStore } from 'react'

export const KINDS = {
  sunny:    { label: 'Sunny',          icon: '☀️', rain: 0.0,  cloud: 0.0,  wind: 0.10, storm: false },
  cloudy:   { label: 'Cloudy',         icon: '☁️', rain: 0.0,  cloud: 0.78, wind: 0.25, storm: false },
  light:    { label: 'Light rain',     icon: '🌦️', rain: 0.30, cloud: 0.88, wind: 0.30, storm: false },
  moderate: { label: 'Moderate rain',  icon: '🌧️', rain: 0.65, cloud: 0.95, wind: 0.50, storm: false },
  heavy:    { label: 'Heavy rain',     icon: '⛈️', rain: 1.00, cloud: 1.00, wind: 0.85, storm: true },
}
export const KIND_ORDER = ['sunny', 'cloudy', 'light', 'moderate', 'heavy']

const Q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const safe = (f, d) => { try { return f() } catch { return d } }
const num = (k, d) => safe(() => { const v = parseFloat(localStorage.getItem(k)); return Number.isFinite(v) ? v : d }, d)
const qual = Q.get('wq') || safe(() => localStorage.getItem('ww.weather.q'), null) || 'medium'

let snap = {
  kind: KINDS[Q.get('weather')] ? Q.get('weather') : 'sunny',
  quality: ['low', 'medium', 'high'].includes(qual) ? qual : 'medium',
  vol: Q.has('rvol') ? parseFloat(Q.get('rvol')) : num('ww.rain.vol', 0.7),
  mute: safe(() => localStorage.getItem('ww.rain.mute') === '1', false),
  rev: 0,
}
const subs = new Set()
export const weatherStore = {
  get: () => snap,
  set(patch) {
    snap = { ...snap, ...patch }
    safe(() => {
      if ('vol' in patch) localStorage.setItem('ww.rain.vol', String(snap.vol))
      if ('mute' in patch) localStorage.setItem('ww.rain.mute', snap.mute ? '1' : '0')
      if ('quality' in patch) localStorage.setItem('ww.weather.q', snap.quality)
    })
    subs.forEach((f) => f())
  },
  subscribe(f) { subs.add(f); return () => subs.delete(f) },
}
export const useWeather = () => useSyncExternalStore(weatherStore.subscribe, weatherStore.get)

// live smoothed state (all 0..1 unless noted)
const start = KINDS[snap.kind]
export const WX = {
  rain: Q.has('weather') ? start.rain : 0,       // rainfall intensity
  cloud: Q.has('weather') ? start.cloud : 0,     // overcast amount
  wind: start.wind,
  wet: Q.has('weather') ? start.rain : 0,        // surfaces (ground) wetness: rises with rain, dries slowly
  wetWin: Q.has('weather') ? start.rain : 0,     // water on the window glass: forms with rain, drains away slowly
  drain: 0,                                      // 1 while glass is draining (rain stopped / lighter than the water on the glass)
  flash: 0,                                      // lightning flash (storm)
  time: 0,                                       // seconds, drives shaders
  thunder: 0,                                    // set to a delay (s) when a flash happens; audio consumes it
  ver: 0,
}
let flashTimer = 8 + Math.random() * 8, providers = []
export const registerWeatherProvider = (fn) => { providers.push(fn); return () => { providers = providers.filter((p) => p !== fn) } }
export const setWeather = (kind, instant = false) => {
  if (!KINDS[kind]) return
  weatherStore.set({ kind })
  if (instant) { const K = KINDS[kind]; WX.rain = K.rain; WX.cloud = K.cloud; WX.wind = K.wind; WX.wet = K.rain; WX.wetWin = K.rain }
}

const approach = (v, t, upRate, downRate, dt) => { const r = t > v ? upRate : downRate; return v + (t - v) * (1 - Math.exp(-r * dt)) }

export function stepWeather(dt) {
  dt = Math.min(dt, 0.1)
  let kind = snap.kind
  for (const p of providers) { const k = p(dt, WX.time); if (k && KINDS[k]) { kind = k; break } }
  const K = KINDS[kind]
  WX.time += dt
  WX.rain = approach(WX.rain, K.rain, 0.35, 0.28, dt)                       // ~6-8 s to build / ease off
  WX.cloud = approach(WX.cloud, K.cloud, 0.30, 0.22, dt)
  WX.wind = approach(WX.wind, K.wind, 0.4, 0.3, dt)
  WX.wet = approach(WX.wet, Math.max(K.rain, 0), 0.20, 0.025, dt)           // ground: wets in ~10 s, dries over ~1.5 min
  // glass: droplets form quickly while it rains, and drain away (slide off) over ~50-60 s after it stops
  const target = Math.max(WX.rain, 0)
  if (target >= WX.wetWin) WX.wetWin = approach(WX.wetWin, target, 0.5, 0, dt)
  else WX.wetWin = Math.max(target * 0.85, WX.wetWin - dt * (0.014 + 0.012 * (1 - WX.rain)))
  WX.drain = WX.wetWin > WX.rain + 0.02 ? 1 : 0
  // lightning (storm only): a flash with a quick double flicker, thunder follows after a delay
  WX.flash = Math.max(0, WX.flash - dt * 3.2)
  if (K.storm && WX.rain > 0.8) {
    flashTimer -= dt
    if (flashTimer < 0) { flashTimer = 9 + Math.random() * 14; WX.flash = 1; WX.thunder = 0.8 + Math.random() * 2.4 }
    else if (flashTimer > 8.6 && flashTimer < 8.75) WX.flash = Math.max(WX.flash, 0.6)
  }
  WX.ver++
}
export const advanceWeather = (seconds) => { for (let t = 0; t < seconds; t += 0.1) stepWeather(0.1) }   // test hook: fast-forward the simulation (headless runs render at ~1 fps)
if (typeof window !== 'undefined') window.__weather = { WX, store: weatherStore, set: setWeather, advance: advanceWeather, KINDS }
