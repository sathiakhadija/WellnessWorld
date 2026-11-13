// Generic rigged-GLB player character: loads a GLB, normalises it to `height` metres (feet on y=0), builds an AnimationMixer, maps the file's clips to
// the shared state set (idle/walk/run/jump/sit/sleep/wave/cheer/emotes) through CLIP_ALIASES + CLIP_FALLBACK and crossfades between states.
// Missing GLB, load error or no clips -> safe fallback (the rabbit player) so the game never ends up without a visible player.
import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { byId, ONE_SHOT } from './registry.js'
import { CharacterStateMachine, resolveClip } from './animStates.js'
import { world } from '../world.js'

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e) { console.warn('[characters] load failed, using fallback:', e?.message || e) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function Rig({ def, speedRef }) {
  const { scene, animations } = useGLTF(def.url)
  const rig = useMemo(() => {
    const root = scene.clone(true)                                    // SkeletonUtils-free clone is fine for a single player instance
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false } })
    const box = new THREE.Box3().setFromObject(root), k = (def.height || 1.1) / Math.max(0.001, box.max.y - box.min.y), c = box.getCenter(new THREE.Vector3())
    root.position.set(-c.x, -box.min.y, -c.z)
    const inner = new THREE.Group(); inner.add(root); inner.scale.setScalar(k)
    const outer = new THREE.Group(); outer.add(inner); outer.rotation.y = def.faceFix || 0
    const mixer = new THREE.AnimationMixer(root), names = animations.map((a) => a.name)
    const actions = {}
    for (const a of animations) actions[a.name] = mixer.clipAction(a)
    return { outer, mixer, actions, names }
  }, [scene, animations, def])
  const sm = useRef(new CharacterStateMachine()), cur = useRef({ state: null, action: null }), done = useRef(false)
  useEffect(() => {
    const onDone = (e) => { if (e.action === cur.current.action) done.current = true }
    rig.mixer.addEventListener('finished', onDone)
    world.charAction = (name) => (name ? sm.current.trigger(name) : sm.current.release())   // dev/API hook: window.__ww.charAction('wave')
    world.charClips = rig.names
    return () => { rig.mixer.removeEventListener('finished', onDone); world.charAction = null }
  }, [rig])
  useFrame((_, dt) => {
    const want = sm.current.next({ speed: speedRef?.current ?? 0, airborne: false }, done.current); done.current = false
    const { clip, state } = resolveClip(rig.names, want, def.clips)
    if (clip && state !== cur.current.state) {
      const next = rig.actions[clip], prev = cur.current.action
      next.reset(); next.setLoop(ONE_SHOT.has(state) ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); next.clampWhenFinished = ONE_SHOT.has(state)
      if (state === 'walk' || state === 'run') next.timeScale = 0.9 + Math.min(1, (speedRef?.current ?? 0) / 5) * 0.5
      next.play(); if (prev && prev !== next) prev.crossFadeTo(next, 0.2, false)
      cur.current = { state, action: next }
    }
    rig.mixer.update(Math.min(dt, 0.05))
  })
  return <primitive object={rig.outer} />
}

export function GltfPlayer({ id, speedRef, fallback }) {
  const def = byId(id)
  if (!def || def.kind !== 'gltf') return fallback
  return <Boundary fallback={fallback}><Suspense fallback={null}><Rig def={def} speedRef={speedRef} /></Suspense></Boundary>
}
