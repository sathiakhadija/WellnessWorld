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
    # opening is w wide x h high (z-up). Stepped architrave: wide shallow outer band + narrower deeper inner band, both sides
    for s in (-1, 1):
        k(box(f'o{s}', s * (w / 2 + 0.005), s * (w / 2 + 0.17), -0.045, 0.0, 0.0, h + 0.16, 0.008, 2))
        k(box(f'i{s}', s * (w / 2 + 0.005), s * (w / 2 + 0.085), -0.085, -0.04, 0.0, h + 0.07, 0.01, 2))
        # plinth block (taller, wider, deeper than the casing)
        k(box(f'p{s}', s * (w / 2 - 0.005), s * (w / 2 + 0.215), -0.09, 0.0, 0.0, 0.26, 0.012, 2))
        k(box(f'pc{s}', s * (w / 2 - 0.005), s * (w / 2 + 0.225), -0.1, -0.085, 0.24, 0.27, 0.006, 1))
    # head: architrave band, frieze, stepped cornice (three layers), small centre keystone block
    k(box('head_o', -w / 2 - 0.17, w / 2 + 0.17, -0.045, 0.0, h, h + 0.16, 0.008, 2))
    k(box('head_i', -w / 2 - 0.085, w / 2 + 0.085, -0.085, -0.04, h, h + 0.07, 0.01, 2))
    k(box('frieze', -w / 2 - 0.19, w / 2 + 0.19, -0.05, 0.0, h + 0.16, h + 0.30, 0.008, 2))
    k(box('cor1', -w / 2 - 0.23, w / 2 + 0.23, -0.085, 0.0, h + 0.30, h + 0.335, 0.008, 2))
    k(box('cor2', -w / 2 - 0.26, w / 2 + 0.26, -0.13, 0.0, h + 0.335, h + 0.37, 0.008, 2))
    k(box('cor3', -w / 2 - 0.285, w / 2 + 0.285, -0.16, 0.0, h + 0.37, h + 0.405, 0.01, 2))
    k(box('key', -0.06, 0.06, -0.1, -0.04, h + 0.16, h + 0.30, 0.008, 1))
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
