"""Wellness World — clipped hedge segment (replaces flat green boxes). Blender / bpy, headless. Run: python3 assets/blender/make_hedge.py -> src/baked/hedge.json
Unit segment: 2 m long (x -1..1), 1 m deep (y -0.5..0.5), 1 m tall (z 0..1); props scale it non-uniformly. Superellipse cross-section with noisy leafy bumps + a fringe of curved leaf blades.
Buckets: leaf (body colour), bloom2 (fringe colour; mapped to leaf material)."""
import os, random, json, math
here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(here, 'make_flowers.py')).read().split('# ---------- flower heads')[0])

def hedge_seg(name, seed):
    reset(); PARTS.clear(); rnd = random.Random(seed)
    bm = bmesh.new(); ns, n = 9, 22; rings = []
    for i in range(ns):
        x = -1 + 2 * i / (ns - 1); r = []
        endshrink = 1.0 if 0 < i < ns - 1 else 0.96
        for k in range(n):
            a = 2 * math.pi * k / n; c, s = math.cos(a), math.sin(a)
            yy = 0.5 * math.copysign(abs(c) ** 0.5, c); zz = 0.5 + 0.5 * math.copysign(abs(s) ** 0.5, s)
            if zz < 0.02: zz = 0.0
            bump = 1.0 + (rnd.random() - 0.5) * 0.14 * (1 if zz > 0.05 else 0)
            r.append(bm.verts.new((x * endshrink, yy * bump * (0.9 + 0.1 * math.sin(i * 1.3 + k)), zz * bump)))
        rings.append(r)
    for A, B in zip(rings[:-1], rings[1:]):
        for k in range(n):
            m = (k + 1) % n
            try: bm.faces.new((A[k], A[m], B[m], B[k]))
            except ValueError: pass
    for ring, flip in ((rings[0], True), (rings[-1], False)):
        try: bm.faces.new(ring[::-1] if flip else ring)
        except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    keep(new_obj('body', bm), 'leaf', '#ffffff')
    fb = bmesh.new()
    for j in range(34):
        x = rnd.uniform(-0.95, 0.95); a = rnd.uniform(0.15, math.pi - 0.15)           # mostly upper half
        pos = Vector((x, 0.5 * math.cos(a) * 0.95, 0.5 + 0.5 * math.sin(a) * 0.95))
        nd = Vector((rnd.uniform(-0.3, 0.3), math.cos(a), math.sin(a))).normalized()
        blade(fb, pos, nd, 0.09 + rnd.random() * 0.05, 0.07, bend=0.5, cup=0.1, fold=0.4, rows=2, cols=1, prof=0.7, tip=0.9)
    keep(new_obj('fringe', fb), 'bloom2', '#ffffff')
    return finish(name)

LIB = {'hedge_seg': hedge_seg('hedge_seg', 5)}
for v in LIB.values():
    for b in v.values(): b.pop('c', None)
print({b: len(d['p']) // 9 for b, d in LIB['hedge_seg'].items()})
json.dump(LIB, open(f'{ROOT}/src/baked/hedge.json', 'w'), separators=(',', ':'))
