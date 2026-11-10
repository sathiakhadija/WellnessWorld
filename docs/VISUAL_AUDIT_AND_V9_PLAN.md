# Wellness World – Visual audit of the browser build and V9 plan

Method: same camera as Blender CAM1 (pos 0, 1.7, −0.4 · yaw 15.4° · 48.8° vertical FOV) rendered in the browser (headless Chromium, software WebGL), compared with the reference image and the Blender V8 render. Region luminance = mean of 0.2126 R + 0.7152 G + 0.0722 B on the 0–1 display image.
Figure: `docs/screens/cam1_reference_blender_browser.png` (A reference · B Blender V8 · C browser now · D browser with dome colour-space fix). Interior angles: `docs/screens/01…11_*.png`.

## 1. What is actually in the GLB
| Item | Finding |
|---|---|
| Geometry | 17 meshes, 9.4 k triangles, 1.5 MB. Architecture matches Blender (walls, coffers, fluted panels, sconces, cove, downlights, glazing, balustrade, tree). **Geometry is not what is missing.** |
| Materials | 25 PBR materials, **24 are flat colour factors**. Only the floor has textures (3 × 2048² JPEG: albedo, roughness, normal). Walls, ceiling, trim, doors, stone: single flat colours, **no UVs** (only the floor quad has TEXCOORD_0). |
| Lights / cameras | **None exported** (area lights and the sun do not survive glTF). All lighting is re-invented in `PenthouseScene.jsx`. |
| Emissive | 4 materials (cove, downlights, sconces, "exterior glow" boxes in the doorways) with `KHR_materials_emissive_strength`. No bloom/post, so they read as white shapes, not light sources. |
| Skyline, river, towers | **Not in the GLB at all.** They exist only as pixels in `wellness_world_skyline_dome.jpg` (4096×2048, 11.4 px/°, LDR JPEG, sun clipped at 1.0, no depth/parallax). |
| Baked light | None. No AO, no lightmap, no GI in any texture. |
| Adjoining rooms | 11 flat-colour boxes behind the doorways (no doors, no marble/mirror detail, white emissive rectangles). |
| Player / cat | Capsule placeholder. Cat exists only as a spawn marker. |

## 2. What was lost between Blender and the browser (cause → effect)
1. **Global illumination.** Blender bounces warm sun off the floor onto walls/ceiling. The browser has direct light + a violet hemisphere light + the dome as IBL, nothing else. Ceiling 0.23 vs 0.34 (Blender) / 0.45 (reference); RGB (0.28, 0.21, 0.29) = dark violet vs warm (0.57, 0.42, 0.35).
2. **Sun shadows are broken (measured, fixable).** The sun's shadow camera covers only ±5 m around the world origin, and the glass meshes cast opaque shadows (shadow maps ignore transparency). Result: no sun patches or mullion shadow bands. Experiment (`docs/screens/experiment_sun_shadow_fix_before_after.png`): glass `castShadow=false`, sun target moved to the room centre, frustum ±14 m, 4096 map → sconce shadow and sun shafts across the floor appear. It does **not** fix the overall look on its own (floor 0.41 → 0.44, ceiling unchanged).
3. **Procedural shaders.** Wood grain waves, plaster variation, façade windows, water: only the floor was baked. Everything else is a flat colour factor.
4. **Reflections.** Blender ray-traces window reflections in the glossy floor. The browser only has the (blurry, LDR) dome as environment: no floor reflections, bronze frames read as black.
5. **Colour management.** Blender: AgX "Medium High Contrast", exposure −0.6. Browser: ACES Filmic, exposure 0.9. Different curves and hue behaviour.
6. **Skyline.** Blender renders 3D towers (≈10° tall at CAM1). The dome carries them at ≈3° tall in the browser view, with no parallax when you walk, and no emissive window glow.
7. **Hypothesis tested and rejected:** I suspected drei loaded the sRGB dome as linear data (pale sky). Rendering with an explicit sRGB texture gave an almost identical image (sky 0.58 vs 0.59), because drei decodes JPEGs through its HDR-JPEG loader. The pale sky is the lighting/exposure, not a colour-space bug.

