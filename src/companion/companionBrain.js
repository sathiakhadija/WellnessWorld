// Companion following AI (locomotion + behaviour state). Independent from rendering and from the conversational AI.
import { NavGrid } from './navGrid.js'

export const AI_STATES = ['Following', 'Listening', 'Thinking', 'Speaking', 'Happy', 'Curious', 'Resting']
const TAU = Math.PI * 2
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

export class CompanionBrain {
  constructor(grid, opts = {}) {
    this.grid = grid
    this.x = opts.x ?? 0; this.z = opts.z ?? 0; this.yaw = opts.yaw ?? 0
    this.speed = 0; this.vx = 0; this.vz = 0
    this.mode = 'follow'                 // follow | settle | sit | rest | approach | pet
    this.followDist = 1.05; this.radius = 0.09
    this.path = null; this.pi = 0; this.replanT = 0; this.goal = { x: this.x, z: this.z }
    this.idleT = 0; this.pPrev = null; this.pSpeed = 0; this.pHead = { x: 0, z: 1 }
    this.stuckT = 0; this.progT = 0; this.progRef = { x: this.x, z: this.z }
    this.fade = 1; this.fadePhase = 'none'; this.pendingRelocate = null
    this.relocations = 0; this.isVisible = () => true
    this.pinned = null                    // { x, z } while an interaction holds the kitten
    this.stats = { blockedMoves: 0, replans: 0 }
  }
  get moving() { return this.speed > 0.08 }

