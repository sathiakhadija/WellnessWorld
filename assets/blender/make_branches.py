"""Wellness World — overhanging leafy branch sprays (Design Bible s12 p.52: foliage framing the top of the cinematic street). Blender / bpy, headless.
Run: python3 assets/blender/make_branches.py -> src/baked/branches.json (buckets: stem, leaf; y-up). Origin at the attachment point; the limb extends along +x (game rotates it over the street)."""
import os, random
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_plants.py')).read().split("\nLIB = {}\n")[0]
exec(src)
import json, math
LIB = {}

def spray(seed, L=3.2):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    def limb_pt(t, droop=0.9): return (t * L, 0.25 * math.sin(t * 3.0 + seed) * t, 0.25 * t - droop * t * t * 0.55)
    pts = [limb_pt(i / 6) for i in range(7)]
    keep(sweep('limb', pts, 0.028, 3), 'stem', C)
    leaves = []
    def leafy(p0, dirv, n, size):
        for _ in range(n):
            d = Vector((dirv[0] + (rnd.random() - 0.5) * 1.4, dirv[1] + (rnd.random() - 0.5) * 1.4, dirv[2] + (rnd.random() - 0.5) * 1.0)).normalized()
            leaves.append((p0, d, size * (0.8 + rnd.random() * 0.5), size * (0.42 + rnd.random() * 0.1), 0.25))
    for i in range(1, 7):                                         # leaves along the limb, then 3 side twigs with their own leaf clusters
        p = pts[i]; leafy(p, (0.5, (-1) ** i * 0.9, -0.15), 10, 0.3)
    for k in range(3):
        t = 0.3 + 0.25 * k; b = Vector(limb_pt(t)); sgn = 1 if k % 2 == 0 else -1
        tw = [tuple(b + Vector((0.25 * s, sgn * 0.5 * s, -0.12 * s * s))) for s in (0, 0.5, 1.0, 1.5)]
        keep(sweep(f'tw{k}', tw, 0.014, 3), 'stem', C)
        for s in (0.7, 1.1, 1.5): leafy(tuple(b + Vector((0.25 * s, sgn * 0.5 * s, -0.12 * s * s))), (0.4, sgn * 0.8, -0.2), 8, 0.28)
    leafy(pts[-1], (1, 0, -0.3), 12, 0.32)
    keep(leaf_obj('leaves', leaves), 'leaf', C)
    return finish(f'branch_{seed}')

def puff(seed, R=1.3, n=70):
    reset(); PARTS.clear(); rnd = random.Random(100 + seed)
    leaves = []
    for _ in range(n):
        d = Vector((rnd.random() - 0.5, rnd.random() - 0.5, rnd.random() - 0.7)).normalized()
        p0 = (rnd.gauss(0, R * 0.55), rnd.gauss(0, R * 0.3), rnd.gauss(-0.2, R * 0.3))
        size = 0.3 + rnd.random() * 0.12
        leaves.append((p0, d, size, size * 0.5, 0.25))
    keep(leaf_obj('leaves', leaves), 'leaf', C)
    return finish(f'leafpuff_{seed}')
for sd in (1, 2): LIB[f'leafpuff_{sd}'] = puff(sd)
for sd in (1, 2, 3): LIB[f'branch_{sd}'] = spray(sd, 3.0 + 0.4 * sd)
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
for v in LIB.values():
    for b in v.values(): b.pop('c', None)
json.dump(LIB, open(f'{ROOT}/src/baked/branches.json', 'w'), separators=(',', ':'))
print('branches', {k: {b: len(d['p']) // 9 for b, d in v.items()} for k, v in LIB.items()})
