# Blender vs localhost calibration comparison

ΔE2000 between same-position 9×9 means. Diagnostic only (renderers differ in GI, specular, shadows). Exposure/tone-map: AgX both (see localhost_info.json).

## neutral
- swatch mean ΔE2000 **3.3** (max 7.4); colour-checker mean **3.5**; floor ΔE 2.7

| patch | Blender RGB | localhost RGB | ΔE2000 |
|---|---|---|---|
| swatch:WW_BRICK_RED_DEEP | (158, 127, 117) | (158, 109, 96) | 7.4 |
| swatch:WW_FOLIAGE_FOREST | (79, 98, 74) | (98, 116, 89) | 6.9 |
| swatch:WW_FOLIAGE_SAGE | (113, 131, 104) | (132, 143, 123) | 6.3 |
| swatch:WW_BRICK_LONDON_RED | (168, 142, 132) | (161, 125, 113) | 6.1 |
| cc:14 | (183, 84, 84) | (188, 104, 102) | 5.9 |
| cc:12 | (78, 94, 162) | (93, 109, 172) | 5.4 |
| swatch:WW_FOLIAGE_OLIVE | (130, 139, 96) | (143, 152, 117) | 5.3 |
| cc:0 | (133, 102, 90) | (143, 116, 104) | 5.1 |
| cc:9 | (111, 86, 127) | (124, 100, 138) | 5.1 |
| swatch:WW_VIOLET_CAFE | (92, 73, 111) | (106, 87, 125) | 4.9 |

## golden
- swatch mean ΔE2000 **3.8** (max 10.2); colour-checker mean **6.0**; floor ΔE 5.0

| patch | Blender RGB | localhost RGB | ΔE2000 |
|---|---|---|---|
| cc:8 | (148, 53, 36) | (175, 86, 70) | 10.4 |
| swatch:WW_FOLIAGE_SAGE | (74, 62, 32) | (108, 90, 54) | 10.2 |
| cc:21 | (95, 68, 48) | (124, 94, 71) | 9.4 |
| cc:11 | (167, 93, 9) | (180, 117, 64) | 9.2 |
| cc:14 | (138, 36, 16) | (164, 65, 51) | 8.9 |
| cc:2 | (80, 70, 67) | (106, 95, 89) | 8.8 |
| cc:15 | (175, 116, 22) | (187, 140, 77) | 8.7 |
| cc:5 | (86, 105, 73) | (108, 125, 94) | 8.0 |
| swatch:WW_FLOWER_OFFWHITE | (169, 131, 101) | (188, 155, 128) | 7.8 |
| cc:17 | (35, 73, 68) | (48, 95, 88) | 7.2 |

## blue
- swatch mean ΔE2000 **3.8** (max 7.9); colour-checker mean **5.1**; floor ΔE 3.5

| patch | Blender RGB | localhost RGB | ΔE2000 |
|---|---|---|---|
| swatch:WW_BRICK_RED_DEEP | (63, 47, 51) | (69, 36, 36) | 7.9 |
| cc:11 | (155, 98, 24) | (162, 114, 62) | 6.7 |
| cc:6 | (147, 74, 24) | (157, 93, 54) | 6.5 |
| cc:15 | (163, 123, 26) | (169, 136, 71) | 6.4 |
| cc:17 | (11, 83, 99) | (36, 100, 117) | 5.9 |
| swatch:WW_LIMESTONE_FOUNTAIN | (103, 99, 103) | (118, 114, 119) | 5.9 |
| cc:8 | (136, 56, 60) | (149, 75, 77) | 5.8 |
| swatch:WW_CEILING_CREAM | (109, 103, 110) | (123, 118, 123) | 5.6 |
| cc:10 | (113, 114, 38) | (126, 126, 64) | 5.6 |
| cc:21 | (95, 81, 76) | (110, 96, 93) | 5.6 |

## interior_evening
- swatch mean ΔE2000 **3.8** (max 7.9); colour-checker mean **3.4**; floor ΔE 4.7

