# Audit V2 register (Batches 01–03, 40 pages) — status after the first reconstruction pass (2026-11-13)
Headless SwiftShader renders + Blender only; NOTHING owner-approved; M2 NOT measured. FIXED = changed and viewed in a same-camera localhost render; PARTIAL = improved, gap remains; OPEN = not touched.

## Batch 03 (world coherence, P0)
| ID | Finding | Cause | Status | Evidence |
|---|---|---|---|---|
| B03.06/07/09/10 | Raw olive plane / isolated towers around the penthouse | geometry: one 9000×4290 m plane + sparse bg buildings | FIXED | `evidence/audit_b03_nb_*.png`, `audit_b03_bal_e.png` (before). New near-bank district: perimeter blocks (skylineData.addNearBank), street-grid ground (NearBank.jsx), rain/night checked |
| B03.01 | Walkway/railing separated from water by an extra tiled strip | geometry: 5.4 m outboard apron beyond railing | FIXED | railing now at quay face (plan.js zq=-150); `audit_b03_pr_e.png` |
| B03.03/02 | Unreachable dark platform / detached deck | ferry pier with solid bronze rails read as a dark wall | PARTIAL: kept as an intentional, accessible pier lookout with open ironwork (`audit_b03_pr_pier2.png`); no benches/planters added on it yet |
| B03.05 | Dark-green wall at the promenade edge | one 15 m hedge slab | PARTIAL: broken hedge + scalloped crown (`audit_b03_pr_w3.png`); BOUNDS-edge green slabs elsewhere not re-audited |
| B03.04 | Repetitive riverfront | composition | OPEN (flower boxes/cafés exist; no new façade variety on the frontage) |
| B03.08 | Bedroom window view | composition | OPEN: near-field now city instead of plane, but the bedroom camera was not re-rendered |
## Batch 02 (interiors/gardens)
| 12 Café interior | empty counter, cuboids | FIXED/PARTIAL: Blender cake stands, till, menu stand, grinder, cups (`audit_b02_cafe_ctr.png`); ceiling still peach-warm |
| 13/17 façade & glazing | open apertures from inside | FIXED/PARTIAL: shop glass now double-sided/0.2 opacity; no operable doors/rain exclusion re-tested |
| 15 Library lounge | chairs/boxy | OPEN (not re-oriented/remodelled) |
| 16 Library shelves | cuboid display, bright chandelier | PARTIAL: Blender book stacks + open book, calmer chandelier (`audit_b02_lib_isl.png`); books on shelves still flat bars |
| 11/14 Fashion street shops | window displays, signage | PARTIAL: flower boxes + canopy; no mannequins/products |
| 18–20 Park/promenade/garden | flat lawn, repeated rhythm | OPEN |
## Batch 01
| 09/10 Fountain | no visible water | FIXED/PARTIAL: GPU droplet arcs + ripple rings (`audit_b01_fountain_water.png`); no sound; stone grain/wet edges not done |
| Camera/avatar | large, clips viewport | FIXED/PARTIAL: follow rig dist 3→4.4, pivot higher, FOV 54 (`audit_b01_follow_camera_*.png`); no settings sliders |
| 03/04/05 Lobby/vestibule | orange, geometric planters | PARTIAL: lift leaves champagne (earlier pass); planters/trees not rebuilt |
| 08 Vehicles | generic cars | OPEN |
| Settings hub, rain splashes/audio, indoor rain checks, minimap heading | cross-system | OPEN |
| 01 Penthouse door/parquet scale | OPEN (re-audit) |
## Not yet verifiable here
Entrance/lift/door open-close behaviour needs runtime video; M2 FPS; screenshot-only items marked "verify" in the audit.

## Update — library lounge & bedroom window
- B03.08 bedroom window: PARTIAL — window now shows city with river glimpse (evidence: audit_b03_bedroom_window_golden.png). Not M2-verified.
- Library lounge chairs: PARTIAL — chairs angled toward each other and the lamp, gallery frames added above (evidence: audit_b02_library_lounge_chairs.png). Shelf book spines and lounge remodel still open. Not owner-approved.

## Update — fashion-street window displays
- Shopfront displays: PARTIAL — Blender kit `assets/blender/make_shop_props.py` (mannequins ×3 silhouettes, handbag, shoe riser → `src/baked/shop_props.json`); boutique windows (Maison Sauvage, Atelier Bordeaux) now carry mannequins + folded-garment shelves; goods theme now follows the sign (a boutique no longer shows books). Evidence: audit_b02_shop_window_mannequins.png. Overhead clutter reduction, per-shop distinct façades and other shop types' goods still open. Not M2-verified, not owner-approved.

## RESHAPE 1 — North park (great lawn) — PARTIAL (first reshape pass, not approved)
Before: one empty 100 m lawn, two straight walks, sparse trees (reshape_park_topdown_before.png). After: four meandering gravel loops joining the cross/axial walks, bandstand pavilion on a raised sett dais with lit underside, three wildflower meadow rooms, seven layered tree groves, benches at path bends (reshape_park_*.png). Still open: pond/water feature, perimeter treatment of the parcel edge, tree variety. Not M2-verified.

## RESHAPE 2 — Organic flowers (owner: "a flower should look like a proper flower") — PARTIAL
New Blender kit `assets/blender/make_flowers.py` → `src/baked/flowers.json`: curved double-sided petals with width profile, cup and bend (daisy, cosmos, tulip, rose spiral, 4-petal hydrangea florets, lavender whorls), tapered curved stems, folded/curved leaves. Wired through `plantAt` (kinds h p l r d t c) in the park meadows and bench beds. Evidence: reshape_flowers_*.png. OPEN: roses not yet inspected at close range, shrubs/trees/grass still old blob models, other districts still use few flower kinds. **Triangle budget risk:** street static total measured ~1.36M tris in headless (was 548k at last benchmark); gardens 486k. Needs LOD/instancing/density cut before the owner's M2 run — NOT verified on M2.

## RESHAPE 3 — Organic street props (car, shrub, grass, bicycle) — PARTIAL
`assets/blender/make_street_organic.py` → `src/baked/street_organic.json`: lofted rounded car (superellipse sections, tyres + rims, glasshouse, lights, mirrors; one body shape, tinted per instance), leafy shrub mound from ~100 curved leaves, curved grass blades, bicycle with tubular frame/spoked wheels/basket. Wired via props.js. Evidence: reshape_car_organic.png, reshape_shrub_grass_organic.png. OPEN: only one car silhouette (needs hatchback/saloon/van variants), clipped hedges and topiary still primitive, tri budget unmeasured on M2.
