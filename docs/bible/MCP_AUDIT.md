# Blender MCP / Unity MCP audit (repository + compatibility)

## Repository facts (verified)
- Engine: three 0.169 + React Three Fiber 8 + drei 9 + rapier + Vite 5. No Unity project files (no Assets/ProjectSettings). Node 22, Python 3.13, uv/uvx present.
- Blender here: `bpy` 5.3.0 Python module (headless, Cycles/AgX) — already used for calibration, lobby kit, rabbit rig. No Blender GUI/binary in this cloud container.

## Blender MCP — ahujasid/blender-mcp (MIT)
- Needs: Blender ≥3.0 GUI with the add-on (socket server, default localhost:9876, *no authentication or encryption*), Python ≥3.10, uv.
- Tools (per README): execute_blender_code (arbitrary Python in the live session), look (viewport/camera/render capture), get_scene_info, get_addon_status, generate_3d (Tripo/Hunyuan/Hyper3D/Meshy — paid/API key), search_assets/import_asset (Poly Haven CC0, Sketchfab key, Poly Pizza), telemetry controls. Safe mode: BLENDER_MCP_SAFE_MODE=1; telemetry off: DISABLE_TELEMETRY=true.
- Capability map vs the brief: meshes/shader nodes/PBR/palette/cameras/lights/render/GLB export/save .blend → all via execute_blender_code (native bpy); *not* dedicated tools. Geometry Nodes foliage → via bpy scripting. Scene/material inspection → get_scene_info + scripts.
- Security: arbitrary code execution on whatever machine runs Blender; keep on localhost, safe mode on, telemetry off, no API keys through chat.
- Assessment: **not needed for this cloud session** — headless bpy gives the same capabilities with reproducible scripts. It only adds value if the owner wants live interactive Blender on their MacBook (requires linking the desktop app to this session and installing Blender + add-on there).

## Unity MCP (e.g. CoplayDev/unity-mcp, MIT)
- Not applicable: the project is a web renderer. Per the directive there is **no migration**. A Unity port would cost a full rewrite (R3F scene, rapier gameplay, weather/atmosphere shaders, Safari/web deployment) and would lose web delivery; the existing engine can reach the target look with baked kits, PMREM lighting, AgX and instancing. Recommendation: stay on three/R3F. Revisit only if you explicitly approve.

## Already granted/working (no new request): terminal, filesystem in /home/claude, npm/pip/GitHub, headless Chromium localhost tests, bpy rendering.
## Not available: Poly Haven/ambientCG downloads (network allow-list blocks them) — all textures are generated in-house.
