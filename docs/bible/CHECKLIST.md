# FINAL SIGN-OFF CHECKLIST (owner's master list — confirm every line with evidence before declaring completion)
Status legend: [ ] not started · [~] implemented, not verified · [T] tested · [V] visually verified with image(s) · [B] blocked (see DEFECTS.md)
Rule: no line may be ticked from code alone. Evidence = file path of localhost screenshot / Blender render / test log.

## PART 1 — 15 ENVIRONMENTS
### 01 Penthouse panoramic windows (unfurnished, no indoor tree, no bunny in the comparison view)
[ ] floor-to-ceiling glazing [ ] slim champagne-bronze frames, no thick black grids [ ] uninterrupted skyline [ ] refined glass corners [ ] modelled frames/sills/thresholds [ ] functional balcony doors [ ] subtle bevels [ ] smooth ceiling coves [ ] concealed warm lighting
[ ] herringbone timber, correctly scaled planks, grain variation, soft reflections [ ] believable glass [ ] warm interior
[ ] recognisable Canary Wharf towers [ ] architectural depth [ ] varied lit windows [ ] realistic proportions [ ] atmospheric depth [ ] sunset lighting [ ] credible Thames reflections
### 02 Balcony & waterfront
[ ] connected to penthouse [ ] consistent glazing [ ] elegant railings, realistic thickness [ ] correct floor-to-balcony transition [ ] proper depth [ ] no intersecting geometry [ ] Thames at believable scale [ ] waterfront consistent with interior view [ ] skyline consistent across cameras [ ] atmospheric distance [ ] believable reflections [ ] no endless black/empty horizon [ ] no unapproved furniture in reference view
[ ] VERIFY skyline does not move when walking living room → balcony
### 03 Wall-side interior (restrained, no ornament)
[ ] clean wall architecture [ ] proportioned doors [ ] wall thickness [ ] refined skirting/trim [ ] consistent ceiling height [ ] smooth ceiling-wall transitions [ ] warm neutral walls [ ] no crude rectangles [ ] no clutter [ ] consistent flooring [ ] soft indirect light [ ] functional doors/room connections
### 04 World scale & boundaries (technical direction approved; visual correction NOT approved; needs same-angle localhost screenshot + owner approval)
[ ] metres [ ] measure character/architecture [ ] eye height [ ] doorway proportions [ ] building heights [ ] street widths [ ] courtyard dimensions [ ] river width/waterfront scale [ ] camera FOV [ ] geometry-vs-camera diagnosis
[ ] master coordinate system [ ] shared ground elevation [ ] annotated top-down map [ ] playable vs decorative [ ] relative positions preserved
[ ] Layer A playable [ ] Layer B nearby scenery [ ] Layer C distant skyline
[ ] no endless dark terrain [ ] no exposed edges [ ] no abrupt water boundary [ ] no oversized empty roads [ ] no horizon seams [ ] boundaries hidden by architecture/landscape [ ] compact walkable proportions
### 05 Private lift lobby (private vestibule, NOT the public lobby)
[ ] compact vestibule [ ] premium finishes [ ] correct lift proportions [ ] refined lift doors [ ] matching frames [ ] panelling [ ] soft lighting [ ] flooring transitions [ ] functional controls [ ] functional doors [ ] collision [ ] correct connection to penthouse [ ] materials consistent with ground lift
### 06 Ground-floor public lobby
[ ] larger elegant lobby [ ] consistent with private lift [ ] premium reception [ ] refined floor/walls [ ] decorative lighting [ ] correct entrance/exit [ ] functional lift [ ] synchronised door animations [ ] correct arrival position [ ] walking clearances [ ] furniture collision [ ] readable prompts [ ] coherent transition to courtyard
[ ] VERIFY going downstairs leads here, not a duplicate of the private vestibule
### 07 Building entrance
[ ] modelled exterior entrance [ ] elegant glazing [ ] consistent proportions [ ] refined frames [ ] threshold [ ] authentic London materials [ ] warm exterior light [ ] entrance landscaping [ ] real depth [ ] functional doors [ ] collision/navigation [ ] seamless to courtyard [ ] no interior/exterior discontinuity
### 08 London courtyard (green canopy, not pink)
[ ] mature natural-green trees [ ] organic branching [ ] varied silhouettes [ ] green variation [ ] maintained planting [ ] planters/boundaries [ ] believable grass [ ] no pink dominance
[ ] cohesive residential façades [ ] authentic brick/stone [ ] refined windows [ ] depth [ ] paving [ ] seating/furniture [ ] consistent dimensions
[ ] warm lighting [ ] tree shadows [ ] soft indirect [ ] layered greenery [ ] pedestrian scale [ ] no huge empty tiled areas
### 09 Fountain & garden (same courtyard as 08)
[ ] pale-stone tiered fountain [ ] modelled geometry [ ] basin proportions [ ] stone texture [ ] animated water [ ] believable movement [ ] controlled reflections [ ] water sound [ ] soft lighting [ ] landscaping [ ] consistent with 08 [ ] no excessive flowers [ ] edge collision [ ] no water-plane seams [ ] correct position
### 10 Boutique & café streetscape (Maison Home, Café Vivienne)
[ ] correct positions [ ] London boutique architecture [ ] shopfront glazing [ ] entrance doors [ ] cornices/trim [ ] signage [ ] warm display lighting [ ] interior depth [ ] window displays [ ] pavement proportions [ ] cohesive paving [ ] landscaping [ ] lanterns [ ] relationship to courtyard [ ] no flat façade images
### 11 Opposite-side row (Maison Sauvage, Papier & Co.)
[ ] opposite positions [ ] consistent street width [ ] harmony with 10 [ ] distinct identities [ ] storefront geometry [ ] entrances [ ] signage [ ] window illumination [ ] interior depth [ ] authentic materials [ ] landscaping [ ] street furniture [ ] sightlines
[ ] VERIFY looking back down the street shows same buildings in correct positions
### 12 Shopping street
[ ] pedestrian-scale [ ] continues boutique rows [ ] varied harmonious shopfronts [ ] premium detail [ ] brick/stone [ ] pavement [ ] greenery [ ] warm lighting [ ] street furniture [ ] storefront displays [ ] not too wide [ ] no tunnel street [ ] no repeated identical buildings [ ] navigation [ ] transitions into interiors
### 13 Café Violette (violet is café-only)
[ ] functional entrance [ ] explorable interior [ ] approved layout [ ] violet/mauve accents [ ] warm materials [ ] furniture [ ] counters/displays [ ] fixtures [ ] soft shadows [ ] fabric/timber [ ] glass reflections [ ] depth [ ] furniture collision [ ] door transitions [ ] exterior consistency
### 14 The Quiet Page (opposite Café Violette; NO FLOWERS)
[ ] dark walnut cases [ ] rich timber [ ] burgundy/oxblood seating [ ] antique brass [ ] reading lights [ ] reading corners [ ] organised shelving [ ] book displays [ ] flooring [ ] interior detail [ ] cosy lighting [ ] soft shadows [ ] material depth [ ] inviting spaces [ ] premium identity [ ] NO flowers [ ] functional entrance [ ] explorable [ ] collision [ ] navigation [ ] position opposite Café Violette
### 15 Riverside promenade
[ ] stone paving, patterns/borders [ ] layered mature trees [ ] greenery [ ] architectural planters [ ] black/brass lanterns [ ] light pools [ ] benches [ ] burgundy seating [ ] glass café pavilion/conservatory [ ] terrace [ ] burgundy umbrellas [ ] outdoor tables [ ] ivy brick wall [ ] framed London artwork [ ] wayfinding [ ] landscaping [ ] Thames visible [ ] consistent skyline [ ] pedestrian scale [ ] no endless flat grey path [ ] no repeated trees [ ] no abrupt empty terrain

