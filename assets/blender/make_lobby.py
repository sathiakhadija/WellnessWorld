"""Wellness World — private lift lobby kit (Design Bible s05, pp.16-20). Blender / bpy, headless.  Run: python3.13 assets/blender/make_lobby.py
Reuses the make_props helpers (box/lathe/sweep/keep/finish). Bakes src/baked/lobby.json (triangle soup per material bucket, y-up, front +z, origin = floor contact at the wall face).
Buckets map to registry materials in src/Lobby.jsx: trim, brass, marble, gold, dark, flute, top, tube, rug, ivy1, ivy2, stem, bloom1, bloom2, glass, wax."""
import os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
import json, math, random
LIB = {}
C = '#ffffff'

def prism(name, pts, z0, z1):
    """extrude a (convex) polygon given as [(x, y), ...] between z0 and z1."""
    bm = bmesh.new(); bot = [bm.verts.new((x, y, z0)) for x, y in pts]; top = [bm.verts.new((x, y, z1)) for x, y in pts]
    bm.faces.new(bot[::-1]); bm.faces.new(top)
    for i in range(len(pts)):
        j = (i + 1) % len(pts); bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return new_obj(name, bm)

def half_ellipse(w, d, n=36, inset=0.0):
    """D shape: flat back on y=0, bulging toward -y (front). returns the closed polygon."""
    pts = [(-w / 2 + inset, 0.0)]
    for i in range(n + 1):
        a = math.pi * i / n; pts.append((-(w / 2 - inset) * math.cos(a), -(d - inset) * math.sin(a)))
    pts.append((w / 2 - inset, 0.0)); return pts[::1] if False else [(-(w / 2 - inset) * math.cos(math.pi * i / n), -(d - inset) * math.sin(math.pi * i / n)) for i in range(n + 1)]

def pframe(w, h, name):
    reset(); PARTS.clear(); k = lambda o, b='trim': keep(o, b, C)
    t, dep = 0.05, 0.024
    k(box('b', -w / 2, w / 2, -dep, 0, 0, t, 0.006, 2)); k(box('t', -w / 2, w / 2, -dep, 0, h - t, h, 0.006, 2))
    k(box('l', -w / 2, -w / 2 + t, -dep, 0, 0, h, 0.006, 2)); k(box('r', w / 2 - t, w / 2, -dep, 0, 0, h, 0.006, 2))
    k(box('bi', -w / 2 + t, w / 2 - t, -dep * 0.5, 0, t, t + 0.014, 0.003, 1)); k(box('ti', -w / 2 + t, w / 2 - t, -dep * 0.5, 0, h - t - 0.014, h - t, 0.003, 1))
    k(box('li', -w / 2 + t, -w / 2 + t + 0.014, -dep * 0.5, 0, t, h - t, 0.003, 1)); k(box('ri', w / 2 - t - 0.014, w / 2 - t, -dep * 0.5, 0, t, h - t, 0.003, 1))
    return finish(name)

def lift_surround():
    reset(); PARTS.clear()
    # opening 1.1 x 2.2 centred; dark marble pilasters 0.42 wide each side up to 2.6; marble lintel carrying the indicator housing; brass inlay + door frame
    for s in (-1, 1):
        keep(box(f'pil{s}', min(s * 0.56, s * 0.98), max(s * 0.56, s * 0.98), -0.05, 0.0, 0.0, 2.62, 0.004, 1), 'marble', C)
        keep(box(f'inl{s}', min(s * 0.585, s * 0.60), max(s * 0.585, s * 0.60), -0.056, -0.05, 0.0, 2.62, 0.002, 1), 'brass', C)
        keep(box(f'plin{s}', min(s * 0.56, s * 0.98), max(s * 0.56, s * 0.98), -0.056, 0.0, 0.0, 0.07, 0.004, 1), 'brass', C)
        keep(box(f'cap{s}', min(s * 0.56, s * 0.98), max(s * 0.56, s * 0.98), -0.058, 0.0, 2.58, 2.62, 0.004, 1), 'brass', C)
    keep(box('lintel', -0.56, 0.56, -0.05, 0.0, 2.2, 2.62, 0.004, 1), 'marble', C)
    keep(box('hous', -0.3, 0.3, -0.072, -0.05, 2.33, 2.52, 0.006, 2), 'dark', C)
    keep(box('hous_b', -0.31, 0.31, -0.074, -0.068, 2.32, 2.53, 0.002, 1), 'brass', C)
    # brass door frame (jambs + head), recessed face slightly proud of the doors
    for s in (-1, 1): keep(box(f'jamb{s}', min(s * 0.55, s * 0.58), max(s * 0.55, s * 0.58), -0.045, 0.0, 0.0, 2.2, 0.003, 1), 'brass', C)
    keep(box('head', -0.58, 0.58, -0.045, 0.0, 2.2, 2.235, 0.003, 1), 'brass', C)
    keep(box('thr', -0.56, 0.56, -0.04, 0.0, -0.002, 0.012, 0.002, 1), 'brass', C)
    return finish('lift_surround')

