# Architectural stabilisation report

## 1. Root cause of the door defects
The "central vertical obstruction" in the bedroom and bathroom doorways was **outdated Blender geometry that was never removed**. The V8 GLB's left wall contains door linings in a separate mesh (material `WW_Trim_Satin_GAME`, loaded as `WW_Walls_2`: three old door frames at z ≈ -5.8, -7.8, -9.8). V9/V10 removed the old wall by a **mesh-name list** (`WW_Walls`, `WW_Walls_1`, ...). GLTFLoader numbers split primitives differently from the Blender export, so the list matched the plaster mesh but not the linings. Result: thin vertical strips (z -6.36 / -10.15, i.e. just off the door centres) and lintel strips stood *inside* the new, wider procedural openings, and the old skirting (`WW_Trim_Mouldings_2`) ran across both doorway floors. They overlapped the new door leaves, frames and architraves — the "duplicate objects from Blender and R3F". Not transparency/depth/collision/pivot issues: collision meshes and pivots were correct (verified by walking through).

The entrance's "nested frames" were **our own procedural stacking** (V10): pale reveal lining + broad dark casing + inner bead + plinth blocks. The old GLB front wall was already removed (0 triangles in the entrance volume).

## 2. Files modified
`src/PenthouseScene.jsx` (material-based removal of old wall/linings/skirting/front wall), `src/Plan.jsx` (entrance frame/threshold, door/entrance test pin hooks), `src/skylineData.js` (building seating), `src/Neighbourhood.jsx` (one-line guard), `src/CameraRig.jsx` (test hooks; fixed shadowed `world`), `src/world.js`; new `tests/stabilisation.cjs`, `docs/screens_stab/`.

## 3. Corrections
- **Single authoritative source:** every GLB triangle of the old left wall (plaster, Trim_Satin linings/panels, skirting; x ≤ -4.38) and old front wall is dropped by *material*, not name. `Plan.jsx` is the only source for the left wall, door openings, linings, skirting and the front wall. Left-wall sconces (Brass/SconceGlow) are kept.
- **Bathroom:** one 1.1 m leaf, hinged on the partition side. **Bedroom:** two 0.75 m leaves, both hinged at the jambs, opening 105° away from the centre. Verified by scanning every mesh triangle against the clear opening: 0 hits, open leaves lie outside the opening.
- **Entrance:** one espresso lining wrapping the reveal + one slim flat casing (no bead, no plinths, no cap); one walnut leaf (1.22 m, hinged at x 0.585, swings outward), two raised panels, brass pull/hinges/peephole, flush stone threshold with a brass strip. Go Outside interaction unchanged.
- **Floating buildings:** (a) background towers at side azimuths (|az| > ~42°) had z between the near embankment and far quay, i.e. **inside the river** (77 buildings). Re-seated on the far-bank land at the same x. (b) Far-bank low-rise footprints overhung the promenade/quay edge: now kept behind it. (c) Near-bank blocks (rotated cells) can no longer overhang the promenade. Audit: 0 buildings in the river band. Skyline/neighbourhood composition otherwise untouched.
- Also fixed: the `__ww.fastAnim` test hook was writing to Rapier's `world` (shadowed import), not ours.

## 4. Tests
`doors_slider` 15/15, `v10` 14/14, `stabilisation` 11/11 (opening clear, passage open/closed, entrance frame + pinned-open leaf), `camera_collision` pass. Production build OK. Screenshots (closed / half / open for entrance, bedroom, bathroom; river sides; skyline) in `docs/screens_stab/`.

## 5. Limitations
Headless (software) rendering only; Safari/GPU performance untested. The entrance's dark casing reads lilac in shade and brown in sun (lighting, same material). The far-bank quay lamps form a bright line at extreme distance. The tower shaft top below the balcony is a plain slab.

## 6. Deferred
The rear-neighbourhood redesign, polish and landscaping were **deferred**; no residential buildings, roads, parks or landscaping were added or changed.
