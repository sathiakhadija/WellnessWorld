# s12 Shopping street (2026-11-12)
Evidence: `evidence/s12_shopping_street.jpg` (BEFORE p.51 / TARGET p.52 / LOCALHOST blue hour, headless). Pose ≈ (-62, -85.2, 93.5) yaw 1.5708 (looking −x along the lane). Not claimed approved; not M2-verified.
- Now uses Blender-baked sett/slab/brick/ashlar sets (cobbles show setts with joints and relief).
- Present: string lights, awnings, café tables, planters, A-frame boards, facades with lit windows.
- Wisteria curtains now drape above the first-floor balconies on ~55% of shop buildings (raised so shop signs stay readable, per s10 target; strands still plank-like).
- Gaps vs p.52: shopfront interiors shallow, no Blender master yet, trees at the lane end sparse, no bloom on lamps.

UPDATE: Blender planting kit (lavender/hydrangea/shrub) now sits at the foot of both lane facades every ~1 m alternating; pavements remain clear (evidence/s12_game_planting.png). Headless blue hour; not M2-verified; triangle cost not re-measured.
UPDATE: shop interiors tint amber-gold at dusk (blue-green channels pulled down with window-glow factor) to move closer to p.52's warm windows (evidence/s12_game_amber.png). Still open vs p.52: overhead leafy canopy framing the lane, richer window-display merchandise, wet reflective cobbles, chalkboard menus, lane-end trees. Headless only.

UPDATE (2026-11-13): audit of the code shows the sett/slab/road/gravel materials already take the rain wet shader (darker, glossier, puddles; src/weather/wet.js via Street.jsx), so wet cobbles in s12 are covered when weather is raining. Shop interiors (incl. s13/s14) share the `shopin` material, whose tint follows the window-glow factor, so they do change with time of day (colour only; brightness is a single global factor, not per-shop). Still open: an overhead leaf canopy for the lane, and visual confirmation of wet cobbles at M2 quality (headless only so far). Not approved.
