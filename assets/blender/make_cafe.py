"""Wellness World — café / bookshop furniture kit (Design Bible s13 Café Violette, s14 The Quiet Page). Blender / bpy, headless.  Run: python3.13 assets/blender/make_cafe.py
Reuses make_props helpers. Bakes src/baked/cafe.json (triangle soup per material bucket, y-up, front +z, origin on the floor). Buckets: wood, metal, brass, fabric, leather, marble, glow, seat."""
import os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
import json, math
LIB = {}
C = '#ffffff'

def leg(name, p0, p1, r, bucket='wood'):
    return keep(sweep(name, [p0, tuple((a + b) / 2 for a, b in zip(p0, p1)), p1], r), bucket, C)

def bistro_chair():
    reset(); PARTS.clear()
    keep(lathe('seat', [(0.0, 0.45), (0.20, 0.45), (0.215, 0.465), (0.20, 0.485), (0.0, 0.49)], 20), 'seat', C)
    keep(lathe('rim', [(0.205, 0.44), (0.222, 0.44), (0.222, 0.452), (0.205, 0.452)], 20), 'wood', C)
    for sx in (-1, 1):
        for sy in (-1, 1):
            leg(f'l{sx}{sy}', (sx * 0.16, sy * 0.16, 0.44), (sx * 0.21, sy * 0.21, 0.0), 0.014)
    # bentwood back: a hoop rising from the rear legs, with a lower crescent rail
    keep(sweep('hoop', [(-0.17, 0.19, 0.46), (-0.19, 0.2, 0.7), (-0.12, 0.215, 0.9), (0.0, 0.22, 0.93), (0.12, 0.215, 0.9), (0.19, 0.2, 0.7), (0.17, 0.19, 0.46)], 0.012, 3), 'wood', C)
    keep(sweep('rail', [(-0.18, 0.2, 0.62), (0.0, 0.225, 0.64), (0.18, 0.2, 0.62)], 0.01, 3), 'wood', C)
    return finish('bistro_chair')

def bistro_table(r=0.36):
    reset(); PARTS.clear()
    keep(lathe('top', [(0.0, 0.72), (r, 0.72), (r + 0.012, 0.727), (r, 0.742), (0.0, 0.742)], 28), 'marble', C)
    keep(lathe('rim', [(r - 0.004, 0.70), (r + 0.016, 0.705), (r + 0.016, 0.72), (r - 0.004, 0.72)], 28), 'brass', C)
    keep(lathe('stem', [(0.03, 0.04), (0.022, 0.2), (0.026, 0.45), (0.03, 0.70)], 12), 'metal', C)
    keep(lathe('base', [(0.0, 0.0), (0.24, 0.0), (0.245, 0.012), (0.2, 0.03), (0.05, 0.05), (0.0, 0.05)], 20), 'metal', C)
    return finish('bistro_table')

def armchair(w=0.82, d=0.8, tall=0.86, bucket='fabric'):
    reset(); PARTS.clear()
    keep(box('base', -w / 2, w / 2, -d / 2, d / 2, 0.12, 0.34, 0.05, 3), bucket, C)
    keep(box('seat', -w / 2 + 0.1, w / 2 - 0.1, -d / 2 + 0.1, d / 2 + 0.02, 0.34, 0.46, 0.05, 3), bucket, C)
    keep(box('back', -w / 2, w / 2, d / 2 - 0.2, d / 2, 0.3, tall, 0.07, 3), bucket, C)
    for s in (-1, 1):
        keep(box(f'arm{s}', min(s * (w / 2 - 0.12), s * w / 2), max(s * (w / 2 - 0.12), s * w / 2), -d / 2 + 0.04, d / 2 - 0.1, 0.3, 0.62, 0.06, 3), bucket, C)
    for sx in (-1, 1):
        for sy in (-1, 1): keep(cyl(f'f{sx}{sy}', 0.022, 0.016, 0.0, 0.12, 10, sx * (w / 2 - 0.08), sy * (d / 2 - 0.08)), 'brass', C)
    return finish('armchair' if bucket == 'fabric' else 'club_chair')

def brass_lamp():
    reset(); PARTS.clear()
    keep(lathe('base', [(0.0, 0.0), (0.09, 0.0), (0.095, 0.015), (0.06, 0.04), (0.02, 0.07), (0.015, 0.3), (0.012, 0.4)], 16), 'brass', C)
    keep(lathe('shade', [(0.11, 0.38), (0.16, 0.52), (0.158, 0.525), (0.108, 0.385)], 20), 'glow', C)
    keep(lathe('cap', [(0.0, 0.54), (0.16, 0.525), (0.0, 0.53)], 20), 'brass', C)
    return finish('brass_lamp')

def stool():
    reset(); PARTS.clear()
    keep(lathe('seat', [(0.0, 0.7), (0.17, 0.7), (0.19, 0.72), (0.17, 0.75), (0.0, 0.76)], 20), 'fabric', C)
    for a in range(3):
        t = a * 2.094; leg(f'l{a}', (0.1 * math.cos(t), 0.1 * math.sin(t), 0.7), (0.2 * math.cos(t), 0.2 * math.sin(t), 0.0), 0.012, 'brass')
    keep(lathe('ring', [(0.175, 0.28), (0.185, 0.28), (0.185, 0.295), (0.175, 0.295)], 16), 'brass', C)
    return finish('stool')

def pendant(r=0.26):
    reset(); PARTS.clear()
    keep(lathe('rod', [(0.01, 0.55), (0.01, 1.0)], 6), 'brass', C)
    keep(lathe('shade', [(0.03, 0.55), (0.1, 0.5), (r * 0.8, 0.36), (r, 0.3), (r - 0.012, 0.298), (r * 0.8 - 0.012, 0.358), (0.09, 0.495), (0.025, 0.545)], 24, False), 'brass', C)
    keep(lathe('glow', [(0.0, 0.31), (r - 0.02, 0.305), (0.0, 0.3)], 24), 'glow', C)
    return finish('pendant')

def globe():
    reset(); PARTS.clear()
    keep(lathe('foot', [(0.0, 0.0), (0.12, 0.0), (0.12, 0.02), (0.03, 0.05), (0.025, 0.2), (0.0, 0.2)], 20), 'brass', C)
    prof = [(0.0 + 0.2 * math.sin(a), 0.42 - 0.2 * math.cos(a)) for a in [i * math.pi / 16 for i in range(17)]]
    keep(lathe('sphere', prof, 24), 'trim', C)
    keep(lathe('ring', [(0.205, 0.2), (0.215, 0.2), (0.215, 0.64), (0.205, 0.64)], 24, False), 'brass', C)
    return finish('globe')

LIB['bistro_chair'] = bistro_chair(); LIB['bistro_table'] = bistro_table(); LIB['armchair'] = armchair(); LIB['club_chair'] = armchair(0.92, 0.9, 0.92, 'leather')
LIB['brass_lamp'] = brass_lamp(); LIB['stool'] = stool(); LIB['pendant'] = pendant(); LIB['globe'] = globe()
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
for v in LIB.values():
    for b in v.values(): b.pop('c', None)
json.dump(LIB, open(f'{ROOT}/src/baked/cafe.json', 'w'), separators=(',', ':'))
for k_, v in LIB.items(): print(k_, {b: len(d['p']) // 9 for b, d in v.items()}, 'tris')
