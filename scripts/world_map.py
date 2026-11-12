"""Annotated top-down neighbourhood map from docs/bible/world/world.json -> docs/bible/world/topdown.png + distances table (stdout). Top of the map = -z = Thames."""
import json, math
from PIL import Image, ImageDraw, ImageFont
W = json.load(open('docs/bible/world/world.json')); B = W['bounds']; S = 4.0; pad = 40
w = int((B['x1'] - B['x0']) * S) + pad * 2; h = int((B['z1'] - B['z0']) * S) + pad * 2
im = Image.new('RGB', (w, h), (28, 30, 38)); d = ImageDraw.Draw(im)
X = lambda x: pad + (x - B['x0']) * S; Z = lambda z: pad + (z - B['z0']) * S
col = {'grass': (86, 112, 70), 'slab': (214, 205, 188), 'sett': (176, 166, 152), 'road': (90, 90, 96), 'gravel': (200, 190, 168), 'paint': (230, 224, 210), 'dark': (120, 112, 104)}
for key, x0, x1, z0, z1, layer in sorted(W['surf'], key=lambda r: r[5]): d.rectangle([X(min(x0, x1)), Z(min(z0, z1)), X(max(x0, x1)), Z(max(z0, z1))], fill=col.get(key, (150, 150, 150)))
for key, pts, wd in W['rib']: d.line([(X(x), Z(z)) for x, z in pts], fill=col.get(key, (200, 200, 200)), width=max(2, int(wd * S)))
tcol = {'building': (150, 96, 80), 'frontage': (160, 108, 90), 'mass': (130, 90, 80), 'hedge': (60, 90, 52), 'bench': (110, 70, 40), 'wall': (180, 170, 150), 'balustrade': (190, 190, 190)}
for c in W['colliders']:
    t = c['tag']; 
    if t in ('railing', 'rail', 'ramp', 'landing', 'rampcheek', 'bench'): continue
    cr, sr = math.cos(c['rot']), math.sin(c['rot']); pts = []
    for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        lx, lz = sx * c['hx'], sz * c['hz']; pts.append((X(c['x'] + lx * cr + lz * sr), Z(c['z'] - lx * sr + lz * cr)))
    d.polygon(pts, fill=tcol.get(t, (140, 120, 110)), outline=(40, 30, 30))
for wt in W['waters']:
    r = wt.get('r'); 
    if r: d.ellipse([X(wt['x'] - r), Z(wt['z'] - r), X(wt['x'] + r), Z(wt['z'] + r)], fill=(80, 120, 180))
    else: d.rectangle([X(wt['x'] - wt['w'] / 2), Z(wt['z'] - wt['d'] / 2), X(wt['x'] + wt['w'] / 2), Z(wt['z'] + wt['d'] / 2)], fill=(80, 120, 180))
d.rectangle([X(-62), Z(-88), X(32), Z(4)], outline=(255, 210, 90), width=2); d.text((X(-60), Z(-86)), 'TOWER FOOTPRINT (penthouse 87 m above)', fill=(255, 210, 90))
d.rectangle([X(B['x0']), Z(-153.5), X(B['x1']), Z(-144)], fill=(60, 90, 140)); d.text((X(-20), Z(-152)), 'THAMES (river plane, -z)', fill=(230, 240, 255))
for n, p in W['pois'].items(): d.ellipse([X(p['x']) - 4, Z(p['z']) - 4, X(p['x']) + 4, Z(p['z']) + 4], fill=(255, 80, 80)); d.text((X(p['x']) + 6, Z(p['z']) - 5), n, fill=(255, 255, 255))
for gx in range(-120, 90, 20): d.line([(X(gx), pad - 10), (X(gx), pad)], fill=(255, 255, 255)); d.text((X(gx) - 8, 12), str(gx), fill=(255, 255, 255))
for gz in range(-140, 130, 20): d.line([(pad - 10, Z(gz)), (pad, Z(gz))], fill=(255, 255, 255)); d.text((2, Z(gz) - 5), str(gz), fill=(255, 255, 255))
d.rectangle([X(B['x0']), Z(B['z0']), X(B['x1']), Z(B['z1'])], outline=(255, 255, 255)); d.text((w - 330, h - 22), 'metres, +x right, -z up (Thames at top); scale bar 20 m →', fill=(255, 255, 255)); d.line([(w - 90, h - 14), (w - 90 + 20 * S, h - 14)], fill=(255, 255, 255), width=3)
im.save('docs/bible/world/topdown.png'); print('saved', im.size)
P = W['pois']; dist = lambda a, b: math.hypot(P[a]['x'] - P[b]['x'], P[a]['z'] - P[b]['z'])
for a, b in [('lift', 'lobby'), ('lift', 'courtyard'), ('lift', 'gate'), ('lift', 'fountain'), ('fountain', 'cafe'), ('cafe', 'books'), ('lift', 'cafe'), ('lift', 'riverside'), ('lift', 'river'), ('cafe', 'riverside'), ('lift', 'quayCafe')]: print(f'{a}->{b}: {dist(a, b):.0f} m')
