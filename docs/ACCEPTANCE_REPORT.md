# London Dreamscape — pre-release acceptance report (DRAFT, NOT APPROVED)

Recommendation: **NOT READY — REFINEMENT REQUIRED.** Nothing from this round is pushed as a release. Local checkpoint commits only.
(Note: earlier work-in-progress commits up to `fd675de` were pushed to `main` before the release hold was issued.)

Evidence: `docs/acceptance/*.png` (headless Chromium + SwiftShader software renderer, 960x540; NOT Safari / M2).

## Section status (audit by section; not a per-bullet count)
| § | Area | Status | Basis |
|---|------|--------|-------|
| 01 | Integrity | PARTIAL | v10 + stabilisation suites pass; doors_slider has 2 late failures (door still animating at ~1 fps); street walking test time-limited at ~2 fps |
| 02 | Masterplan | PARTIAL | all destinations built and reached in an earlier full test run; latest run could not finish walking at software fps |
| 03 | Art direction | PARTIAL | big improvement vs lane2.png; still below the collage (see discrepancies) |
| 04 | Architecture geometry | PARTIAL | facades unchanged this round apart from shopfront piers/frames; roofs/dormers/chimneys exist; no Blender-modelled buildings |
| 05 | Palette | PARTIAL | cream/sage/ivory shopfronts, burgundy as accent; verified in lane renders |
| 06 | Windows/glass | PARTIAL | shop interiors with shelves/counters/pendants + reflective glass layer + bronze frames; interiors still read flat tan; upper-floor lit panes still flat quads |
| 07 | Trees | PARTIAL | branching limbs + alpha leaf-card canopies, leaf-shaped shadows; only plane + ornamental + pleached types (no birch/magnolia/cherry/oak/maple); no bark texture |
| 08 | Planting | PARTIAL | shrubs/grass/flower beds exist but are simple; no climbers |
| 09 | Courtyard | PARTIAL | looks good in golden render; tree/bench/rill present |
| 10-12 | Lane / avenue / square | PARTIAL | verified visually; facades repetitive in places; blank brick gable walls visible |
| 13 | Romantic Lane | PARTIAL | much improved; still not collage quality |
| 15 | Promenade / skyline | PARTIAL | skyline reads as Canary Wharf (pyramid cap) but is small/distant vs the reference |
| 16 | Penthouse/lobby | PARTIAL | views captured and consistent; the planned penthouse corrections (door gaps/colours, panelling, sconces) were NOT done |
| 17 | Materials/micro-details | PARTIAL | tinted slabs/setts + bump; no normal maps, no house numbers/letterboxes/drainpipes |
| 18 | PBR | PARTIAL | std materials, no PBR texture sets |
| 19 | Lighting presets | PARTIAL | all five render distinctly (earlier captures); golden re-graded to peach-pink; blue/night checked only on lane/residential views |
| 20 | Rendering | PARTIAL | no AO/bloom/contact shadows beyond the sun shadow map |
| 21 | Blender pipeline | PARTIAL | bpy 5.3 works; script `assets/blender/make_props.py` makes lamp, bench, urn, chair, table, car -> .blend, GLB, baked JSON used in game. Buildings/trees are NOT Blender-made. Car is boxy |
| 22 | AI 3D tools | FAIL (not attempted) | no Hunyuan3D/other tool evaluated or used |
| 23 | Gameplay | PARTIAL | see tests |
| 24 | Minimap | FAIL (unverified) | implemented; no screenshot of it in this round, orientation not verified visually |
| 25 | Performance | PARTIAL | no M2 measurements possible. Software render: penthouse 1.25 fps baseline (pre-reconstruction), 0.38 after new trees, 1.13 after tree LOD. Street ~700k tris est. before LOD (not measured in-browser) |
| 26 | Screenshots | PARTIAL | 14 views + lighting comparisons captured (golden mostly); missing: promenade golden vs reference side by side, flower bed/entrance close-ups |
| 27 | Collage comparison | PARTIAL | done qualitatively only (below); no side-by-side composite |

Blockers still open: 3 (visual mismatch vs collage, partially), 4 (flat interiors / flat upper windows), 8-9 (no M2 numbers; minimap unverified).

## Tests (headless, software GL)
- v10: ALL PASS. stabilisation: ALL PASS. camera_collision / camera_wheel: ran, no errors (printouts only).
- doors_slider: 2 FAIL (balcony door closed-state timing, probably fps-related, unconfirmed).
- street.cjs: earlier full run passed all but test-expectation items (since fixed); latest run failed on time-limited walks and crashed at the 25-minute cap. Unconfirmed on a fast machine.

## Top 3 discrepancies vs the collage
1. Architecture: collage facades have rich stone detailing, large framed glazing, balconies with planters; ours are textured blocks with flat quads for upper windows.
2. Interiors/lighting: collage shows luminous warm interiors with depth; ours are flat tan with minimal depth, no bloom.
3. Skyline/promenade: collage skyline is large, detailed, with strong reflections and foreground railings/trees; ours is small and sparse.

## Next work
Penthouse corrections; Blender-modelled townhouse door/window/cornice kits; more tree species + bark; interior depth/bloom; larger skyline; minimap verification; M2 profiling by the user (Safari + devtools) since it can't be measured here.

## Round 3 update (colour/lighting vs collage) — still NOT READY
Evidence: `docs/acceptance/round3/` (`cmp2.png` = collage crops left, game right; `golden_*.png`; `lane_lighting_grid.png` = golden / street / afternoon / blue).
Changed: honey brick palette; curtained lit windows; per-shop interior colours; rose awnings + charcoal-bronze frames; black wrought-iron riverside railings with stone posts; deeper peach-pink golden hour (lower sun, purple-to-peach sky) + CSS vignette grade; magenta cast on cobbles then reduced.
Remaining largest gaps vs collage: (1) facade modelling (no stone window surrounds, arched doors, steps/railings, planted balconies); (2) shop interiors lack the collage's glowing, richly furnished depth; (3) skyline is far smaller than the collage's waterfront (it is anchored to the approved penthouse reference photo — enlarging it would break that match); (4) boxy car; (5) penthouse corrections still not done; (6) minimap still not visually verified.
