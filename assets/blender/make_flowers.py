"""Wellness World — organic flower / foliage kit (owner: "a flower should look like a proper flower, not a sum of geometry figures"). Blender / bpy, headless.
Run: python3 assets/blender/make_flowers.py -> src/baked/flowers.json (buckets: bloom = main petals, bloom2 = secondary petals / centre, leaf, stem; origin on ground, y-up after export).
Everything is built from curved, double-sided blade surfaces (petals, leaves) swept along a bending spine with a width profile, cup and mid-rib fold, plus tapered curved stems."""
import os, random
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
import json, math
from mathutils import Vector, Matrix
C = '#ffffff'

def blade(bm, base, d, L, W, bend=0.0, cup=0.0, fold=0.0, rows=5, cols=3, prof=0.8, tip=0.55, up=Vector((0, 0, 1)), twist=0.0):
    """Curved blade: spine integrates `bend` radians total toward the inner normal; width profile sin(pi*u)^prof (pointed tip when tip<1); cup lifts the edges, fold dips the mid-rib."""
    d = Vector(d).normalized(); side = d.cross(up)
    if side.length < 1e-3: side = Vector((1, 0, 0))
    side.normalize(); n = side.cross(d).normalized()          # inner normal (roughly up for flat petals)
    p = Vector(base); sp = []; dd = d.copy(); nn = n.copy(); ss = side.copy()
    for i in range(rows + 1):
        u = i / rows; sp.append((p.copy(), ss.copy(), nn.copy(), u))
        if i < rows:
            ang = bend / rows; rot = Matrix.Rotation(ang, 3, ss); dd = rot @ dd; nn = rot @ nn
            if twist: rt = Matrix.Rotation(twist / rows, 3, dd); ss = rt @ ss; nn = rt @ nn
            p = p + dd * (L / rows)
    grid = []
    for (pp, ss, nn, u) in sp:
        w = max(0.0, math.sin(math.pi * min(1.0, u ** tip if u > 0 else 0)) ** prof) if u < 1 else 0.0
        if u == 0: w = 0.12
        row = []
        for j in range(cols + 1):
            v = -1 + 2 * j / cols
            off = ss * (v * w * W * 0.5) + nn * (cup * v * v * w * W * 0.5 - fold * (1 - abs(v)) * w * W * 0.12 * 0 + (-fold * abs(v) * w * W * 0.3))
            row.append(bm.verts.new(pp + off))
        grid.append(row)
    for i in range(rows):
        for j in range(cols):
            a, b, c, d2 = grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]
            for q in ((a, b, c, d2), (d2, c, b, a)):
                try: bm.faces.new(q)
                except ValueError: pass

