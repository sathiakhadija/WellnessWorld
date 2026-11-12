# RESUME
Branch impl/design-bible-v16 (rollback tag backup/pre-design-bible-v16 = main@0af21b1). NOT pushed — push/deploy/merge only with explicit owner authorisation.
Docs: docs/bible/CHECKLIST.md (honest status, latest block "STATUS UPDATE 2026-11-12"), DEFECTS.md, PROGRESS.md, ASSETS.md, evidence/ (4-way sheets s01–s15 via scripts/make_sheet.py), ROADMAP.md, MATRIX.md, MCP_AUDIT.md. Bible text: pdftotext of /mnt/user-data/uploads/WELLNESSWORLDREFINE.pdf; page JPGs docs/bible/pages/p-NN.jpg.
Build/test: `npx vite build --outDir dist4`; serve dist4 on :4176 (python3 -m http.server from dist4; restart if refused); headless Playwright/SwiftShader only (~0.3–2 fps, M2 perf not measurable). Test hooks window.__ww (setFree, doorForce, teleport, fastAnim, game), window.__atmo.set({preset}).
Blender (bpy 5.3 headless): assets/blender/make_props.py helpers; make_lobby.py, make_interior.py, make_cafe.py bake to src/baked/*.json; render_cafe_kit.py renders the café kit.
Done this stretch: slim glazing mullions; s03 clean walls/flush doors/slim casings/cove/artwork; balcony tree moved west; shop rows renamed/re-ordered to Bible s10/s11; hydrangea planters; interior limewash + woven fabric; café posies + wisteria; bookshop globe; promenade plane-tree row; palette audit 0 errors; lift round trip passes.
Open (see DEFECTS.md): AO/contact shadows, M2 perf (G7), Blender scene renders + matched-camera triplets, foliage/tree Blender rebuild, café reading nook/glass-tube chandelier, riverside brick wall/pavilion lighting, Section 04 corrections + owner approval, (owner decisions 2026-11-12: cherry tree removed, layout approved, capsule OK; DO NOT PUSH until the whole checklist is ticked with evidence).
Rule: Section 04 stays "TECHNICAL DIRECTION APPROVED — FINAL VISUAL CORRECTION PENDING USER APPROVAL"; never claim an environment complete without owner review; no invented similarity percentages.

## CHECKPOINT 2026-11-12 (end of s15 benchmark pass)
- Branch impl/design-bible-v16, all committed locally, NOT pushed (owner: push only after full checklist).
- s15 done so far: Blender master render, landward brick frontage w/ lit glazing + ivy, glow planters, burgundy glass pavilion, Blender bistro sets, Blender-baked slab albedo/normal + contact-AO decal (assets/blender/bake_textures.py -> public/textures). See docs/bible/S15_BENCHMARK.md for discrepancies.
- Next: interior depth behind glazing; apply the same bake pipeline (brick/ashlar/plaster/sett textures) to the rest of the street; lift lobby pink (D-001/2); s04 corrections for owner approval; other envs' Blender masters; owner runs M2 benchmark (docs/bible/PERF_BENCHMARK.md).
- Test tooling: /tmp/serve.sh serves dist4 on :4176 (npx vite build --outDir dist4); /tmp/gl.cjs (afternoon) and /tmp/glb.cjs (blue hour) take `outdir '{"name":[x,y,z,yaw,pitch,fov]}'`.

## CHECKPOINT 2026-11-12 (evening, planting + s04/s11 docs)
- Local commits only; NOT pushed. Latest work: S04_PROPOSAL.md (not approved), S11_STATUS.md, GATES.md (G1–G8 + 18 rules, honest), Blender planting kit (assets/blender/make_plants.py -> src/baked/plants.json; plantAt() helper in plan.js) used in s08/s09/s11/s12/s15, s05 panel colour, s06 light pools + lit niche, stale s13/s14 gap list corrected, night + heavy-rain regression clean.
- Static triangles 313k (PERF_BENCHMARK.md). M2 benchmark is owner's (`?bench=1`).
- Next: s07 floor lanterns (blossom-canopy palette conflict needs owner decision), s10 topiary, s13 warmer limewash/back-lit shelving, close-up flower/book detail, night dimming for plants, Blender masters for remaining envs, owner audit before any push.
- Tooling note: when re-running shots delete the log file first (stale "errors" line ends the wait loop early).
