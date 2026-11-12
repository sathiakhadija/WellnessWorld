"""4-way evidence sheet: BEFORE page / TARGET page / LOCALHOST shot / BLENDER note.  python3 scripts/make_sheet.py out.jpg "Title" before_page target_page shot.png ["blender note"]"""
import sys, os
from PIL import Image, ImageDraw
out, title, bp, tp, shot = sys.argv[1:6]; note = sys.argv[6] if len(sys.argv) > 6 else 'BLENDER not rendered for this environment (see DEFECTS.md)'
P = os.path.join(os.path.dirname(__file__), '..', 'docs', 'bible', 'pages')
def page(n): im = Image.open(f'{P}/p-{int(n):02d}.jpg').convert('RGB'); h = 520; return im.resize((int(im.width * h / im.height), h))
a, b = page(bp), page(tp); c = Image.open(shot).convert('RGB'); c = c.resize((int(c.width * 520 / c.height), 520))
W = a.width + b.width + c.width + 80; sh = Image.new('RGB', (W, 590), '#f4efea'); d = ImageDraw.Draw(sh)
x = 20
for im, lab in ((a, f'BEFORE (Bible page {bp})'), (b, f'TARGET (Bible page {tp})'), (c, 'LOCALHOST AFTER (headless SwiftShader)')):
    d.text((x, 4), lab, fill='#222'); sh.paste(im, (x, 30)); x += im.width + 20
d.text((20, 568), note, fill='#7a1f1f'); sh.save(out, quality=88)
