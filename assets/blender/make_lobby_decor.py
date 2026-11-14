"""Wellness World — Task 003 lift-lobby decor kit (cherry-blossom vase, trailing pothos, books, ceramics, gold-dome lamp, walnut shelf). Blender / bpy, headless.
Run: python3 assets/blender/make_lobby_decor.py -> src/baked/lobby_decor.json
Bucket names match the material keys in src/Lobby.jsx (bloom1, bloom2, ivy1, ivy2, stem, ceramic, ceramic2, bookA..D, paper, bronze, shade, top, brass, tube).
Blender frame: x lateral, y depth (front = -y), z up. Origin = base of the object on its supporting surface."""
import os, random, json, math
here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(here, 'make_flowers.py')).read().split('# ---------- flower heads')[0])
C = '#ffffff'

def part(o, bucket): keep(o, bucket, C); return o

def blossom(B, c, n, rnd, r=0.034, light=False):
    """five-petal cherry blossom at c, facing n: cupped, notched-ish petals + a small stamen dome."""
    n = n.normalized(); t = n.cross(Vector((0, 0, 1)))
    if t.length < 1e-3: t = Vector((1, 0, 0))
    t = t.normalized(); b = n.cross(t)
    rot = rnd.random() * math.tau
    for i in range(5):
        a = rot + i * math.tau / 5
        radial = t * math.cos(a) + b * math.sin(a)
        d = (radial * 0.95 + n * 0.32).normalized()
        blade(B['bloom2' if light else 'bloom1'], c, d, r * (0.9 + 0.2 * rnd.random()), r * 1.05, bend=0.45, cup=0.55, rows=2, cols=2, prof=0.9, tip=0.8, up=n)
    dome(B['bloom2'], c + n * 0.004, 0.0065, 0.006, seg=5, rings=2)

def bloom_vase(name, seed):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    part(lathe('vase', [(0, 0), (0.045, 0), (0.06, 0.02), (0.07, 0.07), (0.072, 0.12), (0.06, 0.18), (0.035, 0.235), (0.027, 0.27), (0.033, 0.285), (0.027, 0.288), (0, 0.288)], 28), 'ceramic')
    B = {k: new_bm() for k in ('bloom1', 'bloom2', 'ivy1', 'stem')}
    base = Vector((0, 0, 0.27))
    for k in range(5):
        az = k / 5 * math.tau + rnd.uniform(-0.3, 0.3); lean = 0.12 + rnd.random() * 0.34; L = 0.42 + rnd.random() * 0.2
        wob = rnd.uniform(0.01, 0.03)
        pts = [base + Vector((math.cos(az) * lean * L * (s / 6) ** 1.5 + math.sin(s * 1.3 + k) * wob * (s / 6), math.sin(az) * lean * L * (s / 6) ** 1.5, L * (s / 6) * (1 - 0.25 * lean))) for s in range(7)]
        tube(B['stem'], pts, 0.0075, 0.0022, 4)
        for s in range(1, 7):                                                  # twigs bearing blossoms + buds
            p = pts[s]; tw = rnd.randint(2, 3)
            for _ in range(tw):
                ta = rnd.random() * math.tau; tl = 0.04 + rnd.random() * 0.06
                tip = p + Vector((math.cos(ta) * tl, math.sin(ta) * tl, tl * (0.3 + rnd.random() * 0.5)))
                tube(B['stem'], [p, p.lerp(tip, 0.5) + Vector((0, 0, 0.006)), tip], 0.0025, 0.0012, 3)
                blossom(B, tip, (tip - p) * 0.5 + Vector((0, 0, 0.8)) + Vector((rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), 0)), rnd, 0.042 + rnd.random() * 0.014, rnd.random() < 0.35)
        blossom(B, pts[-1], Vector((math.cos(az) * lean, math.sin(az) * lean, 1.0)), rnd, 0.05)
        if k % 2: blade(B['ivy1'], pts[3], Vector((math.cos(az), math.sin(az), 0.6)), 0.05, 0.02, bend=-0.3, rows=2, cols=1)
    mk(name, [(f'{name}_{k}', bm, k) for k, bm in B.items()])
    return finish(name)

