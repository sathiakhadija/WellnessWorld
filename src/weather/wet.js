// Wet-surface look for ground materials: darker, glossier, with noise-driven puddles that pick up the sky reflection (the scene's IBL).
// Patches any MeshStandardMaterial once; one shared uniform (WX.wet) drives every patched material, so ground, paving and balcony deck dry/wet together.
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
