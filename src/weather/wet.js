// Wet-surface look for ground materials: darker, glossier, with noise-driven puddles that pick up the sky reflection (the scene's IBL).
// Patches any MeshStandardMaterial once; one shared uniform (WX.wet) drives every patched material, so ground, paving and balcony deck dry/wet together.
import * as THREE from 'three'
import { WX } from './weather.js'

export const WET_U = { uWetG: { value: 0 } }
export const syncWet = () => { WET_U.uWetG.value = WX.wet }

const NOISE = /* glsl */`
uniform float uWetG; varying vec3 vWPw; varying vec3 vWNw;
float wh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(wh(i), wh(i + vec2(1., 0.)), f.x), mix(wh(i + vec2(0., 1.)), wh(i + vec2(1., 1.)), f.x), f.y); }`

export function applyWet(m, strength = 1) {
  if (!m || m.userData.wetPatched) return
  m.userData.wetPatched = true
  const prev = m.onBeforeCompile
  m.onBeforeCompile = (shader, renderer) => {
    prev?.call(m, shader, renderer)
    shader.uniforms.uWetG = WET_U.uWetG
    shader.vertexShader = 'varying vec3 vWPw; varying vec3 vWNw;\n' + shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n#ifdef USE_INSTANCING\n vec4 wwp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);\n#else\n vec4 wwp = modelMatrix * vec4(transformed, 1.0);\n#endif\n vWPw = wwp.xyz; vWNw = normalize(mat3(modelMatrix) * objectNormal);')
    shader.fragmentShader = NOISE + "\n" + shader.fragmentShader
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      { float up = smoothstep(.35, .85, normalize(vWNw).y);
        float pud = smoothstep(.56, .70, wn(vWPw.xz * .32) * .62 + wn(vWPw.xz * 1.15) * .38) * ${strength.toFixed(2)};
        float wa = uWetG * up;
        diffuseColor.rgb *= mix(1., .68, wa) * mix(1., .72, pud * wa);
        roughnessFactor = mix(roughnessFactor, roughnessFactor * .5, wa);
        roughnessFactor = mix(roughnessFactor, .05, pud * wa); }`)
  }
  m.customProgramCacheKey = () => 'wet' + strength
  m.needsUpdate = true
}

// Wet-look lamp reflections on paving (Bible s08/s12/s15 targets: warm lantern columns streaking toward the viewer on dark glossy stone).
// Analytic planar reflection of the N nearest lamps: for a ground point p, the mirrored lamp (base b, height h) is seen along the line camera -> mirrored lamp, so the
// glow lies on the segment from b toward the camera (length ~ dist * h / (camH + h)), narrow at the base, fading with distance along it. Strength follows the
// blue-hour/night factor and rain wetness (uLampK), so dry daylight paving is untouched.
export const LAMP_N = 12
export const LAMP_U = { uLamp: { value: Array.from({ length: LAMP_N }, () => new THREE.Vector4()) }, uCamW: { value: new THREE.Vector3() }, uLampK: { value: 0 } }
export function applyLampReflect(m) {
  const prev = m.onBeforeCompile
  m.onBeforeCompile = (shader, renderer) => {
    prev?.call(m, shader, renderer)
    Object.assign(shader.uniforms, LAMP_U)
    shader.fragmentShader = `uniform vec4 uLamp[${LAMP_N}]; uniform vec3 uCamW; uniform float uLampK;\n` + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (uLampK > 0.001) {
        vec3 lr = vec3(0.);
        for (int li = 0; li < ${LAMP_N}; li++) {
          vec4 L = uLamp[li]; if (L.w <= 0.) continue;
          vec2 toC = uCamW.xz - L.xy; float dC = length(toC); vec2 dir = toC / max(dC, .001);
          vec2 r = vWPw.xz - L.xy; float along = dot(r, dir); float lat = length(r - dir * along);
          float len = max(dC * L.z / (max(uCamW.y - ${'0.0'}, 1.2) + L.z), .5);
          float f = smoothstep(-.15, .1, along) * (1. - smoothstep(0., len, along));
          float sg = .28 + .09 * max(along, 0.);
          lr += vec3(1., .70, .40) * L.w * f * exp(-lat * lat / (2. * sg * sg)) * (1. - smoothstep(14., 30., dC)) ;
        }
        totalEmissiveRadiance += lr * uLampK * 2.4 * (0.35 + 0.65 * smoothstep(.45, .85, normalize(vWNw).y));
      }`)
  }
  m.customProgramCacheKey = () => 'wetlamp'
  m.needsUpdate = true
}