  /** player: {x,z}; facing: yaw the player is looking along (radians, walk dir). running: bool. */
  update(dt, player, { running = false, facing = 0 } = {}) {
    const g = this.grid
    g.refreshGates()
    // ---- player motion estimate
    if (this.pPrev) {
      const vx = (player.x - this.pPrev.x) / Math.max(dt, 1e-3), vz = (player.z - this.pPrev.z) / Math.max(dt, 1e-3)
      const s = Math.hypot(vx, vz)
      this.pSpeed += (s - this.pSpeed) * (1 - Math.exp(-8 * dt))
      if (s > 0.3) { this.pHead.x += (vx / s - this.pHead.x) * (1 - Math.exp(-5 * dt)); this.pHead.z += (vz / s - this.pHead.z) * (1 - Math.exp(-5 * dt)) }
    }
    this.pPrev = { x: player.x, z: player.z }
    const pMoving = this.pSpeed > 0.35
    this.idleT = pMoving ? 0 : this.idleT + dt
    const dP = Math.hypot(player.x - this.x, player.z - this.z)

    // ---- fade-based discreet relocation (never a visible pop)
    if (this.fadePhase === 'out') { this.fade = Math.max(0, this.fade - dt / 0.25); if (this.fade <= 0) { this.x = this.pendingRelocate.x; this.z = this.pendingRelocate.z; this.speed = 0; this.path = null; this.fadePhase = 'in'; this.relocations++ } }
    else if (this.fadePhase === 'in') { this.fade = Math.min(1, this.fade + dt / 0.35); if (this.fade >= 1) this.fadePhase = 'none' }

    // ---- goal selection
    let goal = null, hold = false
    if (this.mode === 'pet' && this.pinned) { hold = true }
    else if (this.mode === 'approach' && this.pinned) { goal = this.pinned }
    else {
      const hx = this.pHead.x, hz = this.pHead.z
      if (pMoving) {
        // trail behind and slightly to the side so the kitten is visible from the follow camera and never under the feet
        const side = 0.32
        goal = { x: player.x - hx * this.followDist * 1.15 - hz * side, z: player.z - hz * this.followDist * 1.15 + hx * side }
        if (this.mode !== 'follow') this.setMode('follow')
      } else {
        if (dP > 1.7) goal = this.settlePoint(player)                 // came to rest too far away: close the gap
        else if (dP < 0.62) goal = this.settlePoint(player)           // too close: step back out from under the feet
        else hold = true
      }
    }
    if (goal && !g.freeAt(goal.x, goal.z)) {
      const seen = g.flood(this.x, this.z)
      const c = g.closestReachable(seen, goal.x, goal.z)
      if (c) goal = { x: g.cx(c[0]), z: g.cz(c[1]) }
    }
    // reachable only through a closed door? aim at the nearest reachable point (waits at the door)
    if (goal) {
      this.replanT -= dt
      const moved = Math.hypot(goal.x - this.goal.x, goal.z - this.goal.z)
      if (this.replanT <= 0 || moved > 0.45 || !this.path) {
        this.replanT = 0.3; this.goal = goal
        let p = g.path(this.x, this.z, goal.x, goal.z)
        if (!p) { const seen = g.flood(this.x, this.z), c = g.closestReachable(seen, goal.x, goal.z); if (c) p = g.path(this.x, this.z, g.cx(c[0]), g.cz(c[1])) }
        this.path = p; this.pi = 0; this.stats.replans++
      }
    } else if (hold) this.path = null

    // ---- steering
    let target = 0, dest = null
    if (this.path && this.path.length) {
      while (this.pi < this.path.length - 1 && Math.hypot(this.path[this.pi].x - this.x, this.path[this.pi].z - this.z) < 0.14) this.pi++
      dest = this.path[this.pi]
      const dEnd = Math.hypot(this.goal.x - this.x, this.goal.z - this.z)
      const trot = running || this.pSpeed > 1.7 || dEnd > 2.6
      const vmax = trot ? Math.min(3.6, 1.0 + this.pSpeed * 1.15 + dEnd * 0.4) : 1.15
      target = dEnd < 0.12 ? 0 : Math.min(vmax, 0.35 + dEnd * 1.9)
      if (dEnd < 0.2) { target = 0; this.path = null }
    }
    if (this.fadePhase !== 'none') target = 0
    // heading
    let want = this.yaw
    if (dest && target > 0) want = Math.atan2(dest.x - this.x, dest.z - this.z)
    else if (this.mode === 'pet' || this.mode === 'approach' || !this.moving) {
      // idle: look at the player
      if (dP > 0.3 && this.mode !== 'rest') want = Math.atan2(player.x - this.x, player.z - this.z)
      if (this.mode === 'rest') want = this.yaw
    }
    const err = angDiff(want, this.yaw)
    const turn = 5.5 * dt
    this.yaw += Math.max(-turn * (target > 0 ? 1.4 : 1), Math.min(turn * (target > 0 ? 1.4 : 1), err))
    const align = Math.max(0, Math.cos(Math.min(Math.abs(err), 1.6)))
    target *= target > 0 ? Math.max(0.15, align) : 1
    // accelerate (soft), then move with collision
    const acc = target > this.speed ? 6.5 : 9
    this.speed += Math.max(-acc * dt, Math.min(acc * dt, target - this.speed))
    if (this.speed < 0.02 && target === 0) this.speed = 0
    let mvx = Math.sin(this.yaw) * this.speed, mvz = Math.cos(this.yaw) * this.speed
    // keep out from under the player's feet
    if (dP < 0.55 && this.mode !== 'pet') { const k = (0.55 - dP) * 3; mvx += ((this.x - player.x) / Math.max(dP, 0.01)) * k; mvz += ((this.z - player.z) / Math.max(dP, 0.01)) * k }
    this.step(mvx * dt, mvz * dt)
    this.vx = mvx; this.vz = mvz

    // ---- stuck detection / recovery
    this.progT += dt
    if (this.progT >= 1.0) {
      const prog = Math.hypot(this.x - this.progRef.x, this.z - this.progRef.z)
      if (target > 0.3 && prog < 0.12) this.stuckT += this.progT; else this.stuckT = Math.max(0, this.stuckT - this.progT * 2)
      this.progRef = { x: this.x, z: this.z }; this.progT = 0
      if (this.stuckT > 1.2 && this.stuckT < 3.4) { this.replanT = 0; this.path = null; this.goal = { x: 1e9, z: 1e9 } }
    }
    if (this.stuckT > 3.4 || (dP > 9 && this.fadePhase === 'none' && !pMoving && this.mode === 'follow')) this.relocate(player)

    // ---- idle behaviour ladder
    if (hold || (!this.path && !this.moving)) {
      if (this.mode === 'follow' || this.mode === 'settle') this.mode = 'settle'
      if (this.mode === 'settle' && this.idleT > 1.6) this.setMode('sit')
      if ((this.mode === 'sit') && this.idleT > 30) this.setMode('rest')
    }
    if (pMoving && (this.mode === 'sit' || this.mode === 'rest' || this.mode === 'settle')) this.setMode('follow')
  }
  setMode(m) { this.mode = m }
  settlePoint(player) {
    // a spot ~0.95 m from the player on the side the kitten is already on (no walking through the legs)
    let dx = this.x - player.x, dz = this.z - player.z; const d = Math.hypot(dx, dz) || 1
    dx /= d; dz /= d
    const dist = 0.95
    return { x: player.x + dx * dist, z: player.z + dz * dist }
  }
  step(dx, dz) {
    const g = this.grid, r = this.radius
    const ok = (x, z) => g.freeAt(x, z) && g.freeAt(x + r, z) && g.freeAt(x - r, z) && g.freeAt(x, z + r) && g.freeAt(x, z - r)
    if (ok(this.x + dx, this.z + dz)) { this.x += dx; this.z += dz }
    else if (ok(this.x + dx, this.z)) { this.x += dx; this.stats.blockedMoves++ }
    else if (ok(this.x, this.z + dz)) { this.z += dz; this.stats.blockedMoves++ }
    else this.stats.blockedMoves++
    if (!g.freeAt(this.x, this.z)) {                        // pushed into a closing gate: step out
      const c = g.nearestFree(this.x, this.z, 8); if (c) { this.x = g.cx(c[0]); this.z = g.cz(c[1]) }
    }
  }
  /** Fallback when truly stuck: fade out, reappear at a reachable spot near the player that the camera cannot see. */
  relocate(player) {
    if (this.fadePhase !== 'none') return
    const g = this.grid, seen = g.flood(this.x, this.z)
    let best = null, bs = -1e9
    for (let k = 0; k < seen.length; k += 3) {
      if (!seen[k]) continue
      const x = g.cx(k % g.nx), z = g.cz((k / g.nx) | 0), d = Math.hypot(x - player.x, z - player.z)
      if (d < 1.4 || d > 3.2 || g.margin[k]) continue
      const vis = this.isVisible(x, z)
      const s = -d - (vis ? 6 : 0)
      if (s > bs) { bs = s; best = { x, z } }
    }
    if (best) { this.pendingRelocate = best; this.fadePhase = 'out'; this.stuckT = 0 }
  }
}
