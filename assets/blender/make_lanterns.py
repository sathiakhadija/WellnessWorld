"""Wellness World — Design Bible s08/s09/s15 lantern kit (black-iron + antique-brass garden bollard lanterns). Blender / bpy, headless.  Run: python3 assets/blender/make_lanterns.py
Bakes src/baked/lanterns.json (triangle soup per material bucket, y-up, origin on the ground). Buckets: metal (black iron), brass, glow (lit glass core)."""
import os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_props.py')).read().split('LIB = {}')[0]
exec(src)
import json, math
LIB = {}
C = '#ffffff'

def lantern(name, h=1.05, w=0.26):
    reset(); PARTS.clear()
    hw = w / 2
    keep(box('foot', -hw - 0.03, hw + 0.03, -hw - 0.03, hw + 0.03, 0.0, 0.07, 0.012, 2), 'metal', C)            # plinth
    keep(box('plinth', -hw, hw, -hw, hw, 0.07, 0.2, 0.012, 2), 'metal', C)
    keep(box('band', -hw - 0.012, hw + 0.012, -hw - 0.012, hw + 0.012, 0.2, 0.235, 0.008, 2), 'brass', C)        # brass band
    gb, gt = 0.235, h - 0.2
    keep(box('glass', -hw + 0.025, hw - 0.025, -hw + 0.025, hw - 0.025, gb + 0.01, gt - 0.01, 0.01, 2), 'glow', C)   # lit glass core
    for sx in (-1, 1):                                                                                                # corner posts
        for sz in (-1, 1):
            keep(box(f'post{sx}{sz}', sx * hw - 0.016, sx * hw + 0.016, sz * hw - 0.016, sz * hw + 0.016, gb, gt, 0.006, 1), 'metal', C)
    for k, (y0, y1, grow) in enumerate([(gt, gt + 0.035, 0.02), (gt + 0.035, gt + 0.075, 0.035), (gt + 0.075, gt + 0.105, 0.0)]):   # stepped cap
        s = hw + grow if k < 2 else hw * 0.55
        keep(box(f'cap{k}', -s, s, -s, s, y0, y1, 0.008, 2), 'metal', C)
    keep(lathe('finial', [(0.0, gt + 0.105), (0.03, gt + 0.115), (0.034, gt + 0.14), (0.02, gt + 0.175), (0.0, gt + 0.2)], 12), 'brass', C)
    return finish(name)

LIB['bollard_lantern'] = lantern('bollard_lantern', 1.05, 0.26)
LIB['path_lantern'] = lantern('path_lantern', 0.7, 0.2)
os.makedirs(f'{ROOT}/src/baked', exist_ok=True)
for v in LIB.values():
    for b in v.values(): b.pop('c', None)
json.dump(LIB, open(f'{ROOT}/src/baked/lanterns.json', 'w'), separators=(',', ':'))
print('lanterns', {k: {b: len(d['p']) // 9 for b, d in v.items()} for k, v in LIB.items()})
