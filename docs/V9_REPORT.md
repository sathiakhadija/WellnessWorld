# Wellness World – V9 architecture & exterior milestone: report

Everything below was checked in **headless Chromium with software rendering (SwiftShader)**. That renderer runs this scene at roughly 0.5–5 frames per second,
so frame rate, GPU cost and Safari behaviour are **not** measured. Screenshots are in `docs/screens_v9b/`.

## Implemented
| Brief item | What exists now | Where |
|---|---|---|
| Wider interior doors | Left wall rebuilt in code. Two panelled double doors, **1.5 m** (bedroom) and **1.3 m** (bathroom) wide, 3.0 m high (were 0.8–1.06 m wide, 3.3 m high). Architraves, plinth blocks, reveal linings, brass lever handles and hinges. | `src/Plan.jsx` |
| Doors open / close | **Enter** toggles the nearest door within 2.7 m, with an on-screen prompt. Leaves swing 100° into the room (0.9 s). The closed-door collider exists only while the door is closed; closing is refused (and re-opens) if you stand in the doorway. | `Plan.jsx`, `world.js`, `HUD.jsx` |
| Collision follows the architecture | Old left wall, old cell walls and floors were cut out of the GLB colliders at load time; new cuboid colliders are generated from the same box list that draws the walls. No invisible collider across open doors. | `PenthouseScene.jsx`, `Plan.jsx` |
| Bedroom + bathroom | Bedroom 4.8 × 4.3 m, bathroom 3.0 × 3.6 m, both 3.4 m high: floor, walls, ceiling, skirting, recessed downlights, warm point light. Bedroom has a 2.7 × 2.35 m window. **Unfurnished.** The third V8 doorway was removed (the brief asks for two rooms, the reference shows two doors). | `Plan.jsx` |
| Sliding balcony door | Middle bay of the far glazing: fixed panel + sliding panel (1.55 m clear opening), bronze frames, brass pull, floor/head track. Slides in 1.7 s. Collider is the permanent glazing on both sides plus the leaf while closed. A stone threshold ramp bridges the 0.35 m step down to the balcony deck. | `Plan.jsx` |
| Cherry blossom tree | Procedural, seeded, asymmetric branching (tapered tubes, 6 segments per branch), ~2k instanced alpha-tested 5-petal flower cards with per-instance colour, small petal masses, lathe-turned textured stone planter with trailing foliage, slight wind sway. Replaces the old geometric tree. | `src/Tree.jsx` |
| Front = Thames + Canary Wharf | Unchanged from V9a except: far bank is now a straight embankment, river is animated (moving ripples and reflection streaks), 3 boats with lit decks travel along the river. | `Skyline.jsx`, `Neighbourhood.jsx` |
| Back = London neighbourhood, no river | ~900 city blocks on a street grid (terraces with pitched roofs and chimneys, mansion blocks with flat roofs, courtyards with lawns and trees, lit windows, street lamps), a distant rear skyline, the embankment. The river plane now stops at the near bank, and the tower the penthouse sits on is drawn underneath it. | `Neighbourhood.jsx`, `Skyline.jsx` |
| Sides | Left/right views show the river continuing along the near bank with the neighbourhood behind; far-bank towers only exist within ±100° of the front. | `skylineData.js` |
| Remove unapproved furniture | The side cells' bench, vanity, basin, mirror, glowing "window" strips and bed-like props are removed. Nothing was added to the main room, bedroom or bathroom. Player, cat and tree are the only objects. | `PenthouseScene.jsx` |

## Tested (automated, `tests/`)
* `tests/doors_slider.cjs` – **15/15 pass**: closed bedroom/bathroom doors block; Enter opens; player walks in; room back wall holds; closed balcony door blocks; open door lets the player reach the balcony deck (y −0.35); player walks back in over the ramp; door blocks again after closing; refuses to close with the player in the doorway; no console errors.
* `tests/camera_collision.cjs`, `tests/camera_wheel.cjs` – camera regression (follow/free/inspect, collision, free camera never moves the player, wheel vs trackpad): results unchanged from V8/V9a.

## Known limitations / not verified
* **Safari / MacBook trackpad: still not tested** (no WebKit in this environment). Enter is the new door key; it is a plain `keydown` listener.
* **No real-GPU frame rate measurement.** Costs added in this milestone: ~5 point lights, ~900-block neighbourhood (3 merged draw calls + instanced trees), flower instances. If it is slow on your Mac, append `?off=tree,hood` to the URL to see how much each costs.
* Door leaves have no hand interaction other than **Enter** (no mouse-click on the door).
* The doors/rooms/sliding door are built in code, not in the Blender script – the Blender script (v8) still contains the old geometry. If you want them in Blender, that is a follow-up.
* The rear/side environment is stylised (flat-shaded blocks, one facade texture); it reads as a London neighbourhood from the penthouse but not close-up. No real streets/cars/people.
* The rear neighbourhood cannot be seen from inside the main room (the rear wall is solid by design); it is visible from the balcony's right-hand wing and from the bedroom window (side/rear).
* Reference differences: windows reflections are still environment-lit, not real reflections; floor sun-patch dimmer than the reference; cloud pattern is procedural, not the reference's.

## Outstanding
Room-by-room interior design (next milestone), Blender-side export of the new architecture, performance pass on a real GPU, Safari test.
