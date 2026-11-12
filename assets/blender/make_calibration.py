"""Wellness World Material Calibration Studio (Blender).  Run:  WW_ROOT=. python3.13 assets/blender/make_calibration.py [preset ...]
Builds the SAME layout as the game scene (src/studio/Calibration.jsx) from one layout table (assets/palette/calib_layout.json) so Blender and localhost compare like for like.
Saves assets/blender/calibration.blend and renders presets to docs/bible/calibration/blender_<preset>.png.  Colour management: AgX, Look None, exposure 0 (documented in docs/bible/PALETTE_USAGE.md)."""
import bpy, json, os, sys, math
ROOT = os.environ.get('WW_ROOT', '.'); exec(open(os.path.join(ROOT, 'assets/blender/mat_lib.py')).read())
LAY = json.load(open(os.path.join(ROOT, 'assets/palette/calib_layout.json')))
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
MATS = build_all()
def mk(mesh_op, name, loc, mat, **kw):
    mesh_op(location=loc, **kw); o = bpy.context.active_object; o.name = name; o.data.materials.append(mat); return o
def plain(name, lin, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*lin, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal; return m
s2l = lambda c: c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
def hex_lin(h): n = int(h[1:], 16); return [s2l(((n >> s) & 255) / 255) for s in (16, 8, 0)]
# floor + backdrop (neutral mid grey 18%: linear 0.18)
mk(bpy.ops.mesh.primitive_plane_add, 'CAL_floor', (0, 0, 0), plain('CAL_floor_grey', (0.18, 0.18, 0.18), 0.8), size=40)
# swatch tiles (row 0), spheres (row 1), roughness ramp, arch samples
for i, (mid, x, y) in enumerate(LAY['swatches']):
    mk(bpy.ops.mesh.primitive_cube_add, 'SW_' + mid, (x, y, 0.01), MATS[mid], size=1); bpy.context.active_object.scale = (0.6, 0.6, 0.02)
    bpy.ops.object.text_add(location=(x - 0.45, y - 0.62, 0.02)); t = bpy.context.active_object; t.data.body = mid.replace('WW_', ''); t.data.size = 0.07; t.name = 'LBL_' + mid
for mid, x, y in LAY['spheres']:
    mk(bpy.ops.mesh.primitive_uv_sphere_add, 'SP_' + mid, (x, y, 0.4), MATS[mid], radius=0.4, segments=48, ring_count=24); bpy.ops.object.shade_smooth()
for k, (x, y, r) in enumerate(LAY['rough_ramp']):
    for name, lin, metal in (('matte', (0.5, 0.5, 0.5), 0), ('brass', hex_lin('#B58A4D'), 1)):
        mk(bpy.ops.mesh.primitive_uv_sphere_add, f'RR_{name}_{k}', (x, y + (0 if name == 'matte' else 1.0), 0.3), plain(f'RR_{name}_{k}', lin, r, metal), radius=0.3, segments=32, ring_count=16); bpy.ops.object.shade_smooth()
for mid, x, y in LAY['arch']:
    mk(bpy.ops.mesh.primitive_cube_add, 'AR_' + mid, (x, y, 0.25), MATS[mid], size=1); bpy.context.active_object.scale = (1.0, 0.3, 0.5)
# neutral references + colour checker (public ColorChecker sRGB values)
for name, v, x, y in LAY['neutrals']:
    lin = [s2l(v / 255)] * 3; mk(bpy.ops.mesh.primitive_uv_sphere_add, 'NEU_' + name, (x, y, 0.3), plain('NEU_' + name, lin, 0.6), radius=0.3, segments=32, ring_count=16); bpy.ops.object.shade_smooth()
cc = LAY['colorchecker']; x0, y0 = cc['origin']
for i, rgb in enumerate(cc['patches']):
    r, c = divmod(i, 6); mk(bpy.ops.mesh.primitive_cube_add, f'CC_{i}', (x0 + c * 0.27, y0 - r * 0.27, 0.01), plain(f'CC_{i}', [s2l(a / 255) for a in rgb], 0.75), size=0.25); bpy.context.active_object.scale = (1, 1, 0.04)
# shadow calibration: a block + a thin pole + a sphere floating 0.3 m (contact vs detached)
for mid, x, y, kind in LAY['shadow']:
    if kind == 'block': mk(bpy.ops.mesh.primitive_cube_add, 'SH_block', (x, y, 0.4), MATS[mid], size=0.8)
    if kind == 'pole': mk(bpy.ops.mesh.primitive_cylinder_add, 'SH_pole', (x, y, 0.9), MATS[mid], radius=0.03, depth=1.8)
    if kind == 'float': mk(bpy.ops.mesh.primitive_uv_sphere_add, 'SH_float', (x, y, 0.8), MATS[mid], radius=0.2)
# glass + mirror + foliage samples
for mid, x, y, kind in LAY['glass']:
    if kind == 'pane': mk(bpy.ops.mesh.primitive_cube_add, 'GL_pane', (x, y, 0.5), MATS[mid], size=1); bpy.context.active_object.scale = (1.0, 0.04, 1.0)
    if kind == 'sphere': mk(bpy.ops.mesh.primitive_uv_sphere_add, 'GL_sphere', (x, y, 0.4), MATS[mid], radius=0.4, segments=48, ring_count=24); bpy.ops.object.shade_smooth()
    if kind == 'mirror': mk(bpy.ops.mesh.primitive_uv_sphere_add, 'GL_mirror', (x, y, 0.4), plain('CAL_mirror', (0.9, 0.9, 0.9), 0.02, 1.0), radius=0.4, segments=48, ring_count=24); bpy.ops.object.shade_smooth()
for mid, x, y, kind in LAY['foliage']:
    if kind == 'leaf':
        for k in range(7):
            bpy.ops.mesh.primitive_plane_add(size=0.35, location=(x + 0.12 * (k - 3), y, 0.35 + 0.05 * k), rotation=(math.radians(60 + 5 * k), 0, math.radians(20 * k))); o = bpy.context.active_object; o.name = f'FO_leaf_{k}'; o.data.materials.append(MATS[mid])
    if kind == 'bark': mk(bpy.ops.mesh.primitive_cylinder_add, 'FO_bark', (x, y, 0.6), MATS[mid], radius=0.15, depth=1.2)
# camera (same as game: FOV 34, looking down-forward)
cam = bpy.data.cameras.new('CAL_cam'); cam.angle = math.radians(LAY['camera']['fov']); co = bpy.data.objects.new('CAL_cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = LAY['camera']['pos']; tgt = LAY['camera']['target']
import mathutils; d = mathutils.Vector(tgt) - mathutils.Vector(co.location); co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
# lighting presets (same table as the game: assets/palette/presets.json)
PRE = json.load(open(os.path.join(ROOT, 'assets/palette/presets.json')))
def apply_preset(name):
    p = PRE[name]
    for o in [o for o in bpy.data.objects if o.name.startswith('LIGHT_')]: bpy.data.objects.remove(o)
    w = bpy.data.worlds.get('CAL_world') or bpy.data.worlds.new('CAL_world'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*[s2l(a / 255) for a in p['sky']], 1); bg.inputs['Strength'].default_value = p['skyStrength']
    sun = bpy.data.lights.new('LIGHT_sun', 'SUN'); sun.energy = p['sunStrength']; sun.color = [s2l(a / 255) for a in p['sunColor']]; sun.angle = math.radians(p['sunSoftness'])
    so = bpy.data.objects.new('LIGHT_sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(90 - p['sunElev']), 0, math.radians(p['sunAz']))   # sun shines along local -Z: tilt from vertical = 90 - elevation
    for i, (pos, col, pw) in enumerate(p.get('lamps', [])):
        l = bpy.data.lights.new(f'LIGHT_lamp{i}', 'POINT'); l.energy = pw; l.color = [s2l(a / 255) for a in col]; l.shadow_soft_size = 0.25; lo = bpy.data.objects.new(f'LIGHT_lamp{i}', l); sc.collection.objects.link(lo); lo.location = pos
sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.render.resolution_x, sc.render.resolution_y = 960, 540
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0.0; sc.view_settings.gamma = 1.0; sc.display_settings.display_device = 'sRGB'
os.makedirs(os.path.join(ROOT, 'docs/bible/calibration'), exist_ok=True)
names = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(PRE.keys())
for n in names:
    apply_preset(n); sc.view_settings.exposure = PRE[n].get('exposure', 0.0); sc.render.filepath = os.path.join(ROOT, f'docs/bible/calibration/blender_{n}.png'); bpy.ops.render.render(write_still=True); print('rendered', n)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'assets/blender/calibration.blend'))
