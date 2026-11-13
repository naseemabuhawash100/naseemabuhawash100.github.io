import sys, copy, xml.etree.ElementTree as ET
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

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