def tube(bm, pts, r0, r1, seg=5):
    """tapered stem swept through points (list of Vector)."""
    rings = []
    for i, p in enumerate(pts):
        t = i / (len(pts) - 1); r = r0 + (r1 - r0) * t
        tan = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = tan.cross(Vector((0, 0, 1)))
        if a.length < 1e-3: a = Vector((1, 0, 0))
        a.normalize(); b = tan.cross(a).normalized()
        rings.append([bm.verts.new(p + (a * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for A, B in zip(rings[:-1], rings[1:]):
        for k in range(seg):
            m = (k + 1) % seg
            try: bm.faces.new((A[k], A[m], B[m], B[k]))
            except ValueError: pass

def dome(bm, c, r, h, seg=8, rings=3):
    vs = []
    for i in range(rings + 1):
        ph = math.pi / 2 * i / rings; rr = r * math.cos(ph); z = h * math.sin(ph)
        vs.append([bm.verts.new(Vector(c) + Vector((rr * math.cos(2 * math.pi * k / seg), rr * math.sin(2 * math.pi * k / seg), z))) for k in range(seg)] if rr > 1e-4 else [bm.verts.new(Vector(c) + Vector((0, 0, z)))])
    for A, B in zip(vs[:-1], vs[1:]):
        for k in range(seg):
            m = (k + 1) % seg
            try:
                if len(B) == 1: bm.faces.new((A[k], A[m], B[0]))
                else: bm.faces.new((A[k], A[m], B[m], B[k]))
            except ValueError: pass

def leaf(bm, base, azim, elev, L, W, bend=0.5, fold=0.5, serr=0):
    d = Vector((math.cos(azim) * math.cos(elev), math.sin(azim) * math.cos(elev), math.sin(elev)))
    blade(bm, base, d, L, W, bend=-bend, cup=0.0, fold=fold, rows=3, cols=2, prof=0.75, tip=0.8)

def stem_curve(h, lean, azim, n=6, wob=0.0, rnd=None):
    pts = []
    for i in range(n):
        t = i / (n - 1); r = lean * t * t
        pts.append(Vector((math.cos(azim) * r, math.sin(azim) * r, h * t + (math.sin(t * 5) * wob if wob else 0))))
    return pts

def mk(name, bms):
    out = []
    for nm, bm, bucket in bms:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces) if False else None
        keep(new_obj(nm, bm), bucket, C)

def new_bm(): return bmesh.new()

# ---------- flower heads (added into bms at position) ----------
def head_rose(B, c, r, azim_tilt=0.0, seed=1):
    rnd = random.Random(seed); golden = 2.399963
    n_tot = 15
    for i in range(n_tot):
        t = i / (n_tot - 1); ring = t                                 # 0 = bud centre, 1 = outer
        a = i * golden + rnd.random() * 0.15
        elev = 1.35 - ring * 1.05                                     # tight cup -> open
        L = r * (0.45 + 0.75 * ring); W = r * (0.55 + 0.7 * ring)
        base = Vector(c) + Vector((math.cos(a), math.sin(a), 0)) * r * 0.06 * (1 + ring)
        d = Vector((math.cos(a) * math.cos(elev), math.sin(a) * math.cos(elev), math.sin(elev)))
        blade(B['bloom' if i % 3 else 'bloom2'], base, d, L, W, bend=0.9 - 0.8 * ring, cup=0.55 - 0.25 * ring, rows=3, cols=3, prof=0.55, tip=1.2)
    dome(B['bloom2'], c, r * 0.16, r * 0.18, 6, 2)

def head_daisy(B, c, r, seed=1):
    rnd = random.Random(seed); n = 12
    for i in range(n):
        a = i / n * math.tau + rnd.random() * 0.08; elev = 0.12 + rnd.random() * 0.15
        d = Vector((math.cos(a) * math.cos(elev), math.sin(a) * math.cos(elev), math.sin(elev)))
        blade(B['bloom2'], Vector(c) + Vector((math.cos(a), math.sin(a), 0)) * r * 0.16, d, r * (0.9 + rnd.random() * 0.2), r * 0.17, bend=0.25, cup=0.2, rows=3, cols=2, prof=0.5, tip=1.4)
    dome(B['bloom'], c, r * 0.24, r * 0.16, 8, 3)

def head_tulip(B, c, r, seed=1):
    rnd = random.Random(seed)
    for i in range(6):
        a = i / 6 * math.tau + rnd.random() * 0.1; elev = 1.25 - (0.15 if i % 2 else 0.0)
        d = Vector((math.cos(a) * math.cos(elev), math.sin(a) * math.cos(elev), math.sin(elev)))
        blade(B['bloom' if i % 2 else 'bloom2'], Vector(c) + Vector((math.cos(a), math.sin(a), 0)) * r * 0.28, d, r * 1.9, r * 1.15, bend=-0.55, cup=0.9, rows=4, cols=3, prof=0.45, tip=0.7)

def head_cosmos(B, c, r, seed=1):
    rnd = random.Random(seed); n = 8
    for i in range(n):
        a = i / n * math.tau + rnd.random() * 0.1; elev = 0.18
        d = Vector((math.cos(a) * math.cos(elev), math.sin(a) * math.cos(elev), math.sin(elev)))
        blade(B['bloom'], Vector(c) + Vector((math.cos(a), math.sin(a), 0)) * r * 0.1, d, r * 1.05, r * 0.62, bend=0.2, cup=0.35, fold=0.2, rows=3, cols=3, prof=0.5, tip=1.5)
    dome(B['bloom2'], c, r * 0.17, r * 0.12, 7, 2)

def head_floret_ball(B, c, r, seed=1, nflor=34, fs=0.05):                          # hydrangea / viburnum style: a dome of four-petal florets
    rnd = random.Random(seed)
    for i in range(nflor):
        z = rnd.random() * 0.95; a = rnd.random() * math.tau; rr = math.sqrt(1 - z * z)
        nrm = Vector((math.cos(a) * rr, math.sin(a) * rr, z)); pos = Vector(c) + nrm * r * Vector((1, 1, 0.8))
        for k in range(4):
            ph = k / 4 * math.tau + rnd.random() * 0.4
            tang = nrm.cross(Vector((0, 0, 1))); tang = tang.normalized() if tang.length > 1e-3 else Vector((1, 0, 0))
            tang2 = nrm.cross(tang)
            dirv = (tang * math.cos(ph) + tang2 * math.sin(ph) + nrm * 0.35).normalized()
            blade(B['bloom' if rnd.random() < 0.7 else 'bloom2'], pos, dirv, fs * 1.1, fs * 0.9, bend=0.3, cup=0.4, rows=2, cols=2, prof=0.6, tip=1.0, up=nrm)

def head_spike(B, c, h, seed=1):                                                  # lavender: whorls of small bell petals up a tapering spike
    rnd = random.Random(seed)
    for i in range(6):
        t = i / 5; z = c[2] + h * t
        for k in range(2):
            a = rnd.random() * math.tau + i * 1.7; d = Vector((math.cos(a) * 0.8, math.sin(a) * 0.8, 0.5)).normalized()
            blade(B['bloom2'], Vector((c[0], c[1], z)), d, 0.032 * (1 - 0.4 * t), 0.022 * (1 - 0.4 * t), bend=0.5, cup=0.7, rows=2, cols=2, prof=0.7, tip=1.0)

# ---------- whole plants ----------
def plant(name, kind, seed, n_heads, h, spread, headfn, head_r, leaf_L, leaf_W, leaves_per=5, stem_r=0.006, leaf_up=0.25):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    B = {k: new_bm() for k in ('bloom', 'bloom2', 'leaf', 'stem')}
    for i in range(n_heads):
        a = rnd.random() * math.tau; rr = rnd.random() * spread * 0.5
        hh = h * (0.75 + rnd.random() * 0.4); lean = rr + spread * 0.25 * rnd.random()
        pts = [p + Vector((math.cos(a) * rr * 0.3, math.sin(a) * rr * 0.3, 0)) for p in stem_curve(hh, lean, a, 6, 0.012)]
        tube(B['stem'], pts, stem_r, stem_r * 0.7)
        top = pts[-1]
        for j in range(leaves_per):
            t = 0.12 + 0.6 * (j / max(1, leaves_per - 1)); idx = min(len(pts) - 1, int(t * (len(pts) - 1)))
            leaf(B['leaf'], pts[idx], a + (j * 2.1 + rnd.random()), leaf_up + 0.35 * (1 - t), leaf_L * (1.0 - 0.45 * t), leaf_W * (1.0 - 0.3 * t), bend=0.5 + rnd.random() * 0.3, fold=0.5)
        headfn(B, top, head_r * (0.85 + rnd.random() * 0.3), seed + i)
    for j in range(5):                                                              # basal rosette leaves
        a = rnd.random() * math.tau
        leaf(B['leaf'], Vector((math.cos(a) * 0.02, math.sin(a) * 0.02, 0.02)), a, 0.45 + rnd.random() * 0.4, leaf_L * 1.1, leaf_W * 1.05, bend=0.7, fold=0.55)
    mk(name, [(f'{name}_{k}', bm, k) for k, bm in B.items()])
    return finish(name)

def hydrangea_new(name, seed, h=0.62, r=0.42, heads=4):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    B = {k: new_bm() for k in ('bloom', 'bloom2', 'leaf', 'stem')}
    for i in range(heads):
        a = i / heads * math.tau + rnd.random() * 0.8; rr = r * (0.2 + 0.45 * rnd.random()); z = h * (0.62 + 0.3 * rnd.random())
        c = Vector((math.cos(a) * rr, math.sin(a) * rr, z)); tube(B['stem'], [Vector((c.x * 0.2, c.y * 0.2, 0.05)), Vector((c.x * 0.6, c.y * 0.6, z * 0.5)), Vector((c.x, c.y, z - 0.05))], 0.01, 0.008)
        head_floret_ball(B, c, 0.11 + rnd.random() * 0.04, seed + i, 16, 0.07)
    for j in range(9):                                                             # big opposite, serrated-look leaves around the stems
        a = j / 9 * math.tau + rnd.random() * 0.4; zb = 0.08 + rnd.random() * h * 0.45
        leaf(B['leaf'], Vector((math.cos(a) * 0.04, math.sin(a) * 0.04, zb)), a, 0.25 + rnd.random() * 0.3, r * (0.7 + rnd.random() * 0.3), r * 0.55, bend=0.6, fold=0.6)
    mk(name, [(f'{name}_{k}', bm, k) for k, bm in B.items()])
    return finish(name)

def lavender_new(name, seed, n=12, h=0.5):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    B = {k: new_bm() for k in ('bloom2', 'leaf', 'stem')}
    for i in range(n):
        a = rnd.random() * math.tau; rr = rnd.random() * 0.09; lean = 0.05 + rnd.random() * 0.12; hh = h * (0.85 + rnd.random() * 0.3)
        pts = [Vector((math.cos(a) * (rr + lean * (k / 5) ** 2), math.sin(a) * (rr + lean * (k / 5) ** 2), hh * k / 5)) for k in range(6)]
        tube(B['stem'], pts, 0.004, 0.003, 4)
        head_spike(B, (pts[-1].x, pts[-1].y, hh * 0.68), hh * 0.34, seed + i)
    for j in range(14):                                                              # narrow grey-green leaves
        a = rnd.random() * math.tau
        blade(B['leaf'], Vector((math.cos(a) * 0.03, math.sin(a) * 0.03, 0.02)), Vector((math.cos(a) * 0.45, math.sin(a) * 0.45, 0.9)), 0.2 + rnd.random() * 0.15, 0.02, bend=-0.5, rows=3, cols=1, prof=0.5, tip=1.0)
    mk(name, [(f'{name}_{k}', bm, k) for k, bm in B.items()])
    return finish(name)

LIB = {}
LIB['rose0'] = plant('rose0', 'rose', 101, 3, 0.62, 0.45, lambda B, c, r, s: head_rose(B, c, r, 0, s), 0.075, 0.12, 0.075, 4)
LIB['rose1'] = plant('rose1', 'rose', 117, 4, 0.55, 0.5, lambda B, c, r, s: head_rose(B, c, r, 0, s), 0.07, 0.11, 0.07, 4)
LIB['daisy0'] = plant('daisy0', 'daisy', 201, 5, 0.4, 0.35, head_daisy, 0.06, 0.1, 0.03, 2, 0.004)
LIB['daisy1'] = plant('daisy1', 'daisy', 212, 6, 0.34, 0.4, head_daisy, 0.055, 0.09, 0.028, 2, 0.004)
LIB['tulip0'] = plant('tulip0', 'tulip', 301, 4, 0.42, 0.24, head_tulip, 0.04, 0.32, 0.075, 0, 0.006)
LIB['cosmos0'] = plant('cosmos0', 'cosmos', 401, 4, 0.75, 0.5, head_cosmos, 0.06, 0.14, 0.02, 3, 0.005)
for s in range(3): LIB[f'hydrangea_n{s}'] = hydrangea_new(f'hydrangea_n{s}', 500 + s, 0.58 + s * 0.06, 0.4 + s * 0.04, 4 + s)
for s in range(2): LIB[f'lavender_n{s}'] = lavender_new(f'lavender_n{s}', 600 + s, 10 + s * 3, 0.46 + s * 0.06)
for k, v in LIB.items():
    for b in v.values(): b.pop('c', None)
    print(k, sum(len(b['p']) // 9 for b in v.values()), 'tris')
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
json.dump(LIB, open(f'{ROOT}/src/baked/flowers.json', 'w'), separators=(',', ':'))
