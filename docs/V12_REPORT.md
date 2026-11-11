# V12 — Playable character + companion kitten: status report

**Status: systems built, models are STAND-INS. Final models will be supplied as GLB files; this milestone is the integration layer they drop into.**

## Models (not final art)
- Modelling tool: none. Blender is not available in this environment, so both the character and the kitten are procedural meshes written in code (`src/character/loft.js`, `buildCharacter.js`, `src/companion/buildKitten.js`), skinned to in-code skeletons. They are modelled from scratch, not sourced.
- They are stylised placeholders built from my written notes on the references (the reference images could not be re-opened after a context reset). They do **not** match the approved identity and must not be treated as final. Known gaps: face/hair fidelity, mitten hands, faint kitten stripes, simple fur shells.
- Next asset step: DCC-authored (or image-to-3D then cleaned) rigged GLBs, see the spec below.

## What is implemented
- **Modular layers**
  - Controller: `Player` in `PenthouseScene.jsx` (movement, collision, camera, interactions); it only publishes speed, heading and `world.playerLock` / `world.faceYaw`.
  - Character presentation: `src/character/` (appearance config, rig contract, `CharacterModel.jsx`, animator, IK/look-at).
  - Companion: `src/companion/` (rig/appearance, nav grid + A*, following brain, `Companion.jsx` with AI-ready states and the pet interaction).
  - Swap point: `PlayerModel` in `src/character/index.js`; `?model=legacy` shows the old primitive avatar for A/B.
- **Animator** (`src/character/animator.js`): sampled clips, weighted base-state blending, masked overlays, shared locomotion phase, ground lock, stance-speed calibration. Used by both rigs.
- **Character clips:** idle (breathing, weight shift, head drift), walk, run, turnL/turnR, reach (door), pet, sitIdle (reserved, not wired to any seat); blink, hair springs, look-at, two-bone IK for the reach/pet hand.
- **Kitten clips:** idle (ear twitch, tail), walk, trot, sit, rest, lookUp, petReact; purr, blink/squint.
- **Companion AI:** grid probed from the physics world, door gates live-gated (bedroom, bathroom, balcony slider; entrance never walkable), balcony glass rails and tree excluded, follows behind-and-aside, settles/sits when the player stops, trots when far or the player runs, keeps out from under the feet, stuck detection with a fade-out/fade-in relocation out of camera view, waits at closed doors. Doors refuse to close on the kitten.
- **Pet interaction:** "🐾 Pet Kitten" via the existing Enter framework; player turns, crouches and strokes (IK to the kitten's head), kitten sits and reacts, then control returns. No rewards.
- **AI-ready states:** `window.__ww.companion().setAIState('Listening'|'Thinking'|'Speaking'|'Happy'|'Curious'|'Resting'|'Following')` drives body language independently of movement. No AI, network or key exists in the frontend; a future AI must go through a secure backend.
- Walk speed changed 1.7 → 1.3 m/s and run 3.2 → 3.0 m/s so a 157 cm character does not look hurried.

## Tested
- `tests/v12_anim.mjs` (offline): character 157.6 cm; rig contracts; no foot sink/float; walk/run planted-foot speed within 12 % of ground speed; idle grounded.
- `tests/doors_slider.cjs` passes (timing and doorway checks adjusted for the slower headless frame rate).
- Browser smoke test: scene loads without page errors, kitten grid builds, kitten follows the player.

## NOT verified
- Following through the bedroom/bathroom doors, onto the balcony and back, stuck recovery, and the full pet sequence were not exercised end to end.
- Kitten gait calibration is unfinished (paws slide; trot contact check found no planted samples). Not worth fixing on the stand-in.
- The 12 requested screenshots were not produced; the studio page (`?studio=character|kitten|pair&view=...`) exists for them.
- No Safari / real-GPU performance data (headless SwiftShader only). Headless frame rate dropped noticeably with the fur shells.

## GLB drop-in spec (for the final models)
- Character: skinned GLB, 1.57 m tall, feet at y=0, facing +Z, A-pose, named bones as in `HUMANOID_REQUIRED` (hips, spine, chest, neck, head, clavicle/upperArm/lowerArm/hand L/R, upperLeg/lowerLeg/foot/toe L/R). Optional: eyeL/eyeR, lidL/lidR, hair chains, so blink/look-at/hair motion keep working.
- Kitten: skinned GLB, feet at y=0, facing +Z, bones as in `KITTEN_REQUIRED` (root, spine, chest, neck, head, ear, fUp/fLow/fPaw, hUp/hLow/hPaw L/R, tail0-4, lid L/R).
- Provide meshes only; clips are authored against the rig and retargeted by bone name. Keep texture sizes modest for Safari.
