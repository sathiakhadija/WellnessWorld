"""Wellness World — decorative plants: wisteria raceme, table posy in a vase, leaf-clad topiary in a tub (replace prism blobs). Blender / bpy, headless.
Run: python3 assets/blender/make_decor_plants.py -> src/baked/decor_plants.json (buckets: bloom, bloom2, leaf, stem, marble). Origin: raceme top / vase base / tub base."""
import os, random, json, math
here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(here, 'make_flowers.py')).read().split('# ---------- flower heads')[0])
exec('def _noop(): pass')
src2 = open(os.path.join(here, 'make_flowers.py')).read()
exec('def head_daisy' + src2.split('def head_daisy', 1)[1].split('# ---------- whole plants')[0])

def wisteria(name, seed, L=0.9):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    B = {k: new_bm() for k in ('bloom', 'bloom2', 'leaf', 'stem')}
    for r in range(5):                                                         # five racemes hanging from the top at z=0
        ox = (r - 2) * 0.1; ll = L * (0.65 + rnd.random() * 0.4)
        pts = [Vector((ox + math.sin(t * 3 + r) * 0.02, rnd.random() * 0.02, -ll * t)) for t in [i / 7 for i in range(8)]]
        tube(B['stem'], pts, 0.008, 0.003, 4)
        n = 18
        for i in range(n):
            t = i / (n - 1); p = pts[min(7, int(t * 7))]; zz = -ll * t * 0.98 - 0.02; wd = 0.045 * (1 - 0.8 * t) + 0.01
            for k in range(3):
                a = rnd.random() * math.tau; d = Vector((math.cos(a) * 0.7, math.sin(a) * 0.7, -0.5)).normalized()
                blade(B['bloom' if (i + k) % 3 else 'bloom2'], Vector((p.x, p.y, zz)), d, 0.16 * (1 - 0.45 * t) + 0.05, 0.12 * (1 - 0.4 * t) + 0.04, bend=0.5, cup=0.6, rows=1, cols=2, prof=0.7, tip=1.0)
    for j in range(4):                                                         # pinnate leaflets at the top
        a = j * 1.6 + 0.4; blade(B['leaf'], Vector((0, 0, -0.02)), Vector((math.cos(a), math.sin(a), 0.1)), 0.22, 0.07, bend=-0.5, rows=3, cols=1, prof=0.6, tip=0.9)
    mk(name, [(f'{name}_{k}', bm, k) for k, bm in B.items()])
    return finish(name)

def posy(name, seed):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    keep(lathe('vase', [(0.0, 0.0), (0.04, 0.0), (0.06, 0.04), (0.055, 0.12), (0.035, 0.16), (0.04, 0.17), (0.0, 0.17)], 14), 'marble', C)
    B = {k: new_bm() for k in ('bloom', 'bloom2', 'leaf', 'stem')}
    for i in range(6):
        a = i / 6 * math.tau + rnd.random() * 0.4; lean = 0.02 + rnd.random() * 0.07; h = 0.2 + rnd.random() * 0.1
        pts = [Vector((math.cos(a) * lean * (k / 4) ** 2, math.sin(a) * lean * (k / 4) ** 2, 0.15 + h * k / 4)) for k in range(5)]
        tube(B['stem'], pts, 0.0025, 0.002, 3)
        head_daisy(B, pts[-1], 0.045, seed + i)
        if i % 2: blade(B['leaf'], pts[1], Vector((math.cos(a), math.sin(a), 0.5)), 0.08, 0.025, bend=-0.4, rows=2, cols=1)
    mk(name, [(f'{name}_{k}', bm, k) for k, bm in B.items()])
    return finish(name)

def topiary(name, seed, h=1.25, r=0.3):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    keep(lathe('tub', [(0.0, 0.0), (0.2, 0.0), (0.25, 0.05), (0.28, 0.35), (0.31, 0.4), (0.28, 0.42), (0.0, 0.42)], 14), 'marble', C)
    B = {k: new_bm() for k in ('leaf', 'stem')}
    tube(B['stem'], [Vector((0, 0, 0.4)), Vector((0.01, 0.0, 0.8)), Vector((0, 0.01, h - r * 0.5))], 0.02, 0.014, 5)
    for i in range(150):                                                       # dense overlapping leaves clipped to a sphere
        z = rnd.uniform(-0.95, 1.0); a = rnd.random() * math.tau; rr = math.sqrt(1 - z * z)
        nd = Vector((math.cos(a) * rr, math.sin(a) * rr, z)); pos = Vector((0, 0, h)) + nd * r * 0.82
        tg = nd.cross(Vector((0, 0, 1))); tg = tg.normalized() if tg.length > 1e-3 else Vector((1, 0, 0))
        d = (nd * 0.7 + tg * rnd.uniform(-0.8, 0.8)).normalized()
        blade(B['leaf'], pos, d, 0.1, 0.075, bend=0.4, cup=0.1, fold=0.4, rows=1, cols=1, prof=0.7, tip=0.9, up=nd)
    mk(name, [(f'{name}_{k}', bm, k) for k, bm in B.items()])
    return finish(name)

LIB = {'wisteria0': wisteria('wisteria0', 3, 0.9), 'wisteria1': wisteria('wisteria1', 8, 1.2), 'posy0': posy('posy0', 5), 'topiary_o': topiary('topiary_o', 9)}
for k, v in LIB.items():
    for b in v.values(): b.pop('c', None)
    print(k, sum(len(b['p']) // 9 for b in v.values()), 'tris')
json.dump(LIB, open(f'{ROOT}/src/baked/decor_plants.json', 'w'), separators=(',', ':'))
