# Checklist status — honest per-section table (2026-11-13)
Headless SwiftShader localhost + Blender (bpy) only. NOTHING is owner-approved. M2 performance NOT measured (owner runs `?bench=1` after the checklist is achieved). Legend: V visually verified (headless image) · T tested · ~ implemented, not fully verified · O open.

| Part / env | Status | Evidence | Open |
|---|---|---|---|
| 01 Penthouse glazing | V | evidence/s01_glazing_slim.png, s01_penthouse_glazing.jpg | M2 look |
| 02 Balcony | V | s02 sheet, s04_after_* (balcony camera) | tower density vs p.6 |
| 03 Wall-side interior | V | s03_wall_side.jpg | — |
| 04 World scale | V (corrections done) — NOT approved | S04_CORRECTIONS.md, s04_corrections_sheet.jpg | owner visual approval |
| 05 Lift lobby | V | lobby/*.png | D-001/2 pink dominance at golden hour |
| 06 Ground lobby | V | S06_S07_STATUS.md, floor collider D-008 | true reflections |
| 07 Entrance | V | s07 shots, floor lanterns | blossom canopy: palette conflict, owner call |
| 08 Courtyard | V | S08_S09_STATUS.md | — |
| 09 Fountain | V + Blender master | blender_s09_master.png | — |
| 10 Boutique/café row | V | s10 sheets | Blender master |
| 11 Opposite row | V | S11_STATUS.md | — |
| 12 Shopping street | V | S12_STATUS.md, s12_game_stringlights_night.png | overhead leaf canopy |
| 13 Café Violette | V | S13_S14_STATUS.md | brightness is a single global factor |
| 14 Quiet Page (no flowers) | V | S13_S14_STATUS.md | — |
| 15 Riverside promenade | V + Blender benchmark | S15_BENCHMARK.md | — |
| Palette (Part 2) | T | PALETTE_AUDIT.md (0 errors) | owner colour audit |
| Calibration (Part 3) | T | CALIBRATION_REPORT.md | — |
| Blender modelling (Part 4) | ~ | ASSETS.md, assets/blender | masters for several envs; no Blender skyline (see S04_CORRECTIONS) |
| Lighting/shadows (Part 5) | ~ | MATRIX.md | contact AO faint, no SSAO |
| Foliage (Part 6) | V | evidence/*_planting.png | close-up bloom fidelity |
| Weather/time (Part 7) | T | MATRIX.md, s04_after_* | wet reflections only via wet shader; perf unmeasured |
| Continuity (Part 8) | ~ | WORLD_SCALE_REPORT.md | — |
| Gameplay (Part 9) | T headless | GAMEPLAY_TESTS.md | owner machine run |
| Tools (Part 10) | T | MCP_AUDIT.md, ASSET_PROVENANCE.md | — |
| Performance (Part 11/G7) | NOT MEASURED | PERF_BENCHMARK.md (445k static tris) | owner M2 benchmark |
| Visual verification (Part 12) | V | evidence sheets s01–s15 | Blender column is a note for most envs |

Owner-only decisions: s04 visual approval; s07 blossom canopy vs palette; final CHECKLIST confirmation; M2 benchmark.

## s08 courtyard hero tree (2026-11-13)
Hero plane scaled 1.25→1.5 with 7 Blender branch sprays spreading the canopy; warm under-bench glow strips. Evidence: `evidence/s08_game_hero_tree_bluehour.png` (no page errors). v2: 14 Blender leaf-puff masses + brighter bench glow; canopy now full and mature like p.31. Still partial: tree shadows on paving and bloom close-up fidelity unverified. Not approved; M2 not measured.