def lift_leaf():
    reset(); PARTS.clear()
    keep(box('leaf', 0.0, 0.55, -0.032, 0.0, 0.01, 2.19, 0.004, 1), 'gold', C)
    keep(box('edge', 0.0, 0.012, -0.036, -0.03, 0.01, 2.19, 0.002, 1), 'brass', C)
    return finish('lift_leaf')

def console():
    reset(); PARTS.clear()
    w, d, h = 1.5, 0.42, 0.78
    pts = half_ellipse(w, d, 40)
    keep(prism('top', [(x * 1.03, y * 1.1) for x, y in pts], h, h + 0.045), 'top', C)
    keep(prism('glow', half_ellipse(w, d, 40, 0.03), 0.06, h - 0.012), 'tube', C)               # warm LED hidden behind the flutes (shows through the gaps)
    keep(prism('back', half_ellipse(w, d, 40, 0.045), 0.06, h - 0.01), 'flute', C)
    n = 34; pr = 0.022
    for i in range(n + 1):
        a = math.pi * i / n; x = -(w / 2 - 0.02) * math.cos(a); y = -(d - 0.02) * math.sin(a)
        keep(cyl(f'fl{i}', pr, pr, 0.06, h - 0.01, 8, x=x, y=y), 'flute', C)
    keep(prism('plinth', [(x * 1.0, y * 1.0) for x, y in half_ellipse(w * 0.98, d * 0.98, 40)], 0.0, 0.06), 'dark', C)
    return finish('console')

def shelf():
    reset(); PARTS.clear()
    keep(box('slab', -0.36, 0.36, -0.27, 0.0, 0.0, 0.04, 0.006, 2), 'top', C)
    keep(box('edge', -0.36, 0.36, -0.274, -0.268, 0.0, 0.04, 0.002, 1), 'brass', C)
    keep(box('led', -0.34, 0.34, -0.25, -0.03, -0.006, 0.0, 0.001, 1), 'tube', C)
    return finish('shelf')

def call_panel():
    reset(); PARTS.clear()
    keep(box('plate', -0.045, 0.045, -0.014, 0.0, 0.0, 0.22, 0.004, 2), 'brass', C)
    keep(box('inset', -0.032, 0.032, -0.018, -0.014, 0.012, 0.208, 0.002, 1), 'dark', C)
    for i, z in enumerate((0.15, 0.07)):
        keep(cyl(f'btn{i}', 0.017, 0.017, z - 0.012, z + 0.012, 16, x=0, y=-0.018), 'brass', C)
    return finish('call_panel')

def rug():
    reset(); PARTS.clear()
    prof = [(0.0, 0.0)]; R = 0.78
    for i in range(1, 26):
        r = R * i / 25; prof += [(r, 0.004 + 0.003 * (i % 2)), (r, 0.004 + 0.003 * ((i + 1) % 2))]
    prof += [(R, 0.0)]
    keep(lathe('rug', [(0.0, 0.003)] + [(R * i / 25, 0.004 + 0.003 * (i % 2)) for i in range(1, 26)] + [(R, 0.0)], 64), 'rug', C)
    return finish('rug')

