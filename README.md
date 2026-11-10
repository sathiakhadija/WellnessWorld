# Wellness World – Penthouse V8

## Camera controls (on-screen help is shown in the app; H hides it)
| Key | Action |
|---|---|
| **1 / 2 / 3** or **C** | Follow camera / Free camera / Inspect (Sims-style, ceiling hidden) |
| Arrows / WASD | Follow: walk relative to camera. Free: fly. Inspect: pan. (Free and Inspect never move the player.) |
| Drag, or two-finger trackpad scroll | Orbit (Follow, Inspect) or look (Free) |
| Pinch, mouse wheel, + / − | Zoom (Free: dolly) |
| Shift-drag / right-drag / Ctrl-click-drag | Pan / slide (Free, Inspect) |
| Q / E | Rotate (Follow, Inspect); Free: E up, Q down. Shift = faster |
| R reset view · F centre on player (Inspect) · N camera collision on/off · T trackpad scroll = orbit/zoom · I invert scroll | |

Camera collision uses Rapier ray casts against the floor/wall/balcony colliders (not the glass, so the free camera can go out onto the balcony).

React Three Fiber scene of the Blender-built penthouse (`public/wellness_world_penthouse_v8.glb`).

```bash
npm install
npm run dev      # open the printed localhost URL, WASD / arrow keys to walk
```

- `blender/wellness_world_penthouse_v8.py` – Blender script that generates the penthouse and exports the GLB (see `docs/GAME_INTEGRATION.md`).
- `src/PenthouseScene.jsx` – loads the GLB, builds Rapier trimesh colliders from the `WW_COL_*` meshes, WASD capsule player with follow camera.

## Verified (headless Chromium + software WebGL, scripted with Playwright – see `tests/`)
- GLB loads, no console/page errors.
- Mouse-drag orbit, notched-wheel zoom, trackpad-style scroll orbit, scroll=zoom toggle, ctrl+wheel pinch and *synthetic* WebKit `gesture*` events (handler logic only).
- Follow / Free / Inspect modes, eased transitions, player unmoved in Free and Inspect, camera-relative walking.
- Camera collision: free camera stops at back/left/right walls, floor and ceiling bounds, passes the glazing; no-clip (N) passes walls; follow camera is pulled in by walls; player is stopped by the glass.

## Visual audit and V9 plan
See [`docs/VISUAL_AUDIT_AND_V9_PLAN.md`](docs/VISUAL_AUDIT_AND_V9_PLAN.md) and the screenshots in `docs/screens/`.

## NOT verified
- **Safari / macOS trackpad.** Handlers are written for Safari (non-passive wheel, `gesturestart/change`, pointer capture, Ctrl-click = pan, swipe-back suppression) but no WebKit/Safari engine was available in the test sandbox. Please report anything that misbehaves.
- Real-GPU frame rate (tests ran at 3–8 fps in software GL), mobile/touch, Blender 5.2.3, dome orientation, Draco compression.
