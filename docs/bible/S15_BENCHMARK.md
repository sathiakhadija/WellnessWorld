# S15 Riverside Promenade — benchmark environment log (2026-11-12)

Evidence: `evidence/s15_riverside_4way.jpg` (BEFORE p.65 / TARGET p.66 / LOCALHOST / BLENDER). Shots from headless SwiftShader at 960×540 — **not M2-verified, no performance claim**. No similarity score is given.

| Item | Status |
|---|---|
| Blender master (`assets/blender/make_promenade_master.py`, `src/promenade_master.blend`, render v4) | rendered |
| Game: landward brick frontage, lit shopfront glazing, upper windows, ivy clumps, uplit cornice, glow-edge planters, plane-tree row, lanterns | integrated, headless-viewed |
| Blender-baked slab albedo/normal + contact-AO decal | integrated, headless-viewed |
| Burgundy pavilion + seating | integrated, headless-viewed |
| Contact-AO strips (static, neutral) | integrated, effect very faint |
| Baked AO/PBR texture sets from Blender | planned |
| M2 benchmark | not run (owner) |

## Discrepancies vs TARGET (p.66)
1. Shopfront glass is a flat cream plane: no interior depth, mullions only, no warm interior props.
2. Tree canopies are too sparse/low-density compared with the dense overhead canopy; no fairy-light strings.
3. Burgundy-canopied glass pavilion and terrace seating now **integrated** (evidence: s15_pavilion_bluehour.png); seating reads as stumpy stools (tables/chairs need real Blender-made models); still missing wall-mounted lanterns, hedges between trees, fairy lights.
4. Ivy is blocky prisms (6-sided); needs leaf-card clusters.
5. Paving is the generic slab texture; no warm light pools on the stone from lamps/windows at blue hour.
6. Sky/river grade is cooler and less saturated than the target sunset; no bloom/halation (postprocessing absent).
7. Blender master: foliage still blobby, sky more saturated than target, windows blown-out.

## Next
Burgundy pavilion + café seating, denser canopy cards, interior depth behind glazing, Blender-baked neutral AO texture on the paving, owner M2 run.
