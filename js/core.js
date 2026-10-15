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
  // Project types, grouped like the start screen.
  const KINDS = {
    card: { name: 'Greeting card', icon: 'card', group: 'Cards and mail' },
    postcard: { name: 'Postcard', icon: 'postcard', group: 'Cards and mail' },
    labels: { name: 'Mailing and shipping labels', icon: 'labels', group: 'Cards and mail' },
    cd: { name: 'CD / DVD label and case', icon: 'cd', group: 'Cards and mail' },
    flyer: { name: 'Flyer', icon: 'flyer', group: 'Promote' },
    sign: { name: 'Sign', icon: 'sign', group: 'Promote' },
    brochure: { name: 'Brochure', icon: 'brochure', group: 'Promote' },
    banner: { name: 'Banner', icon: 'banner', group: 'Promote' },
    newsletter: { name: 'Newsletter', icon: 'news', group: 'Promote' },
    stationery: { name: 'Stationery set', icon: 'stationery', group: 'Business' },
    letterhead: { name: 'Letterhead', icon: 'letter', group: 'Business' },
    businesscard: { name: 'Business cards', icon: 'bcard', group: 'Business' },
    forms: { name: 'Business form', icon: 'form', group: 'Business' },
    certificate: { name: 'Certificate', icon: 'cert', group: 'Business' },
    calendar: { name: 'Calendar', icon: 'calendar', group: 'Plan' },
  };
  // Sheets that repeat one design: labels, business cards, postcards and discs. Sizes in mm:
  // label width and height, across and down, top and left margin, step across and down.
  const LETTER = [215.9, 279.4], A4 = [210, 297];
  const LABEL_STOCK = {
    '5160': { name: 'Avery 5160 / 8160 address, 30 per sheet', page: LETTER, w: 66.675, h: 25.4, cols: 3, rows: 10, top: 12.7, left: 4.7625, hp: 69.85, vp: 25.4 },
    '5161': { name: 'Avery 5161 address, 20 per sheet', page: LETTER, w: 101.6, h: 25.4, cols: 2, rows: 10, top: 12.7, left: 3.97, hp: 106.36, vp: 25.4 },
    '5162': { name: 'Avery 5162 address, 14 per sheet', page: LETTER, w: 101.6, h: 33.86, cols: 2, rows: 7, top: 21.16, left: 3.97, hp: 106.36, vp: 33.86 },
    '5163': { name: 'Avery 5163 / 8163 shipping, 10 per sheet', page: LETTER, w: 101.6, h: 50.8, cols: 2, rows: 5, top: 12.7, left: 3.97, hp: 106.36, vp: 50.8 },
    '5164': { name: 'Avery 5164 shipping, 6 per sheet', page: LETTER, w: 101.6, h: 84.66, cols: 2, rows: 3, top: 12.7, left: 3.97, hp: 106.36, vp: 84.66 },
    '5167': { name: 'Avery 5167 return address, 80 per sheet', page: LETTER, w: 44.45, h: 12.7, cols: 4, rows: 20, top: 12.7, left: 7.14, hp: 52.39, vp: 12.7 },
    '8126': { name: 'Avery 8126 half-sheet shipping, 2 per sheet', page: LETTER, w: 215.9, h: 139.7, cols: 1, rows: 2, top: 0, left: 0, hp: 215.9, vp: 139.7 },
    '4x6': { name: '4 × 6 in shipping, 2 per Letter sheet', page: LETTER, w: 101.6, h: 152.4, cols: 2, rows: 1, top: 63.5, left: 3.175, hp: 107.95, vp: 152.4 },
    'L7160': { name: 'Avery L7160 address, 21 per A4 sheet', page: A4, w: 63.5, h: 38.1, cols: 3, rows: 7, top: 15.15, left: 7.21, hp: 66.04, vp: 38.1 },
    'L7163': { name: 'Avery L7163 address, 14 per A4 sheet', page: A4, w: 99.1, h: 38.1, cols: 2, rows: 7, top: 15.15, left: 4.65, hp: 101.6, vp: 38.1 },
    'L7165': { name: 'Avery L7165 parcel, 8 per A4 sheet', page: A4, w: 99.1, h: 67.7, cols: 2, rows: 4, top: 13.1, left: 4.65, hp: 101.6, vp: 67.7 },
    'L7169': { name: 'Avery L7169 parcel, 4 per A4 sheet', page: A4, w: 99.1, h: 139, cols: 2, rows: 2, top: 9.5, left: 4.65, hp: 101.6, vp: 139 },
  };
  const BCARD = {
    Letter: { name: '3.5 × 2 in, 10 per sheet (Avery 8371)', page: LETTER, w: 88.9, h: 50.8, cols: 2, rows: 5, top: 12.7, left: 19.05, hp: 88.9, vp: 50.8 },
    A4: { name: '85 × 55 mm, 10 per sheet', page: A4, w: 85, h: 55, cols: 2, rows: 5, top: 11, left: 15, hp: 95, vp: 55 },
  };
  const POSTCARD = {
    '4x6': { name: '4 × 6 in, 2 per Letter sheet', page: LETTER, w: 152.4, h: 101.6, cols: 1, rows: 2, top: 38.1, left: 31.75, hp: 152.4, vp: 101.6 },
    quarter: { name: '5.5 × 4.25 in, 4 per Letter sheet (Avery 8387)', page: [279.4, 215.9], w: 139.7, h: 107.95, cols: 2, rows: 2, top: 0, left: 0, hp: 139.7, vp: 107.95 },
    a6: { name: 'A6, 4 per A4 sheet', page: [297, 210], w: 148, h: 105, cols: 2, rows: 2, top: 0, left: 0.5, hp: 148, vp: 105 },
  };
  const DISC = {
    Letter: { name: 'CD/DVD labels, 2 per sheet (Avery 8931)', page: LETTER, w: 118, h: 118, cols: 1, rows: 2, top: 13.2, left: 48.95, hp: 118, vp: 135, hole: 41 },
    A4: { name: 'CD/DVD labels, 2 per sheet (Avery L7676)', page: A4, w: 117, h: 117, cols: 1, rows: 2, top: 21.5, left: 46.5, hp: 117, vp: 137, hole: 41 },
  };
  const ENVELOPE = { Letter: { name: '#10 envelope', w: 241.3, h: 104.8 }, A4: { name: 'DL envelope', w: 220, h: 110 } };
  const FORMS = [['invoice', 'Invoice'], ['receipt', 'Receipts (2 per page)'], ['order', 'Order form'], ['fax', 'Fax cover sheet'], ['memo', 'Memo']];
  // Fonts: retro bitmap-style, display, newspaper, and common system fonts.
  const SYSTEM_FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Impact', 'Comic Sans MS', 'Courier New'];
  const FONTS = window.CraftFonts ? window.CraftFonts.all(SYSTEM_FONTS) : SYSTEM_FONTS;
  if (window.CraftFonts) window.CraftFonts.onAdd((f) => { if (!FONTS.includes(f)) FONTS.unshift(f); if (PC.doc) { PC.doc.fonts = window.CraftFonts.saved(); PC.changed(); } });
  // Family names with digits (Press Start 2P) must be quoted for the canvas.
  const fam = (f) => (/\d/.test(f || '') && !/^['"]/.test(f) ? `'${f}'` : f);
  const unfam = (f) => String(f || '').replace(/^['"]|['"]$/g, '');
  // Date and time (the same in every Craft app): Word-style formats and the Insert › Date and time dialog.
  // Static = the words are typed in once. Dynamic = a field that shows the current date or time whenever it is
  // opened, printed or exported. A stamp model is { fmt, before, after }.
  const DATE_FORMATS = [
    ['short', 'Short date', (d) => d.toLocaleDateString()],
    ['long', 'Long date', (d) => d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
    ['mdy', 'Month day, year', (d) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })],
    ['mdyShort', 'Short month', (d) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })],
    ['dmy', 'Day month year', (d) => `${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'long' })} ${d.getFullYear()}`],
    ['iso', 'Year-month-day', (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`],
    ['monthYear', 'Month and year', (d) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })],
    ['weekday', 'Day of the week', (d) => d.toLocaleDateString(undefined, { weekday: 'long' })],
    ['year', 'Year', (d) => String(d.getFullYear())],
    ['time', 'Time', (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })],
    ['time24', 'Time (24-hour)', (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`],
    ['timeSec', 'Time with seconds', (d) => d.toLocaleTimeString()],
    ['dateTime', 'Date and time', (d) => `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`],
    ['stampDMY', 'Stamp: 14 OCT 2026', (d) => `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`],
    ['stampMDY', 'Stamp: OCT 14 2026', (d) => `${d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${d.getDate()} ${d.getFullYear()}`],
    ['stampFull', 'Stamp: date and time', (d) => `${DATE_FORMATS[5][2](d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`],
  ];
  const dateText = (fmt, d = new Date()) => (DATE_FORMATS.find((f) => f[0] === fmt) || DATE_FORMATS[0])[2](d);
  const stampText = (s, d = new Date()) => (s.before || '') + dateText(s.fmt, d) + (s.after || '');
  // The dialog: pick a format, add words before or after, choose fixed text or a field that updates itself.
  // Resolves to { fmt, before, after, dynamic, text } or null. `dynamicNote` explains what "updates" means in this app.
  function dateDialog({ title = 'Date and time', fmt = 'long', before = '', after = '', dynamic = false, allowDynamic = true, dynamicNote = 'Shows the current date or time every time you open, print or export.' } = {}) {
    return new Promise((res) => {
      if (!document.getElementById('dt-style')) {
        const st = document.createElement('style'); st.id = 'dt-style';
        st.textContent = '.dt-bd{position:fixed;inset:0;background:rgba(0,0,0,.4);display:grid;place-items:center;z-index:100000}'
          + '.dt-dlg{background:var(--panel,#fff);color:var(--fg,#222);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.3);width:min(560px,94vw);max-height:90vh;overflow:auto;padding:18px 20px;font:14px/1.4 system-ui,"Segoe UI",sans-serif}'
          + '.dt-dlg h2{margin:0 0 12px;font-size:17px}.dt-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}'
          + '.dt-list{border:1px solid var(--line,#ccc);border-radius:8px;max-height:300px;overflow:auto;padding:4px}'
          + '.dt-list button{display:block;width:100%;text-align:left;border:0;background:none;color:inherit;padding:5px 8px;border-radius:5px;cursor:pointer;font:inherit}'
          + '.dt-list button:hover{background:var(--panel-2,#f1f1f1)}.dt-list button[aria-pressed=true]{background:var(--accent,#2f6fdd);color:#fff}'
          + '.dt-dlg label{display:grid;gap:3px;font-size:12px;color:var(--muted,#666);margin-bottom:10px}'
          + '.dt-dlg input[type=text]{height:30px;padding:0 8px;border:1px solid var(--line,#ccc);border-radius:6px;background:var(--panel,#fff);color:var(--fg,#222);font:inherit}'
          + '.dt-dlg .dt-check{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:inherit}.dt-prev{padding:10px;border:1px dashed var(--line,#ccc);border-radius:8px;font-size:15px;min-height:22px;word-break:break-word}'
          + '.dt-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.dt-acts button{min-width:80px;height:32px;border-radius:7px;border:1px solid var(--line,#ccc);background:var(--panel-2,#f4f4f4);color:inherit;cursor:pointer;font:inherit}'
          + '.dt-acts .dt-ok{background:var(--accent,#2f6fdd);border-color:var(--accent,#2f6fdd);color:#fff}@media(max-width:560px){.dt-grid{grid-template-columns:1fr}}';
        document.head.append(st);
      }
      const now = new Date(), esc2 = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      const bd = document.createElement('div'); bd.className = 'dt-bd';
      bd.innerHTML = `<div class="dt-dlg" role="dialog" aria-modal="true" aria-label="${esc2(title)}"><h2>${esc2(title)}</h2><div class="dt-grid">
        <div><div class="dt-list" role="listbox" aria-label="Format">${DATE_FORMATS.map(([k, n, f]) => `<button type="button" data-f="${k}" aria-pressed="${k === fmt}" title="${esc2(n)}">${esc2(f(now))}</button>`).join('')}</div></div>
        <div><label>Words before<input type="text" data-b value="${esc2(before)}" placeholder="e.g. Printed on "></label><label>Words after<input type="text" data-a value="${esc2(after)}"></label>
        ${allowDynamic ? `<label class="dt-check"><input type="checkbox" data-dyn ${dynamic ? 'checked' : ''}><span><b>Update automatically</b><br><small>${esc2(dynamicNote)} Leave it off to type it in as fixed text.</small></span></label>` : ''}
        <label>Preview</label><div class="dt-prev" data-p></div></div></div>
        <div class="dt-acts"><button type="button" data-x>Cancel</button><button type="button" class="dt-ok" data-ok>Insert</button></div></div>`;
      document.body.append(bd);
      let f = fmt;
      const B = bd.querySelector('[data-b]'), A = bd.querySelector('[data-a]'), D = bd.querySelector('[data-dyn]');
      const prev = () => { bd.querySelector('[data-p]').textContent = stampText({ fmt: f, before: B.value, after: A.value }) + (D && D.checked ? '  (updates itself)' : ''); };
      bd.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { f = b.dataset.f; bd.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); prev(); }; b.ondblclick = () => bd.querySelector('[data-ok]').click(); });
      [B, A].forEach((i) => { i.oninput = prev; }); if (D) D.onchange = prev; prev();
      const done = (v) => { bd.remove(); res(v); };
      bd.querySelector('[data-x]').onclick = () => done(null);
      bd.querySelector('[data-ok]').onclick = () => { const s = { fmt: f, before: B.value, after: A.value }; done({ ...s, dynamic: !!(D && D.checked), text: stampText(s) }); };
      bd.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') done(null); if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') bd.querySelector('[data-ok]').click(); });
      bd.onclick = (e) => { if (e.target === bd) done(null); };
      const sel = bd.querySelector('[aria-pressed=true]') || bd.querySelector('[data-f]'); sel.focus(); sel.scrollIntoView({ block: 'nearest' });
    });
  }
  const PROPS = ['stamp', 'kind', 'title', 'clip', 'border', 'magic', 'cal', 'art', 'wrap', 'shape', 'tb', 'tabs', 'merge', 'arc', 'fx', 'origSrc'];

  const PC = (window.PC = {
    DPI, px, mmOf, ptPx, pxPt, PAPER, KINDS, FONTS, fam, unfam, PROPS, LABEL_STOCK, BCARD, POSTCARD, DISC, ENVELOPE, FORMS,
    doc: null, cur: 0, canvas: null, zoom: 1, exporting: false,
    hooks: { changed: [], selected: [], panel: [] },
  });
  Object.assign(PC, { DATE_FORMATS, dateText, stampText, dateDialog });
  // Fills and backgrounds (the same in every Craft app). A paint is { type, ... }:
  //   solid    { color }
  //   gradient { c1, c2, angle (deg), radial, dither }   dither adds fine noise so gradients do not show bands
  //   pattern  { pattern, fg, bg, size (tile size: mm in print apps, px in SiteCraft) }
  //   picture  { src, fit: cover | contain | tile | stretch, opacity }
  // Patterns are drawn on a small square tile, fg on bg (bg '' = see-through).
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const PATTERNS = [
    // dithers: ordered (Bayer) dots at a set darkness, a random dither and a halftone
    ...[12, 25, 37, 50, 62, 75, 88].map((p) => [`dither${p}`, `Dither ${p}%`, 'Dithers', (x, n, fg) => { const c = n / 4; x.fillStyle = fg; BAYER4.forEach((t, i) => { if ((t + 0.5) / 16 < p / 100) x.fillRect((i % 4) * c, Math.floor(i / 4) * c, c, c); }); }]),
    ['noise', 'Random dither 50%', 'Dithers', (x, n, fg) => { const c = n / 16; x.fillStyle = fg; let s = 12345; for (let i = 0; i < 256; i++) { s = (s * 16807) % 2147483647; if (s % 2) x.fillRect((i % 16) * c, Math.floor(i / 16) * c, c, c); } }],
    ['halftone', 'Halftone dots', 'Dithers', (x, n, fg) => { x.fillStyle = fg; [[0.25, 0.25], [0.75, 0.75]].forEach(([a, b]) => { x.beginPath(); x.arc(a * n, b * n, n * 0.2, 0, 7); x.fill(); }); }],
    // lines
    ['hstripes', 'Stripes across', 'Lines', (x, n, fg) => { x.fillStyle = fg; x.fillRect(0, 0, n, n / 2); }],
    ['vstripes', 'Stripes down', 'Lines', (x, n, fg) => { x.fillStyle = fg; x.fillRect(0, 0, n / 2, n); }],
    ['diag', 'Diagonal lines', 'Lines', (x, n, fg) => { x.strokeStyle = fg; x.lineWidth = n * 0.22; x.beginPath(); for (let k = -1; k <= 1; k++) { x.moveTo(k * n, n); x.lineTo(k * n + n, 0); } x.stroke(); }],
    ['diag2', 'Diagonal lines (other way)', 'Lines', (x, n, fg) => { x.strokeStyle = fg; x.lineWidth = n * 0.22; x.beginPath(); for (let k = -1; k <= 1; k++) { x.moveTo(k * n, 0); x.lineTo(k * n + n, n); } x.stroke(); }],
    ['pinstripe', 'Pinstripes', 'Lines', (x, n, fg) => { x.fillStyle = fg; x.fillRect(0, 0, Math.max(1, n * 0.1), n); }],
    ['grid', 'Grid', 'Lines', (x, n, fg) => { x.fillStyle = fg; const w = Math.max(1, n * 0.1); x.fillRect(0, 0, n, w); x.fillRect(0, 0, w, n); }],
    ['cross', 'Crosshatch', 'Lines', (x, n, fg) => { x.strokeStyle = fg; x.lineWidth = n * 0.12; x.beginPath(); for (let k = -1; k <= 1; k++) { x.moveTo(k * n, n); x.lineTo(k * n + n, 0); x.moveTo(k * n, 0); x.lineTo(k * n + n, n); } x.stroke(); }],
    ['zigzag', 'Zigzag', 'Lines', (x, n, fg) => { x.strokeStyle = fg; x.lineWidth = n * 0.14; x.beginPath(); x.moveTo(0, n * 0.7); x.lineTo(n / 2, n * 0.3); x.lineTo(n, n * 0.7); x.stroke(); }],
    ['waves', 'Waves', 'Lines', (x, n, fg) => { x.strokeStyle = fg; x.lineWidth = n * 0.12; x.beginPath(); x.moveTo(0, n / 2); x.bezierCurveTo(n * 0.25, n * 0.15, n * 0.25, n * 0.15, n / 2, n / 2); x.bezierCurveTo(n * 0.75, n * 0.85, n * 0.75, n * 0.85, n, n / 2); x.stroke(); }],
    // shapes
    ['checks', 'Checkerboard', 'Shapes', (x, n, fg) => { x.fillStyle = fg; x.fillRect(0, 0, n / 2, n / 2); x.fillRect(n / 2, n / 2, n / 2, n / 2); }],
    ['dots', 'Polka dots', 'Shapes', (x, n, fg) => { x.fillStyle = fg; x.beginPath(); x.arc(n / 2, n / 2, n * 0.18, 0, 7); x.fill(); }],
    ['bricks', 'Bricks', 'Shapes', (x, n, fg) => { x.fillStyle = fg; const w = Math.max(1, n * 0.08); x.fillRect(0, 0, n, w); x.fillRect(0, n / 2, n, w); x.fillRect(0, 0, w, n / 2); x.fillRect(n / 2, n / 2, w, n / 2); }],
    ['diamonds', 'Diamonds', 'Shapes', (x, n, fg) => { x.fillStyle = fg; x.beginPath(); x.moveTo(n / 2, n * 0.1); x.lineTo(n * 0.9, n / 2); x.lineTo(n / 2, n * 0.9); x.lineTo(n * 0.1, n / 2); x.fill(); }],
    ['scales', 'Fish scales', 'Shapes', (x, n, fg) => { x.strokeStyle = fg; x.lineWidth = n * 0.08; [[0, 0], [n, 0], [n / 2, n / 2], [0, n], [n, n]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, n / 2, 0, Math.PI); x.stroke(); }); }],
    ['triangles', 'Triangles', 'Shapes', (x, n, fg) => { x.fillStyle = fg; x.beginPath(); x.moveTo(0, n); x.lineTo(n / 2, n * 0.15); x.lineTo(n, n); x.fill(); }],
    ['plus', 'Plus signs', 'Shapes', (x, n, fg) => { x.fillStyle = fg; const w = n * 0.12; x.fillRect(n / 2 - w / 2, n * 0.25, w, n / 2); x.fillRect(n * 0.25, n / 2 - w / 2, n / 2, w); }],
    ['stars', 'Little stars', 'Shapes', (x, n, fg) => { x.fillStyle = fg; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? n * 0.13 : n * 0.32, a = (i * Math.PI) / 5; x.lineTo(n / 2 + r * Math.sin(a), n / 2 - r * Math.cos(a)); } x.fill(); }],
    ['hearts', 'Little hearts', 'Shapes', (x, n, fg) => { x.fillStyle = fg; x.beginPath(); x.moveTo(n / 2, n * 0.78); x.bezierCurveTo(n * 0.1, n * 0.5, n * 0.2, n * 0.18, n / 2, n * 0.35); x.bezierCurveTo(n * 0.8, n * 0.18, n * 0.9, n * 0.5, n / 2, n * 0.78); x.fill(); }],
    ['weave', 'Basket weave', 'Shapes', (x, n, fg) => { x.fillStyle = fg; const h = n / 2, s = h / 6; for (let i = 0; i < 3; i++) { const o = i * (h / 3) + s / 2; x.fillRect(0, o, h, s); x.fillRect(h, h + o, h, s); x.fillRect(h + o, 0, s, h); x.fillRect(o, h, s, h); } }],
  ];
  const PATTERN_BY_ID = Object.fromEntries(PATTERNS.map((p) => [p[0], p]));
  // A pattern tile as a canvas `px` pixels square (crisp: no smoothing, whole pixels for dithers).
  function patternTile(id, fg = '#222222', bg = '#ffffff', px = 16) {
    // whole pixels per cell so dithers stay crisp: tiles are a multiple of 4 (16 for the random dither), at least 8 (24 for the weave)
    let n = Math.max(id === 'weave' ? 24 : 8, Math.round(px / 4) * 4); if (id === 'noise') n = Math.max(16, Math.round(n / 16) * 16);
    const c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, n, n); }
    (PATTERN_BY_ID[id] || PATTERNS[3])[3](x, n, fg || '#222222');
    return c;
  }
  // A gradient drawn into a canvas; with dither, a little noise (under one colour step) hides the bands of 8-bit colour.
  function gradientCanvas(w, h, f) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const x = c.getContext('2d'), a = ((f.angle ?? 90) * Math.PI) / 180, cx = c.width / 2, cy = c.height / 2;
    let g;
    if (f.radial) g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
    else { const r = (Math.abs(Math.sin(a)) * c.width + Math.abs(Math.cos(a)) * c.height) / 2; g = x.createLinearGradient(cx - Math.sin(a) * r, cy + Math.cos(a) * r, cx + Math.sin(a) * r, cy - Math.cos(a) * r); }
    g.addColorStop(0, f.c1 || '#ffffff'); g.addColorStop(1, f.c2 || '#3f8be8');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    if (f.dither) ditherCanvas(c);
    return c;
  }
  // Fine dither: ordered noise of up to ±1 colour step, only where the colour changes smoothly (flat areas stay exact).
  function ditherCanvas(c) {
    const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), d = img.data, w = c.width;
    for (let i = 0; i < d.length; i += 4) {
      const p = i / 4, t = (BAYER4[(p % w) % 4 + ((Math.floor(p / w) % 4) * 4)] + 0.5) / 16 - 0.5;
      const right = i + 4 < d.length ? i + 4 : i - 4, down = i + w * 4 < d.length ? i + w * 4 : i - w * 4;
      for (let k = 0; k < 3; k++) { const v = d[i + k]; if (Math.abs(v - d[right + k]) <= 3 && Math.abs(v - d[down + k]) <= 3 && (v !== d[right + k] || v !== d[down + k])) d[i + k] = Math.max(0, Math.min(255, Math.round(v + t * 2.2))); }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  // The whole fill painted into a w × h canvas (pixels). `img` is the loaded picture for picture fills; `unit` = tile pixels per size unit.
  function paintCanvas(w, h, f, img, unit = 1) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const x = c.getContext('2d');
    if (!f || f.type === 'none') return c;
    if (f.type === 'solid') { x.fillStyle = f.color || '#ffffff'; x.fillRect(0, 0, c.width, c.height); }
    else if (f.type === 'gradient') x.drawImage(gradientCanvas(c.width, c.height, f), 0, 0);
    else if (f.type === 'pattern') { x.imageSmoothingEnabled = false; x.fillStyle = x.createPattern(patternTile(f.pattern, f.fg, f.bg, (f.size || 4) * unit), 'repeat'); x.fillRect(0, 0, c.width, c.height); }
    else if (f.type === 'picture' && img) {
      x.globalAlpha = f.opacity ?? 1;
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, fit = f.fit || 'cover';
      if (fit === 'tile') { const k = ((f.size || 0) * unit) / iw || 1, t = document.createElement('canvas'); t.width = Math.max(1, iw * k); t.height = Math.max(1, ih * k); t.getContext('2d').drawImage(img, 0, 0, t.width, t.height); x.fillStyle = x.createPattern(t, 'repeat'); x.fillRect(0, 0, c.width, c.height); }
      else if (fit === 'stretch') x.drawImage(img, 0, 0, c.width, c.height);
      else { const k = (fit === 'cover' ? Math.max : Math.min)(c.width / iw, c.height / ih); x.drawImage(img, (c.width - iw * k) / 2, (c.height - ih * k) / 2, iw * k, ih * k); }
    }
    return c;
  }
  const paintImgCache = new Map();
  const loadPaintImg = (src) => { if (!src) return Promise.resolve(null); if (!paintImgCache.has(src)) paintImgCache.set(src, new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; })); return paintImgCache.get(src); };
  // A short description for lists and tooltips.
  const paintLabel = (f) => (!f || f.type === 'none' ? 'None' : f.type === 'solid' ? 'Colour' : f.type === 'gradient' ? (f.radial ? 'Round gradient' : 'Gradient') : f.type === 'pattern' ? (PATTERN_BY_ID[f.pattern] || ['', 'Pattern'])[1] : 'Picture');
  // Defaults when switching type, keeping the colours already chosen.
  function paintSwitch(f, type, base = '#3f8be8') {
    const c = (f && (f.color || f.c1 || f.fg)) || base;
    const light = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return false; const v = parseInt(m[1], 16); return 0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255) > 200; };
    const ink = light(c) ? '#3f6fd8' : c, other = light(c) ? '#3f6fd8' : '#ffffff'; // a white page gets a colour that shows
    if (type === 'none') return { type: 'none' };
    if (type === 'solid') return { type, color: c };
    if (type === 'gradient') return { type, c1: c, c2: (f && f.c2) || other, angle: (f && f.angle) ?? 90, radial: !!(f && f.radial), dither: f && f.dither != null ? f.dither : true };
    if (type === 'pattern') return { type, pattern: (f && f.pattern) || 'dither50', fg: f && f.fg ? f.fg : ink, bg: (f && f.bg != null ? f.bg : '#ffffff'), size: (f && f.size) || 3 };
    return { type: 'picture', src: (f && f.src) || '', fit: (f && f.fit) || 'cover', opacity: (f && f.opacity) ?? 1, size: (f && f.size) || 20 };
  }
  PC.SYSTEM_FONTS = SYSTEM_FONTS;
  Object.assign(PC, { ditherCanvas, PATTERNS, patternTile, gradientCanvas, paintCanvas, loadPaintImg, paintLabel, paintSwitch });
  const paintImgs = new Map(); // pictures for picture fills, loaded (src → Image)
  PC.preloadPaint = async (f) => { if (f && f.type === 'picture' && f.src && !paintImgs.has(f.src)) paintImgs.set(f.src, await loadPaintImg(f.src)); };
  // A Fabric fill for something w × h canvas pixels big: a colour, a vector gradient, or a pattern drawn sharper than the screen.
  PC.paintFabric = function (f, w, h) {
    if (!f || f.type === 'none') return 'rgba(0,0,0,0)';
    if (f.type === 'solid') return f.color || '#ffffff';
    const stops = [{ offset: 0, color: f.c1 || '#ffffff' }, { offset: 1, color: f.c2 || '#3f8be8' }];
    if (f.type === 'gradient' && !f.dither) {
      if (f.radial) return new fabric.Gradient({ type: 'radial', gradientUnits: 'percentage', coords: { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.71 }, colorStops: stops });
      const a = ((f.angle ?? 90) * Math.PI) / 180;
      return new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0.5 - Math.sin(a) / 2, y1: 0.5 + Math.cos(a) / 2, x2: 0.5 + Math.sin(a) / 2, y2: 0.5 - Math.cos(a) / 2 }, colorStops: stops });
    }
    const r = Math.max(1, Math.min(3, 3000 / Math.max(w, h, 1)));
    if (f.type === 'pattern') {
      const tile = patternTile(f.pattern, f.fg, f.bg, px(f.size || 3) * r), k = px(f.size || 3) / tile.width;
      return new fabric.Pattern({ source: tile, repeat: 'repeat', patternTransform: [k, 0, 0, k, 0, 0] });
    }
    const c = paintCanvas(w * r, h * r, f, paintImgs.get(f.src), px(1) * r);
    return new fabric.Pattern({ source: c, repeat: 'no-repeat', patternTransform: [1 / r, 0, 0, 1 / r, 0, 0] });
  };
  // Fills drawn as pixels (patterns, pictures, smooth gradients) are not saved: only their settings are, and the shape
  // or table is rebuilt from them when the page is opened, printed or exported. That keeps projects small.
  const heavy = (f) => !!f && (f.type === 'pattern' || f.type === 'picture' || (f.type === 'gradient' && f.dither));
  const paintOwner = (o) => (o.kind === 'shape' && heavy(o.shape && o.shape.paint)) || (o.kind === 'tb' && heavy(o.tb && o.tb.bgPaint));
  function slimPaints(json) {
    const strip = (o) => { if (o.fill && typeof o.fill === 'object' && o.fill.type === 'pattern') o.fill = '#cccccc'; (o.objects || []).forEach(strip); };
    (json.objects || []).forEach((o) => { if (paintOwner(o)) strip(o); });
  }
  PC.rehydrate = async function (cv) {
    const list = cv.getObjects().filter(paintOwner);
    for (const o of list) {
      await PC.preloadPaint(o.kind === 'shape' ? o.shape.paint : o.tb.bgPaint);
      const n = o.kind === 'shape' ? PC.buildShape(o.shape) : PC.buildTable(o.tb);
      ['left', 'top', 'angle', 'scaleX', 'scaleY', 'flipX', 'flipY', 'opacity', 'shadow', 'name', 'visible', 'globalCompositeOperation', 'lockAll', 'selectable', 'evented', 'wrap'].forEach((k) => { if (o[k] !== undefined) n[k] = o[k]; });
      n.setPositionByOrigin(o.getCenterPoint(), 'center', 'center');
      const i = cv.getObjects().indexOf(o); cv.remove(o); cv.insertAt(n, i); n.setCoords();
    }
  };
  // A page background beyond one colour (gradient, pattern or picture), drawn at k × the canvas size so it prints sharp.
  PC.applyBg = async function (cv, p, k = 2) {
    const f = p.paint;
    if (!f || f.type === 'solid' || f.type === 'none') { cv.backgroundImage = null; return; }
    await PC.preloadPaint(f);
    const W = px(p.w), H = px(p.h), r = Math.max(0.5, Math.min(k, 9000 / Math.max(W, H)));
    const c = paintCanvas(W * r, H * r, f, paintImgs.get(f.src), px(1) * r);
    cv.backgroundImage = new fabric.Image(c, { left: 0, top: 0, originX: 'left', originY: 'top', scaleX: 1 / r, scaleY: 1 / r });
  };
  // Dynamic dates: every text with a `stamp` shows the current date or time (on loading, every half minute, printing and exporting).
  PC.refreshStamps = function (cv) {
    let n = 0;
    const walk = (o) => { if (o.stamp) { o.editable = false; const t = stampText(o.stamp); if (o.text !== t) { o.set('text', t); o.initDimensions && o.initDimensions(); o.setCoords && o.setCoords(); n++; } } (o._objects || []).forEach(walk); };
    cv.getObjects().forEach(walk);
    return n;
  };
  const emit = (name, ...a) => PC.hooks[name].forEach((f) => f(...a));
  PC.on = (name, f) => PC.hooks[name].push(f);

  // ------------------------------------------------------------------ project setup
  // Panels (the faces you design) for each kind of project, in mm.
  function panelsFor(d) {
    const [pw, ph] = PAPER[d.paper];
    const land = d.orient === 'landscape';
    const page = land ? [ph, pw] : [pw, ph];
    const named = (names, w, h, extra = {}) => names.map((n) => ({ name: n, w, h, ...extra }));
    switch (d.kind) {
      case 'card':
        if (d.fold === 'half') return named(['Front', 'Inside left', 'Inside right', 'Back'], ph / 2, pw);
        return named(['Front', 'Inside left', 'Inside right', 'Back'], pw / 2, ph / 2);
      case 'postcard': { const c = POSTCARD[d.pcSize] || POSTCARD['4x6']; return named(['Front', 'Back'], c.w, c.h); }
      case 'businesscard': { const c = BCARD[d.paper]; return named(['Front', 'Back'], c.w, c.h); }
      case 'labels': { const l = LABEL_STOCK[d.stock] || LABEL_STOCK['5160']; return [{ name: 'Label', w: l.w, h: l.h }]; }
      case 'cd': { const c = DISC[d.paper]; return [{ name: 'Disc', w: c.w, h: c.h, shape: 'disc', hole: c.hole }, { name: 'Case front', w: 120, h: 120 }, { name: 'Case back', w: 150, h: 118, folds: [6.5, 143.5] }]; }
      case 'brochure':
        if (d.fold === 'bi') return named(['Front cover', 'Inside left', 'Inside right', 'Back cover'], ph / 2, pw);
        return named(['Front cover', 'Back cover', 'Inside flap', 'Inside left', 'Inside middle', 'Inside right'], ph / 3, pw);
      case 'stationery': { const e = ENVELOPE[d.paper], c = BCARD[d.paper]; return [{ name: 'Letterhead', w: pw, h: ph }, { name: 'Envelope', w: e.w, h: e.h }, { name: 'Business card', w: c.w, h: c.h }]; }
      case 'banner': return [{ name: 'Banner', w: d.bannerPages * (ph - 12.7), h: pw - 25.4 }];
      case 'newsletter': return Array.from({ length: d.pages || 1 }, (_, i) => ({ name: `Page ${i + 1}`, w: pw, h: ph }));
      case 'calendar': return [{ name: 'Calendar', w: page[0], h: page[1] }];
      case 'letterhead': return [{ name: 'Letterhead', w: pw, h: ph }];
      case 'forms': return [{ name: (FORMS.find(([v]) => v === d.form) || FORMS[0])[1], w: pw, h: ph }];
      case 'certificate': return [{ name: 'Certificate', w: page[0], h: page[1] }];
      case 'flyer': return [{ name: 'Flyer', w: page[0], h: page[1] }];
      default: return [{ name: 'Sign', w: page[0], h: page[1] }];
    }
  }
  PC.panelsFor = panelsFor;
  PC.newDoc = function (o) {
    const d = { app: 'PressCraft', version: 2, kind: o.kind, paper: o.paper || 'Letter', orient: o.orient || (o.kind === 'calendar' || o.kind === 'certificate' ? 'landscape' : 'portrait'),
      fold: o.fold || (o.kind === 'brochure' ? 'tri' : 'quarter'), bannerPages: o.bannerPages || 4, pages: o.pages || 1, retro: !!o.retro, retroMode: o.retroMode || 'bw', retroDot: o.retroDot || 0.42,
      pcSize: o.pcSize || '4x6', stock: o.stock || (o.paper === 'A4' ? 'L7160' : '5160'), form: o.form || 'invoice', addresses: '', labelStart: 1,
      print: { dpi: 300, media: 'plain' }, stories: {}, nextStory: 1, name: o.name || KINDS[o.kind].name };
    if (d.kind === 'labels' && LABEL_STOCK[d.stock].page === A4) d.paper = 'A4';
    if (d.kind === 'labels' && LABEL_STOCK[d.stock].page === LETTER) d.paper = 'Letter';
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
    if (old.opacity != null && old.opacity !== 1) neu.set('opacity', old.opacity);
    if (old.shadow && !neu.shadow && neu.kind !== 'shape') neu.set('shadow', old.shadow);
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
    const edge = !outline && t.edge, lw = Math.max(1.5, ptPx(t.size) * 0.055 * (t.edgeW || 1));
    parts.push(new fabric.Text(t.text || ' ', { ...base, fill: outline ? (t.inner || '#ffffff') : t.fill, stroke: outline ? t.fill : edge ? t.edge : null, strokeWidth: outline || edge ? lw : 0, paintFirst: 'stroke' }));
    return new fabric.Group(parts, { kind: 'title', title: { ...t }, wrap: t.wrap ?? true });
  };
  PC.defaultTitle = (o = {}) => ({ text: 'Your title', font: 'Bungee', size: 48, fill: '#e8483f', shade: '#7a1f1a', effect: '3d', depth: 1.6, align: 'center', bold: false, italic: false, spacing: 0, ...o });

  PC.buildClip = async function (c) {
    let svg = A.clipSvg(c.id, c.mode === 'gradient' ? 'color' : c.mode || 'color', c.tint || '#222222');
    if (c.mode === 'gradient') { // every coloured area gets the same two-colour gradient across the whole picture
      const a = ((c.angle ?? 90) * Math.PI) / 180, x1 = 50 - Math.sin(a) * 50, y1 = 50 + Math.cos(a) * 50, x2 = 50 + Math.sin(a) * 50, y2 = 50 - Math.cos(a) * 50;
      svg = svg.replace(/fill="(#[0-9a-fA-F]{6})"/g, (m, col) => (/^#(ffffff|222222)$/i.test(col) ? m : 'fill="url(#pcgrad)"'))
        .replace(/<svg([^>]*)>/, `<svg$1><defs><linearGradient id="pcgrad" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c.c1 || '#e8483f'}"/><stop offset="1" stop-color="${c.c2 || '#3f8be8'}"/></linearGradient></defs>`);
    }
    const o = await svgToObject(svg);
    o.set({ kind: 'clip', clip: { ...c }, wrap: c.wrap ?? true });
    return o;
  };
  PC.buildBorder = async function (b, panel) {
    const W = px(panel.w), H = px(panel.h);
    const o = await svgToObject(A.borderSvg(b.style, W, H, px(b.size || 6), b.color || '#222222', px(b.inset ?? 4), b.color2 || '#e8483f', b.color3 || '#3f8be8'));
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
      parts.push(new fabric.Rect({ left: x, top: y, width: cellW, height: cellH, fill: n >= 1 && n <= days ? (c.dayFill || 'rgba(0,0,0,0)') : (c.emptyFill || '#f1f1f1'), stroke: line, strokeWidth: sw, strokeUniform: true }));
    }
    // Bars across days (vacations, trips, holidays): one rounded bar per week, see-through if wanted.
    // "behind" fills the day boxes under the numbers; "over" is a band along the bottom of the days.
    const bars = (place) => (c.bars || []).filter((b) => (b.place || 'behind') === place).forEach((b) => {
      const from = Math.max(1, Math.min(days, Math.min(b.from, b.to))), to = Math.max(1, Math.min(days, Math.max(b.from, b.to)));
      const cell = (dd) => { const k = dd + lead - 1; return [Math.floor(k / 7), k % 7]; };
      const r0 = cell(from)[0], r1 = cell(to)[0];
      for (let r = r0; r <= r1; r++) {
        const c0 = r === r0 ? cell(from)[1] : 0, c1 = r === r1 ? cell(to)[1] : 6;
        const top = titleH + headH + cellH * r, inset = Math.min(cellW, cellH) * 0.05;
        const bh = place === 'behind' ? cellH - 2 * inset : cellH * 0.3, by = place === 'behind' ? top + inset : top + cellH - bh - inset;
        const bx = cellW * c0 + inset, bw = cellW * (c1 - c0 + 1) - 2 * inset, rr = Math.min(bh, cellH * 0.3) * 0.35;
        parts.push(new fabric.Rect({ left: bx, top: by, width: bw, height: bh, rx: rr, ry: rr, fill: b.color || '#3f8be8', opacity: b.opacity ?? 0.45, strokeWidth: 0 }));
        if (b.text) {
          const fs = Math.min(cellH * 0.2, ptPx(16)), ty = place === 'behind' ? top + cellH * 0.64 : by + bh / 2;
          const t = new fabric.Text(b.text, { fontFamily: fam(b.font || c.font || 'Fredoka'), fontSize: fs, fontWeight: 'bold', fill: b.ink || '#ffffff', originX: 'center', originY: 'center', left: bx + bw / 2, top: ty, charSpacing: 40 });
          if (t.width > bw * 0.94) t.set('fontSize', (fs * bw * 0.94) / t.width);
          parts.push(t);
        }
      }
    });
    bars('behind');
    for (let w = 0; w < weeks; w++) for (let i = 0; i < 7; i++) {
      const n = w * 7 + i - lead + 1, x = cellW * i, y = titleH + headH + cellH * w;
      if (n < 1 || n > days) continue;
      parts.push(new fabric.Text(String(n), { fontFamily: font, fontSize: Math.min(cellH * 0.26, cellW * 0.3), fill: ink, left: x + pad, top: y + pad * 0.6, fontWeight: 'bold' }));
      const note = c.notes && c.notes[n];
      if (note) parts.push(new fabric.Textbox(note, { fontFamily: font, fontSize: Math.min(cellH * 0.15, ptPx(11)), fill: c.noteColor || '#e8483f', left: x + pad, top: y + cellH * 0.38, width: cellW - 2 * pad, lineHeight: 1 }));
    }
    bars('over');
    return new fabric.Group(parts, { kind: 'cal', cal: JSON.parse(JSON.stringify(c)), wrap: false });
  };

  // Tables (business forms): one row per line of text, cells separated by "|".
  PC.buildTable = function (t) {
    const W = px(t.w), rows = String(t.text || '').split('\n'), n = Math.max(1, rows.length);
    const cells = rows.map((r) => r.split('|').map((c) => c.trim()));
    const cols = Math.max(1, ...cells.map((r) => r.length));
    let pct = (t.cols || []).slice(0, cols).map(Number).filter((v) => v > 0);
    while (pct.length < cols) pct.push(100 / cols);
    const sum = pct.reduce((a, b) => a + b, 0), cw = pct.map((v) => (W * v) / sum);
    const rh = px(t.rowH || 7), H = rh * n, pad = px(t.pad ?? 1.2), lw = px(t.lw ?? 0.3);
    const parts = [new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: 'rgba(0,0,0,0)', strokeWidth: 0 })];
    if (t.header && t.headFill) parts.push(new fabric.Rect({ left: 0, top: 0, width: W, height: rh, fill: t.headFill, strokeWidth: 0 }));
    if (t.bgPaint && t.bgPaint.type !== 'none') parts.splice(1, 0, new fabric.Rect({ left: 0, top: 0, width: W, height: H, strokeWidth: 0, fill: PC.paintFabric(t.bgPaint, W, H) }));
    if (t.stripe) for (let r = t.header ? 2 : 1; r < n; r += 2) parts.push(new fabric.Rect({ left: 0, top: rh * r, width: W, height: rh, fill: t.stripe, strokeWidth: 0 }));
    Object.entries(t.cellFill || {}).forEach(([key, col]) => { const [r, c] = key.split(',').map(Number); if (r >= n || c >= cols || !col) return; parts.push(new fabric.Rect({ left: cw.slice(0, c).reduce((a, b) => a + b, 0), top: rh * r, width: cw[c], height: rh, fill: col, strokeWidth: 0 })); });
    cells.forEach((row, r) => {
      let x = 0;
      for (let c = 0; c < cols; c++) {
        const text = row[c] || '';
        if (text) {
          const head = r === 0 && t.header, right = (t.right || []).includes(c) && !head;
          const tx = new fabric.Text(text, { fontFamily: fam(t.font || 'Arial'), fontSize: ptPx(t.size || 9), fill: head ? (t.headInk || '#ffffff') : (t.color || '#222222'), fontWeight: head ? 'bold' : 'normal', originY: 'center', top: rh * r + rh / 2, originX: right ? 'right' : 'left', left: right ? x + cw[c] - pad : x + pad });
          const k = Math.min(1, (cw[c] - 2 * pad) / tx.width); if (k < 1) tx.set('fontSize', tx.fontSize * k);
          parts.push(tx);
        }
        x += cw[c];
      }
    });
    if (lw > 0) {
      let d = `M0 0H${W}V${H}H0Z`, x = 0;
      for (let r = 1; r < n; r++) d += `M0 ${rh * r}H${W}`;
      if (t.grid !== 'rows') cw.slice(0, -1).forEach((w) => { x += w; d += `M${x} 0V${H}`; });
      parts.push(new fabric.Path(d, { fill: '', stroke: t.line || '#222222', strokeWidth: lw, objectCaching: false }));
    }
    return new fabric.Group(parts, { kind: 'tb', tb: JSON.parse(JSON.stringify(t)), wrap: t.wrap ?? false });
  };
  PC.defaultTable = (o = {}) => ({ text: 'Description | Qty | Price | Total\n | | | \n | | | ', cols: [55, 15, 15, 15], w: 180, rowH: 7, font: 'Arial', size: 9, header: true, headFill: '#c2185b', headInk: '#ffffff', line: '#555555', lw: 0.25, pad: 1.2, right: [1, 2, 3], ...o });
  // Tear-off tabs for flyers: a row of strips with the same words, turned sideways, with dashed cut lines.
  PC.buildTabs = function (t) {
    const W = px(t.w), H = px(t.h), n = Math.max(3, t.count || 8), sw = W / n, parts = [new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: 'rgba(0,0,0,0)', strokeWidth: 0 })];
    let d = `M0 0H${W}`;
    for (let i = 0; i <= n; i++) d += `M${sw * i} 0V${H}`;
    parts.push(new fabric.Path(d, { fill: '', stroke: '#555555', strokeWidth: px(0.25), strokeDashArray: [px(1.5), px(1)], objectCaching: false }));
    for (let i = 0; i < n; i++) {
      const tx = new fabric.Text(t.text || 'Call (555) 010-0199', { fontFamily: fam(t.font || 'Oswald'), fontSize: ptPx(t.size || 9), fill: t.color || '#222222', angle: 90, originX: 'center', originY: 'center', left: sw * i + sw / 2, top: H / 2, textAlign: 'center' });
      const k = Math.min(1, (H * 0.92) / tx.width, (sw * 0.9) / tx.height); if (k < 1) tx.set('fontSize', tx.fontSize * k);
      parts.push(tx);
    }
    return new fabric.Group(parts, { kind: 'tabs', tabs: { ...t }, wrap: true });
  };
  // A disc label: the circle with the centre hole cut out (even-odd fill), in page pixels.
  PC.discPath = (w, h, hole) => { const r = w / 2, q = hole / 2, cx = w / 2, cy = h / 2; return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z M ${cx - q} ${cy} a ${q} ${q} 0 1 0 ${2 * q} 0 a ${q} ${q} 0 1 0 ${-2 * q} 0 Z`; };
  PC.panelClip = (p) => (p.shape === 'disc' ? new fabric.Path(PC.discPath(px(p.w), px(p.h), px(p.hole || 41)), { left: 0, top: 0, fillRule: 'evenodd', absolutePositioned: true }) : null);

  // Shapes
  // Shapes with sharp or rounded corners. Sizes are in any unit; `round` 0 = sharp, 100 = as round as the shape allows.
  const SHAPES = [['rect', 'Box'], ['ellipse', 'Circle or oval'], ['triangle', 'Triangle'], ['diamond', 'Diamond'], ['pentagon', 'Pentagon'], ['hexagon', 'Hexagon'], ['octagon', 'Octagon'], ['star', 'Star'], ['arrow', 'Arrow'], ['line', 'Line']];
  function shapePoints(type, w, h, points = 5) {
    const poly = (n, rot) => Array.from({ length: n }, (_, i) => { const a = ((rot + (360 * i) / n) * Math.PI) / 180; return [w / 2 + (w / 2) * Math.cos(a), h / 2 + (h / 2) * Math.sin(a)]; });
    switch (type) {
      case 'triangle': return [[w / 2, 0], [w, h], [0, h]];
      case 'diamond': return [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
      case 'pentagon': return poly(5, -90);
      case 'hexagon': return poly(6, 0);
      case 'octagon': return poly(8, -67.5);
      case 'star': { const n = Math.max(3, points), out = []; for (let i = 0; i < 2 * n; i++) { const r = i % 2 ? 0.45 : 1, a = ((-90 + (180 * i) / n) * Math.PI) / 180; out.push([w / 2 + (w / 2) * r * Math.cos(a), h / 2 + (h / 2) * r * Math.sin(a)]); } return out; }
      case 'arrow': return [[0, h * 0.3], [w * 0.6, h * 0.3], [w * 0.6, 0], [w, h / 2], [w * 0.6, h], [w * 0.6, h * 0.7], [0, h * 0.7]];
      default: return [[0, 0], [w, 0], [w, h], [0, h]];
    }
  }
  function shapePath(type, w, h, round = 0, points = 5) {
    const f = (v) => +v.toFixed(2);
    if (type === 'ellipse') return `M0 ${f(h / 2)}A${f(w / 2)} ${f(h / 2)} 0 1 0 ${f(w)} ${f(h / 2)}A${f(w / 2)} ${f(h / 2)} 0 1 0 0 ${f(h / 2)}Z`;
    if (type === 'line') return `M0 ${f(h / 2)}L${f(w)} ${f(h / 2)}`;
    const pts = shapePoints(type, w, h, points), n = pts.length;
    // 100% rounds each corner to half of the shortest side, so every shape goes smoothly from sharp to fully round.
    const shortest = Math.min(...pts.map((q, i) => Math.hypot(pts[(i + 1) % n][0] - q[0], pts[(i + 1) % n][1] - q[1]))), R = ((Math.max(0, Math.min(100, round || 0)) / 100) * shortest) / 2;
    if (!R) return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
    let d = '';
    pts.forEach((p, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), r = Math.min(R, la / 2, lb / 2);
      const p1 = [p[0] + ((a[0] - p[0]) * r) / la, p[1] + ((a[1] - p[1]) * r) / la], p2 = [p[0] + ((b[0] - p[0]) * r) / lb, p[1] + ((b[1] - p[1]) * r) / lb];
      d += `${i ? 'L' : 'M'}${f(p1[0])} ${f(p1[1])}Q${f(p[0])} ${f(p[1])} ${f(p2[0])} ${f(p2[1])}`;
    });
    return d + 'Z';
  }
  // Where words sit inside each shape: centre x, centre y and width, as parts of the shape.
  const shapeTextBox = (type) => ({ triangle: [0.5, 0.66, 0.55], diamond: [0.5, 0.5, 0.55], star: [0.5, 0.55, 0.42], arrow: [0.42, 0.5, 0.58], ellipse: [0.5, 0.5, 0.72], pentagon: [0.5, 0.56, 0.66], hexagon: [0.5, 0.5, 0.72], octagon: [0.5, 0.5, 0.75] }[type] || [0.5, 0.5, 1]);
  PC.SHAPES = SHAPES; PC.shapePath = shapePath;
  // A shape (or a text box: a box with words in it). Model: { type, w, h (mm), fill, stroke, sw (mm), round (0-100),
  // points (stars), dash, text, font, size (pt), color, align, bold, italic, valign ('middle' | 'top'), pad (mm),
  // shadow: { color, blur, x, y (mm) } }. Rebuilt on every change, so corners and words never stretch.
  PC.shadowOf = (sh) => (sh ? new fabric.Shadow({ color: sh.color || 'rgba(0,0,0,0.35)', blur: px(sh.blur ?? 1.2), offsetX: px(sh.x ?? 0.8), offsetY: px(sh.y ?? 0.8) }) : null);
  // Everything a shape draws, back to front: the 3-D sides, the face, and one border line or three (outer, middle, inner).
  // Three colours for 3-D: face (fill), side (depth) and edge (border). `k` turns mm (or px) into drawing units.
  // Returns [{ d, x, y, fill, stroke, sw, dash, face }]; the face size is the box less the 3-D depth.
  function shapeLayers(s, W, H, k) {
    const rnd = s.round || 0, pts = s.points || 5, depth = Math.max(0, (s.depth || 0) * k);
    const FW = Math.max(1, W - depth), FH = Math.max(1, H - depth);
    const at = (inset, x0, y0, fill, stroke, sw, dash, face) => ({ d: shapePath(s.type, Math.max(1, FW - 2 * inset), Math.max(1, FH - 2 * inset), rnd, pts), x: x0 + inset, y: y0 + inset, fill: fill || 'none', stroke: stroke || 'none', sw: sw || 0, dash: !!dash, face: !!face });
    const out = [];
    if (depth) {
      const n = Math.max(3, Math.ceil(depth / (0.35 * k)));
      for (let i = n; i >= 1; i--) out.push(at(0, (depth * i) / n, (depth * i) / n, s.side || '#6b6b6b', i === n && s.stroke ? s.stroke : null, i === n && s.stroke ? (s.sw || 0.4) * k : 0));
    }
    const L = s.lines;
    if (L) {
      out.push(at(0, 0, 0, s.fill, null, 0, false, true));
      const o = ((L.outer && L.outer.w) || 0) * k, m = ((L.middle && L.middle.w) || 0) * k, i = ((L.inner && L.inner.w) || 0) * k;
      if (o) out.push(at(o / 2, 0, 0, null, L.outer.color, o, s.dash));
      if (m && L.middle.color) out.push(at(o + m / 2, 0, 0, null, L.middle.color, m, s.dash));
      if (i) out.push(at(o + m + i / 2, 0, 0, null, L.inner.color, i, s.dash));
    } else out.push(at(0, 0, 0, s.fill, s.stroke, s.stroke ? (s.sw || 0.4) * k : 0, s.dash, true));
    return { layers: out, FW, FH };
  }
  const defaultLines = (base) => ({ outer: { color: base || '#222222', w: 1.2 }, middle: { color: '', w: 0.8 }, inner: { color: base || '#222222', w: 0.4 } });
  PC.defaultLines = defaultLines;
  PC.buildShape = function (s0) {
    const s = { ...s0 };
    if (s.type === 'rounded') { s.type = 'rect'; s.round = s.round ?? 30; }
    const line = s.type === 'line', sw = s.stroke || line ? px(s.sw || (line ? 1 : 0.8)) : 0;
    const W = Math.max(1, px(s.w)), H = line ? Math.max(1, sw) : Math.max(1, px(s.h));
    const parts = [new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: 'rgba(0,0,0,0)', strokeWidth: 0 })];
    let path, FW = W, FH = H;
    if (line) {
      path = new fabric.Path(shapePath('line', W, H), { fill: '', stroke: s.stroke || s.fill || '#222222', strokeWidth: sw, strokeLineCap: s.round ? 'round' : 'butt', strokeDashArray: s.dash ? [px(2), px(1.5)] : null, objectCaching: false });
      parts.push(path);
    } else {
      const L = shapeLayers(s, W, H, px(1)); FW = L.FW; FH = L.FH;
      L.layers.forEach((l) => {
        const p = new fabric.Path(l.d, { fill: l.fill === 'none' ? 'rgba(0,0,0,0)' : l.fill, stroke: l.stroke === 'none' ? null : l.stroke, strokeWidth: l.sw,
          strokeLineJoin: s.round ? 'round' : 'miter', strokeDashArray: l.dash ? [px(2), px(1.5)] : null, objectCaching: false });
        p.set({ left: p.left + l.x, top: p.top + l.y });
        parts.push(p);
        if (l.face && !path) path = p;
      });
    }
    if (s.paint && s.paint.type !== 'solid' && s.paint.type !== 'none' && path && !line) path.set('fill', PC.paintFabric(s.paint, path.width, path.height));
    let text = null;
    if (s.text && !line) {
      const [cx, cy, tw] = shapeTextBox(s.type), pad = px(s.pad ?? 2), top = s.valign === 'top' && s.type === 'rect';
      const W0 = W, H0 = H; { const W = FW, H = FH; void W0; void H0;
      text = new fabric.Textbox(s.text, { fontFamily: fam(s.font || 'Libre Baskerville'), fontSize: ptPx(s.size || 12), fill: s.color || '#222222', textAlign: s.align || 'center',
        fontWeight: s.bold ? 'bold' : 'normal', fontStyle: s.italic ? 'italic' : 'normal', underline: !!s.underline, charSpacing: s.spacing || 0, lineHeight: s.lead || 1.2, width: Math.max(10, W * tw - 2 * pad),
        originX: 'center', originY: top ? 'top' : 'center', left: W * cx, top: top ? pad : H * cy, objectCaching: false });
      parts.push(text); }
    }
    if (s.shadow) { const visible = !line ? (s.fill && s.fill !== 'rgba(0,0,0,0)') || s.stroke || s.lines || s.depth : true; (visible || !text ? parts[1] : text).set('shadow', PC.shadowOf(s.shadow)); }
    return new fabric.Group(parts, { kind: 'shape', shape: s, wrap: s.wrap ?? true, objectCaching: false });
  };
  // Curved text: letters placed on a circle. Model: { text, cx, cy (centre on the page, mm), r (mm), pos (degrees
  // around the centre: 0 = top, clockwise), dir 'up' | 'down', span (degrees to spread over; 0 = natural), font, size (pt),
  // bold, italic, fill, spacing (1/1000 em), stroke, sw (mm) }. Rebuilt on every change.
  PC.buildArc = function (a) {
    const cx = px(a.cx), cy = px(a.cy), r = Math.max(px(1), px(a.r));
    const base = { fontFamily: fam(a.font || 'Bungee'), fontSize: ptPx(a.size || 24), fontWeight: a.bold ? 'bold' : 'normal', fontStyle: a.italic ? 'italic' : 'normal', fill: a.fill || '#222222',
      stroke: a.sw ? a.stroke || '#222222' : null, strokeWidth: a.sw ? px(a.sw) : 0, paintFirst: 'stroke', originX: 'center', originY: 'center', objectCaching: false };
    const glyphs = Array.from(a.text || ' ').map((ch) => new fabric.Text(ch, base));
    const gap = ((a.spacing || 0) / 1000) * ptPx(a.size || 24), widths = glyphs.map((g) => g.width);
    const total = widths.reduce((x, w) => x + w, 0) + gap * Math.max(0, glyphs.length - 1);
    const k = a.span > 0 && glyphs.length > 1 ? ((a.span * Math.PI) / 180) / (total / r) : 1;
    const down = a.dir === 'down', sign = down ? -1 : 1, pos = ((a.pos || 0) * Math.PI) / 180;
    let s = -total / 2;
    glyphs.forEach((g, i) => {
      const th = pos + sign * ((s + widths[i] / 2) / r) * k;
      g.set({ left: cx + r * Math.sin(th), top: cy - r * Math.cos(th), angle: (th * 180) / Math.PI + (down ? 180 : 0) });
      s += widths[i] + gap;
    });
    return new fabric.Group(glyphs, { kind: 'arc', arc: { ...a }, wrap: a.wrap ?? true, lockScalingFlip: true, lockUniScaling: true, objectCaching: false });
  };
  PC.defaultTextBox = (o = {}) => ({ type: 'rect', w: 80, h: 40, fill: null, stroke: '#555555', sw: 0.4, round: 0, text: 'Type in the box on the right. Long words wrap to the next line inside the box.', font: 'Libre Baskerville', size: 12, color: '#222222', align: 'left', valign: 'top', pad: 3, ...o });

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
          g.set({ left: box.x, top: box.y, opacity: o.opacity ?? 1 });
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
    if (p) { p.json = PC.canvas.toJSON(PROPS); delete p.json.backgroundImage; slimPaints(p.json); }
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
    PC.refreshStamps(cv);
    cv.backgroundColor = p.bg || '#ffffff';
    await PC.applyBg(cv, p, 2);
    await PC.rehydrate(cv);
    cv.clipPath = PC.panelClip(p);
    PC.flow(cv, i);
    PC.loading = false;
    cv.requestRenderAll();
    emit('panel', i);
  };

  // ------------------------------------------------------------------ history and autosave
  const AUTOSAVE = 'presscraft-doc-v1';
  let history = [], hIndex = -1, hTimer = null;
  PC.snapshot = () => { PC.saveLive(); if (window.CraftFonts && CraftFonts.saved && Object.keys(CraftFonts.saved()).length) PC.doc.fonts = CraftFonts.saved(); return JSON.stringify(PC.doc); };
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
  // Load a panel into an off-screen canvas. `merge` replaces the text of address blocks (mail merge).
  async function offscreen(i, k, merge) {
    PC.saveLive();
    const p = PC.doc.panels[i], W = Math.round(px(p.w) * k), H = Math.round(px(p.h) * k);
    await PC.loadFonts(PC.fontsUsed(p.json));
    const el = document.createElement('canvas');
    const sc = new fabric.StaticCanvas(el, { width: W, height: H, enableRetinaScaling: false, renderOnAddRemove: false });
    sc.setZoom(k);
    await new Promise((res) => (p.json ? sc.loadFromJSON(p.json, res) : res()));
    PC.refreshStamps(sc);
    sc.backgroundColor = p.bg || '#ffffff';
    await PC.applyBg(sc, p, k);
    await PC.rehydrate(sc);
    if (merge != null) sc.getObjects().forEach((o) => { if (o.merge && o.set) { o.set('text', merge); o.initDimensions && o.initDimensions(); } });
    PC.flow(sc, i);
    return { sc, p, W, H };
  }
  // Render one panel to a canvas at `dpi` (with the retro look when it is on).
  PC.renderPanel = async function (i, dpi, { retro = true, merge = null } = {}) {
    const { sc, p, W, H } = await offscreen(i, dpi / DPI, merge);
    PC.exporting = true; sc.renderAll(); PC.exporting = false;
    let out = document.createElement('canvas'); out.width = W; out.height = H;
    const x = out.getContext('2d');
    x.drawImage(sc.getElement(), 0, 0);
    sc.dispose();
    if (retro && PC.doc.retro) out = PC.retroize(out, (PC.doc.retroDot / 25.4) * dpi, PC.doc.retroMode);
    else if (PC.doc.smooth !== false && dpi >= 100) ditherCanvas(out); // Smooth gradients: no colour bands in prints and pictures
    if (p.shape === 'disc') { // cut the disc out (outside and the centre hole become paper)
      const m = document.createElement('canvas'); m.width = W; m.height = H;
      const mx = m.getContext('2d'); mx.drawImage(out, 0, 0); mx.globalCompositeOperation = 'destination-in';
      mx.fill(new Path2D(PC.discPath(W, H, (p.hole / p.w) * W)), 'evenodd'); out = m;
    }
    return out;
  };
  // The same panel as SVG (vectors print at the printer's full resolution). Returns the inner markup in page pixels.
  PC.renderPanelSVG = async function (i, { merge = null } = {}) {
    const { sc, p, W, H } = await offscreen(i, 1, merge);
    PC.exporting = true;
    const svg = sc.toSVG({ suppressPreamble: true, width: W, height: H, viewBox: { x: 0, y: 0, width: W, height: H } });
    PC.exporting = false;
    sc.dispose();
    const inner = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
    return { inner, W, H, p };
  };
})();
