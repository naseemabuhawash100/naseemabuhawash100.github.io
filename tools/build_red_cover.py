import sys, xml.etree.ElementTree as ET
sys.path.insert(0, __import__('os').path.dirname(__file__))
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS); ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
S = lambda t: '{%s}%s' % (NS, t)
import coverlib as B
B.F = sys.argv[3] if len(sys.argv) > 3 else B.F
el, text_path, heart = B.el, B.text_path, B.heart

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 419.53, 595.28
RED, DEEP, NAVY, CREAM = '#c8283c', '#9e1b2e', '#0d447c', '#fbf3e6'
TABLE = 452  # top edge of the gingham tablecloth

tree = ET.parse(SRC); root = tree.getroot()
root.set('width', f'{W}pt'); root.set('height', f'{H}pt')
layer = root.find(S('g')).find(S('g'))
gingham, panel, utensils, board, cookie, sugar, star, title = list(layer)
for c in list(layer): layer.remove(c)
title.remove(list(title)[16]); title.remove(list(title)[15])  # stray mini hearts

def place(g, tx, ty, s=1.0, rot=0, ox=0, oy=0):
    w = el('g', layer, transform=f'translate({tx} {ty}) rotate({rot}) scale({s}) translate({-ox} {-oy})')
    w.append(g); return w

defs = root.find(S('defs'))
grad = el('radialGradient', defs, id='paper', cx='50%', cy='38%', r='75%')
el('stop', grad, offset='0', stop_color='#fffaf1'); el('stop', grad, offset='1', stop_color='#f3e6cf')
cp = el('clipPath', defs, id='cloth'); el('rect', cp, x=0, y=TABLE, width=W, height=H - TABLE)

# paper background
el('rect', layer, x=0, y=0, width=W, height=H, fill='url(#paper)')

# gingham tablecloth
cloth = el('g', layer, clip_path='url(#cloth)')
el('rect', cloth, x=0, y=TABLE, width=W, height=H - TABLE, fill='#fff7f4')
C = 15
for i in range(int(W / C) + 2):
    el('rect', cloth, x=i * C, y=TABLE, width=C / 2, height=H - TABLE, fill=RED, opacity=0.5)
for j in range(int((H - TABLE) / C) + 2):
    el('rect', cloth, x=0, y=TABLE + j * C, width=W, height=C / 2, fill=RED, opacity=0.5)
# scalloped edge + soft shadow line under it
for i in range(int(W / 14) + 2):
    el('circle', layer, cx=i * 14, cy=TABLE + 1.5, r=7.2, fill='#5a1520', opacity=0.08)
    el('circle', layer, cx=i * 14, cy=TABLE, r=7, fill='#f6ead6')

# utensils bleed in from the top-right corner (their artwork is cropped at the top)
place(utensils, 300, -6, 1.12, 0, 284, 23)

# title lettering, centred
place(title, W / 2, 74, 0.92, 0, 205.5, 100)
# light scattered hearts balance the utensils corner
for hx, hy, hs, op in ((52, 70, 5, 0.35), (78, 104, 3.2, 0.25), (40, 128, 2.4, 0.2), (96, 58, 2.2, 0.2)):
    layer.append(heart(hx, hy, hs, fill='#f2979a', opacity=op))

# subtitle + ornament
y = 380
d, _ = text_path('مِن مطبخي إلى قلوبكم', 'Amiri-Bold.ttf', 21, W / 2, y)
el('path', layer, d=d, fill=RED)
y = 404
for s in (-1, 1):
    el('line', layer, x1=W / 2 + s * 14, y1=y, x2=W / 2 + s * 78, y2=y, stroke=RED, stroke_width=0.8, stroke_linecap='round')
    el('circle', layer, cx=W / 2 + s * 83, cy=y, r=1.4, fill=RED)
layer.append(heart(W / 2, y, 4.4, fill=RED))

# still life: items stand on one baseline, tall pieces frame the label, small ones sit centred below it
BASE = 566
def shadow(cx, w):
    el('ellipse', layer, cx=cx, cy=BASE + 1, rx=w / 2, ry=3.2, fill='#3d0d14', opacity=0.22)
for cx, w in ((70, 70), (W - 74, 74), (W / 2 - 24, 40), (W / 2 + 26, 32)):
    shadow(cx, w)
place(board, 70, BASE, 0.56, 9, 67.5, 585)        # anchors = bottom-centre of each artwork
place(sugar, W - 74, BASE, 1.0, 0, 142.5, 579)
place(cookie, W / 2 - 26, BASE, 1.4, 0, 136, 456)
place(star, W / 2 + 28, BASE, 1.65, 0, 319, 46)

# label on the cloth
lx, ly, lw, lh = W / 2, 494, 132, 40
el('rect', layer, x=lx - lw / 2 + 1, y=ly - lh / 2 + 2, width=lw, height=lh, rx=5, fill='#5a1520', opacity=0.18)
el('rect', layer, x=lx - lw / 2, y=ly - lh / 2, width=lw, height=lh, rx=5, fill=CREAM, stroke=DEEP, stroke_width=1.2)
el('rect', layer, x=lx - lw / 2 + 4, y=ly - lh / 2 + 4, width=lw - 8, height=lh - 8, rx=3, fill='none',
   stroke=DEEP, stroke_width=0.5, stroke_dasharray='2.5 2')
d, _ = text_path('RECIPE BOOK', 'PlayfairDisplay[wght].ttf', 12, lx, ly + 4.3, spacing=0.22)
el('path', layer, d=d, fill=NAVY)

# stitching around the whole cover; cream halo keeps it visible on both paper and gingham
I, dash = 12, '6 3.5'
for colour, sw in ((CREAM, 2.6), (DEEP, 1.2)):
    el('rect', layer, x=I, y=I, width=W - 2 * I, height=H - 2 * I, rx=6, fill='none', stroke=colour,
       stroke_width=sw, stroke_dasharray=dash, stroke_linecap='round')

tree.write(OUT, encoding='UTF-8', xml_declaration=True)
