"""Wellness World — penthouse interior architectural kit (Blender / bpy, headless).
Run: python3 assets/blender/make_interior.py
Stepped door architraves with plinth blocks + cornice head, fluted pilaster with capital/base, brass tube sconce.
Origin = wall-face centre at floor; front faces -Y in Blender (= +Z three.js). Bakes src/baked/interior.json (+ .blend/.glb)."""
src = open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
import json, os
LIB = {}
CREAM, TUBE, BR = '#ffffff', '#fff1d6', '#d9b36a'

def arch(w, h, name):
    reset(); PARTS.clear()
    k = lambda o, b='trim', c=CREAM: keep(o, b, c)
    # Bible s03: clean modern detailing — one slim flat casing (7 cm) + flat head, no plinths/frieze/cornice/keystone
    for s in (-1, 1): k(box(f'c{s}', s * (w / 2 + 0.003), s * (w / 2 + 0.075), -0.03, 0.0, 0.0, h + 0.075, 0.006, 1))
    k(box('head', -w / 2 - 0.075, w / 2 + 0.075, -0.03, 0.0, h, h + 0.075, 0.006, 1))
    # thin brass threshold
    k(box('thr', -w / 2, w / 2, -0.09, 0.0, -0.004, 0.006, 0.002, 1), 'brass', BR)
    return finish(name)

def pilaster(w=0.68, h=3.1, name='pilaster'):
    reset(); PARTS.clear()
    k = lambda o, b='trim', c=CREAM: keep(o, b, c)
    k(box('base', -w / 2, w / 2, -0.07, 0.0, 0.0, 0.14, 0.01, 2)); k(box('base2', -w / 2 + 0.03, w / 2 - 0.03, -0.075, 0.0, 0.14, 0.19, 0.008, 2))
    k(box('shaft', -w / 2 + 0.05, w / 2 - 0.05, -0.035, 0.0, 0.19, h - 0.2, 0.004, 1))
    n = 8; pitch = (w - 0.12) / n
    for i in range(n):   # half-round flutes (reeds) up the shaft
        c = cyl(f'f{i}', pitch * 0.36, pitch * 0.36, 0.2, h - 0.21, 10, x=-(w - 0.12) / 2 + pitch * (i + 0.5), y=-0.03); k(c)
    k(box('cap', -w / 2 + 0.03, w / 2 - 0.03, -0.075, 0.0, h - 0.2, h - 0.14, 0.008, 2))
    k(box('cap2', -w / 2, w / 2, -0.095, 0.0, h - 0.14, h, 0.01, 2))
    return finish(name)

def sconce(name='sconce'):
    reset(); PARTS.clear()
    # tall frosted warm tube (1.3 m) in a slim brass spine, central bracket block, finials; stands 0.1 m off the wall
    keep(box('spine', -0.012, 0.012, -0.045, -0.025, 0.0, 1.32, 0.003, 1), 'brass', BR)
    keep(box('back', -0.03, 0.03, -0.02, 0.0, 0.58, 0.74, 0.006, 2), 'brass', BR)
    keep(box('block', -0.032, 0.032, -0.085, -0.03, 0.57, 0.75, 0.008, 2), 'brass', BR)
    keep(cyl('tube', 0.021, 0.021, 0.04, 1.28, 14, y=-0.065), 'tube', TUBE)
    for z0 in (0.0, 1.28): keep(box(f'cap{z0}', -0.03, 0.03, -0.095, -0.035, z0, z0 + 0.04, 0.006, 2), 'brass', BR)
    return finish(name)

LIB['arch_bedroom'] = arch(1.5, 3.0, 'arch_bedroom')
LIB['arch_bathroom'] = arch(1.1, 3.0, 'arch_bathroom')
LIB['pilaster'] = pilaster()
LIB['sconce'] = sconce()
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
json.dump(LIB, open(f'{ROOT}/src/baked/interior.json', 'w'), separators=(',', ':'))
for k_, v in LIB.items(): print(k_, {b: len(d['p']) // 9 for b, d in v.items()}, 'tris')
