"""Wellness World — modular skyline roof kit (Bible s04 / owner correction 1, overnight directive 3.1: believable rooflines, reduced procedural repetition).
Blender / bpy, headless.  Run: python3 assets/blender/make_skyline_kit.py   ->  src/baked/skyline_kit.json
Unit roofs: footprint x,y in [-0.5, 0.5] (Blender), height z in [0, 1]; the game scales each instance to the building's footprint and roof height.
Kinds: gable, hip, mansard (steep lower + shallow upper slope), sawtooth (north-light factory teeth with glazed risers), plant (flat with parapet + plant-room boxes + stacks).
Buckets: roof (neutral light, tinted per instance), glass (glazing)."""
import os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
import json
LIB = {}
ROOF, GLASS = '#ffffff', '#9fb0c8'

def poly(name, verts, faces, bucket, colour):
    bm = bmesh.new(); vs = [bm.verts.new(v) for v in verts]
    for f in faces:
        try: bm.faces.new([vs[i] for i in f])
        except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return keep(new_obj(name, bm), bucket, colour)

def slab_box(name, x0, x1, y0, y1, z0, z1, bucket='roof', colour=ROOF):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return poly(name, v, f, bucket, colour)

def gable():
    reset(); PARTS.clear()
    v = [(-.5, -.5, 0), (.5, -.5, 0), (.5, .5, 0), (-.5, .5, 0), (-.5, 0, 1), (.5, 0, 1)]
    poly('g', v, [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5)], 'roof', ROOF)
    return finish('roof_gable')

def hip():
    reset(); PARTS.clear()
    v = [(-.5, -.5, 0), (.5, -.5, 0), (.5, .5, 0), (-.5, .5, 0), (-.22, 0, 1), (.22, 0, 1)]
    poly('h', v, [(0, 1, 5, 4), (1, 2, 5), (2, 3, 4, 5), (3, 0, 4)], 'roof', ROOF)
    return finish('roof_hip')

def mansard():
    reset(); PARTS.clear()
    a, b_ = .5, .36
    v = [(-a, -a, 0), (a, -a, 0), (a, a, 0), (-a, a, 0), (-b_, -b_, .62), (b_, -b_, .62), (b_, b_, .62), (-b_, b_, .62), (-.2, -.2, 1), (.2, -.2, 1), (.2, .2, 1), (-.2, .2, 1)]
    f = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 9, 8), (5, 6, 10, 9), (6, 7, 11, 10), (7, 4, 8, 11), (8, 9, 10, 11)]
    poly('m', v, f, 'roof', ROOF)
    for i in range(4):                                                     # dormer boxes on the steep lower slope (front/back)
        x = -.33 + i * .22
        for sgn in (-1, 1): slab_box(f'd{i}{sgn}', x - .045, x + .045, sgn * .395 - .03, sgn * .395 + .03, .12, .34, 'roof', ROOF)
    return finish('roof_mansard')

def sawtooth(n=4):
    reset(); PARTS.clear()
    w = 1.0 / n
    for i in range(n):
        x0 = -.5 + i * w
        v = [(x0, -.5, 0), (x0 + w, -.5, 0), (x0 + w, .5, 0), (x0, .5, 0), (x0, -.5, 1), (x0, .5, 1)]
        poly(f's{i}', v, [(1, 2, 5, 4), (0, 1, 4), (3, 5, 2)], 'roof', ROOF)   # sloped slate face + triangular end cheeks
        poly(f'r{i}', [(x0, -.5, .1), (x0, .5, .1), (x0, .5, 1), (x0, -.5, 1)], [(0, 3, 2, 1)], 'glass', GLASS)                                 # glazed north-light riser
    slab_box('base', -.5, .5, -.5, .5, 0, .1, 'roof', ROOF)
    return finish('roof_sawtooth')

def plant():
    reset(); PARTS.clear()
    slab_box('slab', -.5, .5, -.5, .5, 0, .08)
    for s, (x0, x1, y0, y1) in enumerate([(-.5, .5, -.5, -.46), (-.5, .5, .46, .5), (-.5, -.46, -.5, .5), (.46, .5, -.5, .5)]): slab_box(f'par{s}', x0, x1, y0, y1, .08, .24)
    slab_box('room', -.2, .18, -.16, .2, .08, .62); slab_box('lift', .22, .36, -.3, -.12, .08, .9)
    for i, (x, y) in enumerate([(-.38, .25), (-.32, -.3), (.3, .3)]): slab_box(f'stack{i}', x - .025, x + .025, y - .025, y + .025, .08, .7)
    return finish('roof_plant')

for k, fn in (('gable', gable), ('hip', hip), ('mansard', mansard), ('sawtooth', sawtooth), ('plant', plant)): LIB['roof_' + k] = fn()
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
for v in LIB.values():
    for b in v.values(): b.pop('c', None)
json.dump(LIB, open(f'{ROOT}/src/baked/skyline_kit.json', 'w'), separators=(',', ':'))
print('skyline kit', {k: {b: len(d['p']) // 9 for b, d in v.items()} for k, v in LIB.items()})
