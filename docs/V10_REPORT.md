# Wellness World — V10 report

Scope kept: open-plan interior, bedroom, bathroom, accessible balcony, main entrance. No new rooms, no furniture, cherry tree + planter kept, character creator untouched.

## Implemented
- **Thames (front, −z)** – new water shader: five travelling sine waves → normal, Fresnel reflection of the same sky palette, an elongated sun glitter path, wave-broken streaks from the lit far bank, wave detail faded with distance (no shimmer). River now ends at the far quay; the background city stands on land, not in the river.
- **Boats** – `src/Boats.jsx`: Thames-Clipper-style catamaran and a sightseeing cruiser (extruded pointed hulls, cabins, lit window bands, wheelhouse, railings, masts, running lights, foam wake, soft light path, gentle bob). Four boats, slow (3–5 m/s).
- **Middle ground** – `src/Waterfront.jsx` + `skylineData.js`: quay wall, promenade, tree rows, 11 passenger piers with lit pontoons, lamps; low-rise buildings in clusters with plazas between, low warm front row + taller glass row behind.
- **Landmarks** – One Canada Square (pale steel, few lit floors), blue Citi tower, mauve HSBC glass etc. via per-tower facade variants; atmospheric perspective from fog (100–560).
- **Rear neighbourhood (+z, no river)** – `src/Neighbourhood.jsx` rewritten: 3 street-grid sectors at different angles, Victorian terraces (individual houses, bays, chimneys, slate), mansion blocks, contemporary white-render apartments, two churches, tree-lined streets, a landscaped green square (lawn, paths, pond, bandstand, trees) behind the tower, plaza + riverside promenade. LOD by distance.
- **Balcony** – rebuilt in code as an L-shaped deck flush with the herringbone (y = 0, no ramp, only the slim black door track as threshold), pale limestone tiles (0.6 m), slim black aluminium balustrade with continuous glass, minimal posts, LED strip, two soft lights; colliders on all four open edges. Tree base moved to y = 0.
- **Bathroom doorway** – root cause of the "central vertical obstruction": the 1.3 m double leaf swung ~100° and its open leaf was seen end-on in the opening. Replaced with a single 1.1 m cream raised-panel door hinged on the partition side, opens 105°, passage clear. Bedroom (double leaf) re-inspected: leaves open 105°, no obstruction in the opening.
- **Frames** – all exterior frames (panoramic, slider, bedroom window, balcony metalwork) graded to matte black aluminium (`WW_Frame_Bronze_GAME` set near-black, rough 0.92, no metal/env).
- **Lighting/grading audit** – sun colour/intensity softened, hemisphere fill made neutral-warm (was orange), env 0.32, ceiling albedo less orange, fog retuned. Neutral tone mapping, sRGB output, exposure 1.0 unchanged. No extra bloom/saturation.
- **Main entrance** (front wall, x 0.55–1.85) – recessed 0.33 m, espresso two-raised-panel door, dark stepped architrave, vertical brass pull + thumb latch, peephole, three brass hinges, ivory panelled strips each side with tall glowing tube sconces (modelled on the reference image). "🚪 Go Outside" pill fades in within 2.3 m, fades out when away, uses Enter; door swings open onto a warm light, fades to a placeholder card (`src/destinations.js`), Enter returns. Player frozen during the sequence. No exterior environment was built.
- **Ambient life** – river waves, slow boats, cloud drift (sky shader), 40 occasional cherry petals, windows that switch on gradually over ~4 minutes (`LIT` uniform patched into the facade/house materials).
- **Clean view (V)** – hides character, cat, HUD; switches to the orbit/inspect camera (trackpad orbit/zoom as before); V or Esc returns to the previous mode.

## Tested (headless Chromium + SwiftShader, Playwright)
- `tests/doors_slider.cjs` 15/15 (closed doors block, Enter opens, walk through bedroom/bathroom/balcony, flush deck y≈0, close refused with player in doorway).
- `tests/v10.cjs` 14/14 (Go Outside prompt visible/hidden, entrance blocks, overlay + freeze + return, all four balcony edges hold at deck height, clean view on/off).
- `tests/camera_collision.cjs`, `tests/camera_wheel.cjs` pass. Production build OK. Screenshots in `docs/screens_v10/`.

## Not tested / approximate
- **Real-GPU performance and Safari/MacBook trackpad were NOT tested** (software renderer only, <5 fps). The new neighbourhood is a few hundred thousand vertices in 3 merged meshes + ~10k instanced trees; expect fine on a Mac GPU but unmeasured. `?off=hood` disables the whole exterior city.
- Water is stylised (no true planar reflection of boats/buildings; tower reflections are a mirrored copy).
- Skyline towers are boxes with facade textures; Canary Wharf recognisable by layout and One Canada Square's pyramid, not by detailed architecture.
- Neighbourhood buildings are procedural; some modern slabs read heavy and tree crowns are simple blobs.
- Interior walls in shade still lean slightly grey-mauve compared to the reference; frames read warm-brown only where strongly sunlit.
- Entrance door-open frame was not captured as a still (timing at low fps); behaviour is covered by the test.

## Needs further refinement
Facade detail/variation on the towers, tree shapes, boat people/lights, interior wall fill colour, a real lobby behind the entrance (hook: `src/destinations.js`).