def pothos(name, seed):
    """small ceramic pot on a shelf; vines spill over the front edge (-y) and hang with heart-shaped leaves. Origin: pot base centre; shelf front edge at y = -0.12."""
    reset(); PARTS.clear(); rnd = random.Random(seed)
    part(lathe('pot', [(0, 0), (0.05, 0), (0.062, 0.03), (0.07, 0.1), (0.074, 0.115), (0.066, 0.118), (0.062, 0.105), (0, 0.105)], 24), 'ceramic2')
    B = {k: new_bm() for k in ('ivy1', 'ivy2', 'stem')}
    for k in range(6):
        sx = rnd.uniform(-0.05, 0.05); hang = 0.45 + rnd.random() * 0.5; sway = rnd.uniform(-0.05, 0.05)
        pts = [Vector((sx, -0.02, 0.105)), Vector((sx, -0.08, 0.15)), Vector((sx + sway * 0.3, -0.135, 0.09)), Vector((sx + sway * 0.5, -0.155, -0.02))]
        n = 7
        for i in range(1, n + 1): pts.append(Vector((sx + sway * (0.5 + i / n), -0.16 - 0.015 * math.sin(i + k), -0.02 - hang * i / n)))
        tube(B['stem'], pts, 0.0025, 0.0012, 3)
        for i, p in enumerate(pts[3:]):
            for side in (-1, 1):
                d = Vector((side * 0.55 + rnd.uniform(-0.1, 0.1), -0.45, -0.5 + rnd.uniform(-0.15, 0.15))).normalized()
                s = 0.8 + 0.35 * rnd.random()
                blade(B['ivy1' if (i + k + (side > 0)) % 3 else 'ivy2'], p, d, 0.068 * s, 0.062 * s, bend=0.25, cup=0.15, fold=0.25, rows=3, cols=2, prof=1.0, tip=0.75, up=Vector((0, -1, 0)))
    for i in range(9):                                                         # leafy crown in the pot
        a = i / 9 * math.tau
        blade(B['ivy1' if i % 2 else 'ivy2'], Vector((math.cos(a) * 0.02, math.sin(a) * 0.02, 0.1)), Vector((math.cos(a), math.sin(a), 0.9)), 0.085, 0.07, bend=0.45, cup=0.15, fold=0.3, rows=3, cols=2, prof=1.0, tip=0.75)
    mk(name, [(f'{name}_{k}', bm, k) for k, bm in B.items()])
    return finish(name)

BOOKS = ['bookA', 'bookB', 'bookC', 'bookD']
def book_up(parts, name, x, w, h, d, cover, lean=0.0, yaw=0.0):
    """standing book: cover box + page-top strip + bronze spine band; pivot at the bottom centre of the spine."""
    o = part(box(name + 'c', -w / 2, w / 2, -d, 0, 0, h, bevel=0.0025, segs=2), cover); o.location = (x, 0, 0); o.rotation_euler = (0, lean, yaw)
    p = part(box(name + 'p', -w / 2 + 0.003, w / 2 - 0.003, -d + 0.004, -0.006, h - 0.002, h + 0.0012, bevel=0), 'paper'); p.location = (x, 0, 0); p.rotation_euler = (0, lean, yaw)
    for z in (h * 0.78, h * 0.2):
        s = part(box(name + f's{z:.2f}', -w / 2 - 0.0006, w / 2 + 0.0006, -d - 0.0006, -d + 0.003, z, z + 0.005, bevel=0), 'bronze'); s.location = (x, 0, 0); s.rotation_euler = (0, lean, yaw)

def books_row(name, seed):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    x = -0.1; spec = [(0.034, 0.21, 'bookB'), (0.042, 0.18, 'bookA'), (0.028, 0.23, 'bookC'), (0.046, 0.19, 'bookD'), (0.032, 0.215, 'bookB')]
    for i, (w, h, c) in enumerate(spec):
        x += w / 2; book_up(PARTS, f'{name}{i}', x, w, h, 0.15, c, lean=(0.16 if i == 4 else 0.0)); x += w / 2 + 0.002
    bake_out = finish(name); return bake_out

