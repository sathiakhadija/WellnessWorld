# Defects register
- D-001 (open, partially tuned: wall and floor darkened, env 0.35) Lift lobby reads brighter/paler than Bible p.17 target (target has darker marble, visible floor reflection, dimmer cove). Lights reduced once; remaining wash comes from golden-hour environment light in the penthouse. Needs Blender/localhost same-angle comparison + tuning.
- D-002 (open) Lift lobby sign "Lift" is faint; floor marble reflection not visible.
- Verified: lobby renders (docs/bible/lobby/t1,t2); entrance door opens; lift call → ride down → street; street lift → return to penthouse, lift doors open then auto-close (fastAnim on; SwiftShader is too slow for real-time timing).
- D-003 (open; floor now veined marble texture) Ground-floor lobby (s06) rebuilt in plan.js to Bible p.22 layout: marble-tone floor, recessed cove ceiling + downlights, timber slats + dark stone pilasters around lift, curved fluted reception counter, barrel chair + side table, rug, tiered ring chandelier, brushed-gold lift leaves. STILL: floor reads lilac under sky light (no true reflective marble, no veining texture), plaster has no texture, lift doors lack seam detail/indicator, trees/planters are old low-poly props, no Blender baked kit. Not approved.
- D-004 (open) Entrance s07: slim bronze glazing + glass + sliding leaves done; no actual proximity-sliding animation (leaves are static, opening is permanently clear for navigation); evening/blue-hour comparison vs p.26 pending; interior floor not reflective.
- D-005 (open) Courtyard s08: circular glow-ring planter added at the centre tree; trees/foliage still low-poly cards, paving procedural (no slab joints bevel), lamps fine; no Blender master; blue-hour check pending. Note: Bible p.26 (s07) target shows a pink blossom tree but s08 text forbids pink-blossom-heavy courtyard — keep green, flag to owner.
- D-006 (open) Interiors (s13/s14): Café Violette + The Quiet Page are now walkable rooms behind their shopfronts (door aisles verified clear by collider scan; doorways are open, no door leaf/interaction yet). Visual quality is greybox-plus: no fabric/wood textures, no Blender-baked furniture, no wisteria-free check beyond palette (no flowers used in the bookshop except none), café lacks pastry detail/menu/espresso machine, no restroom door interaction, floor reads orange under warm lights; interior floors pick up the rainy-wet reflection (applyWet) — should be excluded.
- D-007 (fixed) Rain falling inside shops/lobby: street interiors now excluded from rain shader + muffled audio (src/weather/zones.js: café, bookshop, ground lobby).
- D-008 (partly fixed) Penthouse glazing frames were matte black; now muted champagne bronze (WW_BRONZE_CHAMPAGNE, PenthouseScene GRADE + Plan.jsx sliding frame). Frames remain structurally chunky in the GLB (nearest-pier depth) — slimming needs the GLB/Blender source. Balcony pink cherry tree still present (not in approved AFTER) — flag for owner.

- D-006 (partial): interior limewash wall texture + woven fabric upholstery material added (café, bookshop). Still open: door leaf/interaction, wet-floor reflections on interior floors.

