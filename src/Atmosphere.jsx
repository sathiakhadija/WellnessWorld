// Blends the live scene toward the selected atmosphere. Mount inside the Canvas. Updates: shared sky uniforms (dome + river + IBL), sun/moon colour, intensity and direction,
// hemisphere bounce, street fill, fog colour, exposure, lit-window fraction + glow, street lamp/window strength, and a tint on the unlit exterior (skyline, boats, far bank).
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PRESETS, ORDER, atmoStore, LIVE, dirFrom } from './atmosphere.js'
import { SKY_U, LIT, GLOW } from './Skyline.jsx'
import { WX, stepWeather } from './weather/weather.js'
import { syncWindowUniforms } from './weather/windowRain.js'
import { syncWet } from './weather/wet.js'

const lerp = (a, b, t) => a + (b - a) * t
const tmp = new THREE.Color(), tmp2 = new THREE.Color(), tv = new THREE.Vector3()
const OVC_SUN = new THREE.Color('#c9d3e2'), OVC_HEMI_SKY = new THREE.Color('#c3ccda'), OVC_HEMI_GR = new THREE.Color('#8c8f9a'), OVC_FOG = new THREE.Color('#9aa1ae'), LUMA = new THREE.Color()
// desaturate toward a cool grey of the SAME luminance (keeps the time-of-day brightness, removes the colour)
const COOL = [0.93, 0.98, 1.08]
function overcast(col, k) { const l = col.r * 0.3 + col.g * 0.59 + col.b * 0.11; col.r += (l * COOL[0] - col.r) * k; col.g += (l * COOL[1] - col.g) * k; col.b += (l * COOL[2] - col.b) * k; return col }
const fogBase = { near: 0, far: 0 }

