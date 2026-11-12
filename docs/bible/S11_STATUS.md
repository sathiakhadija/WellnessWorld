# s11 Opposite row (Maison Sauvage, Papier & Co.) — status: integrated, headless-viewed, NOT approved

Poses: (24,-85.2,90,π,-0.03,66) and (22,-85.2,96,π,-0.04,62), blue hour. Evidence: evidence/s11_sheet.jpg, s11_game_bluehour.png, s11_game_close.png.
Bible refs: p.47 (AFTER), p.48–49 (audit / Blender).

Implemented: separate forest-green (Maison Sauvage) and oxblood (Papier & Co.) shopfronts with awnings and readable brass-style signs; cream/red brick upper floors with sash windows, Juliet balconies with planters, wisteria on the first-floor balcony; street lamp, benches, path.
Gaps vs p.47: forecourt is lawn, not rain-sheened paving; windows dim (no layered displays/mannequins/bookshelf detail from inside); no white hydrangea/lavender bed along the frontage; no adjacent private doorway with steps/lanterns; no Blender-authored shopfront module; no reflective wet paving.
Status labels: planned→implemented→integrated; NOT visually verified by owner; performance untested on M2.

Tried (rejected): a row of low prism mounds as a hydrangea/lavender drift along the south hedge — read as regular faceted blocks, reverted. A proper fix needs a Blender-authored hydrangea/lavender cluster kit (organic leaf cards), not prisms.

UPDATE: Blender planting kit (assets/blender/make_plants.py -> src/baked/plants.json: cream/lilac hydrangea, lavender, leafy shrub; ~300–600 tris each) now drives (a) a hydrangea/lavender drift along the south hedge in front of the s11 row (evidence/s11_game_planting.png), (b) the s09 fountain apron ring (evidence/s09_game_planting.png), (c) the s08 path-spine beds (replaces the earlier prism clumps). Gaps: close-up blooms still read faceted; plant count raises static triangles (not re-measured); random-stream shift may have nudged downstream procedural variation (shop facade choices) — re-audit by owner. Status: integrated, headless-viewed only.