## Update 2026-11-12
- D-005 (courtyard trees): re-inspected (docs/bible/evidence/tree_b.png) — branching trunk, layered canopy, readable at courtyard distance; treated as acceptable pending M2 review (headless only).
- D-006: interior floors use `parquet`/`marble` materials, which are NOT in the wet-reflection list (plan: only slab/sett/road/gravel are wetted) — wet-floor-in-interiors item closed. Open: no door leaf at café/bookshop (open archway by design).
- s10: white hydrangea planters added beside topiary at every shopfront; s12 lane (docs/bible/evidence/s12_blue.png) matches p.52 composition (cobbles, string lights, wisteria, café tables). Not claimed visually approved — owner review required; no Blender renders for these sets.
- D-001: lift-lobby plaster desaturated/darkened toward p.17 taupe-blush (lift_door_v2.png). Still golden-hour pink-dominated; cove/console/Lift sign detail open.
- BLENDER evidence: assets/blender/render_cafe_kit.py → evidence/blender_cafe_kit.png (Cycles render of baked café kit; exposure high, kit only — not a scene match). Capsule 1.54 m vs 1.1 m rabbit: owner decision.
- D-008: mullions slimmed at load (24-vertex pier boxes scaled to 55–68% section, evidence/s01_glazing_slim.png). Remaining: balcony pink cherry tree not in approved AFTER (owner decision).
- s03 (wall-side interior): removed raised-panel mouldings, fluted pilaster, ornate cornice, flanking panels and raised door-leaf panels (Plan.jsx) per audit items 01–03; flush doors. Still open: door casings (Blender arch_* kit) are heavier than the target, cove strip along the left wall, framed marble artwork, PBR variation on plaster.
- s03: cove strip + framed artwork + picture light added (evidence/s03_door_wall.png). Door casings slimmed to flat 7 cm architrave (Blender rebake).
- s02: cherry tree moved to the west corner (Tree.jsx TREE_POS) so the reference balcony sightline shows skyline/river/boat like p.6; tree remains as a user feature (owner may remove). Towers still lower/less dense than target.
- s15: landward plane-tree row added (evidence/s15_c.png); brick/ivy wall with lit windows, burgundy umbrellas near centre, light pools still weaker than p.66.
- s13: hydrangea posies + wisteria added; s14 sheet refreshed with Blender-furniture shot. Still missing vs p.56/60: bookshelf reading nook in café, glass-tube chandelier, globe, arch passage detail.
- s14: glass-tube chandelier drops + floor globe added (evidence/s14_chand.png).

## Owner decisions 2026-11-12
- Balcony cherry tree + petals: REMOVE → done (PenthouseScene no longer renders them; src/Tree.jsx kept unused). Approved balcony AFTER is unfurnished.
- Street layout 216×278 m: APPROVED by owner.
- Collision capsule 1.54 m vs 1.1 m rabbit: OK as is.
- Push: NOT until everything is checklisted.

## Update 2026-11-12 (s05 lift lobby, headless)
- D-001 partial: taupe-blush flanking panels with slim mouldings + tall vertical tube sconces with brass caps added on the penthouse-side entrance wall (p.17). Evidence: `evidence/s05_lift_doorway_golden.png`.
- Still open: golden-hour sun blows out the cream door leaf and 0.4 m jambs so the doorway still reads paler than p.17; marble floor reflection faint; Lift pictogram sign small. Not claimed approved.

## s05 update (2026-11-12, later): flanking taupe-blush panels darkened (#a58e88 -> #85706a) so they read against the cream mouldings under golden hour (evidence/s05_doorway_golden_v2.png). D-001/D-002 still open: golden-hour sun still washes the door leaf/jambs and plaster pink; floor reflection faint; Lift sign small. Headless only.

## D-008 (fixed 2026-11-12): player fell through the lift-lobby floor
Reported by owner on localhost: the rabbit falls before reaching the lift. Cause: Lobby.jsx had wall colliders but no floor collider (the visual marble plane was render-only). Reproduced headless by walking (ArrowUp) through the open entrance door: y dropped to -1.24 at z≈1.3. Fix: floor CuboidCollider under the lobby. Re-test: walk from the penthouse door to the lift door stays at y=0 and stops at z=2.48. Earlier "ride round-trip" tests used teleports, so they missed this — walking tests added to the checklist.

## D-009 (fixed 2026-11-12): rain animation shimmer / popping
Cause 1: drop positions were `vel * uTime`, so every time rain intensity or wind eased (6–8 s builds) all drops were teleported by Δvel·t. Cause 2: drops wrapped at the edge of the 34 m follow-box while still visible (fade used camera distance only), so they popped. Fix (src/weather/Rain.jsx): CPU-integrated fall/drift phases (uFall, uDrift) so velocity changes only change speed, and an edge fade toward the box boundary. Verified headless (renders, no page errors); real smoothness needs the owner's eyes on M2/Safari.

## D-010 (addressed 2026-11-12, owner to judge): oversized empty great lawn (rule 05)
Overhead audit showed ~100 x 85 m of bare lawn between the riverside piazza and the house. Added: axial walk, cross walk, a small fountain plaza (Blender fountain at 0.55 scale) with 4 lamps + 4 benches, planted borders (Blender kit), meadow tufts, corner trees (evidence/garden_overview_bluehour.png, garden_axis_bluehour.png). Not in the Bible images — owner should confirm this layout/palette is acceptable (rule 14: major changes need review).