## PART 2 — MASTER PALETTE
Values (provisional sRGB): cream limestone #E8DDCF/#F2E8DB · London brick #8B5E50/#A97465 · dark walnut #38261F/#4A3128 · antique brass #B58A4D/#C5A06A · burgundy #603345/#723E50 · café violet #4B2E5C · greens #64765A/#536E4C · paving #B5ADA8/#C7BEB4 · blue-hour #858CAA/#A29AB6 · warm practicals 2700–3000 K
[ ] extract colours from PDF [ ] specified vs estimated marked [ ] one canonical registry [ ] sRGB stored [ ] linear conversion [ ] named families [ ] Blender linked [ ] game linked [ ] duplicates removed [ ] unregistered colours detected [ ] exceptions documented [ ] consistent across locations [ ] verified under presets [ ] localhost compared to approved images
Rejects: [ ] no neon foliage [ ] no orange brick [ ] no fluorescent brass [ ] no global pink [ ] no global purple [ ] no washed-out beige [ ] no oversaturation [ ] no plastic stone [ ] no uniform gloss [ ] no crushed shadows [ ] no overbright emissives
[ ] perceived colour matched in game, not only hex

## PART 3 — CALIBRATION STUDIO
[ ] Blender scene [ ] localhost scene [ ] every material labelled [ ] flat swatches [ ] spheres [ ] architectural samples (stone/brick/timber/brass/paving) [ ] glass & reflective [ ] foliage [ ] roughness comparisons [ ] white/grey/black [ ] colour checker [ ] shadow objects
Presets: [ ] neutral daylight [ ] golden hour [ ] blue hour [ ] warm interior evening [ ] overcast [ ] rainy evening
[ ] matched cameras [ ] locked exposure [ ] colour transforms documented [ ] texture colour spaces checked [ ] Blender vs localhost [ ] perceptual differences (CIEDE2000, diagnostic) [ ] discrepancies recorded [ ] inconsistencies corrected [ ] automated palette audit [ ] final swatch report
GATE: no large-scale material replacement before the shared material system is tested.

