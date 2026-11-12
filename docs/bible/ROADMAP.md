# Wellness World — Design Bible V16 implementation roadmap

Source: `WELLNESSWORLDREFINE.pdf` (80 pp, thumbnails in `docs/bible/pages/`). Branch `impl/design-bible-v16`, rollback tag `backup/pre-design-bible-v16`. **No push/merge/deploy without the owner's authorisation.**
Authority order (p.70): approved AFTER images > Section text > this roadmap. Where p.77 says "every scene, every preset, every revision": fixed camera + matching time-of-day, Blender AND localhost, never "claimed from renders alone".
Verification levels used everywhere: Implemented / Tested / Visually verified (with images). Nothing is "done" without a localhost screenshot against the AFTER image.
Hard constraints from the Bible: no flat images for navigable space; no invented new locations; do not use the rejected pink-blossom courtyard (p.31/34) or the rejected flower-filled bookshop (p.60/64); bounded compact world (no endless terrain); all spaces enterable/walkable and connected; rain never inside enclosed spaces; same palette across all areas.

## Environment map (p.71 — to be turned into a measured top-down plan, G1)
Penthouse (panoramic glazing, balcony) → private lift lobby (s05) → lift → ground-floor public lobby (s06) → building entrance (s07) → courtyard (s08) with fountain square (s09) → boutique & café row (s10) / opposite boutique & bookshop row (s11) / shopping street (s12) → Café Violette interior (s13, opposite the bookshop) ↔ The Quiet Page interior (s14) → riverside promenade → Thames (s15). Penthouse skyline (Canary Wharf) must match the exterior city.

## Stage 1 — Audit (p.3-4, 70-72 + 77-79 checklists)
1. Full-resolution read of every page (text pages at 150 dpi for hex values and dimensions), extract: palette table (p.72), tool table (p.75), perf notes (p.76), verification protocol and gates G1–G8 (p.77), handover checklist (p.78), section audit index (p.79-80).
2. `MATRIX.md`: per section — existing condition, target, modelling, materials, lighting, palette, landscaping, interactions, performance, verification (table below is the seed).
3. Repo inspection note: R3F + Vite + three 0.169 + drei + rapier; Plan.jsx (penthouse + street shells), Skyline.jsx, street/ (geo, materials), weather system done (round 10), atmosphere presets (golden/afternoon/…), HUD.
4. Conflict list (see "Open questions") — resolve by Bible precedence, otherwise flag.
5. Reference captures: original BEFORE screenshots at matching cameras (already available for penthouse/street via `__ww.setFree`).

## Stage 2 — Shared foundation (p.72-76)
- `src/palette.js` central palette (warm cream limestone, red/brown London brick, charcoal ironwork, sage/forest foliage, lavender accent, burgundy/oxblood, antique brass (not yellow), walnut/dark oak, warm lamp 2700–3200 K, blue-hour fill) + Blender mirror JSON; sampled-from-reference swatch check per area (hue/sat/contrast/shadow colour).
- Material library (Blender script `assets/blender/mat_lib.py` → procedural PBR → baked textures; names STONE_*, BRICK_*, TIMBER_*, METAL_*, GLASS_*, FOLIAGE_*, PAVING_*, FABRIC_*, WATER_) + game material mapping.
- Colour management: Blender AgX vs three.js ACES/AgX — calibrate exposure/contrast so same swatch renders to comparable colours; document.
- Lighting standard: one rig per time-of-day preset (golden hour, blue hour, daylight, night), warm practicals, cove lights, soft shadows/contact shadows, AO.
- Scale/coordinate convention: metres, +y up, one world origin, door heights 2.1–2.4 m, compact bounds; collision radius/height for the rabbit (currently 1.1 m model, 1.54 m capsule → fix).
- Reusable kit: bevelled architraves, door sets, window sash/mullion kits, cornice, kerb, bollard, lantern, bench, planter, lamp post, awnings, shop signs (fix sign spelling per p.42/49), trim-sheet.
- Tooling: `@gltf-transform/cli` + validator via npm; export pipeline `assets/blender/*.py → assets/glb → public/models`; texture compression/budgets.
- Asset & licence register `docs/bible/ASSETS.md` (all generated in-house unless attached by owner; Poly Haven/ambientCG unreachable from here).

## Stage 3 — Benchmark environment
Pick the Private Lift Lobby (s05, p.16-20): small, reuses shared kit, tests blush plaster, brass, dark stone, cove light, and links to the finished penthouse. Deliver: greybox → camera-matched BEFORE → Blender render → in-game build → localhost shot beside p.17/18 target → fix until it matches. This sets the quality bar.

