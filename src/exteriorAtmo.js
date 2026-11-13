import * as THREE from 'three'
// Atmospheric perspective + reflection controls shared by every exterior material (Bible s04, owner corrections 2 and 4).
//  uHazeK   : density per real metre (grows with rain/cloud, set per frame in Skyline)      uInvExt : 1 / current exterior scale (view-space units -> real metres)
//  uRefl    : mirrored-copy reflectivity (time of day / weather)                              uRip    : ripple strength for the mirrored copy (wind / rain chop)
export const ATMO_U = { uHazeCol: { value: new THREE.Color() }, uHazeK: { value: 0.00013 }, uInvExt: { value: 6 }, uRefl: { value: 0.5 }, uRip: { value: 0.01 }, uRipT: { value: 0 }, uWaterY: { value: 0 } }
const HAZE_VS_DECL = 'varying float vHzD; varying float vHzY;\nvoid main() {'
const HAZE_FS_DECL = 'uniform vec3 uHazeCol; uniform float uHazeK, uInvExt, uRefl, uRip, uRipT, uWaterY; varying float vHzD; varying float vHzY;\nvoid main() {'
export function hazeVertex(sh) {
  sh.vertexShader = sh.vertexShader.replace('void main() {', HAZE_VS_DECL)
    .replace('#include <project_vertex>', '#include <project_vertex>\n  vHzD = length(mvPosition.xyz); { vec4 wp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp = instanceMatrix * wp;\n#endif\n vHzY = (modelMatrix * wp).y; }')
}
export function hazeFragment(sh, mirrored) {
  Object.assign(sh.uniforms, ATMO_U)
  sh.fragmentShader = sh.fragmentShader.replace('void main() {', HAZE_FS_DECL)
  const refl = mirrored ? `
    float dep = clamp((uWaterY - vHzY) * uInvExt / 900.0, 0.0, 1.0);          // reflected height above the waterline: tower tops fade out
    gl_FragColor.a *= uRefl * (1.0 - 0.65 * dep);` : ''
  sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeCol, clamp(1.0 - exp(-vHzD * uInvExt * uHazeK), 0.0, 0.75));${refl}`)
}
export function patchHaze(mat, mirrored = false) {
  mat.onBeforeCompile = (sh) => { hazeVertex(sh); hazeFragment(sh, mirrored) }
  return mat
}
