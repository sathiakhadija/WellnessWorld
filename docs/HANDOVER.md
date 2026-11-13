# Handover — Wellness World (London Dreamscape)

Repo: https://github.com/sathiakhadija/WellnessWorld (branch `main`). Stack: React Three Fiber 8 + Vite 5 + three 0.169 + drei + rapier. Owner machine: MacBook Air M2 / Safari.

## Read these first (in this order)
1. `docs/bible/pages/p-NN.jpg` — Design Bible V16 (the visual reference; follow it).
2. `docs/bible/CHECKLIST.md` + `CHECKLIST_STATUS.md` — what must be achieved and where it stands.
3. `docs/bible/AUDIT_V2_REGISTER.md` — per-item status of the 40-page visual audit (FIXED / PARTIAL / OPEN). Update it as you go.
4. `docs/bible/OVERNIGHT_REPORT.md`, `OWNER_DECISIONS.md`, `DEFECTS.md`, `ROADMAP.md`.

## Owner's standing rules (do not break)
- Do NOT replace approved character identities, change art direction, modify the protected balcony geometry / glass balustrade / tiles / doors / weather systems, remove features, or deploy/publish.
- Never claim M2-verified, never invent metrics, never mark anything owner-approved (s04 stays "NOT approved" until the owner reviews). The owner runs the M2 benchmark (`?bench=1`) themselves.
- Momo character model has not been supplied; keep character pipeline tests green only.
- Owner's current top priority: **reshape everything** — models must look like real things (a flower must have petals, stem and leaves, not stacked primitives). Rebuild the world place by place (penthouse surroundings → riverside/promenade → fashion street → café → library → gardens), layout first, then organic assets, then materials. Same-viewpoint before/after renders for every change; record honestly (PARTIAL vs FIXED).
- Commit messages: end with `Co-Authored-By:` line for whoever authored; push to `main` at milestones (owner authorised pushing, not deploying).

## How the world is built
- Street: procedural, `src/street/plan.js` (layout), `buildings.js` (façades + shop interiors), `interiors.js` (café/library + `baked()` loader for Blender props), `Street.jsx`, `FountainFx.jsx`.
- Exterior/skyline: `src/Skyline.jsx`, `skylineData.js`, `NearBank.jsx` (neighbouring district seen from the penthouse).
- **Blender kits** (the way to make organic models): `assets/blender/make_*.py` run headless: `python3 assets/blender/make_plants.py` (needs Blender's `bpy` module, `pip install bpy`). Each script execs the helper head of `make_props.py` / `make_plants.py` (helpers: `reset, keep, box, lathe, sweep, finish`) and writes triangle soups to `src/baked/*.json`, grouped by material bucket (`wood, metal, brass, fabric, leather, marble, glow, leaf, stem, bloom, bloom2`). In code: `baked(ch, frame, 'name', x, z, rotY, {bucket: '#hex'}, y, scale)`.
- Known weakness to fix next: `assets/blender/make_plants.py` flowers/shrubs are blobs from `ball_obj`/`leaf_obj`. Replace with sculpted petals (curved, cupped, layered), tapered stems, veined leaves, proper tree silhouettes. Keep triangle budgets sane (a few hundred tris per flower, instanced).

## Build / test loop
```
npm i && npx playwright install chromium
npx vite build --outDir dist5 && rm -rf dist4 && cp -r dist5 dist4
tools/shots/run.sh tools/shots/street_shots.cjs out '{"park":[-40,-85.2,-5,0.5,-0.03,60]}'   # [x,y,z,yaw,pitch,fov]
npm run validate
```
- Pose: yaw 0 looks −z, π looks +z, 1.5708 looks −x, −1.5708 looks +x. Street eye height y≈−85.2. Terrace eye y≈−80.6. Penthouse balcony [2.9,1.55,−11.15,…]. Penthouse shots: `tools/shots/penthouse_shots.cjs` (JSON `{name:{pose,preset,weather,wait}}`). `window.__ww.teleport(x,y,z)` moves the avatar.
- Headless SwiftShader is ~0.3–2 fps; each shot takes minutes. It verifies composition only, never performance.

## Honest state (see AUDIT_V2_REGISTER.md for detail)
Done as first passes: near-bank district behind the penthouse, riverside railing/quay, fountain droplets, café/library props, shop-window mannequins, north-park reshape (walks, bandstand, meadows, groves). Not done: organic plant/flower/tree models, fashion-street façade variety + overhead clutter, café ceiling/glazing, library shelves/lounge remodel, vehicles, settings hub, rain splashes/audio, minimap heading, LODs, M2 benchmark.