## PART 4 — BLENDER MODELLING
Geometry: [ ] real dimensions [ ] consistent scale [ ] bevels [ ] weighted normals [ ] clean topology [ ] wall thickness [ ] window recesses [ ] cornices/trims [ ] appropriate subdivision [ ] no intersections [ ] no floating elements [ ] no primitive cubes [ ] no stretching [ ] no exaggerated proportions
Materials: [ ] PBR [ ] base colour [ ] roughness [ ] metallic [ ] subtle normals [ ] UVs [ ] texture scale [ ] variation [ ] grain direction [ ] brick/mortar scale [ ] paving joints [ ] fabric texture [ ] no baked lighting in base colour
Production: [ ] modular components [ ] reusable materials [ ] instancing [ ] Geometry Nodes where useful [ ] seeded variation [ ] non-destructive [ ] trim sheets [ ] atlases where useful [ ] normal baking [ ] organised collections [ ] descriptive names [ ] reusable scripts [ ] editable .blend masters

## PART 5 — LIGHTING, SHADOWS, ATMOSPHERE
[ ] shared presets [ ] consistent sun [ ] sky illumination [ ] warm architectural lights [ ] cool blue-hour fill [ ] soft indirect [ ] controlled contrast [ ] practical placement [ ] reflections [ ] no arbitrary changes between connected scenes
Shadows: [ ] soft edges [ ] contact shadows [ ] tree [ ] furniture [ ] no floating [ ] no jagged [ ] no acne [ ] no detached [ ] no light leaks [ ] no black AO halos
Post: [ ] tone mapping [ ] exposure [ ] contrast [ ] subtle bloom [ ] atmospheric perspective [ ] restrained haze [ ] no blur [ ] no exaggerated DoF [ ] no overexposure
[ ] softness from lighting/materials/geometry, not blur

## PART 6 — TREES, FOLIAGE, LANDSCAPING
[ ] natural branching [ ] organic canopies [ ] multiple leaf sizes [ ] layered clusters [ ] green variation [ ] bark [ ] translucency [ ] leaf movement [ ] varied silhouettes [ ] density [ ] plant scale [ ] natural grass [ ] planters [ ] no repeated identical trees [ ] no spherical canopies [ ] no billboards [ ] no tropical [ ] no excess flowers [ ] not overwhelming

## PART 7 — WEATHER & TIME OF DAY
Weather (round 10 delivered base): [~] rain mode [~] outdoor rain [~] window drops [~] penthouse streaks [~] wet paving [~] puddles [ ] wet reflections [~] overcast light [~] none indoors [~] ambience [~] smooth transitions [ ] performance measured — must be re-verified in every NEW space
Time of day: [ ] daylight [ ] golden hour [ ] blue hour [ ] night [ ] light switching [ ] material identity [ ] shadow direction [ ] no flicker [ ] no extreme shifts [ ] controls work

## PART 8 — CONTINUITY
[ ] one coordinate system [ ] one annotated map [ ] consistent footprints [ ] heights [ ] street connections [ ] courtyard connections [ ] lift connections [ ] café/bookshop positions [ ] shopping street orientation [ ] riverside access [ ] consistent skyline [ ] Thames position [ ] no contradictions [ ] no unexplained gaps [ ] no fake doorways [ ] no disconnected scenes [ ] no teleports replacing walkable links
Allowed minor refinements: window recesses, building-side transitions, small alleys, shop thresholds, stair landings, pavement junctions, kerb transitions, hedge endings, balcony junctions, minor gaps, short passages. NOT allowed without review: major buildings, landmarks, businesses, layout changes.

