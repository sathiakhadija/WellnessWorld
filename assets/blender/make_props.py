"""Wellness World — street-furniture production script (Blender / bpy 5.x, headless).
Run:  python3 assets/blender/make_props.py
Builds lamp, bench, urn, cafe chair and bistro table with real modelling operations (lathe spins, bevelled boxes,
swept cast-iron curves, subdivision), saves a source .blend per asset in assets/blender/src/, exports GLB to assets/glb/
and bakes triangle soup (y-up, front = +z) to src/street/baked/props.json for the instanced street renderer.
Units: metres. Origin: ground contact point. Front faces -Y in Blender (= +Z in three.js)."""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.makedirs(f'{ROOT}/assets/blender/src', exist_ok=True); os.makedirs(f'{ROOT}/assets/glb', exist_ok=True)

def hexrgb(h):  # sRGB hex -> linear-ish float triplet used as vertex colour (the renderer multiplies it like the old C())
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b))

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

PARTS = []   # (object, bucket, colour)
def keep(o, bucket, colour): PARTS.append((o, bucket, hexrgb(colour))); return o

def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); return o

def lathe(name, prof, seg=20, closed_bottom=True):
    """prof = [(radius, z), ...] bottom->top; spun around Z."""
    bm = bmesh.new(); rings = []
    for (r, z) in prof:
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)])
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            try: bm.faces.new((a[i], a[j], b[j], b[i]))
            except ValueError: pass
    for ring, flip in ((rings[0], True), (rings[-1], False)):
        if ring[0].co.xy.length > 1e-4:
            f = bm.faces.new(ring[::-1] if flip else ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def box(name, x0, x1, y0, y1, z0, z1, bevel=0.012, segs=1):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 if v.co.x < 0 else x1; v.co.y = y0 if v.co.y < 0 else y1; v.co.z = z0 if v.co.z < 0 else z1
    o = new_obj(name, bm)
    if bevel > 0:
        m = o.modifiers.new('bev', 'BEVEL'); m.width = bevel; m.segments = segs; m.limit_method = 'ANGLE'
    return o

def cyl(name, r0, r1, z0, z1, seg=12, x=0, y=0):
    o = lathe(name, [(r0, z0), (r1, z1)], seg); o.location = (x, y, 0); return o

def sweep(name, pts, radius, res=2, closed=False):
    """cast-iron style swept bezier through points (3D), circular section."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 0; cu.resolution_u = res
    cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, c in zip(sp.bezier_points, pts):
        p.co = c; p.handle_left_type = p.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o); return o

def apply_all(o):
    dg = bpy.context.evaluated_depsgraph_get(); eo = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(eo, depsgraph=dg); return me

def frame_xyz(v):   # blender (x, y, z-up, front -y)  ->  three (x, y-up, front +z)
    return (v.x, v.z, -v.y)

def bake(asset):
    out = {}
    for o, bucket, col in PARTS:
        me = apply_all(o); me.calc_loop_triangles()
        mat = o.matrix_world
        b = out.setdefault(bucket, {'p': [], 'c': []})
        uvd = me.uv_layers.active.data if me.uv_layers.active else None
        if uvd is not None: b.setdefault('uv', [])
        for t in me.loop_triangles:
            if uvd is not None:
                for li in t.loops: b['uv'].extend([round(uvd[li].uv[0], 4), round(uvd[li].uv[1], 4)])
            vs = [frame_xyz(mat @ me.vertices[i].co) for i in t.vertices]
            # flip winding because the y/z swap is a reflection-free rotation (x, z, -y) => proper rotation, keep order
            for v in vs: b['p'].extend(round(c, 4) for c in v); b['c'].extend(round(c, 4) for c in col)
    return out

def finish(name, bucket_of=None):
    # save the .blend + GLB for this asset, return baked data, then clear
    for o, bucket, col in PARTS:
        pass
    baked = bake(name)
    for o, _, _ in PARTS: o.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=f'{ROOT}/assets/blender/src/{name}.blend')
    try:
        bpy.ops.export_scene.gltf(filepath=f'{ROOT}/assets/glb/{name}.glb', export_format='GLB', use_selection=False, export_apply=True, export_yup=False)
    except Exception as e: print('glb export failed', name, e)
    return baked

LIB = {}
IRON, BRASS, STONE, OAK, WAL, GLOW, MARBLE = '#26242b', '#b08d57', '#d4c8b0', '#8a6a48', '#57473f', '#ffdca2', '#d9cfbf'

# ------------------------------------------------------------------ lamp (4.8 m Victorian-style lantern standard)
def build_lamp(h=4.8):
    reset(); PARTS.clear()
    base = [(0.30, 0), (0.30, 0.06), (0.25, 0.10), (0.25, 0.22), (0.19, 0.30), (0.17, 0.44), (0.20, 0.50), (0.14, 0.56), (0.11, 0.66), (0.105, 0.78),
            (0.135, 0.80), (0.135, 0.86), (0.095, 0.90)]
    keep(lathe('plinth', base, 8), "metal", IRON)
    # fluted shaft: tapering lathe + four thin fins
    shaft = [(0.095, 0.90), (0.075, 1.4), (0.062, 2.8), (0.058, h - 0.78)]
    keep(lathe('shaft', shaft, 8), 'metal', IRON)
    for z, r in ((1.35, 0.1), (2.7, 0.085), (h - 0.84, 0.095)):
        keep(lathe(f'collar{z}', [(r - 0.03, z - 0.04), (r, z - 0.02), (r, z + 0.02), (r - 0.03, z + 0.04)], 8), 'metal', BRASS if z > 2 else IRON)
    keep(lathe('neck', [(0.058, h - 0.78), (0.11, h - 0.72), (0.15, h - 0.66), (0.19, h - 0.62)], 8), 'metal', IRON)
    # ladder bar + two scrolled brackets
    keep(box('bar', -0.34, 0.34, -0.015, 0.015, h - 1.4, h - 1.375, 0.004, 1), 'metal', IRON)
    for s in (-1, 1):
        keep(sweep(f'scroll{s}', [(0, 0, h - 1.0), (s * 0.12, 0, h - 0.92), (s * 0.19, 0, h - 0.8), (s * 0.15, 0, h - 0.74), (s * 0.11, 0, h - 0.8)], 0.012), 'metal', IRON)
    # lantern: tray, glass frustum (glows), corner posts, cap
    z0, z1 = h - 0.62, h - 0.06
    keep(box('tray', -0.2, 0.2, -0.2, 0.2, z0, z0 + 0.05, 0.012), 'metal', IRON)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        top = v.co.z > 0; w = 0.20 if top else 0.15
        v.co.x = w if v.co.x > 0 else -w; v.co.y = w if v.co.y > 0 else -w; v.co.z = z1 if top else z0 + 0.05
    keep(new_obj('glass', bm), 'glow', GLOW)
    for sx in (-1, 1):
        for sy in (-1, 1):
            keep(box('post', sx * 0.19 - 0.012, sx * 0.19 + 0.012, sy * 0.19 - 0.012, sy * 0.19 + 0.012, z0 + 0.05, z1, 0.004, 1), 'metal', IRON)
    keep(box('rim', -0.235, 0.235, -0.235, 0.235, z1, z1 + 0.04, 0.012), 'metal', IRON)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        top = v.co.z > 0; w = 0.0 if top else 0.25
        v.co.x = w * (1 if v.co.x > 0 else -1); v.co.y = w * (1 if v.co.y > 0 else -1); v.co.z = z1 + 0.3 if top else z1 + 0.04
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    cap = new_obj('cap', bm); m = cap.modifiers.new('sub', 'SUBSURF'); m.levels = 1; m.subdivision_type = 'SIMPLE'
    keep(cap, 'metal', IRON)
    keep(lathe('finial', [(0.0, z1 + 0.3), (0.03, z1 + 0.31), (0.05, z1 + 0.35), (0.03, z1 + 0.39), (0.008, z1 + 0.46), (0.0, z1 + 0.48)], 10), 'metal', BRASS)
    return finish('lamp')

# ------------------------------------------------------------------ bench (1.8 m, cast-iron scrolled ends, oak slats)
def build_bench():
    reset(); PARTS.clear()
    for sx in (-0.78, 0.78):
        # side frame in the Y/Z plane at x = sx (front = -Y)
        back_leg = [(sx, 0.26, 0.0), (sx, 0.24, 0.22), (sx, 0.23, 0.44), (sx, 0.27, 0.70), (sx, 0.30, 0.94)]
        front_leg = [(sx, -0.24, 0.0), (sx, -0.23, 0.22), (sx, -0.22, 0.44), (sx, -0.22, 0.62)]
        arm = [(sx, -0.22, 0.62), (sx, -0.10, 0.68), (sx, 0.10, 0.67), (sx, 0.24, 0.64)]
        seat_rail = [(sx, -0.24, 0.43), (sx, 0.0, 0.43), (sx, 0.23, 0.43)]
        for i, pts in enumerate((back_leg, front_leg, arm, seat_rail)): keep(sweep(f'frame{sx}_{i}', pts, 0.016 if i != 2 else 0.013), 'metal', IRON)
        keep(sweep(f'scroll{sx}', [(sx, -0.22, 0.5), (sx, -0.13, 0.55), (sx, -0.07, 0.5), (sx, -0.12, 0.46)], 0.010), 'metal', IRON)
        keep(box(f'foot{sx}a', sx - 0.035, sx + 0.035, 0.20, 0.32, 0, 0.018, 0.006, 1), 'metal', IRON)
        keep(box(f'foot{sx}b', sx - 0.035, sx + 0.035, -0.30, -0.18, 0, 0.018, 0.006, 1), 'metal', IRON)
    for i in range(5): keep(box(f'seat{i}', -0.87, 0.87, -0.23 + i * 0.095, -0.23 + i * 0.095 + 0.08, 0.45, 0.49, 0.0, 1), 'wood', OAK)
    for i in range(3):
        z = 0.58 + i * 0.13; y = 0.20 + (z - 0.5) * 0.18
        keep(box(f'back{i}', -0.87, 0.87, y, y + 0.025, z, z + 0.09, 0.0, 1), 'wood', OAK)
    return finish('bench')

# ------------------------------------------------------------------ urn / planter
def build_urn():
    reset(); PARTS.clear()
    prof = [(0.46, 0), (0.46, 0.06), (0.38, 0.10), (0.20, 0.16), (0.16, 0.24), (0.22, 0.34), (0.40, 0.50), (0.46, 0.62), (0.44, 0.74), (0.38, 0.80), (0.50, 0.84), (0.50, 0.90), (0.42, 0.90)]
    keep(lathe('urn', prof, 24), 'trim', STONE)
    keep(lathe('soil', [(0.0, 0.88), (0.41, 0.88)], 16), 'leaf', '#4b3a2c')
    for i in range(9):   # lead ring of egg-and-dart studs on the belly
        a = i / 9 * 2 * math.pi
        o = lathe(f'stud{i}', [(0.0, 0), (0.035, 0.015), (0.0, 0.05)], 8); o.location = (0.455 * math.cos(a), 0.455 * math.sin(a), 0.60); o.rotation_euler = (0, 0, 0)
        keep(o, 'trim', STONE)
    return finish('urn')

# ------------------------------------------------------------------ cafe chair (bentwood) + bistro table (marble top, cast-iron pedestal)
def build_chair():
    reset(); PARTS.clear()
    for sx in (-1, 1):
        for sy in (-1, 1):
            keep(sweep(f'leg{sx}{sy}', [(sx * 0.17, sy * 0.17, 0.0), (sx * 0.185, sy * 0.185, 0.23), (sx * 0.19, sy * 0.19, 0.45)], 0.013), 'wood', WAL)
    keep(cyl('seat', 0.215, 0.21, 0.45, 0.485, 20), 'wood', WAL)
    keep(lathe('seatrim', [(0.215, 0.43), (0.225, 0.45), (0.225, 0.485), (0.215, 0.5)], 20), 'wood', WAL)
    # back: two stiles + a bentwood hoop (half torus) + splat
    for sx in (-1, 1): keep(sweep(f'stile{sx}', [(sx * 0.19, 0.19, 0.45), (sx * 0.19, 0.215, 0.7), (sx * 0.17, 0.225, 0.92)], 0.012), 'wood', WAL)
    hoop = [(0.17 * math.cos(a), 0.225 + 0.0 * a, 0.92 + 0.07 * math.sin(a)) for a in [math.pi * k / 6 for k in range(7)]]
    keep(sweep('hoop', hoop, 0.011), 'wood', WAL)
    keep(sweep('ring', [(-0.17, 0.215, 0.72), (-0.06, 0.225, 0.78), (0.06, 0.225, 0.78), (0.17, 0.215, 0.72)], 0.010), 'wood', WAL)
    return finish('chair')

def build_table():
    reset(); PARTS.clear()
    keep(lathe('top', [(0.0, 0.735), (0.33, 0.735), (0.355, 0.742), (0.355, 0.762), (0.34, 0.772), (0.0, 0.772)], 28), 'trim', MARBLE)
    keep(lathe('apron', [(0.2, 0.70), (0.28, 0.70), (0.28, 0.735), (0.2, 0.735)], 20), 'metal', IRON)
    keep(lathe('ped', [(0.26, 0.0), (0.26, 0.02), (0.20, 0.05), (0.09, 0.12), (0.04, 0.2), (0.032, 0.5), (0.05, 0.56), (0.03, 0.62), (0.05, 0.70)], 14), 'metal', IRON)
    for k in range(3):
        a = k * 2 * math.pi / 3
        keep(sweep(f'toe{k}', [(0.05 * math.cos(a), 0.05 * math.sin(a), 0.04), (0.18 * math.cos(a), 0.18 * math.sin(a), 0.03), (0.27 * math.cos(a), 0.27 * math.sin(a), 0.0)], 0.014), 'metal', IRON)
    return finish('table')


# ------------------------------------------------------------------ parked car (generic compact saloon, ~4.1 m): rounded body, glasshouse, wheels, lamps. Body colour is white; the renderer tints it per instance.
def wheel(name, x, y, r=0.33, wd=0.22):
    o = lathe(name, [(0.0, -wd / 2), (r * 0.78, -wd / 2), (r, -wd * 0.3), (r, wd * 0.3), (r * 0.78, wd / 2), (0.0, wd / 2)], 14)
    o.rotation_euler = (0, math.pi / 2, 0); o.location = (x, y, r); return o

def build_car():
    reset(); PARTS.clear()
    body = box('lower', -0.89, 0.89, -2.05, 2.05, 0.30, 0.86, 0.16, 3); keep(body, 'carbody', '#ffffff')
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)       # glasshouse: tapered frustum (narrower and shorter at the roof)
    for v in bm.verts:
        top = v.co.z > 0
        v.co.x = (0.70 if top else 0.82) * (1 if v.co.x > 0 else -1)
        v.co.y = (-0.62 if v.co.y < 0 else 0.72) if top else (-1.05 if v.co.y < 0 else 1.18)
        v.co.z = 1.40 if top else 0.84
    cab = new_obj('cabin', bm); m = cab.modifiers.new('bev', 'BEVEL'); m.width = 0.07; m.segments = 2; keep(cab, 'glass', '#1f2630')
    keep(box('roof', -0.72, 0.72, -0.66, 0.76, 1.38, 1.43, 0.04, 2), 'carbody', '#ffffff')
    for sx in (-1, 1):
        for y in (-0.64, 0.24, 0.74):  # pillars
            p = box(f'pillar{sx}{y}', sx * 0.78 - 0.02, sx * 0.78 + 0.02, y - 0.03, y + 0.03, 0.86, 1.38, 0.01, 1); keep(p, 'carbody', '#ffffff')
        keep(wheel(f'wheelF{sx}', sx * 0.78, -1.28), 'metal', '#16151a'); keep(wheel(f'wheelB{sx}', sx * 0.78, 1.28), 'metal', '#16151a')
        keep(box(f'hl{sx}', sx * 0.55 - 0.18, sx * 0.55 + 0.18, -2.07, -2.03, 0.62, 0.74, 0.01, 1), 'glow', '#fff1cf')
        keep(box(f'tl{sx}', sx * 0.6 - 0.2, sx * 0.6 + 0.2, 2.03, 2.07, 0.66, 0.76, 0.01, 1), 'glow', '#b23a3a')
        keep(box(f'mir{sx}', sx * 0.93 - 0.05, sx * 0.93 + 0.05, -0.8, -0.62, 1.0, 1.1, 0.02, 1), 'carbody', '#ffffff')
    keep(box('bumperF', -0.85, 0.85, -2.1, -2.0, 0.32, 0.5, 0.03, 2), 'metal', '#2a292f'); keep(box('bumperB', -0.85, 0.85, 2.0, 2.1, 0.32, 0.5, 0.03, 2), 'metal', '#2a292f')
    keep(box('sill', -0.9, 0.9, -1.8, 1.8, 0.28, 0.34, 0.02, 1), 'metal', '#1b1a1f')
    return finish('car')

# ------------------------------------------------------------------ townhouse kit (facade-local: x lateral, y up, front = -Y in Blender = +z in the game; origin = opening centre at sill / threshold)
def build_surround(ped=True, w=1.12, h=2.78):
    reset(); PARTS.clear()
    for sx in (-1, 1):   # architrave strips
        keep(box(f'arch{sx}', sx * (w / 2 + 0.01) - (0.0 if sx < 0 else 0.0) + (0.0), sx * (w / 2 + 0.13), -0.10, 0.0, 0.0, h + 0.08, 0.012, 1), 'stone', '#ffffff')
    keep(box('lintel', -w / 2 - 0.16, w / 2 + 0.16, -0.12, 0.0, h, h + 0.12, 0.012, 1), 'stone', '#ffffff')
    keep(box('cornice', -w / 2 - 0.24, w / 2 + 0.24, -0.20, -0.02, h + 0.12, h + 0.2, 0.012, 1), 'stone', '#ffffff')
    keep(box('sill', -w / 2 - 0.1, w / 2 + 0.1, -0.17, 0.0, -0.07, 0.0, 0.01, 1), 'stone', '#ffffff')
    for sx in (-1, 1): keep(box(f'bracket{sx}', sx * (w / 2 + 0.2) - 0.04, sx * (w / 2 + 0.2) + 0.04, -0.14, -0.02, h - 0.1, h + 0.12, 0.008, 1), 'stone', '#ffffff')
    if ped:
        bm = bmesh.new()
        a = bm.verts.new((-w / 2 - 0.2, -0.02, h + 0.2)); b = bm.verts.new((w / 2 + 0.2, -0.02, h + 0.2)); c = bm.verts.new((0, -0.02, h + 0.2 + 0.26))
        a2 = bm.verts.new((-w / 2 - 0.2, -0.17, h + 0.2)); b2 = bm.verts.new((w / 2 + 0.2, -0.17, h + 0.2)); c2 = bm.verts.new((0, -0.17, h + 0.2 + 0.26))
        for f in ((a, b, c), (c2, b2, a2), (a, a2, b2, b), (b, b2, c2, c), (c, c2, a2, a)): bm.faces.new(f)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); keep(new_obj('ped', bm), 'stone', '#ffffff')
    return finish('surround_ped' if ped else 'surround_flat')

def build_portico():
    reset(); PARTS.clear()
    for sx in (-1, 1):
        c = lathe(f'col{sx}', [(0.13, 0.0), (0.13, 0.12), (0.095, 0.16), (0.09, 2.7), (0.12, 2.76), (0.12, 2.9)], 10); c.location = (sx * 0.95, -0.55, 0.0); keep(c, 'stone', '#ffffff')
        keep(box(f'pil{sx}', sx * 0.7 - 0.05, sx * 0.7 + 0.05, -0.10, 0.0, 0.0, 3.0, 0.01, 1), 'stone', '#ffffff')
    keep(box('entab', -1.25, 1.25, -0.72, 0.0, 2.9, 3.12, 0.012, 1), 'stone', '#ffffff')
    keep(box('cornice', -1.32, 1.32, -0.78, 0.0, 3.12, 3.24, 0.012, 1), 'stone', '#ffffff')
    keep(box('fanframe', -0.7, 0.7, -0.07, 0.0, 2.98, 3.03, 0.006, 1), 'stone', '#ffffff')
    # fanlight arch ring (dark ironwork) above the door
    ring = sweep('fan', [(-0.58 * math.cos(a), -0.05, 2.62 + 0.38 * math.sin(a)) for a in [math.pi * k / 6 for k in range(7)]], 0.012); keep(ring, 'iron', '#26242b')
    keep(box('base', -1.2, 1.2, -0.75, 0.0, 0.0, 0.1, 0.01, 1), 'stone', '#ffffff')
    return finish('portico')

LIB['lamp'] = build_lamp(); LIB['bench'] = build_bench(); LIB['urn'] = build_urn(); LIB['chair'] = build_chair(); LIB['table'] = build_table(); LIB['car'] = build_car(); LIB['surround_ped'] = build_surround(True); LIB['surround_flat'] = build_surround(False); LIB['portico'] = build_portico()
with open(f'{ROOT}/src/street/baked/props.json', 'w') as f: json.dump(LIB, f, separators=(',', ':'))
for k, v in LIB.items(): print(k, {b: len(d['p']) // 9 for b, d in v.items()}, 'tris')
