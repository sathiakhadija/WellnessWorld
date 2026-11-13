// Fountain water (audit #09/#10): instead of five pale floating cylinders, GPU droplet arcs fall from the top tier into the bowl and basin, a thin central
// spout rises and falls, and ripple rings spread across the basin. Everything animates continuously from one time uniform (no per-frame JS per droplet).
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WX } from '../weather/weather.js'

const vert = /* glsl */`
attribute vec4 aSeed;            // x: phase, y: azimuth, z: reach, w: tier (0 top spout, 1 upper bowl, 2 lower basin)
uniform float uTime; uniform vec3 uC; uniform float uSize;
varying float vA;
void main() {
  float T = 1.35 + aSeed.w * 0.22, t = fract(uTime / T + aSeed.x);
  float reach = aSeed.z * t, h0 = aSeed.w < 0.5 ? 0.0 : aSeed.w < 1.5 ? -0.28 : -0.92;
  float up = aSeed.w < 0.5 ? 1.15 : 0.55;
  float y = h0 + up * (4.0 * t * (1.0 - t)) * (aSeed.w < 0.5 ? 1.0 : 0.6) - (aSeed.w > 0.5 ? 0.35 * t * t : 0.0);
  vec3 p = uC + vec3(cos(aSeed.y) * reach, y, sin(aSeed.y) * reach);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.55 + 0.45 * sin(3.14159 * t)) / max(0.6, -mv.z * 0.18 + 0.2);
  vA = 0.2 + 0.8 * sin(3.14159 * t);
}`
const frag = /* glsl */`
varying float vA;
void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vec3(0.88, 0.94, 1.0), (1.0 - r) * vA * 0.9); }`
const ringFrag = /* glsl */`
uniform float uTime; uniform float uPh; varying vec2 vUv;
void main() { vec2 q = vUv - 0.5; float r = length(q) * 2.0; float t = fract(uTime * 0.45 + uPh); float R = 0.15 + 0.82 * t; float w = 0.035 + 0.02 * t;
  float a = smoothstep(w, 0.0, abs(r - R)) * (1.0 - t) * 0.55; if (a < 0.01) discard; gl_FragColor = vec4(0.82, 0.9, 1.0, a); }`
const ringVert = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

export function FountainFx({ jets }) {
  const { geo, mat, rings } = useMemo(() => {
    const N = 360, pos = new Float32Array(N * 3), seed = new Float32Array(N * 4)
    for (let i = 0; i < N; i++) {
      const tier = i < 40 ? 0 : i < 190 ? 1 : 2
      seed.set([Math.random(), Math.random() * Math.PI * 2, tier === 0 ? 0.06 * Math.random() : tier === 1 ? 0.45 + 0.35 * Math.random() : 0.7 + 0.45 * Math.random(), tier], i * 4)
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4))
    const m = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uC: { value: new THREE.Vector3() }, uSize: { value: 11 } } })
    const rs = [0, 0.33, 0.66].map((ph) => new THREE.ShaderMaterial({ vertexShader: ringVert, fragmentShader: ringFrag, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uPh: { value: ph } } }))
    return { geo: g, mat: m, rings: rs }
  }, [])
  useFrame(({ clock }) => { const t = clock.elapsedTime; mat.uniforms.uTime.value = t; mat.uniforms.uSize.value = 11 * (1 - 0.25 * WX.rain); rings.forEach((r) => (r.uniforms.uTime.value = t)) })
  return (
    <>
      {jets.map((j, i) => (
        <group key={'fx' + i}>
          <points geometry={geo} frustumCulled={false} onBeforeRender={() => { mat.uniforms.uC.value.set(j.x, j.y, j.z); mat.uniformsNeedUpdate = true }}>
            <primitive object={mat} attach="material" />
          </points>
          {rings.map((r, k) => (
            <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[j.x, j.y - 1.22, j.z]} material={r} renderOrder={4}><planeGeometry args={[2.3, 2.3]} /></mesh>
          ))}
        </group>
      ))}
    </>
  )
}
