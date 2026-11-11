// Blends the live scene toward the selected atmosphere. Mount inside the Canvas. Updates: shared sky uniforms (dome + river + IBL), sun/moon colour, intensity and direction,
// hemisphere bounce, street fill, fog colour, exposure, lit-window fraction + glow, street lamp/window strength, and a tint on the unlit exterior (skyline, boats, far bank).
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PRESETS, ORDER, atmoStore, LIVE, dirFrom } from './atmosphere.js'
import { SKY_U, LIT, GLOW } from './Skyline.jsx'

const lerp = (a, b, t) => a + (b - a) * t
const tmp = new THREE.Color(), tmp2 = new THREE.Color(), tv = new THREE.Vector3()

export default function Atmosphere({ sunRef, hemiRef, fillRef }) {
  const { scene, gl } = useThree()
  const cur = useRef(null), exterior = useRef(null), last = useRef(''), clock = useRef(0), settled = useRef(true), tintTick = useRef(0)
  useEffect(() => {                                        // initial state = golden hour exactly as before
    const g = PRESETS.golden
    cur.current = { sunAz: g.sunAz, sunEl: g.sunEl, sunCol: new THREE.Color(g.sunCol), sun: g.sun, hemiSky: new THREE.Color(g.hemiSky), hemiGround: new THREE.Color(g.hemiGround), hemi: g.hemi, fill: g.fill, fillCol: new THREE.Color(g.fillCol),
      fog: new THREE.Color(g.fog), exp: g.exp, lit: g.lit, glow: g.glow, tint: new THREE.Color(...g.tint), lamp: g.lamp, win: g.win,
      sky: Object.fromEntries(Object.entries(g.sky).map(([k, v]) => [k, v.clone()])) }
  }, [])
  useFrame((_, dt) => {
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
    // sky uniforms (dome, river, IBL all share these)
    const U = SKY_U
    U.cZenith.value.copy(A.sky.zen); U.cUpper.value.copy(A.sky.upper); U.cMid.value.copy(A.sky.mid); U.cPink.value.copy(A.sky.pink); U.cHorizon.value.copy(A.sky.hor)
    U.cBelow.value.copy(A.sky.below); U.cSunGlow.value.copy(A.sky.glow); U.cCloudHi.value.copy(A.sky.cHi); U.cCloudLo.value.copy(A.sky.cLo)
    dirFrom(A.sunAz, A.sunEl, U.uSun.value)
    LIT.value = A.lit; GLOW.value = A.glow
    LIVE.lamp = A.lamp; LIVE.win = A.win; LIVE.tint.copy(A.tint); LIVE.sunDir.copy(U.uSun.value); LIVE.sunEl = A.sunEl
    // lights
    const L = sunRef.current; if (L) { L.color.copy(A.sunCol); L.intensity = A.sun }
    const H = hemiRef.current; if (H) { H.color.copy(A.hemiSky); H.groundColor.copy(A.hemiGround); H.intensity = A.hemi }
    const F = fillRef.current; if (F) { F.color.copy(A.fillCol); F.userData.k = A.fill }
    if (scene.fog) scene.fog.color.copy(A.fog)
    gl.toneMappingExposure = A.exp
    // settled -> refresh the image-based light once the blend has converged (cheap 128px capture)
    const near = Math.abs(A.sunEl - T.sunEl) < 0.2 && Math.abs(A.sky.zen.r - T.sky.zen.r) < 0.01 && Math.abs(A.sky.hor.b - T.sky.hor.b) < 0.01
    if (near && last.current !== st.preset) { last.current = st.preset; atmoStore.set({ rev: st.rev + 1 }) }
    // tint on the unlit exterior (traverse a few times a second; materials remember their base colour)
    tintTick.current += dt
    if (tintTick.current > 0.12) {
      tintTick.current = 0
      if (!exterior.current) exterior.current = scene.getObjectByName('exterior')
      exterior.current?.traverse((o) => {
        const m = o.material; if (!m || Array.isArray(m) || !m.isMeshBasicMaterial || m.userData.noTint) return
        if (!m.userData.base) m.userData.base = m.color.clone()
        if (m.userData.glow) m.color.copy(m.userData.base).multiplyScalar(A.win)
        else m.color.copy(m.userData.base).multiply(A.tint)
      })
    }
  })
  return null
}
