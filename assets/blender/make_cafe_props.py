"""Wellness World — café / library counter props kit (Audit B02 #12/#16: empty counter, cuboid placeholder products). Blender / bpy, headless.
Run: python3 assets/blender/make_cafe_props.py -> src/baked/cafe_props.json. Buckets: metal (steel/iron), brass, marble (white ceramic/porcelain), wood, glow, bloom (pink icing/fruit), bloom2 (cream), fabric, leaf."""
import os, math, json
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
LIB = {}
C = '#ffffff'

def cake_stand(name):                                   # footed brass-rim porcelain stand with a cake and a glass-look cloche (glow = faint warm glass)
    reset(); PARTS.clear()
    keep(lathe('foot', [(0.0, 0.0), (0.085, 0.0), (0.085, 0.012), (0.03, 0.03), (0.026, 0.13), (0.0, 0.13)], 20), 'marble', C)
    keep(lathe('plate', [(0.0, 0.13), (0.17, 0.13), (0.175, 0.145), (0.0, 0.145)], 28), 'marble', C)
    keep(lathe('rim', [(0.172, 0.138), (0.178, 0.138), (0.178, 0.15), (0.172, 0.15)], 28), 'brass', C)
    keep(lathe('cake', [(0.0, 0.145), (0.105, 0.145), (0.108, 0.19), (0.1, 0.21), (0.0, 0.213)], 24), 'bloom2', C)
    keep(lathe('icing', [(0.0, 0.213), (0.1, 0.21), (0.092, 0.222), (0.0, 0.226)], 24), 'bloom', C)
    for k in range(6):
        a = k * math.pi / 3; keep(lathe(f'berry{k}', [(0.0, 0.226), (0.016, 0.228), (0.014, 0.248), (0.0, 0.252)], 8), 'bloom', C).location = (0.06 * math.cos(a), 0.06 * math.sin(a), 0.0)
    return finish(name)

def cup_stack(name):                                     # saucer + cup, three stacked beside a pitcher
    reset(); PARTS.clear()
    for i in range(3):
        z = i * 0.052
        keep(lathe(f'sau{i}', [(0.0, z), (0.07, z), (0.075, z + 0.008), (0.0, z + 0.012)], 20), 'marble', C)
        keep(lathe(f'cup{i}', [(0.0, z + 0.012), (0.034, z + 0.012), (0.045, z + 0.05), (0.044, z + 0.054), (0.0, z + 0.04)], 18), 'marble', C)
    keep(lathe('pitcher', [(0.0, 0.0), (0.045, 0.0), (0.05, 0.1), (0.04, 0.14), (0.0, 0.14)], 16), 'metal', C).location = (0.17, 0.0, 0.0)
    return finish(name)

def grinder(name):                                       # espresso grinder: steel body, hopper, brass dosing lever
    reset(); PARTS.clear()
    keep(box('base', -0.09, 0.09, -0.11, 0.11, 0.0, 0.05, 0.01, 1), 'metal', C)
    keep(box('body', -0.075, 0.075, -0.09, 0.09, 0.05, 0.36, 0.015, 1), 'metal', C)
    keep(lathe('hopper', [(0.0, 0.36), (0.07, 0.36), (0.085, 0.42), (0.1, 0.55), (0.0, 0.55)], 20), 'metal', C)
    keep(lathe('lid', [(0.0, 0.55), (0.1, 0.55), (0.1, 0.57), (0.0, 0.575)], 20), 'brass', C)
    keep(box('lever', 0.075, 0.13, -0.014, 0.014, 0.2, 0.225, 0.005, 1), 'brass', C)
    keep(box('spout', -0.03, 0.03, 0.09, 0.15, 0.13, 0.17, 0.006, 1), 'brass', C)
    return finish(name)

def till(name):                                          # tablet till on a stand with a card reader
    reset(); PARTS.clear()
    keep(box('base', -0.14, 0.14, -0.1, 0.1, 0.0, 0.02, 0.006, 1), 'metal', C)
    keep(box('neck', -0.015, 0.015, -0.015, 0.015, 0.02, 0.17, 0.004, 1), 'metal', C)
    keep(box('slab', -0.13, 0.13, -0.008, 0.008, 0.16, 0.34, 0.006, 1), 'metal', C)
    keep(box('screen', -0.118, 0.118, -0.012, -0.007, 0.17, 0.33, 0.002, 1), 'glow', C)
    keep(box('reader', 0.18, 0.26, -0.04, 0.04, 0.0, 0.03, 0.008, 1), 'brass', C)
    return finish(name)

def menu_stand(name):                                    # little A-frame chalkboard + brass feet
    reset(); PARTS.clear()
    for s in (-1, 1): keep(box(f'leg{s}', -0.2, 0.2, s * 0.1 - 0.012, s * 0.1 + 0.012, 0.0, 0.0 + 0.001, 0.0005, 1), 'wood', C)
    keep(box('board', -0.19, 0.19, -0.016, 0.016, 0.1, 0.52, 0.006, 1), 'wood', C)
    keep(box('chalk', -0.165, 0.165, -0.0185, -0.0155, 0.13, 0.49, 0.001, 1), 'metal', C)
    keep(box('rule', -0.12, 0.12, -0.0195, -0.018, 0.4, 0.405, 0.0005, 1), 'marble', C)
    keep(box('foot', -0.2, 0.2, -0.1, 0.1, 0.0, 0.02, 0.005, 1), 'wood', C)
    return finish(name)

def book_stack(name, n=4, seed=3):                       # stacked books with tilted spines + open book on top (replaces cuboid placeholders)
    import random; reset(); PARTS.clear(); r = random.Random(seed); z = 0.0
    for i in range(n):
        w, d, h = 0.2 + r.random() * 0.06, 0.15 + r.random() * 0.05, 0.022 + r.random() * 0.026
        o = keep(box(f'b{i}', -w / 2, w / 2, -d / 2, d / 2, z, z + h, 0.004, 1), ['wood', 'fabric', 'brass', 'metal'][i % 4], C); o.rotation_euler[2] = (r.random() - 0.5) * 0.5
        keep(box(f'pg{i}', -w / 2 + 0.008, w / 2 - 0.002, -d / 2 + 0.006, d / 2 - 0.006, z + 0.005, z + h - 0.004, 0.001, 1), 'marble', C).rotation_euler[2] = o.rotation_euler[2]
        z += h
    keep(box('open_l', -0.13, 0.0, -0.09, 0.09, z, z + 0.008, 0.002, 1), 'marble', C); keep(box('open_r', 0.0, 0.13, -0.09, 0.09, z + 0.004, z + 0.012, 0.002, 1), 'marble', C)
    return finish(name)

LIB['cake_stand'] = cake_stand('cake_stand'); LIB['cup_stack'] = cup_stack('cup_stack'); LIB['grinder'] = grinder('grinder'); LIB['till'] = till('till'); LIB['menu_stand'] = menu_stand('menu_stand')
LIB['book_stack_1'] = book_stack('book_stack_1', 4, 3); LIB['book_stack_2'] = book_stack('book_stack_2', 6, 8); LIB['book_stack_3'] = book_stack('book_stack_3', 3, 13)
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
for v in LIB.values():
    for b in v.values(): b.pop('c', None)
json.dump(LIB, open(f'{ROOT}/src/baked/cafe_props.json', 'w'), separators=(',', ':'))
print('cafe_props', {k: {b: len(d['p']) // 9 for b, d in v.items()} for k, v in LIB.items()})
