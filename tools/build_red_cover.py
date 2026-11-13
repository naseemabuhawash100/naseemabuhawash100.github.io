import sys, copy, xml.etree.ElementTree as ET
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

SRC, OUT = sys.argv[1], sys.argv[2]
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS); ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
S = lambda t: '{%s}%s' % (NS, t)
F = 'fonts/'  # Amiri + Playfair Display (OFL, Google Fonts)

W, H = 419.53, 595.28
M = 24  # equal panel margin on all sides
RED, NAVY, CREAM = '#c8283c', '#0d447c', '#fffaf2'

_fonts = {}
def text_path(txt, font, size, x, y, anchor='middle', spacing=0.0):
    if font not in _fonts:
        data = open(F + font, 'rb').read()
        _fonts[font] = (hb.Font(hb.Face(data)), TTFont(F + font))
    hbf, tt = _fonts[font]
    buf = hb.Buffer(); buf.add_str(txt); buf.guess_segment_properties()
    hb.shape(hbf, buf, {'kern': True, 'liga': True})
    upem = tt['head'].unitsPerEm; k = size / upem
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    pen = SVGPathPen(gs); cx = 0.0; placed = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        placed.append((order[info.codepoint], cx + pos.x_offset, pos.y_offset))
        cx += pos.x_advance + spacing * upem
    width = (cx - spacing * upem) * k
    x0 = x - {'middle': width / 2, 'start': 0, 'end': width}[anchor]
    for name, gx, gy in placed:
        gs[name].draw(TransformPen(pen, (k, 0, 0, -k, x0 + gx * k, y - gy * k)))
    return pen.getCommands(), width

def el(tag, parent=None, **a):
    e = ET.Element(S(tag), {k.replace('_', '-'): str(v) for k, v in a.items()})
    if parent is not None: parent.append(e)
    return e

def heart(cx, cy, s, **a):
    d = (f'M{cx},{cy+s*0.9} C{cx-s*1.6},{cy-s*0.1} {cx-s*0.9},{cy-s*1.3} {cx},{cy-s*0.45} '
         f'C{cx+s*0.9},{cy-s*1.3} {cx+s*1.6},{cy-s*0.1} {cx},{cy+s*0.9} Z')
    return el('path', d=d, **a)

tree = ET.parse(SRC); root = tree.getroot()
root.set('width', f'{W}pt'); root.set('height', f'{H}pt')  # keeps A5 size in PDF export
layer = root.find(S('g')).find(S('g'))
kids = list(layer)
gingham, panel, utensils, board, cookie, sugar, star, title = kids

# 1. New centred panel replaces the off-centre one (and its one-sided stitch)
layer.remove(panel)
p = ET.Element(S('g'), {'id': 'panel'})
for i, op in enumerate((0.05, 0.05, 0.06)):  # soft layered shadow (renders without filters)
    o = 1.2 + i * 1.1
    el('rect', p, x=M + o * 0.4, y=M + o, width=W - 2 * M, height=H - 2 * M, rx=7, fill='#5a1520', opacity=op)
el('rect', p, x=M, y=M, width=W - 2 * M, height=H - 2 * M, rx=7, fill=CREAM)
i1 = 8
el('rect', p, x=M + i1, y=M + i1, width=W - 2 * (M + i1), height=H - 2 * (M + i1), rx=4,
   fill='none', stroke=RED, stroke_width=1.1, stroke_dasharray='5 3.2', stroke_linecap='round', opacity=0.85)
layer.insert(1, p)

# 2. Title: centre on the page and drop the two stray mini-hearts
tk = list(title)
for idx in (15, 16): title.remove(tk[idx])
title.set('transform', 'translate(4.3 6)')

# 3. Rebalance: cookie heart joins the text block bottom-right
BX = 292
cookie.set('transform', 'rotate(-12 70 68) translate(-66 -372)')  # balances the star top-left

blk = ET.Element(S('g'), {'id': 'subtitle'})
# ornament divider
y = 470
el('line', blk, x1=BX - 62, y1=y, x2=BX - 12, y2=y, stroke=RED, stroke_width=0.8, stroke_linecap='round')
el('line', blk, x1=BX + 12, y1=y, x2=BX + 62, y2=y, stroke=RED, stroke_width=0.8, stroke_linecap='round')
el('circle', blk, cx=BX - 66, cy=y, r=1.3, fill=RED); el('circle', blk, cx=BX + 66, cy=y, r=1.3, fill=RED)
blk.append(heart(BX, y, 4.2, fill=RED))
d, _ = text_path('مِن مطبخي إلى قلوبكم', 'Amiri-Bold.ttf', 19, BX, 502)
el('path', blk, d=d, fill=RED)
d, _ = text_path('RECIPE BOOK', 'PlayfairDisplay[wght].ttf', 9, BX, 524, spacing=0.32)
el('path', blk, d=d, fill=NAVY)
layer.append(blk)

tree.write(OUT, encoding='UTF-8', xml_declaration=True)
