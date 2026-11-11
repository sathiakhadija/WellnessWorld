// Tiny shared state between the player, the doors and the HUD (plain JS, read every frame).
export const world = {
  player: { x: 0, y: 0, z: 0 },   // written by Player every frame
  fastAnim: false,                // test hook: let door animations use the real frame delta (headless runs render at <1 fps)
  doors: {},                      // test hook: door state objects by id ({t, target, force}); setting .force pins a door at that open fraction
  level: 'penthouse',             // 'penthouse' | 'street' : which floor the player is on (interactables, camera bounds and the sun follow this)
  interactables: [],              // { id, label, x, z, range, isOpen(), toggle() -> message | false }
}

// ?off=tree,hood,plan switches parts of the scene off (profiling / fast headless tests)
const Q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
export const OFF = new Set((Q.get('off') || '').split(',').filter(Boolean))

// Anything that must keep doors from closing on it (player + companion).
world.companion = { x: 1e9, z: 1e9 }
export const occupied = (x0, x1, z0, z1) => {
  const p = world.player, c = world.companion
  return (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) || (c.x > x0 && c.x < x1 && c.z > z0 && c.z < z1)
}
