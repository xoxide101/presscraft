/* PressCraft core: the project model, object builders, newspaper text flow, the retro look and printing.
   The page being edited lives on a Fabric.js canvas; every other page (panel) is kept as Fabric JSON. */
(function () {
  'use strict';
  const A = window.PressArt;
  const DPI = 150; // model pixels per inch
  const px = (mm) => (mm / 25.4) * DPI;
  const mmOf = (p) => (p / DPI) * 25.4;
  const ptPx = (pt) => (pt / 72) * DPI;
  const pxPt = (p) => (p * 72) / DPI;
  const PAPER = { Letter: [215.9, 279.4], A4: [210, 297] };
  const KINDS = {
    card: { name: 'Greeting card', icon: 'card' },
    sign: { name: 'Sign', icon: 'sign' },
    letterhead: { name: 'Letterhead', icon: 'letter' },
    banner: { name: 'Banner', icon: 'banner' },
    calendar: { name: 'Calendar', icon: 'calendar' },
    newsletter: { name: 'Newsletter', icon: 'news' },
  };
  // Fonts: retro bitmap-style, display, newspaper, and common system fonts.
  const FONTS = ['Press Start 2P', 'VT323', 'Silkscreen', 'Bungee', 'Monoton', 'Lobster', 'Pacifico', 'Fredoka', 'Rye', 'Alfa Slab One', 'Abril Fatface',
    'Playfair Display', 'UnifrakturMaguntia', 'Old Standard TT', 'Libre Baskerville', 'Merriweather', 'Oswald', 'Special Elite', 'Courier Prime',
    'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Impact', 'Comic Sans MS'];
  // Family names with digits (Press Start 2P) must be quoted for the canvas.
  const fam = (f) => (/\d/.test(f || '') && !/^['"]/.test(f) ? `'${f}'` : f);
  const unfam = (f) => String(f || '').replace(/^['"]|['"]$/g, '');
  const PROPS = ['kind', 'title', 'clip', 'border', 'magic', 'cal', 'art', 'wrap', 'shape'];

  const PC = (window.PC = {
    DPI, px, mmOf, ptPx, pxPt, PAPER, KINDS, FONTS, fam, unfam, PROPS,
    doc: null, cur: 0, canvas: null, zoom: 1, exporting: false,
    hooks: { changed: [], selected: [], panel: [] },
  });
  const emit = (name, ...a) => PC.hooks[name].forEach((f) => f(...a));
  PC.on = (name, f) => PC.hooks[name].push(f);

  // ------------------------------------------------------------------ project setup
  // Panels (the faces you design) for each kind of project, in mm.
  function panelsFor(d) {
    const [pw, ph] = PAPER[d.paper];
    const land = d.orient === 'landscape';
    const page = land ? [ph, pw] : [pw, ph];
    switch (d.kind) {
      case 'card':
        if (d.fold === 'half') return ['Front', 'Inside left', 'Inside right', 'Back'].map((n) => ({ name: n, w: ph / 2, h: pw }));
        return ['Front', 'Inside left', 'Inside right', 'Back'].map((n) => ({ name: n, w: pw / 2, h: ph / 2 }));
      case 'banner': return [{ name: 'Banner', w: d.bannerPages * (ph - 12.7), h: pw - 25.4 }];
      case 'newsletter': return Array.from({ length: d.pages || 1 }, (_, i) => ({ name: `Page ${i + 1}`, w: pw, h: ph }));
      case 'calendar': return [{ name: 'Calendar', w: page[0], h: page[1] }];
      case 'letterhead': return [{ name: 'Letterhead', w: pw, h: ph }];
      default: return [{ name: 'Sign', w: page[0], h: page[1] }];
    }
  }
  PC.panelsFor = panelsFor;
  PC.newDoc = function (o) {
    const d = { app: 'PressCraft', version: 1, kind: o.kind, paper: o.paper || 'Letter', orient: o.orient || (o.kind === 'calendar' ? 'landscape' : 'portrait'),
      fold: o.fold || 'quarter', bannerPages: o.bannerPages || 4, pages: o.pages || 1, retro: !!o.retro, retroMode: o.retroMode || 'bw', retroDot: o.retroDot || 0.42,
      stories: {}, nextStory: 1, name: o.name || KINDS[o.kind].name };
    d.panels = panelsFor(d).map((p) => ({ ...p, bg: '#ffffff', json: null }));
    return d;
  };

  // ------------------------------------------------------------------ helpers
  const svgToObject = (str) => new Promise((res) => fabric.loadSVGFromString(str, (objs, opts) => res(fabric.util.groupSVGElements(objs, opts))));
  PC.svgToObject = svgToObject;
  function quietly(fn) { PC.quiet = (PC.quiet || 0) + 1; try { return fn(); } finally { PC.quiet--; } }
  PC.quietly = quietly;
  // Replace an object with a rebuilt one in the same place (same centre, angle and stacking order).
  function swap(old, neu, { keepCentre = true, select = true } = {}) {
    const cv = PC.canvas;
    if (keepCentre) { neu.set({ angle: old.angle || 0 }); neu.setPositionByOrigin(old.getCenterPoint(), 'center', 'center'); }
    const idx = cv.getObjects().indexOf(old);
    quietly(() => { cv.remove(old); cv.insertAt(neu, Math.max(0, idx)); });
    neu.setCoords();
    if (select) cv.setActiveObject(neu);
    cv.requestRenderAll();
    PC.changed();
    return neu;
  }
  PC.swap = swap;

  // ------------------------------------------------------------------ builders
  // Fancy titles (the Print Shop "message"): solid, outline, shadow, 3-D or outline with shadow.
  PC.TITLE_EFFECTS = [['solid', 'Solid'], ['outline', 'Outline'], ['shadow', 'Shadow'], ['3d', '3-D'], ['outline-shadow', 'Outline and shadow']];
  PC.buildTitle = function (t) {
    const base = { fontFamily: fam(t.font), fontSize: ptPx(t.size), fontWeight: t.bold ? 'bold' : 'normal', fontStyle: t.italic ? 'italic' : 'normal',
      textAlign: t.align || 'center', charSpacing: t.spacing || 0, lineHeight: t.lead || 1.05, left: 0, top: 0, objectCaching: false };
    const d = px(t.depth ?? 1.2), parts = [];
    if (t.effect === '3d') { const n = Math.max(4, Math.round(d / 1.2)); for (let i = n; i >= 1; i--) parts.push(new fabric.Text(t.text || ' ', { ...base, left: (d * i) / n, top: (d * i) / n, fill: t.shade })); }
    if (t.effect === 'shadow' || t.effect === 'outline-shadow') parts.push(new fabric.Text(t.text || ' ', { ...base, left: d, top: d, fill: t.shade }));
    const outline = t.effect === 'outline' || t.effect === 'outline-shadow';
    parts.push(new fabric.Text(t.text || ' ', { ...base, fill: outline ? (t.inner || '#ffffff') : t.fill, stroke: outline ? t.fill : null, strokeWidth: outline ? Math.max(1.5, ptPx(t.size) * 0.055) : 0, paintFirst: 'stroke' }));
    return new fabric.Group(parts, { kind: 'title', title: { ...t }, wrap: t.wrap ?? true });
  };
  PC.defaultTitle = (o = {}) => ({ text: 'Your title', font: 'Bungee', size: 48, fill: '#e8483f', shade: '#7a1f1a', effect: '3d', depth: 1.6, align: 'center', bold: false, italic: false, spacing: 0, ...o });

  PC.buildClip = async function (c) {
    const o = await svgToObject(A.clipSvg(c.id, c.mode || 'color', c.tint || '#222222'));
    o.set({ kind: 'clip', clip: { ...c }, wrap: c.wrap ?? true });
    return o;
  };
  PC.buildBorder = async function (b, panel) {
    const W = px(panel.w), H = px(panel.h);
    const o = await svgToObject(A.borderSvg(b.style, W, H, px(b.size || 6), b.color || '#222222', px(b.inset ?? 4)));
    o.set({ kind: 'border', border: { ...b }, wrap: false, left: 0, top: 0, lockMovementX: true, lockMovementY: true, hasControls: false, hoverCursor: 'pointer' });
    return o;
  };
  PC.buildMagic = async function (m) {
    const o = await svgToObject(A.magicSvg(m, px(m.w), px(m.h)));
    o.set({ kind: 'magic', magic: { ...m }, wrap: m.wrap ?? true });
    return o;
  };

  // Calendars: a month grid with a title, weekday names and notes in the day boxes.
  PC.buildCalendar = function (c) {
    const W = px(c.w), H = px(c.h), font = fam(c.font || 'Fredoka'), line = c.line || '#222222', ink = c.color || '#222222';
    const first = new Date(c.year, c.month, 1), days = new Date(c.year, c.month + 1, 0).getDate();
    const lead = (first.getDay() - (c.start || 0) + 7) % 7, weeks = Math.ceil((lead + days) / 7);
    const titleH = c.title === false ? 0 : H * 0.14, headH = H * 0.065, cellW = W / 7, cellH = (H - titleH - headH) / weeks;
    const parts = [new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: 'rgba(0,0,0,0)', strokeWidth: 0 })];
    if (titleH) {
      const name = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const t = new fabric.Text(name, { fontFamily: fam(c.titleFont || 'Lobster'), fontSize: titleH * 0.68, fill: c.titleColor || '#e8483f', originX: 'center', left: W / 2, top: titleH * 0.08 });
      if (t.width > W * 0.95) t.set('fontSize', (t.fontSize * W * 0.95) / t.width);
      parts.push(t);
    }
    parts.push(new fabric.Rect({ left: 0, top: titleH, width: W, height: headH, fill: c.headFill || '#3f8be8', strokeWidth: 0 }));
    const fmt = new Intl.DateTimeFormat(undefined, { weekday: W > px(150) ? 'long' : 'short' });
    for (let i = 0; i < 7; i++) {
      const day = new Date(2023, 0, 1 + ((i + (c.start || 0)) % 7)); // 1 Jan 2023 was a Sunday
      parts.push(new fabric.Text(fmt.format(day), { fontFamily: font, fontSize: headH * 0.5, fill: c.headInk || '#ffffff', originX: 'center', originY: 'center', left: cellW * i + cellW / 2, top: titleH + headH / 2 }));
    }
    const sw = Math.max(1, px(0.3)), pad = Math.min(cellW, cellH) * 0.07;
    for (let w = 0; w < weeks; w++) for (let i = 0; i < 7; i++) {
      const n = w * 7 + i - lead + 1, x = cellW * i, y = titleH + headH + cellH * w;
      parts.push(new fabric.Rect({ left: x, top: y, width: cellW, height: cellH, fill: n >= 1 && n <= days ? 'rgba(0,0,0,0)' : (c.emptyFill || '#f1f1f1'), stroke: line, strokeWidth: sw, strokeUniform: true }));
      if (n < 1 || n > days) continue;
      parts.push(new fabric.Text(String(n), { fontFamily: font, fontSize: Math.min(cellH * 0.26, cellW * 0.3), fill: ink, left: x + pad, top: y + pad * 0.6, fontWeight: 'bold' }));
      const note = c.notes && c.notes[n];
      if (note) parts.push(new fabric.Textbox(note, { fontFamily: font, fontSize: Math.min(cellH * 0.15, ptPx(11)), fill: c.noteColor || '#e8483f', left: x + pad, top: y + cellH * 0.38, width: cellW - 2 * pad, lineHeight: 1 }));
    }
    return new fabric.Group(parts, { kind: 'cal', cal: JSON.parse(JSON.stringify(c)), wrap: false });
  };

  // Shapes
  PC.buildShape = function (s) {
    const W = px(s.w), H = px(s.h), st = { fill: s.fill, stroke: s.stroke || null, strokeWidth: s.stroke ? px(s.sw || 0.8) : 0, strokeUniform: true, objectCaching: false };
    let o;
    if (s.type === 'ellipse') o = new fabric.Ellipse({ rx: W / 2, ry: H / 2, ...st });
    else if (s.type === 'line') o = new fabric.Line([0, 0, W, 0], { ...st, stroke: s.stroke || s.fill || '#222222', strokeWidth: px(s.sw || 1) });
    else if (s.type === 'star') { const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, a = (i * Math.PI) / 5; pts.push({ x: (W / 2) * (1 + r * Math.sin(a)), y: (H / 2) * (1 - r * Math.cos(a)) }); } o = new fabric.Polygon(pts, st); }
    else o = new fabric.Rect({ width: W, height: H, rx: s.type === 'rounded' ? Math.min(W, H) * 0.15 : 0, ry: s.type === 'rounded' ? Math.min(W, H) * 0.15 : 0, ...st });
    o.set({ kind: 'shape', shape: { ...s }, wrap: s.wrap ?? true });
    return o;
  };

  // ------------------------------------------------------------------ newspaper text flow
  // A story is text in doc.stories; frames (kind 'art') show it in columns. Text runs from frame to frame
  // (in page order, then frame order) and goes around pictures that have "wrap" switched on.
  const measure = document.createElement('canvas').getContext('2d');
  const widthCache = new Map();
  function wordWidth(font, w) { const k = font + '|' + w; let v = widthCache.get(k); if (v == null) { measure.font = font; v = measure.measureText(w).width; widthCache.set(k, v); } return v; }
  PC.defaultStory = (o = {}) => ({ text: '', font: 'Libre Baskerville', size: 10, lead: 1.35, align: 'justify', color: '#222222', indent: 4, gap: 1.5, ...o });
  function tokens(text) {
    const out = [];
    String(text || '').replace(/\r/g, '').split('\n').forEach((para, i, all) => {
      para.split(/\s+/).filter(Boolean).forEach((w) => out.push({ w }));
      if (i < all.length - 1) out.push({ p: 1 });
    });
    return out;
  }
  function frameBox(o) { // frame position and size in page pixels, for a live object or saved JSON
    const sx = o.scaleX || 1, sy = o.scaleY || 1;
    return { x: o.left, y: o.top, w: o.width * sx, h: o.height * sy };
  }
  function objBox(o) {
    if (o.getBoundingRect) { const r = o.getBoundingRect(true, true); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
    const w = (o.width || 0) * (o.scaleX || 1), h = (o.height || 0) * (o.scaleY || 1);
    return { x: o.originX === 'center' ? o.left - w / 2 : o.left, y: o.originY === 'center' ? o.top - h / 2 : o.top, w, h };
  }
  function panelObjects(i, cv) { return cv ? cv.getObjects() : ((PC.doc.panels[i].json && PC.doc.panels[i].json.objects) || []); }
  function layoutFrame(box, art, st, toks, start, obstacles) {
    const size = ptPx(st.size), lh = size * (st.lead || 1.3), cols = Math.max(1, art.cols || 1), gut = px(art.gutter ?? 4);
    const colW = (box.w - gut * (cols - 1)) / cols, font = `${st.italic ? 'italic ' : ''}${st.bold ? 'bold ' : ''}${size}px ${fam(st.font)}`;
    const space = wordWidth(font, ' '), indent = px(st.indent || 0), pgap = px(st.gap || 0), margin = px(1.8);
    const lines = [];
    let i = start, paraStart = start === 0 || (toks[start - 1] && toks[start - 1].p);
    for (let c = 0; c < cols && i < toks.length; c++) {
      const cx0 = box.x + c * (colW + gut), cx1 = cx0 + colW;
      let y = box.y;
      while (i < toks.length && y + lh <= box.y + box.h + 0.5) {
        // The widest gap in this line that pictures do not cover.
        let free = [[cx0, cx1]];
        obstacles.forEach((b) => {
          if (b.y - margin >= y + lh || b.y + b.h + margin <= y) return;
          const a0 = b.x - margin, a1 = b.x + b.w + margin;
          free = free.flatMap(([f0, f1]) => (a1 <= f0 || a0 >= f1 ? [[f0, f1]] : [[f0, Math.max(f0, a0)], [Math.min(f1, a1), f1]].filter(([p, q]) => q - p > 1)));
        });
        const seg = free.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0];
        if (!seg || seg[1] - seg[0] < Math.max(px(10), colW * 0.22)) { y += lh * 0.5; continue; }
        const x0 = seg[0] + (paraStart ? indent : 0), avail = seg[1] - x0, words = [];
        let used = 0, ended = false;
        while (i < toks.length) {
          const t = toks[i];
          if (t.p) { i++; ended = true; break; }
          const w = wordWidth(font, t.w), need = words.length ? used + space + w : w;
          if (need > avail && words.length) break;
          words.push({ t: t.w, w }); used = need; i++;
        }
        lines.push({ x: x0, y, avail, used, words, last: ended || i >= toks.length });
        y += lh + (ended ? pgap : 0);
        paraStart = ended;
      }
    }
    return { lines, next: i, font, size };
  }
  // Rebuild the frames shown on canvas `cv` (panel `pi`); frames on other pages are only measured.
  PC.flow = function (cv, pi) {
    const doc = PC.doc; if (!doc) return;
    const ids = new Set();
    cv.getObjects().forEach((o) => { if (o.kind === 'art') ids.add(o.art.story); });
    doc.overflow = doc.overflow || {};
    ids.forEach((sid) => {
      const st = doc.stories[sid]; if (!st) return;
      const toks = tokens(st.text);
      const frames = [];
      doc.panels.forEach((p, i) => panelObjects(i, i === pi ? cv : null).forEach((o) => { if (o.kind === 'art' && o.art.story === sid) frames.push({ i, o }); }));
      frames.sort((a, b) => a.i - b.i || (a.o.art.order || 0) - (b.o.art.order || 0));
      let pos = 0;
      frames.forEach(({ i, o }) => {
        const box = frameBox(o);
        const obstacles = panelObjects(i, i === pi ? cv : null).filter((x) => x !== o && x.wrap && x.kind !== 'art' && x.kind !== 'border' && x.visible !== false).map(objBox);
        const lay = layoutFrame(box, o.art, st, toks, pos, obstacles);
        pos = lay.next;
        if (i === pi) {
          const g = buildFrame(o.art, st, box, lay);
          g.set({ left: box.x, top: box.y });
          const idx = cv.getObjects().indexOf(o);
          const wasActive = !!cv.getActiveObject && cv.getActiveObject() === o;
          quietly(() => { cv.remove(o); cv.insertAt(g, idx); });
          if (wasActive) cv.setActiveObject(g);
        }
      });
      doc.overflow[sid] = Math.max(0, toks.filter((t) => t.w).length - toks.slice(0, pos).filter((t) => t.w).length);
    });
  };
  function buildFrame(art, st, box, lay) {
    const parts = [new fabric.Rect({ left: box.x, top: box.y, width: box.w, height: box.h, fill: 'rgba(0,0,0,0)', strokeWidth: 0 })];
    const base = { fontFamily: fam(st.font), fontSize: lay.size, fill: st.color || '#222222', fontWeight: st.bold ? 'bold' : 'normal', fontStyle: st.italic ? 'italic' : 'normal', lineHeight: 1, objectCaching: false };
    lay.lines.forEach((l) => {
      if (!l.words.length) return;
      if (st.align === 'justify' && !l.last && l.words.length > 1) {
        const extra = (l.avail - l.used) / (l.words.length - 1);
        let x = l.x;
        const space = wordWidth(lay.font, ' ');
        l.words.forEach((w) => { parts.push(new fabric.Text(w.t, { ...base, left: x, top: l.y })); x += w.w + space + extra; });
      } else {
        const text = l.words.map((w) => w.t).join(' ');
        const off = st.align === 'center' ? (l.avail - l.used) / 2 : st.align === 'right' ? l.avail - l.used : 0;
        parts.push(new fabric.Text(text, { ...base, left: l.x + off, top: l.y }));
      }
    });
    return new fabric.Group(parts, { kind: 'art', art: { ...art }, wrap: false, lockRotation: true, subTargetCheck: false });
  }
  PC.newStory = function (text, o = {}) {
    const id = 's' + PC.doc.nextStory++;
    PC.doc.stories[id] = PC.defaultStory({ text, ...o });
    return id;
  };
  PC.newFrame = function (story, w, h, cols = 2) {
    let order = 0;
    PC.allFrames(story).forEach((f) => { order = Math.max(order, (f.art.order || 0) + 1); });
    const art = { story, order, cols, gutter: 4 };
    return buildFrame(art, PC.doc.stories[story], { x: 0, y: 0, w: px(w), h: px(h) }, { lines: [], size: 10, font: '' });
  };
  PC.allFrames = function (story) {
    const out = [];
    PC.doc.panels.forEach((p, i) => panelObjects(i, i === PC.cur && PC.canvas ? PC.canvas : null).forEach((o) => { if (o.kind === 'art' && o.art.story === story) out.push(o); }));
    return out;
  };

  // ------------------------------------------------------------------ the retro look
  // Pictures are redrawn with big dots: black and white (dithered like a 1980s dot-matrix printout) or
  // the eight colours of a colour ribbon.
  PC.RETRO_PALETTE = [[0, 0, 0], [255, 255, 255], [214, 38, 43], [245, 211, 39], [42, 79, 214], [240, 138, 36], [47, 168, 79], [122, 63, 182]];
  PC.retroize = function (src, dot, mode) {
    dot = Math.max(1, dot);
    const sw = Math.max(1, Math.round(src.width / dot)), sh = Math.max(1, Math.round(src.height / dot));
    const small = document.createElement('canvas'); small.width = sw; small.height = sh;
    const sx = small.getContext('2d', { willReadFrequently: true });
    sx.fillStyle = '#ffffff'; sx.fillRect(0, 0, sw, sh);
    sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
    sx.drawImage(src, 0, 0, sw, sh);
    const img = sx.getImageData(0, 0, sw, sh), d = img.data;
    if (mode === 'color') {
      const buf = new Float32Array(sw * sh * 3);
      for (let i = 0, q = 0; i < sw * sh; i++, q += 4) { buf[i * 3] = d[q]; buf[i * 3 + 1] = d[q + 1]; buf[i * 3 + 2] = d[q + 2]; }
      const P = PC.RETRO_PALETTE;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 3, r = buf[i], g = buf[i + 1], b = buf[i + 2];
        let best = 0, bd = Infinity;
        for (let k = 0; k < P.length; k++) { const dr = r - P[k][0], dg = g - P[k][1], db = b - P[k][2], dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (dd < bd) { bd = dd; best = k; } }
        const [pr, pg, pb] = P[best], er = (r - pr) / 8, eg = (g - pg) / 8, eb = (b - pb) / 8;
        const spread = (dx, dy) => { const xx = x + dx, yy = y + dy; if (xx < 0 || xx >= sw || yy >= sh) return; const j = (yy * sw + xx) * 3; buf[j] += er; buf[j + 1] += eg; buf[j + 2] += eb; };
        spread(1, 0); spread(2, 0); spread(-1, 1); spread(0, 1); spread(1, 1); spread(0, 2);
        const q = (y * sw + x) * 4; d[q] = pr; d[q + 1] = pg; d[q + 2] = pb; d[q + 3] = 255;
      }
    } else {
      const g = new Float32Array(sw * sh);
      for (let i = 0, q = 0; i < g.length; i++, q += 4) g[i] = 0.299 * d[q] + 0.587 * d[q + 1] + 0.114 * d[q + 2];
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        const i = y * sw + x, v = g[i] < 128 ? 0 : 255, e = (g[i] - v) / 8, q = i * 4;
        if (x + 1 < sw) g[i + 1] += e; if (x + 2 < sw) g[i + 2] += e;
        if (y + 1 < sh) { if (x > 0) g[i + sw - 1] += e; g[i + sw] += e; if (x + 1 < sw) g[i + sw + 1] += e; }
        if (y + 2 < sh) g[i + 2 * sw] += e;
        d[q] = d[q + 1] = d[q + 2] = v; d[q + 3] = 255;
      }
    }
    sx.putImageData(img, 0, 0);
    const out = document.createElement('canvas'); out.width = src.width; out.height = src.height;
    const ox = out.getContext('2d'); ox.imageSmoothingEnabled = false; ox.drawImage(small, 0, 0, out.width, out.height);
    return out;
  };

  // ------------------------------------------------------------------ panels
  PC.saveLive = function () {
    if (!PC.canvas || !PC.doc) return;
    const p = PC.doc.panels[PC.cur];
    if (p) p.json = PC.canvas.toJSON(PROPS);
  };
  PC.fontsUsed = function (json) {
    const s = new Set();
    const walk = (o) => { if (o.fontFamily) s.add(unfam(o.fontFamily)); (o.objects || []).forEach(walk); };
    ((json && json.objects) || []).forEach(walk);
    Object.values(PC.doc.stories || {}).forEach((st) => s.add(st.font));
    return [...s];
  };
  PC.loadFonts = (list) => Promise.all(list.filter(Boolean).map((f) => (document.fonts && document.fonts.load ? document.fonts.load(`20px ${fam(f)}`).catch(() => {}) : null)));
  PC.loadPanel = async function (i) {
    const cv = PC.canvas, p = PC.doc.panels[i];
    PC.cur = i;
    await PC.loadFonts(PC.fontsUsed(p.json));
    await new Promise((res) => {
      PC.loading = true;
      cv.discardActiveObject();
      if (p.json) cv.loadFromJSON(p.json, res); else { cv.clear(); res(); }
    });
    cv.backgroundColor = p.bg || '#ffffff';
    PC.flow(cv, i);
    PC.loading = false;
    cv.requestRenderAll();
    emit('panel', i);
  };

  // ------------------------------------------------------------------ history and autosave
  const AUTOSAVE = 'presscraft-doc-v1';
  let history = [], hIndex = -1, hTimer = null;
  PC.snapshot = () => { PC.saveLive(); return JSON.stringify(PC.doc); };
  PC.changed = function () {
    if (PC.quiet || PC.loading) return;
    clearTimeout(hTimer);
    hTimer = setTimeout(() => {
      const snap = PC.snapshot();
      if (history[hIndex] === snap) return;
      history = history.slice(0, hIndex + 1); history.push(snap);
      if (history.length > 40) history.shift();
      hIndex = history.length - 1;
      PC.dirty = true;
      try { localStorage.setItem(AUTOSAVE, snap); PC.autosaveFailed = false; } catch (e) { PC.autosaveFailed = true; }
      emit('changed');
    }, 250);
  };
  PC.resetHistory = function () { history = [PC.snapshot()]; hIndex = 0; try { localStorage.setItem(AUTOSAVE, history[0]); } catch (e) {} };
  PC.canUndo = () => hIndex > 0;
  PC.canRedo = () => hIndex < history.length - 1;
  async function restore(snap) { const cur = PC.cur; PC.doc = JSON.parse(snap); await PC.loadPanel(Math.min(cur, PC.doc.panels.length - 1)); emit('changed'); }
  PC.undo = () => { if (hIndex > 0) restore(history[--hIndex]); };
  PC.redo = () => { if (hIndex < history.length - 1) restore(history[++hIndex]); };
  PC.autosaved = () => { try { const s = localStorage.getItem(AUTOSAVE); return s ? JSON.parse(s) : null; } catch (e) { return null; } };

  // ------------------------------------------------------------------ output
  // Render one panel to a canvas at `dpi` (with the retro look when it is on).
  PC.renderPanel = async function (i, dpi, { retro = true } = {}) {
    PC.saveLive();
    const p = PC.doc.panels[i], k = dpi / DPI, W = Math.round(px(p.w) * k), H = Math.round(px(p.h) * k);
    await PC.loadFonts(PC.fontsUsed(p.json));
    const el = document.createElement('canvas');
    const sc = new fabric.StaticCanvas(el, { width: W, height: H, enableRetinaScaling: false, renderOnAddRemove: false });
    sc.setZoom(k);
    await new Promise((res) => (p.json ? sc.loadFromJSON(p.json, res) : res()));
    sc.backgroundColor = p.bg || '#ffffff';
    PC.flow(sc, i);
    PC.exporting = true; sc.renderAll(); PC.exporting = false;
    let out = document.createElement('canvas'); out.width = W; out.height = H;
    out.getContext('2d').drawImage(sc.getElement(), 0, 0);
    sc.dispose();
    if (retro && PC.doc.retro) out = PC.retroize(out, (PC.doc.retroDot / 25.4) * dpi, PC.doc.retroMode);
    return out;
  };
  // Sheets of paper to print: cards are folded, banners are split across pages.
  PC.sheets = async function (dpi = 300, onStep) {
    const d = PC.doc, [pw, ph] = PAPER[d.paper], k = dpi / 25.4, imgs = [];
    for (let i = 0; i < d.panels.length; i++) { imgs.push(await PC.renderPanel(i, dpi)); onStep && onStep(i + 1, d.panels.length); }
    const sheet = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return [c, x]; };
    const marks = (x, list) => { x.save(); x.strokeStyle = '#b8bec9'; x.lineWidth = Math.max(1, 0.2 * k); x.setLineDash([2 * k, 2 * k]); list.forEach(([a, b, c2, e]) => { x.beginPath(); x.moveTo(a * k, b * k); x.lineTo(c2 * k, e * k); x.stroke(); }); x.restore(); };
    const put = (x, img, dx, dy, w, h, rot = 0) => { x.save(); x.translate((dx + w / 2) * k, (dy + h / 2) * k); x.rotate((rot * Math.PI) / 180); const iw = rot % 180 ? h : w, ih = rot % 180 ? w : h; x.drawImage(img, (-iw / 2) * k, (-ih / 2) * k, iw * k, ih * k); x.restore(); };
    const out = [];
    if (d.kind === 'card' && d.fold !== 'half') {
      // Quarter fold: fold the sheet in half top to bottom (print outside), then in half again.
      const [c, x] = sheet(pw, ph), w = pw / 2, h = ph / 2;
      put(x, imgs[0], w, h, w, h); put(x, imgs[3], 0, h, w, h);
      put(x, imgs[2], 0, 0, w, h, 180); put(x, imgs[1], w, 0, w, h, 180);
      marks(x, [[0, h, 6, h], [pw - 6, h, pw, h], [w, 0, w, 6], [w, ph - 6, w, ph]]);
      out.push({ canvas: c, w: pw, h: ph, note: 'Fold in half top to bottom with the printing outside, then in half again so the front is on top.' });
    } else if (d.kind === 'card') {
      const [c1, x1] = sheet(ph, pw), [c2, x2] = sheet(ph, pw), w = ph / 2;
      put(x1, imgs[3], 0, 0, w, pw); put(x1, imgs[0], w, 0, w, pw);
      put(x2, imgs[1], 0, 0, w, pw); put(x2, imgs[2], w, 0, w, pw);
      marks(x1, [[w, 0, w, 6], [w, pw - 6, w, pw]]);
      out.push({ canvas: c1, w: ph, h: pw, note: 'Sheet 1 is the outside (back and front).' }, { canvas: c2, w: ph, h: pw, note: 'Sheet 2 is the inside: print it on the back of sheet 1 (flip on the short edge), then fold in half.' });
    } else if (d.kind === 'banner') {
      const seg = ph - 12.7, bh = pw - 25.4, img = imgs[0], pk = img.width / d.panels[0].w;
      for (let n = 0; n < d.bannerPages; n++) {
        const piece = document.createElement('canvas'); piece.width = Math.round(seg * pk); piece.height = img.height;
        piece.getContext('2d').drawImage(img, Math.round(n * seg * pk), 0, piece.width, img.height, 0, 0, piece.width, img.height);
        const [c, x] = sheet(pw, ph);
        put(x, piece, (pw - bh) / 2, (ph - seg) / 2, bh, seg, 90);
        marks(x, [[(pw - bh) / 2 - 4, (ph - seg) / 2, (pw - bh) / 2 - 1, (ph - seg) / 2], [(pw + bh) / 2 + 1, (ph - seg) / 2, (pw + bh) / 2 + 4, (ph - seg) / 2],
          [(pw - bh) / 2 - 4, (ph + seg) / 2, (pw - bh) / 2 - 1, (ph + seg) / 2], [(pw + bh) / 2 + 1, (ph + seg) / 2, (pw + bh) / 2 + 4, (ph + seg) / 2]]);
        x.save(); x.fillStyle = '#9aa1ad'; x.font = `${3 * k}px Arial`; x.textAlign = 'center'; x.fillText(`${n + 1} of ${d.bannerPages}`, (pw / 2) * k, (ph - 1.5) * k); x.restore();
        out.push({ canvas: c, w: pw, h: ph, note: n === 0 ? 'Trim each page at the marks and tape them together in order (page tops all point the same way).' : '' });
      }
    } else {
      d.panels.forEach((p, i) => out.push({ canvas: imgs[i], w: p.w, h: p.h, note: '' }));
    }
    return out;
  };
})();
