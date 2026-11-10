# Wellness World Penthouse V8 - game integration (Milestone 2)

## What V8 does automatically
| Step | How |
|---|---|
| Split game vs Cycles-only content | collections `WW_Export` (game) and `WW_Presentation` (skyline, river, lights, cameras, 1,738-board parquet) |
| Game materials | every material has a glTF-safe `*_GAME` twin (plain Principled values). `export_game_glb()` swaps to them, exports, swaps back |
| Floor | the parquet is baked (albedo, roughness, tangent normal; `GAME_FLOOR_TEX` px) onto ONE quad `WW_GEO_Floor` |
| Collision | `WW_COL_Floor / Walls / Glass / Balcony` boxes, tagged with glTF extras `ww_collider: true`; doorways left open |
| Spawns | `SPAWN_Player`, `SPAWN_Cat`, `TARGET_ThirdPersonCam`, with extras `ww_role` |
| Validation | 29 checks + statistics, printed and saved in the Text block `WW_V8_Validation` |
| GLB | set `EXPORT_GLB = True` (writes `wellness_world_penthouse_v8.glb` next to your .blend, or in `EXPORT_DIR`) |
| Skyline panorama | set `RENDER_SKYLINE_DOME = True` (360x180 equirect JPG; use `DOME_W = 8192` for final quality) |

## What is NOT automatic (later steps)
1. **Compression**: `npx @gltf-transform/cli optimize wellness_world_penthouse_v8.glb out.glb --compress draco --texture-compress webp`
2. **Baked lighting / lightmaps**: not done. In real time you use the sun + hemisphere light in `PenthouseScene.jsx`; for the soft golden bounce bake a lightmap (second UV set) as a separate pass.
3. **Glass**: exported as an alpha-blended pane (alpha 0.10). Keep it. `transmission` in three.js costs an extra render pass; use it only if the GPU budget allows.
4. **Interior lights** (cove, downlights, sconces) are Cycles lights and are not exported; add a few `pointLight`s or baked lightmaps in the app.
5. **Balcony access**: glass colliders close the balcony. Cut a door opening in `WW_COL_Glass` when you want players outside.

## Loading it
1. Copy the `.glb` and the dome `.jpg` to your app's `public/`.
2. `npm i three @react-three/fiber @react-three/drei @react-three/rapier`
3. Use `PenthouseScene.jsx` (WASD/arrows, capsule player, follow camera, trimesh colliders from the `ww_collider` extras).
4. Blender is Z-up, glTF/three.js is Y-up: the exporter converts; spawn positions arrive correct via `getWorldPosition`.

## Honest status
Validated here: the GLB is valid glTF 2.0, re-imports into Blender, has 9.4k triangles, 25 materials (1 blended), 3 JPEG textures, 4 colliders and 4 spawn nodes.
NOT validated: running in a browser/React app, frame rate, the dome's orientation in three.js (verify by checking that One Canada Square sits where the far window shows it; if it is rotated, change the dome rotation about Y), Draco compression.
