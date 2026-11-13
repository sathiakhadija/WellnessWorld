"""Wellness World — fashion shop display props (Audit B02 shopfronts: flat slabs instead of real window displays). Blender / bpy, headless.
Run: python3 assets/blender/make_shop_props.py -> src/baked/shop_props.json. Buckets: fabric (garment, tinted per call), marble (head/neck, pale), metal (stand), brass (trim)."""
import os, math, json
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
LIB = {}
C = '#ffffff'

def mannequin(name, skirt=0.0, coat=False):              # abstract tailor's mannequin on a pole: garment silhouette lathe + egg head, no face
    reset(); PARTS.clear()
    keep(lathe('base', [(0.0, 0.0), (0.2, 0.0), (0.2, 0.015), (0.0, 0.02)], 24), 'metal', C)
    keep(lathe('pole', [(0.0, 0.02), (0.014, 0.02), (0.014, 0.85), (0.0, 0.85)], 8), 'metal', C)
    hem = 0.2 + skirt
    prof = [(0.0, 0.62 - skirt * 1.6), (hem, 0.62 - skirt * 1.6), (0.135, 0.9), (0.105, 1.02), (0.16, 1.2), (0.17, 1.36), (0.07, 1.43), (0.0, 1.44)]
    if coat: prof = [(0.0, 0.5), (0.24, 0.5), (0.2, 0.9), (0.15, 1.05), (0.19, 1.22), (0.19, 1.36), (0.07, 1.43), (0.0, 1.44)]
    keep(lathe('garment', prof, 28), 'fabric', C)
    keep(lathe('collar', [(0.0, 1.4), (0.075, 1.4), (0.065, 1.5), (0.0, 1.5)], 14), 'marble', C)
    keep(lathe('head', [(0.0, 1.5), (0.055, 1.52), (0.075, 1.6), (0.07, 1.68), (0.045, 1.74), (0.0, 1.76)], 18), 'marble', C)
    for s in (-1, 1):
        keep(box(f'arm{s}', s * 0.17, s * 0.19, -0.03, 0.03, 1.0, 1.36, 0.01, 1), 'marble' if not coat else 'fabric', C)
    return finish(name)

def handbag(name):                                       # structured bag on a small plinth
    reset(); PARTS.clear()
    keep(box('plinth', -0.14, 0.14, -0.1, 0.1, 0.0, 0.05, 0.005, 1), 'marble', C)
    keep(box('bag', -0.1, 0.1, -0.045, 0.045, 0.05, 0.22, 0.012, 2), 'fabric', C)
    keep(box('clasp', -0.02, 0.02, 0.045, 0.05, 0.15, 0.18, 0.002, 1), 'brass', C)
    keep(lathe('handle', [(0.062, 0.22), (0.07, 0.22), (0.07, 0.3), (0.062, 0.3)], 14), 'brass', C).scale = (1, 0.3, 1)
    return finish(name)

def shoe_shelf(name):                                    # glass-look tiered riser with three shoes (wedge forms)
    reset(); PARTS.clear()
    for i in range(3):
        keep(box(f'tier{i}', -0.3, 0.3, -0.12 + i * 0.0, 0.12, i * 0.12, i * 0.12 + 0.02, 0.003, 1), 'metal', C)
        keep(box(f'sole{i}', -0.07, 0.07, -0.05, 0.05, i * 0.12 + 0.02, i * 0.12 + 0.035, 0.004, 1), 'brass', C).location = ((i - 1) * 0.17, 0, 0)
        keep(box(f'upper{i}', -0.065, 0.065, -0.045, 0.045, i * 0.12 + 0.035, i * 0.12 + 0.08, 0.012, 2), 'fabric', C).location = ((i - 1) * 0.17, 0, 0)
    return finish(name)

LIB['mannequin_dress'] = mannequin('mannequin_dress', 0.0); LIB['mannequin_skirt'] = mannequin('mannequin_skirt', 0.18); LIB['mannequin_coat'] = mannequin('mannequin_coat', 0.0, True)
LIB['handbag'] = handbag('handbag'); LIB['shoe_shelf'] = shoe_shelf('shoe_shelf')
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
for v in LIB.values():
    for b in v.values(): b.pop('c', None)
json.dump(LIB, open(f'{ROOT}/src/baked/shop_props.json', 'w'), separators=(',', ':'))
print('shop_props', {k: {b: len(d['p']) // 9 for b, d in v.items()} for k, v in LIB.items()})
