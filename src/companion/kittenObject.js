import * as THREE from 'three'
import { buildKitten } from './buildKitten.js'
import { KITTEN_APPEARANCE } from './kittenAppearance.js'

const SHELLS = 6
// Fur shell material: the base skinned mesh is pushed out along its normal per layer; strands are carved from a 3D cell hash so no
// texture is needed (cheap: 6 extra skinned draws on ~7.5k vertices, opaque alpha-test, no transparency sorting).
function furMaterial(t, A) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.FrontSide })
  m.userData.shell = t
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = { value: t }; sh.uniforms.uLen = { value: A.furLength }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float furLen;\nuniform float uT;\nuniform float uLen;\nvarying vec3 vFurP;\nvarying float vFurT;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n transformed += normalize(objectNormal) * uLen * uT * furLen;\n vFurP = position; vFurT = uT;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFurP;\nvarying float vFurT;\nfloat h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 q = vFurP * 820.0; vec3 id = floor(q); vec3 f = fract(q) - 0.5;
        float rr = h3(id);
        if (rr < vFurT * 0.72 || length(f.xy) + abs(f.z) * 0.4 > 0.62 * (1.0 - vFurT * 0.75) + 0.05) discard;
        diffuseColor.rgb *= mix(0.74, 1.10, vFurT);`)
  }
  m.customProgramCacheKey = () => 'fur'
  return m
}

export function createKittenObject(A = KITTEN_APPEARANCE) {
  const built = buildKitten(A)
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, ...o })
  const mats = {
    fur: std({ roughness: 0.95, metalness: 0 }),
    eye: std({ roughness: 0.1 }), dark: std({ roughness: 0.6 }), whisk: std({ roughness: 0.5 }),
    collar: std({ roughness: 0.55 }), gold: std({ roughness: 0.28, metalness: 0.95 }), inner: std({ roughness: 0.8 }),
  }
  const group = new THREE.Group(); group.name = 'Kitten'
  group.add(built.rig.root)
  const meshes = {}
  for (const k in built.geos) {
    const m = new THREE.SkinnedMesh(built.geos[k], mats[k]); m.name = 'Kit_' + k; m.frustumCulled = false
    m.castShadow = k === 'fur'; m.receiveShadow = k === 'fur'
    m.bind(built.rig.skeleton); group.add(m); meshes[k] = m
  }
  const shells = []
  for (let i = 1; i <= SHELLS; i++) {
    const t = i / SHELLS
    const s = new THREE.SkinnedMesh(built.geos.fur, furMaterial(t, A)); s.name = 'Kit_shell' + i; s.frustumCulled = false
    s.bind(built.rig.skeleton); group.add(s); shells.push(s)
  }
  return { group, meshes, shells, mats, ...built }
}
