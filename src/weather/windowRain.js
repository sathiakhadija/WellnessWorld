// Rain on window glass: a procedural droplet + trail shader patched into the existing glass material (no extra geometry, no particles, one pass).
// The glass stays transparent between drops; drops/trails are drawn as small lenses showing an INVERTED miniature of the sky/city colours (that is what a real
// droplet shows) with a bright specular edge and a warm rim from the interior lamps.
//   uWet   0..1  amount of water on the glass (WX.wetWin): density, size and number of running drops
//   uRain  0..1  current rainfall (new water arrives, drops run faster); uDrain 1 while the glass is draining after the rain stopped (everything runs off)
//   uQ     0 low | 1 medium | 2 high : number of layers
// Coordinates are WORLD metres on the glass plane (u along the wall, v = height), so every window pane, whatever its mesh UVs, shares one droplet field.
import * as THREE from 'three'
import { WX, weatherStore } from './weather.js'
import { SKY_U } from '../Skyline.jsx'

const DBG = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('wdbg') : null
export const WIN_U = {
  uWet: { value: 0 }, uRain: { value: 0 }, uDrain: { value: 0 }, uTime: { value: 0 }, uQ: { value: 1 }, uFlash: { value: 0 },
}
export function syncWindowUniforms() {
  WIN_U.uWet.value = DBG === 'nowin' ? 0 : WX.wetWin; WIN_U.uRain.value = WX.rain; WIN_U.uDrain.value = WX.drain; WIN_U.uTime.value = WX.time; WIN_U.uFlash.value = WX.flash
  WIN_U.uQ.value = { low: 0, medium: 1, high: 2 }[weatherStore.get().quality] ?? 1
}

