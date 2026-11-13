"""Wellness World — organic street props (owner: rebuild everything, nothing should read as stacked primitives): car, leafy shrub, grass tuft, bicycle.
Blender / bpy, headless. Run: python3 assets/blender/make_street_organic.py -> src/baked/street_organic.json (keeps vertex colours: props.js tints/uses them).
Front = -Y in Blender (= +Z in three). Origin on the ground. Uses blade()/tube() from make_flowers.py."""
import os, random, json, math
here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(here, 'make_flowers.py')).read().split('# ---------- flower heads')[0])
from mathutils import Vector, Matrix

def sup_ring(bm, y, hw, z0, z1, n=16, e=3.2, cx=0.0):
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n; c, s = math.cos(a), math.sin(a)
        x = cx + hw * math.copysign(abs(c) ** (2 / e), c); z = (z0 + z1) / 2 + (z1 - z0) / 2 * math.copysign(abs(s) ** (2 / e), s)
        pts.append(bm.verts.new((x, y, z)))
    return pts

def loft(name, stations, n=16, e=3.2, cap=True):
    bm = bmesh.new(); rings = [sup_ring(bm, *st, n=n, e=e) for st in stations]
    for A, B in zip(rings[:-1], rings[1:]):
        for k in range(n):
            m = (k + 1) % n
            try: bm.faces.new((A[k], A[m], B[m], B[k]))
            except ValueError: pass
    if cap:
        for ring, flip in ((rings[0], True), (rings[-1], False)):
            try: bm.faces.new(ring[::-1] if flip else ring)
            except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def wheel(name, x, y, r=0.33, w=0.2):
    o = lathe(name + 't', [(r * 0.62, -w / 2), (r * 0.94, -w / 2), (r, -w * 0.32), (r, w * 0.32), (r * 0.94, w / 2), (r * 0.62, w / 2)], 20)
    o.rotation_euler = (0, math.pi / 2, 0); o.location = (x, y, r); keep(o, 'metal', '#1d1d22')
    d = lathe(name + 'r', [(0.0, -w * 0.3), (r * 0.62, -w * 0.3), (r * 0.62, w * 0.34), (0.0, w * 0.34)], 16)
    d.rotation_euler = (0, math.pi / 2, 0); d.location = (x, y, r); keep(d, 'metal', '#9a9aa2')

