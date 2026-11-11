// Procedural rain ambience (Web Audio, no asset files). Layers: broadband rainfall (outdoors), muffled rainfall (indoors), roof rumble, random drops tapping the
// glass (louder/more frequent near a window), and distant thunder with the storm. Everything is smoothed (setTargetAtTime), driven by WX.rain, where the player
// is (street / balcony = outdoors, inside = muffled) and the distance to the nearest window. Independent volume + mute live in weatherStore.
// The AudioContext can only start after a user gesture, so it is created on the first key press / click.
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { WX, weatherStore } from './weather.js'
import { world } from '../world.js'

const clamp01 = (x) => Math.max(0, Math.min(1, x))

function noiseBuffer(ctx, secs, kind) {
  const n = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c); let b0 = 0, b1 = 0, b2 = 0, last = 0
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 }
      else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2 }
    }
    // crossfade the loop seam
    const f = Math.floor(ctx.sampleRate * 0.1); for (let i = 0; i < f; i++) { const t = i / f; d[n - f + i] = d[n - f + i] * (1 - t) + d[i] * t }
  }
  return buf
}

export default function RainAudio() {
  const A = useRef(null), acc = useRef(0), indoor = useRef(1), win = useRef(0), thunderAt = useRef(0), tapAcc = useRef(0)
  useEffect(() => {
    const start = () => {
      if (A.current) { A.current.ctx.state === 'suspended' && A.current.ctx.resume(); return }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return
      const ctx = new AC(), master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination)
      const pink = noiseBuffer(ctx, 4, 'pink'), brown = noiseBuffer(ctx, 5, 'brown')
      const loop = (buf, off) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, off); return s }
      const chain = (src, nodes) => { let p = src; for (const n of nodes) { p.connect(n); p = n } return p }
      const filt = (type, f, q = 0.7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x }
      const gOut = ctx.createGain(), gIn = ctx.createGain(), gRoof = ctx.createGain(), gTap = ctx.createGain(); gOut.gain.value = gIn.gain.value = gRoof.gain.value = gTap.gain.value = 0
      const lpOut = filt('lowpass', 6500), lpIn = filt('lowpass', 800)
      chain(loop(pink, 0), [filt('highpass', 280), lpOut, gOut]).connect(master)
      chain(loop(pink, 1.7), [filt('highpass', 120), lpIn, gIn]).connect(master)
      chain(loop(brown, 0.4), [filt('bandpass', 230, 0.8), gRoof]).connect(master)
      gTap.connect(master)
      A.current = { ctx, master, gOut, gIn, gRoof, gTap, lpOut, lpIn, pink, brown, filt }
    }
    const ev = ['pointerdown', 'keydown', 'touchstart']
    ev.forEach((e) => window.addEventListener(e, start, { passive: true }))
    return () => { ev.forEach((e) => window.removeEventListener(e, start)); try { A.current?.ctx.close() } catch {} A.current = null }
  }, [])
  const tap = (a, gain) => {
    const { ctx } = a, len = Math.floor(ctx.sampleRate * 0.035), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18))
    const s = ctx.createBufferSource(); s.buffer = b
    const f = a.filt('bandpass', 1500 + Math.random() * 3200, 3.5), g = ctx.createGain(); g.gain.value = gain * (0.35 + Math.random() * 0.65)
    s.connect(f); f.connect(g); g.connect(a.gTap); s.start()
  }
  const thunder = (a) => {
    const { ctx } = a, s = ctx.createBufferSource(); s.buffer = a.brown; s.loop = false
    const f = a.filt('lowpass', 150, 0.6), g = ctx.createGain(), t = ctx.currentTime, v = 1.1 * weatherStore.get().vol * (weatherStore.get().mute ? 0 : 1)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.35); g.gain.exponentialRampToValueAtTime(0.001, t + 4.5)
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(0, Math.random() * 2, 5)
  }
  useFrame((_, dt) => {
    const a = A.current; if (!a) return
    acc.current += dt; if (acc.current < 0.1) return
    const step = acc.current; acc.current = 0
    const { ctx } = a, now = ctx.currentTime, st = weatherStore.get()
    // where is the player: street / balcony = outdoors; inside the apartment = muffled; distance to the nearest glazing
    const p = world.player, street = world.level === 'street'
    const onBalcony = !street && p.z < -11.95
    const targetIn = street ? 0 : onBalcony ? 0.2 : 1
    indoor.current += (targetIn - indoor.current) * Math.min(1, step * 1.6)
    const dist = street ? 99 : Math.min(Math.abs(p.z + 11.8), Math.abs(p.x - 3.6))
    win.current += (clamp01(1 - dist / 5) - win.current) * Math.min(1, step * 2)
    const r = Math.pow(WX.rain, 0.85), I = indoor.current, w = win.current
    const T = (param, v, tc = 0.6) => param.setTargetAtTime(v, now, tc)
    T(a.master.gain, st.mute ? 0 : st.vol, 0.15)
    T(a.gOut.gain, (1 - I) * r * 0.5); T(a.lpOut.frequency, 4200 + 3800 * WX.rain)
    T(a.gIn.gain, I * r * 0.55 * (1 + 0.55 * w)); T(a.lpIn.frequency, 650 + 500 * WX.rain + 900 * w)
    T(a.gRoof.gain, I * r * 0.2)
    T(a.gTap.gain, I * (0.4 + 0.6 * w) * Math.min(1, r * 1.4))
    // window taps: random drops against the glass, more of them in heavier rain and close to the window
    const rate = I > 0.3 ? (1.2 + 16 * WX.rain) * (0.3 + 0.7 * w) * (WX.rain > 0.02 ? 1 : 0) : 0
    tapAcc.current += rate * step
    while (tapAcc.current >= 1) { tapAcc.current -= 1; tap(a, 0.45 + 0.5 * w) }
    if (WX.thunder > 0) { thunderAt.current = performance.now() + WX.thunder * 1000; WX.thunder = 0 }
    if (thunderAt.current && performance.now() > thunderAt.current) { thunderAt.current = 0; thunder(a) }
    if (typeof window !== 'undefined') window.__weather.audio = { state: ctx.state, master: a.master.gain.value, out: a.gOut.gain.value, in: a.gIn.gain.value, roof: a.gRoof.gain.value, tap: a.gTap.gain.value, indoor: I, win: w, rate }
  })
  return null
}
