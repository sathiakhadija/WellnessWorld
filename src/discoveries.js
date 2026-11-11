// Optional keepsakes: remembered in this browser only; nothing is required and nothing blocks progress.
import { useSyncExternalStore } from 'react'
const KEY = 'ww_discoveries_v1'
let found = new Set()
try { found = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { /* private mode: fine, just not remembered */ }
let snap = { n: found.size, ids: [...found] }
const subs = new Set()
export const discoStore = {
  get: () => snap,
  has: (id) => found.has(id),
  add(id) { if (found.has(id)) return false; found.add(id); snap = { n: found.size, ids: [...found] }; try { localStorage.setItem(KEY, JSON.stringify(snap.ids)) } catch { /* ignore */ } subs.forEach((f) => f()); return true },
  subscribe(f) { subs.add(f); return () => subs.delete(f) },
}
export const useDiscoveries = () => useSyncExternalStore(discoStore.subscribe, discoStore.get)
