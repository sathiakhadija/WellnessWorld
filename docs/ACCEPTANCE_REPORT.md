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

## Round 4 (townhouses) — still NOT READY
Evidence: `docs/acceptance/round4/`. Added stone architraves/keystones/pediments, columned door porticos, cream ground floors, more warm lit windows, steel-blue cars. Still open: skyline scale, shop-interior richness, car model quality, penthouse corrections, minimap visual check, M2 profiling, AI 3D tools.

## Temporary models (added after Round 4)
- Player: `public/models/limon.glb` ("hot lemon girl", decimated 1.5M→30k tris, 2048² textures), static mesh, procedural bob/sway; scaled to 1.62 m.
- Pet: `public/models/rabbit.glb` (158k→12k tris), idle hop; 0.34 m.
- Originals reachable: `?model=pill`, `?pet=cat`; V12 via `?model=v12`.
- Status: Implemented + visually verified in the penthouse (docs/acceptance/temp_models/). NOT tested in street level, walking, or on M2/Safari. No rig/animation (static pose); rabbit does not follow the player.

## Penthouse door/wall correction (round 5)
Cause of grey-green walls: GRADE multiplied plaster green ×1.12 on a taupe base. Now warm ivory (set), trim/ceiling/skirting cream, warm interior ambient (preset-scaled). Entrance door + casing cream with brass (was espresso walnut/dark linings); 12 cm door-head gap closed. Visually verified (headless, golden hour) in docs/acceptance/penthouse_door_wall/. Not yet verified in other presets; bedroom/bathroom doors still read pink under golden sun; no regression suites re-run.

## Round 6: Blender interior kit
assets/blender/make_interior.py (bpy) → src/baked/interior.json (+ .blend/.glb): stepped door architraves with plinth blocks and 3-layer cornice (1.5 m + 1.1 m), fluted pilaster with capital/base, brass tube sconce (entrance). Wired in Plan.jsx `<InteriorKit/>`; replaces box-built trim. Visually verified headless golden hour (penthouse_door_wall/*_kit.png). Not done: open doors with lit interiors (reference shows them open), bedroom/bathroom door pink cast, other presets, regressions.

## Round 7: palette match (penthouse)
k-means palette of the user's reference render vs ours, same framing. Overall mean RGB ref (158,122,107) vs ours (158,120,104). Changes: floor grade toward honey-rose (was amber, floor mean 138,90,57 → 146,99,72; ref 166,117,98 — still slightly darker/more amber), plaster dustier rose-ivory, glazing frames warm dark brown (not black/wine), golden sky mid/upper cooled toward lilac. Street not yet re-graded to the same numbers.

## Round 8: removed extra neighbourhood + rabbit as player
- Deleted src/Neighbourhood.jsx (old V10 sprawl: terraces/mansion blocks/slabs to the horizon, rear tower slabs) and its render in Skyline.jsx; added a sage near-bank ground plane (fog-blended) so the compact street doesn't float. Before/after: docs/acceptance/round8/aer1_a.png vs aer4_a.png. Street-level view toward the neighbourhood edge verified (aer4_c.png). Aerial view is a flat green plain to the horizon (not designed content).
- Player is now the rabbit (0.55 m, procedural hop gait scaling with speed; Shift = fast, Shift+Space = sprint). Lemon girl: ?model=lemon; pill: ?model=pill. Verified headless: idle, walk, sprint to balcony door (rab_*.png). NOT verified: hop animation mid-cycle (≈1 fps software GL), street-level rabbit scale/camera, collisions at rabbit size (capsule unchanged, 1.54 m).

## Round 9: rabbit run cycle
assets/blender/make_rabbit_rig.py splits the supplied rabbit into body/head(+face)/ears/arms/feet/tail (14k tris, joint pivots) → public/models/rabbit_rig.glb; TempModels.jsx RabbitPlayer drives a procedural run cycle (alternating legs, counter-swinging arms, ear stream/flop, lean, head nod, tail, airborne lift at sprint). Verified headless: parts assemble correctly at idle and in a sprint pose (ears back, leaning). NOT verified: smooth motion (software GL ≈1 fps), limb swing direction from the side, sign of limb rotation axes, street-level camera/scale.

## Round 10 — Immersive rainy-day weather system

Evidence: `docs/acceptance/weather/`. Controls: HUD weather row (☀️ ☁️ 🌦️ 🌧️ ⛈️), keys `;` / `'`, ⚙︎ for rain volume + mute + quality (low/medium/high). URL: `?weather=`, `?wq=`, `?rvol=`.
Code: `src/weather/` (weather.js state + `registerWeatherProvider` hook for automatic weather, windowRain.js, Rain.jsx, wet.js, RainAudio.jsx), lighting in `Atmosphere.jsx`.

| Test | Result | Level |
|---|---|---|
| A Indoor window view, moderate rain | Rain-streaked overcast sky, drops on glass, **interior dry** (rain discarded inside the footprint) — `A_window`, `A_interior_dry` | Visually verified |
| B Close-up on glass | Lens drops of varied size with highlights, skyline visible through them, glass stays transparent — `B_close*`, `I_light/heavy_close` | Visually verified (trails are faint; no true refraction) |
| C Sunny → rain | Values advance over ~9 s: rain 0→.63, cloud 0→.91, window wetness 0→.61; frames C0–C3 | Verified by frames + readout |
| D Rain stops | Window water drains gradually: .80 at 8 s, .41 at 22 s, 0 at 52 s; ground dries slower (.25 at 52 s) — `D1–D3` | Verified by frames + readout |
| E Performance | Software GL only (0.31 fps both sunny and heavy; 152 vs 154 draw calls, 360k vs 374k tris). Window rain is one shader pass, outdoor rain is one instanced draw (2.5k/6.5k/12k by quality). **Not measured on the M2.** | Not representative |
| Street in rain | Darker wet paving, streaks — `S_street_rain` | Visually verified |

Fixed this round: square blocks on glass (a degenerate `smoothstep(0,0,x)` in the bead mask), flat-block drops, slow drain, over-bright peach interior in rain.

Honest limitations
- Droplets show an inverted sky/city colour miniature, not a real refraction of the rendered scene.
- Audio is procedural Web Audio; checked by gain readouts (indoor muffled, window taps active), **not heard by ear**.
- Interior stays warm peach under the golden-hour preset even in rain; cooler daylight is clearer with other presets.
- Thunder/lightning flash, light/heavy puddle look, and low/high quality were not visually compared.
- Animation (running drops, rabbit run) cannot be judged at ~1 fps in headless software GL.
