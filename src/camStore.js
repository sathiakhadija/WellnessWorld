// Tiny external store so the HUD (DOM) and the camera rig (inside the R3F canvas) share state without prop drilling.
import { useSyncExternalStore } from 'react'

let snap = {
  mode: 'follow',        // 'follow' | 'free' | 'sims'
  collide: true,         // camera collision on/off
  scrollMode: 'orbit',   // trackpad two-finger scroll: 'orbit' | 'zoom'
  invertScroll: false,
  help: true,
  toast: '',
  prompt: '',          // contextual interaction hint ("Enter - open the bedroom door")
}
const subs = new Set()

export const camStore = {
  get: () => snap,
  set(patch) { snap = { ...snap, ...patch }; subs.forEach((f) => f()) },
  subscribe(f) { subs.add(f); return () => subs.delete(f) },
}

let toastTimer = 0
export function toast(msg) {
  camStore.set({ toast: msg })
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => camStore.set({ toast: '' }), 1800)
}

export const useCam = () => useSyncExternalStore(camStore.subscribe, camStore.get)
