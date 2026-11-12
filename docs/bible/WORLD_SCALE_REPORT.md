# Section 04 — World scale, spatial composition & boundaries: measurement report

**STATUS: TECHNICAL DIRECTION APPROVED — FINAL VISUAL CORRECTION PENDING USER APPROVAL.** (No AFTER image exists for s04; this report is the target. Nothing here is marked visually approved.)
Generated from the real code/planner: `scripts/world_measure.mjs` → `docs/bible/world/world.json`, `scripts/world_map.py` → `docs/bible/world/topdown.png` (annotated top-down, metres, −z = Thames at top).

## 1. Measurements (units = metres, from source, not guessed)
| Item | Value | Source |
|---|---|---|
| Penthouse room (living) | x −4.45…3.61 (8.06 m) × z 0…−11.79 (11.79 m); ceiling underside 3.4 m (wall top 3.6, slab bottom −0.3) | `Plan.jsx` |
| Door height | 3.0 m (`DOOR_H`), entrance 3.06 m; lift door 0.9 m wide × 2.5 m high | `Plan.jsx`, `plan.js` pois |
| Player (rabbit) | visual 1.1 m tall; **physics capsule 1.54 m × 0.44 m** (mismatch — see findings) | `TempModels.jsx`, `PenthouseScene.jsx:277` |
| Cameras | follow FOV 50°, dist 3.0, pitch .30; free FOV 62°; inspection FOV 38°, dist 12; near/far 0.05/700 (penthouse), 0.15/4500 (street) | `CameraRig.jsx` |
| Balcony | z < −11.95, right glazing x≈3.6; footprint incl. rooms x −9.95…4.05, z −11.95…0.45 | `Plan.jsx` |
| Penthouse height above waterline | **87 m** (`EYE_ABOVE_WATER`); street level GY = −86.8; terrace 4.4 m above street | `skylineData.js`, `geo.js` |
| Skyline | authored in real metres at assumed distances **D = 1090–1260 m** from the reference eye (towers ≈ 62–95 m wide frames), rendered in a 1/6-scale group (angular size identical) | `skylineData.js` |
| Street world bounds | x −130…86 (216 m) × z −150…128 (278 m); colliders extent x −127…83, z −153…125 | `plan.js` |
| Tower footprint (below the penthouse) | x −62…32 × z −88…4 = **94 × 92 m** | `plan.js` header |
| Building heights (colliders) | median 14 m, max 23 m (141 building/frontage colliders) | planner |
| Walking distances | lift→lobby 4 m · lift→courtyard 25 m · lift→gate 45 m · lift→fountain 79 m · fountain→café 45 m · café↔bookshop 8 m · lift→café 98 m · lift→riverside 117 m · lift→Thames edge 148 m · café→riverside 210 m · lift→quay café 156 m | `world_map.py` |
Not measured here: river width (the river is an infinite plane + far quay; nearest bank is the terrace at z −140), Thames real-world reach width — to be confirmed against a map before any change (do not assert from memory).

## 2. Diagnosis (geometry vs camera)
- **Camera/FOV are not the problem**: FOVs are standard (50/62/38°), no zoom is used to alter perceived size; clipping planes are sensible. The "excessively distant" feeling is **geometric**.
- **River/city distance**: the skyline sits 1.1–1.26 km from the penthouse. With the penthouse 87 m up, towers read as far, small and flat; boats/quay (real size) look tiny. Angular size matches the reference, so shrinking distance *and* tower size by the same factor would keep the image identical while restoring parallax and believable scale (candidate fix, needs approval).
- **Dark terrain / abrupt boundary (Bible p.13)**: already removed in earlier rounds (extra V10 neighbourhood deleted, near-bank sage plane added). Current same-angle view: `docs/bible/world/s04/c_inside.png` (river meets a coherent skyline/far quay; no dark plane). Original p.13 camera pose is not in the PDF, so pose is approximated by eye from the page-13 composition.
- **Street layer (Layer A) is not compact**: 216 × 278 m; the lift is 117 m from the riverside and 98 m from the café/bookshop; the 94 × 92 m tower footprint is an empty lawn (`topdown.png`) — the "giant flat grass plane" the Bible warns about; the route lift→river crosses/skirts it.
- Collision: capsule 1.54 m for a 1.1 m character — taller/wider than the visual; walking under low door lintels/furniture and corner clearances will feel wrong.

## 3. Boundaries & three layers (status)
| Layer | Contents now | Gap |
|---|---|---|
| A playable | penthouse, balcony, courtyard, boulevard, square/fountain, lane shops (café/bookshop/boutique/bakery/florist), Thames terrace | no lift lobbies (s05/s06) yet, no enterable café/bookshop interiors, layout too large |
| B nearby scenery | far-bank waterfront (quay, trees, piers), boats, near-bank sage plane | street-side bank/riverbank not yet reconciled with the terrace; no neighbouring buildings visible from the terrace on the sides |
| C distant skyline | hero + background towers w/ crowns, haze, sky | distance/scale per above |

## 4. Proposed corrections (NOT applied — rule 14: layout changes need review)
1. **Skyline distance/scale**: multiply authored D and tower dimensions by k (try 0.5) so angular size is unchanged; adjust far quay/river accordingly. Produces parallax + believable boat/quay scale. Reversible via one constant.
2. **Tower footprint lawn**: replace with tower-base geometry (podium/plant gardens/screening hedges + trees) so the penthouse building actually stands there and the lawn disappears; keep lift/lobby axis x = 1.2.
3. **Compact the walk**: keep all destinations and their relative order but pull the Thames terrace and lane closer (e.g. reduce the 94 m tower-depth gap) — lift→fountain ≤ ~60 m, lift→riverside ≤ ~80 m — **only after you approve the layout map**; a new master plan will be drawn on `topdown.png` for sign-off first.
4. **Capsule → 1.1 m character** (radius ≈ 0.22, half-height ≈ 0.33) — technical fix, applied with the next gameplay pass.
5. Unify ground elevation (single GY) and verify the interior-to-balcony skyline continuity test (script: shoot the skyline from 3 interior points and the balcony with identical yaw, compare tower bearings).

## 5. Required verification set (to complete before submitting for approval)
[x] annotated top-down layout · [x] world-scale measurement report · [x] diagnosis · [~] corrected same-angle preview (current-state localhost shot only; Blender preview + corrected version pending the approved plan) · [ ] interior-to-balcony continuity test · [ ] performance assessment.
