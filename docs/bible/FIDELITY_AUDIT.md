# Fidelity & Advanced 3D Production — Phase 1 audit (2026-11-12)

Status vocabulary used below: **planned · in progress · implemented · rendered · integrated · visually verified · performance-tested**. Nothing here is performance-tested on the owner's M2.

## 1. Rendering pipeline (what actually exists)
- three.js 0.169 via React Three Fiber 8, Vite 5, rapier physics. One `<Canvas shadows>`; tone mapping ACES (default; AgX/Neutral selectable by URL), exposure driven by `Atmosphere.jsx`.
- One directional sun with a 4096² shadow map (tight box over the penthouse, 110 m box following the player in the street), environment map (PMREM) for reflections, a handful of point lights (interiors, lanterns) modulated by the time-of-day state. No lightmaps, no ambient occlusion, no SSAO/bloom/postprocessing package installed. No texture compression, no LOD system beyond distance culling of street chunks.
- Street level is built procedurally (`src/street/plan.js`) into per-material merged chunks; textures are procedural canvas textures (greyscale, multiplied by vertex colour). Props/furniture for lobby/café/bookshop are Blender-baked triangle soups (`src/baked/*.json`).

## 2. Largest visual deficiencies, classified by bottleneck (Directive §11)
| # | Deficiency vs the AFTER images | Bottleneck class |
|---|---|---|
| 1 | No grounded soft shading: no AO / contact shadow / bounce light → surfaces look flat and "plastic" | **Missing lighting data** (not GPU limit): fixable with baked AO/indirect (static) + measured-cost SSAO option |
| 2 | Surfaces use simple procedural greyscale textures: no albedo variation, normal/roughness detail, mortar relief, stone pores | **Missing texture assets / material conversion** |
| 3 | Façades are box-modules with limited relief (reveals, cornices, sill depth) | **Missing geometry** (Blender can model; budget is the question) |
| 4 | Foliage: layered cards OK, but silhouettes/density below reference; no ivy/wall planting | **Missing geometry + assets** |
| 5 | Cinematic grade: no bloom/halation on warm lamps, flat sky-to-ground haze | **Missing postprocessing** |
| 6 | Light pools/warm interior spill are point-light approximations; shop glass shows little interior depth | **Inadequate lighting** |
| 7 | Everything is judged only in a 0.3–2 fps software renderer | **Measurement gap** — M2 cost of any effect is unknown, therefore no effect is rejected on assumed cost |

None of the above is "because it is a browser game". Class A (what Blender can create) is not the limit; class B (current renderer features) lacks AO/bloom/lightmaps; class C (M2 cost) is **unmeasured**.

## 3. Benchmark environment (selected): **S15 Riverside Promenade**
Why: contains stone paving, brick/ashlar, glass (café pavilion), mature trees, lanterns/lighting, water and environmental depth, a clear single approved composition (Bible p.66), and the current game version is visibly far from it (open paved plane, sparse planting). Lane (S12) is already close; riverside tests the whole pipeline.

## 4. MCP status (unchanged from docs/bible/MCP_AUDIT.md)
- **Blender MCP** (ahujasid/blender-mcp, MIT): assessed, **not installed** — it needs a GUI Blender with an add-on socket (unauthenticated localhost socket) and an MCP client; this workspace runs bpy headless, which already gives full Python control (modelling, shading, Cycles, baking, export), so the MCP adds no capability here. Re-evaluate only if you want it on your own Mac.
- **Unity MCP** (CoplayDev, MIT): assessed, **no Unity in project, no migration** (needs your approval; the audit shows the gaps above are pipeline gaps, not engine gaps).

## 5. Plan (phases per Directive §14)
1. Audit — **implemented** (this doc).
2. Visual foundation — palette registry/calibration board exist (**implemented**, headless-verified); lighting architecture (below) **planned**; texture workflow **in progress**.
3. Blender master (s15) — **in progress**: editable `.blend`, Cycles render at the p.66 camera.
4. Game-ready conversion — baked AO (neutral, day/night-safe) + Blender-authored PBR texture sets + real geometry upgrades in the playable scene.
5. Verification — actual game screenshot vs target vs Blender; discrepancy log; **hardware benchmark harness delivered for you to run on the M2** (see below).
6. Repeatable pipeline doc.

### Lighting architecture (decision)
- **Baked, static, neutral**: ambient occlusion + sky-bounce *indirect only* baked to texture/vertex data on static architecture/paving. No baked sun shadows or baked warm lamp light → works at day, night and in rain.
- **Dynamic**: sun + shadow map, lamps/point lights, character/pets, doors, weather.
- **Hybrid options evaluated**: multiple lightmap states (cost: N× texture memory, rejected for now), selective lightmap blending (kept as a later option), SSAO (offered as a *High Quality* preset only after the owner measures it).

### Texture sourcing / provenance
- ambientCG and Poly Haven are **not reachable from this workspace's network allowlist** (checked); the owner may drop CC0 sets into `assets/textures/incoming/` and they will be calibrated and registered.
- In the meantime PBR sets (albedo, roughness, normal/height) are **authored in Blender from procedural shaders and baked** — in-house, no licence risk, palette-calibrated. Register: `docs/bible/ASSET_PROVENANCE.md`.

### Performance benchmark (hardware)
Delivered as an in-app harness (`?bench=1`, `window.__bench`), see `docs/bible/PERF_BENCHMARK.md`. It records average FPS, frame-time percentiles, long-frame events, draw calls, triangles, texture-memory estimate, DPR/resolution, enabled effects and scene-load time, with Performance / Balanced / High presets. **Nothing is claimed about M2 until the owner runs it.**

## 6. Outstanding permissions
None required to proceed (all work stays inside the current architecture, free/self-authored assets, reversible commits, **no push** until the checklist is complete per owner instruction). Needed from the owner later: running the benchmark on the M2; approval of any extra architectural redesign; optionally dropping licensed texture sets if wanted.

## Status update (s15 benchmark)
See `S15_BENCHMARK.md`: Blender master rendered; landward frontage integrated in-game (headless-viewed); baked PBR/AO sets planned; M2 not measured.
