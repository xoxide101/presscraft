"""PressCraft's Border designer: border_lab.html (PressCraft's own copy of the designer from ShiftCraft) and its pictures
put into js/border-lab.js, which index.html loads:

  window.LAB_ICONS            the pictures (border_icons.js, border_icons2.js)
  window.makeBorderEngine()   the drawing part: render(design, W, H) -> SVG of a border for a page W x H (96 per inch)
  window.BORDER_LAB_SRC       the designer page, shown in a frame (srcdoc, so it works from a file too)

Run it after changing anything in this folder:  python border/make_border.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'js', 'border-lab.js')
rd = lambda n: open(os.path.join(HERE, n), encoding='utf-8').read()

icons = rd('border_icons.js') + '\n' + rd('border_icons2.js')
lab = rd('border_lab.html')
main = lab[lab.index("'use strict';"):]
engine = main[main.index('// @engine-start'):main.index('// @engine-end')]
factory = (
    "window.makeBorderEngine = function () {\n'use strict';\n"
    "let drag = null, cur = -1; const LBL = [], flowList = () => [], $ = () => null;\n" + engine +
    "const render = (design, W, H, over) => { Object.keys(S).forEach((k) => delete S[k]); Object.assign(S, JSON.parse(JSON.stringify(BASE)), "
    "themeVals(design.theme || BASE.theme), JSON.parse(JSON.stringify(design)), over || {}, { showPts: false }); ownSync(); return drawSvg(W, H, false); };\n"
    "return { render, icons: ICONS, cat: CAT };\n};\n")
tags = '<script src="border_icons.js"></script>\n<script src="border_icons2.js"></script>'
assert lab.count(tags) == 1, 'the picture scripts in border_lab.html'
hosted = lab.replace(tags, '<script>window.LAB_ICONS = parent.LAB_ICONS; window.BORDER_HOST = parent.BORDER_HOST;</script>')
src = json.dumps(hosted).replace('</', '<\\/')
with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write('/* PressCraft Border designer: made by border/make_border.py from border/ (do not change this file by hand) */\n'
            + icons + '\n' + factory + 'window.BORDER_LAB_SRC = ' + src + ';\n')
print('wrote', os.path.normpath(OUT), os.path.getsize(OUT), 'bytes')