## 3. Measured gap (CAM1 framing)
| Region | A Reference | B Blender V8 | C Browser now | After sun-shadow fix only |
|---|---|---|---|---|
| Floor (right half) luminance | 0.53 | 0.55 | **0.41** | 0.44 |
| Floor mean RGB | .68 .50 .45 | .66 .51 .51 | **.47 .39 .39** | – |
| Ceiling luminance | 0.45 | 0.34 | **0.23** | 0.23 |
| Ceiling mean RGB | .57 .42 .35 | .50 .31 .23 | **.28 .21 .29** | – |
| Left wall luminance | 0.60 | 0.67 | 0.68 | 0.67 |
| Sky through glazing | 0.65 | 0.60 | 0.58 | – |
| Tallest tower, apparent height | ≈10° | ≈10° | **≈3°** | – |

## 4. Top differences versus the reference (visual comparison, in priority order)
1. **Light quality**: warm sun-washed honey floor with bold diagonal shadow bands; browser floor is mauve-grey and shadowless.
2. **Ceiling/cove**: reference has a warm glowing cove that spills light on the ceiling; browser ceiling is dark violet and the cove is a white-lilac strip.
3. **Skyline**: reference towers (One Canada Square pyramid, Citi, HSBC, Barclays) fill the glazing with glowing windows and golden river reflections; browser has a thin low strip of tiny blocks.
4. **Floor material**: glossy, reflective, warm; browser is matte.
5. **Walls/doors**: reference walls have light gradients and window-light patches, doors reveal lit rooms (marble bath); browser walls are flat pink/mauve and the rooms behind doors are empty boxes.

## 5. Skyline: replace, not adjust
Adjusting the dome cannot give parallax, correct tower scale at 4096 px, or emissive windows. **Replace** with (a) real low-poly towers exported from the Blender scene as a separate skyline GLB (hero towers + mid layer + far layer, baked emissive window atlas, distance fog), (b) a sky-only HDR dome (OpenEXR/RGBE, real sun intensity) for clouds and image-based light, (c) a river plane with a sun-glint shader and reflected skyline.
**Honest recognisability:** from silhouette alone (pyramid cap, tower spacing, Thames bend) it can read as Canary Wharf to a Londoner; it will not be photographic. Legible brand signage is optional and a separate decision.

## 6. Missing elements
- Versus the **reference**: avatar and cat (placeholder only), door leaves/jambs with lit rooms behind, thinner bronze window frames (ours are heavy and black).
- The reference room itself is **empty**. Furniture, rugs, art, curtains are not "missing" from the reference; they would be new design decisions (see phase 6).

## 7. Prioritised V9 plan
| # | Phase | Work | Where | Impact | Risk |
|---|---|---|---|---|---|
| 0 | Quick correctness fixes | Sun target/frustum, glass castShadow=false, drop violet hemisphere light, AgX tone mapping, exposure re-tune against the CAM1 table | browser code | Medium (days → hours) | Low |
| 1 | **Lighting as a baked system** | Cycles bake of direct+indirect light into lightmaps for walls/ceiling/trim/floor (needs lightmap UVs), cove spill, sun patches; runtime keeps one soft sun for the avatar/cat. Warm ivory, bounced gold. | Blender + loader | **Very high** | Medium (UV2 + bake time) |
| 2 | **Skyline replacement** | Section 5 | Blender + loader | **Very high** | Medium |
| 3 | Floor reflections | `MeshReflectorMaterial` (blurred planar reflection, roughness-map driven) or baked reflection streaks | browser | High | Medium (cost on Safari/Metal: needs measuring) |
| 4 | Materials | UV-unwrap walls/ceiling, plaster normal/roughness, bronze frames re-modelled thinner, brass/marble PBR with a proper HDR environment | Blender | Medium-high | Low |
| 5 | Doors and adjoining rooms | Door leaves, marble bathroom with its own baked light, mirror | Blender | Medium | Low |
| 6 | Characters and set dressing | Avatar + cat (rigged GLB), optional furniture/art once you decide the design | assets | Medium | Needs decisions |
| 7 | Delivery | `gltf-transform optimize` (Draco/meshopt, WebP/KTX2), code-splitting (bundle is 3.2 MB), budgets: ≤ 15 MB download, ≤ 60 draw calls, 60 fps on M-series Safari | tooling | – | Low |

**Acceptance (measured, same CAM1 method):** floor luminance 0.50–0.58 and R>G>B warm ratio close to the reference; ceiling ≥ 0.40 and warm; tallest tower ≈ 9–11°; visible sun shadow bands on the floor; no console errors; frame rate recorded on a real GPU.

## 8. Not verified
Blender 5.2.3 compatibility (script tested on bpy 5.3), Safari/Metal rendering and frame rate, real trackpad pinch/scroll behaviour in Safari, shadow/reflection cost on a real GPU, all V9 effort estimates.
