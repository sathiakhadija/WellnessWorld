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
