# Wellness World – Penthouse V8

React Three Fiber scene of the Blender-built penthouse (`public/wellness_world_penthouse_v8.glb`).

```bash
npm install
npm run dev      # open the printed localhost URL, WASD / arrow keys to walk
```

- `blender/wellness_world_penthouse_v8.py` – Blender script that generates the penthouse and exports the GLB (see `docs/GAME_INTEGRATION.md`).
- `src/PenthouseScene.jsx` – loads the GLB, builds Rapier trimesh colliders from the `WW_COL_*` meshes, WASD capsule player with follow camera.

## Verified (headless Chromium, software WebGL)
GLB loads with no console errors, player stands on the floor collider and moves with W. Screenshots in `docs/`.

## Not verified
Real-GPU frame rate, mobile, Blender 5.2.3 (script tested on bpy 5.3), skyline dome orientation, Draco/meshopt compression, bundle size (3 MB JS, unsplit).
Known visual gap: three.js lighting is flatter and paler than the Blender render (no baked shadows/lightmaps yet; sky is a pale dome).
