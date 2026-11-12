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
2. Tree canopies still sparser than the dense overhead canopy in the target; fairy-light swags and wall lanterns now integrated (glow geometry, no extra real lights).
3. Burgundy-canopied glass pavilion and terrace seating now **integrated** (evidence: s15_pavilion_bluehour.png); seating now uses the Blender-made bistro tables and bentwood chairs; canopy densified (15 cards/tip); still missing hedges between trees.
4. Ivy now vine strands of small clumps (reads as climbing ivy); still prisms, not leaf cards.
5. Paving, brick, ashlar and sett now use Blender-baked albedo+normal sets (`bake_textures.py`); remaining:  no warm light pools on the stone from lamps/windows at blue hour.
6. Sky/river grade is cooler and less saturated than the target sunset; no bloom/halation (postprocessing absent).
7. Blender master: foliage still blobby, sky more saturated than target, windows blown-out.

## Next
Burgundy pavilion + café seating, denser canopy cards, interior depth behind glazing, Blender-baked neutral AO texture on the paving, owner M2 run.
