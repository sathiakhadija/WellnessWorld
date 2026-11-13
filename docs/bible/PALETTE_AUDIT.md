# Palette audit

Generated 2026-11-13T11:17:01.844Z — registry 39 materials.

## Registry checks
- ⚠️ WW_LIMESTONE_CREAM ≈ WW_MARBLE_LIGHT (ΔE2000 1.7) — consider merging
- ⚠️ WW_LIMESTONE_FACADE ≈ WW_LIMESTONE_FOUNTAIN (ΔE2000 2.0) — consider merging
- ⚠️ WW_LEATHER_OXBLOOD ≈ WW_SHOP_BURGUNDY (ΔE2000 1.2) — consider merging

## Unregistered colours in source (nearest registered colour, ΔE2000)
| file | distinct hex | unregistered uses | within ΔE<3 of registry |
|---|---|---|---|
| src/street/plan.js | 202 | 213 | 164 |
| src/street/buildings.js | 87 | 71 | 28 |
| src/street/interiors.js | 68 | 52 | 82 |
| src/Waterfront.jsx | 34 | 31 | 3 |
| src/street/props.js | 31 | 26 | 8 |
| src/street/facade.js | 34 | 23 | 11 |
| src/Skyline.jsx | 20 | 20 | 0 |
| src/Tree.jsx | 22 | 19 | 3 |
| src/street/Street.jsx | 15 | 13 | 2 |
| src/Plan.jsx | 18 | 12 | 13 |
| src/street/textures.js | 17 | 11 | 15 |
| src/lobbyTextures.js | 10 | 9 | 2 |
| src/PenthouseScene.jsx | 7 | 8 | 0 |
| src/Atmosphere.jsx | 4 | 4 | 0 |
| src/Lobby.jsx | 8 | 4 | 4 |
| src/characters/CharacterPicker.jsx | 2 | 1 | 1 |

Total unregistered colour uses: 517 (migrate area by area; do not bulk-recolour approved environments).

## Duplicate MeshStandardMaterial definitions
- none

## Gaps (values the Bible does not give)
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
