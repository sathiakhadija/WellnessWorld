# s04 World Scale — owner corrections (2026-11-13) — NOT visually approved

Owner decision: conditional approval of the technical direction; final visual pending review of corrected renders. s04 is NOT marked approved anywhere.

Evidence (same camera as the earlier s04 evidence: 2.9,1.55,-11.15, yaw .55, pitch -.14, fov 62; headless SwiftShader, NOT M2):
`evidence/s04_corrections_sheet.jpg` (BEFORE | AFTER for golden, night, heavy rain/blue hour, afternoon); individual `s04_before_*.png` / `s04_after_*.png`.

| # | Owner correction | What changed | Status |
|---|---|---|---|
| 1 | Varied skyline massing | Towers now have plan/profile shapes: chamfered-corner, tapered upper third, slanted roof, round; plus new facade articulations (pale vertical fins, spandrel bands, champagne cladding). Crowns adapt (no floating parts on tapered/slanted tops). Skyline/layout positions unchanged. | Done procedurally. No Blender skyline models: at 1.1-3 km one building is a few pixels wide, so modelled detail would not read; the gain is in silhouette/shape, which is geometry-level. Revisit if you want Blender hero crowns. |
| 2 | River reflections (time + weather) | Mirrored skyline/far-bank is drawn over the water with Fresnel-style strength, rippled window pattern, fading with reflected height. Strength follows time of day (windows lit = stronger) and drops in rain/cloud; rain adds chop; sun glint is suppressed under cloud; lit-bank streaks follow night factor; far-bank lamps have stretched mirror streaks. | Done, headless-verified. Strength tuned down after first render (0.5 -> 0.36 base). |
| 3 | Embankment/waterfront | Far bank: stepped plinth + coping, lit arcade/terrace frontage (warm bays, awnings), planted promenade ribbon (lawn panels, paving, planters), two-tier tree canopies, paired lamp standards, lamps fade with the evening. | Done at far-bank scale. Detail below ~2 m is not resolvable from 1 km. Near-bank promenade is s15. |
| 4 | Atmosphere | Distance haze (atmospheric perspective) on all skyline/far-bank materials, colour from the live sky horizon, denser with rain/cloud. | Done. Heavy-rain skyline reads as flat grey silhouettes (intended weather look); some dark-blue base patches visible in the rain render are existing bank glass — noted for review. |
| 5 | Do not modify balcony / glass / tiles / doors / weather | None of these files touched (Skyline.jsx, skylineData.js, Waterfront.jsx, new exteriorAtmo.js only). Weather state is only read. | Respected. |
| 6 | M2 performance | NOT tested — no M2 here. Extra cost: one mirrored far-bank copy, two canopy instances, two textured strips, per-fragment haze. Run `?bench=1`, `?quality=performance|balanced|high` on the M2 and report fps; I will optimise from numbers. | OPEN (owner) |
| 7 | Evidence | Before/after at the same camera for golden, night, heavy rain, afternoon. No separate Blender render for skyline (see 1). | Done |
