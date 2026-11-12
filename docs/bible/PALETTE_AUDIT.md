# Palette audit

Generated 2026-11-12T01:20:08.762Z — registry 34 materials.

## Registry checks
- ⚠️ WW_LIMESTONE_FACADE ≈ WW_LIMESTONE_FOUNTAIN (ΔE2000 2.0) — consider merging
- ⚠️ WW_LEATHER_OXBLOOD ≈ WW_SHOP_BURGUNDY (ΔE2000 1.2) — consider merging

## Unregistered colours in source (nearest registered colour, ΔE2000)
| file | distinct hex | unregistered uses | within ΔE<3 of registry |
|---|---|---|---|
| src/street/plan.js | 125 | 160 | 88 |
| src/street/buildings.js | 65 | 50 | 17 |
| src/street/props.js | 31 | 26 | 8 |
| src/street/facade.js | 34 | 24 | 10 |
| src/Tree.jsx | 22 | 19 | 3 |
| src/Waterfront.jsx | 14 | 14 | 0 |
| src/street/Street.jsx | 15 | 14 | 1 |
| src/Plan.jsx | 19 | 13 | 13 |
| src/street/textures.js | 16 | 13 | 9 |
| src/Skyline.jsx | 9 | 9 | 0 |
| src/PenthouseScene.jsx | 7 | 8 | 0 |
| src/Atmosphere.jsx | 4 | 4 | 0 |

Total unregistered colour uses: 354 (migrate area by area; do not bulk-recolour approved environments).

## Duplicate MeshStandardMaterial definitions
- none

## Gaps (values the Bible does not give)
- Blush plaster (private lift lobby, pp.17-18): no hex in the Bible; sample from the approved image before adding.
- Marble / dark veined stone (lift lobbies, p.19): no hex; sample from approved image.
- Water colour: not specified; derive from approved renders.

## Documented exceptions
- file src/HUD.jsx: UI chrome colours
- file src/HUDExtras.jsx: UI chrome colours
- file src/weather/Rain.jsx: effect: rain streak colour
- file src/weather/windowRain.js: effect shader
- file src/character/appearance.js: character creator is a separate workstream
- file src/character/buildCharacter.js: character creator is a separate workstream
- file src/companion/kittenAppearance.js: pets are a separate workstream
- file src/companion/buildKitten.js: pets are a separate workstream
- file src/Avatar.jsx: character avatar (separate workstream)
- file src/atmosphere.js: time-of-day sky/light presets (lighting, not material colours; registry covers only the blue-hour/dusk anchors)
- file src/Boats.jsx: small boats (layer B scenery) — migrate later
- file src/studio/Studio.jsx: look-dev studio
- #ffffff: neutral white (glow/UI/test)
- #000000: neutral black

**RESULT: registry valid (0 errors)**

## Wiring log
- 2024-… n/a. 2026-11-12: `src/Plan.jsx` fallback materials wired to the registry by hand (semantic matches only): stone→WW_LIMESTONE_FACADE, deckSide→WW_LIMESTONE_FACADE, floorBath→WW_LIMESTONE_CREAM, brass→WW_BRASS_ANTIQUE(alt), walnut→WW_WALNUT_DARK, walnutHi→WW_WALNUT_DARK(alt). Penthouse before/after pixel diff (golden preset, living/door/balcony views): walls/floor unchanged; only the brass door handle shifted (muted antique brass, per Bible "not bright yellow"); remaining differences = animated water/tree (noise baseline measured separately).
- Not wired (deliberately): GLB-supplied penthouse materials (WW_*_GAME, tuned by GRADE in PenthouseScene.jsx), street generators (`src/street/*` ≈ 400 hex literals) — migrate area-by-area with before/after checks as each environment is rebuilt; nearest-colour matches in `PALETTE_MIGRATION.md` are hints only (semantic mapping must be chosen by hand).