## PART 9 — GAMEPLAY
[ ] movement [ ] camera [ ] collision [ ] entrance doors [ ] balcony doors [ ] lift doors [ ] lift travel [ ] arrivals [ ] courtyard walk [ ] street walk [ ] café access [ ] bookshop access [ ] riverside walk [ ] furniture collision [ ] no walls walk-through [ ] no shop displays walk-through [ ] no falling through terrain [ ] no camera clipping [ ] prompts [ ] clearances [ ] weather controls preserved [ ] existing systems preserved
(Character creator, voice companion, pets, wellness-app = separate workstreams.)

## PART 10 — TOOLS
Assess/record: Blender, bpy, Geometry Nodes, Krita, GIMP, Material Maker, Poly Haven, ambientCG, BlenderKit, glTF-Transform, glTF Validator, Spector.js, RenderDoc, ImageMagick, Pillow. For each: needed? compatible? licence? commercial use? attribution? no unnecessary installs, no paid assets, keep sources, provenance register. (Known: Poly Haven/ambientCG unreachable from this sandbox.)

## PART 11 — PERFORMANCE
[ ] inspect engine [ ] supported features [ ] GLB export [ ] materials preserved [ ] UVs [ ] transforms [ ] animations [ ] validate exports [ ] reimport [ ] test in localhost [ ] instancing [ ] draw calls [ ] texture compression [ ] LODs [ ] culling [ ] collision geometry [ ] overdraw [ ] frame times [ ] memory [ ] intended device [ ] load time [ ] quality preserved
(M2 not measurable here: record as limitation.)

## PART 12 — VISUAL VERIFICATION (per major environment: BEFORE · TARGET · BLENDER · LOCALHOST AFTER; section 04 target = spec)
Recorded per set: direction, position, FOV, height, time of day, exposure, colour management, build version, test date.
Gates: G1 layout/scale · G2 palette · G3 geometry/surface · G4 lighting/shadows · G5 continuity · G6 gameplay · G7 performance · G8 coverage — each needs evidence.
Correction loop: identify → severity → cause → fix → re-render Blender → re-test localhost → compare → record → request approval for substantial aesthetic changes.

## PART 13 — PROCESS
[ ] PDF read [ ] repo inspected [ ] tools identified [ ] missing deps [ ] permissions consolidated [ ] terminal/Blender/files/downloads/rendering/localhost confirmed [ ] limits stated [ ] branch+backup [ ] originals preserved [ ] progress log [ ] issue register [ ] continue past blockers [ ] never bypass permissions [ ] no purchases [ ] no false completion [ ] reproducible scripts

## PART 14 — DELIVERABLES
[ ] updated project [ ] Blender sources [ ] game-ready assets [ ] shared material registry [ ] canonical palette [ ] Blender calibration studio [ ] localhost calibration studio [ ] lighting presets [ ] reusable architectural assets [ ] foliage library [ ] annotated map [ ] asset+licence register [ ] before/after [ ] Blender renders [ ] localhost screenshots [ ] colour-calibration report [ ] palette audit [ ] performance measurements [ ] gameplay test results [ ] completed requirements matrix [ ] defects register [ ] implementation docs [ ] resume instructions

## PART 15 — ABSOLUTE RULES (all 18 must hold)
01 AFTER images control · 02 one palette · 03 correct in localhost not just Blender · 04 no primitive architecture · 05 no oversized empty world · 06 locations connect · 07 soft grounded shadows · 08 cinematic without bloom excess · 09 organic vegetation · 10 distinct stone/wood/metal/brick/glass responses · 11 no generic downloaded assets replacing approved designs · 12 playable · 13 minor corners may be refined · 14 major changes need review · 15 every area localhost-verified · 16 not complete just because Blender looks good · 17 s04 needs separate approval · 18 architectural identity holds from every viewpoint

## FINAL VISION (acceptance feel)
Penthouse luxurious with Thames views; courtyard peaceful with mature trees; shopping streets intimate; Café Violette inviting; The Quiet Page a warm reading retreat; riverside a natural continuation (no unfinished map edge); same visual identity in daylight, golden hour, blue hour, rainy evening.
