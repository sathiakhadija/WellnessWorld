# Roadmap to the FINAL SIGN-OFF CHECKLIST (rebuilt 2026-11-13)
Rules: Blender for every new asset; evidence = same-camera localhost render (headless SwiftShader) + Blender render + target page; nothing is ticked from code alone; nothing is marked owner-approved; M2 never claimed. Protected: balcony geometry, glass balustrade, tiles, doors, weather systems, approved character identities.
Done-definition per environment (Part 12 loop): identify gap → fix (Blender kit first) → rebuild → render same camera at day/golden/blue/night (+rain where outdoors) → compare with target page → no page errors → record in CHECKLIST_STATUS + env STATUS doc → commit/push.

## Phase A — Close visible gaps vs target pages (Parts 1, 5, 6, 12)
| # | Env | Remaining gap (from CHECKLIST_STATUS) | Work (Blender first) | Target page | Verify |
|---|---|---|---|---|---|
| A1 | 12 Shopping street | canopy still sparse; wet cobbles; chalkboards/spill; repeated-building check | denser leaf cards + thicker limb kit; wet-cobble reflection tuning; chalkboard/flower-bucket props; vary façade modules | p.52 | lane renders ×4 times of day + rain |
| A2 | 08 Courtyard | canopy density, bench glow subtle, tree shadows, no huge empty tile areas | second hero tree silhouette, denser branch kit, bench glow strips brighter, more layered beds | p.31 | court renders blue/golden |
| A3 | 09 Fountain | no open items; recheck vs 08 continuity + water sound | regression only | p.32-33 | one render + audio path check |
| A4 | 10/11 Rows | Blender master missing; façade modules, flower boxes, lanterns, topiary/table spill | Blender façade module kit (cornice/shopfront/bay) replacing flat façades; flower boxes; table spill | p.43-48 | per-row before/after |
| A5 | 05 Lift lobby | D-001/2 pink dominance at golden hour | rebalance palette use (neutral limestone/brass, pink accents only) | p.20 | golden-hour lobby render |
| A6 | 06 Ground lobby | true reflections | floor reflection (planar fake/probe) tuned; reception detail | p.22 | lobby render |
| A7 | 07 Entrance | blossom canopy vs "no global pink" | NOT decided: show owner both options (green canopy default, blossom variant) | p.27 | owner call |
| A8 | 13/14 Cafés | brightness is one global factor; polish props | per-room light balance; Blender counter/shelf props | p.55-60 | interior renders |
| A9 | 15 Riverside | polish only | regression + wet-floor look | p.62 | promenade renders |
| A10 | 01-03 Penthouse | re-audit untouched | audit only, no edits to protected geometry | p.4-9 | one render each |

## Phase B — World/atmosphere (Parts 4, 7, 8)
B1 s04 corrections: far-bank dark patches in rain/night; tower density vs p.6; keep NOT approved. B2 weather×time×new-space regression (Part 7 "re-verify in every new space"). B3 continuity checks: looking-back sightlines (11), skyline stable across cameras, connections (Part 8).

## Phase C — Lighting & materials (Parts 2, 3, 5)
C1 contact AO/soft shadows under benches, planters, props (faint today; no SSAO) — cheap baked/blob shadows first. C2 palette audit rerun (0 errors), perceived-colour check on new foliage/branches. C3 time-of-day light switching/no flicker re-test.

## Phase D — Blender coverage (Part 4)
Masters/.blend for envs lacking them (s10/s11/s12/s13/s14 minimum), organised collections, scripts re-runnable, seeded variation, no baked lighting in base colour, GLB validated.

## Phase E — Performance (Part 11 / G7) — static only
Count tris/draw calls per zone (branches add ~35k), instance/merge, LOD/culling where cheap, texture budget. Record M2 as the owner's measurement (`?bench=1`).

## Phase F — Gameplay (Part 9)
Walk-test every route after each phase; furniture/door/shop-display collision; lift/door sync; no walk-through walls.

## Phase G — Characters (non-blocking)
Momo pipeline ready; only keep tests green until the model is supplied.

## Phase H — Final (Parts 12–15)
Level C review: build, `npm run validate`, matrix, evidence index (4-way for all 15), gates G1–G8 table, 18 absolute rules, docs, OVERNIGHT PRODUCTION REPORT. Owner-only: s04 approval, s07 canopy decision, M2 benchmark, final CHECKLIST confirmation.

## Order
A1 → A2 → A5 → A4 → A6 → A8 → A9 → A7(owner flag) → B → C → D → E → F → H, pushing at each milestone.
