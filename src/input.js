// Browser input layer for Wellness World. Plain JS singleton (no React) so it can be read every frame.
// Written with Safari/macOS trackpads in mind:
//   * wheel listener is NATIVE and non-passive (React's onWheel is passive, so preventDefault would be ignored)
//   * Safari delivers pinch as proprietary gesturestart/gesturechange events (Chrome/Firefox send ctrl+wheel)
//   * Ctrl+click on a Mac is a right-click -> treated as "pan" and the context menu is suppressed
//   * keyboard uses KeyboardEvent.code, arrow keys / space are prevented from scrolling the page
//   * Safari does not send keyup for other keys while Cmd is held -> keys are cleared when Meta is released
//   * horizontal two-finger swipes are cancelled so they cannot trigger "swipe back" navigation

const GUARDED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract',
])

export const input = {
  keys: new Set(),
  // accumulated since last consume(); the camera rig reads and clears these every frame
  orbit: { x: 0, y: 0 },   // pixels dragged (primary button) or scrolled (two-finger trackpad scroll in "orbit" scroll mode)
  pan: { x: 0, y: 0 },     // pixels dragged with right button / ctrl / shift / middle
  zoom: 0,                 // positive = zoom out. Mouse-wheel notches, pinch, +/- keys are folded into this
  scrollMode: 'orbit',     // what a trackpad two-finger scroll does: 'orbit' | 'zoom'
  invertScroll: false,
  dragging: null,          // null | 'orbit' | 'pan'
  hotkeys: {},             // code -> fn, set by the app
  el: null,
  _off: [],
  _lastWheel: -1e9,
  _mouseUntil: 0,

  consume() {
    const o = { ox: this.orbit.x, oy: this.orbit.y, px: this.pan.x, py: this.pan.y, zoom: this.zoom }
    this.orbit.x = this.orbit.y = this.pan.x = this.pan.y = 0
    this.zoom = 0
    return o
  },
  down(code) { return this.keys.has(code) },

  attach(el) {
    if (this.el === el) return
    this.detach()
    this.el = el
    const on = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts)
      this._off.push(() => target.removeEventListener(type, fn, opts))
    }
    el.style.touchAction = 'none'          // stop the browser from claiming touch / trackpad pan
    el.style.cursor = 'grab'
    el.style.outline = 'none'
    el.tabIndex = 0

    // ---- pointer drag (mouse, trackpad click-drag, pen, single touch) ----
    let last = null
    on(el, 'pointerdown', (e) => {
      el.focus({ preventScroll: true })
      const pan = e.button === 2 || e.button === 1 || e.ctrlKey || e.shiftKey
      this.dragging = pan ? 'pan' : 'orbit'
      last = { x: e.clientX, y: e.clientY }
      try { el.setPointerCapture(e.pointerId) } catch (_) { /* older Safari: ignore */ }
      el.style.cursor = 'grabbing'
      e.preventDefault()
    })
    on(el, 'pointermove', (e) => {
      if (!this.dragging || !last) return
      const dx = e.clientX - last.x, dy = e.clientY - last.y
      last = { x: e.clientX, y: e.clientY }
      const t = this.dragging === 'pan' ? this.pan : this.orbit
      t.x += dx; t.y += dy
    })
    const endDrag = (e) => {
      this.dragging = null; last = null; el.style.cursor = 'grab'
      try { el.releasePointerCapture(e.pointerId) } catch (_) { /* ignore */ }
    }
    on(el, 'pointerup', endDrag)
    on(el, 'pointercancel', endDrag)
    on(el, 'contextmenu', (e) => e.preventDefault())

    // ---- wheel: mouse wheel, trackpad two-finger scroll, Chrome/Firefox pinch (ctrl+wheel) ----
    on(el, 'wheel', (e) => {
      e.preventDefault()                    // works only because this listener is non-passive
      const px = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      const dx = e.deltaX * px, dy = e.deltaY * px
      if (e.ctrlKey) {                      // pinch on Chrome/Firefox (and ctrl+scroll)
        this.zoom += Math.max(-60, Math.min(60, dy)) * 0.06
        return
      }
      // Mouse wheel vs trackpad. A trackpad two-finger scroll is a STREAM of small deltas (~60 Hz, ramping up/down);
      // a mouse wheel notch is an ISOLATED large step (or line-mode in Firefox). Anything else follows the T toggle.
      const now = e.timeStamp
      const big = Math.abs(dy) >= 50 && dx === 0
      if (big && (now - this._lastWheel > 150 || now < this._mouseUntil)) this._mouseUntil = now + 300
      this._lastWheel = now
      const mouse = e.deltaMode !== 0 || now < this._mouseUntil
      const sign = this.invertScroll ? -1 : 1
      if (mouse || this.scrollMode === 'zoom') {
        this.zoom += Math.max(-120, Math.min(120, dy)) * 0.04 * sign
      } else {                              // trackpad two-finger scroll -> orbit / look (natural scrolling feel)
        this.orbit.x += -dx * sign * 0.8
        this.orbit.y += -dy * sign * 0.8
      }
    }, { passive: false })

    // ---- Safari pinch (WebKit gesture events) ----
    let lastScale = 1
    on(el, 'gesturestart', (e) => { e.preventDefault(); lastScale = 1 })
    on(el, 'gesturechange', (e) => {
      e.preventDefault()
      const s = e.scale || 1
      this.zoom += -Math.log(s / lastScale) * 90   // spread fingers (scale>1) = zoom in
      lastScale = s
    })
    on(el, 'gestureend', (e) => e.preventDefault())

    // ---- keyboard ----
    on(window, 'keydown', (e) => {
      if (e.metaKey || e.altKey) return           // leave Cmd+1 (Safari tabs), Cmd+R etc. alone
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (GUARDED.has(e.code)) e.preventDefault() // arrows/space would scroll the page
      if (!e.repeat) {
        const fn = this.hotkeys[e.code]
        if (fn) { fn(e); }
      }
      this.keys.add(e.code)
    })
    on(window, 'keyup', (e) => {
      this.keys.delete(e.code)
      if (e.code === 'MetaLeft' || e.code === 'MetaRight') this.keys.clear()
    })
    on(window, 'blur', () => { this.keys.clear(); this.dragging = null })
  },

  detach() {
    this._off.forEach((f) => f())
    this._off = []
    this.keys.clear()
    this.el = null
  },
}