def car(name='car2', variant=0):
    reset(); PARTS.clear()
    lower = [(-2.05, 0.70, 0.34, 0.64), (-1.92, 0.84, 0.28, 0.74), (-1.3, 0.89, 0.27, 0.84), (-0.7, 0.9, 0.27, 0.9), (0.9, 0.9, 0.27, 0.92), (1.7, 0.88, 0.28, 0.9), (2.0, 0.78, 0.33, 0.8), (2.05, 0.66, 0.36, 0.72)]
    keep(loft('body', lower, 18, 3.4), 'carbody', '#ffffff')
    cabs = [[(-0.95, 0.64, 0.86, 1.0), (-0.55, 0.77, 0.86, 1.28), (0.5, 0.77, 0.86, 1.32), (1.15, 0.72, 0.86, 1.2), (1.4, 0.62, 0.86, 1.0)],      # hatch
            [(-0.95, 0.64, 0.86, 1.0), (-0.55, 0.77, 0.86, 1.3), (0.9, 0.78, 0.86, 1.34), (1.65, 0.76, 0.86, 1.3), (1.85, 0.7, 0.86, 1.1)],        # estate
            [(-0.75, 0.62, 0.86, 1.0), (-0.35, 0.75, 0.86, 1.26), (0.35, 0.75, 0.86, 1.28), (0.8, 0.68, 0.86, 1.1), (1.0, 0.6, 0.86, 0.98)],       # saloon (short cabin, boot behind)
            [(-1.0, 0.7, 0.86, 1.1), (-0.7, 0.8, 0.86, 1.55), (1.2, 0.8, 0.86, 1.62), (1.8, 0.78, 0.86, 1.5), (1.95, 0.7, 0.86, 1.2)]]            # compact van
    cab = cabs[variant]
    keep(loft('glass', cab, 16, 3.0), 'glass', '#2a2d38')
    roofs = [[(-0.5, 0.74, 1.27, 1.34), (0.5, 0.74, 1.31, 1.35), (1.1, 0.7, 1.19, 1.24)], [(-0.5, 0.75, 1.28, 1.35), (1.0, 0.76, 1.32, 1.36), (1.6, 0.74, 1.27, 1.31)], [(-0.3, 0.73, 1.24, 1.31), (0.3, 0.73, 1.26, 1.32), (0.75, 0.66, 1.1, 1.16)], [(-0.65, 0.78, 1.5, 1.58), (1.2, 0.78, 1.57, 1.64), (1.75, 0.76, 1.46, 1.52)]]
    roof = roofs[variant]
    keep(loft('roof', roof, 14, 3.0), 'carbody', '#ffffff')
    for sx in (-1, 1):
        for (yy, hh) in ((-0.7, 0.4), (1.2, 0.3)):                                  # A/C pillars as raked slim boxes
            keep(box(f'pil{sx}{yy}', sx * 0.7 - 0.025, sx * 0.7 + 0.025, yy - 0.04, yy + 0.04, 0.86, 1.0 + hh * 0.7, 0.01, 1), 'carbody', '#ffffff')
        keep(box(f'mir{sx}', sx * 0.93 - 0.05, sx * 0.93 + 0.05, -0.7, -0.55, 0.98, 1.06, 0.02, 1), 'carbody', '#ffffff')
        keep(box(f'hl{sx}', sx * 0.52 - 0.17, sx * 0.52 + 0.17, -2.0, -1.88, 0.62, 0.72, 0.02, 1), 'glow', '#ffe2b0')
        keep(box(f'tl{sx}', sx * 0.55 - 0.16, sx * 0.55 + 0.16, 1.97, 2.06, 0.62, 0.72, 0.02, 1), 'glow', '#a2323a')
        for yy in (-1.3, 1.3): wheel(f'w{sx}{yy}', sx * 0.83, yy)
    keep(box('grille', -0.3, 0.3, -2.07, -1.96, 0.42, 0.55, 0.01, 1), 'metal', '#26262c')
    keep(box('bump', -0.78, 0.78, -2.08, -1.9, 0.3, 0.4, 0.04, 2), 'metal', '#2a2a30')
    keep(box('bumpr', -0.76, 0.76, 1.95, 2.09, 0.3, 0.4, 0.04, 2), 'metal', '#2a2a30')
    keep(box('sill', -0.9, 0.9, -1.3, 1.3, 0.24, 0.3, 0.02, 1), 'metal', '#222226')
    return finish(name)

def shrub(name, seed, r=0.55, h=0.8, n=95):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    greens = ['#566e40', '#4d6039', '#627547', '#5a6a46', '#6f8450']
    bms = [bmesh.new() for _ in greens]
    for i in range(n):
        z = rnd.random() ** 0.8; a = rnd.random() * math.tau; rr = math.sqrt(1 - z * z)
        nd = Vector((math.cos(a) * rr, math.sin(a) * rr, z)); pos = Vector((nd.x * r * 0.7, nd.y * r * 0.7, 0.06 + nd.z * h * 0.78))
        side = nd.cross(Vector((0, 0, 1))); side = side.normalized() if side.length > 1e-3 else Vector((1, 0, 0))
        d = (nd * 0.85 + side * (rnd.random() - 0.5) * 0.9 + Vector((0, 0, 0.3))).normalized()
        blade(bms[int(rnd.random() * len(greens))], pos, d, 0.16 + rnd.random() * 0.1, 0.1 + rnd.random() * 0.06, bend=0.55, cup=0.15, fold=0.5, rows=2, cols=2, prof=0.7, tip=0.85, up=Vector((0, 0, 1)))
    for k in range(5): keep(new_obj(f'{name}{k}', bms[k]), 'leaf', greens[k])
    for q in range(5):
        a = q / 5 * math.tau; tb = bmesh.new(); tube(tb, [Vector((0, 0, 0)), Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, 0.18))], 0.02, 0.012, 4); keep(new_obj(f'tr{q}', tb), 'leaf', '#4a3a2c')
    return finish(name)

