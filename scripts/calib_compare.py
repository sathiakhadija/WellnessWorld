"""Blender vs localhost calibration comparison.  python3 scripts/calib_compare.py [preset...]
Projects the same world points through the shared camera, samples 9x9 pixel means of flat patches (swatch tiles, ColorChecker, floor) in both renders, and reports CIEDE2000.
Diagnostic only: different renderers (Cycles path tracing vs three.js real-time) are expected to differ in indirect light, shadows and specular — see docs/bible/PALETTE_USAGE.md."""
import json, math, sys, os
from PIL import Image, ImageDraw
LAY = json.load(open('assets/palette/calib_layout.json')); PRE = json.load(open('assets/palette/presets.json'))
W, H = 960, 540
def project(p):
    c = LAY['camera']; cx, cy, cz = c['pos']; tx, ty, tz = c['target']
    f = (tx - cx, ty - cy, tz - cz); n = math.sqrt(sum(a * a for a in f)); f = [a / n for a in f]
    r = (f[1] * 1 - f[2] * 0, f[2] * 0 - f[0] * 1, 0); rn = math.hypot(r[0], r[1]); r = (r[0] / rn, r[1] / rn, 0)    # right = f x up(0,0,1)
    u = (r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0])
    d = (p[0] - cx, p[1] - cy, p[2] - cz); x = sum(a * b for a, b in zip(d, r)); y = sum(a * b for a, b in zip(d, u)); z = sum(a * b for a, b in zip(d, f))
    fx = (W / 2) / math.tan(math.radians(c['fov']) / 2); return W / 2 + fx * x / z, H / 2 - fx * y / z
def s2l(c): c /= 255; return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
def lab(rgb):
    r, g, b = [s2l(v) for v in rgb]; X = (.4124 * r + .3576 * g + .1805 * b) / .95047; Y = .2126 * r + .7152 * g + .0722 * b; Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > .008856 else 7.787 * t + 16 / 116; return (116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z)))
def de2000(l1, l2):
    L1, a1, b1 = l1; L2, a2, b2 = l2; C1 = math.hypot(a1, b1); C2 = math.hypot(a2, b2); Cb = (C1 + C2) / 2; G = .5 * (1 - math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p = (1 + G) * a1; a2p = (1 + G) * a2; C1p = math.hypot(a1p, b1); C2p = math.hypot(a2p, b2); h1 = math.degrees(math.atan2(b1, a1p)) % 360; h2 = math.degrees(math.atan2(b2, a2p)) % 360
    dL = L2 - L1; dC = C2p - C1p; dh = h2 - h1
    if C1p * C2p == 0: dh = 0
    elif dh > 180: dh -= 360
    elif dh < -180: dh += 360
    dH = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dh) / 2); Lb = (L1 + L2) / 2; Cpb = (C1p + C2p) / 2; hb = h1 + h2
    if C1p * C2p != 0: hb = hb / 2 if abs(h1 - h2) <= 180 else (hb + (360 if hb < 360 else -360)) / 2
    T = 1 - .17 * math.cos(math.radians(hb - 30)) + .24 * math.cos(math.radians(2 * hb)) + .32 * math.cos(math.radians(3 * hb + 6)) - .2 * math.cos(math.radians(4 * hb - 63))
    dT = 30 * math.exp(-((hb - 275) / 25) ** 2); Rc = 2 * math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7)); Sl = 1 + .015 * (Lb - 50) ** 2 / math.sqrt(20 + (Lb - 50) ** 2); Sc = 1 + .045 * Cpb; Sh = 1 + .015 * Cpb * T; Rt = -math.sin(math.radians(2 * dT)) * Rc
    return math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh))
def sample(im, p, r=4):
    px = im.load(); xs = []; 
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            x, y = int(p[0]) + dx, int(p[1]) + dy
            if 0 <= x < W and 0 <= y < H: xs.append(px[x, y][:3])
    return tuple(sum(c[i] for c in xs) / len(xs) for i in range(3))
patches = [(f'swatch:{id}', (x, y, 0.02)) for id, x, y in LAY['swatches']] + [(f'neutral:{n}', (x, y - 0.1, 0.6)) for n, v, x, y in LAY['neutrals']]
x0, y0 = LAY['colorchecker']['origin']; patches += [(f'cc:{i}', (x0 + (i % 6) * .27, y0 - (i // 6) * .27, .02)) for i in range(24)] + [('floor', (0, 4.6, 0))]
presets = sys.argv[1:] or list(PRE.keys()); rep = ['# Blender vs localhost calibration comparison', '', 'ΔE2000 between same-position 9×9 means. Diagnostic only (renderers differ in GI, specular, shadows). Exposure/tone-map: AgX both (see localhost_info.json).', '']
for pr in presets:
    bp, lp = f'docs/bible/calibration/blender_{pr}.png', f'docs/bible/calibration/localhost_{pr}.png'
    if not (os.path.exists(bp) and os.path.exists(lp)): rep.append(f'## {pr}: missing render'); continue
    B = Image.open(bp).convert('RGB').resize((W, H)); L = Image.open(lp).convert('RGB').resize((W, H)); rows = []
    for name, p3 in patches:
        sp = project(p3); b = sample(B, sp); l = sample(L, sp); rows.append((name, b, l, de2000(lab(b), lab(l))))
    sw = [r for r in rows if r[0].startswith('swatch')]; cc = [r for r in rows if r[0].startswith('cc')]; mean = lambda rs: sum(r[3] for r in rs) / len(rs)
    rep += [f'## {pr}', f'- swatch mean ΔE2000 **{mean(sw):.1f}** (max {max(r[3] for r in sw):.1f}); colour-checker mean **{mean(cc):.1f}**; floor ΔE {[r for r in rows if r[0]=="floor"][0][3]:.1f}', '', '| patch | Blender RGB | localhost RGB | ΔE2000 |', '|---|---|---|---|']
    rep += [f'| {n} | {tuple(round(c) for c in b)} | {tuple(round(c) for c in l)} | {d:.1f} |' for n, b, l, d in sorted(rows, key=lambda r: -r[3])[:10]] + ['']
    S = Image.new('RGB', (W * 2, H + 16), 'white'); S.paste(B, (0, 16)); S.paste(L, (W, 16)); d = ImageDraw.Draw(S); d.text((6, 2), f'BLENDER (Cycles, AgX) — {pr}', fill='black'); d.text((W + 6, 2), f'LOCALHOST (three.js, AgX) — {pr}', fill='black'); S.save(f'docs/bible/calibration/compare_{pr}.png')
open('docs/bible/CALIBRATION_REPORT.md', 'w').write('\n'.join(rep) + '\n'); print('\n'.join(rep[:14]))