def ivy(name='ivy'):
    reset(); PARTS.clear(); random.seed(7)
    keep(cyl('pot', 0.07, 0.055, 0.0, 0.12, 20), 'brass', C)
    for v in range(5):
        ang = random.uniform(-0.6, 0.6); L = random.uniform(0.35, 0.95); pts = []
        for i in range(8):
            t = i / 7; pts.append((0.02 * v - 0.04 + 0.12 * math.sin(t * 5 + v) * t, -0.05 - 0.10 * t * math.cos(ang), 0.12 - L * t * t - 0.05 * t))
        s = sweep(f'st{v}', pts, 0.004, 1); keep(s, 'stem', C)
        for i, p in enumerate(pts):
            for k in range(2):
                bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5); ob = new_obj(f'lf{v}_{i}_{k}', bm)
                ob.scale = (0.05 + 0.02 * random.random(), 0.06 + 0.02 * random.random(), 1); ob.location = (p[0] + random.uniform(-0.03, 0.03), p[1] - random.uniform(0, 0.04), p[2] + random.uniform(-0.02, 0.02))
                ob.rotation_euler = (random.uniform(0.3, 1.5), random.uniform(-0.5, 0.5), random.uniform(0, 6.28)); keep(ob, 'ivy1' if (i + k) % 2 else 'ivy2', C)
    return finish(name)

def bouquet():
    reset(); PARTS.clear(); random.seed(3)
    keep(lathe('vase', [(0.0, 0.0), (0.04, 0.0), (0.05, 0.06), (0.04, 0.17), (0.06, 0.24), (0.058, 0.25), (0.036, 0.17), (0.0, 0.17)], 20), 'glass', C)
    for i in range(16):
        a = random.uniform(0, 6.28); r = random.uniform(0.0, 0.09); z = 0.3 + 0.10 * math.cos(r * 9) + random.uniform(-0.02, 0.03)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(0.045, 0.06), location=(r * math.cos(a), r * math.sin(a), z)); o = bpy.context.active_object; keep(o, 'bloom1' if i % 3 else 'bloom2', C)
    for i in range(6):
        bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5); ob = new_obj(f'bl{i}', bm); ob.scale = (0.11, 0.07, 1); a = 6.28 * i / 6
        ob.location = (0.07 * math.cos(a), 0.07 * math.sin(a), 0.2); ob.rotation_euler = (0.9, 0, a); keep(ob, 'ivy1', C)
    return finish('bouquet')

def lantern():
    reset(); PARTS.clear()
    keep(box('base', -0.045, 0.045, -0.045, 0.045, 0.0, 0.015, 0.003, 1), 'brass', C); keep(box('top', -0.045, 0.045, -0.045, 0.045, 0.2, 0.215, 0.003, 1), 'brass', C)
    for sx in (-1, 1):
        for sy in (-1, 1): keep(box(f'p{sx}{sy}', sx * 0.04 - 0.004, sx * 0.04 + 0.004, sy * 0.04 - 0.004, sy * 0.04 + 0.004, 0.0, 0.215, 0.001, 1), 'brass', C)
    keep(box('glass', -0.04, 0.04, -0.04, 0.04, 0.015, 0.2, 0.001, 1), 'glass', C); keep(cyl('wax', 0.022, 0.022, 0.015, 0.1, 12), 'wax', C); keep(cyl('flame', 0.008, 0.001, 0.1, 0.125, 8), 'tube', C)
    return finish('lantern')

LIB['pf_tall'] = pframe(0.9, 1.9, 'pf_tall'); LIB['pf_low'] = pframe(0.78, 0.52, 'pf_low'); LIB['pf_wide'] = pframe(1.24, 1.9, 'pf_wide')
LIB['lift_surround'] = lift_surround(); LIB['lift_leaf'] = lift_leaf(); LIB['console'] = console(); LIB['shelf'] = shelf(); LIB['call_panel'] = call_panel()
LIB['rug'] = rug(); LIB['ivy'] = ivy(); LIB['bouquet'] = bouquet(); LIB['lantern'] = lantern()
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
for v in LIB.values():
    for b in v.values(): b.pop('c', None)         # colours are material-driven in the game
json.dump(LIB, open(f'{ROOT}/src/baked/lobby.json', 'w'), separators=(',', ':'))
for k_, v in LIB.items(): print(k_, {b: len(d['p']) // 9 for b, d in v.items()}, 'tris')
