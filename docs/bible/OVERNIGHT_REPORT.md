# OVERNIGHT PRODUCTION REPORT (2026-11-13)
Environment: headless SwiftShader Chromium + Blender (bpy). Nothing is owner-approved. M2 NOT measured.

## Completed (verified by same-camera localhost render, no page errors)
- s12 shopping lane: Blender branch sprays + leaf masses form a dense overhead canopy (blue hour + heavy rain) — `evidence/s12_game_branches_*`.
- s08 courtyard: larger hero plane tree with Blender branch + leaf masses, brighter bench glow — `evidence/s08_game_hero_tree_bluehour.png`.
- s10/s11/s12 shop façades: window flower boxes — `evidence/s10_s11_game_flowerboxes_golden.png`.
- s05 lift lobby: lift leaves/frame toned from orange to champagne brass at golden hour — `lobby/s05_lift_champagne_golden.png`.
- s04 corrections (earlier): skyline massing, Blender roof kit, weather/time reflections, haze, waterfront, lamp reflections; s08/s12 Blender lanterns; string lights.
- Character system ready for Momo (registry, GLB loader, state machine, picker, fallback, technical placeholder); `npm run validate` passes (0 errors).

## Visual improvements / Blender work
Kits: lanterns, skyline roofs, branches + leaf puffs (assets/blender/make_*.py → src/baked/*.json). Docs: ROADMAP.md, OWNER_DECISIONS.md, CHECKLIST_STATUS.md.

## Partial
s12/s08 canopy dense but low-poly leaves; s05 pink/orange tuned but no floor reflection and faint sign; flower boxes procedural, not a Blender kit.

## NOT done this pass (open)
s06 floor reflections; s13/s14 per-room light balance; s15 wet-floor look and re-render; s01–03 audit; contact AO/soft shadows (C1); Blender masters for s10–s14; façade-module Blender kit; LOD for new foliage; weather×time matrix re-run for the newest scenes (only lane blue-hour+rain checked).

## Performance
Static triangles 548k (445k before; +Blender foliage, +flower boxes). Frame time unknown; owner M2 run required (`?bench=1`).

## Approval required (owner)
s04 visual approval; s07 canopy decision; M2 benchmark; final CHECKLIST confirmation; Momo model supply.

## Next production stage
Finish the open list above, then re-run the full weather×time matrix and walk tests, then owner audit.
