"""Wellness World — planting kit (Design Bible s08/s09/s10/s11/s15): modelled hydrangea, lavender and leafy shrub clusters. Blender / bpy, headless.
Run: python3 assets/blender/make_plants.py  -> src/baked/plants.json (buckets: leaf, bloom, bloom2, stem; y-up, origin on the ground).
Organic: lens-shaped leaves (closed, 8 tris, no backface culling issue), lumpy jittered floret balls, thin stems; seeded variants."""
import os, random
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
import json, math
from mathutils import Vector
C = '#ffffff'

def leaf_obj(name, specs):
    """specs: list of (base(x,y,z), dir unit vec, length, width). Closed lens leaf with a mid-rib bend."""
    bm = bmesh.new()
    for base, d, L, W, *rest in specs:
        droop = rest[0] if rest else 0.18
        d = Vector(d).normalized(); up = Vector((0, 0, 1)); side = d.cross(up)
        if side.length < 1e-3: side = Vector((1, 0, 0))
        side.normalize(); nrm = side.cross(d).normalized(); b = Vector(base)
        tip = b + d * L + Vector((0, 0, -droop * L))          # leaf droops at the tip
        mid = b + d * L * 0.5 + Vector((0, 0, 0.04 * L * (droop / 0.18)))
        a = bm.verts.new(b); t = bm.verts.new(tip)
        l = bm.verts.new(mid + side * W * 0.5); r = bm.verts.new(mid - side * W * 0.5)
        u = bm.verts.new(mid + nrm * W * 0.12); dn = bm.verts.new(mid - nrm * W * 0.12)
        for tri in ((a, l, u), (l, t, u), (t, r, u), (r, a, u), (l, a, dn), (t, l, dn), (r, t, dn), (a, r, dn)):
            try: bm.faces.new(tri)
            except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def ball_obj(name, centres, jitter, seed, sub=1):
    """Lumpy floret balls: (centre, radius) list, ico subdiv 1 with per-vertex jitter."""
    rnd = random.Random(seed); bm = bmesh.new()
    for c, r in centres:
        g = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
        for v in g['verts']:
            v.co = v.co * (1 + (rnd.random() - 0.5) * jitter) + Vector(c)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def hemi_dirs(n, rnd, lift=0.25, spread=1.0):
    out = []
    for i in range(n):
        a = rnd.random() * math.tau; e = lift + rnd.random() * (1 - lift) * spread
        out.append(Vector((math.cos(a) * (1 - e * 0.55), math.sin(a) * (1 - e * 0.55), e)).normalized())
    return out

def hydrangea(seed, h=0.62, r=0.42, blooms=5, second=False):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    leaves = []
    for d in hemi_dirs(22, rnd, 0.1):
        L = r * (0.75 + rnd.random() * 0.45); leaves.append(((d.x * 0.05, d.y * 0.05, h * 0.18 + rnd.random() * 0.1), d, L, L * 0.62))
    keep(leaf_obj('leaves', leaves), 'leaf', C)
    cs = []
    for i in range(blooms):
        a = rnd.random() * math.tau; rr = rnd.random() * r * 0.6; z = h * 0.7 + rnd.random() * h * 0.28 - (rr / r) * h * 0.18
        cs.append(((math.cos(a) * rr, math.sin(a) * rr, z), 0.1 + rnd.random() * 0.05))
    keep(ball_obj('blooms', cs, 0.3, seed + 1, 2), 'bloom2' if second else 'bloom', C)
    return finish(f'hydrangea_{seed}')

def lavender(seed, n=11, h=0.5):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    blades = []
    for i in range(n + 4):
        a = rnd.random() * math.tau; rr = rnd.random() * 0.1
        d = Vector((math.cos(a) * 0.55, math.sin(a) * 0.55, 0.85)).normalized(); L = 0.2 + rnd.random() * 0.12
        blades.append(((math.cos(a) * rr, math.sin(a) * rr, 0.02), d, L, 0.022))
    keep(leaf_obj('blades', blades), 'leaf', C)
    spikes = []; stems = []
    for i in range(n):
        a = rnd.random() * math.tau; rr = rnd.random() * 0.12; lean = 0.08 + rnd.random() * 0.12
        top = (math.cos(a) * (rr + lean), math.sin(a) * (rr + lean), h * (0.8 + rnd.random() * 0.25))
        stems.append(((math.cos(a) * rr * 0.4, math.sin(a) * rr * 0.4, 0.05), Vector((top[0] - math.cos(a) * rr * 0.4, top[1] - math.sin(a) * rr * 0.4, top[2] - 0.05)).normalized(), math.dist(top, (0, 0, 0.05)) * 0.95, 0.014, 0.0))
        for k in range(2): spikes.append(((top[0], top[1], top[2] - 0.03 * k + 0.03), 0.02 - 0.002 * k))
    keep(leaf_obj('stems', stems), 'stem', C)
    keep(ball_obj('spikes', spikes, 0.3, seed + 3), 'bloom2', C)
    return finish(f'lavender_{seed}')

def shrub(seed, r=0.55, h=0.7):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    leaves = []
    for d in hemi_dirs(44, rnd, 0.05):
        L = r * (0.55 + rnd.random() * 0.4); leaves.append(((d.x * r * 0.12, d.y * r * 0.12, h * 0.15 + rnd.random() * h * 0.2), d * Vector((1, 1, h / r * 0.9)), L, L * 0.5))
    keep(leaf_obj('leaves', leaves), 'leaf', C)
    return finish(f'shrub_{seed}')

def topiary(seed, h=1.25, r=0.3):
    """Clipped ball topiary on a bare stem in a moulded stone tub (Bible s10/s11 shop entrances). Origin on the ground."""
    reset(); PARTS.clear()
    keep(lathe('tub', [(0.0, 0.0), (0.22, 0.0), (0.27, 0.05), (0.3, 0.35), (0.33, 0.4), (0.3, 0.42), (0.0, 0.42)], 14), 'marble', C)
    keep(lathe('stem', [(0.0, 0.4), (0.022, 0.4), (0.022, h - r * 0.6), (0.0, h - r * 0.6)], 6), 'stem', C)
    keep(ball_obj('crown', [((0, 0, h), r)], 0.22, seed, 2), 'leaf', C)
    return finish(f'topiary_{seed}')

LIB = {}
LIB['topiary'] = topiary(50)
for s in range(3):
    LIB[f'hydrangea{s}'] = hydrangea(10 + s, 0.58 + s * 0.06, 0.4 + s * 0.04, 4 + s)
LIB['hydrangea_lilac'] = hydrangea(21, 0.6, 0.42, 5, True)
for s in range(2): LIB[f'lavender{s}'] = lavender(30 + s, 8 + s * 2, 0.46 + s * 0.06)
for s in range(2): LIB[f'shrub{s}'] = shrub(40 + s, 0.5 + s * 0.12, 0.62 + s * 0.12)
tri = 0
for k, v in LIB.items():
    for b in v.values(): b.pop('c', None); tri += len(b['p']) // 9
    print(k, sum(len(b['p']) // 9 for b in v.values()), 'tris')
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
json.dump(LIB, open(f'{ROOT}/src/baked/plants.json', 'w'), separators=(',', ':'))
