// Task 001 — the "starter" penthouse entrance door: one matte-black leaf with fine vertical fluting and a slim brushed-gold pull.
//
// A door STYLE is a plain object { id, w, h, thickness, hingeSide, build(style) -> { leaf, gold } }.
// Plan.jsx <Entrance/> owns the anchor (hinge position, swing direction, interaction, collision) and only asks the style for geometry,
// so a future door (panelled, arched, ...) can be a second style object with its own width/height/handle placement. No other style exists yet.
//
// Leaf local frame: the hinge axis is the origin's y-axis, the leaf extends along +z for `w`, thickness is along x (±thickness/2),
// +x is the room face, -x the lobby face. Both faces carry the same fluting.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const box = (sx, sy, sz, x, y, z) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return g }

// One fluted face: columns across the leaf width, flat in height (so it is a cheap strip grid). Each flute has a narrow rounded groove.
function flutedFace(w, h, t, inset, depth, flutes, side) {
  const per = 10, cols = flutes * per, z0 = inset, z1 = w - inset
  const pos = [], idx = []
  for (let i = 0; i <= cols; i++) {
    const z = z0 + (z1 - z0) * (i / cols)
    const u = (i % per) / per                                          // 0..1 across one flute
    const g = Math.exp(-Math.pow((u - 0.5) / 0.2, 2))                 // narrow groove, rounded
    const x = side * (t / 2 - depth * g)
    pos.push(x, inset, z, x, h - inset, z)
  }
  for (let i = 0; i < cols; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3
    if (side > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  g.deleteAttribute('uv'); return g
}

export const starterDoor = {
  id: 'starter-fluted-black',
  w: 1.2, h: 3.04, thickness: 0.05,
  hingeSide: 'west',                                  // handle edge is the far (east) edge as seen from the entrance wall
  build({ w, h, thickness: t }) {
    const rim = 0.016, depth = 0.011, flutes = Math.round(w / 0.05)
    const leaf = []
    leaf.push(box(t - 2 * depth - 0.002, h - 2 * rim, w - 2 * rim, 0, h / 2, w / 2))                 // core behind the grooves
    leaf.push(box(t, rim, w, 0, rim / 2, w / 2), box(t, rim, w, 0, h - rim / 2, w / 2))                // top / bottom rails
    leaf.push(box(t, h, rim, 0, h / 2, rim / 2), box(t, h, rim, 0, h / 2, w - rim / 2))               // hinge / latch stiles
    leaf.push(flutedFace(w, h, t, rim, depth, flutes, 1), flutedFace(w, h, t, rim, depth, flutes, -1))
    const gold = []
    const hz = w - 0.09, y = 1.1, bar = 0.78, r = 0.011, off = 0.055
    for (const s of [1, -1]) {
      const b = new THREE.CylinderGeometry(r, r, bar, 14); b.translate(s * (t / 2 + off), y, hz); gold.push(b)             // slim vertical pull
      for (const dy of [-bar / 2 + 0.07, bar / 2 - 0.07]) {
        const p = new THREE.CylinderGeometry(0.007, 0.007, off, 10); p.rotateZ(Math.PI / 2); p.translate(s * (t / 2 + off / 2), y + dy, hz); gold.push(p)   // standoffs
      }
    }
    const flat = (list) => mergeGeometries(list.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n }))
    return { leaf: flat(leaf), gold: flat(gold) }
  },
}