## Stage 4 — Environments (order = dependency order)
| # | Section | Pages | Now | Target / work |
|---|---|---|---|---|
| 1 | Penthouse glazing | 1-4 | done in earlier rounds; re-audit vs p.2 | slim bronze/champagne frames, cove ceiling, herringbone floor, skyline depth layers |
| 2 | Balcony & waterfront | 5-8 | re-audit | layered Canary Wharf skyline (instanced towers, lit windows), water shader, glass balustrade, clouds |
| 3 | Wall-side interior | 9-12 | done (round 5-8) re-audit | clean walls, concealed cove light, door set, no clutter |
| 4 | World scale/boundaries | 13-15 | partial | compact bounded world, 3-layer composition, no exposed edge/dark plane; **no AFTER image approved — diagnostics first, get approval before treating as final** |
| 5 | Private lift lobby | 16-20 | missing | enclosed vestibule 3–3.5×2.2–2.5×2.7–3.0 m, brushed-gold lift doors, indicator, call button, working open/close |
| 6 | Ground-floor lobby | 21-24 | basic | tall lift, chandelier, curved reception counter, rug, planters; lift travel sync with s05 |
| 7 | Building entrance | 25-29 | basic | bronze-framed sliding glass doors, courtyard tree & bollard lights visible through |
| 8 | Courtyard | 30-34 | existing | green-canopy (not pink), restrained cream/lavender planting, circular plaza, benches, townhouse façade modules (recessed sashes, cornices, brick/stone variation) |
| 9 | Fountain square | 35-40 | basic | 3-tier stone fountain, animated water, lamps, hedges, paths |
| 10 | Boutique & café row | 41-45 | basic | Maison Home + Café Vivienne shopfronts, awnings, warm window glow, planters |
| 11 | Opposite boutique/bookshop row | 46-50 | basic | Maison Sauvage, Papier & Co., Juliet balconies, burgundy shopfronts |
| 12 | Shopping street | 51-55 | existing | bounded street, cobbled/stone paving, lanterns, planters, lavender-pink blue-hour sky |
| 13 | Café Violette interior | 56-59 | missing | enterable: counter, patisserie, seating, reading nook, wisteria front, entry through shopfront |
| 14 | The Quiet Page interior | 60-64 | missing | enterable: walnut shelves, central glass chandelier, reading lounge, ladder, **no flowers** |
| 15 | Riverside promenade | 65-69 | sparse | lantern-lined promenade, burgundy waymarking kiosk/pavilion, green canopy, Thames terminus |
Each environment closes only after: camera-matched BEFORE / TARGET / BLENDER / LOCALHOST set, colour+lighting assessment, collision + interaction tests, weather pass, defects list.

## Stage 5 — Refinement
Foliage rebuild (organic trees, layered leaf cards, instancing, varied greens, no tropical, no pink overuse); water/fountain animation; shadow tuning; signage; interactions (lift, doors, café/bookshop entry); weather in every space (rain wet-ground applyWet on all new ground materials, window droplets on all new glass, indoor muffling zones per space); time-of-day pass for all presets; continuity check when walking between locations.

## Stage 6 — Verification & performance (p.76-79)
Gates G1 layout, G2 palette, G3 form, G4 light, G5 continuity, G6 function, G7 performance (measured — software GL caveat; instancing, LOD, draw-call counts, texture memory, triangle budgets), G8 coverage of all 15 sections. Full playable walkthrough with route log. Final report `docs/bible/FINAL_REPORT.md` + remaining-issues list.

## Standing process
- Commit after each meaningful step on the branch; `RESUME.md` kept current (last done, next action, how to rebuild/serve); `PROGRESS.md` log; `DEFECTS.md`; `ASSETS.md`.
- Build/serve: `npx vite build --outDir dist4` → `/tmp/serve.sh`; Blender: `python3.13` bpy scripts in `assets/blender/`.
- Honest reporting: Implemented ≠ Tested ≠ Visually verified; headless SwiftShader cannot judge animation/frame rate.

## Open questions / conflicts to flag (do not silently resolve)
1. s04 (World scale) has no approved AFTER — only the brief; build to the brief, flag for approval.
2. s08 earlier pink-blossom version superseded by green-canopy version (p.31/34): follow green.
3. s14 flower-filled bookshop rejected; approved is the flower-free one.
4. Hex swatches in the Bible are "indicative"; verify against the images, not as absolute.
5. p.57-59 café floor plan figures and p.19 lift dimensions are design suggestions; reconcile with existing door positions.
6. Penthouse is already near-final from earlier rounds; re-audit rather than rebuild (preserves user-approved look, e.g. rabbit player, cream door, interior kit).