def books_stack(name, seed):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    z = 0.0
    for i, (L, D, T, c, yaw) in enumerate([(0.22, 0.16, 0.032, 'bookB', 0.0), (0.19, 0.14, 0.026, 'bookA', 0.14), (0.16, 0.12, 0.022, 'bookC', -0.1)]):
        def bx(nm, x0, x1, y0, y1, z0, z1, bucket, bev=0.0015):
            o = part(box(f'{name}{i}{nm}', x0, x1, y0, y1, z0, z1, bevel=bev, segs=2 if bev else 1), bucket); o.rotation_euler = (0, 0, yaw); return o
        bx('b', -L / 2, L / 2, -D, 0, z, z + 0.004, c); bx('t', -L / 2, L / 2, -D, 0, z + T - 0.004, z + T, c)
        bx('s', -L / 2, -L / 2 + 0.008, -D, 0, z, z + T, c); bx('p', -L / 2 + 0.008, L / 2 - 0.004, -D + 0.004, -0.004, z + 0.004, z + T - 0.004, 'paper', 0)
        bx('r', -L / 2 - 0.0006, -L / 2 + 0.003, -D * 0.62, -D * 0.38, z + 0.003, z + T - 0.003, 'bronze', 0)
        z += T
    return finish(name)

def ceramic(name, prof, bucket='ceramic', seg=28):
    reset(); PARTS.clear(); part(lathe(name, prof, seg), bucket); return finish(name)

def lamp(name):
    reset(); PARTS.clear()
    part(lathe('base', [(0, 0), (0.06, 0), (0.065, 0.012), (0.05, 0.03), (0.02, 0.06), (0.012, 0.09), (0.012, 0.2), (0, 0.2)], 24), 'bronze')
    part(lathe('shade', [(0.115, 0.17), (0.112, 0.2), (0.098, 0.245), (0.07, 0.285), (0.035, 0.31), (0.008, 0.32), (0, 0.322)], 32), 'shade')
    part(lathe('finial', [(0, 0.318), (0.01, 0.318), (0.008, 0.335), (0, 0.338)], 10), 'bronze')
    return finish(name)

def shelf(name):
    reset(); PARTS.clear()
    part(box('body', -0.36, 0.36, -0.27, 0, 0, 0.036, bevel=0.0045, segs=2), 'top')
    part(box('edge', -0.362, 0.362, -0.274, -0.262, -0.0005, 0.0365, bevel=0.0012, segs=1), 'brass')
    part(box('glow', -0.33, 0.33, -0.205, -0.185, -0.004, 0.0, bevel=0), 'tube')
    part(box('rear', -0.36, 0.36, -0.006, 0.004, -0.012, 0.048, bevel=0.0015), 'brass')
    return finish(name)

LIB = {
    'bloom_vase': bloom_vase('bloom_vase', 14), 'pothos': pothos('pothos', 6), 'books_row': books_row('books_row', 1), 'books_stack': books_stack('books_stack', 2),
    'vase_bottle': ceramic('vase_bottle', [(0, 0), (0.04, 0), (0.052, 0.015), (0.062, 0.07), (0.058, 0.12), (0.035, 0.17), (0.02, 0.2), (0.022, 0.22), (0.026, 0.225), (0.022, 0.228), (0, 0.228)]),
    'vase_round': ceramic('vase_round', [(0, 0), (0.04, 0), (0.07, 0.025), (0.085, 0.075), (0.07, 0.125), (0.04, 0.15), (0.034, 0.16), (0.04, 0.165), (0.034, 0.168), (0, 0.168)], 'ceramic2'),
    'bowl': ceramic('bowl', [(0, 0), (0.035, 0), (0.06, 0.012), (0.09, 0.045), (0.098, 0.065), (0.094, 0.066), (0.085, 0.05), (0.04, 0.02), (0, 0.018)]),
    'orb': ceramic('orb', [(0, 0), (0.022, 0.0), (0.045, 0.012), (0.058, 0.04), (0.06, 0.06), (0.052, 0.085), (0.03, 0.105), (0.0, 0.11)], 'bronze'),
    'lamp': lamp('lamp'), 'shelf2': shelf('shelf2'),
}
for k, v in LIB.items():
    for b in v.values(): b.pop('c', None)
    print(k, sum(len(b['p']) // 9 for b in v.values()), 'tris')
json.dump(LIB, open(f'{ROOT}/src/baked/lobby_decor.json', 'w'), separators=(',', ':'))
