# Hardware performance benchmark (run on your MacBook Air M2)

No performance claim is made for the M2 until you run this. The harness only measures.

## Run
1. `npm run dev` (or serve a production build) and open in Safari: `http://localhost:5173/?bench=1&quality=balanced`
   (quality = `performance` | `balanced` | `high`; default balanced).
2. A green HUD (bottom-left) shows live draw calls, triangles, textures, geometries, devicePixelRatio and canvas resolution.
3. Open the Web Inspector console and run `__bench.start(30)`, then walk a representative area for 30 s (e.g. lift lobby → courtyard → fountain → lane → café interior → promenade). Repeat for each preset and each area.
4. `__bench.result()` prints the JSON (average FPS, avg/p50/p95/p99/worst frame ms, count of >33 ms and >50 ms frames, draw calls, triangles, geometries/textures, DPR, resolution, tone mapping, shadows, scene-load ms). `__bench.download()` saves it as a file. Send me the files.
5. GPU memory: Safari → Develop → Show Web Inspector → Graphics tab (three.js cannot expose texture bytes).

## Presets (`src/bench.jsx`)
| preset | DPR cap | sun shadow map | AO (reserved) |
|---|---|---|---|
| performance | 1.0 | 2048 | off |
| balanced | 1.5 | 4096 | off |
| high | 2.0 | 4096 | on once SSAO is added and measured |

Presets change cost only, never the art direction.

## Smoke test (headless software renderer — NOT M2 data)
`?bench=1&quality=performance`, 8 s: 187 draw calls, 318,834 triangles, 341 geometries, 53 textures, 65 programs at the courtyard start pose; ~1 fps (SwiftShader), which says nothing about the M2. Harness verified to record and export.

## Static street triangle count (headless measurement, 2026-11-12 after planting kit)
Total 313,251 tris (promenade 81,976 · laneShops 83,328 · houses 56,180 · square 33,652 · terrace 14,830 · courtyard 9,846 · squareShops 13,582 · lobby 6,816 · other <9k). Earlier snapshot was 132k, before s12/s15 frontage, wisteria, baked props and planting. Build time ms: 270. True fps unknown (SwiftShader); owner should run `?bench=1` on M2 and compare presets. If frame time is poor, first levers: plant clusters (~300–600 tris each), wisteria strands, lane shop detail.

Update after rounder blooms: static total 383,103 tris (lane 47,964 from planting, promenade 93,396, square 44,412). Lane plant spacing then widened 1.9 -> 2.9 m to cut cost (re-measure on next build). Plant levers: spacing, subdivision (make_plants.py `sub`), instancing (not yet done — baked plants are merged geometry; GPU instancing would cut memory/draw cost).
