/* PressCraft interface: canvas, pages, library, properties, start screen, ribbon and printing. */
(function () {
  'use strict';
  const PC = window.PC, A = window.PressArt;
  const { px, mmOf, ptPx, pxPt, fam, unfam, FONTS, PROPS } = PC;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const r1 = (v) => Math.round(v * 10) / 10;

  // ------------------------------------------------------------------ canvas
  fabric.Object.prototype.set({ transparentCorners: false, cornerColor: '#ffffff', cornerStrokeColor: '#c2185b', borderColor: '#c2185b', cornerStyle: 'circle', cornerSize: 10, padding: 0, borderScaleFactor: 1.5 });
  const canvas = (PC.canvas = new fabric.Canvas('c', { preserveObjectStacking: true, backgroundColor: '#ffffff', selectionColor: 'rgba(194,24,91,.08)', selectionBorderColor: '#c2185b' }));
  const frame = $('frame'), desk = $('desk');
  const container = canvas.wrapperEl;
  const retroEl = document.createElement('canvas'); retroEl.className = 'retro-view'; container.insertBefore(retroEl, canvas.upperCanvasEl);
  const guides = document.createElement('div'); guides.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3'; container.append(guides);
  const holeEl = document.createElement('div'); holeEl.className = 'disc-hole'; holeEl.hidden = true; container.append(holeEl);
  const active = () => canvas.getActiveObject();
  const panel = () => PC.doc.panels[PC.cur];
  const kindOf = (o) => (o ? o.kind || (/text/.test(o.type) ? 'text' : o.type === 'image' ? 'image' : o.type) : null);
  let autoFit = true;

  function fitZoom() {
    if (!PC.doc) return;
    const p = panel(), W = px(p.w), H = px(p.h);
    const aw = Math.max(100, desk.clientWidth - 60), ah = Math.max(100, desk.clientHeight - 70);
    setZoom(Math.min(aw / W, ah / H, 3));
  }
  function setZoom(z) {
    const p = panel(); PC.zoom = Math.max(0.05, Math.min(6, z));
    canvas.setDimensions({ width: Math.round(px(p.w) * PC.zoom), height: Math.round(px(p.h) * PC.zoom) });
    canvas.setZoom(PC.zoom);
    retroEl.style.width = canvas.width + 'px'; retroEl.style.height = canvas.height + 'px';
    frame.classList.toggle('disc', p.shape === 'disc');
    holeEl.hidden = p.shape !== 'disc';
    if (!holeEl.hidden) holeEl.style.width = holeEl.style.height = px(p.hole || 41) * PC.zoom + 'px';
    canvas.requestRenderAll(); status();
  }
  new ResizeObserver(() => { if (autoFit) fitZoom(); }).observe(desk);

  // Retro view: the page redrawn with big dots, on top of the normal drawing (selection handles stay sharp).
  let retroT = null;
  function drawRetro() {
    retroT = null;
    const on = PC.doc && PC.doc.retro;
    frame.classList.toggle('retro', !!on);
    retroEl.hidden = !on;
    if (!on) return;
    const src = canvas.lowerCanvasEl, ratio = src.width / canvas.width;
    const out = PC.retroize(src, Math.max(1, px(PC.doc.retroDot) * PC.zoom * ratio), PC.doc.retroMode);
    retroEl.width = out.width; retroEl.height = out.height;
    retroEl.getContext('2d').drawImage(out, 0, 0);
  }
  // On-screen guides: newspaper frames and their columns (never printed).
  function drawGuides() {
    if (!PC.doc) return;
    let html = '';
    (panel().folds || []).forEach((f) => { html += `<div title="Fold (spine)" style="position:absolute;left:${px(f) * PC.zoom}px;top:0;bottom:0;border-left:1px dashed rgba(63,139,232,.8)"></div>`; });
    canvas.getObjects().forEach((o) => {
      if (o.kind !== 'art') return;
      const r = o.getBoundingRect(), cols = o.art.cols || 1, gut = px(o.art.gutter ?? 4) * PC.zoom, cw = (r.width - gut * (cols - 1)) / cols;
      html += `<div style="position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;outline:1px dashed rgba(63,139,232,.7)"></div>`;
      for (let c = 1; c < cols; c++) html += `<div style="position:absolute;left:${r.left + c * cw + (c - 0.5) * gut}px;top:${r.top}px;height:${r.height}px;border-left:1px dotted rgba(63,139,232,.45)"></div>`;
      const frames = PC.allFrames(o.art.story), last = frames.reduce((m, f) => Math.max(m, f.art.order || 0), 0);
      if ((o.art.order || 0) === last && (PC.doc.overflow || {})[o.art.story] > 0)
        html += `<div style="position:absolute;left:${r.left + r.width - 92}px;top:${r.top + r.height - 4}px;background:#c62828;color:#fff;font:600 11px/18px var(--font-ui);padding:0 7px;border-radius:9px">▼ more text</div>`;
    });
    guides.innerHTML = html;
  }
  canvas.on('after:render', () => { if (PC.exporting) return; drawGuides(); if (PC.doc && PC.doc.retro && !retroT) retroT = setTimeout(drawRetro, 60); });

  // ------------------------------------------------------------------ change tracking
  canvas.on('object:added', () => PC.changed());
  canvas.on('object:removed', () => PC.changed());
  canvas.on('object:modified', (e) => {
    const o = e.target; if (!o) return;
    const sx = o.scaleX || 1, sy = o.scaleY || 1, scaled = Math.abs(sx - 1) > 0.002 || Math.abs(sy - 1) > 0.002;
    const k = kindOf(o);
    if (k === 'text' && scaled) {
      if (o.type === 'textbox') o.set({ width: o.width * sx, scaleX: 1, fontSize: o.fontSize * sy, scaleY: 1 });
      else o.set({ fontSize: o.fontSize * sy, scaleX: sx / sy, scaleY: 1 });
      if (Math.abs(o.scaleX - 1) < 0.03) o.set('scaleX', 1);
      o.setCoords();
    } else if (k === 'title' && scaled) return void PC.swap(o, PC.buildTitle({ ...o.title, size: r1(o.title.size * sy) }));
    else if (k === 'magic' && scaled) return void PC.buildMagic({ ...o.magic, w: o.magic.w * sx, h: o.magic.h * sy }).then((n) => { PC.swap(o, n); reflow(); });
    else if (k === 'cal' && scaled) return void PC.swap(o, PC.buildCalendar({ ...o.cal, w: o.cal.w * sx, h: o.cal.h * sy }));
    else if (k === 'arc') {
      const a = { ...o.arc }, was = PC.buildArc(a).getCenterPoint(), now = o.getCenterPoint();
      a.cx += mmOf(now.x - was.x); a.cy += mmOf(now.y - was.y);
      a.pos = ((((a.pos + (o.angle || 0)) + 180) % 360) + 360) % 360 - 180;
      if (scaled) a.size = r1(Math.max(4, a.size * sx));
      PC.swap(o, PC.buildArc(a), { keepCentre: false }); reflow(); showProps(); return;
    }
    else if (k === 'shape' && scaled) { const sh = o.shape; PC.swap(o, PC.buildShape({ ...sh, w: sh.w * sx, h: sh.type === 'line' ? sh.h : sh.h * sy })); reflow(); return; }
    reflow();
    PC.changed(); showProps();
  });
  ['selection:created', 'selection:updated', 'selection:cleared'].forEach((ev) => canvas.on(ev, showProps));
  canvas.on('text:changed', () => { PC.changed(); syncTextArea(); });
  canvas.on('mouse:dblclick', (e) => {
    const k = kindOf(e.target);
    if (k === 'title') focusLater('p-title-text');
    if (k === 'art') focusLater('p-story');
    if (k === 'cal') focusLater('p-cal-day');
    if (k === 'shape') focusLater('p-shape-text');
    if (k === 'arc') editArcWords(e.target);
  });
  const focusLater = (id) => setTimeout(() => { const el = $(id); if (el) { $('app').querySelector('.work').classList.add('show-right'); el.focus(); } }, 50);
  function reflow() { if (canvas.getObjects().some((o) => o.kind === 'art')) { PC.flow(canvas, PC.cur); canvas.requestRenderAll(); } }

  // ------------------------------------------------------------------ inserting things
  const centreOf = () => ({ x: px(panel().w) / 2, y: px(panel().h) / 2 });
  function place(o, at) { const c = at || centreOf(); o.setPositionByOrigin(new fabric.Point(c.x, c.y), 'center', 'center'); canvas.add(o); canvas.setActiveObject(o); o.setCoords(); canvas.requestRenderAll(); reflow(); }
  const scaleK = () => Math.min(panel().w, panel().h) / 140; // sizes are tuned for a card-sized panel
  function fitTitle(t, maxW, maxH) {
    let g = PC.buildTitle(t);
    const k = Math.min(1, maxW / g.width, maxH ? maxH / g.height : 1);
    if (k < 1) g = PC.buildTitle({ ...t, size: r1(t.size * k * 0.98) });
    return g;
  }
  PC.ui = {};
  const ins = (PC.ui.ins = {
    title(o = {}) { place(fitTitle(PC.defaultTitle({ size: Math.round(36 * scaleK()), ...o }), px(panel().w) * 0.9)); },
    text(text = 'Type your words here', o = {}) {
      const t = new fabric.IText(text, { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(Math.max(10, Math.round(14 * scaleK()))), fill: '#222222', textAlign: 'center', lineHeight: 1.2, kind: 'text', wrap: true, ...o });
      place(t);
    },
    async clip(id, o = {}) {
      const g = await PC.buildClip({ id, mode: 'color' });
      const s = px(Math.min(panel().w, panel().h) * (o.size || 0.38)) / Math.max(g.width, g.height);
      g.set({ scaleX: s, scaleY: s });
      place(g, o.at);
      return g;
    },
    async border(style, o = {}) {
      const old = canvas.getObjects().find((x) => x.kind === 'border');
      const prev = old ? old.border : {};
      const size = o.size || prev.size || Math.max(4, Math.min(9, Math.min(panel().w, panel().h) * 0.04));
      const g = await PC.buildBorder({ style, size, color: o.color || prev.color || (/(flowers|confetti)/.test(style) ? '#222222' : '#222222'), inset: o.inset ?? prev.inset ?? 4 }, panel());
      quietly(() => { if (old) canvas.remove(old); canvas.insertAt(g, 0); });
      canvas.setActiveObject(g); canvas.requestRenderAll(); PC.changed(); showProps();
      return g;
    },
    async magic(m) {
      const s = Math.min(panel().w, panel().h) * 0.6;
      const g = await PC.buildMagic({ seed: 1, style: 'kaleido', palette: 'Rainbow', sym: 8, weight: 1, ...m, w: s, h: s });
      place(g); return g;
    },
    shape(type) {
      const s = Math.min(panel().w, panel().h) * 0.3, wide = ['rect', 'rounded', 'arrow'].includes(type);
      place(PC.buildShape({ type, w: type === 'line' ? s * 1.6 : wide ? s * 1.4 : s, h: type === 'line' ? 0 : wide ? s * 0.8 : s, fill: type === 'line' ? null : '#f5c518', stroke: '#222222', sw: 0.8, round: type === 'rounded' ? 30 : 0 }));
    },
    // Curved text: bends the selected plain text (or adds new words) around a circle.
    async curve(dir = 'up') {
      const o = active(), k = kindOf(o), p = panel();
      if (k === 'arc') return void rebuildArc(o, { dir, pos: dir === 'down' ? 180 : 0 });
      let words = null;
      if (k !== 'text') { const r = await curveDialog({ text: '', dir }); if (!r) return; words = r.text; dir = r.dir; }
      let m = { text: words || 'CURVED TEXT', font: 'Bungee', size: Math.round(20 * scaleK()), bold: false, italic: false, fill: '#c2185b', spacing: 60, cx: p.w / 2, cy: p.h / 2 };
      if (k === 'text') {
        if (o.isEditing) o.exitEditing();
        const c = o.getCenterPoint();
        m = { text: o.text.replace(/\n+/g, ' '), font: unfam(o.fontFamily), size: r1(pxPt(o.fontSize * (o.scaleY || 1))), bold: o.fontWeight === 'bold', italic: o.fontStyle === 'italic', fill: typeof o.fill === 'string' ? o.fill : '#222222', spacing: o.charSpacing || 0, cx: mmOf(c.x), cy: mmOf(c.y) };
      }
      m = { ...m, dir, pos: dir === 'down' ? 180 : 0, span: 0, r: Math.max(m.size * 0.35, Math.min(p.w, p.h) * 0.3) };
      const g = PC.buildArc(m);
      if (k === 'text') PC.swap(o, g, { keepCentre: false }); else { canvas.add(g); canvas.setActiveObject(g); canvas.requestRenderAll(); reflow(); }
      showProps();
    },
    textbox(o = {}) {
      const w = Math.min(90, panel().w * 0.6);
      place(PC.buildShape(PC.defaultTextBox({ w, h: w * 0.5, size: Math.max(9, Math.round(12 * scaleK())), ...o })));
      setTimeout(() => focusLater('p-shape-text'), 50);
    },
    calendar(o = {}) {
      const p = panel(), m = 10, now = new Date();
      place(PC.buildCalendar({ year: now.getFullYear(), month: now.getMonth(), start: 0, w: p.w - 2 * m, h: p.h - 2 * m, font: 'Fredoka', titleFont: 'Lobster', notes: {}, ...o }));
    },
    article(text = PC.SAMPLE[0], o = {}) {
      const p = panel(), sid = PC.newStory(text);
      const f = PC.newFrame(sid, o.w || p.w - 25.4, o.h || Math.min(110, p.h * 0.4), o.cols || (p.w > 150 ? 3 : 2));
      if (o.at) { f.set({ left: px(o.at[0]), top: px(o.at[1]) }); canvas.add(f); canvas.setActiveObject(f); reflow(); } else place(f);
      return f;
    },
    table(o = {}) {
      const w = Math.min(180, panel().w - 20);
      place(PC.buildTable(PC.defaultTable({ w, ...o })));
    },
    tabs(o = {}) {
      const p = panel(), w = p.w - 20, h = Math.min(45, p.h * 0.18);
      const g = PC.buildTabs({ text: 'Call (555) 010-0199', count: 8, font: 'Oswald', size: 10, color: '#222222', w, h, ...o });
      place(g, { x: px(p.w / 2), y: px(p.h - 10 - h / 2) });
    },
    address(text) {
      const list = PC.addressList ? PC.addressList() : [];
      const t = new fabric.IText(text || list[0] || 'Name\nStreet\nTown, State ZIP', { fontFamily: fam('Arial'), fontSize: ptPx(Math.max(7, Math.min(11, panel().h * 0.3))), fill: '#222222', lineHeight: 1.1, kind: 'text', merge: true, wrap: true });
      place(t);
    },
    image(file) {
      const r = new FileReader();
      r.onload = () => fabric.Image.fromURL(r.result, (img) => {
        const s = px(Math.min(panel().w, panel().h) * 0.5) / Math.max(img.width, img.height);
        img.set({ scaleX: s, scaleY: s, kind: 'image', wrap: true });
        place(img);
      });
      r.readAsDataURL(file);
    },
  });
  const quietly = PC.quietly;
  $('image-input').onchange = (e) => { const files = [...e.target.files]; e.target.value = ''; files.forEach((f, k) => setTimeout(() => ins.image(f), k * 120)); };

  // Continue a newspaper story in a new frame (this page or the next).
  async function continueStory(where) {
    const o = active(); if (!o || o.kind !== 'art') return;
    const sid = o.art.story, w = mmOf(o.width * o.scaleX), h = Math.min(mmOf(o.height * o.scaleY), 90), cols = o.art.cols;
    if (where === 'next') {
      if (PC.cur >= PC.doc.panels.length - 1) { if (PC.doc.kind !== 'newsletter') return toast('There is no next page.'); addPage(false); }
      await goPanel(PC.cur + 1);
      const f = PC.newFrame(sid, w, h, cols); f.set({ left: px(12.7), top: px(20) }); canvas.add(f); canvas.setActiveObject(f); reflow(); PC.changed();
      toast(`The story continues on ${panel().name}.`);
    } else {
      const f = PC.newFrame(sid, w, h, cols); place(f); PC.changed();
    }
  }

  // Picture layouts, like Print Shop: one big, a row, tiled, staggered or in the corners.
  function layout(kind) {
    const o = active(); if (!o || o.type === 'activeSelection') return toast('Select one picture first.');
    const W = px(panel().w), H = px(panel().h), m = px(10);
    const spots = [];
    let size;
    if (kind === 'big') { size = Math.min(W, H) * 0.6; spots.push([W / 2, H / 2]); }
    else if (kind === 'row') { size = (W - 2 * m) / 3.4; [1, 3, 5].forEach((i) => spots.push([m + ((W - 2 * m) * i) / 6, H / 2])); }
    else if (kind === 'corners') { size = Math.min(W, H) * 0.2; [[m, m], [W - m, m], [m, H - m], [W - m, H - m]].forEach(([x, y]) => spots.push([x + (x < W / 2 ? size / 2 : -size / 2), y + (y < H / 2 ? size / 2 : -size / 2)])); }
    else { const n = 4, cw = (W - 2 * m) / n, rows = Math.max(2, Math.round((H - 2 * m) / cw)); size = cw * 0.72; for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) { if (kind === 'stagger' && (r + c) % 2) continue; spots.push([m + cw * (c + 0.5), m + ((H - 2 * m) / rows) * (r + 0.5)]); } }
    const base = Math.max(o.width, o.height), k = size / base;
    o.clone((tmpl) => {
      quietly(() => {
        canvas.remove(o);
        spots.forEach(([x, y]) => tmpl.clone((c) => { c.set({ scaleX: k * (o.flipX ? 1 : 1), scaleY: k, angle: 0 }); c.setPositionByOrigin(new fabric.Point(x, y), 'center', 'center'); canvas.add(c); c.setCoords(); }, PROPS));
      });
      setTimeout(() => { canvas.discardActiveObject(); canvas.requestRenderAll(); reflow(); PC.changed(); showProps(); toast(`${spots.length} copies placed.`); }, 60);
    }, PROPS);
  }

  // ------------------------------------------------------------------ editing
  let clipboard = null;
  function copy(cb) { const o = active(); if (!o) return; o.clone((c) => { clipboard = c; cb && cb(); }, PROPS); }
  function paste() {
    if (!clipboard) return;
    clipboard.clone((c) => {
      canvas.discardActiveObject();
      c.set({ left: c.left + px(5), top: c.top + px(5), evented: true });
      if (c.type === 'activeSelection') { c.canvas = canvas; c.forEachObject((x) => canvas.add(x)); c.setCoords(); } else canvas.add(c);
      clipboard.left += px(5); clipboard.top += px(5);
      canvas.setActiveObject(c); canvas.requestRenderAll(); reflow();
    }, PROPS);
  }
  function del() {
    const o = active(); if (!o || (o.isEditing)) return;
    const list = o.type === 'activeSelection' ? o.getObjects() : [o];
    canvas.discardActiveObject(); list.forEach((x) => canvas.remove(x)); canvas.requestRenderAll(); reflow(); showProps();
  }
  const dup = () => copy(paste);
  function selectAll() { canvas.discardActiveObject(); const objs = canvas.getObjects().filter((o) => o.kind !== 'border'); if (!objs.length) return; canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas })); canvas.requestRenderAll(); }
  function order(front) { const o = active(); if (!o) return; front ? o.bringToFront() : o.sendToBack(); const b = canvas.getObjects().find((x) => x.kind === 'border'); if (b && !front) b.sendToBack(); canvas.requestRenderAll(); PC.changed(); }
  function step(up) {
    const o = active(); if (!o) return;
    if (up) o.bringForward(); else o.sendBackwards();
    const b = canvas.getObjects().find((x) => x.kind === 'border'); if (b) b.sendToBack();
    canvas.requestRenderAll(); PC.changed(); toast(up ? 'Moved up one layer.' : 'Moved down one layer.');
  }
  function centre(axis) {
    const o = active(); if (!o) return; const c = o.getCenterPoint(), W = px(panel().w), H = px(panel().h);
    o.setPositionByOrigin(new fabric.Point(axis === 'v' ? c.x : W / 2, axis === 'h' ? c.y : H / 2), 'center', 'center'); o.setCoords();
    canvas.fire('object:modified', { target: o }); canvas.requestRenderAll();
  }
  function nudge(dx, dy) { const o = active(); if (!o || o.lockMovementX) return; o.left += px(dx); o.top += px(dy); o.setCoords(); canvas.fire('object:modified', { target: o }); canvas.requestRenderAll(); }

  // Formatting from the ribbon reaches plain text, titles and newspaper stories alike.
  // ---- Word-style formatting. Plain text changes only the selected words while you type in it (otherwise all of it);
  // titles, newspaper stories, shapes with words and tables change as a whole.
  const range = (o) => (o && o.isEditing && o.selectionEnd > o.selectionStart ? [o.selectionStart, o.selectionEnd] : null);
  function styleOf(o, prop) {
    const [a, b] = range(o) || [0, o.text.length];
    if (b <= a) return o[prop];
    const v = o.getSelectionStyles(a, b, true).map((st) => st[prop]);
    return v.every((x) => x === v[0]) ? v[0] : undefined;
  }
  const syncEditing = (o) => { if (o.isEditing && o.hiddenTextarea) { o.hiddenTextarea.value = o.text; o._updateTextarea(); } };
  let lastOutline = '#222222';
  const CHAR = { font: (v) => ({ fontFamily: fam(v) }), size: (v) => ({ fontSize: ptPx(v) }), fill: (v) => ({ fill: v }), bold: (v) => ({ fontWeight: v ? 'bold' : 'normal' }),
    italic: (v) => ({ fontStyle: v ? 'italic' : 'normal' }), underline: (v) => ({ underline: !!v }), strike: (v) => ({ linethrough: !!v }), highlight: (v) => ({ textBackgroundColor: v || '' }),
    outline: (v) => (v ? { stroke: lastOutline, strokeWidth: ptPx(0.7) } : { stroke: null, strokeWidth: 0 }), outlineColor: (v) => ({ stroke: v, strokeWidth: ptPx(0.7) }) };
  const WHOLE = { align: 'textAlign', lead: 'lineHeight', spacing: 'charSpacing' };
  // Which settings each kind of item has (the rest say so instead of doing nothing).
  const MODEL = {
    arc: { get: (o) => o.arc, keys: { font: 'font', size: 'size', fill: 'fill', bold: 'bold', italic: 'italic', spacing: 'spacing' }, rebuild: (o, m) => rebuildArc(o, m) },
    title: { get: (o) => o.title, keys: { font: 'font', size: 'size', fill: 'fill', bold: 'bold', italic: 'italic', align: 'align', spacing: 'spacing', lead: 'lead' }, rebuild: (o, m) => PC.swap(o, PC.buildTitle(m)) },
    art: { get: (o) => PC.doc.stories[o.art.story], keys: { font: 'font', size: 'size', fill: 'color', bold: 'bold', italic: 'italic', align: 'align', lead: 'lead' }, rebuild: (o, m) => { Object.assign(PC.doc.stories[o.art.story], m); reflow(); PC.changed(); showProps(); } },
    shape: { get: (o) => o.shape, keys: { font: 'font', size: 'size', fill: 'color', bold: 'bold', italic: 'italic', underline: 'underline', align: 'align', lead: 'lead', spacing: 'spacing' }, rebuild: (o, m) => { PC.swap(o, PC.buildShape(m)); reflow(); } },
    tb: { get: (o) => o.tb, keys: { font: 'font', size: 'size', fill: 'color' }, rebuild: (o, m) => PC.swap(o, PC.buildTable(m), { keepCentre: false }) },
  };
  function format(patch) {
    const o = active(), k = kindOf(o);
    if (!o) return toast('Click some text, a title, a story, a shape or a table first.');
    if (patch.font) PC.loadFonts([patch.font]).then(() => { if (k === 'text') { o.initDimensions(); canvas.requestRenderAll(); } });
    if (k === 'text') {
      const style = {};
      Object.entries(patch).forEach(([key, v]) => { if (CHAR[key]) Object.assign(style, CHAR[key](v)); });
      if (Object.keys(style).length) {
        const r = range(o);
        if (r) o.setSelectionStyles(style, r[0], r[1]); else { Object.keys(style).forEach((x) => o.removeStyle(x)); o.set(style); }
        if (style.stroke) o.set('paintFirst', 'stroke');
      }
      Object.entries(WHOLE).forEach(([key, f]) => { if (patch[key] !== undefined) o.set(f, patch[key]); });
      if (patch.shadow !== undefined) o.set('shadow', patch.shadow ? PC.shadowOf({}) : null);
      o.initDimensions(); o.dirty = true; o.setCoords(); canvas.requestRenderAll(); reflow(); PC.changed(); showProps();
      return;
    }
    const M = MODEL[k];
    if (!M) return toast('Click some text, a title, a story, a shape or a table first.');
    const m = { ...M.get(o) }, missing = [];
    Object.entries(patch).forEach(([key, v]) => { if (M.keys[key]) m[M.keys[key]] = v; else if (key === 'shadow' && k === 'shape') m.shadow = v ? { color: 'rgba(0,0,0,0.35)', blur: 1.2, x: 0.8, y: 0.8 } : null; else if (key !== 'shadow') missing.push(key); });
    if (patch.shadow !== undefined && k !== 'shape') o.set('shadow', patch.shadow ? PC.shadowOf({}) : null);
    if (patch.outline !== undefined && k === 'title') m.effect = patch.outline ? 'outline' : 'solid';
    if (missing.length && !(missing.length === 1 && missing[0] === 'outline' && k === 'title')) toast(`That works on plain text. ${{ title: 'A title', art: 'A newspaper story', shape: 'A shape', tb: 'A table' }[k]} uses the settings on the right.`);
    M.rebuild(o, m);
  }
  function current(prop) {
    const o = active(), k = kindOf(o);
    if (!o) return undefined;
    if (k === 'text') {
      const fw = styleOf(o, 'fontWeight'), d = styleOf(o, 'deltaY');
      return { font: unfam(styleOf(o, 'fontFamily') || ''), size: styleOf(o, 'fontSize') ? r1(pxPt(styleOf(o, 'fontSize'))) : '', fill: styleOf(o, 'fill'), bold: fw === 'bold' || fw >= 600, italic: styleOf(o, 'fontStyle') === 'italic',
        underline: !!styleOf(o, 'underline'), strike: !!styleOf(o, 'linethrough'), highlight: styleOf(o, 'textBackgroundColor'), outline: !!styleOf(o, 'stroke') && styleOf(o, 'strokeWidth') > 0,
        shadow: !!o.shadow, align: o.textAlign, lead: o.lineHeight, spacing: o.charSpacing, sup: d != null && d < 0, sub: d != null && d > 0 }[prop];
    }
    const M = MODEL[k]; if (!M) return undefined;
    const m = M.get(o), back = Object.fromEntries(Object.entries(M.keys).map(([a, b]) => [a, m[b]]));
    return { ...back, shadow: k === 'shape' ? !!m.shadow : !!o.shadow, outline: k === 'title' && /outline/.test(m.effect) }[prop];
  }
  // Text that every kind of item keeps: the words themselves.
  const TEXT_OF = { arc: (o) => o.arc.text, title: (o) => o.title.text, art: (o) => PC.doc.stories[o.art.story].text, shape: (o) => o.shape.text || '', tb: (o) => o.tb.text };
  const SET_TEXT = { arc: (o, t) => rebuildArc(o, { text: t }), title: (o, t) => PC.swap(o, PC.buildTitle({ ...o.title, text: t })), art: (o, t) => { PC.doc.stories[o.art.story].text = t; reflow(); PC.changed(); showProps(); }, shape: (o, t) => PC.swap(o, PC.buildShape({ ...o.shape, text: t })), tb: (o, t) => PC.swap(o, PC.buildTable({ ...o.tb, text: t }), { keepCentre: false }) };
  const caseOf = (kind, t) => (kind === 'upper' ? t.toUpperCase() : kind === 'lower' ? t.toLowerCase()
    : kind === 'title' ? t.toLowerCase().replace(/(^|[\s\-/(])(\p{L})/gu, (m, a, c) => a + c.toUpperCase())
    : t.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, c) => a + c.toUpperCase()));
  function changeCase(kind) {
    const o = active(), k = kindOf(o);
    if (k === 'text') {
      const [a, b] = range(o) || [0, o.text.length], mid = o.text.slice(a, b), out = caseOf(kind, mid);
      if (out.length !== mid.length) { o.removeChars(a, b); o.insertChars(out, null, a); } else o.set('text', o.text.slice(0, a) + out + o.text.slice(b));
      if (o.isEditing) { o.selectionStart = a; o.selectionEnd = a + out.length; syncEditing(o); }
      o.initDimensions(); canvas.requestRenderAll(); PC.changed(); showProps();
    } else if (TEXT_OF[k]) SET_TEXT[k](o, caseOf(kind, TEXT_OF[k](o)));
  }
  const BULLET = /^• /, NUMBER = /^\d+\. /;
  const listState = (t) => { const lines = String(t || '').split('\n'); return lines.every((l) => BULLET.test(l)) ? 'bullets' : lines.every((l) => NUMBER.test(l)) ? 'numbers' : ''; };
  const listText = (t, kind) => { const was = listState(t); return String(t || '').split('\n').map((l, i) => { const bare = l.replace(BULLET, '').replace(NUMBER, ''); return was === kind ? bare : (kind === 'bullets' ? '• ' : `${i + 1}. `) + bare; }).join('\n'); };
  function toggleList(kind) {
    const o = active(), k = kindOf(o);
    if (k === 'text') {
      const lines = o.text.split('\n'), was = listState(o.text), starts = []; let pos = 0;
      lines.forEach((l) => { starts.push(pos); pos += l.length + 1; });
      for (let i = lines.length - 1; i >= 0; i--) {
        const m = lines[i].match(BULLET) || lines[i].match(NUMBER);
        if (m) o.removeChars(starts[i], starts[i] + m[0].length);
        if (was !== kind) o.insertChars(kind === 'bullets' ? '• ' : `${i + 1}. `, null, starts[i]);
      }
      if (o.isEditing) { o.selectionStart = o.selectionEnd = o.text.length; syncEditing(o); }
      o.initDimensions(); canvas.requestRenderAll(); PC.changed(); showProps();
    } else if (TEXT_OF[k] && k !== 'tb') SET_TEXT[k](o, listText(TEXT_OF[k](o), kind));
  }
  function setScript(dir) {
    const o = active(); if (kindOf(o) !== 'text') return toast('Superscript and subscript work on plain text.');
    const [a, b] = range(o) || [0, o.text.length], on = dir < 0 ? current('sup') : current('sub');
    if (on) o.setSelectionStyles({ deltaY: 0, fontSize: o.fontSize }, a, b); else if (dir < 0) o.setSuperscript(a, b); else o.setSubscript(a, b);
    o.initDimensions(); o.dirty = true; canvas.requestRenderAll(); PC.changed();
  }
  function clearFormat() {
    const o = active(), k = kindOf(o);
    if (k === 'text') {
      const base = { fontWeight: 'normal', fontStyle: 'normal', underline: false, linethrough: false, fill: '#222222', textBackgroundColor: '', stroke: null, strokeWidth: 0, deltaY: 0 }, r = range(o);
      if (r) o.removeStyleFromTo(r[0], r[1]); else { Object.keys(base).forEach((x) => o.removeStyle(x)); o.set({ ...base, shadow: null }); }
      o.initDimensions(); o.dirty = true; canvas.requestRenderAll(); PC.changed(); showProps();
    } else format({ bold: false, italic: false, underline: false, fill: '#222222' });
  }
  const SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 144, 200];
  function stepSize(dir) {
    const cur = +current('size') || 12;
    format({ size: dir > 0 ? SIZES.find((x) => x > cur + 0.01) || Math.round(cur * 1.2) : [...SIZES].reverse().find((x) => x < cur - 0.01) || Math.max(4, cur / 1.2) });
  }
  function insertText(str) {
    const o = active(), k = kindOf(o);
    if (k === 'text') {
      if (o.isEditing) { const a = o.selectionStart; if (o.selectionEnd > a) o.removeChars(a, o.selectionEnd); o.insertChars(str, null, a); o.selectionStart = o.selectionEnd = a + str.length; syncEditing(o); }
      else o.insertChars((o.text && !/\s$/.test(o.text) ? ' ' : '') + str, null, o.text.length);
      o.initDimensions(); canvas.requestRenderAll(); PC.changed();
    } else if (TEXT_OF[k]) SET_TEXT[k](o, TEXT_OF[k](o) + (/\s$/.test(TEXT_OF[k](o)) ? '' : ' ') + str);
    else ins.text(str);
  }
  function textToBox() {
    const o = active();
    if (kindOf(o) !== 'text') return toast('Click some plain text first.');
    PC.swap(o, PC.buildShape(PC.defaultTextBox({ text: o.text, font: unfam(o.fontFamily), size: r1(pxPt(o.fontSize)), color: o.fill, align: o.textAlign || 'left', w: Math.max(30, mmOf(o.getScaledWidth()) + 8), h: mmOf(o.getScaledHeight()) + 8 })));
  }
  canvas.on('text:selection:changed', () => { syncFontBox(); });
  PC.ui.format = format; PC.ui.current = current;

  // ------------------------------------------------------------------ pages panel
  const thumbs = {};
  let thumbT = null;
  async function thumb(i) {
    const c = await PC.renderPanel(i, Math.max(8, Math.min(20, 2400 / Math.max(PC.doc.panels[i].w, PC.doc.panels[i].h))), { retro: false });
    thumbs[i] = c.toDataURL('image/png');
    const img = document.querySelector(`.page-btn[data-i="${i}"] img`); if (img) img.src = thumbs[i];
  }
  function renderPages() {
    const d = PC.doc;
    $('pages').innerHTML = d.panels.map((p, i) => `<button class="page-btn" data-i="${i}" aria-current="${i === PC.cur}" title="Show ${esc(p.name)}"><img alt="" src="${thumbs[i] || ''}"><span>${esc(p.name)}</span></button>`).join('');
    let tools = '';
    if (d.kind === 'newsletter') tools = `<button class="btn outline" id="pg-add">Add a page</button><button class="btn outline" id="pg-del" ${d.panels.length < 2 ? 'disabled' : ''}>Delete this page</button>`;
    if (d.kind === 'card') tools = `<p class="hint">${d.fold === 'half' ? 'Half-fold card: prints on both sides of one sheet.' : 'Quarter-fold card: one sheet, printed on one side, folded twice.'} PressCraft turns each panel the right way for folding.</p>`;
    if (d.kind === 'banner') tools = `<label class="field"><span>Banner length</span><select class="input" id="pg-len">${[2, 3, 4, 5, 6, 8, 10, 12].map((n) => `<option value="${n}" ${n === d.bannerPages ? 'selected' : ''}>${n} pages (${(n * (PC.PAPER[d.paper][1] - 12.7) / 304.8).toFixed(1)} ft)</option>`).join('')}</select></label>`;
    $('pages-tools').innerHTML = tools;
    if ($('pg-add')) $('pg-add').onclick = () => addPage(true);
    if ($('pg-del')) $('pg-del').onclick = delPage;
    if ($('pg-len')) $('pg-len').onchange = () => setBannerPages(+$('pg-len').value);
  }
  $('pages').onclick = (e) => { const b = e.target.closest('.page-btn'); if (b) goPanel(+b.dataset.i); };
  async function goPanel(i) {
    if (i === PC.cur && canvas.getObjects().length) return;
    PC.saveLive(); thumb(PC.cur);
    await PC.loadPanel(i);
  }
  function addPage(go) {
    const [pw, ph] = PC.PAPER[PC.doc.paper];
    PC.saveLive();
    PC.doc.panels.push({ name: `Page ${PC.doc.panels.length + 1}`, w: pw, h: ph, bg: '#ffffff', json: null });
    PC.doc.pages = PC.doc.panels.length;
    renderPages(); PC.changed();
    if (go) goPanel(PC.doc.panels.length - 1);
  }
  async function delPage() {
    if (PC.doc.panels.length < 2) return;
    if (!(await ask('Delete this page?', `${panel().name} and everything on it will be removed. You can undo this.`, 'Delete'))) return;
    PC.doc.panels.splice(PC.cur, 1);
    PC.doc.panels.forEach((p, i) => { p.name = `Page ${i + 1}`; });
    Object.keys(thumbs).forEach((k) => delete thumbs[k]);
    await PC.loadPanel(Math.max(0, PC.cur - 1));
    PC.doc.panels.forEach((_, i) => thumb(i));
    PC.changed();
  }
  async function setBannerPages(n) {
    PC.saveLive();
    const d = PC.doc, p = d.panels[0], oldW = p.w;
    d.bannerPages = n; p.w = PC.panelsFor(d)[0].w;
    await PC.loadPanel(0);
    const dx = px(p.w - oldW) / 2;
    canvas.getObjects().forEach((o) => { if (o.kind === 'border') return; o.left += dx; o.setCoords(); });
    const b = canvas.getObjects().find((o) => o.kind === 'border'); if (b) await ins.border(b.border.style);
    fitZoom(); PC.changed(); renderPages(); thumb(0);
  }

  // ------------------------------------------------------------------ library panel
  document.querySelectorAll('.tab').forEach((t) => { t.onclick = () => showTab(t.dataset.tab); });
  function showTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    ['pages', 'art', 'borders', 'magic'].forEach((n) => { $('tab-' + n).hidden = n !== name; });
    $('app').querySelector('.work').classList.add('show-left');
  }
  PC.ui.showTab = showTab;
  const svgUrl = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const cats = [...new Set(A.ART.map((a) => a[2]))];
  $('art-cat').innerHTML = '<option value="">All pictures</option>' + cats.map((c) => `<option>${c}</option>`).join('');
  function renderArt() {
    const q = $('art-search').value.trim().toLowerCase(), c = $('art-cat').value;
    const list = A.ART.filter(([id, name, cat]) => (!c || cat === c) && (!q || (name + ' ' + cat + ' ' + id).toLowerCase().includes(q)));
    $('art-grid').innerHTML = list.map(([id, name]) => `<button data-art="${id}" title="${esc(name)}"><img alt="${esc(name)}" src="${svgUrl(A.ART_BY_ID[id].svg)}"></button>`).join('') || '<p class="hint">Nothing found.</p>';
  }
  $('art-search').oninput = renderArt; $('art-cat').onchange = renderArt;
  $('art-grid').onclick = (e) => { const b = e.target.closest('[data-art]'); if (b && PC.doc) ins.clip(b.dataset.art); };
  $('border-grid').innerHTML = A.BORDERS.map(([id, name]) => `<button data-border="${id}" title="${esc(name)}"><img alt="" src="${svgUrl(A.borderSvg(id, 156, 200, 14, '#222222', 4))}"><span>${esc(name)}</span></button>`).join('')
    + `<button data-border="" title="No border"><span style="font-size:13px">No border</span></button>`;
  $('border-grid').onclick = (e) => {
    const b = e.target.closest('[data-border]'); if (!b || !PC.doc) return;
    if (!b.dataset.border) { const old = canvas.getObjects().find((x) => x.kind === 'border'); if (old) { canvas.remove(old); canvas.requestRenderAll(); } return; }
    ins.border(b.dataset.border);
  };
  let magic = { seed: Math.floor(Math.random() * 1e9), style: 'kaleido', palette: 'Rainbow', sym: 8, weight: 1 };
  $('mg-style').innerHTML = A.MAGIC_STYLES.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  $('mg-pal').innerHTML = Object.keys(A.PALETTES).map((n) => `<option>${n}</option>`).join('');
  function drawMagic() { $('magic-prev').innerHTML = A.magicSvg(magic, 300, 300); $('mg-sym-v').textContent = magic.sym; $('mg-style').value = magic.style; $('mg-pal').value = magic.palette; $('mg-sym').value = magic.sym; }
  $('mg-style').onchange = () => { magic.style = $('mg-style').value; drawMagic(); };
  $('mg-pal').onchange = () => { magic.palette = $('mg-pal').value; drawMagic(); };
  $('mg-sym').oninput = () => { magic.sym = +$('mg-sym').value; drawMagic(); };
  $('mg-shake').onclick = () => { magic.seed = Math.floor(Math.random() * 1e9); drawMagic(); };
  $('mg-add').onclick = () => { if (PC.doc) ins.magic({ ...magic }); };

  // ------------------------------------------------------------------ properties panel (built from a short description)
  let bind = [];
  function field(f) {
    const id = f.id || 'f' + Math.random().toString(36).slice(2, 8);
    f._id = id; bind.push(f);
    const lab = (inner) => `<label class="field"><span>${f.label}</span>${inner}</label>`;
    switch (f.t) {
      case 'text': return lab(`<input class="input" id="${id}" value="${esc(f.value)}">`);
      case 'area': return lab(`<textarea class="input" id="${id}" rows="${f.rows || 3}">${esc(f.value)}</textarea>`);
      case 'num': return lab(`<input class="input" type="number" id="${id}" value="${f.value ?? ''}" step="${f.step || 1}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}>`);
      case 'color': return lab(`<input class="input" type="color" id="${id}" value="${/^#[0-9a-f]{6}$/i.test(f.value || '') ? f.value : '#222222'}">`);
      case 'select': return lab(`<select class="input" id="${id}">${f.options.map(([v, n]) => `<option value="${esc(v)}" ${String(v) === String(f.value) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`);
      case 'font': return lab(`<select class="input" id="${id}">${FONTS.map((n) => `<option ${n === f.value ? 'selected' : ''} style="font-family:${fam(n)}">${n}</option>`).join('')}</select>`);
      case 'range': return `<label class="field"><span>${f.label}: <b id="${id}-v">${f.show ? f.show(f.value) : f.value}</b></span><input type="range" id="${id}" min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${f.value}"></label>`;
      case 'check': return `<label class="check"><input type="checkbox" id="${id}" ${f.value ? 'checked' : ''}> ${f.label}</label>`;
      case 'seg': return (f.label ? `<span class="hint">${f.label}</span>` : '') + `<div class="seg" role="group">${f.buttons.map((b, i) => `<button class="btn" id="${id}-${i}" aria-pressed="${!!b.pressed}" title="${esc(b.title || b.label)}">${b.label}</button>`).join('')}</div>`;
      case 'btns': return `<div class="row">${f.buttons.map((b, i) => `<button class="btn ${b.cls || 'outline'}" id="${id}-${i}" title="${esc(b.title || '')}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`).join('')}</div>`;
      case 'row': { const parts = f.items.map(field).join(''); return `<div class="row">${parts}</div>`; }
      case 'note': return `<p class="${f.cls || 'hint'}" ${f.id ? `id="${f.id}"` : ''}>${f.html}</p>`;
      default: return '';
    }
  }
  function render(title, sections) {
    bind = [];
    const html = `<div class="props-head">${esc(title)}</div>` + sections.filter(Boolean).map((s) => `<div class="sec">${s.title ? `<h3>${s.title}</h3>` : ''}${s.items.filter(Boolean).map(field).join('')}</div>`).join('');
    const keepFocus = document.activeElement && $('props').contains(document.activeElement) ? document.activeElement.id : null;
    $('props').innerHTML = html;
    bind.forEach((f) => {
      const el = $(f._id);
      if (f.t === 'seg' || f.t === 'btns') return f.buttons.forEach((b, i) => { const e = $(`${f._id}-${i}`); if (e) e.onclick = b.on; });
      if (!el || !f.on) return;
      if (f.t === 'check') el.onchange = () => f.on(el.checked);
      else if (f.t === 'range') { el.oninput = () => { $(f._id + '-v').textContent = f.show ? f.show(+el.value) : el.value; f.live && f.on(+el.value, true); }; el.onchange = () => f.on(+el.value, false); }
      else if (f.t === 'num') el.onchange = () => f.on(el.value === '' ? null : +el.value);
      else if (f.t === 'text' || f.t === 'area') { if (f.live) el.oninput = () => f.on(el.value, true); el.onchange = () => f.on(el.value, false); }
      else if (f.t === 'color') { el.oninput = () => f.on(el.value, true); el.onchange = () => f.on(el.value, false); }
      else el.onchange = () => f.on(el.value);
    });
    if (keepFocus && $(keepFocus)) { const el = $(keepFocus); el.focus(); if (el.setSelectionRange && el.value) try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
  }
  function syncTextArea() { const o = active(), el = $('p-text-content'); if (o && el && document.activeElement !== el) el.value = o.text; }

  const posSection = (o, noSize) => {
    const r = o.getBoundingRect(true, true);
    return { title: 'Position and size (mm)', items: [
      { t: 'row', items: [{ t: 'num', label: 'Left', value: r1(mmOf(r.left)), step: 0.5, on: (v) => { o.left += px(v) - r.left; o.setCoords(); canvas.fire('object:modified', { target: o }); canvas.requestRenderAll(); } },
        { t: 'num', label: 'Top', value: r1(mmOf(r.top)), step: 0.5, on: (v) => { o.top += px(v) - r.top; o.setCoords(); canvas.fire('object:modified', { target: o }); canvas.requestRenderAll(); } }] },
      noSize ? null : { t: 'row', items: [{ t: 'num', label: 'Width', value: r1(mmOf(o.getScaledWidth())), step: 0.5, min: 1, on: (v) => { const k = px(v) / o.getScaledWidth(); o.set({ scaleX: o.scaleX * k, scaleY: o.scaleY * (o.kind === 'clip' || o.type === 'image' ? k : 1) }); o.setCoords(); canvas.fire('object:modified', { target: o }); canvas.requestRenderAll(); } },
        { t: 'num', label: 'Height', value: r1(mmOf(o.getScaledHeight())), step: 0.5, min: 1, on: (v) => { const k = px(v) / o.getScaledHeight(); o.set({ scaleY: o.scaleY * k, scaleX: o.scaleX * (o.kind === 'clip' || o.type === 'image' ? k : 1) }); o.setCoords(); canvas.fire('object:modified', { target: o }); canvas.requestRenderAll(); } }] },
      opacityItem(o),
      o.lockRotation ? null : { t: 'num', label: 'Angle (°)', value: Math.round(o.angle || 0), on: (v) => { o.rotate(((v || 0) % 360 + 360) % 360); o.setCoords(); canvas.fire('object:modified', { target: o }); canvas.requestRenderAll(); } },
    ] };
  };
  // How solid an object is: 100% is solid, lower lets what is behind show through.
  const opacityItem = (o) => ({ t: 'range', label: 'Opacity (lower to see through)', value: Math.round((o.opacity ?? 1) * 100), min: 0, max: 100, step: 1, show: (v) => `${v}%`, live: true,
    on: (v, live) => { o.set('opacity', v / 100); canvas.requestRenderAll(); if (!live) PC.changed(); } });
  // A drop shadow for any object (shapes and text boxes have their own, inside the shape).
  const shadowSection = (o) => ({ title: 'Drop shadow', items: [
    { t: 'check', label: 'Drop shadow', value: !!o.shadow, on: (v) => { o.set('shadow', v ? PC.shadowOf({}) : null); canvas.requestRenderAll(); PC.changed(); showProps(); } },
    o.shadow ? { t: 'row', items: [
      { t: 'range', label: 'Softness', value: r1(mmOf(o.shadow.blur || 0)), min: 0, max: 6, step: 0.1, show: (v) => v + ' mm', on: (v) => { o.shadow.blur = px(v); o.dirty = true; canvas.requestRenderAll(); PC.changed(); } },
      { t: 'range', label: 'Distance', value: r1(mmOf(o.shadow.offsetX || 0)), min: 0, max: 5, step: 0.1, show: (v) => v + ' mm', on: (v) => { o.shadow.offsetX = o.shadow.offsetY = px(v); o.dirty = true; canvas.requestRenderAll(); PC.changed(); } }] } : null,
    o.shadow ? { t: 'color', label: 'Shadow colour', value: /^#[0-9a-f]{6}/i.test(o.shadow.color || '') ? o.shadow.color.slice(0, 7) : '#000000', on: (v, live) => { if (!live) { o.shadow.color = v + '59'; o.dirty = true; canvas.requestRenderAll(); PC.changed(); } } } : null,
  ] });
  const wrapItem = (o) => ({ t: 'check', label: 'Newspaper text flows around this', value: !!o.wrap, on: (v) => { o.wrap = v; reflow(); PC.changed(); } });
  const arrangeSection = () => ({ title: 'Arrange', items: [
    { t: 'btns', buttons: [{ label: 'Bring forward', title: 'One layer up', on: () => step(true) }, { label: 'Send backward', title: 'One layer down (for example just behind a calendar)', on: () => step(false) }] },
    { t: 'btns', buttons: [{ label: 'Bring to front', on: () => order(true) }, { label: 'Send to back', on: () => order(false) }] },
    { t: 'btns', buttons: [{ label: 'Centre across', on: () => centre('h') }, { label: 'Centre up/down', on: () => centre('v') }] },
    { t: 'btns', buttons: [{ label: 'Duplicate', on: dup }, { label: 'Delete', cls: 'outline danger', on: del }] },
  ] });
  // Type the words for curved text in a small window, then OK (like WordArt): the curve is built once, not on every letter.
  function curveDialog({ text = '', dir = 'up', title = 'Curved text' } = {}) {
    return new Promise((res) => {
      const bd = document.createElement('div'); bd.className = 'backdrop';
      bd.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="cd-title"><h2 id="cd-title">${esc(title)}</h2><div class="dialog-body">
        <label class="field"><span>Words</span><input class="input" id="cd-text" value="${esc(text)}" autocomplete="off"></label>
        <div class="field"><span>Curve</span><div class="seg"><button class="btn" data-d="up" aria-pressed="${dir !== 'down'}">◠ Curve up (along the top)</button><button class="btn" data-d="down" aria-pressed="${dir === 'down'}">◡ Curve down (along the bottom)</button></div></div></div>
        <div class="dialog-actions"><button class="btn" data-x>Cancel</button><button class="btn primary" data-ok>OK</button></div></div>`;
      document.body.append(bd);
      let d = dir;
      const input = bd.querySelector('#cd-text');
      const done = (v) => { bd.remove(); res(v); };
      bd.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { d = b.dataset.d; bd.querySelectorAll('[data-d]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; });
      bd.querySelector('[data-x]').onclick = () => done(null);
      bd.querySelector('[data-ok]').onclick = () => done(input.value.trim() ? { text: input.value.trim(), dir: d } : null);
      bd.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(null); if (e.key === 'Enter') bd.querySelector('[data-ok]').click(); });
      input.focus(); input.select();
    });
  }
  async function editArcWords(o) {
    const r = await curveDialog({ text: o.arc.text, dir: o.arc.dir, title: 'Edit curved text' });
    if (r) rebuildArc(o, { text: r.text, dir: r.dir, pos: r.dir === o.arc.dir ? o.arc.pos : r.dir === 'down' ? 180 : 0 });
  }
  function rebuildArc(o, patch, live) {
    return PC.loadFonts([patch.font]).then(() => {
      if (!canvas.getObjects().includes(o)) { if (!isKind('arc')) return; o = active(); } // the panel may still hold the copy that was just replaced
      const n = PC.buildArc({ ...o.arc, ...patch }); if (o.shadow) n.set('shadow', o.shadow); PC.swap(o, n, { keepCentre: false }); if (!live) showProps(); });
  }
  function straighten(o) {
    const a = o.arc, c = o.getCenterPoint();
    const t = new fabric.IText(a.text, { fontFamily: fam(a.font), fontSize: ptPx(a.size), fontWeight: a.bold ? 'bold' : 'normal', fontStyle: a.italic ? 'italic' : 'normal', fill: a.fill, charSpacing: a.spacing || 0, kind: 'text', wrap: true, textAlign: 'center' });
    t.setPositionByOrigin(c, 'center', 'center');
    PC.swap(o, t, { keepCentre: false });
  }
  const rebuildTitle = (o, patch) => PC.loadFonts([patch.font]).then(() => PC.swap(o, PC.buildTitle({ ...o.title, ...patch })));

  function showProps() {
    if (!PC.doc) return;
    const o = active(), k = kindOf(o);
    if (!o) return pageProps();
    if (o.type === 'activeSelection') return render(`${o.size()} items`, [arrangeSection()]);
    if (k === 'text') {
      return render(o.merge ? 'Address block' : o.type === 'textbox' ? 'Text box' : 'Text', [
        o.merge ? { title: 'Mail merge', items: [{ t: 'note', html: 'When you print, each label gets the next address from the address list. Click an empty part of the label to edit the list.' }, { t: 'check', label: 'Fill this with the addresses', value: true, on: (v) => { o.merge = v; PC.changed(); showProps(); } }] } : null,
        { title: 'Text', items: [
          { t: 'area', id: 'p-text-content', label: 'Words', value: o.text, rows: 3, live: true, on: (v) => { o.set('text', v || ' '); o.initDimensions(); o.setCoords(); canvas.requestRenderAll(); PC.changed(); } },
          { t: 'font', label: 'Font', value: unfam(o.fontFamily), on: (v) => format({ font: v }) },
          { t: 'row', items: [{ t: 'num', label: 'Size (pt)', value: r1(pxPt(o.fontSize)), step: 1, min: 4, on: (v) => format({ size: Math.max(4, v || 12) }) }, { t: 'color', label: 'Colour', value: o.fill, on: (v) => format({ fill: v }) }] },
          { t: 'seg', buttons: [{ label: '<b>B</b>', title: 'Bold', pressed: o.fontWeight === 'bold', on: () => format({ bold: o.fontWeight !== 'bold' }) }, { label: '<i>I</i>', title: 'Italic', pressed: o.fontStyle === 'italic', on: () => format({ italic: o.fontStyle !== 'italic' }) }, { label: '<u>U</u>', title: 'Underline', pressed: !!o.underline, on: () => format({ underline: !o.underline }) },
            { label: 'Left', pressed: o.textAlign === 'left', on: () => format({ align: 'left' }) }, { label: 'Centre', pressed: o.textAlign === 'center', on: () => format({ align: 'center' }) }, { label: 'Right', pressed: o.textAlign === 'right', on: () => format({ align: 'right' }) }] },
          { t: 'num', label: 'Line spacing', value: o.lineHeight, step: 0.05, min: 0.6, on: (v) => { o.set('lineHeight', Math.max(0.6, v || 1.2)); o.initDimensions(); canvas.requestRenderAll(); PC.changed(); } },
          { t: 'btns', buttons: [{ label: 'Make it a text box', title: 'Put these words in a box with wrapping, a border, a background and padding', on: () => PC.swap(o, PC.buildShape(PC.defaultTextBox({ text: o.text, font: unfam(o.fontFamily), size: r1(pxPt(o.fontSize)), color: o.fill, align: o.textAlign || 'left', w: Math.max(30, mmOf(o.getScaledWidth()) + 8), h: mmOf(o.getScaledHeight()) + 8 }))) }] },
          { t: 'btns', buttons: [{ label: 'Make it a fancy title', title: 'Turn this into a title with outline, shadow or 3-D effects', on: () => PC.swap(o, PC.buildTitle(PC.defaultTitle({ text: o.text, font: unfam(o.fontFamily), size: r1(pxPt(o.fontSize)), fill: o.fill, effect: 'shadow' }))) }] },
          wrapItem(o),
        ] }, shadowSection(o), posSection(o, true), arrangeSection()]);
    }
    if (k === 'title') {
      const t = o.title;
      return render('Title', [
        { title: 'Title', items: [
          { t: 'area', id: 'p-title-text', label: 'Words (press Enter for a new line)', value: t.text, rows: 2, on: (v) => rebuildTitle(o, { text: v || ' ' }) },
          { t: 'font', label: 'Font', value: t.font, on: (v) => rebuildTitle(o, { font: v }) },
          { t: 'row', items: [{ t: 'num', label: 'Size (pt)', value: t.size, step: 2, min: 6, on: (v) => rebuildTitle(o, { size: Math.max(6, v || 36) }) }, { t: 'select', label: 'Style', value: t.effect, options: PC.TITLE_EFFECTS, on: (v) => rebuildTitle(o, { effect: v }) }] },
          { t: 'row', items: [{ t: 'color', label: 'Colour', value: t.fill, on: (v, live) => { if (!live) rebuildTitle(o, { fill: v }); } }, { t: 'color', label: 'Shadow / 3-D colour', value: t.shade, on: (v, live) => { if (!live) rebuildTitle(o, { shade: v }); } }] },
          t.effect.includes('outline') ? { t: 'color', label: 'Inside of outline', value: t.inner || '#ffffff', on: (v, live) => { if (!live) rebuildTitle(o, { inner: v }); } } : null,
          t.effect !== 'solid' && t.effect !== 'outline' ? { t: 'range', label: 'Shadow depth', value: t.depth ?? 1.2, min: 0.3, max: 6, step: 0.1, show: (v) => `${v} mm`, on: (v) => rebuildTitle(o, { depth: v }) } : null,
          { t: 'seg', buttons: [{ label: '<b>B</b>', title: 'Bold', pressed: t.bold, on: () => rebuildTitle(o, { bold: !t.bold }) }, { label: '<i>I</i>', title: 'Italic', pressed: t.italic, on: () => rebuildTitle(o, { italic: !t.italic }) },
            { label: 'Left', pressed: t.align === 'left', on: () => rebuildTitle(o, { align: 'left' }) }, { label: 'Centre', pressed: t.align === 'center', on: () => rebuildTitle(o, { align: 'center' }) }, { label: 'Right', pressed: t.align === 'right', on: () => rebuildTitle(o, { align: 'right' }) }] },
          { t: 'range', label: 'Letter spacing', value: t.spacing || 0, min: -100, max: 600, step: 10, on: (v) => rebuildTitle(o, { spacing: v }) },
          { t: 'btns', buttons: [{ label: 'Fit to page width', on: () => { const g = fitTitle({ ...t, size: t.size * 4 }, px(panel().w) * 0.9, px(panel().h) * 0.8); PC.swap(o, g); centre('h'); } }] },
          wrapItem(o),
        ] }, posSection(o, true), arrangeSection()]);
    }
    if (k === 'clip') {
      const c = o.clip, re = (patch) => PC.buildClip({ ...c, ...patch }).then((n) => { n.set({ scaleX: o.scaleX, scaleY: o.scaleY, flipX: o.flipX, flipY: o.flipY, wrap: o.wrap }); PC.swap(o, n); });
      return render(`Picture: ${A.ART_BY_ID[c.id] ? A.ART_BY_ID[c.id].name : ''}`, [
        { title: 'Picture', items: [
          { t: 'seg', label: 'Colours', buttons: [{ label: 'Colour', pressed: (c.mode || 'color') === 'color', on: () => re({ mode: 'color' }) }, { label: 'Outline', title: 'Black lines on white, like a colouring page', pressed: c.mode === 'outline', on: () => re({ mode: 'outline' }) }, { label: 'One colour', pressed: c.mode === 'mono', on: () => re({ mode: 'mono' }) }] },
          c.mode === 'mono' ? { t: 'color', label: 'Colour', value: c.tint || '#c2185b', on: (v, live) => { if (!live) re({ tint: v }); } } : null,
          { t: 'btns', buttons: [{ label: 'Flip across', on: () => { o.set('flipX', !o.flipX); canvas.requestRenderAll(); PC.changed(); } }, { label: 'Flip upside down', on: () => { o.set('flipY', !o.flipY); canvas.requestRenderAll(); PC.changed(); } }] },
          wrapItem(o),
        ] }, shadowSection(o), layoutSection(), posSection(o), arrangeSection()]);
    }
    if (k === 'border') {
      const b = o.border, re = (patch) => PC.buildBorder({ ...b, ...patch }, panel()).then((n) => { n.set('opacity', o.opacity ?? 1); quietly(() => { canvas.remove(o); canvas.insertAt(n, 0); }); canvas.setActiveObject(n); canvas.requestRenderAll(); PC.changed(); showProps(); });
      return render('Border', [{ title: 'Border', items: [
        { t: 'select', label: 'Style', value: b.style, options: A.BORDERS, on: (v) => re({ style: v }) },
        { t: 'color', label: 'Colour', value: b.color, on: (v, live) => { if (!live) re({ color: v }); } },
        { t: 'range', label: 'Thickness', value: b.size, min: 2, max: 20, step: 0.5, show: (v) => `${v} mm`, on: (v) => re({ size: v }) },
        opacityItem(o),
        { t: 'range', label: 'Distance from the edge', value: b.inset ?? 4, min: 0, max: 25, step: 0.5, show: (v) => `${v} mm`, on: (v) => re({ inset: v }) },
        { t: 'btns', buttons: [{ label: 'Remove border', cls: 'outline danger', on: () => { canvas.remove(o); canvas.requestRenderAll(); showProps(); } }, { label: 'More borders…', on: () => showTab('borders') }] },
      ] }]);
    }
    if (k === 'magic') {
      const m = o.magic, re = (patch) => PC.buildMagic({ ...m, ...patch }).then((n) => { n.set({ wrap: o.wrap }); PC.swap(o, n); });
      return render('Screen Magic', [{ title: 'Pattern', items: [
        { t: 'select', label: 'Pattern', value: m.style, options: A.MAGIC_STYLES, on: (v) => re({ style: v }) },
        { t: 'select', label: 'Colours', value: m.palette, options: Object.keys(A.PALETTES).map((n) => [n, n]), on: (v) => re({ palette: v }) },
        { t: 'range', label: 'Mirror pieces', value: m.sym, min: 3, max: 16, on: (v) => re({ sym: v }) },
        { t: 'range', label: 'Line weight', value: m.weight || 1, min: 0.3, max: 4, step: 0.1, on: (v) => re({ weight: v }) },
        { t: 'btns', buttons: [{ label: 'Shake it up', cls: 'primary', on: () => re({ seed: Math.floor(Math.random() * 1e9) }) }, { label: 'Fill the page', title: 'Use it as the page background', on: () => PC.buildMagic({ ...m, w: panel().w, h: panel().h }).then((n) => { n.set({ wrap: false, left: 0, top: 0 }); quietly(() => canvas.remove(o)); canvas.insertAt(n, 0); const b = canvas.getObjects().find((x) => x.kind === 'border'); if (b) b.sendToBack(); n.sendToBack(); canvas.setActiveObject(n); canvas.requestRenderAll(); PC.changed(); }) }] },
        wrapItem(o),
      ] }, layoutSection(), posSection(o), arrangeSection()]);
    }
    if (k === 'cal') {
      const c = o.cal, re = (patch) => PC.loadFonts([patch.font, patch.titleFont]).then(() => PC.swap(o, PC.buildCalendar({ ...c, ...patch })));
      const months = Array.from({ length: 12 }, (_, i) => [i, new Date(2024, i, 1).toLocaleDateString(undefined, { month: 'long' })]);
      const notes = Object.entries(c.notes || {}).sort((a, b) => a[0] - b[0]);
      return render('Calendar', [
        { title: 'Month', items: [
          { t: 'row', items: [{ t: 'select', label: 'Month', value: c.month, options: months, on: (v) => re({ month: +v, notes: {} }) }, { t: 'num', label: 'Year', value: c.year, min: 1900, max: 2200, on: (v) => re({ year: v || c.year, notes: {} }) }] },
          { t: 'seg', label: 'Weeks start on', buttons: [{ label: 'Sunday', pressed: !c.start, on: () => re({ start: 0 }) }, { label: 'Monday', pressed: c.start === 1, on: () => re({ start: 1 }) }] },
          { t: 'btns', buttons: [{ label: '◀ Previous month', on: () => re({ month: (c.month + 11) % 12, year: c.month ? c.year : c.year - 1, notes: {} }) }, { label: 'Next month ▶', on: () => re({ month: (c.month + 1) % 12, year: c.month === 11 ? c.year + 1 : c.year, notes: {} }) }] },
          { t: 'check', label: 'Show the month name on top', value: c.title !== false, on: (v) => re({ title: v }) },
        ] },
        { title: 'Notes on days', items: [
          { t: 'row', items: [{ t: 'num', id: 'p-cal-day', label: 'Day', value: '', min: 1, max: 31 }, { t: 'text', id: 'p-cal-note', label: 'Note', value: '' }] },
          { t: 'btns', buttons: [{ label: 'Add the note', cls: 'primary', on: () => { const d = +$('p-cal-day').value, t = $('p-cal-note').value.trim(); if (!d || !t) return toast('Enter a day and a note.'); re({ notes: { ...c.notes, [d]: t } }); } }] },
          ...notes.map(([d, t]) => ({ t: 'btns', buttons: [{ label: `${d}: ${t.length > 22 ? t.slice(0, 22) + '…' : t}`, title: t, on: () => { $('p-cal-day').value = d; $('p-cal-note').value = t; } }, { label: 'Remove', cls: 'outline danger', on: () => { const n = { ...c.notes }; delete n[d]; re({ notes: n }); } }] })),
        ] },
        { title: 'Bars across days (vacations, trips, holidays)', items: [
          { t: 'row', items: [{ t: 'num', id: 'p-bar-from', label: 'From day', value: '', min: 1, max: 31 }, { t: 'num', id: 'p-bar-to', label: 'To day', value: '', min: 1, max: 31 }] },
          { t: 'text', id: 'p-bar-text', label: 'Words on the bar', value: 'SCHOOL VACATION' },
          { t: 'row', items: [{ t: 'color', id: 'p-bar-color', label: 'Bar colour', value: '#3f8be8' }, { t: 'select', id: 'p-bar-place', label: 'Where', value: 'behind', options: [['behind', 'Behind the numbers'], ['over', 'Band along the bottom']] }] },
          { t: 'range', id: 'p-bar-op', label: 'Opacity (lower to see through)', value: 45, min: 10, max: 100, show: (v) => `${v}%` },
          { t: 'btns', buttons: [{ label: 'Add the bar', cls: 'primary', on: () => {
            const from = +$('p-bar-from').value, to = +$('p-bar-to').value || from;
            if (!from) return toast('Enter the first day of the bar.');
            re({ bars: [...(c.bars || []), { from, to, text: $('p-bar-text').value.trim(), color: $('p-bar-color').value, place: $('p-bar-place').value, opacity: +$('p-bar-op').value / 100 }] });
          } }] },
          ...(c.bars || []).map((b, n) => ({ t: 'btns', buttons: [{ label: `${b.from}–${b.to}: ${(b.text || 'bar').slice(0, 18)}`, title: 'Take this bar off and put it in the boxes above to change it', on: () => {
            $('p-bar-from').value = b.from; $('p-bar-to').value = b.to; $('p-bar-text').value = b.text || ''; $('p-bar-color').value = b.color; $('p-bar-place').value = b.place || 'behind'; $('p-bar-op').value = Math.round((b.opacity ?? 0.45) * 100);
            const keep = { from: b.from, to: b.to, text: b.text, color: b.color, place: b.place, op: Math.round((b.opacity ?? 0.45) * 100) };
            re({ bars: c.bars.filter((_, k) => k !== n) }).then(() => setTimeout(() => { $('p-bar-from').value = keep.from; $('p-bar-to').value = keep.to; $('p-bar-text').value = keep.text || ''; $('p-bar-color').value = keep.color; $('p-bar-place').value = keep.place || 'behind'; $('p-bar-op').value = keep.op; $('p-bar-op-v') && ($('p-bar-op-v').textContent = keep.op + '%'); }, 30));
            toast('Change it in the boxes above, then click Add the bar.');
          } }, { label: 'Remove', cls: 'outline danger', on: () => re({ bars: c.bars.filter((_, k) => k !== n) }) }] })),
          { t: 'note', html: 'Or draw your own shape, lower its opacity, and use Send backward to tuck it just behind the calendar: the day boxes are clear, so it shows through.' },
        ] },
        { title: 'Look', items: [
          { t: 'row', items: [{ t: 'font', label: 'Month font', value: c.titleFont || 'Lobster', on: (v) => re({ titleFont: v }) }, { t: 'font', label: 'Day font', value: c.font || 'Fredoka', on: (v) => re({ font: v }) }] },
          { t: 'row', items: [{ t: 'color', label: 'Month colour', value: c.titleColor || '#e8483f', on: (v, live) => { if (!live) re({ titleColor: v }); } }, { t: 'color', label: 'Weekday bar', value: c.headFill || '#3f8be8', on: (v, live) => { if (!live) re({ headFill: v }); } }] },
          { t: 'row', items: [{ t: 'color', label: 'Numbers', value: c.color || '#222222', on: (v, live) => { if (!live) re({ color: v }); } }, { t: 'color', label: 'Notes', value: c.noteColor || '#e8483f', on: (v, live) => { if (!live) re({ noteColor: v }); } }] },
        ] }, posSection(o), arrangeSection()]);
    }
    if (k === 'art') {
      const st = PC.doc.stories[o.art.story], left = (PC.doc.overflow || {})[o.art.story] || 0;
      const reStory = (patch) => { Object.assign(st, patch); PC.loadFonts([st.font]).then(() => { reflow(); PC.changed(); }); };
      const reFrame = (patch) => { Object.assign(o.art, patch); reflow(); PC.changed(); showProps(); };
      const frames = PC.allFrames(o.art.story).length;
      return render('Newspaper story', [
        { title: 'Copy desk', items: [
          { t: 'area', id: 'p-story', label: 'The story (an empty line starts a new paragraph)', value: st.text, rows: 9, live: true, on: (v, live) => { st.text = v; reflow(); if (!live) PC.changed(); else { PC.changed(); updateFit(); } } },
          { t: 'note', id: 'p-fit', html: left ? `${left} words do not fit yet: make the frame bigger, the type smaller, or continue the story in another frame.` : 'All of the story fits.', cls: left ? 'note-warn' : 'note-ok' },
          { t: 'btns', buttons: [{ label: 'Continue on this page', title: 'Add another frame for this story on this page', on: () => continueStory('here') }, { label: 'Continue on next page', on: () => continueStory('next') }] },
        ] },
        { title: 'Type', items: [
          { t: 'font', label: 'Font', value: st.font, on: (v) => reStory({ font: v }) },
          { t: 'row', items: [{ t: 'num', label: 'Size (pt)', value: st.size, step: 0.5, min: 5, on: (v) => reStory({ size: Math.max(5, v || 10) }) }, { t: 'num', label: 'Line spacing', value: st.lead, step: 0.05, min: 0.9, on: (v) => reStory({ lead: Math.max(0.9, v || 1.3) }) }] },
          { t: 'seg', buttons: [['left', 'Left'], ['justify', 'Justify'], ['center', 'Centre']].map(([v, n]) => ({ label: n, pressed: st.align === v, on: () => { reStory({ align: v }); showProps(); } })) },
          { t: 'row', items: [{ t: 'num', label: 'First-line indent (mm)', value: st.indent, step: 0.5, min: 0, on: (v) => reStory({ indent: Math.max(0, v || 0) }) }, { t: 'num', label: 'Space between paragraphs (mm)', value: st.gap, step: 0.5, min: 0, on: (v) => reStory({ gap: Math.max(0, v || 0) }) }] },
          { t: 'color', label: 'Colour', value: st.color, on: (v, live) => { if (!live) reStory({ color: v }); } },
        ] },
        { title: 'This frame', items: [
          { t: 'row', items: [{ t: 'num', label: 'Columns', value: o.art.cols, min: 1, max: 6, on: (v) => reFrame({ cols: Math.max(1, Math.min(6, v || 1)) }) }, { t: 'num', label: 'Gap between columns (mm)', value: o.art.gutter ?? 4, step: 0.5, min: 0, on: (v) => reFrame({ gutter: Math.max(0, v || 0) }) }] },
          { t: 'note', html: `Frame ${(o.art.order || 0) + 1} of ${frames} for this story. Pictures with “text flows around this” switched on push the text aside.` },
        ] }, posSection(o), arrangeSection()]);
      function updateFit() { const n = (PC.doc.overflow || {})[o.art.story] || 0; const el = $('p-fit'); if (el) { el.className = n ? 'note-warn' : 'note-ok'; el.textContent = n ? `${n} words do not fit yet: make the frame bigger, the type smaller, or continue the story in another frame.` : 'All of the story fits.'; } }
      // eslint-disable-next-line no-unreachable
    }
    if (k === 'shape') {
      const s = { ...o.shape }; if (s.type === 'rounded') { s.type = 'rect'; s.round = s.round ?? 30; }
      const re = (patch, keep) => PC.loadFonts([patch.font]).then(() => { PC.swap(o, PC.buildShape({ ...s, ...patch })); reflow(); if (keep) showProps(); });
      const line = s.type === 'line', isBox = s.type === 'rect';
      return render(line ? 'Line' : isBox && s.text ? 'Text box' : 'Shape', [
        { title: 'Shape', items: [
          { t: 'select', label: 'Shape', value: s.type, options: PC.SHAPES, on: (v) => re({ type: v, h: v === 'line' ? 0 : s.h || s.w * 0.6 }) },
          s.type === 'ellipse' ? null : { t: 'range', label: line ? 'Ends: square to round' : 'Corners: sharp to round', value: s.round || 0, min: 0, max: 100, show: (v) => (v ? v + '%' : 'sharp'), on: (v) => re({ round: v }) },
          s.type === 'star' ? { t: 'num', label: 'Star points', value: s.points || 5, min: 3, max: 24, on: (v) => re({ points: Math.max(3, Math.min(24, v || 5)) }) } : null,
          line ? null : { t: 'row', items: [{ t: 'color', label: 'Fill', value: s.fill || '#ffffff', on: (v, live) => { if (!live) re({ fill: v }, true); } }, { t: 'check', label: 'No fill', value: !s.fill, on: (v) => re({ fill: v ? null : '#f5c518' }, true) }] },
          { t: 'row', items: [{ t: 'color', label: line ? 'Colour' : 'Border', value: s.stroke || '#222222', on: (v, live) => { if (!live) re({ stroke: v }, true); } }, { t: 'num', label: line ? 'Thickness (mm)' : 'Border width (mm)', value: s.stroke || line ? s.sw : 0, step: 0.2, min: 0, on: (v) => re(v ? { sw: v, stroke: s.stroke || '#222222' } : { stroke: null }, true) }] },
          { t: 'check', label: line ? 'Dashed' : 'Dashed border', value: !!s.dash, on: (v) => re({ dash: v }) },
        ] },
        line ? null : { title: 'Words inside', items: [
          { t: 'area', id: 'p-shape-text', label: 'Words (they wrap inside the shape)', value: s.text || '', rows: 4, on: (v) => re({ text: v }) },
          { t: 'font', label: 'Font', value: s.font || 'Libre Baskerville', on: (v) => re({ font: v }) },
          { t: 'row', items: [{ t: 'num', label: 'Size (pt)', value: s.size || 12, min: 4, step: 1, on: (v) => re({ size: Math.max(4, v || 12) }) }, { t: 'color', label: 'Colour', value: s.color || '#222222', on: (v, live) => { if (!live) re({ color: v }); } }] },
          { t: 'seg', buttons: [{ label: '<b>B</b>', title: 'Bold', pressed: s.bold, on: () => re({ bold: !s.bold }, true) }, { label: '<i>I</i>', title: 'Italic', pressed: s.italic, on: () => re({ italic: !s.italic }, true) }, { label: '<u>U</u>', title: 'Underline', pressed: s.underline, on: () => re({ underline: !s.underline }, true) },
            ...[['left', 'Left'], ['center', 'Centre'], ['right', 'Right'], ['justify', 'Justify']].map(([v, n]) => ({ label: n, pressed: (s.align || 'center') === v, on: () => re({ align: v }, true) }))] },
          isBox ? { t: 'seg', label: 'Up and down', buttons: [{ label: 'Top', pressed: s.valign === 'top', on: () => re({ valign: 'top' }, true) }, { label: 'Middle', pressed: s.valign !== 'top', on: () => re({ valign: 'middle' }, true) }] } : null,
          { t: 'row', items: [{ t: 'num', label: 'Padding (mm)', value: s.pad ?? 2, min: 0, step: 0.5, on: (v) => re({ pad: Math.max(0, v || 0) }) }, { t: 'num', label: 'Line spacing', value: s.lead || 1.2, min: 0.8, step: 0.05, on: (v) => re({ lead: Math.max(0.8, v || 1.2) }) }] },
          isBox ? { t: 'btns', buttons: [{ label: 'Fit the box to the words', on: () => { const t = o.getObjects().find((x) => x.type === 'textbox'); if (t) re({ h: mmOf(t.height) + 2 * (s.pad ?? 2) + 1 }); } }] } : null,
        ] },
        { title: 'Drop shadow', items: [
          { t: 'check', label: 'Drop shadow', value: !!s.shadow, on: (v) => re({ shadow: v ? { color: 'rgba(0,0,0,0.35)', blur: 1.2, x: 0.8, y: 0.8 } : null }, true) },
          s.shadow ? { t: 'row', items: [{ t: 'range', label: 'Softness', value: s.shadow.blur ?? 1.2, min: 0, max: 6, step: 0.1, show: (v) => v + ' mm', on: (v) => re({ shadow: { ...s.shadow, blur: v } }) }, { t: 'range', label: 'Distance', value: s.shadow.x ?? 0.8, min: 0, max: 5, step: 0.1, show: (v) => v + ' mm', on: (v) => re({ shadow: { ...s.shadow, x: v, y: v } }) }] } : null,
          s.shadow ? { t: 'color', label: 'Shadow colour', value: /^#/.test(s.shadow.color || '') ? s.shadow.color : '#000000', on: (v, live) => { if (!live) re({ shadow: { ...s.shadow, color: v + '59' } }); } } : null,
          wrapItem(o),
        ] }, posSection(o), arrangeSection()]);
    }
    if (k === 'arc') {
      const a = o.arc, re = (patch) => rebuildArc(o, patch);
      const [cx, cy] = [panel().w / 2, panel().h / 2];
      return render('Curved text', [
        { title: 'Curved text', items: [
          { t: 'text', id: 'p-arc-text', label: 'Words (press Enter to apply)', value: a.text, on: (v) => re({ text: v || ' ' }) },
          { t: 'btns', buttons: [{ label: 'Edit words…', title: 'Type the words in a window, then OK', on: () => editArcWords(o) }] },
          { t: 'seg', buttons: [{ label: '◠ Curve up', title: 'Along the top, reading clockwise', pressed: a.dir !== 'down', on: () => re({ dir: 'up', pos: 0 }) }, { label: '◡ Curve down', title: 'Along the bottom, reading left to right', pressed: a.dir === 'down', on: () => re({ dir: 'down', pos: 180 }) }] },
          { t: 'range', label: 'Size of the circle', value: r1(a.r), min: 3, max: Math.round(Math.max(panel().w, panel().h) / 2), step: 0.5, show: (v) => v + ' mm', on: (v) => re({ r: v }) },
          { t: 'range', label: 'Rotation (around its centre)', value: Math.round(a.pos), min: -180, max: 180, show: (v) => v + '°', on: (v) => re({ pos: v }) },
          { t: 'num', label: 'Rotation angle (°)', value: Math.round(a.pos), min: -180, max: 180, on: (v) => re({ pos: ((((v || 0) + 180) % 360) + 360) % 360 - 180 }) },
          { t: 'range', label: 'Spread around the circle', value: a.span || 0, min: 0, max: 360, show: (v) => (v ? v + '°' : 'natural spacing'), on: (v) => re({ span: v }) },
          { t: 'font', label: 'Font', value: a.font, on: (v) => re({ font: v }) },
          { t: 'row', items: [{ t: 'num', label: 'Size (pt)', value: a.size, min: 4, step: 1, on: (v) => re({ size: Math.max(4, v || 20) }) }, { t: 'color', label: 'Colour', value: a.fill, on: (v, live) => { if (!live) re({ fill: v }); } }] },
          { t: 'seg', buttons: [{ label: '<b>B</b>', title: 'Bold', pressed: a.bold, on: () => re({ bold: !a.bold }) }, { label: '<i>I</i>', title: 'Italic', pressed: a.italic, on: () => re({ italic: !a.italic }) }] },
          { t: 'range', label: 'Letter spacing', value: a.spacing || 0, min: -100, max: 600, step: 10, on: (v) => re({ spacing: v }) },
          { t: 'btns', buttons: [{ label: 'Centre on the page', on: () => re({ cx, cy }) }, { label: 'Straighten', title: 'Turn it back into normal text', on: () => straighten(o) }] },
          { t: 'note', html: 'Drag it to move it, use the round handle to turn it around its centre, or pull a corner to make the letters bigger.' },
          wrapItem(o),
        ] }, shadowSection(o), arrangeSection()]);
    }
    if (k === 'tb') {
      const t = o.tb, re = (patch) => PC.loadFonts([patch.font]).then(() => PC.swap(o, PC.buildTable({ ...t, ...patch }), { keepCentre: false }));
      return render('Table', [{ title: 'Table', items: [
        { t: 'area', label: 'Rows: one per line, cells separated by |', value: t.text, rows: 7, on: (v) => re({ text: v }) },
        { t: 'text', label: 'Column widths in % (for example 55, 15, 15, 15)', value: (t.cols || []).join(', '), on: (v) => re({ cols: v.split(/[,\s]+/).map(Number).filter((x) => x > 0) }) },
        { t: 'row', items: [{ t: 'num', label: 'Width (mm)', value: t.w, min: 10, step: 1, on: (v) => re({ w: Math.max(10, v || t.w) }) }, { t: 'num', label: 'Row height (mm)', value: t.rowH, min: 3, step: 0.5, on: (v) => re({ rowH: Math.max(3, v || 7) }) }] },
        { t: 'font', label: 'Font', value: t.font, on: (v) => re({ font: v }) },
        { t: 'row', items: [{ t: 'num', label: 'Size (pt)', value: t.size, min: 5, step: 0.5, on: (v) => re({ size: Math.max(5, v || 9) }) }, { t: 'color', label: 'Text', value: t.color || '#222222', on: (v, live) => { if (!live) re({ color: v }); } }] },
        { t: 'check', label: 'First row is a heading', value: !!t.header, on: (v) => re({ header: v }) },
        t.header ? { t: 'row', items: [{ t: 'color', label: 'Heading shade', value: t.headFill || '#c2185b', on: (v, live) => { if (!live) re({ headFill: v }); } }, { t: 'color', label: 'Heading text', value: t.headInk || '#ffffff', on: (v, live) => { if (!live) re({ headInk: v }); } }] } : null,
        { t: 'row', items: [{ t: 'color', label: 'Lines', value: t.line || '#555555', on: (v, live) => { if (!live) re({ line: v }); } }, { t: 'num', label: 'Line width (mm)', value: t.lw, min: 0, step: 0.05, on: (v) => re({ lw: Math.max(0, v || 0) }) }] },
        { t: 'select', label: 'Lines between', value: t.grid || 'all', options: [['all', 'Rows and columns'], ['rows', 'Rows only']], on: (v) => re({ grid: v }) },
        { t: 'check', label: 'Shade every other row', value: !!t.stripe, on: (v) => re({ stripe: v ? '#f3efe6' : null }) },
        { t: 'text', label: 'Right-align columns (numbers, for example 2, 3, 4)', value: (t.right || []).map((c) => c + 1).join(', '), on: (v) => re({ right: v.split(/[,\s]+/).map(Number).filter((x) => x > 0).map((x) => x - 1) }) },
      ] }, posSection(o, true), arrangeSection()]);
    }
    if (k === 'tabs') {
      const t = o.tabs, re = (patch) => PC.loadFonts([patch.font]).then(() => PC.swap(o, PC.buildTabs({ ...t, ...patch })));
      return render('Tear-off tabs', [{ title: 'Tear-off tabs', items: [
        { t: 'text', label: 'Words on every tab', value: t.text, on: (v) => re({ text: v || ' ' }) },
        { t: 'row', items: [{ t: 'num', label: 'How many tabs', value: t.count, min: 3, max: 16, on: (v) => re({ count: Math.max(3, Math.min(16, v || 8)) }) }, { t: 'num', label: 'Size (pt)', value: t.size, min: 5, step: 0.5, on: (v) => re({ size: Math.max(5, v || 10) }) }] },
        { t: 'font', label: 'Font', value: t.font, on: (v) => re({ font: v }) },
        { t: 'row', items: [{ t: 'num', label: 'Width (mm)', value: r1(t.w), min: 30, on: (v) => re({ w: Math.max(30, v || t.w) }) }, { t: 'num', label: 'Height (mm)', value: r1(t.h), min: 15, on: (v) => re({ h: Math.max(15, v || t.h) }) }] },
        { t: 'note', html: 'Cut along the dashed lines between the tabs so people can tear one off.' },
      ] }, posSection(o, true), arrangeSection()]);
    }
    if (k === 'image') {
      return render('Your picture', [{ title: 'Picture', items: [
        { t: 'check', label: 'Black and white', value: !!(o.filters && o.filters.length), on: (v) => { o.filters = v ? [new fabric.Image.filters.Grayscale()] : []; o.applyFilters(); canvas.requestRenderAll(); PC.changed(); } },
        wrapItem(o),
      ] }, shadowSection(o), layoutSection(), posSection(o), arrangeSection()]);
    }
    render('Item', [posSection(o), arrangeSection()]);
  }
  const layoutSection = () => ({ title: 'Layout (like Print Shop)', items: [
    { t: 'btns', buttons: [{ label: 'One big', on: () => layout('big') }, { label: 'Row of three', on: () => layout('row') }] },
    { t: 'btns', buttons: [{ label: 'Tiled', on: () => layout('tiled') }, { label: 'Staggered', on: () => layout('stagger') }] },
    { t: 'btns', buttons: [{ label: 'Four corners', on: () => layout('corners') }] },
  ] });
  function pageProps() {
    const d = PC.doc, p = panel();
    const retro = (on, mode) => { d.retro = on; if (mode) d.retroMode = mode; canvas.requestRenderAll(); drawRetro(); PC.changed(); showProps(); status(); };
    const labels = d.kind === 'labels' ? { title: 'Addresses (mail merge)', items: [
      { t: 'area', label: 'One address per block; leave an empty line between addresses', value: d.addresses || '', rows: 8, on: (v) => { d.addresses = v; PC.changed(); showProps(); } },
      { t: 'note', html: `${PC.addressList().length} addresses. Each one prints on its own label in the address block. With no addresses, a whole sheet of the same label prints.` },
      { t: 'num', label: `Start at label (1 to ${(PC.LABEL_STOCK[d.stock].cols * PC.LABEL_STOCK[d.stock].rows)}), to use up a partly used sheet`, value: d.labelStart || 1, min: 1, on: (v) => { d.labelStart = Math.max(1, v || 1); PC.changed(); } },
      { t: 'btns', buttons: [{ label: 'Add an address block', on: () => ins.address() }] },
    ] } : null;
    render(p.name, [labels,
      { title: 'This page', items: [
        { t: 'note', html: `${PC.KINDS[d.kind].name} · ${d.kind === 'labels' ? PC.LABEL_STOCK[d.stock].name : d.paper + ' paper'} · ${r1(p.w)} × ${r1(p.h)} mm` },
        { t: 'color', label: 'Page colour', value: p.bg || '#ffffff', on: (v) => { p.bg = v; canvas.backgroundColor = v; canvas.requestRenderAll(); PC.changed(); } },
        { t: 'note', html: 'Click something on the page to change it, or use the Insert tab and the side panel to add titles, text, pictures, borders and Screen Magic.' },
      ] },
      { title: 'Look', items: [
        { t: 'seg', buttons: [{ label: 'Modern', pressed: !d.retro, on: () => retro(false) }, { label: 'Retro B&W', title: '1980s dot-matrix look in black and white', pressed: d.retro && d.retroMode !== 'color', on: () => retro(true, 'bw') }, { label: 'Retro colour', title: 'Eight-colour ribbon look', pressed: d.retro && d.retroMode === 'color', on: () => retro(true, 'color') }] },
        d.retro ? { t: 'select', label: 'Dot size', value: d.retroDot, options: [[0.3, 'Fine (about 85 dots per inch)'], [0.42, 'Classic (about 60 dots per inch)'], [0.6, 'Chunky (about 42 dots per inch)'], [0.85, 'Extra chunky']], on: (v) => { d.retroDot = +v; drawRetro(); PC.changed(); } } : null,
        { t: 'note', html: 'The retro look changes how the page looks and prints. Your design stays sharp underneath, so you can switch back any time.' },
      ] },
    ]);
  }
  PC.ui.showProps = showProps;

  // ------------------------------------------------------------------ status bar
  function status() {
    if (!PC.doc) return;
    const d = PC.doc;
    $('status').innerHTML = `<span><b>${esc(d.name)}</b></span><span>${PC.KINDS[d.kind].name}${d.kind === 'card' ? ` (${d.fold === 'half' ? 'half-fold' : 'quarter-fold'})` : ''}</span><span>${d.paper}</span><span>${esc(panel().name)}</span>`
      + `<span>${d.retro ? (d.retroMode === 'color' ? 'Retro colour ribbon' : 'Retro black & white') : 'Modern look'}</span><span>${Math.round(PC.zoom * 100 * 96 / PC.DPI)}%</span><span>${PC.autosaveFailed ? 'Too big to autosave: use Save' : 'Autosaves in this browser'}</span>`;
    $('cap').textContent = panel().name;
  }
  PC.on('panel', () => { renderPages(); fitZoom(); showProps(); status(); drawRetro(); });
  PC.on('changed', () => { status(); clearTimeout(thumbT); thumbT = setTimeout(() => thumb(PC.cur), 900); if (window.__tb) window.__tb.update(); });

  // ------------------------------------------------------------------ dialogs
  const toastEl = $('toast'); let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 3200); }
  PC.ui.toast = toast;
  function info(title, html) { $('info-title').textContent = title; $('info-body').innerHTML = html; $('info').hidden = false; $('info-close').focus(); }
  $('info-close').onclick = () => { $('info').hidden = true; };
  function ask(title, body, yes = 'OK') {
    return new Promise((res) => {
      $('ask-title').textContent = title; $('ask-body').textContent = body; $('ask-yes').textContent = yes; $('ask').hidden = false; $('ask-yes').focus();
      const done = (v) => { $('ask').hidden = true; res(v); };
      $('ask-yes').onclick = () => done(true); $('ask-no').onclick = () => done(false);
    });
  }
  ['info', 'ask', 'setup', 'printdlg'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Escape') { $(id).hidden = true; } }));

  // ------------------------------------------------------------------ start screen and new projects
  const KIND_ART = {
    card: '<rect x="14" y="12" width="46" height="58" rx="3" fill="#fff" stroke="#c2185b" stroke-width="3"/><path d="M60 12l12 6v58l-12-6" fill="#f7b6c8" stroke="#c2185b" stroke-width="3" stroke-linejoin="round"/><path d="M37 50c-10-7-13-12-11-17 2-5 8-6 11-1 3-5 9-4 11 1 2 5-1 10-11 17z" fill="#e8483f"/>',
    postcard: '<rect x="6" y="16" width="62" height="42" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/><path d="M40 22v30M45 34h16M45 40h16M45 46h12" stroke="#9aa1ad" stroke-width="2"/><rect x="52" y="21" width="10" height="9" fill="#f5c518"/><path d="M12 26h22M12 32h18" stroke="#3f8be8" stroke-width="2.5"/>',
    labels: '<rect x="12" y="6" width="50" height="62" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/>' + [0, 1, 2, 3, 4].map((r) => `<rect x="17" y="${11 + r * 11}" width="18" height="8" rx="1.5" fill="#f7b6c8"/><rect x="39" y="${11 + r * 11}" width="18" height="8" rx="1.5" fill="#f7b6c8"/>`).join(''),
    cd: '<circle cx="37" cy="37" r="28" fill="#b9dcf7" stroke="#c2185b" stroke-width="3"/><circle cx="37" cy="37" r="9" fill="#fff" stroke="#c2185b" stroke-width="3"/><path d="M20 26a20 20 0 0 1 12-8" stroke="#fff" stroke-width="3" fill="none"/>',
    flyer: '<rect x="14" y="6" width="46" height="62" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/><rect x="20" y="12" width="34" height="8" fill="#7b4fd6"/><circle cx="37" cy="33" r="7" fill="#f5c518"/><path d="M19 52h36" stroke="#c2185b" stroke-width="1.5"/><path d="M23 52v14M29 52v14M35 52v14M41 52v14M47 52v14" stroke="#9aa1ad" stroke-width="1.5" stroke-dasharray="2 2"/>',
    sign: '<rect x="8" y="14" width="58" height="44" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/><path d="M37 58v14M24 72h26" stroke="#c2185b" stroke-width="3"/><text x="37" y="44" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="15" fill="#e8483f">SALE</text>',
    brochure: '<path d="M6 14l20 4v44l-20-4zM26 18l22-4v44l-22 4zM48 14l20 4v44l-20-4z" fill="#fff" stroke="#c2185b" stroke-width="3" stroke-linejoin="round"/><circle cx="58" cy="32" r="5" fill="#2e9b4f"/><path d="M31 28h12M31 34h12M31 40h12" stroke="#9aa1ad" stroke-width="2"/>',
    banner: '<path d="M4 22h66v30H4z" fill="#fff" stroke="#c2185b" stroke-width="3"/><path d="M26 22v30M48 22v30" stroke="#c2185b" stroke-width="1.5" stroke-dasharray="3 3"/><text x="37" y="43" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="13" fill="#3f8be8">HOORAY</text>',
    news: '<rect x="8" y="8" width="58" height="60" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/><text x="37" y="22" text-anchor="middle" font-family="UnifrakturMaguntia, serif" font-size="12" fill="#222">The News</text><path d="M14 27h46" stroke="#222" stroke-width="1.5"/><path d="M14 33h20M14 38h20M14 43h20M14 48h20M14 53h20M14 58h20M40 33h20M40 38h20" stroke="#9aa1ad" stroke-width="2"/><rect x="40" y="43" width="20" height="18" fill="#b9dcf7"/>',
    stationery: '<rect x="8" y="6" width="36" height="48" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/><rect x="26" y="34" width="42" height="24" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/><path d="M26 36l21 12 21-12" fill="none" stroke="#c2185b" stroke-width="2"/><rect x="14" y="58" width="24" height="12" rx="1.5" fill="#f7b6c8" stroke="#c2185b" stroke-width="2"/><path d="M14 12h14" stroke="#c2185b" stroke-width="3"/>',
    letter: '<rect x="14" y="6" width="46" height="62" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/><rect x="20" y="12" width="22" height="6" fill="#c2185b"/><path d="M20 22h34M20 34h34M20 40h34M20 46h28M20 52h30" stroke="#9aa1ad" stroke-width="2"/>',
    bcard: '<rect x="6" y="20" width="56" height="34" rx="3" fill="#fff" stroke="#c2185b" stroke-width="3"/><rect x="12" y="14" width="56" height="34" rx="3" fill="#f7b6c8" stroke="#c2185b" stroke-width="3"/><path d="M18 24h20M18 30h14M18 38h24" stroke="#fff" stroke-width="3"/>',
    form: '<rect x="12" y="6" width="50" height="62" rx="2" fill="#fff" stroke="#c2185b" stroke-width="3"/><rect x="18" y="20" width="38" height="6" fill="#c2185b"/><path d="M18 26h38v30H18zM18 32h38M18 38h38M18 44h38M18 50h38M38 26v30" fill="none" stroke="#9aa1ad" stroke-width="1.5"/><path d="M18 12h18" stroke="#c2185b" stroke-width="3"/>',
    cert: '<rect x="4" y="12" width="66" height="48" rx="2" fill="#fff" stroke="#b8860b" stroke-width="3"/><rect x="9" y="17" width="56" height="38" fill="none" stroke="#b8860b" stroke-width="1"/><path d="M18 28h38M24 36h26" stroke="#9aa1ad" stroke-width="2.5"/><circle cx="37" cy="48" r="5" fill="#f5c518" stroke="#b8860b"/>',
    calendar: '<rect x="10" y="12" width="54" height="52" rx="3" fill="#fff" stroke="#c2185b" stroke-width="3"/><rect x="10" y="12" width="54" height="12" fill="#3f8be8"/><path d="M10 34h54M10 44h54M10 54h54M23 24v40M36 24v40M49 24v40" stroke="#9aa1ad" stroke-width="1.5"/><circle cx="43" cy="49" r="4" fill="#e8483f"/>',
  };
  const KIND_TEXT = {
    card: 'Birthdays, holidays and thank-yous that fold just right', postcard: 'Picture on the front, message and address on the back',
    labels: 'Address, return and shipping labels, with mail merge', cd: 'Disc label, case front and back insert with spines',
    flyer: 'Events and offers, with tear-off tabs', sign: 'Yard sales, parties, notices and posters', brochure: 'Tri-fold or bi-fold, printed on both sides',
    banner: 'Long messages printed across several pages', newsletter: 'A newspaper with columns, headlines and pictures',
    stationery: 'Matching letterhead, envelope and business cards', letterhead: 'Your own writing paper with your name on top',
    businesscard: 'Ten to a sheet, front and back', forms: 'Invoices, receipts, order forms, fax covers and memos', certificate: 'Awards and thank-you certificates',
    calendar: 'A month with pictures and notes on the days',
  };
  const groups = [...new Set(Object.values(PC.KINDS).map((v) => v.group))];
  $('kinds').outerHTML = '<div id="kinds">' + groups.map((g) => `<h3 class="kind-group">${g}</h3><div class="kinds">${Object.entries(PC.KINDS).filter(([, v]) => v.group === g).map(([k, v]) => `<button class="kind" data-kind="${k}"><svg viewBox="0 0 74 74">${KIND_ART[v.icon]}</svg><b>${v.name}</b><small>${KIND_TEXT[k]}</small></button>`).join('')}</div>`).join('') + '</div>';
  $('kinds').onclick = (e) => { const b = e.target.closest('[data-kind]'); if (b) setup(b.dataset.kind); };
  function showStart() {
    $('start').hidden = false;
    $('start-resume').hidden = !PC.doc && !PC.autosaved();
  }
  PC.ui.showStart = showStart;
  $('start-resume').onclick = async () => { if (!PC.doc) await openDoc(PC.autosaved()); $('start').hidden = true; };
  $('start-open').onclick = () => $('open-input').click();
  const choice = (name, opts, val) => `<div class="choice">${opts.map(([v, t, s]) => `<label><input type="radio" name="${name}" value="${v}" ${String(v) === String(val) ? 'checked' : ''}><b>${t}</b>${s ? `<small>${s}</small>` : ''}</label>`).join('')}</div>`;
  let setupKind = 'card';
  function setup(kind) {
    setupKind = kind;
    const now = new Date();
    let body = '';
    if (kind === 'card') body += `<div class="field"><span>Fold</span>${choice('fold', [['quarter', 'Quarter-fold', 'One sheet, one side, folded twice (like Print Shop)'], ['half', 'Half-fold', 'Bigger card, printed on both sides']], 'quarter')}</div>`;
    if (['sign', 'calendar', 'flyer', 'certificate'].includes(kind)) body += `<div class="field"><span>Which way</span>${choice('orient', [['portrait', 'Tall', ''], ['landscape', 'Wide', '']], kind === 'calendar' || kind === 'certificate' ? 'landscape' : 'portrait')}</div>`;
    if (kind === 'brochure') body += `<div class="field"><span>Fold</span>${choice('fold', [['tri', 'Tri-fold', 'Three panels each side, folds into a leaflet'], ['bi', 'Bi-fold', 'Folded in half, four pages']], 'tri')}</div>`;
    if (kind === 'postcard') body += `<div class="field"><span>Size</span>${choice('pcSize', Object.entries(PC.POSTCARD).map(([v, c]) => [v, c.name.split(',')[0], c.name.split(', ')[1] || '']), '4x6')}</div>`;
    if (kind === 'labels') body += `<label class="field"><span>Label sheets</span><select class="input" name="stock">${Object.entries(PC.LABEL_STOCK).map(([v, l]) => `<option value="${v}">${l.name}</option>`).join('')}</select></label>`;
    if (kind === 'forms') body += `<label class="field"><span>Which form</span><select class="input" name="form">${PC.FORMS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label>`;
    if (kind === 'banner') body += `<label class="field"><span>Length</span><select class="input" name="pages">${[2, 3, 4, 5, 6, 8, 10, 12].map((n) => `<option value="${n}" ${n === 4 ? 'selected' : ''}>${n} pages</option>`).join('')}</select></label>`;
    if (kind === 'newsletter') body += `<label class="field"><span>Pages</span><select class="input" name="pages">${[1, 2, 3, 4].map((n) => `<option value="${n}">${n}</option>`).join('')}</select></label>`;
    if (kind === 'calendar') body += `<div class="row"><label class="field"><span>Month</span><select class="input" name="month">${Array.from({ length: 12 }, (_, i) => `<option value="${i}" ${i === now.getMonth() ? 'selected' : ''}>${new Date(2024, i, 1).toLocaleDateString(undefined, { month: 'long' })}</option>`).join('')}</select></label><label class="field"><span>Year</span><input class="input" type="number" name="year" value="${now.getFullYear()}"></label></div>`;
    if (kind !== 'labels' && kind !== 'postcard') body += `<div class="field"><span>Paper</span>${choice('paper', [['Letter', 'Letter', '8.5 × 11 in'], ['A4', 'A4', '210 × 297 mm']], (navigator.language || '').startsWith('en-US') ? 'Letter' : 'A4')}</div>`;
    body += `<div class="field"><span>Look</span>${choice('look', [['modern', 'Modern', 'Smooth and sharp'], ['bw', 'Retro', '1980s black and white dots'], ['color', 'Retro colour', 'Eight-colour ribbon']], 'modern')}</div>`;
    body += `<div class="field"><span>Start with</span>${choice('start', [['example', 'An example', 'A ready-made design to change'], ['blank', 'A blank page', '']], 'example')}</div>`;
    $('setup-title').textContent = `New ${PC.KINDS[kind].name.toLowerCase()}`;
    $('setup-body').innerHTML = body;
    $('setup').hidden = false;
  }
  $('setup-cancel').onclick = () => { $('setup').hidden = true; };
  $('setup-go').onclick = async () => {
    const f = new FormData(); $('setup-body').querySelectorAll('input:checked, select, input[type=number]').forEach((el) => f.set(el.name, el.value));
    const look = f.get('look') || 'modern';
    const pcSize = f.get('pcSize') || '4x6', paper = setupKind === 'postcard' ? (pcSize === 'a6' ? 'A4' : 'Letter') : f.get('paper') || 'Letter';
    const d = PC.newDoc({ kind: setupKind, paper, pcSize, stock: f.get('stock') || undefined, form: f.get('form') || undefined, orient: f.get('orient') || undefined, fold: f.get('fold') || undefined, bannerPages: +(f.get('pages') || 4), pages: +(f.get('pages') || 1), retro: look !== 'modern', retroMode: look === 'color' ? 'color' : 'bw' });
    $('setup').hidden = true; $('start').hidden = true;
    PC.doc = d; PC.cur = 0; Object.keys(thumbs).forEach((k) => delete thumbs[k]);
    if (f.get('start') === 'example') await PC.examples(d.kind, { month: +(f.get('month') ?? new Date().getMonth()), year: +(f.get('year') || new Date().getFullYear()) });
    else if (d.kind === 'calendar') { await PC.loadPanel(0); ins.calendar({ month: +f.get('month'), year: +f.get('year') }); canvas.discardActiveObject(); PC.saveLive(); }
    await PC.loadPanel(0);
    PC.resetHistory(); PC.dirty = false; fileName = null;
    d.panels.forEach((_, i) => thumb(i));
    renderPages(); showProps(); status();
  };

  // ------------------------------------------------------------------ example designs
  PC.SAMPLE = [
    'Spring cleanup day is set for Saturday morning. Neighbors will meet at the corner of Elm and Third at 9 a.m. with gloves, rakes and plenty of good cheer. Coffee and donuts will be waiting at the picnic table, courtesy of the Garden Club.\nLast year more than forty volunteers filled ninety bags of leaves and planted two hundred tulip bulbs along the walking path. This year the goal is to repaint the old bandstand and add a new bench by the pond, where the ducks have been waiting patiently for somewhere comfortable to watch.\nChildren are welcome. There will be a chalk drawing contest on the basketball court, with prizes for the brightest picture, the funniest picture and the picture that best shows what makes our street a nice place to live.\nIf you can lend a ladder, a wheelbarrow or a paint sprayer, please leave a note in the newsletter box on the community board. Lunch will be served at noon, and the bandstand concert starts at four. See you there!',
    'The library summer reading club starts next month, and this year everyone can join, from toddlers to grandparents. Pick up a reading log at the front desk and add a sticker for every book you finish.\nReaders who finish ten books by August get a free ice cream at the corner store and their name on the big board in the lobby. The librarians promise a few surprises along the way, including a pajama story night and a visit from a real author.\nNew this summer: a swap shelf where you can trade a book you loved for one you have not read yet.',
    'We grow vegetables, herbs and flowers in twelve shared beds behind the library, and every member gets a plot of their own to look after. Tools, seeds and plenty of advice are included.\nOur workshops run from March to October: seed starting, composting, pruning, making the most of a small balcony, and cooking with what you grow. Most are free for members and cost a small fee for visitors.\nEach June we open our gardens for the Lakeside Garden Tour. Ten gardens, one ticket, and lemonade at every stop. Volunteers are always welcome to help with parking, maps and smiles.\nMembership is twenty dollars a year for a household. Children garden free with a grown-up.',
  ];
  PC.examples = async function (kind, o = {}) {
    const d = PC.doc;
    const on = async (i, fn) => { await PC.loadPanel(i); await fn(panel()); canvas.discardActiveObject(); PC.saveLive(); };
    const T = (o2) => PC.buildTitle(PC.defaultTitle(o2));
    const put = (obj, x, y) => { obj.setPositionByOrigin(new fabric.Point(px(x), px(y)), 'center', 'center'); canvas.add(obj); obj.setCoords(); return obj; };
    const add = put;
    const fit = (t, p, wk = 0.88) => fitTitle(PC.defaultTitle(t), px(p.w) * wk, px(p.h) * 0.6);
    await PC.loadFonts(FONTS.slice(0, 19));
    if (kind === 'card') {
      await on(0, async (p) => {
        await ins.border('stars', { color: '#f5c518', size: 5 });
        put(fit({ text: 'Happy\nBirthday!', font: 'Lobster', size: 44, fill: '#e8483f', shade: '#7a1f1a', effect: 'shadow', depth: 1 }, p), p.w / 2, p.h * 0.28);
        await ins.clip('cake', { size: 0.5, at: { x: px(p.w / 2), y: px(p.h * 0.66) } });
      });
      await on(1, async (p) => { await ins.clip('confetti', { size: 0.5, at: { x: px(p.w / 2), y: px(p.h / 2) } }); });
      await on(2, async (p) => {
        put(fit({ text: 'Have a\nwonderful day!', font: 'Pacifico', size: 30, fill: '#3f8be8', shade: '#1d4d8a', effect: 'solid' }, p), p.w / 2, p.h * 0.35);
        ins.text('With love,\n', { fontSize: ptPx(14) }); canvas.getActiveObject().setPositionByOrigin(new fabric.Point(px(p.w / 2), px(p.h * 0.62)), 'center', 'center'); canvas.getActiveObject().setCoords();
        await ins.clip('balloons', { size: 0.28, at: { x: px(p.w / 2), y: px(p.h * 0.82) } });
      });
      await on(3, async (p) => {
        await ins.clip('star', { size: 0.12, at: { x: px(p.w / 2), y: px(p.h * 0.78) } });
        ins.text('Made with PressCraft', { fontSize: ptPx(8), fill: '#777777', fontFamily: fam('Fredoka') }); canvas.getActiveObject().setPositionByOrigin(new fabric.Point(px(p.w / 2), px(p.h * 0.86)), 'center', 'center');
      });
    } else if (kind === 'sign') {
      await on(0, async (p) => {
        await ins.border('thickthin', { color: '#e8483f', size: 8 });
        put(fit({ text: 'YARD\nSALE', font: 'Bungee', size: 140, fill: '#e8483f', shade: '#222222', effect: '3d', depth: 3 }, p, 0.8), p.w / 2, p.h * 0.36);
        ins.text('Saturday 8 a.m. to 2 p.m.\n412 Maple Street', { fontFamily: fam('Oswald'), fontSize: ptPx(Math.round(26 * p.w / 215.9)) }); canvas.getActiveObject().setPositionByOrigin(new fabric.Point(px(p.w / 2), px(p.h * 0.7)), 'center', 'center');
        await ins.clip('tag', { size: 0.2, at: { x: px(p.w * 0.2), y: px(p.h * 0.86) } });
        await ins.clip('tag', { size: 0.2, at: { x: px(p.w * 0.8), y: px(p.h * 0.86) } });
        canvas.getActiveObject().set('flipX', true);
      });
    } else if (kind === 'letterhead') {
      await on(0, async (p) => {
        const t = T({ text: 'Pat Morgan', font: 'Playfair Display', size: 30, fill: '#c2185b', effect: 'solid', align: 'left' });
        t.set({ left: px(16), top: px(14) }); canvas.add(t);
        const a = new fabric.IText('123 Maple Street · Springfield · (555) 010-0123 · pat@example.com', { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(8.5), fill: '#555555', left: px(16.5), top: px(30), kind: 'text', wrap: true });
        canvas.add(a);
        canvas.add(PC.buildShape({ type: 'line', w: p.w - 32, h: 0, stroke: '#c2185b', sw: 0.6 }).set({ left: px(16), top: px(37) }));
        await ins.clip('pencil', { size: 0.09, at: { x: px(p.w - 24), y: px(23) } });
        const f = PC.buildShape({ type: 'line', w: p.w - 32, h: 0, stroke: '#c2185b', sw: 0.3 }); f.set({ left: px(16), top: px(p.h - 16) }); canvas.add(f);
      });
    } else if (kind === 'banner') {
      await on(0, async (p) => {
        put(fit({ text: 'WELCOME HOME!', font: 'Bungee', size: 400, fill: '#3f8be8', shade: '#1d2f6b', effect: '3d', depth: 6 }, p, 0.64), p.w / 2, p.h / 2);
        await ins.clip('star', { size: 0.55, at: { x: px(p.h * 0.45), y: px(p.h / 2) } });
        await ins.clip('star', { size: 0.55, at: { x: px(p.w - p.h * 0.45), y: px(p.h / 2) } });
      });
    } else if (kind === 'calendar') {
      await on(0, async () => { ins.calendar({ month: o.month ?? new Date().getMonth(), year: o.year || new Date().getFullYear(), notes: { 1: 'New month!', 14: 'Library day', 22: 'Cleanup day' } }); });
    } else if (kind === 'flyer') {
      await on(0, async (p) => {
        const k = p.w / 215.9;
        put(fit({ text: 'PIANO\nLESSONS', font: 'Bungee', size: 120, fill: '#7b4fd6', shade: '#2b1a55', effect: '3d', depth: 2.5 }, p, 0.84), p.w / 2, p.h * 0.2);
        await ins.clip('music', { size: 0.32, at: { x: px(p.w / 2), y: px(p.h * 0.47) } });
        add(new fabric.IText('All ages · Beginners welcome\nFirst lesson free!', { fontFamily: fam('Oswald'), fontSize: ptPx(Math.round(24 * k)), fill: '#222222', textAlign: 'center', lineHeight: 1.2, kind: 'text', wrap: true }), p.w / 2, p.h * 0.66);
        ins.tabs({ text: 'Piano lessons · (555) 010-0199', font: 'Oswald', size: 10 });
      });
    } else if (kind === 'postcard') {
      await on(0, async (p) => {
        p.bg = '#b9dcf7'; canvas.backgroundColor = p.bg;
        await ins.clip('sun', { size: 0.3, at: { x: px(p.w * 0.84), y: px(p.h * 0.22) } });
        await ins.clip('mountain', { size: 0.55, at: { x: px(p.w * 0.25), y: px(p.h * 0.72) } });
        put(fit({ text: 'Greetings from\nLakeside!', font: 'Lobster', size: 40, fill: '#e8483f', shade: '#222222', effect: 'shadow', depth: 0.8 }, p, 0.62), p.w * 0.6, p.h * 0.48);
      });
      await on(1, async (p) => {
        const mid = p.w * 0.55;
        canvas.add(PC.buildShape({ type: 'line', w: p.h - 20, h: 0, stroke: '#9aa1ad', sw: 0.4 }).set({ left: px(mid), top: px(10), angle: 90 }));
        canvas.add(PC.buildShape({ type: 'rect', w: 20, h: 24, fill: null, stroke: '#9aa1ad', sw: 0.4 }).set({ left: px(p.w - 28), top: px(8) }));
        add(new fabric.IText('Place\nstamp\nhere', { fontFamily: fam('Arial'), fontSize: ptPx(6), fill: '#9aa1ad', textAlign: 'center', kind: 'text', wrap: false }), p.w - 18, 20);
        [0, 1, 2, 3].forEach((n) => canvas.add(PC.buildShape({ type: 'line', w: p.w - mid - 12, h: 0, stroke: '#9aa1ad', sw: 0.3 }).set({ left: px(mid + 6), top: px(p.h * 0.5 + n * 10) })));
        add(new fabric.IText('Having a wonderful time!\nThe lake is warm, the\nice cream is cold and\nthe sunsets are amazing.\n\nWish you were here!', { fontFamily: fam('Special Elite'), fontSize: ptPx(9.5), fill: '#222222', lineHeight: 1.3, kind: 'text', wrap: true }), mid / 2, p.h / 2);
      });
    } else if (kind === 'labels') {
      d.addresses = 'Jordan Lee\n44 Birch Lane\nSpringfield, IL 62704\n\nSam Patel\n9 Harbor View Road\nPortland, ME 04101\n\nCasey Morgan\n310 Elm Street, Apt 2\nMadison, WI 53703\n\nRiley Chen\n77 Orchard Way\nBoulder, CO 80302';
      await on(0, async (p) => {
        const hk = p.h;
        await ins.clip('house', { size: 0.7, at: { x: px(hk * 0.45), y: px(p.h / 2) } });
        const t = new fabric.IText(PC.addressList()[0], { fontFamily: fam('Arial'), fontSize: ptPx(Math.max(6.5, Math.min(12, hk * 0.28))), fill: '#222222', lineHeight: 1.1, kind: 'text', merge: true, wrap: true });
        t.set({ left: px(hk * 0.95), top: px(p.h / 2) - t.height / 2 }); canvas.add(t);
      });
    } else if (kind === 'cd') {
      await on(0, async (p) => {
        const m = await PC.buildMagic({ seed: 20261014, style: 'petals', palette: 'Ocean', sym: 12, weight: 1, w: p.w, h: p.h }); m.set({ left: 0, top: 0, wrap: false }); canvas.add(m);
        put(fit({ text: 'SUMMER MIX', font: 'Bungee', size: 30, fill: '#ffffff', shade: '#0b3c5d', effect: 'shadow', depth: 0.8 }, p, 0.55), p.w / 2, p.h * 0.24);
        add(new fabric.IText('2026', { fontFamily: fam('Bungee'), fontSize: ptPx(14), fill: '#ffffff', kind: 'text', wrap: false }), p.w / 2, p.h * 0.78);
      });
      await on(1, async (p) => {
        p.bg = '#0b3c5d'; canvas.backgroundColor = p.bg;
        put(fit({ text: 'SUMMER\nMIX', font: 'Bungee', size: 60, fill: '#f5c518', shade: '#e8483f', effect: '3d', depth: 2 }, p, 0.8), p.w / 2, p.h * 0.38);
        await ins.clip('music', { size: 0.25, at: { x: px(p.w / 2), y: px(p.h * 0.78) } });
      });
      await on(2, async (p) => {
        add(new fabric.IText('1. Sunrise Drive\n2. Lakeside Breeze\n3. Ice Cream Truck\n4. Long Way Home\n5. Fireflies\n6. Porch Light\n7. Last Swim of Summer', { fontFamily: fam('Courier Prime'), fontSize: ptPx(11), fill: '#222222', lineHeight: 1.35, kind: 'text', wrap: true }), p.w / 2, p.h / 2);
        [3.25, p.w - 3.25].forEach((x) => { const t = new fabric.IText('SUMMER MIX · 2026', { fontFamily: fam('Bungee'), fontSize: ptPx(8), fill: '#0b3c5d', angle: 90, kind: 'text', wrap: false }); t.setPositionByOrigin(new fabric.Point(px(x), px(p.h / 2)), 'center', 'center'); canvas.add(t); });
      });
    } else if (kind === 'brochure') {
      const tri = d.fold !== 'bi', front = 0, back = tri ? 1 : 3;
      await on(front, async (p) => {
        p.bg = '#2e9b4f'; canvas.backgroundColor = p.bg;
        put(fit({ text: 'Lakeside\nGarden Club', font: 'Playfair Display', size: 34, fill: '#ffffff', shade: '#1b5e30', effect: 'shadow', depth: 0.8 }, p, 0.86), p.w / 2, p.h * 0.22);
        await ins.clip('flower', { size: 0.6, at: { x: px(p.w / 2), y: px(p.h * 0.55) } });
        add(new fabric.IText('Grow with us since 1987', { fontFamily: fam('Libre Baskerville'), fontStyle: 'italic', fontSize: ptPx(11), fill: '#ffffff', kind: 'text', wrap: true }), p.w / 2, p.h * 0.86);
      });
      await on(back, async (p) => {
        await ins.clip('leaf', { size: 0.3, at: { x: px(p.w / 2), y: px(p.h * 0.35) } });
        add(new fabric.IText('Lakeside Garden Club\n15 Pond Road · Lakeside\n(555) 010-0142\ngardenclub@example.com', { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(9.5), fill: '#222222', textAlign: 'center', lineHeight: 1.4, kind: 'text', wrap: true }), p.w / 2, p.h * 0.6);
      });
      if (tri) await on(2, async (p) => {
        put(fit({ text: 'Join us!', font: 'Pacifico', size: 30, fill: '#2e9b4f', effect: 'solid' }, p, 0.8), p.w / 2, p.h * 0.18);
        add(new fabric.Textbox('Meetings are every second Tuesday at 7 p.m. in the library hall. Everyone is welcome: bring a friend and a cutting to share.', { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(10), fill: '#222222', width: px(p.w - 20), textAlign: 'center', lineHeight: 1.4, kind: 'text', wrap: true }), p.w / 2, p.h * 0.45);
        await ins.clip('bird', { size: 0.4, at: { x: px(p.w / 2), y: px(p.h * 0.75) } });
      });
      const inside = tri ? [3, 4, 5] : [1, 2];
      let story = null;
      for (const [n, i] of inside.entries()) {
        await on(i, async (p) => {
          const head = ['What we grow', 'Workshops', 'Garden tours'][n] || '';
          const h = T({ text: head, font: 'Playfair Display', size: 18, fill: '#2e9b4f', effect: 'solid', align: 'left', bold: true }); h.set({ left: px(9), top: px(12) }); h.wrap = false; canvas.add(h);
          if (!story) { const f = ins.article(PC.SAMPLE[2], { at: [9, 26], w: p.w - 18, h: p.h - 70, cols: 1 }); story = f.art.story; PC.doc.stories[story].size = 10; }
          else { const f = PC.newFrame(story, p.w - 18, p.h - 70, 1); f.set({ left: px(9), top: px(26) }); canvas.add(f); }
          await ins.clip(['flower', 'pencil', 'tree'][n] || 'leaf', { size: 0.3, at: { x: px(p.w / 2), y: px(p.h - 24) } });
          PC.flow(canvas, PC.cur);
        });
      }
    } else if (kind === 'stationery' || kind === 'businesscard') {
      const name = 'Pat Morgan', role = 'Graphic designer', contact = '(555) 010-0123 · pat@example.com', addr = '123 Maple Street · Springfield';
      const card = async (p) => {
        const t = T({ text: name, font: 'Playfair Display', size: 18, fill: '#c2185b', effect: 'solid', align: 'left' }); t.set({ left: px(6), top: px(6) }); t.wrap = false; canvas.add(t);
        canvas.add(new fabric.IText(role, { fontFamily: fam('Libre Baskerville'), fontStyle: 'italic', fontSize: ptPx(8), fill: '#555555', left: px(6.3), top: px(15), kind: 'text', wrap: true }));
        canvas.add(PC.buildShape({ type: 'line', w: p.w - 12, h: 0, stroke: '#c2185b', sw: 0.4 }).set({ left: px(6), top: px(p.h - 16) }));
        canvas.add(new fabric.IText(`${contact}\n${addr}`, { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(6.5), fill: '#333333', lineHeight: 1.35, left: px(6), top: px(p.h - 13), kind: 'text', wrap: true }));
        await ins.clip('pencil', { size: 0.32, at: { x: px(p.w - 12), y: px(13) } });
      };
      if (kind === 'stationery') {
        await on(0, async (p) => {
          const t = T({ text: name, font: 'Playfair Display', size: 30, fill: '#c2185b', effect: 'solid', align: 'left' }); t.set({ left: px(16), top: px(14) }); canvas.add(t);
          canvas.add(new fabric.IText(`${addr} · ${contact}`, { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(8.5), fill: '#555555', left: px(16.5), top: px(30), kind: 'text', wrap: true }));
          canvas.add(PC.buildShape({ type: 'line', w: p.w - 32, h: 0, stroke: '#c2185b', sw: 0.6 }).set({ left: px(16), top: px(37) }));
          await ins.clip('pencil', { size: 0.09, at: { x: px(p.w - 24), y: px(23) } });
        });
        await on(1, async (p) => {
          const t = T({ text: name, font: 'Playfair Display', size: 14, fill: '#c2185b', effect: 'solid', align: 'left' }); t.set({ left: px(12), top: px(10) }); canvas.add(t);
          canvas.add(new fabric.IText(addr.replace(' · ', '\n'), { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(8), fill: '#555555', left: px(12.3), top: px(18), lineHeight: 1.3, kind: 'text', wrap: true }));
          ins.address('Name\nStreet\nTown, State ZIP'); canvas.getActiveObject().setPositionByOrigin(new fabric.Point(px(p.w * 0.55), px(p.h * 0.6)), 'center', 'center'); canvas.getActiveObject().set({ merge: false, fontSize: ptPx(11) }).setCoords();
        });
        await on(2, card);
      } else {
        await on(0, card);
        await on(1, async (p) => {
          p.bg = '#c2185b'; canvas.backgroundColor = p.bg;
          put(fit({ text: 'Pat Morgan\nDesign', font: 'Playfair Display', size: 22, fill: '#ffffff', effect: 'solid' }, p, 0.8), p.w / 2, p.h / 2);
        });
      }
    } else if (kind === 'certificate') {
      await on(0, async (p) => {
        await ins.border('deco', { color: '#b8860b', size: 8 });
        put(fit({ text: 'Certificate of Achievement', font: 'Playfair Display', size: 40, fill: '#b8860b', effect: 'solid', bold: true }, p, 0.78), p.w / 2, p.h * 0.22);
        add(new fabric.IText('This certificate is proudly presented to', { fontFamily: fam('Libre Baskerville'), fontStyle: 'italic', fontSize: ptPx(14), fill: '#444444', kind: 'text', wrap: true }), p.w / 2, p.h * 0.36);
        put(fit({ text: 'Alex Rivera', font: 'Pacifico', size: 46, fill: '#222222', effect: 'solid' }, p, 0.6), p.w / 2, p.h * 0.5);
        add(new fabric.IText('for outstanding work at the Spring Science Fair', { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(13), fill: '#444444', kind: 'text', wrap: true }), p.w / 2, p.h * 0.63);
        [0.28, 0.72].forEach((x, n) => {
          canvas.add(PC.buildShape({ type: 'line', w: 60, h: 0, stroke: '#444444', sw: 0.4 }).set({ left: px(p.w * x - 30), top: px(p.h * 0.8) }));
          add(new fabric.IText(n ? 'Date' : 'Teacher', { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(10), fill: '#666666', kind: 'text', wrap: false }), p.w * x, p.h * 0.84);
        });
        const seal = await PC.buildClip({ id: 'star', mode: 'mono', tint: '#b8860b' }); const k = px(28) / 100; seal.set({ scaleX: k, scaleY: k }); put(seal, p.w / 2, p.h * 0.8);
      });
    } else if (kind === 'forms') {
      await on(0, async (p) => PC.formExample(d.form, p, { T, put, add, fit }));
    } else if (kind === 'newsletter') {
      const month = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      await on(0, async (p) => {
        put(fit({ text: 'The Neighborhood News', font: 'UnifrakturMaguntia', size: 52, fill: '#222222', effect: 'solid' }, p, 0.9), p.w / 2, 22);
        canvas.add(PC.buildShape({ type: 'line', w: p.w - 25.4, h: 0, stroke: '#222222', sw: 0.8 }).set({ left: px(12.7), top: px(36) }));
        const dl = new fabric.IText(`Volume 1 · Number 1 · ${month}`, { fontFamily: fam('Old Standard TT'), fontSize: ptPx(10), fill: '#222222', kind: 'text', wrap: true });
        put(dl, p.w / 2, 40.5);
        canvas.add(PC.buildShape({ type: 'line', w: p.w - 25.4, h: 0, stroke: '#222222', sw: 0.4 }).set({ left: px(12.7), top: px(45) }));
        const h1 = T({ text: 'Cleanup Day Brings Out the Best', font: 'Old Standard TT', size: 22, fill: '#222222', effect: 'solid', bold: true, align: 'left' }); h1.set({ left: px(12.7), top: px(50) }); h1.wrap = false; canvas.add(h1);
        ins.article(PC.SAMPLE[0], { at: [12.7, 62], w: p.w - 25.4, h: 118, cols: 3 });
        await ins.clip('house', { size: 0.17, at: { x: px(p.w / 2), y: px(100) } });
        const h2 = T({ text: 'Summer Reading Club Returns', font: 'Old Standard TT', size: 18, fill: '#222222', effect: 'solid', bold: true, align: 'left' }); h2.set({ left: px(12.7), top: px(186) }); h2.wrap = false; canvas.add(h2);
        ins.article(PC.SAMPLE[1], { at: [12.7, 196], w: p.w - 25.4, h: p.h - 196 - 14, cols: 2 });
        await ins.clip('book', { size: 0.12, at: { x: px(p.w - 34), y: px(222) } });
        PC.flow(canvas, PC.cur);
      });
    }
  };

  // Business forms: tables with headings, lines to write on, and a company header.
  PC.formExample = async function (form, p, { T, put, add, fit }) {
    const today = new Date().toLocaleDateString();
    const tbl = (o, x, y) => { const t = PC.buildTable(PC.defaultTable(o)); t.set({ left: px(x), top: px(y) }); canvas.add(t); return t; };
    const text = (s, o, x, y, center) => { const t = new fabric.IText(s, { fontFamily: fam('Libre Baskerville'), fontSize: ptPx(9), fill: '#333333', lineHeight: 1.35, kind: 'text', wrap: true, ...o }); if (center) add(t, x, y); else { t.set({ left: px(x), top: px(y) }); canvas.add(t); } return t; };
    const line = (x, y, w, o = {}) => { const l = PC.buildShape({ type: 'line', w, h: 0, stroke: o.color || '#555555', sw: o.sw || 0.3, dash: !!o.dash }); l.set({ left: px(x), top: px(y) }); canvas.add(l); return l; };
    const head = (y = 14) => {
      const t = T({ text: 'Maple Street Bakery', font: 'Playfair Display', size: 22, fill: '#c2185b', effect: 'solid', align: 'left' }); t.set({ left: px(16), top: px(y) }); t.wrap = false; canvas.add(t);
      text('12 Maple Street · Springfield · (555) 010-0177 · hello@example.com', { fontSize: ptPx(8) }, 16.3, y + 11);
    };
    const W = p.w - 32;
    if (form === 'invoice') {
      head();
      const inv = T({ text: 'INVOICE', font: 'Oswald', size: 28, fill: '#222222', effect: 'solid', align: 'right' }); inv.set({ left: px(p.w - 16) - inv.width, top: px(13) }); canvas.add(inv);
      tbl({ text: `Invoice no. | Date\n0001 | ${today}`, cols: [50, 50], w: 70, right: [], headFill: '#555555' }, p.w - 86, 40);
      text('Bill to', { fontWeight: 'bold' }, 16, 40);
      [0, 1, 2].forEach((n) => line(16, 52 + n * 7, 80));
      tbl({ text: 'Description | Qty | Unit price | Amount' + '\n | | | '.repeat(14), cols: [55, 12, 16, 17], w: W, rowH: 8, stripe: '#f8f4ec' }, 16, 80);
      tbl({ text: 'Subtotal | \nTax | \nTotal | ', cols: [55, 45], w: 70, header: false, rowH: 8, right: [1] }, p.w - 86, 80 + 8 * 15 + 4);
      text('Thank you for your business!', { fontStyle: 'italic', fontSize: ptPx(11), fill: '#c2185b' }, p.w / 2, p.h - 18, true);
    } else if (form === 'order') {
      head();
      const t = T({ text: 'ORDER FORM', font: 'Oswald', size: 26, fill: '#222222', effect: 'solid', align: 'right' }); t.set({ left: px(p.w - 16) - t.width, top: px(13) }); canvas.add(t);
      tbl({ text: 'Name | \nAddress | \nPhone | \nEmail | \nDate | ' + today, cols: [22, 78], w: W, header: false, rowH: 8 }, 16, 40);
      tbl({ text: 'Item no. | Description | Qty | Price | Total' + '\n | | | | '.repeat(16), cols: [14, 46, 10, 15, 15], w: W, rowH: 8, stripe: '#f8f4ec' }, 16, 88);
      tbl({ text: 'Order total | ', cols: [55, 45], w: 70, header: false, rowH: 9, right: [1] }, p.w - 86, 88 + 8 * 17 + 4);
    } else if (form === 'fax') {
      head();
      put(fit({ text: 'FAX', font: 'Bungee', size: 60, fill: '#c2185b', shade: '#222222', effect: 'shadow', depth: 1 }, p, 0.5), p.w / 2, 58);
      tbl({ text: 'To | \nFax number | \nFrom | \nFax number | \nPhone | \nDate | ' + today + '\nPages (with this one) | \nAbout | ', cols: [30, 70], w: W, header: false, rowH: 10 }, 16, 80);
      text('Comments', { fontWeight: 'bold', fontSize: ptPx(11) }, 16, 172);
      for (let n = 0; n < 9; n++) line(16, 186 + n * 9, W);
    } else if (form === 'memo') {
      head();
      const t = T({ text: 'Memo', font: 'Playfair Display', size: 44, fill: '#222222', effect: 'solid', align: 'left', bold: true }); t.set({ left: px(16), top: px(36) }); canvas.add(t);
      tbl({ text: 'To: | \nFrom: | \nDate: | ' + today + '\nSubject: | ', cols: [18, 82], w: W, header: false, rowH: 10, grid: 'rows', lw: 0.25, font: 'Libre Baskerville', size: 11 }, 16, 62);
      line(16, 110, W, { color: '#c2185b', sw: 0.8 });
      text('Write your message here.', { fontSize: ptPx(11) }, 16, 118);
    } else { // two receipts per page
      for (const y0 of [0, p.h / 2]) {
        const t = T({ text: 'RECEIPT', font: 'Oswald', size: 22, fill: '#c2185b', effect: 'solid', align: 'left' }); t.set({ left: px(16), top: px(y0 + 14) }); t.wrap = false; canvas.add(t);
        text('Maple Street Bakery · 12 Maple Street · (555) 010-0177', { fontSize: ptPx(8) }, 16.3, y0 + 26);
        tbl({ text: 'Date | Receipt no.\n | ', cols: [50, 50], w: 70, headFill: '#555555', right: [] }, p.w - 86, y0 + 14);
        text('Received from', {}, 16, y0 + 40); line(44, y0 + 45, W - 28);
        tbl({ text: 'For | Amount' + '\n | '.repeat(4) + '\nTotal | ', cols: [75, 25], w: W, rowH: 8, right: [1] }, 16, y0 + 52);
        text('Paid by:  ☐ Cash   ☐ Check   ☐ Card', {}, 16, y0 + 106); text('Signed', {}, p.w / 2 + 6, y0 + 106); line(p.w / 2 + 22, y0 + 111, W / 2 - 22);
      }
      line(8, p.h / 2, p.w - 16, { dash: true, color: '#9aa1ad' });
      text('✂', { fontSize: ptPx(12), fill: '#9aa1ad' }, 8, p.h / 2 - 3.5, true);
    }
  };

  // ------------------------------------------------------------------ files
  let fileName = null;
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  async function save(as) {
    if (!PC.doc) return;
    let name = fileName;
    if (as || !name) { name = prompt('Save as', (PC.doc.name || 'My project') + '.presscraft.json'); if (!name) return; if (!/\.json$/i.test(name)) name += '.presscraft.json'; }
    fileName = name; PC.doc.name = name.replace(/\.presscraft\.json$|\.json$/i, '');
    download(new Blob([PC.snapshot()], { type: 'application/json' }), name);
    PC.dirty = false; status(); toast('Saved ' + name);
  }
  async function openDoc(d) {
    if (!d || d.app !== 'PressCraft' || !Array.isArray(d.panels)) throw new Error('This is not a PressCraft project.');
    PC.doc = d; Object.keys(thumbs).forEach((k) => delete thumbs[k]);
    await PC.loadPanel(0);
    PC.resetHistory();
    d.panels.forEach((_, i) => thumb(i));
    $('start').hidden = true;
  }
  $('open-input').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { await openDoc(JSON.parse(await f.text())); fileName = f.name; toast('Opened ' + f.name); } catch (err) { info('Could not open', `<p>${esc(err.message)}</p>`); }
  };

  const openPrint = () => PC.openPrint();

  // ------------------------------------------------------------------ help
  const helpHtml = `
    <h3>1. Pick a project</h3><p>Cards, postcards, labels with mail merge, CD/DVD labels, flyers, signs, brochures, banners, newsletters, stationery sets, letterhead, business cards, business forms, certificates or calendars. Choose the paper, the look (modern or retro) and whether to start from an example.</p>
    <h3>2. Design each page</h3><p>Cards have four panels (front, inside left, inside right, back); click them in the <b>Pages</b> list. Add titles, text, pictures, borders and Screen Magic patterns from the <b>Insert</b> tab and the side panel. Click anything to change it on the right.</p>
    <h3>3. Titles</h3><p>Titles come in solid, outline, shadow and 3-D styles, like the classic Print Shop messages. Drag the corners to make them bigger.</p>
    <h3>4. Newsletters</h3><p>Write stories in the <b>Copy desk</b> on the right. A story fills its columns and runs on into the next frame (<b>Continue on this page</b> or <b>next page</b>); “▼ more text” means it does not fit yet. Pictures with “text flows around this” push the words aside.</p>
    <h3>5. Retro look</h3><p>Switch on <b>Retro</b> on the Page tab for the chunky dot-matrix look in black and white or the eight-colour ribbon. Your design stays sharp underneath.</p>
    <h3>Mailing labels</h3><p>Type or paste addresses on the right (click an empty part of the label), with an empty line between them. Each address prints on its own label in the address block; choose where to start on a partly used sheet.</p>
    <h3>Print quality, paper and files</h3><p>In <b>Print</b>, choose the quality (150 to 600 DPI as pictures, 1200 to 4800 DPI as sharp vectors) and the paper or media; each media type comes with tips, and iron-on transfers print mirrored. Save as a PDF, PNG, JPEG or SVG file to use in other programs, and use <b>Bring in pictures</b> to add pictures from your computer.</p>
    <h3>6. Print</h3><p><b>Print</b> shows exactly what comes out. Cards are turned and placed so they fold correctly; banners are split across pages to trim and tape together. Choose margins None and scale 100%.</p>`;
  const keysHtml = `<table class="keys">${[['New project', 'Ctrl+N'], ['Open', 'Ctrl+O'], ['Save', 'Ctrl+S'], ['Print', 'Ctrl+P'], ['Undo / Redo', 'Ctrl+Z / Ctrl+Y'], ['Cut / Copy / Paste', 'Ctrl+X / C / V'], ['Duplicate', 'Ctrl+D'], ['Select all', 'Ctrl+A'], ['Delete', 'Delete'], ['Nudge 1 mm / 5 mm', 'Arrows / Shift+Arrows'], ['Zoom in / out / fit', '+ / − / 0'], ['Search commands', 'Alt+Q'], ['All menus', 'F10']].map(([a, b]) => `<tr><td>${a}</td><td style="text-align:right;padding-left:20px">${b}</td></tr>`).join('')}</table>`;
  const aboutHtml = `<p><b>PressCraft</b> · version 0.2</p><p>Greeting cards, signs, letterhead, banners, calendars and newsletters in your browser, inspired by the classic home-printing programs of the 1980s. All pictures, borders and patterns are original PressCraft artwork.</p><p>Built with <a href="https://fabricjs.com" target="_blank" rel="noopener">Fabric.js</a> 5.3 (MIT). Fonts from Google Fonts (SIL Open Font License), stored with the app so it works offline.</p>`;
  PC.ui.help = () => info('How to use PressCraft', helpHtml);

  // ------------------------------------------------------------------ menus, ribbon and title bar
  const sel = () => !!active();
  const isKind = (k) => kindOf(active()) === k;
  const THEME_KEY = 'presscraft-theme';
  const getTheme = () => document.documentElement.dataset.theme || 'system';
  function setTheme(t) { if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  try { const t = localStorage.getItem(THEME_KEY); if (t) setTheme(t); } catch (e) {}
  // Light / dark switch in the top bar (like the other Craft apps).
  const themeIsDark = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  const THEME_BTN = document.createElement('button');
  THEME_BTN.className = 'btn theme-btn'; THEME_BTN.type = 'button';
  const paintTheme = () => {
    const dark = themeIsDark();
    THEME_BTN.title = dark ? 'Switch to light' : 'Switch to dark'; THEME_BTN.setAttribute('aria-label', THEME_BTN.title);
    THEME_BTN.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/></svg>';
  };
  THEME_BTN.onclick = () => { setTheme(themeIsDark() ? 'light' : 'dark'); paintTheme(); };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintTheme);
  paintTheme();
  const setRetro = (on, mode) => { if (!PC.doc) return; PC.doc.retro = on; if (mode) PC.doc.retroMode = mode; drawRetro(); canvas.requestRenderAll(); PC.changed(); showProps(); status(); };
  const zoomBy = (k) => { autoFit = false; setZoom(PC.zoom * k); };
  const MENUS = [
    ['File', [
      { label: 'New project…', key: 'Ctrl+N', run: showStart },
      { label: 'Open…', key: 'Ctrl+O', run: () => $('open-input').click() },
      { label: 'Save', key: 'Ctrl+S', run: () => save(false), disabled: () => !PC.doc },
      { label: 'Save as…', run: () => save(true), disabled: () => !PC.doc },
      '-',
      { label: 'Print…', key: 'Ctrl+P', run: openPrint, disabled: () => !PC.doc },
      { label: 'Save as PDF or pictures…', run: openPrint, disabled: () => !PC.doc },
      { label: 'Bring in pictures…', run: () => $('image-input').click(), disabled: () => !PC.doc },
    ]],
    ['Edit', [
      { label: 'Undo', key: 'Ctrl+Z', run: PC.undo, disabled: () => !PC.canUndo() },
      { label: 'Redo', key: 'Ctrl+Y', run: PC.redo, disabled: () => !PC.canRedo() },
      '-',
      { label: 'Cut', key: 'Ctrl+X', run: () => copy(del), disabled: () => !sel() },
      { label: 'Copy', key: 'Ctrl+C', run: () => copy(), disabled: () => !sel() },
      { label: 'Paste', key: 'Ctrl+V', run: paste, disabled: () => !clipboard },
      { label: 'Duplicate', key: 'Ctrl+D', run: dup, disabled: () => !sel() },
      { label: 'Delete', key: 'Del', run: del, disabled: () => !sel() },
      { label: 'Select all', key: 'Ctrl+A', run: selectAll },
    ]],
    ['Insert', [
      { label: 'Title', run: () => ins.title() },
      { label: 'Text', run: () => ins.text() },
      { label: 'Picture…', run: () => showTab('art') },
      { label: 'My own picture…', run: () => $('image-input').click() },
      { label: 'Border…', run: () => showTab('borders') },
      { label: 'Screen Magic…', run: () => showTab('magic') },
      '-',
      { label: 'Text box', run: () => ins.textbox() },
      { label: 'Curved text', run: () => ins.curve('up') },
      { heading: 'Shapes' },
      { label: 'Box', run: () => ins.shape('rect') },
      { label: 'Rounded box', run: () => ins.shape('rounded') },
      { label: 'Circle', run: () => ins.shape('ellipse') },
      { label: 'Triangle', run: () => ins.shape('triangle') },
      { label: 'Diamond', run: () => ins.shape('diamond') },
      { label: 'Pentagon', run: () => ins.shape('pentagon') },
      { label: 'Hexagon', run: () => ins.shape('hexagon') },
      { label: 'Octagon', run: () => ins.shape('octagon') },
      { label: 'Star shape', run: () => ins.shape('star') },
      { label: 'Arrow', run: () => ins.shape('arrow') },
      { label: 'Line', run: () => ins.shape('line') },
      '-',
      { label: 'Calendar month', run: () => ins.calendar() },
      { label: 'Newspaper story', run: () => ins.article() },
      { label: 'Table', run: () => ins.table() },
      { label: 'Tear-off tabs', run: () => ins.tabs() },
      { label: 'Address block (mail merge)', run: () => ins.address() },
      { label: 'Continue the story on the next page', run: () => continueStory('next'), disabled: () => !isKind('art') },
    ]],
    ['Arrange', [
      { label: 'Bring to front', run: () => order(true), disabled: () => !sel() },
      { label: 'Bring forward', run: () => step(true), disabled: () => !sel() },
      { label: 'Send backward', run: () => step(false), disabled: () => !sel() },
      { label: 'Send to back', run: () => order(false), disabled: () => !sel() },
      { label: 'Centre across the page', run: () => centre('h'), disabled: () => !sel() },
      { label: 'Centre up and down', run: () => centre('v'), disabled: () => !sel() },
      '-',
      { heading: 'Picture layouts' },
      { label: 'One big', run: () => layout('big'), disabled: () => !sel() },
      { label: 'Row of three', run: () => layout('row'), disabled: () => !sel() },
      { label: 'Tiled', run: () => layout('tiled'), disabled: () => !sel() },
      { label: 'Staggered', run: () => layout('stagger'), disabled: () => !sel() },
      { label: 'Four corners', run: () => layout('corners'), disabled: () => !sel() },
    ]],
    ['Page', [
      { heading: 'Look' },
      { label: 'Modern', run: () => setRetro(false), checked: () => !!PC.doc && !PC.doc.retro },
      { label: 'Retro black and white', run: () => setRetro(true, 'bw'), checked: () => !!PC.doc && PC.doc.retro && PC.doc.retroMode !== 'color' },
      { label: 'Retro colour ribbon', run: () => setRetro(true, 'color'), checked: () => !!PC.doc && PC.doc.retro && PC.doc.retroMode === 'color' },
      '-',
      { label: 'Add a page', run: () => addPage(true), disabled: () => !PC.doc || PC.doc.kind !== 'newsletter' },
      { label: 'Delete this page', run: delPage, disabled: () => !PC.doc || PC.doc.kind !== 'newsletter' || PC.doc.panels.length < 2 },
      { label: 'Next page', key: 'PgDn', run: () => PC.doc && goPanel(Math.min(PC.doc.panels.length - 1, PC.cur + 1)) },
      { label: 'Previous page', key: 'PgUp', run: () => PC.doc && goPanel(Math.max(0, PC.cur - 1)) },
    ]],
    ['View', [
      { label: 'Zoom in', key: '+', run: () => zoomBy(1.25) },
      { label: 'Zoom out', key: '−', run: () => zoomBy(0.8) },
      { label: 'Fit the page', key: '0', run: () => { autoFit = true; fitZoom(); } },
      '-',
      { heading: 'Theme' },
      { label: 'Match system', run: () => { setTheme('system'); paintTheme(); }, checked: () => getTheme() === 'system' },
      { label: 'Light', run: () => { setTheme('light'); paintTheme(); }, checked: () => getTheme() === 'light' },
      { label: 'Dark', run: () => { setTheme('dark'); paintTheme(); }, checked: () => getTheme() === 'dark' },
    ]],
    ['Help', [
      { label: 'How to use PressCraft', run: PC.ui.help },
      { label: 'Keyboard shortcuts', run: () => info('Keyboard shortcuts', keysHtml) },
      { label: 'About PressCraft', run: () => info('About PressCraft', aboutHtml) },
    ]],
  ];

  const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="pc-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59a23"/><stop offset=".55" stop-color="#e0457b"/><stop offset="1" stop-color="#c2185b"/></linearGradient></defs><rect x="1" y="1" width="38" height="38" rx="11" fill="url(#pc-g)"/><path d="M10 10h15l5 5v15H10Z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M14 16h7M14 20.5h12M14 25h12" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M31 6.5l1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1Z" fill="#ffe066"/></svg>`;
  $('start-logo').innerHTML = LOGO;
  const I = window.CraftIcons;
  const item = (start) => MENUS.flatMap((m) => m[1]).find((it) => it && it.label && it.label.startsWith(start)) || {};
  const C = (start, label, icon, o = {}) => { const it = item(start); return { label: label || it.label, icon, key: it.key, run: () => it.run && it.run(), pressed: it.checked, disabled: it.disabled, ...o }; };
  const ico = { iconOnly: true };
  const SH = { rect: '<path d="M0 0L18 0L18 16L0 16Z" transform="translate(3 4)"/>', rounded: '<path d="M0 2.4Q0 0 2.4 0L15.6 0Q18 0 18 2.4L18 13.6Q18 16 15.6 16L2.4 16Q0 16 0 13.6Z" transform="translate(3 4)"/>', ellipse: '<path d="M0 8A9 8 0 1 0 18 8A9 8 0 1 0 0 8Z" transform="translate(3 4)"/>', triangle: '<path d="M9 0L18 16L0 16Z" transform="translate(3 4)"/>', diamond: '<path d="M9 0L18 8L9 16L0 8Z" transform="translate(3 4)"/>', pentagon: '<path d="M9 0L17.56 5.53L14.29 14.47L3.71 14.47L0.44 5.53Z" transform="translate(3 4)"/>', hexagon: '<path d="M18 8L13.5 14.93L4.5 14.93L0 8L4.5 1.07L13.5 1.07Z" transform="translate(3 4)"/>', octagon: '<path d="M12.44 0.61L17.31 4.94L17.31 11.06L12.44 15.39L5.56 15.39L0.69 11.06L0.69 4.94L5.56 0.61Z" transform="translate(3 4)"/>', star: '<path d="M9 0L11.38 5.09L17.56 5.53L12.85 9.11L14.29 14.47L9 11.6L3.71 14.47L5.15 9.11L0.44 5.53L6.62 5.09Z" transform="translate(3 4)"/>', arrow: '<path d="M0 4.8L10.8 4.8L10.8 0L18 8L10.8 16L10.8 11.2L0 11.2Z" transform="translate(3 4)"/>' };
  const IC = {
    title: '<path d="M4 7V5h16v2M12 5v14M8 19h8"/><path d="M15 12h5M17.5 12v7" class="hue"/>',
    bold: '<text x="12" y="17.5" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="17" font-weight="800" fill="currentColor" stroke="none">B</text>',
    italic: '<path d="M10 5h6M8 19h6M14 5l-4 14"/>', underline: '<path d="M7.5 4v6.5a4.5 4.5 0 0 0 9 0V4M6 20h12"/>',
    left: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>', center: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>', right: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>', justify: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
    grow: '<path d="M3 19 8 6l5 13M4.8 14.5h6.4M17.5 4v6M14.5 7h6"/>', shrink: '<path d="M3 19 8 6l5 13M4.8 14.5h6.4M14.5 7h6"/>',
    border: '<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="6.5" y="6.5" width="11" height="11" stroke-dasharray="2 1.6" class="hue"/>',
    magic: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" class="hue"/>',
    story: '<path d="M4 5h7v14H4zM13 5h7M13 9h7M13 13h7M13 17h7"/>', star: '<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.3 9.2l6.1-.6z"/>',
    retro: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M7 8h2v2H7zM11 8h2v2h-2zM15 8h2v2h-2zM9 12h2v2H9zM13 12h2v2h-2z" class="hue"/><path d="M8 20h8"/>',
    rowL: '<rect x="2" y="9" width="5" height="6"/><rect x="9.5" y="9" width="5" height="6"/><rect x="17" y="9" width="5" height="6"/>',
    tiled: '<rect x="3" y="3" width="5" height="5"/><rect x="10" y="3" width="5" height="5"/><rect x="17" y="3" width="4" height="5"/><rect x="3" y="10" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/><rect x="17" y="10" width="4" height="5"/><rect x="3" y="17" width="5" height="4"/><rect x="10" y="17" width="5" height="4"/><rect x="17" y="17" width="4" height="4"/>',
    stagger: '<rect x="3" y="3" width="5" height="5"/><rect x="15" y="3" width="5" height="5"/><rect x="9" y="10" width="5" height="5"/><rect x="3" y="17" width="5" height="4"/><rect x="15" y="17" width="5" height="4"/>',
    corners: '<rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><rect x="16" y="16" width="5" height="5"/><rect x="2" y="2" width="20" height="20" rx="1" stroke-dasharray="2 2"/>',
    big: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
    pageAdd: '<path d="M6 3h8l4 4v14H6Z"/><path d="M12 11v6M9 14h6" class="hue"/>',
    strike: '<path d="M16 7.5C15.2 6 13.8 5 12 5c-2.2 0-4 1.2-4 3 0 1.3.8 2 2 2.6M4.5 12h15M8 16.5c.9 1.6 2.4 2.5 4.2 2.5 2.4 0 4.3-1.3 4.3-3.2 0-.6-.2-1.2-.5-1.6"/>',
    sub: '<path d="M4 6l7 9M11 6l-7 9M14.5 16.5c0-1.2 3-1.2 3 .2 0 1.2-3 1.7-3 3.3h3.2"/>', sup: '<path d="M4 9l7 9M11 9l-7 9M14.5 5.5c0-1.2 3-1.2 3 .2 0 1.2-3 1.7-3 3.3h3.2"/>',
    clear: '<path d="M5 17 10 5l3.5 8.5M7 12.5h5"/><path d="m13 18 5-5 3 3-3 3h-3.5Z" class="hue"/>',
    shadow: '<path d="M6 16 11 4l5 12M7.8 11.5h6.4"/><path d="M8 19.5h9.5L14.5 12" opacity=".45"/>', outline: '<path d="M6 17 12 4l6 13M8.5 12.5h7" stroke-dasharray="2 1.5"/>',
    bullets: '<circle cx="5" cy="7" r="1.3" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="5" cy="17" r="1.3" fill="currentColor" stroke="none"/><path d="M9 7h11M9 12h11M9 17h11"/>',
    numbers: '<path d="M3.5 4.5h1.5V9M3.5 9h3M3.5 14.3c0-1 2.8-1 2.8.4 0 1-2.8 1.6-2.8 3.1h3M10 7h10M10 12h10M10 17h10"/>',
    curveUp: '<path d="M4 17a8 8 0 0 1 16 0"/><path d="M7.2 10.6 6 9.2M12 9V7M16.8 10.6 18 9.2" class="hue"/>',
    curveDown: '<path d="M4 7a8 8 0 0 0 16 0"/><path d="M7.2 13.4 6 14.8M12 15v2M16.8 13.4 18 14.8" class="hue"/>',
    textbox: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7 9h10M7 12.5h10M7 16h6" class="hue"/>',
    tabs: '<path d="M3 4h18v9H3z"/><path d="M6 13v7M10 13v7M14 13v7M18 13v7" stroke-dasharray="2 1.5" class="hue"/>',
  };
  const FONT_BOX = document.createElement('div'); FONT_BOX.className = 'pc-font';
  FONT_BOX.style.cssText = 'display:flex;gap:4px;align-items:center';
  FONT_BOX.innerHTML = `<select class="input" style="height:25px;width:150px;font-size:12px" aria-label="Font" title="Font">${FONTS.map((f) => `<option style="font-family:${fam(f)}">${f}</option>`).join('')}</select><input class="input" type="number" min="4" step="1" style="height:25px;width:56px;font-size:12px" aria-label="Size (pt)" title="Size (pt)">`;
  FONT_BOX.querySelector('select').onchange = (e) => format({ font: e.target.value });
  FONT_BOX.querySelector('input').onchange = (e) => format({ size: Math.max(4, +e.target.value || 12) });
  // Colour buttons with a palette (Word style), and drop-down buttons for case, spacing and symbols.
  const PALETTE = ['#000000', '#404040', '#7f7f7f', '#bfbfbf', '#ffffff', '#e8483f', '#f59a23', '#f5c518', '#2e9b4f', '#138a9e', '#3f8be8', '#7b4fd6', '#c2185b', '#8b5a2b',
    '#fff176', '#a5f3a1', '#9be7ff', '#ffb3d9', '#ffcc80', '#d9d9d9', '#b3c7ff'];
  let pop = null;
  const closePop = () => { if (pop) { pop.remove(); pop = null; } };
  document.addEventListener('mousedown', (e) => { if (pop && !pop.contains(e.target) && !e.target.closest('.pc-pop-btn')) closePop(); });
  function popAt(b, html, onClick) {
    if (pop) { closePop(); return null; }
    pop = document.createElement('div'); pop.className = 'pc-pop'; pop.innerHTML = html;
    pop.addEventListener('mousedown', (e) => { if (!e.target.matches('input')) e.preventDefault(); });
    pop.onclick = onClick;
    document.body.append(pop);
    const r = b.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(innerWidth - 230, r.left)) + 'px'; pop.style.top = (r.bottom + 4) + 'px';
    return pop;
  }
  function iconButton(label, icon, extra) {
    const b = document.createElement('button');
    b.className = 'crb-small crb-icon pc-pop-btn'; b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${extra || ''}`;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    return b;
  }
  function colorButton(label, icon, start, none, apply) {
    const b = iconButton(label, icon, '<i class="pc-bar"></i>'), bar = b.querySelector('.pc-bar');
    bar.style.background = start;
    const pick = (c) => { closePop(); if (c) bar.style.background = c; apply(c); };
    b.onclick = () => {
      const p = popAt(b, `<h6>${label}</h6><div class="sw">${PALETTE.map((c) => `<button type="button" title="${c}" data-c="${c}" style="background:${c}"></button>`).join('')}</div><div class="act">${none ? '<button type="button" data-none>None</button>' : ''}<label>More colours…<input type="color"></label></div>`,
        (e) => { const s2 = e.target.closest('[data-c]'); if (s2) pick(s2.dataset.c); if (e.target.closest('[data-none]')) pick(''); });
      if (p) p.querySelector('input').onchange = (e) => pick(e.target.value);
    };
    return b;
  }
  function menuButton(label, icon, options, apply) {
    const b = iconButton(label, icon, '<i class="pc-caret"></i>');
    b.classList.add('has-caret');
    b.onclick = () => {
      const p = popAt(b, `<h6>${label}</h6><div class="list">${options.map(([v, n]) => `<button type="button" data-v="${esc(v)}">${n}</button>`).join('')}</div>`, (e) => { const x = e.target.closest('[data-v]'); if (x) { closePop(); apply(x.dataset.v); } });
      if (p && options.length > 12) p.querySelector('.list').style.cssText = 'grid-template-columns:repeat(6,1fr)';
    };
    return b;
  }
  const COLOR_TEXT = colorButton('Text colour', '<path d="M7 15 12 3l5 12M8.7 11h6.6"/>', '#e8483f', false, (c) => format({ fill: c }));
  const COLOR_HL = colorButton('Highlight', '<path d="m7 14 7-7 3 3-7 7H7Z"/><path d="m14 7 2-2 3 3-2 2"/>', '#fff176', true, (c) => format({ highlight: c }));
  const COLOR_LINE = colorButton('Outline colour', '<path d="M7 15 12 3l5 12M8.7 11h6.6" stroke-dasharray="2 1.5"/>', '#222222', true, (c) => { if (c) { lastOutline = c; format({ outlineColor: c }); } else format({ outline: false }); });
  const CASE_BTN = menuButton('Change case', '<text x="11.5" y="16.5" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="currentColor" stroke="none">Aa</text>',
    [['upper', 'UPPERCASE'], ['lower', 'lowercase'], ['title', 'Title Case'], ['sentence', 'Sentence case']], changeCase);
  const LINE_BTN = menuButton('Line spacing', '<path d="M11 6h9M11 12h9M11 18h9M5 4v16M3 6.5 5 4l2 2.5M3 17.5 5 20l2-2.5"/>', [['0.9', 'Tight (0.9)'], ['1', 'Single (1.0)'], ['1.15', '1.15'], ['1.35', '1.35'], ['1.5', '1.5'], ['2', 'Double (2.0)']], (v) => format({ lead: +v }));
  const SPACE_BTN = menuButton('Letter spacing', '<path d="M5 13 8 5l3 8M6 10.5h4M13 5l3 8 3-8M3 18h18M5 16l-2 2 2 2M19 16l2 2-2 2"/>', [['-60', 'Tight'], ['0', 'Normal'], ['100', 'Wide'], ['250', 'Wider'], ['500', 'Widest']], (v) => format({ spacing: +v }));
  const SYMBOLS = '© ® ™ ° ± × ÷ ½ ¼ ¾ € £ ¥ ¢ § ¶ • … → ← ↑ ↓ ✓ ✗ ★ ☆ ♥ ☎ ✉ ⚠ ♻ ✂ ☀ ☂ ♪ ♫ ∞ ≤ ≥ ≠'.split(/\s+/);
  const SYMBOL_BTN = menuButton('Insert a symbol or the date', '<path d="M17 17.5A7 7 0 1 1 19 12v1.5a2 2 0 0 1-4 0V8"/><circle cx="12" cy="12" r="3"/>',
    [['date', 'Today’s date'], ['time', 'The time'], ...SYMBOLS.map((c) => [c, c])],
    (v) => { const now = new Date(); insertText(v === 'date' ? now.toLocaleDateString() : v === 'time' ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : v); });
  const syncFontBox = () => { const f = current('font'), s2 = current('size'); const sl = FONT_BOX.querySelector('select'), si = FONT_BOX.querySelector('input'); if (document.activeElement !== sl && f) sl.value = f; if (document.activeElement !== si) si.value = s2 ?? ''; };
  canvas.on('selection:created', syncFontBox); canvas.on('selection:updated', syncFontBox);
  const toggleL = document.createElement('button'); toggleL.className = 'crb-small'; toggleL.textContent = 'Side panel'; toggleL.onclick = () => $('app').querySelector('.work').classList.toggle('show-left');
  const toggleR = document.createElement('button'); toggleR.className = 'crb-small'; toggleR.textContent = 'Properties'; toggleR.onclick = () => $('app').querySelector('.work').classList.toggle('show-right');
  const st = document.createElement('style');
  st.textContent = '.crb .crb-small.pc-toggle { display: none; } @media (max-width: 980px) { .crb .crb-small.pc-toggle { display: inline-flex; } }';
  document.head.append(st); toggleL.classList.add('pc-toggle'); toggleR.classList.add('pc-toggle');
  const has = (k) => () => !isKind(k);
  const ribbon = window.CraftRibbon({
    mount: $('app'), storageKey: 'presscraft', extraEls: [toggleL, toggleR],
    tabs: [
      { id: 'home', label: 'Home', hue: '#c2185b', groups: [
        ['Project', [C('New project', 'New project', I.newPage, { big: true }), { col: [C('Open', 'Open…', I.folder), C('Save', 'Save', I.save), C('Print', 'Print…', I.print)] }]],
        ['Clipboard', [C('Paste', 'Paste', I.paste, { big: true }), { col: [C('Cut', 'Cut', I.cut), C('Copy', 'Copy', I.copy), C('Duplicate', 'Duplicate', I.duplicate)] }]],
        ['Edit', [{ col: [C('Undo', 'Undo', I.undo), C('Redo', 'Redo', I.redo), C('Delete', 'Delete', I.trash)] }]],
        ['Help', [C('How to use', 'How to use PressCraft', I.help, { big: true })]],
      ] },
      { id: 'insert', label: 'Insert', hue: '#e07a1f', groups: [
        ['Words', [C('Title', 'Title', IC.title, { big: true, title: 'A big title with outline, shadow or 3-D' }), C('Text', 'Text', I.text, { big: true, title: 'Simple text you can type anywhere' }), C('Text box', 'Text box', IC.textbox, { big: true, title: 'Words in a box that wrap, with a border, background, padding and shadow' })]],
        ['Pictures', [C('Picture…', 'Picture', I.picture, { big: true, title: 'Choose from the PressCraft picture library' }), { col: [C('My own picture', 'My own picture', I.import), C('Border', 'Border', IC.border), C('Screen Magic', 'Screen Magic', IC.magic)] }]],
        ['Shapes', [{ col: [
          { row: [C('Box', 'Box', SH.rect, ico), C('Rounded box', 'Rounded box', SH.rounded, ico), C('Circle', 'Circle', SH.ellipse, ico), C('Triangle', 'Triangle', SH.triangle, ico), C('Diamond', 'Diamond', SH.diamond, ico)] },
          { row: [C('Pentagon', 'Pentagon', SH.pentagon, ico), C('Hexagon', 'Hexagon', SH.hexagon, ico), C('Octagon', 'Octagon', SH.octagon, ico), C('Star shape', 'Star', SH.star, ico), C('Arrow', 'Arrow', SH.arrow, ico), C('Line', 'Line', I.line, ico)] }] }]],
        ['Special', [C('Calendar month', 'Calendar', I.calendar, { big: true }), C('Newspaper story', 'Newspaper story', IC.story, { big: true, title: 'Text in columns that flows from frame to frame and around pictures' }),
          C('Table', 'Table', I.table, { big: true, title: 'A table for invoices, order forms and lists' }), { col: [C('Tear-off tabs', 'Tear-off tabs', IC.tabs), C('Address block', 'Address block', I.mail)] }]],
      ] },
      { id: 'text', label: 'Text', hue: '#2f6fdd', groups: [
        ['Font', [{ col: [
          { row: [{ el: FONT_BOX }, { label: 'Bigger text', icon: IC.grow, iconOnly: true, run: () => stepSize(1) }, { label: 'Smaller text', icon: IC.shrink, iconOnly: true, run: () => stepSize(-1) }, '|', { el: CASE_BTN }, { label: 'Clear formatting', icon: IC.clear, iconOnly: true, run: clearFormat }] },
          { row: [{ label: 'Bold (Ctrl+B)', icon: IC.bold, iconOnly: true, run: () => format({ bold: !current('bold') }), pressed: () => !!current('bold') }, { label: 'Italic (Ctrl+I)', icon: IC.italic, iconOnly: true, run: () => format({ italic: !current('italic') }), pressed: () => !!current('italic') },
            { label: 'Underline (Ctrl+U)', icon: IC.underline, iconOnly: true, run: () => format({ underline: !current('underline') }), pressed: () => !!current('underline') }, { label: 'Strikethrough', icon: IC.strike, iconOnly: true, run: () => format({ strike: !current('strike') }), pressed: () => !!current('strike') },
            { label: 'Subscript', icon: IC.sub, iconOnly: true, run: () => setScript(1), pressed: () => !!current('sub') }, { label: 'Superscript', icon: IC.sup, iconOnly: true, run: () => setScript(-1), pressed: () => !!current('sup') }, '|',
            { el: COLOR_TEXT }, { el: COLOR_HL }, '|', { label: 'Shadow', icon: IC.shadow, iconOnly: true, run: () => format({ shadow: !current('shadow') }), pressed: () => !!current('shadow') },
            { label: 'Outline', icon: IC.outline, iconOnly: true, run: () => format({ outline: !current('outline') }), pressed: () => !!current('outline') }, { el: COLOR_LINE }] }] }]],
        ['Paragraph', [{ col: [
          { row: [{ label: 'Bullets', icon: IC.bullets, iconOnly: true, run: () => toggleList('bullets'), pressed: () => !!active() && listState((TEXT_OF[kindOf(active())] || ((o) => o.text || ''))(active())) === 'bullets' },
            { label: 'Numbering', icon: IC.numbers, iconOnly: true, run: () => toggleList('numbers'), pressed: () => !!active() && listState((TEXT_OF[kindOf(active())] || ((o) => o.text || ''))(active())) === 'numbers' }, '|', { el: LINE_BTN }, { el: SPACE_BTN }] },
          { row: [{ label: 'Align left', icon: IC.left, iconOnly: true, run: () => format({ align: 'left' }), pressed: () => current('align') === 'left' }, { label: 'Centre', icon: IC.center, iconOnly: true, run: () => format({ align: 'center' }), pressed: () => current('align') === 'center' },
            { label: 'Align right', icon: IC.right, iconOnly: true, run: () => format({ align: 'right' }), pressed: () => current('align') === 'right' }, { label: 'Justify', icon: IC.justify, iconOnly: true, run: () => format({ align: 'justify' }), pressed: () => current('align') === 'justify' }] }] }]],
        ['Text box', [{ col: [
          { row: [{ label: 'Put the words in a text box', icon: IC.textbox, iconOnly: true, run: textToBox }, { label: 'New text box', icon: IC.title, iconOnly: true, run: () => ins.textbox() }] },
          { row: [{ el: SYMBOL_BTN }, { label: 'Insert today’s date', icon: I.calendar, iconOnly: true, run: () => insertText(new Date().toLocaleDateString()) }] }] }]],
        ['Curved text', [{ label: 'Curve up', icon: IC.curveUp, big: true, title: 'Bend the words around a circle, along the top', run: () => ins.curve('up') },
          { label: 'Curve down', icon: IC.curveDown, big: true, title: 'Bend the words around a circle, along the bottom', run: () => ins.curve('down') },
          { col: [{ label: 'Turn left 15°', icon: I.rotL, run: () => isKind('arc') ? rebuildArc(active(), { pos: ((active().arc.pos - 15 + 540) % 360) - 180 }) : toast('Click curved text first.') },
            { label: 'Turn right 15°', icon: I.rotR, run: () => isKind('arc') ? rebuildArc(active(), { pos: ((active().arc.pos + 15 + 540) % 360) - 180 }) : toast('Click curved text first.') },
            { label: 'Straighten', icon: I.line, run: () => isKind('arc') ? straighten(active()) : toast('Click curved text first.') }] }]],
        ['Title styles', [{ col: PC.TITLE_EFFECTS.slice(0, 3).map(([v, n]) => ({ label: n, icon: IC.title, run: () => isKind('title') ? rebuildTitle(active(), { effect: v }) : toast('Select a title first.'), pressed: () => isKind('title') && active().title.effect === v })) },
          { col: PC.TITLE_EFFECTS.slice(3).map(([v, n]) => ({ label: n, icon: IC.title, run: () => isKind('title') ? rebuildTitle(active(), { effect: v }) : toast('Select a title first.'), pressed: () => isKind('title') && active().title.effect === v })) }]],
      ] },
      { id: 'arrange', label: 'Arrange', hue: '#1e9e8a', groups: [
        ['Order', [{ col: [C('Bring to front', 'Bring to front', I.front), C('Send to back', 'Send to back', I.back)] }, { col: [C('Bring forward', 'Bring forward', I.front), C('Send backward', 'Send backward', I.back)] }]],
        ['Centre', [{ col: [C('Centre across', 'Across the page', IC.center), C('Centre up', 'Up and down', IC.justify)] }]],
        ['Picture layouts', [C('One big', 'One big', IC.big, { big: true }), C('Row of three', 'Row', IC.rowL, { big: true }), C('Tiled', 'Tiled', IC.tiled, { big: true }), C('Staggered', 'Staggered', IC.stagger, { big: true }), C('Four corners', 'Corners', IC.corners, { big: true })]],
      ] },
      { id: 'page', label: 'Page', hue: '#7b4fd6', groups: [
        ['Look', [C('Modern', 'Modern', I.desktop, { big: true }), C('Retro black', 'Retro B&W', IC.retro, { big: true, title: '1980s dot-matrix look' }), C('Retro colour', 'Retro colour', IC.retro, { big: true, title: 'Eight-colour ribbon look' })]],
        ['Pages', [{ col: [C('Add a page', 'Add a page', IC.pageAdd), C('Delete this page', 'Delete page', I.trash)] }, { col: [C('Previous page', 'Previous page', I.prev), C('Next page', 'Next page', I.next)] }]],
        ['View', [{ col: [C('Zoom in', 'Zoom in', I.zoomIn), C('Zoom out', 'Zoom out', I.zoomOut), C('Fit the page', 'Fit the page', I.fit)] }]],
      ] },
      { id: 'output', label: 'Print', hue: '#138a9e', groups: [
        ['Print', [C('Print', 'Print…', I.print, { big: true, title: 'See the sheets, choose quality and paper, and print' }), C('Save as PDF', 'PDF or pictures', I.exportUp, { big: true, title: 'Save as a PDF, PNG, JPEG or SVG file' }), C('Bring in pictures', 'Bring in pictures', I.import, { big: true, title: 'Add pictures from your computer (several at once)' })]],
        ['File', [C('Save', 'Save', I.save, { big: true }), { col: [C('Save as', 'Save as…', I.save), C('Open', 'Open…', I.folder)] }]],
      ] },
    ],
  });
  const tb = window.CraftTitlebar({
    appName: 'PressCraft', storageKey: 'presscraft', colors: ['#e0457b', '#c2185b'], mount: $('app'), toast, logo: LOGO, menus: () => MENUS, ribbon,
    quick: [
      { icon: 'save', title: 'Save', key: 'Ctrl+S', run: () => save(false) },
      { icon: 'undo', title: 'Undo', key: 'Ctrl+Z', run: PC.undo, disabled: () => !PC.canUndo() },
      { icon: 'redo', title: 'Redo', key: 'Ctrl+Y', run: PC.redo, disabled: () => !PC.canRedo() },
      { icon: 'print', title: 'Print', key: 'Ctrl+P', run: openPrint },
      { icon: 'new', title: 'New project', run: showStart },
    ],
    getTitle: () => (PC.doc ? PC.doc.name : 'PressCraft'),
    getStatus: () => (PC.doc ? (PC.dirty ? { text: 'Not saved to a file yet', dirty: true } : { text: 'Autosaves in this browser' }) : { text: '' }),
    getInfo: () => (PC.doc ? [
      { text: PC.KINDS[PC.doc.kind].name, title: 'Project type' },
      { text: PC.doc.retro ? (PC.doc.retroMode === 'color' ? 'Retro colour' : 'Retro B&W') : 'Modern', title: 'Look (click to switch)', run: () => setRetro(!PC.doc.retro) },
    ] : []),
    rightEls: [THEME_BTN],
    onHelp: PC.ui.help,
  });
  window.__tb = tb;
  // The ribbon and title bar sit at the top of the app grid.
  const app = $('app'), work = app.querySelector('.work');
  app.prepend(ribbon.el); app.prepend(tb.el);
  const ic = document.createElement('link'); ic.rel = 'icon'; ic.href = 'data:image/svg+xml,' + encodeURIComponent(LOGO.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); document.head.append(ic);
  void work;

  // ------------------------------------------------------------------ keyboard
  document.addEventListener('keydown', (e) => {
    if (!$('setup').hidden || !$('info').hidden || !$('ask').hidden || !$('printdlg').hidden || !$('start').hidden) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || (active() && active().isEditing);
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 's') { e.preventDefault(); save(e.shiftKey); return; }
    if (mod && k === 'o') { e.preventDefault(); $('open-input').click(); return; }
    if (mod && k === 'p') { e.preventDefault(); openPrint(); return; }
    if (mod && k === 'n') { e.preventDefault(); showStart(); return; }
    if (mod && active() && (active().isEditing || !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) {
      const f = { b: () => format({ bold: !current('bold') }), i: () => format({ italic: !current('italic') }), u: () => format({ underline: !current('underline') }), ']': () => stepSize(1), '[': () => stepSize(-1) }[k];
      if (f && current('font') !== undefined) { e.preventDefault(); f(); return; }
    }
    if (typing || !PC.doc) return;
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? PC.redo() : PC.undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); PC.redo(); return; }
    if (mod && k === 'c') { e.preventDefault(); copy(); return; }
    if (mod && k === 'x') { e.preventDefault(); copy(del); return; }
    if (mod && k === 'v') { e.preventDefault(); paste(); return; }
    if (mod && k === 'd') { e.preventDefault(); dup(); return; }
    if (mod && k === 'a') { e.preventDefault(); selectAll(); return; }
    if (mod) return;
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); del(); return; }
    const step = e.shiftKey ? 5 : 1, arrows = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
    if (arrows[k] && active()) { e.preventDefault(); nudge(...arrows[k]); return; }
    if (k === 'pagedown') { e.preventDefault(); goPanel(Math.min(PC.doc.panels.length - 1, PC.cur + 1)); }
    if (k === 'pageup') { e.preventDefault(); goPanel(Math.max(0, PC.cur - 1)); }
    if (k === '+' || k === '=') zoomBy(1.25);
    if (k === '-' || k === '_') zoomBy(0.8);
    if (k === '0') { autoFit = true; fitZoom(); }
    if (k === 'escape') { canvas.discardActiveObject(); canvas.requestRenderAll(); }
  });
  window.addEventListener('beforeunload', (e) => { if (PC.dirty && PC.autosaveFailed) { e.preventDefault(); e.returnValue = ''; } });

  // ------------------------------------------------------------------ start
  renderArt(); drawMagic();
  (async () => {
    const saved = PC.autosaved();
    if (saved) { try { await openDoc(saved); renderPages(); showProps(); status(); return; } catch (e) { /* fall through to the start screen */ } }
    showStart();
  })();
})();
