# Asset provenance register (2026-11-12)

| Asset / set | Source | Licence | Status |
|---|---|---|---|
| Street textures (slab, sett, asphalt, grass, limewash, fabric, AO gradient) | Generated in code, `src/street/textures.js` | In-house, no third-party content | integrated, headless-verified |
| Props: lobby/café/bookshop furniture, globe, chandelier | Authored in Blender via `assets/blender/make_*.py`, baked to `src/baked/*.json` | In-house | integrated |
| Promenade master scene | `assets/blender/make_promenade_master.py` → `src/promenade_master.blend`, render `docs/bible/evidence/blender_s15_master.png` | In-house (procedural Blender shaders, Cycles) | rendered (Blender only, not yet integrated into the game) |
| Penthouse GLB | `public/wellness_world_penthouse_v8.glb` | Project asset | integrated |
| Baked slab albedo/normal, contact-AO decal | `assets/blender/bake_textures.py` (Cycles bake, procedural shader) → `public/textures/*.png` | In-house | integrated, headless-viewed |
| Baked brick albedo/normal (neutral grey, multiplied by façade colour) | `assets/blender/bake_textures.py` | In-house | integrated, headless-viewed |
| ambientCG / Poly Haven PBR sets | None used. Not reachable from this workspace's network allowlist | CC0 if the owner adds them | planned; drop into `assets/textures/incoming/` and register here |

Rule: no third-party asset enters the game without a row here recording source URL, licence and date.

## Planting kit (2026-11-12)
assets/blender/make_plants.py (in-house, Blender bpy) -> src/baked/plants.json: hydrangea x3 + lilac, lavender x2, shrub x2 (300–650 tris each). Cycles check render: evidence/blender_planting_kit.png (assets/blender/render_plants_kit.py). Honest assessment: blooms are subdivided jittered icospheres and lavender spikes are separated floret blobs — readable at street distance, crude close up; lavender stems do not visually connect to spikes. Replace with CC0 scans or a higher-detail Blender pass if the owner wants close-up fidelity. No third-party assets.