| patch | Blender RGB | localhost RGB | ΔE2000 |
|---|---|---|---|
| swatch:WW_FOLIAGE_OLIVE | (120, 101, 32) | (135, 120, 65) | 7.9 |
| swatch:WW_FOLIAGE_SAGE | (100, 90, 39) | (122, 108, 64) | 7.5 |
| swatch:WW_FOLIAGE_FOREST | (67, 63, 24) | (86, 83, 36) | 6.6 |
| swatch:WW_MAUVE_CAFE | (140, 73, 73) | (152, 91, 91) | 6.1 |
| swatch:WW_LIMESTONE_FOUNTAIN | (167, 125, 80) | (174, 140, 104) | 5.6 |
| cc:11 | (239, 188, 149) | (244, 203, 156) | 5.6 |
| swatch:WW_LIMESTONE_PROMENADE | (151, 110, 69) | (158, 124, 91) | 5.6 |
| cc:12 | (127, 110, 144) | (138, 124, 154) | 5.4 |
| neutral:black | (127, 95, 62) | (136, 109, 80) | 5.4 |
| cc:23 | (135, 103, 68) | (144, 116, 87) | 5.3 |

## overcast
- swatch mean ΔE2000 **3.1** (max 6.8); colour-checker mean **4.8**; floor ΔE 4.7

| patch | Blender RGB | localhost RGB | ΔE2000 |
|---|---|---|---|
| swatch:WW_BRICK_RED_DEEP | (110, 86, 82) | (115, 73, 66) | 6.8 |
| swatch:WW_FOLIAGE_OLIVE | (86, 97, 67) | (103, 115, 87) | 6.8 |
| swatch:WW_FOLIAGE_SAGE | (73, 90, 74) | (93, 107, 93) | 6.8 |
| swatch:WW_FOLIAGE_FOREST | (51, 66, 54) | (64, 83, 64) | 6.3 |
| cc:6 | (157, 98, 47) | (164, 114, 73) | 6.1 |
| cc:17 | (28, 107, 132) | (57, 122, 144) | 5.9 |
| cc:13 | (60, 111, 66) | (81, 125, 82) | 5.7 |
| cc:8 | (144, 77, 85) | (154, 94, 101) | 5.6 |
| cc:21 | (93, 96, 101) | (108, 111, 116) | 5.6 |
| cc:16 | (137, 80, 123) | (148, 96, 134) | 5.5 |

## rainy_evening
- swatch mean ΔE2000 **2.9** (max 7.0); colour-checker mean **5.2**; floor ΔE 1.4

| patch | Blender RGB | localhost RGB | ΔE2000 |
|---|---|---|---|
| cc:11 | (157, 90, 1) | (165, 108, 53) | 7.3 |
| swatch:WW_BRICK_RED_DEEP | (40, 25, 23) | (43, 13, 9) | 7.0 |
| cc:15 | (168, 117, 13) | (173, 132, 66) | 6.7 |
| cc:6 | (147, 68, 5) | (159, 86, 44) | 6.5 |
| cc:10 | (114, 105, 10) | (127, 119, 50) | 6.3 |
| cc:17 | (22, 74, 71) | (29, 92, 89) | 6.1 |
| cc:8 | (138, 49, 37) | (153, 69, 59) | 6.0 |
| cc:14 | (133, 33, 17) | (149, 53, 42) | 6.0 |
| cc:20 | (132, 104, 80) | (142, 119, 98) | 5.8 |
| cc:16 | (141, 54, 67) | (153, 74, 86) | 5.7 |


## Summary and findings
- Six presets rendered in both Blender (Cycles, AgX) and localhost (three.js, AgX) from one shared layout/lighting table; side-by-side images `compare_<preset>.png`; per-patch ΔE2000 above.
- First comparison had ΔE ≈ 11–14 (localhost far too bright): root cause = wrong light-unit assumption (π factor on the sun). Fixed with a numerical check; residual ΔE ≈ 3–6 is renderer GI/shadow difference (no sky occlusion in the real-time scene) and strongly coloured presets (golden) — **diagnostic evidence, not visual approval**.
- Worst patches are saturated mid-tones under the golden preset (ΔE up to ~10): the game is lighter/less contrasty in shadow. Not corrected by recolouring materials (would break the palette); corrected by lighting in the actual game scenes when each environment is compared with its reference.
- Not yet covered: textured materials in the game calibration scene, real GLB export round-trip, in-game environment materials (next: wire the registry into Plan.jsx/Street.jsx area by area).
