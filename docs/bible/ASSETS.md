# Asset & licence register (all assets generated in-house; no third-party packs; Poly Haven/ambientCG unreachable from this environment)
| Asset | Source | Licence | Notes |
|---|---|---|---|
| src/baked/props.json, interior.json, lobby.json | assets/blender/make_props.py, make_interior.py, make_lobby.py (Blender 5.3 bpy) | Project-owned | .blend in assets/blender/src, GLB in assets/glb |
| src/baked/cafe.json | assets/blender/make_cafe.py | Project-owned | bistro chair/table, armchair, club chair, brass lamp, stool, pendant |
| Procedural textures (brick, ashlar, slab, sett, parquet, marble, wood grain, brushed metal, signs, leaf) | src/street/textures.js (canvas, deterministic seeds) | Project-owned | |
| Palette registry | src/palette/registry.src.json | Project-owned | colours extracted from Design Bible V16; status specified vs provisional per entry |
| Blender MCP / Unity MCP | not installed | MIT (ahujasid/blender-mcp, CoplayDev/unity-mcp) | see MCP_AUDIT.md |