def grass(name, seed, n=24):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    cols = ['#8a9f58', '#6f8a46', '#a5b56a']; bms = [bmesh.new() for _ in cols]
    for i in range(n):
        a = rnd.random() * math.tau; rr = rnd.random() * 0.08
        d = Vector((math.cos(a) * (0.25 + rnd.random() * 0.4), math.sin(a) * (0.25 + rnd.random() * 0.4), 1.0)).normalized()
        blade(bms[i % 3], Vector((math.cos(a) * rr, math.sin(a) * rr, 0.0)), d, 0.45 + rnd.random() * 0.4, 0.035, bend=-(0.5 + rnd.random() * 0.9), rows=4, cols=1, prof=0.6, tip=1.1)
    for k in range(3): keep(new_obj(f'{name}{k}', bms[k]), 'leaf', cols[k])
    return finish(name)

def bike():
    reset(); PARTS.clear(); steel = '#8a9484'; dark = '#2b2a30'
    def ring(name, y, r, tr=0.017):
        pts = [Vector((0, y + math.cos(a) * r, r + math.sin(a) * r)) for a in [i / 16 * math.tau for i in range(17)]]
        b = bmesh.new(); tube(b, pts, tr, tr, 5); keep(new_obj(name, b), 'metal', dark)
        for k in range(8):
            a = k / 8 * math.tau; sb = bmesh.new(); tube(sb, [Vector((0, y, r)), Vector((0, y + math.cos(a) * r, r + math.sin(a) * r))], 0.004, 0.004, 3); keep(new_obj(f'{name}s{k}', sb), 'metal', '#b5b8bd')
    ring('wf', -0.46, 0.33); ring('wr', 0.46, 0.33)
    def tb(name, pts, r=0.014, col=steel):
        b = bmesh.new(); tube(b, [Vector(p) for p in pts], r, r, 5); keep(new_obj(name, b), 'metal', col)
    bb = (0, 0.05, 0.3); st = (0, 0.12, 0.88); hd = (0, -0.34, 0.9); fr = (0, -0.46, 0.33); rr = (0, 0.46, 0.33)
    tb('top', [st, (0, -0.1, 0.84), hd]); tb('down', [hd, (0, -0.1, 0.55), bb]); tb('seat', [bb, (0, 0.08, 0.6), st]); tb('chs', [bb, (0, 0.28, 0.32), rr]); tb('sst', [st, (0, 0.3, 0.6), rr]); tb('fork', [hd, (0, -0.4, 0.62), fr])
    tb('stem', [(0, -0.34, 0.9), (0, -0.33, 1.0)]); tb('bar', [(-0.21, -0.33, 1.0), (-0.1, -0.33, 1.02), (0.1, -0.33, 1.02), (0.21, -0.33, 1.0)], 0.012, dark)
    keep(box('sad', -0.06, 0.06, 0.04, 0.26, 0.9, 0.95, 0.02, 2), 'metal', dark)
    tb('post', [st, (0, 0.12, 0.93)])
    keep(box('basket', -0.16, 0.16, -0.62, -0.38, 0.98, 1.2, 0.01, 1), 'wood', '#b08d57')
    for sx in (-1, 1): tb(f'ped{sx}', [bb, (sx * 0.1, 0.05, 0.22)], 0.01, dark)
    return finish('bike2')

LIB = {}
LIB['car2'] = car('car2', 0); LIB['car3'] = car('car3', 1); LIB['car4'] = car('car4', 2); LIB['car5'] = car('car5', 3)
LIB['shrub_o0'] = shrub('shrub_o0', 71, 0.55, 0.8); LIB['shrub_o1'] = shrub('shrub_o1', 73, 0.62, 0.9, 110)
LIB['grass_o'] = grass('grass_o', 77); LIB['bike2'] = bike()
for k, v in LIB.items(): print(k, sum(len(b['p']) // 9 for b in v.values()), 'tris')
json.dump(LIB, open(f'{ROOT}/src/baked/street_organic.json', 'w'), separators=(',', ':'))
