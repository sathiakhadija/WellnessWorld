# Using the Wellness World palette (mandatory for every environment)

## Single source of truth
`src/palette/registry.src.json` → `node scripts/build_palette.mjs` → `src/palette/registry.json` (game) + `assets/palette/registry.json` (Blender). Each material: id `WW_*`, name, category, sRGB `hex` (+`alt`), generated `linear` RGB, roughness, metallic, normal/bump strength, procedural texture keys, environments, lighting notes, Bible page, `status` (`specified` = the p.72 table; `provisional` = section-specific anchor/estimate), `verified` (false until a localhost-vs-reference check is logged). **Never invent a colour the PDF doesn't give**: add it as `provisional` with a note, or list it in `gaps`.

## Game code
```js
import { ww, wwColor, wwEntry } from './palette.js'
const stone = ww('WW_LIMESTONE_CREAM')                      // shared MeshStandardMaterial, one per id (no duplicates)
const stoneWet = ww('WW_LIMESTONE_CREAM', { map: tex }, 'tex') // documented variant => separate cached material 'WW_LIMESTONE_CREAM:tex'
const c = wwColor('WW_BRICK_LONDON_RED', /*alt*/ true)         // THREE.Color for vertex colours / instancing
```
Colour space: hex is sRGB; `new THREE.Color(hex)` converts to linear once. Do not pre-linearise and do not apply a second gamma. Textures: colour maps `SRGBColorSpace`; roughness/normal/AO maps `NoColorSpace`.
Effects, UI, characters, sky presets and emissive lights are documented exceptions in `scripts/palette_exceptions.json` (add a reason when adding one).

## Blender
`exec(open('assets/blender/mat_lib.py').read()); mats = build_all()` builds Principled materials named `WW_*` from the same JSON (linear values fed directly; procedural brick/wood/stone/paving/fabric detail). Export GLB with materials intact, then **re-test the glTF in the game** — shader graphs don't export faithfully; bake what glTF can't carry.

## Audit (run before approving any area)
`node scripts/palette_audit.mjs` → `docs/bible/PALETTE_AUDIT.md`: registry validity, duplicate ids/colours, suspicious metal/roughness, ΔE2000-near duplicates, unregistered hex literals per file (with nearest registered colour), duplicate MeshStandardMaterial definitions, documented exceptions. Exit code 1 on registry errors.

## Calibration studio (benchmark)
- Localhost: `/?studio=calib&preset=neutral|golden|blue|interior_evening|overcast|rainy_evening` (`&labels=0` hides labels). Source `src/studio/Calibration.jsx`.
- Blender: `WW_ROOT=. python3.13 assets/blender/make_calibration.py [-- preset …]` → `docs/bible/calibration/blender_<preset>.png`, `assets/blender/calibration.blend`.
- Shots + compare: `node scripts/calib_shots.cjs` (needs the build on :4176) then `python3 scripts/calib_compare.py` → `docs/bible/CALIBRATION_REPORT.md` and `compare_<preset>.png`.
- Layout and lighting are shared data: `assets/palette/calib_layout.json` and `presets.json` (copied to `src/palette/`; keep in sync — copy after editing).

## Colour management (recorded)
| | Blender | Game (calibration studio) |
|---|---|---|
| View/tone map | AgX, look None, exposure = preset EV, gamma 1 | `THREE.AgXToneMapping`, exposure 2^EV |
| Output | sRGB display | `SRGBColorSpace` |
| Sun | strength S (irradiance) | DirectionalLight intensity = S (verified numerically: radiance = albedo·S·cosθ/π in both) |
| Sky/ambient | uniform World colour × strength | PMREM environment of the same uniform colour (also gives metal/glass reflections) |
| Lamps | point P watts | PointLight candela = P/(4π), decay 2 |
| Shadows | Cycles path tracing | PCF soft shadow map 4096 |
**Known, expected differences**: real-time has no sky occlusion / inter-reflection (shadows lighter, contact less dark), transmission glass is approximate, procedural texture detail exists only in Blender for now (game calibration tiles are flat colour; textures arrive per-environment). The in-game main scenes use ACES by default (`L.tm`) — compare environment screenshots against the references with the **same** tone-map as the reference render, not the calibration studio's.

## Rules
1. Pick materials from the registry; new colours enter via the registry.
2. Don't recolour approved environments en masse; use the audit's nearest-colour hints to migrate area by area and re-compare against the AFTER image.
3. Café violet/mauve stay café-only; burgundy ≠ pink; brass stays muted; no neon foliage.
