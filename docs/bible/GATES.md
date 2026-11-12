# Gates G1–G8 and the 18 absolute rules — honest walkthrough (2026-11-12)
Evidence is headless SwiftShader localhost + Blender (bpy) renders. Nothing here is owner-approved or M2-verified. "Open" means not satisfied yet.

| Gate | Status | Evidence | Open items |
|---|---|---|---|
| G1 layout/scale | Partly met | WORLD_SCALE_REPORT.md, S04_PROPOSAL.md (216×278 m approved by owner); capsule 1.54 m | s04 visual approval pending |
| G2 palette | Met in code/tests | PALETTE_AUDIT.md, CALIBRATION_REPORT.md | owner colour audit |
| G3 geometry/surface | Partly | per-env S*_STATUS.md; baked PBR slab/brick/ashlar/sett; Blender fountain, café, lobby, interior kits | s10–s12 façade modules, s11 shopfront interiors, s15 foliage |
| G4 lighting/shadows | Partly | baked neutral AO strips (faint), dynamic sun/lamps; s05 golden-hour overexposure | contact AO faint; no bloom/SSAO; s05 door |
| G5 continuity | Partly | s01–s15 sheets; skyline consistent s01/s02/s04 | per-env time-of-day matrix not complete for new spaces |
| G6 gameplay | Tested headless | lift round-trip, aisle collision scans, no page errors | full walk-through on owner's machine |
| G7 performance | NOT measured | PERF_BENCHMARK.md, ?bench=1 | owner runs M2 benchmark |
| G8 coverage | Partly | evidence sheets for all 15 | Blender masters for most envs; some AFTER comparisons only by sheet |

## Absolute rules
01 AFTER controls — followed, gaps logged per env · 02 one palette — yes · 03 localhost-checked — headless only · 04 no primitive architecture — mostly; some blocky skyline/foliage · 05 no oversized empty world — 216×278 m approved · 06 locations connect — yes (lift, lobby, courtyard, lanes, promenade) · 07 soft grounded shadows — partial (AO faint) · 08 no bloom excess — no bloom at all · 09 organic vegetation — improved, still blobby · 10 distinct materials — baked PBR per material · 11 no generic downloads replacing designs — in-house assets only · 12 playable — headless-tested · 13/14 corner refinements vs major changes — s07 blossom-canopy conflict and s04 await owner · 15 every area localhost-verified — headless · 16 not complete from Blender alone — respected · 17 s04 separate approval — proposal only, NOT approved · 18 identity from every viewpoint — not systematically tested.

Conclusion: NOT ready to sign off. Do not push until owner audit.
