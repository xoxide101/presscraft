/* PressCraft output: how panels sit on sheets of paper, printing (pixels or vectors), and saving as
   PDF, PNG, JPEG or SVG files (several files are put in one .zip). */
(function () {
  'use strict';
  const PC = window.PC;
  const { PAPER, px } = PC;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  // ------------------------------------------------------------------ quality and paper
  PC.QUALITY = [[150, 'Draft (150 DPI)'], [300, 'Normal (300 DPI)'], [600, 'High (600 DPI)'], [1200, 'Very high (1200 DPI, vector)'], [2400, 'Photo (2400 DPI, vector)'], [4800, 'Maximum (4800 DPI, vector)']];
  PC.MEDIA = [
    ['plain', 'Plain paper', 'Normal printer settings are fine.'],
    ['bright', 'Bright white or premium paper', 'Choose "Premium" or "Bright white" in your printer settings for crisper colours.'],
    ['cardstock', 'Card stock', 'Use the rear or manual feed if your printer has one, and choose "Card stock" or "Heavyweight" in your printer settings.'],
    ['matte', 'Matte photo paper', 'Choose "Matte photo paper" and high quality in your printer settings.'],
    ['glossy', 'Glossy photo paper', 'Choose "Glossy photo paper" and best or photo quality in your printer settings. Let it dry before folding.'],
    ['labels', 'Label sheets', 'Print one test on plain paper first and hold it against the label sheet to check the line-up.'],
    ['envelope', 'Envelopes', 'Feed envelopes the way your printer\'s manual shows and choose the envelope size in the print window.'],
    ['sticker', 'Sticker paper', 'Choose "Matte" or "Glossy" to match the sticker paper, and feed one sheet at a time.'],
    ['magnet', 'Magnet sheets', 'Feed one sheet at a time through the straightest paper path.'],
    ['transparency', 'Transparency film', 'Use film made for your kind of printer and print on the rough side.'],
    ['ironon', 'Iron-on transfer (prints mirrored)', 'The page prints mirrored so it reads correctly once it is ironed onto fabric.'],
  ];
  // Browsers limit picture sizes, so pixel output tops out at about 64 million pixels per sheet.
  const maxDpi = (wmm, hmm) => Math.floor(Math.min(16000 / (Math.max(wmm, hmm) / 25.4), Math.sqrt(64e6 / ((wmm / 25.4) * (hmm / 25.4)))));

  // ------------------------------------------------------------------ layout: which panel goes where on which sheet
  // A sheet: { w, h (mm), items: [{ i, x, y, w, h, rot, crop, merge, cut }], marks: [[x1, y1, x2, y2, dashed]], note }
  function grid(spec, i, { mirror = false, slots = null, merge = null, cut = false } = {}) {
    const items = [], n = spec.cols * spec.rows;
    (slots || Array.from({ length: n }, (_, k) => k)).forEach((k, j) => {
      const c = k % spec.cols, r = Math.floor(k / spec.cols);
      let x = spec.left + c * spec.hp;
      if (mirror) x = spec.page[0] - x - spec.w;
      items.push({ i, x, y: spec.top + r * spec.vp, w: spec.w, h: spec.h, rot: 0, merge: merge ? merge[j] : null, cut });
    });
    return items;
  }
  const hasContent = (i) => { const p = PC.doc.panels[i]; return !!(p && p.json && p.json.objects && p.json.objects.length) || (p && p.bg && p.bg !== '#ffffff'); };
  PC.addressList = () => String(PC.doc.addresses || '').split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
  PC.layout = function () {
    PC.saveLive();
    const d = PC.doc, [pw, ph] = PAPER[d.paper], S = [];
    const sheet = (w, h, items, note = '', marks = []) => S.push({ w, h, items, note, marks });
    const fold = (x1, y1, x2, y2) => [x1, y1, x2, y2, true];
    switch (d.kind) {
      case 'card':
        if (d.fold === 'half') {
          const w = ph / 2;
          sheet(ph, pw, [{ i: 3, x: 0, y: 0, w, h: pw }, { i: 0, x: w, y: 0, w, h: pw }], 'Sheet 1 is the outside (back and front).', [fold(w, 0, w, 6), fold(w, pw - 6, w, pw)]);
          sheet(ph, pw, [{ i: 1, x: 0, y: 0, w, h: pw }, { i: 2, x: w, y: 0, w, h: pw }], 'Sheet 2 is the inside: print it on the back of sheet 1, then fold in half.', [fold(w, 0, w, 6), fold(w, pw - 6, w, pw)]);
        } else {
          const w = pw / 2, h = ph / 2;
          sheet(pw, ph, [{ i: 0, x: w, y: h, w, h }, { i: 3, x: 0, y: h, w, h }, { i: 2, x: 0, y: 0, w, h, rot: 180 }, { i: 1, x: w, y: 0, w, h, rot: 180 }],
            'Fold in half top to bottom with the printing outside, then in half again so the front is on top.', [fold(0, h, 6, h), fold(pw - 6, h, pw, h), fold(w, 0, w, 6), fold(w, ph - 6, w, ph)]);
        }
        break;
      case 'brochure':
        if (d.fold === 'bi') {
          const w = ph / 2;
          sheet(ph, pw, [{ i: 3, x: 0, y: 0, w, h: pw }, { i: 0, x: w, y: 0, w, h: pw }], 'Sheet 1 is the outside (back cover and front cover).', [fold(w, 0, w, 6), fold(w, pw - 6, w, pw)]);
          sheet(ph, pw, [{ i: 1, x: 0, y: 0, w, h: pw }, { i: 2, x: w, y: 0, w, h: pw }], 'Sheet 2 is the inside: print it on the back of sheet 1, then fold in half.', [fold(w, 0, w, 6), fold(w, pw - 6, w, pw)]);
        } else {
          const w = ph / 3, f = [fold(w, 0, w, 6), fold(w, pw - 6, w, pw), fold(2 * w, 0, 2 * w, 6), fold(2 * w, pw - 6, 2 * w, pw)];
          sheet(ph, pw, [{ i: 2, x: 0, y: 0, w, h: pw }, { i: 1, x: w, y: 0, w, h: pw }, { i: 0, x: 2 * w, y: 0, w, h: pw }], 'Sheet 1 is the outside: inside flap, back cover, front cover.', f);
          sheet(ph, pw, [{ i: 3, x: 0, y: 0, w, h: pw }, { i: 4, x: w, y: 0, w, h: pw }, { i: 5, x: 2 * w, y: 0, w, h: pw }], 'Sheet 2 is the inside: print it on the back of sheet 1. Fold the right panel in first, then the left one over it.', f);
        }
        break;
      case 'postcard': {
        const spec = PC.POSTCARD[d.pcSize] || PC.POSTCARD['4x6'];
        sheet(spec.page[0], spec.page[1], grid(spec, 0, { cut: true }), 'Fronts. Cut at the marks.');
        if (hasContent(1)) sheet(spec.page[0], spec.page[1], grid(spec, 1, { mirror: true, cut: true }), 'Backs: print on the other side of the fronts sheet.');
        break;
      }
      case 'businesscard': {
        const spec = PC.BCARD[d.paper];
        sheet(spec.page[0], spec.page[1], grid(spec, 0), 'Fronts. Use perforated business card sheets, or cut at the card edges.');
        if (hasContent(1)) sheet(spec.page[0], spec.page[1], grid(spec, 1, { mirror: true }), 'Backs: print on the other side of the fronts sheet.');
        break;
      }
      case 'labels': {
        const spec = PC.LABEL_STOCK[d.stock] || PC.LABEL_STOCK['5160'], n = spec.cols * spec.rows, list = PC.addressList();
        let start = Math.max(1, Math.min(n, d.labelStart || 1)) - 1;
        if (!list.length) sheet(spec.page[0], spec.page[1], grid(spec, 0, { slots: Array.from({ length: n - start }, (_, k) => k + start) }), `${spec.name}.`);
        else {
          let at = 0;
          while (at < list.length) {
            const slots = [], merge = [];
            for (let k = start; k < n && at < list.length; k++) { slots.push(k); merge.push(list[at++]); }
            sheet(spec.page[0], spec.page[1], grid(spec, 0, { slots, merge }), S.length ? '' : `${list.length} addresses, one per label.`);
            start = 0;
          }
        }
        break;
      }
      case 'cd': {
        const spec = PC.DISC[d.paper];
        sheet(spec.page[0], spec.page[1], grid(spec, 0), `${spec.name}.`);
        const fx = (pw - 120) / 2, bx = (pw - 150) / 2, by = 20 + 120 + 14;
        sheet(pw, ph, [{ i: 1, x: fx, y: 20, w: 120, h: 120, cut: true }, { i: 2, x: bx, y: by, w: 150, h: 118, cut: true }], 'Case inserts: cut at the marks and fold the back insert at the spine marks.',
          [fold(bx + 6.5, by - 8, bx + 6.5, by - 2), fold(bx + 143.5, by - 8, bx + 143.5, by - 2), fold(bx + 6.5, by + 120, bx + 6.5, by + 126), fold(bx + 143.5, by + 120, bx + 143.5, by + 126)]);
        break;
      }
      case 'stationery': {
        const e = PC.ENVELOPE[d.paper], spec = PC.BCARD[d.paper];
        sheet(pw, ph, [{ i: 0, x: 0, y: 0, w: pw, h: ph }], 'Letterhead.');
        sheet(e.w, e.h, [{ i: 1, x: 0, y: 0, w: e.w, h: e.h }], `${e.name}: choose this envelope size in the print window.`);
        sheet(spec.page[0], spec.page[1], grid(spec, 2), 'Business cards.');
        break;
      }
      case 'banner': {
        const seg = ph - 12.7, bh = pw - 25.4;
        for (let n = 0; n < d.bannerPages; n++) {
          const x = (pw - bh) / 2, y = (ph - seg) / 2;
          sheet(pw, ph, [{ i: 0, x, y, w: bh, h: seg, rot: 90, crop: { x: n * seg, w: seg } }], n === 0 ? 'Trim each page at the marks and tape them together in order.' : '',
            [[x - 4, y, x - 1, y], [x + bh + 1, y, x + bh + 4, y], [x - 4, y + seg, x - 1, y + seg], [x + bh + 1, y + seg, x + bh + 4, y + seg]]);
          S[S.length - 1].label = `${n + 1} of ${d.bannerPages}`;
        }
        break;
      }
      default:
        d.panels.forEach((p, i) => sheet(p.w, p.h, [{ i, x: 0, y: 0, w: p.w, h: p.h }]));
    }
    return S;
  };

  // ------------------------------------------------------------------ drawing sheets as pixels
  async function rasterSheets(sheets, dpi, onStep) {
    const cache = new Map(), out = [];
    const art = async (i, merge) => { const key = i + '|' + (merge ?? ''); if (!cache.has(key)) cache.set(key, await PC.renderPanel(i, dpi, { merge })); return cache.get(key); };
    for (let s = 0; s < sheets.length; s++) {
      const sh = sheets[s], k = Math.min(dpi, maxDpi(sh.w, sh.h)) / 25.4;
      const c = document.createElement('canvas'); c.width = Math.round(sh.w * k); c.height = Math.round(sh.h * k);
      const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
      for (const it of sh.items) {
        const img = await art(it.i, it.merge), p = PC.doc.panels[it.i];
        x.save();
        x.translate((it.x + it.w / 2) * k, (it.y + it.h / 2) * k); x.rotate(((it.rot || 0) * Math.PI) / 180);
        const bw = it.rot % 180 ? it.h : it.w, bh = it.rot % 180 ? it.w : it.h; // the box before turning
        if (it.crop) { const sx = img.width / p.w; x.drawImage(img, it.crop.x * sx, 0, it.crop.w * sx, img.height, (-bw / 2) * k, (-bh / 2) * k, bw * k, bh * k); }
        else x.drawImage(img, (-bw / 2) * k, (-bh / 2) * k, bw * k, bh * k);
        x.restore();
      }
      drawMarks(x, sh, k);
      if (PC.doc.print && PC.doc.print.media === 'ironon') { const m = document.createElement('canvas'); m.width = c.width; m.height = c.height; const mx = m.getContext('2d'); mx.translate(c.width, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0); out.push({ canvas: m, w: sh.w, h: sh.h }); }
      else out.push({ canvas: c, w: sh.w, h: sh.h });
      onStep && onStep(s + 1, sheets.length);
    }
    return out;
  }
  function markLines(sh) {
    const L = [...sh.marks];
    sh.items.forEach((it) => { if (!it.cut) return; const g = 2, n = 5; [[it.x, it.y, -1, -1], [it.x + it.w, it.y, 1, -1], [it.x, it.y + it.h, -1, 1], [it.x + it.w, it.y + it.h, 1, 1]].forEach(([cx, cy, sx, sy]) => { L.push([cx + sx * g, cy, cx + sx * (g + n), cy]); L.push([cx, cy + sy * g, cx, cy + sy * (g + n)]); }); });
    return L;
  }
  function drawMarks(x, sh, k) {
    x.save(); x.strokeStyle = '#8a8f99'; x.lineWidth = Math.max(1, 0.2 * k);
    markLines(sh).forEach(([a, b, c, d, dashed]) => { x.setLineDash(dashed ? [1.5 * k, 1.2 * k] : []); x.beginPath(); x.moveTo(a * k, b * k); x.lineTo(c * k, d * k); x.stroke(); });
    if (sh.label) { x.fillStyle = '#9aa1ad'; x.font = `${3 * k}px Arial`; x.textAlign = 'center'; x.fillText(sh.label, (sh.w / 2) * k, (sh.h - 1.5) * k); }
    x.restore();
  }

  // ------------------------------------------------------------------ drawing sheets as vectors (SVG)
  let uid = 0;
  async function vectorSheets(sheets, onStep) {
    const cache = new Map(), out = [];
    const art = async (i, merge) => { const key = i + '|' + (merge ?? ''); if (!cache.has(key)) cache.set(key, await PC.renderPanelSVG(i, { merge })); return cache.get(key); };
    for (let s = 0; s < sheets.length; s++) {
      const sh = sheets[s];
      let body = '';
      for (const it of sh.items) {
        const a = await art(it.i, it.merge), p = a.p, sc = p.w / a.W, rot = it.rot || 0;
        const bw = rot % 180 ? it.h : it.w, bh = rot % 180 ? it.w : it.h, id = 'pc' + ++uid;
        let inner = a.inner, clip = '';
        if (p.shape === 'disc') { clip = `<clipPath id="${id}d"><path clip-rule="evenodd" d="${PC.discPath(a.W, a.H, px(p.hole || 41))}"/></clipPath>`; inner = `<g clip-path="url(#${id}d)">${inner}</g>`; }
        let g = `<g transform="translate(${-bw / 2} ${-bh / 2}) scale(${sc})">${inner}</g>`;
        if (it.crop) { g = `<clipPath id="${id}c"><rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}"/></clipPath><g clip-path="url(#${id}c)"><g transform="translate(${-it.crop.x} 0)">${g}</g></g>`; }
        body += `${clip}<g transform="translate(${it.x + it.w / 2} ${it.y + it.h / 2}) rotate(${rot})">${g}</g>`;
      }
      body += markLines(sh).map(([a, b, c, d, dashed]) => `<path d="M${a} ${b}L${c} ${d}" stroke="#8a8f99" stroke-width="0.2" ${dashed ? 'stroke-dasharray="1.5 1.2"' : ''} fill="none"/>`).join('');
      if (sh.label) body += `<text x="${sh.w / 2}" y="${sh.h - 1.5}" font-size="3" font-family="Arial" fill="#9aa1ad" text-anchor="middle">${esc(sh.label)}</text>`;
      if (PC.doc.print && PC.doc.print.media === 'ironon') body = `<g transform="translate(${sh.w} 0) scale(-1 1)">${body}</g>`;
      out.push({ svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${sh.w}mm" height="${sh.h}mm" viewBox="0 0 ${sh.w} ${sh.h}"><rect width="${sh.w}" height="${sh.h}" fill="#ffffff"/>${body}</svg>`, w: sh.w, h: sh.h });
      onStep && onStep(s + 1, sheets.length);
    }
    return out;
  }

  // ------------------------------------------------------------------ files: PDF and ZIP writers
  const enc = new TextEncoder();
  function makePDF(pages) { // pages: [{ jpeg: Uint8Array, pw, ph (pixels), w, h (mm) }]
    const chunks = [], offsets = [];
    let size = 0;
    const add = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); size += b.length; };
    const obj = (n, body) => { offsets[n] = size; add(`${n} 0 obj\n`); body.forEach(add); add('\nendobj\n'); };
    add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const n = pages.length, kids = pages.map((_, k) => `${3 + k * 3} 0 R`).join(' ');
    obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`]);
    pages.forEach((p, k) => {
      const W = (p.w / 25.4) * 72, H = (p.h / 25.4) * 72, pg = 3 + k * 3, content = `q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im0 Do Q`;
      obj(pg, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /XObject << /Im0 ${pg + 2} 0 R >> >> /Contents ${pg + 1} 0 R >>`]);
      obj(pg + 1, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
      obj(pg + 2, [`<< /Type /XObject /Subtype /Image /Width ${p.pw} /Height ${p.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, '\nendstream']);
    });
    const xref = size, count = 3 + n * 3;
    add(`xref\n0 ${count}\n0000000000 65535 f \n`);
    for (let k = 1; k < count; k++) add(`${String(offsets[k]).padStart(10, '0')} 00000 n \n`);
    add(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function makeZip(files) { // files: [{ name, bytes }] stored without compression (pictures are compressed already)
    const parts = [], central = [];
    let off = 0;
    const u16 = (v) => [v & 255, (v >> 8) & 255], u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
    files.forEach((f) => {
      const name = enc.encode(f.name), crc = crc32(f.bytes), len = f.bytes.length;
      const head = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(len), ...u32(len), ...u16(name.length), ...u16(0)]);
      parts.push(head, name, f.bytes);
      central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(len), ...u32(len), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
      off += head.length + name.length + len;
    });
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), ...u16(0)]);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  const blobBytes = async (b) => new Uint8Array(await b.arrayBuffer());
  const canvasBlob = (c, type, q) => new Promise((r) => c.toBlob(r, type, q));
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
  const baseName = () => (PC.doc.name || 'presscraft').replace(/[^\w -]+/g, '').trim() || 'presscraft';

  // ------------------------------------------------------------------ the Print and export dialog
  const opts = () => (PC.doc.print = PC.doc.print || { dpi: 300, media: 'plain' });
  async function preview() {
    const sheets = PC.layout();
    $('print-prev').innerHTML = '<p class="hint">Getting the sheets ready…</p>';
    const imgs = await rasterSheets(sheets, 40, (n, of) => { $('print-prev').innerHTML = `<p class="hint">Getting the sheets ready… ${n} of ${of}</p>`; });
    $('print-prev').innerHTML = imgs.map((s, i) => `<figure><img alt="Sheet ${i + 1}" src="${s.canvas.toDataURL('image/png')}"><figcaption>Sheet ${i + 1}${sheets[i].note ? ': ' + esc(sheets[i].note) : ''}</figcaption></figure>`).join('');
    const sizes = [...new Set(sheets.map((s) => `${s.w}×${s.h}`))].length;
    $('print-note').textContent = `${sheets.length} sheet${sheets.length === 1 ? '' : 's'}${sizes > 1 ? ' in different sizes' : ''}. In the print window choose margins None and scale 100% (Actual size); choose "Save as PDF" as the printer to make a PDF from there.`;
  }
  function showOpts() {
    const o = opts(), d = PC.doc;
    $('pq').innerHTML = PC.QUALITY.map(([v, n]) => `<option value="${v}" ${v === o.dpi ? 'selected' : ''}>${n}</option>`).join('');
    $('pm').innerHTML = PC.MEDIA.map(([v, n]) => `<option value="${v}" ${v === o.media ? 'selected' : ''}>${n}</option>`).join('');
    const tip = () => {
      const m = PC.MEDIA.find(([v]) => v === opts().media) || PC.MEDIA[0], dpi = opts().dpi;
      $('pm-tip').textContent = m[2];
      $('pq-tip').textContent = d.retro ? 'The retro look is made of dots, so it always prints as a picture (up to about 800 DPI for a full page).'
        : dpi > 600 ? 'Text, shapes and clip art are sent as vectors, so they print as sharp as your printer allows. Set the same quality in your printer settings.'
        : 'Pages are sent as pictures at this resolution. 300 DPI suits most printing; 600 DPI for small text and photo paper.';
    };
    tip();
    $('pq').onchange = () => { opts().dpi = +$('pq').value; tip(); PC.changed(); };
    $('pm').onchange = () => { opts().media = $('pm').value; tip(); PC.changed(); preview(); };
    $('px-what').innerHTML = '<option value="sheets">Printable sheets (as they print)</option><option value="panels">Each page or panel on its own</option>';
  }
  PC.openPrint = async function () {
    if (!PC.doc) return;
    $('printdlg').hidden = false;
    showOpts();
    await preview();
  };
  // Sheets or panels to save: panels are laid out one per "sheet" at their own size.
  function exportSheets() {
    if ($('px-what').value === 'panels') return PC.doc.panels.map((p, i) => ({ w: p.w, h: p.h, items: [{ i, x: 0, y: 0, w: p.w, h: p.h }], marks: [] }));
    return PC.layout();
  }
  const busy = (on, msg) => { $('print-note').textContent = on ? msg : ''; document.querySelectorAll('#printdlg .dialog-actions .btn, #printdlg .px-btn').forEach((b) => { b.disabled = on; }); };
  $('print-go').onclick = async () => {
    const o = opts(), sheets = PC.layout(), vector = o.dpi > 600 && !PC.doc.retro;
    busy(true, 'Getting the sheets ready to print…');
    const area = $('print-area');
    const sizes = [...new Set(sheets.map((s) => `${s.w}x${s.h}`))];
    let css = sizes.map((sz, k) => { const [w, h] = sz.split('x'); return `@page s${k} { size: ${w}mm ${h}mm; margin: 0; }`; }).join('\n');
    css += `\n@page { size: ${sheets[0].w}mm ${sheets[0].h}mm; margin: 0; }`;
    const pageOf = (s) => 's' + sizes.indexOf(`${s.w}x${s.h}`);
    if (vector) {
      const out = await vectorSheets(sheets);
      area.innerHTML = `<style>${css} #print-area .sheet { break-after: page; page-break-after: always; } #print-area .sheet:last-child { break-after: auto; }</style>`
        + out.map((s, k) => `<div class="sheet" style="page:${pageOf(sheets[k])};width:${s.w}mm;height:${s.h}mm;overflow:hidden">${s.svg.replace('<svg ', `<svg style="display:block;width:${s.w}mm;height:${s.h}mm" `)}</div>`).join('');
    } else {
      const out = await rasterSheets(sheets, o.dpi, (n, of) => { $('print-note').textContent = `Getting the sheets ready to print… ${n} of ${of}`; });
      area.innerHTML = `<style>${css}</style>` + out.map((s, k) => `<img alt="" src="${s.canvas.toDataURL('image/png')}" style="page:${pageOf(sheets[k])};width:${s.w}mm;height:${s.h}mm">`).join('');
      await Promise.all([...area.querySelectorAll('img')].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = r; }))));
    }
    busy(false);
    $('printdlg').hidden = true;
    window.print();
  };
  async function rasterFiles(type) {
    const o = opts(), sheets = exportSheets(), dpi = Math.min(o.dpi, 1200);
    const out = await rasterSheets(sheets, dpi, (n, of) => { $('print-note').textContent = `Making the pictures… ${n} of ${of}`; });
    return { out, sheets, capped: sheets.some((s) => Math.min(o.dpi, maxDpi(s.w, s.h)) < o.dpi) };
  }
  async function saveRaster(fmt) {
    busy(true, 'Making the pictures…');
    try {
      const { out, capped } = await rasterFiles(fmt), name = baseName(), type = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
      if (fmt === 'pdf') {
        const pages = [];
        for (const s of out) pages.push({ jpeg: await blobBytes(await canvasBlob(s.canvas, 'image/jpeg', 0.92)), pw: s.canvas.width, ph: s.canvas.height, w: s.w, h: s.h });
        download(makePDF(pages), `${name}.pdf`);
      } else if (out.length === 1) download(await canvasBlob(out[0].canvas, type, 0.92), `${name}.${fmt}`);
      else {
        const files = [];
        for (let k = 0; k < out.length; k++) files.push({ name: `${name}-${String(k + 1).padStart(2, '0')}.${fmt}`, bytes: await blobBytes(await canvasBlob(out[k].canvas, type, 0.92)) });
        download(makeZip(files), `${name}-${fmt}.zip`);
      }
      busy(false);
      PC.ui.toast(`Saved${capped ? ' (pictures were limited to the largest size the browser can make)' : ''}.`);
    } catch (e) { busy(false); PC.ui.toast('Could not save: ' + e.message); }
  }
  async function saveSVG() {
    if (PC.doc.retro) PC.ui.toast('SVG files keep the design sharp, without the retro dots.');
    busy(true, 'Making the SVG files…');
    const out = await vectorSheets(exportSheets()), name = baseName();
    if (out.length === 1) download(new Blob([out[0].svg], { type: 'image/svg+xml' }), `${name}.svg`);
    else download(makeZip(out.map((s, k) => ({ name: `${name}-${String(k + 1).padStart(2, '0')}.svg`, bytes: enc.encode(s.svg) }))), `${name}-svg.zip`);
    busy(false);
    PC.ui.toast('Saved. The SVG uses the font names, so open it on a computer that has the same fonts.');
  }
  $('px-pdf').onclick = () => saveRaster('pdf');
  $('px-png').onclick = () => saveRaster('png');
  $('px-jpg').onclick = () => saveRaster('jpg');
  $('px-svg').onclick = saveSVG;
  $('print-cancel').onclick = () => { $('printdlg').hidden = true; };
  PC.output = { makePDF, makeZip, rasterSheets, vectorSheets, maxDpi };
})();