export default function Atmosphere({ sunRef, hemiRef, fillRef }) {
  const { scene, gl } = useThree()
  const cur = useRef(null), exterior = useRef(null), last = useRef(''), clock = useRef(0), settled = useRef(true), tintTick = useRef(0)
  useEffect(() => {                                        // initial state = golden hour exactly as before
    const g = PRESETS.golden
    cur.current = { sunAz: g.sunAz, sunEl: g.sunEl, sunCol: new THREE.Color(g.sunCol), sun: g.sun, hemiSky: new THREE.Color(g.hemiSky), hemiGround: new THREE.Color(g.hemiGround), hemi: g.hemi, fill: g.fill, fillCol: new THREE.Color(g.fillCol),
      fog: new THREE.Color(g.fog), exp: g.exp, lit: g.lit, glow: g.glow, tint: new THREE.Color(...g.tint), lamp: g.lamp, win: g.win,
      sky: Object.fromEntries(Object.entries(g.sky).map(([k, v]) => [k, v.clone()])) }
  }, [])
  const wxTick = useRef(0), wxIbl = useRef(0)
  useFrame((_, dt) => {
    stepWeather(dt); syncWindowUniforms(); syncWet()
    const A = cur.current; if (!A) return
    const st = atmoStore.get()
    if (st.auto) {                                          // optional day/night progression: ~50 s per atmosphere
      clock.current += Math.min(dt, 0.1)
      if (clock.current > 50) { clock.current = 0; const i = ORDER.indexOf(st.preset); atmoStore.set({ preset: ORDER[(i + 1) % ORDER.length] }) }
    }
    const T = PRESETS[st.preset] || PRESETS.golden
    const k = st.reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 2.2)                    // reduced motion: switch instantly
    A.sunAz = lerp(A.sunAz, T.sunAz, k); A.sunEl = lerp(A.sunEl, T.sunEl, k)
    A.sunCol.lerp(tmp.set(T.sunCol), k); A.sun = lerp(A.sun, T.sun, k)
    A.hemiSky.lerp(tmp.set(T.hemiSky), k); A.hemiGround.lerp(tmp.set(T.hemiGround), k); A.hemi = lerp(A.hemi, T.hemi, k)
    A.fill = lerp(A.fill, T.fill, k); A.fillCol.lerp(tmp.set(T.fillCol), k)
    A.fog.lerp(tmp.set(T.fog), k); A.exp = lerp(A.exp, T.exp, k); A.lit = lerp(A.lit, T.lit, k); A.glow = lerp(A.glow, T.glow, k)
    A.tint.lerp(tmp.set(...T.tint), k); A.lamp = lerp(A.lamp, T.lamp, k); A.win = lerp(A.win, T.win, k)
    for (const key of Object.keys(A.sky)) A.sky[key].lerp(T.sky[key], k)
    const C = WX.cloud, R = WX.rain, FL = WX.flash
    // sky uniforms (dome, river, IBL all share these)
    const U = SKY_U
    U.cZenith.value.copy(A.sky.zen); U.cUpper.value.copy(A.sky.upper); U.cMid.value.copy(A.sky.mid); U.cPink.value.copy(A.sky.pink); U.cHorizon.value.copy(A.sky.hor)
    U.cBelow.value.copy(A.sky.below); U.cSunGlow.value.copy(A.sky.glow); U.cCloudHi.value.copy(A.sky.cHi); U.cCloudLo.value.copy(A.sky.cLo)
    if (C > 0.001) {                                         // WEATHER: overcast sky = same brightness, cool grey; darker with rainfall; lightning lifts it
      const dk = 1 - 0.30 * R + FL * 0.55
      for (const key of ['cZenith', 'cUpper', 'cMid', 'cPink', 'cHorizon', 'cSunGlow', 'cCloudHi', 'cCloudLo']) { const v = U[key].value; overcast(v, C * 0.88); v.multiplyScalar(dk) }
      U.cSunGlow.value.multiplyScalar(1 - 0.6 * C)
    }
    dirFrom(A.sunAz, A.sunEl, U.uSun.value)
    LIT.value = A.lit; GLOW.value = A.glow
    LIVE.lamp = A.lamp * (1 + 0.45 * C); LIVE.win = A.win * (1 + 0.3 * C); LIVE.tint.copy(A.tint); LIVE.sunDir.copy(U.uSun.value); LIVE.sunEl = A.sunEl
    // lights
    const L = sunRef.current; if (L) { L.color.copy(A.sunCol).lerp(OVC_SUN, C * 0.9); L.intensity = A.sun * (1 - 0.88 * C) + FL * 2.2 }
    const H = hemiRef.current; if (H) { H.color.copy(A.hemiSky).lerp(OVC_HEMI_SKY, C * 0.8); H.groundColor.copy(A.hemiGround).lerp(OVC_HEMI_GR, C * 0.7); H.intensity = A.hemi * (1 + 0.55 * C - 0.25 * R) + FL * 0.9 }
    const F = fillRef.current; if (F) { F.color.copy(A.fillCol); F.userData.k = A.fill }
    if (scene.fog) {
      scene.fog.color.copy(A.fog); overcast(scene.fog.color, C * 0.8); scene.fog.color.lerp(OVC_FOG, C * 0.25 * (A.sun > 1 ? 1 : 0.4)); if (FL > 0) scene.fog.color.multiplyScalar(1 + FL * 0.5)
      if (!fogBase.far) { fogBase.near = scene.fog.near; fogBase.far = scene.fog.far }
      scene.fog.near = fogBase.near * (1 - 0.45 * R); scene.fog.far = fogBase.far * (1 - 0.42 * R - 0.1 * C)     // rain closes the view in
    }
    gl.toneMappingExposure = A.exp * (1 - 0.06 * C) + FL * 0.25
    // settled -> refresh the image-based light once the blend has converged (cheap 128px capture)
    const near = Math.abs(A.sunEl - T.sunEl) < 0.2 && Math.abs(A.sky.zen.r - T.sky.zen.r) < 0.01 && Math.abs(A.sky.hor.b - T.sky.hor.b) < 0.01
    if (near && last.current !== st.preset) { last.current = st.preset; atmoStore.set({ rev: st.rev + 1 }) }
    // cosy interior: static room lamps (userData.wx) glow warmer against the greyer daylight
    wxTick.current += dt
    if (wxTick.current > 0.2) {
      wxTick.current = 0
      scene.traverse((o) => { if (o.isLight && o.userData.wx) { if (o.userData.wxBase === undefined) o.userData.wxBase = o.intensity; o.intensity = o.userData.wxBase * (1 + 0.55 * C + 0.15 * R) } })
    }
    // re-capture the image-based light once the weather has settled (the env map shows the overcast sky)
    if (Math.abs(WX.cloud - wxIbl.current) > 0.12) { const settled = Math.abs(WX.cloud - (WX.cloud > wxIbl.current ? 1 : 0)) >= 0; wxIbl.current = WX.cloud; void settled; atmoStore.set({ rev: atmoStore.get().rev + 1 }) }
    // tint on the unlit exterior (traverse a few times a second; materials remember their base colour)
    tintTick.current += dt
    if (tintTick.current > 0.12) {
      tintTick.current = 0
      if (!exterior.current) exterior.current = scene.getObjectByName('exterior')
      exterior.current?.traverse((o) => {
        const m = o.material; if (!m || Array.isArray(m) || !m.isMeshBasicMaterial || m.userData.noTint) return
        if (!m.userData.base) m.userData.base = m.color.clone()
        if (m.userData.glow) m.color.copy(m.userData.base).multiplyScalar(A.win)
        else { m.color.copy(m.userData.base).multiply(A.tint); if (C > 0.001) { m.color.r *= 1 - 0.16 * C - 0.1 * R; m.color.g *= 1 - 0.09 * C - 0.08 * R; m.color.b *= 1 - 0.02 * C - 0.06 * R } }
      })
    }
  })
  return null
}
