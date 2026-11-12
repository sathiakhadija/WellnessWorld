// Outdoor rainfall: GPU-animated streak billboards in a box that follows the camera (zero CPU per drop) + ground splash rings.
// Drops differ in speed, length, width, brightness and slant (wind + per-drop jitter). In the penthouse any drop that would fall inside the apartment's footprint
// (room, bedroom, bathroom, roof) is discarded in the shader, so it only rains OUTSIDE the glass. Visible amount follows WX.rain; quality sets the instance count.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WX, useWeather } from './weather.js'
import { world } from '../world.js'
import { GY } from '../street/geo.js'

const COUNT = { low: 2500, medium: 6500, high: 12000 }
const VOL = new THREE.Vector3(34, 22, 34)

const INSIDE = /* glsl */`
uniform float uLevel;
bool insideHome(vec3 p) { return uLevel < .5 && ((p.x > -9.95 && p.x < 4.05 && p.z > -11.95 && p.z < 0.45) || (p.x > -0.7 && p.x < 3.1 && p.z > 0.0 && p.z < 4.9)); }   // penthouse footprint (rooms + roof) - NO rain in here
`
const streakVS = /* glsl */`
attribute vec4 aSeed;
uniform float uTime, uRain, uWind, uFar, uGround;
uniform vec3 uVol;
varying float vA; varying vec3 vWP;
${INSIDE}
void main() {
  float vis = step(aSeed.w, uRain);                                   // fraction of drops alive = rain intensity
  float k1 = fract(aSeed.x * 7.31), k2 = fract(aSeed.y * 5.17), k3 = fract(aSeed.z * 3.77), k4 = fract(aSeed.w * 11.9);
  float speed = (8. + 7. * k1) * (.8 + .5 * uRain);                       // m/s: bigger drops fall faster
  vec3 vel = vec3(uWind * (2.2 + 1.6 * k2), -speed, uWind * (k3 - .5) * 1.8 + (k2 - .5) * .6);
  vec3 p = (aSeed.xyz - .5) * uVol + vel * uTime;
  vec3 rel = mod(p - cameraPosition + uVol * .5, uVol) - uVol * .5;
  vec3 head = cameraPosition + rel;
  vec3 dir = normalize(vel);
  float len = (.35 + .8 * k4) * (speed / 11.) * (.7 + .5 * uRain);
  vec3 mid = head - dir * len * (.5 - position.y);
  vec3 toCam = normalize(cameraPosition - mid);
  vec3 side = normalize(cross(dir, toCam));
  float w = .005 + .009 * k3 * (.6 + .6 * uRain);
  vec3 wp = mid + side * position.x * w;
  vWP = wp;
  float d = distance(wp, cameraPosition);
  float a = (.22 + .5 * k2) * vis * smoothstep(.5, 2.5, d) * (1. - smoothstep(uFar * .55, uFar, d));
  if (wp.y < uGround || insideHome(wp)) a = 0.;
  vA = a * (1. - smoothstep(.5, 1., position.y + .5) * .4);              // fade the tail end
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
}`
const streakFS = /* glsl */`
uniform vec3 uColor; varying float vA;
void main() { if (vA < .01) discard; gl_FragColor = vec4(uColor, vA); }`

const splashVS = /* glsl */`
attribute vec4 aSeed;
uniform float uTime, uRain, uGround;
uniform vec3 uCenter;
varying vec2 vUV; varying float vT; varying float vOn;
${INSIDE}
void main() {
  float on = step(aSeed.w, uRain);
  float period = .45 + .5 * fract(aSeed.x * 9.1);
  float t = fract(uTime / period + aSeed.y * 13.);
  vec2 xz;
  if (uLevel < .5) xz = vec2(mix(-4.3, 3.5, aSeed.x), mix(-17.5, -12.1, aSeed.z));               // penthouse: the balcony deck
  else { vec2 r = (vec2(aSeed.x, aSeed.z) - .5) * 26.; xz = uCenter.xz + r; xz += floor((uCenter.xz - xz) / 26. + .5) * 26.; }
  float size = (.06 + .1 * fract(aSeed.w * 17.)) * (.4 + t * 1.1);
  vec3 wp = vec3(xz.x, uGround + .02, xz.y) + vec3(position.x * size, 0., position.y * size);
  vUV = position.xy * 2.; vT = t; vOn = on * (1. - smoothstep(14., 24., distance(wp.xz, cameraPosition.xz)));
  if (insideHome(wp) && uLevel < .5) vOn = 0.;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
}`
const splashFS = /* glsl */`
uniform vec3 uColor; varying vec2 vUV; varying float vT; varying float vOn;
void main() { float r = length(vUV); float ring = smoothstep(.2, 0., abs(r - (.25 + .65 * vT))) * (1. - vT) * vOn; if (ring < .02) discard; gl_FragColor = vec4(uColor, ring * .55); }`

function seeds(n, s) {
  let a = s >>> 0; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 }
  const arr = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) arr[i] = r(); return arr
}
const quad = () => new THREE.PlaneGeometry(1, 1)

const DBG = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('wdbg') : null
export default function Rain() {
  const { scene } = useThree()
  const wx = useWeather()
  const n = COUNT[wx.quality] ?? COUNT.medium, NS = wx.quality === 'low' ? 250 : wx.quality === 'high' ? 1100 : 600
  const streak = useRef(), splash = useRef()
  const sg = useMemo(() => { const g = new THREE.InstancedBufferGeometry().copy(quad()); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds(COUNT.high, 11), 4)); g.instanceCount = n; return g }, [])
  const pg = useMemo(() => { const g = new THREE.InstancedBufferGeometry().copy(quad()); g.rotateX(-Math.PI / 2); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds(1100, 29), 4)); g.instanceCount = NS; return g }, [])
  useEffect(() => { sg.instanceCount = n; pg.instanceCount = NS }, [n, NS, sg, pg])
  const U = useMemo(() => ({ uTime: { value: 0 }, uRain: { value: 0 }, uWind: { value: 0 }, uFar: { value: 40 }, uGround: { value: -1e4 }, uVol: { value: VOL }, uLevel: { value: 0 }, uColor: { value: new THREE.Color('#cfd8e4') }, uCenter: { value: new THREE.Vector3() } }), [])
  const sm = useMemo(() => new THREE.ShaderMaterial({ vertexShader: streakVS, fragmentShader: streakFS, uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }), [U])
  const pm = useMemo(() => new THREE.ShaderMaterial({ vertexShader: splashVS, fragmentShader: splashFS, uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }), [U])
  useFrame(({ camera }) => {
    const street = world.level === 'street'
    U.uTime.value = WX.time; U.uRain.value = WX.rain; U.uWind.value = WX.wind
    U.uLevel.value = street ? 1 : 0
    U.uGround.value = street ? GY + 0.02 : -60                              // street: stop at the pavement; penthouse: fall past the tower
    U.uFar.value = 38 * (1 - 0.25 * WX.rain)
    U.uCenter.value.copy(camera.position)
    if (scene.fog) U.uColor.value.copy(scene.fog.color).lerp(new THREE.Color('#ffffff'), 0.35)
    if (streak.current) streak.current.visible = WX.rain > 0.01
    if (splash.current) splash.current.visible = WX.rain > 0.01 && (street || true)
  })
  if (DBG === 'norain') return null
  return (
    <>
      <mesh ref={streak} geometry={sg} material={sm} frustumCulled={false} renderOrder={5} />
      <mesh ref={splash} geometry={pg} material={pm} frustumCulled={false} renderOrder={5} />
    </>
  )
}
