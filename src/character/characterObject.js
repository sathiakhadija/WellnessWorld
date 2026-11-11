import * as THREE from 'three'
import { buildCharacter } from './buildCharacter.js'
import { PLAYER_APPEARANCE } from './appearance.js'

function skinMaterial(c) {
  const m = new THREE.MeshStandardMaterial({ color: c, vertexColors: true, roughness: 0.58, metalness: 0 })
  m.onBeforeCompile = (sh) => {                 // cheap warm subsurface rim so skin does not read as plastic
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
      `float fr = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
       outgoingLight += vec3(0.55, 0.20, 0.10) * fr * 0.10;
       #include <opaque_fragment>`)
  }
  return m
}

/** Pure-three object (no React): group with skinned meshes + rig. Reusable by the studio, tests and the game. */
export function createCharacterObject(A = PLAYER_APPEARANCE) {
  const built = buildCharacter(A)
  const mats = {
    skin: skinMaterial('#ffffff'),
    eye: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0 }),
    hair: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.0, side: THREE.DoubleSide }),
    top: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: THREE.DoubleSide }),
    denim: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, side: THREE.DoubleSide }),
    shoe: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 }),
    gold: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.95 }),
  }
  const group = new THREE.Group(); group.name = 'PlayerCharacter'
  group.add(built.rig.root)
  const meshes = {}
  for (const k in built.geos) {
    const m = new THREE.SkinnedMesh(built.geos[k], mats[k])
    m.name = 'Char_' + k; m.frustumCulled = false
    m.castShadow = k !== 'eye' && k !== 'gold'; m.receiveShadow = k !== 'gold'
    m.bind(built.rig.skeleton)
    group.add(m); meshes[k] = m
  }
  return { group, meshes, mats, ...built }
}
