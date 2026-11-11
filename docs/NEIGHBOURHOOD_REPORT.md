# Wellness World: London neighbourhood build (street level)

## A. Fixed
- Exterior was drawn at 1/6 scale, so a 1:1 street could not exist. The exterior group is now level-aware (penthouse: 1/6, street: 1:1). The skyline, river and penthouse are unchanged.
- Doorway test uses a direct toggle (`__ww.game()`); the v10 test follows the lift flow instead of the old placeholder overlay.
- The old "return" button and placeholder overlay are gone: the entrance now takes a lift.

## B. Built (all procedural, real geometry; `src/street/`)
- Penthouse lobby pavilion + working lift; forecourt with reflecting pool, lawns, hedges, gated walls.
- Grand Boulevard (road, kerbs, crossings, plane trees, lamps, benches, bollards, side-street stubs).
- Elegant Quarter: Georgian terraces (recessed sashes, cornices, mansards, dormers, chimneys, railed gardens, steps, doors).
- Modern Quarter: limestone/glass blocks with arcade, fins, balconies.
- Romantic lane: Café Violette, The Quiet Page, Fleur, Atelier Mauve + other shops with recessed entrances, awnings, signs, festoon lights. Exteriors and entrances only; no interiors.
- Neighbourhood Square: sett/slab paving, fountain with animated water, clipped limes, benches, townhouse and modern frontage.
- Thames terrace: balustrade, two side ramps, a grand stair, trees, lamps, benches.

## C. How it connects
Penthouse entrance -> lift (fade) -> lobby at (1.2, street floor, 7.4) -> forecourt -> boulevard (z 47..210) -> square (z 210..282) -> lane west (z 245) ; plaza edges -> side ramps / grand stair -> Thames terrace. Lift in the lobby returns to the penthouse.

## D. Evidence
`docs/screens/1_entrance … 7_waterfront.png` (headless SwiftShader renders, eye level).

## E. Verification (headless Chromium + SwiftShader only)
- tests/street.cjs: 16/16 (lift down/up, walking, plaza/pool/wall collision, ramp + stair to terrace, balustrade, no falling, no console errors).
- doors_slider, v10 (updated), stabilisation: all pass. camera_wheel and camera_collision run with sensible output (no pass/fail summary in those scripts).
- Street build: ~84.6k triangles, ~134 ms build.

## F. Limitations / unmet
- Not tested in Safari or on a real GPU; no real frame-rate figures (SwiftShader ~2 fps is not representative).
- Shop/café/bookshop/florist interiors not built. The lift is an alcove with doors + fade, not a walkable shaft.
- Not yet checked: the street seen from the penthouse windows, camera modes on the street beyond free-cam screenshots, V10 carve-out seams.
- Visual weak spots: flat orange lit-glass panels in the lobby; low-poly stylised trees; square still sparse; some brick/limestone mix in the Modern Quarter is heavy; grand stair reads faintly. Audio not built.

## G. Launch
`npm install && npm run build && npx vite preview --port 4173`, open `http://localhost:4173/` (add `?at=street` to start on the street). Take the entrance lift from the penthouse (Enter at the front door). V12 character models only via `?model=v12`.
