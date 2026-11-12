# s04 World Scale — PROPOSAL (NOT visually approved)

Bible status: TECHNICAL DIRECTION APPROVED — FINAL VISUAL CORRECTION PENDING USER APPROVAL.
This document is a same-angle proposal for owner review. It must not be treated as approved.

Evidence (headless SwiftShader, not M2-verified):
- docs/bible/evidence/s04_world_scale.jpg — BEFORE (Bible p.13/14) vs LOCALHOST proposal
- docs/bible/evidence/s04_game_golden.png — balcony pose (2.9,1.55,-11.15, yaw .55, pitch -.14, fov 62), golden hour
- docs/bible/evidence/s04_game_backlook.png — balcony looking back along building

## Acceptance criteria (self-assessment, for owner to confirm)
| Criterion | Status |
|---|---|
| No exposed terrain / dark plane | Met in the captured view |
| Convincing riverbank / embankment | Partly: lit promenade line with trees visible; bank detail is simple |
| Legible skyline across water | Met: towers + low-rise district, window glow |
| Consistent with s01–s02 (glazing, balcony) | Met: same glass balustrade, tiles, sky |
| No disruption to doors/balcony/weather | Not regression-tested at all weathers for this pose |
| Visual match to approved AFTER image | UNVERIFIED — owner judgement required |

## Known gaps
- Skyline is blocky procedural massing; no Blender master for far skyline.
- Water has no reflection of skyline lights beyond sky tint.
- M2 performance untested.

Owner action: approve, or give correction notes against the sheet.