const FRAG_FN = /* glsl */`
uniform float uWet, uRain, uDrain, uTime, uQ, uFlash;
uniform vec3 cHorizon, cMid, cUpper, cBelow;
varying vec3 vWP; varying vec3 vWN;
float sr(float a, float b, float x) { float d = b - a; if (abs(d) < 1e-6) d = 1e-6; float t = clamp((x - a) / d, 0., 1.); return t * t * (3. - 2. * t); }   // smoothstep that is also valid with reversed edges
float h11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
vec2 h12(float p) { vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// result: x = drop mask, y = trail mask, zw = drop-local normal xy (for the lens)
struct Drops { float drop; float trail; vec2 n; };
// one layer of RUNNING drops: a grid of columns; each column has a drop that slides in stick-slip steps, leaving a thin trail and growing as it "collects" water
Drops runLayer(vec2 uv, vec2 cell, float rad, float seed, float act, float speed) {
  Drops o; o.drop = 0.; o.trail = 0.; o.n = vec2(0.);
  vec2 id = floor(uv / cell); vec2 f = fract(uv / cell);
  float r = h21(id + seed);
  float on = sr(r, r + .22, act);                       // this cell holds a drop while enough water is on the glass (fades in/out smoothly)
  if (on < .01) return o;
  float t = fract(uTime * speed * (.55 + .9 * h21(id + seed + 7.1)) + r * 13.7);                  // 0..1 down the cell, then a new drop starts at the top
  float stick = t + .06 * sin(t * 25. + r * 9.) + .5 * (sin(t * 6.28 * 2. + r * 5.) * .5 + .5) * .08;   // stick-slip
  float y = 1. - clamp(stick, 0., 1.) * .92 - .04;               // drop centre in cell coords (top -> bottom)
  float x = .5 + (h21(id + seed + 3.3) - .5) * .42 + sin(t * 18. + r * 6.) * .04 * sr(0., .5, t);
  vec2 d = (f - vec2(x, y)) * cell;                                  // metres from the drop centre
  float rr = rad * (.55 + .75 * t) * (.7 + .6 * h21(id + seed + 9.9)) * on;      // grows as it runs: it picks up the beads it meets (the 'merge')
  float dist = length(vec2(d.x, d.y * .8));
  o.drop = sr(rr, rr * .6, dist) * step(.01, t) * sr(1.0, .94, t);
  o.n = d / max(rr, 1e-4);
  // trail: thin water line above the drop, strongest right behind it, vanishing toward where it started
  float above = d.y;                                                  // positive above the drop
  float len = (1. - y - .04) * cell.y;
  float w = rr * (.34 + .12 * (1. - t));
  float tr = sr(w, w * .35, abs(d.x + sin(above * 90. + r * 6.) * w * .35)) * step(0., above) * sr(len, len * .35, above) * sr(0., .02, above);
  o.trail = tr * on * (.6 + .4 * sr(0., len, len - above));
  // beads left along the trail
  float bead = h21(floor(vec2(id.x, floor(above / (rad * 1.9)))) + seed + 21.) ;
  vec2 bc = vec2(0., (floor(above / (rad * 1.9)) + .5) * rad * 1.9);
  float bd = length(vec2(d.x, above - bc.y)); float br = rad * .28 * step(.72, bead) * step(0., above) * step(above, len);
  o.trail = max(o.trail, sr(br, br * .5, bd) * on * .9);
  return o;
}
// static fine droplets: small round beads that stay put (appear gradually as the wet amount rises, shrink away as it drains)
Drops fineLayer(vec2 uv, float cell, float rad, float seed, float act) {
  Drops o; o.drop = 0.; o.trail = 0.; o.n = vec2(0.);
  vec2 id = floor(uv / cell), f = fract(uv / cell);
  float r = h21(id + seed), r2 = h21(id + seed + 4.4);
  float on = sr(r, r + .3, act);
  if (on < .01) return o;
  vec2 c = vec2(.28 + .44 * h21(id + seed + 1.7), .28 + .44 * r2);
  vec2 d = (f - c) * cell;
  float rr = rad * (.35 + .9 * h21(id + seed + 8.8)) * on;
  float dist = length(vec2(d.x, d.y * .9));
  o.drop = sr(rr, rr * .55, dist); o.n = d / max(rr, 1e-4);
  return o;
}
vec3 sceneGrad(float s) {      // inverted-miniature colours: 0 = ground / city lights, .5 = horizon haze, 1 = upper sky
  vec3 city = mix(cBelow, vec3(.95, .72, .45) * .5, .35 + .25 * sin(s * 40.));
  return mix(mix(city, cHorizon, sr(0., .5, s)), mix(cMid, cUpper, sr(.5, 1., s)), sr(.45, .8, s));
}
vec4 windowRainColor(vec3 wp, vec3 wn, vec3 baseCol) {
  float side = step(.5, abs(wn.x));
  vec2 uv = vec2(mix(wp.x, wp.z, side), wp.y);
  float act = clamp(uWet, 0., 1.);
  float spd = (.012 + .03 * uRain) * (1. + 1.6 * uDrain);                 // drops run faster in heavy rain and when draining
  float cnt = uQ < .5 ? 1. : (uQ < 1.5 ? 2. : 3.);
  Drops a = runLayer(uv, vec2(.13, .40), .0115, 1., act, spd * 1.0);
  Drops b = runLayer(uv + vec2(.07, .3), vec2(.08, .27), .0068, 5., act * .95, spd * 1.35);
  Drops c = fineLayer(uv, .04, .0042, 11., act);
  Drops d; d.drop = 0.; d.trail = 0.; d.n = vec2(0.);
  Drops e; e.drop = 0.; e.trail = 0.; e.n = vec2(0.);
  if (uQ > .5) d = fineLayer(uv + .031, .028, .0022, 17., act * 1.05);
  if (uQ > 1.5) e = runLayer(uv + vec2(.13, .7), vec2(.055, .2), .0048, 9., act * .9, spd * 1.8);
  // pick the strongest lens at this point
  float m = a.drop; vec2 n = a.n;
  if (b.drop > m) { m = b.drop; n = b.n; }
  if (c.drop > m) { m = c.drop; n = c.n; }
  if (d.drop > m) { m = d.drop; n = d.n; }
  if (e.drop > m) { m = e.drop; n = e.n; }
  float trail = max(max(a.trail, b.trail), e.trail);
  float rim = clamp(length(n), 0., 1.);
  float z = sqrt(max(0., 1. - rim * rim));
  // inverted image: the drop's top shows the low scene, its bottom the sky; slight horizontal flip
  float s = clamp(.5 - n.y * .55 + (wp.y * .08), 0., 1.);
  vec3 lens = sceneGrad(s) * (.85 + .25 * z);
  lens += vec3(1., .72, .45) * pow(rim, 2.2) * .35 * sr(-.2, .8, -n.y);      // warm interior-lamp reflection on the lower rim
  float spec = pow(max(0., dot(normalize(vec3(n * -1., z + .3)), normalize(vec3(-.35, .55, .75)))), 28.);
  lens += vec3(1.) * spec * .85;
  lens *= .78 + .3 * uFlash;
  float edge = sr(.55, 1., rim);
  lens = mix(lens, lens * .55, edge * .6);                                              // dark refraction edge
  float aDrop = m * mix(.42, .8, edge) ;
  vec3 tcol = mix(vec3(.82, .9, 1.), sceneGrad(.62), .55);
  float aTrail = trail * .36;
  vec3 col = mix(baseCol, tcol, aTrail * (1. - aDrop));
  col = mix(col, lens, aDrop);
  float alpha = clamp(aDrop + aTrail, 0., .9);
  return vec4(col, alpha);
}`

export function applyWindowRain(m) {
  if (m.userData.windowRain) return
  m.userData.windowRain = true
  const prev = m.onBeforeCompile
  m.onBeforeCompile = (shader, renderer) => {
    prev?.call(m, shader, renderer)
    Object.assign(shader.uniforms, WIN_U, { cHorizon: SKY_U.cHorizon, cMid: SKY_U.cMid, cUpper: SKY_U.cUpper, cBelow: SKY_U.cBelow })
    shader.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);')
    shader.fragmentShader = FRAG_FN + "\n" + shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
      if (uWet > 0.004) { vec4 wr = windowRainColor(vWP, normalize(vWN), gl_FragColor.rgb); gl_FragColor.rgb = wr.rgb; gl_FragColor.a = max(gl_FragColor.a, wr.a); }`)
  }
  m.customProgramCacheKey = () => 'windowRain'
  m.needsUpdate = true
}
