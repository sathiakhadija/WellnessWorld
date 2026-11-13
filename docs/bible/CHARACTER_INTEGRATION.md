# Character integration (Momo-ready) — status 2026-11-13
Momo's definitive model has NOT been supplied. Nothing here replaces the rabbit (default player). No substitute Momo was made.

## How to add Momo
Drop the rigged GLB at `public/models/momo.glb` (upright biped red panda). Clips are matched case-insensitively by name (`src/characters/registry.js` CLIP_ALIASES): Idle, Walk, Run, Jump, Sit, Sleep, Wave, Cheer, emote_happy/sad/surprised/love. Missing clips fall back along a chain (run->walk->idle, sleep->sit, cheer->wave ...). Height/orientation: `height` and `faceFix` in the registry entry. Material overrides can be added per character (extend the registry entry; GltfCharacter currently uses the GLB's own materials).
Selection: HUD controls panel (H) -> Character dropdown (Momo listed only once the file exists); persisted in localStorage `ww.character`; `?model=<id>` overrides for a session. Switching reloads the page to rebuild the player rig.

## Pieces
- `src/characters/registry.js` registry, availability probe (HEAD), persistence, clip aliases/fallbacks
- `src/characters/animStates.js` pure state machine (speed -> idle/walk/run; one-shots; sit/sleep holds) + clip resolver
- `src/characters/GltfCharacter.jsx` GLB loader, height normalisation, AnimationMixer, 0.2 s crossfades, error boundary -> rabbit fallback
- `src/characters/CharacterPicker.jsx` selector UI
- `assets/blender/make_character_placeholder.py` -> `public/models/_TECHNICAL_PLACEHOLDER_biped.glb` (grey, labelled TECHNICAL_PLACEHOLDER, dev-only `?dev=1`; not Momo)
- Test hooks: `window.__ww.charClips`, `window.__ww.charAction('wave')`

## Validation (headless)
- `node tests/characters.test.mjs`: PASS (clip resolution/fallback, state machine, registry invariants)
- `node tests/glb_inspect.mjs public/models/_TECHNICAL_PLACEHOLDER_biped.glb`: skin with 7 joints, 9 animations
- `node scripts/char_smoke.cjs`: PASS: placeholder loads with all 9 clips and `charAction('wave')` works; `?model=momo` with no file falls back to the rabbit with no page errors; default rabbit unchanged (evidence/char_technical_placeholder_wave.png)
## Not done / needs Momo
Jump is only triggered by `charAction` (the player has no airborne signal wired); sit/sleep/wave/emotes have no key bindings yet; no retargeting if Momo's bone names differ (clips are bound by the GLB's own skeleton, so a self-contained GLB works as-is); runtime switch without reload.
