/* My files (window.CraftFiles): a file manager for everything the Craft apps keep (like a NAS's file station):
   a folder tree, a file list (details or thumbnails), a path bar, a toolbar, right-click menus, select many (Ctrl, Shift),
   drag and drop, and "This computer": a folder on this computer beside it, compared file by file, to upload and download.
     📁 My files       your own files and folders (any kind): in your account (logged in) and this browser
     🖼 My pictures    the pictures every Craft app can use (Clip art › My pictures), in folders too
     ☁ My account     what your account keeps for each app (settings, calendar sets, barcodes, …)
     📍 Locations      the schedules and backups of the locations you work at (changed in ShiftCraft)
     🖥 This browser   what the apps keep in this browser
     🗑 Recycle bin    what you deleted from your account (put it back, or delete it for good)
   Upload (files or a whole folder), download (many at once as a .zip), new folder, rename, move (drag onto a folder, or
   Cut and Paste), compress to .zip, extract a .zip, delete (to the Recycle bin), export / import everything.
   Everything is kept as data (the account's database, or this browser's storage): never loose files on the server.
   Keys and your login are never shown or exported here (keys travel locked: AccountCraft › Keys).
     CraftFiles.open({ app })   a window over the app        CraftFiles.mount(el, { app })   inside a page
     CraftFiles.pick({ app, folder, accept: /\.label\.json$/i, title }) → { blob, name, path } or null: choose a file to open
       (double-click it, or Open), starting in My files › folder; any file the app takes, from anywhere (My computer too)
     CraftFiles.saveFile({ folder, name, blob }) → the saved file: into My files › folder (the same name is replaced)
     CraftFiles.listFiles({ folder }) → [{ name, path, size, time, type }]     CraftFiles.readFile({ folder, name }) → Blob or null
   Each app keeps its own copy (the master is in AccountCraft). */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = () => { const a = window.CraftAccount; return a && a.user && a.user() ? a : null; };
  const APPS = { craft: 'Every app', shiftcraft: 'ShiftCraft', icalcraft: 'ICalCraft', clipartcraft: 'ClipArtCraft', imagecraft: 'ImageCraft', barcodecraft: 'BarcodeCraft', accountcraft: 'AccountCraft', labelcraft: 'LabelCraft', logocraft: 'LogoCraft', presscraft: 'PressCraft', sitecraft: 'SiteCraft', '3dcraft': '3DCraft', datacraft: 'DataCraft', ataricraft: 'AtariCraft', other: 'Other' };
  const appName = (a) => APPS[a] || a;
  const ROOTS = [['computer', '💻', 'My computer'], ['files', '📁', 'My files'], ['pictures', '🖼', 'My pictures'], ['account', '☁', 'My account'], ['locations', '📍', 'Locations'], ['browser', '🖥', 'This browser'], ['bin', '🗑', 'Recycle bin']];
  const ROOT = Object.fromEntries(ROOTS.map(([k, i, n]) => [k, { icon: i, name: n }]));
  const KINDS = { folder: ['📁', 'Folder'], picture: ['🖼', 'Picture'], calendar: ['📅', 'Calendar'], schedule: ['📋', 'Schedule'], backup: ['🛟', 'Backup'], barcodes: ['▦', 'Barcodes'], design: ['🎨', 'Design'], settings: ['⚙', 'Settings'], keys: ['🔑', 'Keys'], login: ['🔐', 'Login'], zip: ['🗜', 'Zip archive'], text: ['📝', 'Text'], pdf: ['📕', 'PDF'], file: ['📄', 'File'], data: ['🧩', 'Data'] };
  function kindOf(app, key) {
    const k = String(key).toLowerCase();
    if (k === 'vault' || k === 'craft-ai-keys' || /-keys$/.test(k) && !/barcode/.test(k)) return 'keys';
    if (k === 'craft-account' || k === 'craft-account-keys') return 'login';
    if (/^backup /.test(k)) return 'backup';
    if (app === 'icalcraft' && /^set /.test(k) || k === 'icalcraft-imports') return 'calendar';
    if (k === 'plan' || k === 'shiftcraft-v1') return 'schedule';
    if (/barcodes/.test(k)) return 'barcodes';
    if (/border|deco|design/.test(k)) return 'design';
    if (/prefs|ui$|-ui|choices|settings|mode|follow|-tree|-size|config|rail|theme|recent|-pref|layout|quick|ribbon/.test(k) || app === 'craft') return 'settings';
    return 'data';
  }
  const kindOfFile = (name, type) => /\.zip$/i.test(name) || /zip/.test(type || '') ? 'zip' : /^image\//.test(type || '') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name) ? 'picture' : /calendar/.test(type || '') || /\.ics$/i.test(name) ? 'calendar' : /pdf/.test(type || '') ? 'pdf' : /^text\/|json/.test(type || '') || /\.(txt|json|csv|md)$/i.test(name) ? 'text' : 'file';
  const sizeText = (n) => (n == null || n === '' ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
  const when = (t) => { if (!t) return ''; const d = new Date(typeof t === 'number' ? t : String(t).replace(' ', 'T')); return isNaN(d) ? String(t) : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); };
  const whenShort = (t) => { if (!t) return ''; const d = new Date(typeof t === 'number' ? t : String(t).replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }); };
  const msOf = (t) => { if (!t) return 0; const d = new Date(typeof t === 'number' ? t : String(t).replace(' ', 'T')); return isNaN(d) ? 0 : d.getTime(); };
  const safeKey = (s) => String(s).replace(/[^\w.\- ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'file';
  const cleanName = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 120);
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = cleanName(name) || 'file'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const dataBlob = (u) => { const m = String(u).match(/^data:([^;,]*)(;base64)?,(.*)$/); if (!m) return new Blob([String(u)]); if (!m[2]) return new Blob([decodeURIComponent(m[3])], { type: m[1] }); const b = atob(m[3]), u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i); return new Blob([u8], { type: m[1] }); };
  const toData = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
  const extOf = (type) => ({ 'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'text/calendar': 'ics', 'application/json': 'json', 'text/plain': 'txt', 'application/pdf': 'pdf', 'application/zip': 'zip' }[type] || '');
  const typeOfName = (n) => ({ svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', ics: 'text/calendar', json: 'application/json', txt: 'text/plain', csv: 'text/csv', md: 'text/plain', pdf: 'application/pdf', zip: 'application/zip', html: 'text/html' }[(String(n).match(/\.(\w+)$/) || [])[1]?.toLowerCase()] || 'application/octet-stream');

  // ------------------------------------------------------------------ zip: write (stored) and read (stored or deflated)
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  async function zipOf(files) { // files: [{ name (path inside), blob, time }]
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer()), nm = enc.encode(f.name), crc = crc32(data), d = new Date(f.time || Date.now());
      const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length;
    }
    const size = cen.reduce((n, p) => n + p.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  async function unzip(blob) { // → [{ name, blob, time }]
    const u8 = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(u8.buffer), dec = new TextDecoder();
    let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('That is not a zip file (or it is damaged).');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = [];
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), tm = dv.getUint16(p + 12, true), dt = dv.getUint16(p + 14, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      if (name.endsWith('/')) continue;
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = u8.subarray(start, start + csize);
      let data;
      if (method === 0) data = raw;
      else if (method === 8 && typeof DecompressionStream === 'function') data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else throw new Error(`${name}: this kind of zip packing cannot be opened here.`);
      const time = new Date(1980 + (dt >> 9), ((dt >> 5) & 15) - 1, dt & 31, tm >> 11, (tm >> 5) & 63, (tm & 31) * 2).getTime();
      out.push({ name, blob: new Blob([data], { type: typeOfName(name) }), time });
    }
    return out;
  }

  // ------------------------------------------------------------------ the two stores of yours (My files, My pictures): this browser + your account
  const STORES = { files: { db: 'craft-files', app: 'files' }, pictures: { db: 'craft-pictures', app: 'pictures' } };
  const idb = (name) => new Promise((ok, no) => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('items')) r.result.createObjectStore('items', { keyPath: 'id' }); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const idbAll = async (name) => { try { const d = await idb(name); return await new Promise((ok, no) => { const q = d.transaction('items', 'readonly').objectStore('items').getAll(); q.onsuccess = () => ok(q.result || []); q.onerror = () => no(q.error); }); } catch (e) { return []; } };
  const idbPut = async (name, v) => { const d = await idb(name); return new Promise((ok, no) => { const t = d.transaction('items', 'readwrite'); t.objectStore('items').put(v); t.oncomplete = ok; t.onerror = () => no(t.error); }); };
  const idbDel = async (name, id) => { const d = await idb(name); return new Promise((ok, no) => { const t = d.transaction('items', 'readwrite'); t.objectStore('items').delete(id); t.oncomplete = ok; t.onerror = () => no(t.error); }); };
  async function storeAll(s) {
    const S = STORES[s], here = await idbAll(S.db), all = new Map(here.map((x) => [x.id, x])), a = A();
    if (a) { try { const r = await a.all(S.app), there = new Set();
      for (const [id, v] of Object.entries(r || {})) { const x = v && v.value; if (!x || !x.id) continue; there.add(id); const o = all.get(id); if (!o || (x.saved || '') > (o.saved || '')) { all.set(id, x); idbPut(S.db, x).catch(() => {}); } }
      for (const x of here) if (!there.has(x.id) && !x.gone) a.put(S.app, x.id, x).catch(() => {}); } catch (e) { /* not now */ } }
    return [...all.values()].filter((x) => !x.gone);
  }
  async function storePut(s, x) {
    x.saved = new Date().toISOString(); if (JSON.stringify(x).length > 3900000) throw new Error(`${x.name} is more than one saved thing can hold (4 MB).`);
    await idbPut(STORES[s].db, x); const a = A(); if (a) await a.put(STORES[s].app, x.id, x);
  }
  async function storeDel(s, x) {
    const a = A(); if (a) { await a.put('bin', safeKey(`${Date.now().toString(36)} ${STORES[s].app} ${x.id}`), { app: STORES[s].app, key: x.id, value: x, label: x.name, path: x.path || '', deleted: new Date().toISOString() }); await a.remove(STORES[s].app, x.id).catch(() => {}); }
    await idbDel(STORES[s].db, x.id);
  }
  // a file kept in My files: { id, name, path (its folder, 'A/B' or ''), type, data (data: URL), size, time, saved } (a folder: type 'folder')
  async function keepFile(file, path = '', s = 'files') {
    const x = { id: uid(s === 'files' ? 'f' : 'p'), name: cleanName(file.name) || 'file', path, type: file.type || typeOfName(file.name), data: await toData(file), size: file.size, time: file.lastModified || Date.now(), ...(s === 'pictures' ? { from: 'My files' } : {}) };
    await storePut(s, x); return x;
  }

  // ------------------------------------------------------------------ every entry, as files and folders
  // entry: { id, root, path (folder, inside the root), name, dir, kind, size, time, x (the stored thing) | get(), store, … }
  async function gather() {
    const out = [], a = A();
    for (const s of ['files', 'pictures']) for (const x of await storeAll(s)) {
      const dir = x.type === 'folder';
      out.push({ id: `${s}|${x.id}`, root: s, path: x.path || '', name: x.name || 'file', dir, kind: dir ? 'folder' : s === 'pictures' ? 'picture' : kindOfFile(x.name, x.type), size: dir ? '' : x.size || (x.data || '').length * 0.75, time: x.time || msOf(x.saved), x, store: s, thumb: !dir && /^data:image\//.test(x.data || '') ? x.data : '' });
    }
    if (a) {
      let idx = {}; try { idx = await a.api('GET', 'data'); } catch (e) { idx = {}; }
      for (const [app, keys] of Object.entries(idx || {})) for (const [key, m] of Object.entries(keys)) {
        if (app === 'files' || app === 'pictures') continue;
        if (app === 'bin') { out.push({ id: `bin|${key}`, root: 'bin', path: '', name: key.replace(/^\S+ /, ''), kind: 'data', size: m.size, time: msOf(m.changed), get: () => a.get('bin', key), key }); continue; }
        const kind = kindOf(app, key); if (kind === 'login') continue;
        out.push({ id: `acct|${app}|${key}`, root: 'account', path: appName(app), name: (kind === 'calendar' ? key.replace(/^set /, '') + '.ics' : key + '.json'), kind, size: m.size, time: msOf(m.changed), get: () => a.get(app, key), app, key });
      }
      try { for (const l of (await a.api('GET', 'locations')).locations || []) {
        const nm = `${l.name}${l.number && !String(l.name).includes(l.number) ? ' #' + l.number : ''}`, co = l.companyName || 'No company';
        let o = {}; try { o = await a.api('GET', `locations/${l.id}/data/shiftcraft`); } catch (e) { o = {}; }
        for (const [key, v] of Object.entries(o || {})) out.push({ id: `loc|${l.id}|${key}`, root: 'locations', path: `${co}/${nm}`, name: (key === 'plan' ? 'Schedule' : key) + '.json', kind: kindOf('shiftcraft', key), size: JSON.stringify(v.value || null).length, time: msOf(v.changed), get: async () => v.value, app: 'shiftcraft', key, locId: l.id });
      } } catch (e) { /* none */ }
    }
    try { for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i), v = localStorage.getItem(key) || '', app = (key.match(/^([a-z0-9]+craft|craft)(?=[-_]|$)/) || [, 'other'])[1], kind = kindOf(app, key);
      if (kind === 'login') continue;
      out.push({ id: `ls|${key}`, root: 'browser', path: appName(app), name: key, kind, size: v.length, time: 0, get: async () => { const t = localStorage.getItem(key); try { return JSON.parse(t); } catch (e) { return t; } }, lsKey: key });
    } } catch (e) { /* blocked */ }
    return out;
  }
  // the folders (from every entry's path, and the folder entries of your own stores)
  const full = (e) => [e.root, ...(e.path ? e.path.split('/') : [])].join('/');
  const fullOf = (root, path) => [root, ...(path ? path.split('/') : [])].join('/');
  const writable = (root) => root === 'files' || root === 'pictures';

  // ------------------------------------------------------------------ the look
  const CSS = `.cf{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr);height:100%;min-height:0;color:var(--fg,var(--text,#e8e9ee));font:13.5px/1.35 system-ui,"Segoe UI",sans-serif;background:var(--bg,#16171d);border-radius:10px;overflow:hidden;user-select:none}
.cf button,.cf input,.cf select{font:inherit;color:inherit}
.cf .tb{display:flex;gap:4px;align-items:center;flex-wrap:wrap;padding:7px 8px;background:var(--panel,#1f2129);border-bottom:1px solid var(--line,#3a3e4c)}
.cf .tb .bt{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:6px;border:1px solid transparent;background:transparent;cursor:pointer;white-space:nowrap}.cf .tb .bt:hover:not(:disabled){background:var(--panel-2,#2a2d38);border-color:var(--line,#3a3e4c)}.cf .tb .bt:disabled{opacity:.4;cursor:default}.cf .tb .bt.main{background:var(--accent,#2f6fdd);color:#fff}.cf .tb .sep{width:1px;height:22px;background:var(--line,#3a3e4c);margin:0 3px}.cf .tb .grow{flex:1}
.cf .path{display:flex;gap:6px;align-items:center;padding:6px 8px;background:var(--panel,#1f2129);border-bottom:1px solid var(--line,#3a3e4c)}.cf .crumbs{flex:1;display:flex;align-items:center;gap:2px;min-width:0;overflow-x:auto;scrollbar-width:none;padding:3px 6px;border-radius:6px;background:var(--panel-2,#2a2d38)}.cf .crumbs button{border:0;background:none;cursor:pointer;padding:2px 5px;border-radius:5px;white-space:nowrap}.cf .crumbs button:hover{background:var(--line,#3a3e4c)}.cf .crumbs span{opacity:.5}
.cf .path input[type=search]{width:200px;padding:5px 9px;border-radius:6px;border:1px solid var(--line,#3a3e4c);background:var(--panel-2,#2a2d38)}.cf .nav{border:0;background:none;cursor:pointer;padding:3px 7px;border-radius:5px;font-size:15px}.cf .nav:disabled{opacity:.35}
.cf .main{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:0}.cf .main.two{grid-template-columns:220px minmax(0,1fr) minmax(0,1fr)}
.cf .tree{overflow:auto;padding:6px 4px;border-right:1px solid var(--line,#3a3e4c);background:var(--panel,#1f2129);overscroll-behavior:contain}.cf .tn{display:flex;align-items:center;gap:3px;padding:3px 4px;border-radius:5px;cursor:pointer;white-space:nowrap}.cf .tn:hover{background:var(--panel-2,#2a2d38)}.cf .tn.on{background:var(--accent,#2f6fdd);color:#fff}.cf .tn.drop{outline:2px dashed var(--accent,#2f6fdd)}.cf .tn .tw{width:14px;text-align:center;opacity:.7;font-size:10px;flex:none}.cf .tn .nm{overflow:hidden;text-overflow:ellipsis}
.cf .pane{display:grid;grid-template-rows:auto minmax(0,1fr);min-height:0;min-width:0}.cf .pane+.pane{border-left:2px solid var(--line,#3a3e4c)}.cf .ph{display:flex;align-items:center;gap:6px;padding:5px 8px;font-size:12px;background:var(--panel-2,#2a2d38);border-bottom:1px solid var(--line,#3a3e4c);white-space:nowrap;overflow:hidden}.cf .ph b{overflow:hidden;text-overflow:ellipsis}
.cf .list{overflow:auto;min-height:0;overscroll-behavior:contain;position:relative}.cf .list.drop{outline:2px dashed var(--accent,#2f6fdd);outline-offset:-4px}
.cf table{width:100%;border-collapse:collapse}.cf th{position:sticky;top:0;z-index:1;background:var(--panel,#1f2129);text-align:left;font-weight:600;font-size:12px;padding:6px 8px;border-bottom:1px solid var(--line,#3a3e4c);cursor:pointer;white-space:nowrap}.cf th:hover{color:var(--accent,#6f8ff5)}.cf td{padding:4px 8px;border-bottom:1px solid rgba(127,127,127,.12);white-space:nowrap}.cf td.n{max-width:0;width:100%;min-width:130px;overflow:hidden;text-overflow:ellipsis}.cf .main.two th[data-sort=kind],.cf .main.two td.k{display:none}.cf td.n .ic{display:inline-grid;place-items:center;width:22px;height:22px;margin-right:6px;vertical-align:middle;border-radius:4px;overflow:hidden}.cf td.n .ic img{max-width:22px;max-height:22px}.cf td.dim{opacity:.7;font-size:12px}
.cf tr[data-upone]{cursor:pointer}.cf tr[data-upone] td{opacity:.95}.cf tr[data-upone].drop td,.cf .card[data-upone].drop{outline:2px dashed var(--accent,#2f6fdd)}.cf tr.sel td,.cf .card.sel{background:rgba(47,111,221,.28)}.cf tbody tr:hover td{background:rgba(127,127,127,.1)}.cf tr.sel:hover td{background:rgba(47,111,221,.34)}.cf tr.drop td,.cf .card.drop{outline:2px dashed var(--accent,#2f6fdd)}
.cf .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;padding:8px}.cf .card{display:grid;grid-template-rows:84px auto;gap:4px;padding:6px;border-radius:8px;cursor:pointer;text-align:center}.cf .card:hover{background:rgba(127,127,127,.12)}.cf .card .th{display:grid;place-items:center;font-size:40px;border-radius:6px;overflow:hidden}.cf .card .th.pic{background:repeating-conic-gradient(#d9dbe3 0 25%,#fff 0 50%) 0 0/10px 10px}.cf .card .th img{max-width:100%;max-height:84px}.cf .card .cn{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cf .cmp{font-size:11.5px;padding:1px 6px;border-radius:999px;white-space:nowrap}.cf .cmp.same{background:rgba(70,167,88,.25)}.cf .cmp.newer{background:rgba(229,160,13,.3)}.cf .cmp.older{background:rgba(127,127,127,.25)}.cf .cmp.only{background:rgba(47,111,221,.3)}
.cf .sb{display:flex;gap:12px;align-items:center;padding:5px 10px;font-size:12px;background:var(--panel,#1f2129);border-top:1px solid var(--line,#3a3e4c);white-space:nowrap;overflow:hidden}.cf .sb .msg{flex:1;overflow:hidden;text-overflow:ellipsis}.cf .sb .msg.bad{color:#f87171}
.cf-split{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:8px;height:100%;min-height:0}.cf-split.two{grid-template-rows:minmax(0,1fr) minmax(0,1fr)}.cf-host{min-height:0;min-width:0}.cf.active{box-shadow:0 0 0 2px var(--accent,#2f6fdd)}
.cf-menu{position:fixed;z-index:2147483100;min-width:190px;padding:5px;border-radius:9px;border:1px solid var(--line,#3a3e4c);background:var(--panel,#1f2129);color:var(--fg,#e8e9ee);box-shadow:0 12px 34px rgba(0,0,0,.45);font:13.5px system-ui,sans-serif}.cf-menu button{display:flex;gap:9px;width:100%;padding:6px 10px;border:0;border-radius:6px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}.cf-menu button:hover:not(:disabled){background:var(--accent,#2f6fdd);color:#fff}.cf-menu button:disabled{opacity:.4;cursor:default}.cf-menu hr{border:0;border-top:1px solid var(--line,#3a3e4c);margin:4px}
.cf-view{position:fixed;inset:0;z-index:2147483050;display:grid;grid-template-rows:auto minmax(0,1fr);background:rgba(0,0,0,.88);color:#fff;font:14px system-ui,sans-serif}.cf-view header{display:flex;gap:8px;align-items:center;padding:8px 12px}.cf-view header b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cf-view header button{padding:6px 12px;border-radius:7px;border:1px solid #555;background:#222;color:#fff;cursor:pointer}.cf-view .in{display:grid;place-items:center;overflow:auto;padding:10px}.cf-view img{max-width:100%;max-height:100%}.cf-view pre{max-width:min(1000px,100%);white-space:pre-wrap;word-break:break-word;font:12.5px/1.4 ui-monospace,Consolas,monospace;background:#111;padding:14px;border-radius:8px;align-self:start}.cf-view .info{max-width:520px;line-height:1.6}
/* phones: the places (the tree) open from ☰ as a drawer over the list */
.cf .nav.places{display:none}
@media(max-width:820px){.cf .nav.places{display:inline-flex}.cf .main{position:relative}.cf.tree-open .tree{display:block;position:absolute;z-index:30;left:0;top:0;bottom:0;width:min(260px,85%);box-shadow:4px 0 18px rgba(0,0,0,.45)}.cf.tree-open .nav.places{background:var(--accent,#2f6fdd);color:#fff;border-radius:6px}.cf .main,.cf .main.two{grid-template-columns:minmax(0,1fr)}.cf .tree{display:none}.cf .main.two{grid-template-rows:minmax(0,1fr) minmax(0,1fr)}.cf .pane+.pane{border-left:0;border-top:2px solid var(--line,#3a3e4c)}.cf .tb .bt .lb{display:none}.cf .path input[type=search]{width:110px}}
@media(max-width:400px){.cf .path input[type=search]{width:72px}.cf .ph{flex-wrap:wrap;white-space:normal}}
@media(pointer:coarse){.cf .tb .bt{min-height:38px}.cf td{padding:8px}}`;
  const css = () => { if (document.getElementById('craft-files-css')) return; const s = document.createElement('style'); s.id = 'craft-files-css'; s.textContent = CSS; document.head.append(s); };
  const canFolders = () => typeof window.showDirectoryPicker === 'function';
  // a page on a plain http address (not https, not this computer's own) may only read a folder you choose, not write to it
  const BROWSER = () => /Edg\//.test(navigator.userAgent) ? ['Edge', 'edge'] : /OPR\//.test(navigator.userAgent) ? ['Opera', 'opera'] : ['Chrome', 'chrome'];
  const FOLDER_NOTE = () => { const [b, f] = BROWSER(); return `On this plain http address ${b} lets a page only read a folder you choose (look, compare, upload to My files; downloads go to your Downloads folder). To save into your folders too: open this over https, or open ${f}://flags in ${b}, find “Insecure origins treated as secure”, add ${location.origin} there and restart ${b}.`; };
  // ------------------------------------------------------------------ folders on this computer: a handle (full use), or the files of a folder you chose (read only)
  const roNode = (name, files, prefix = '') => ({ name, files, prefix });
  async function listDir(n) {
    if (n.h) { const out = []; for await (const [name, c] of n.h.entries()) { if (c.kind === 'directory') out.push({ name, dir: true, node: { name, h: c }, parent: n }); else { const f = await c.getFile(); out.push({ name, dir: false, size: f.size, time: f.lastModified, fh: c, parent: n }); } } return out; }
    const pre = n.prefix ? n.prefix + '/' : '', dirs = new Map(), out = [];
    for (const x of n.files) { if (!x.rel.startsWith(pre)) continue; const rest = x.rel.slice(pre.length), i = rest.indexOf('/'); if (i >= 0) { const d = rest.slice(0, i); if (!dirs.has(d)) dirs.set(d, { name: d, dir: true, node: roNode(d, n.files, pre + d), parent: n }); } else out.push({ name: rest, dir: false, size: x.file.size, time: x.file.lastModified, file: x.file, parent: n }); }
    return [...dirs.values(), ...out];
  }
  const fileOfLocal = async (x) => x.file || x.fh.getFile();
  async function walkLocal(n, rel = '') { const out = []; for (const x of await listDir(n)) { if (x.dir) out.push(...await walkLocal(x.node, rel + x.name + '/')); else out.push({ file: await fileOfLocal(x), rel: rel + x.name }); } return out; }
  // a folder chosen the plain way (read only): its files, with their paths inside it
  const pickFolderRO = () => new Promise((ok) => { const i = document.createElement('input'); i.type = 'file'; i.webkitdirectory = true; i.multiple = true; i.hidden = true; document.body.append(i); setTimeout(() => i.remove(), 600000);
    i.onchange = () => { i.remove(); const fs = [...i.files]; if (!fs.length) return ok({ empty: true }); const rp = (f) => (f.webkitRelativePath || f.name).replace(/\\/g, '/').split('/'), top = rp(fs[0])[0] || 'Folder'; ok(roNode(top, fs.map((f) => ({ file: f, rel: rp(f).slice(1).join('/') || f.name })))); };
    i.addEventListener('cancel', () => ok(null)); i.click(); });
  // the folders you added to My computer (full use: remembered in this browser; read only: until the page is closed)
  const pcSaved = async () => (await idbAll('craft-files-pc')).map((x) => ({ id: x.id, name: x.name, node: { name: x.name, h: x.handle } }));

  // ------------------------------------------------------------------ the file manager
  // the panes on the page (split screen: things dragged from one to the other), and what is being dragged
  const PANES = new Set(); let DRAG = null;
  function mountOne(el, { app = 'Craft', onClose, split, splitOn, startAt, uiKey = 'craft-files-ui', pick } = {}) {
    css();
    // a fresh box each time (mounted again: no old listeners left behind)
    const root = document.createElement('div'); root.style.cssText = 'height:100%;min-height:0'; el.replaceChildren(root);
    let all = [], here = 'files', back = [], fwd = [], sel = new Set(), anchor = null, q = '', view = 'list', sort = ['name', 1], clip = null, busy = false, open = { files: true, pictures: true };
    try { const p = JSON.parse(localStorage.getItem(uiKey) || '{}'); if (p.view) view = p.view; if (p.here) here = p.here; else if (startAt) here = startAt; if (p.open) open = p.open; } catch (e) { /* none */ }
    if (pick && startAt) here = startAt;
    const takes1 = (e) => pick && !e.dir && (!pick.accept || pick.accept.test(e.name));
    async function picked(e) { const b = await blobOf(e); pick.onPick({ blob: b, name: fileName(e, b), path: full(e) }); }
    const keepUi = () => { try { localStorage.setItem(uiKey, JSON.stringify({ view, here, open })); } catch (e) { /* blocked */ } };
    // This computer: a folder opened beside (File System Access: Chrome, Edge); its own path and entries
    let local = null; // { stack: [folder nodes], entries: [{ name, dir, size, time, node | fh | file }] }
    let pcTops = [], pcEntries = [], pcRead = new Set(); // My computer: its folders, what has been read of them
    root.innerHTML = `<div class="cf" tabindex="0">
      <div class="tb">
        <button class="bt main" data-a="upload" title="Upload files into this folder">⬆ <span class="lb">Upload</span></button>
        <button class="bt" data-a="upfolder" title="Upload a whole folder (with its folders)">📂 <span class="lb">Upload folder</span></button>
        <button class="bt" data-a="newfolder" title="New folder">＋📁 <span class="lb">New folder</span></button><span class="sep"></span>
        <button class="bt" data-a="download" title="Download (many at once: one .zip)">⬇ <span class="lb">Download</span></button>
        <button class="bt" data-a="rename" title="Rename (F2)">✎ <span class="lb">Rename</span></button>
        <button class="bt" data-a="cut" title="Cut (Ctrl+X): then Paste in another folder">✂</button><button class="bt" data-a="paste" title="Paste here (Ctrl+V)">📋</button>
        <button class="bt" data-a="delete" title="Delete (Delete key): to the Recycle bin">🗑 <span class="lb">Delete</span></button><span class="sep"></span>
        <button class="bt" data-a="zip" title="Compress the chosen ones into a .zip here">🗜 <span class="lb">Compress</span></button><button class="bt" data-a="extract" title="Extract a .zip into a folder here">📤 <span class="lb">Extract</span></button>
        <span class="grow"></span>
        <button class="bt" data-a="local" title="Open a folder on this computer beside it: compare, upload and download">💻 <span class="lb">This computer</span></button>
        <button class="bt" data-a="export" title="Everything ticked (or this folder) in one file, to bring in anywhere">⇩ <span class="lb">Export</span></button><button class="bt" data-a="importall" title="Bring in a My files export">⇧ <span class="lb">Import</span></button>
        ${split ? '<button class="bt" data-a="split" title="Split screen: a second pane under this one, to move and copy between them (drag, or right-click)">⬓ <span class="lb">Split</span></button>' : ''}<button class="bt" data-a="view" title="Details or thumbnails">☷</button>${onClose ? '<button class="bt" data-a="close" title="Close (Esc)">✕</button>' : ''}
      </div>
      <div class="path"><button class="nav places" data-a="places" title="Places: My computer, My files, My pictures, this browser, the bin">☰</button><button class="nav" data-a="back" title="Back">←</button><button class="nav" data-a="fwd" title="Forward">→</button><button class="nav" data-a="up" title="Up one folder">↑</button><div class="crumbs" data-crumbs></div><button class="nav" data-a="reload" title="Refresh">↻</button><input type="search" data-q placeholder="Search here…"></div>
      <div class="main" data-main><div class="tree" data-tree></div><div class="pane" data-pane="srv"><div class="ph" data-ph></div><div class="list" data-list></div></div></div>
      <div class="sb"><span data-count></span><span class="msg" data-msg></span><span data-who></span></div></div>`;
    const $ = (s) => root.querySelector(s), say = (t, bad) => { const m = $('[data-msg]'); m.textContent = t || ''; m.classList.toggle('bad', !!bad); };
    const rootOf = (p) => p.split('/')[0], pathIn = (p) => p.split('/').slice(1).join('/');
    // the folders under a folder, and the files in it
    // every folder there is: the folders things are in (and theirs), and the folders you made (even empty ones)
    function allFolders() {
      const m = new Map(), add = (k, e) => { if (e || !m.has(k)) m.set(k, e || m.get(k) || null); };
      for (const e of all) { const parts = full(e).split('/'); for (let i = 2; i <= parts.length; i++) add(parts.slice(0, i).join('/'), null); if (e.dir) add(fullOf(e.root, [e.path, e.name].filter(Boolean).join('/')), e); }
      return m;
    }
    function foldersIn(p) {
      const d = p.split('/').length + 1;
      return [...allFolders()].filter(([k]) => k.startsWith(p + '/') && k.split('/').length === d).map(([k, e]) => ({ id: e ? e.id : 'dir|' + k, dir: true, name: k.split('/').pop(), kind: 'folder', root: rootOf(k), path: pathIn(k).split('/').slice(0, -1).join('/'), full: k, x: e && e.x, store: e && e.store, time: e ? e.time : 0, size: '' }));
    }
    const filesIn = (p) => all.filter((e) => !e.dir && full(e) === p);
    function entries() {
      let L;
      if (q) { const w = q.toLowerCase(); L = all.filter((e) => full(e).startsWith(here) && (e.name + ' ' + (KINDS[e.kind] || [])[1]).toLowerCase().includes(w)).map((e) => (e.dir ? { ...e, full: fullOf(e.root, [e.path, e.name].filter(Boolean).join('/')) } : e)); }
      else L = here.includes('/') || ROOT[here] ? [...foldersIn(here), ...filesIn(here)] : [];
      const [k, dir] = sort, val = (e) => (k === 'name' ? e.name.toLowerCase() : k === 'size' ? +e.size || 0 : k === 'time' ? e.time || 0 : (KINDS[e.kind] || ['', ''])[1]);
      return L.sort((a, b) => (b.dir - a.dir) || (val(a) < val(b) ? -dir : val(a) > val(b) ? dir : 0));
    }
    let shown = [];
    // ---------------- drawing
    function drawTree() {
      const kids = (p) => foldersIn(p).sort((a, b) => a.name.localeCompare(b.name));
      const node = (p, name, icon, depth) => { const k = kids(p), isOpen = open[p] || here.startsWith(p + '/'); return `<div class="tn ${here === p ? 'on' : ''}" data-go="${esc(p)}" style="padding-left:${4 + depth * 13}px"><span class="tw" data-tw="${esc(p)}">${k.length ? (isOpen ? '▾' : '▸') : ''}</span>${icon} <span class="nm">${esc(name)}</span></div>${isOpen ? k.map((c) => node(c.full, c.name, '📁', depth + 1)).join('') : ''}`; };
      $('[data-tree]').innerHTML = ROOTS.filter(([r]) => r !== 'bin' || all.some((e) => e.root === 'bin')).filter(([r]) => A() || !['account', 'locations', 'bin'].includes(r)).map(([r, i, n]) => node(r, n, i, 0)).join('');
    }
    function drawCrumbs() {
      const parts = here.split('/'), r = ROOT[parts[0]];
      $('[data-crumbs]').innerHTML = parts.map((p, i) => `${i ? '<span>›</span>' : ''}<button data-go="${esc(parts.slice(0, i + 1).join('/'))}">${i ? esc(p) : `${r.icon} ${esc(r.name)}`}</button>`).join('');
      root.querySelector('[data-a=back]').disabled = !back.length; root.querySelector('[data-a=fwd]').disabled = !fwd.length; root.querySelector('[data-a=up]').disabled = !here.includes('/');
    }
    const parentName = () => { const p = here.split('/').slice(0, -1); return p.length > 1 ? p[p.length - 1] : ROOT[p[0]].name; };
    const upRow = () => (here.includes('/') && !q ? `<tr data-upone title="Up one level: ${esc(parentName())}"><td class="n"><span class="ic">⤴</span>.. <span style="opacity:.7">Up one level (${esc(parentName())})</span></td><td></td><td class="dim k"></td><td></td>${local ? '<td></td>' : ''}</tr>` : '');
    const iconOf = (e, big) => (e.thumb ? `<img alt="" src="${esc(e.thumb)}" loading="lazy">` : (KINDS[e.kind] || KINDS.file)[0]);
    function drawList() {
      shown = entries(); const L = shown, cmp = local ? compareMap() : null;
      const W = writable(rootOf(here));
      const PC = rootOf(here) === 'computer';
      if (pick) { $('[data-ph]').innerHTML = `<b>${esc(pick.title || 'Choose a file to open')}</b><span style="opacity:.75">double-click it (or choose it and press Open)</span><span style="flex:1"></span><button class="bt main" data-a="pickit" ${chosen().some(takes1) ? '' : 'disabled'} style="padding:4px 12px;border-radius:6px;border:0;background:var(--accent,#2f6fdd);color:#fff;cursor:pointer">Open</button>`; } else
      $('[data-ph]').innerHTML = `<b>${esc(here.split('/').length > 1 ? here.split('/').pop() : ROOT[rootOf(here)].name)}</b><span style="opacity:.65">${PC ? (canFolders() ? 'folders on this computer: look, upload to My files, save into them' : 'read only on this plain http address (see the note when you add a folder)') : W ? (A() ? 'your account and this browser' : 'this browser (log in: your account too)') : rootOf(here) === 'browser' ? 'this browser’s storage' : rootOf(here) === 'bin' ? 'deleted things: put back or delete for good' : 'kept by the apps (download, copy to My files, delete)'}</span>`;
      if (!L.length) { $('[data-list]').innerHTML = (here.includes('/') && !q ? `<table><tbody>${upRow()}</tbody></table>` : '') + `<p style="padding:14px;opacity:.7">${q ? 'Nothing found.' : here === 'computer' ? '' : W ? 'Empty folder. Drop files here, or Upload.' : 'Nothing here.'}</p>`; }
      else if (view === 'grid') $('[data-list]').innerHTML = `<div class="grid">${here.includes('/') && !q ? `<div class="card" data-upone title="Up one level: ${esc(parentName())}"><div class="th">⤴</div><div class="cn">.. Up one level</div></div>` : ''}${L.map((e, i) => `<div class="card ${sel.has(e.id) ? 'sel' : ''}" data-i="${i}" draggable="true" title="${esc(e.name)}"><div class="th ${e.thumb ? 'pic' : ''}">${iconOf(e, true)}</div><div class="cn">${esc(e.name)}</div>${cmp && cmp.get(e.name) ? `<span class="cmp ${cmp.get(e.name)[0]}">${cmp.get(e.name)[1]}</span>` : ''}</div>`).join('')}</div>`;
      else { const th = (k, l) => `<th data-sort="${k}">${l}${sort[0] === k ? (sort[1] > 0 ? ' ▲' : ' ▼') : ''}</th>`;
        $('[data-list]').innerHTML = `<table><thead><tr>${th('name', 'Name')}${th('time', 'Modified')}${th('kind', 'Type')}${th('size', 'Size')}${cmp ? '<th>This computer</th>' : ''}</tr></thead><tbody>${upRow()}${L.map((e, i) => `<tr data-i="${i}" class="${sel.has(e.id) ? 'sel' : ''}" draggable="true"><td class="n" title="${esc(q && e.full ? e.full : e.name)}"><span class="ic">${iconOf(e)}</span>${esc(e.name)}${q ? `<span style="opacity:.55;font-size:11.5px"> · ${esc((e.dir ? e.full : full(e)).split('/').slice(0, -1).join(' › ') || ROOT[e.root].name)}</span>` : ''}</td><td class="dim">${esc(local ? whenShort(e.time) : when(e.time))}</td><td class="dim k">${(KINDS[e.kind] || KINDS.file)[1]}</td><td class="dim">${e.dir ? '' : sizeText(Math.round(e.size || 0))}</td>${cmp ? `<td>${cmp.get(e.name) ? `<span class="cmp ${cmp.get(e.name)[0]}">${cmp.get(e.name)[1]}</span>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table>`; }
      if (here === 'computer') $('[data-list]').insertAdjacentHTML('afterbegin', `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px"><button class="bt main" data-a="addpc" style="padding:6px 12px;border-radius:7px;border:0;background:var(--accent,#2f6fdd);color:#fff;cursor:pointer">＋ Add a folder from this computer…</button><span style="opacity:.7;font-size:12.5px">${canFolders() ? 'Folders you add stay here (this browser asks again before opening them).' : esc(FOLDER_NOTE())}</span></div>`);
      const n = L.filter((e) => sel.has(e.id)), size = n.reduce((t, e) => t + (+e.size || 0), 0);
      $('[data-count]').textContent = `${L.length} item${L.length === 1 ? '' : 's'}${n.length ? ` · ${n.length} chosen${size ? ' (' + sizeText(Math.round(size)) + ')' : ''}` : ''}`;
      buttons();
    }
    function paintSel() {
      root.querySelectorAll('.cf [data-list] [data-i]').forEach((el) => el.classList.toggle('sel', sel.has((shown[+el.dataset.i] || {}).id)));
      const n = shown.filter((e) => sel.has(e.id)), size = n.reduce((t, e) => t + (+e.size || 0), 0);
      $('[data-count]').textContent = `${shown.length} item${shown.length === 1 ? '' : 's'}${n.length ? ` · ${n.length} chosen${size ? ' (' + sizeText(Math.round(size)) + ')' : ''}` : ''}`; buttons();
      const pb = root.querySelector('[data-a=pickit]'); if (pb) pb.disabled = !chosen().some(takes1);
    }
    function buttons() {
      const r = rootOf(here), W = writable(r), S = chosen(), one = S.length === 1 ? S[0] : null, B = (a, on) => { const b = root.querySelector(`[data-a=${a}]`); if (b) b.disabled = !on; };
      B('upload', W); B('upfolder', W); B('newfolder', W); B('download', S.length > 0); B('rename', one && writable(one.root)); B('cut', S.length && S.every((e) => writable(e.root))); B('paste', W && clip && clip.length); B('delete', S.length && r !== 'locations' && r !== 'computer'); B('zip', S.length > 0 && W); B('extract', W && one && one.kind === 'zip');
      $('[data-who]').textContent = A() ? A().user().name : 'not logged in';
      const sb = root.querySelector('[data-a=split]'); if (sb) { const on = !!(splitOn && splitOn()); sb.classList.toggle('main', on); sb.title = on ? 'One pane again' : 'Split screen: a second pane under this one, to move and copy between them (drag, or right-click)'; }
    }
    function draw() { drawTree(); drawCrumbs(); drawList(); if (local) drawLocal(); }
    const chosen = () => shown.filter((e) => sel.has(e.id));
    function go(p, keepFwd) { if (p === here) return; back.push(here); if (!keepFwd) fwd = []; here = p; sel.clear(); q = ''; $('[data-q]').value = ''; keepUi(); draw(); if (rootOf(p) === 'computer' && p !== 'computer') readPc(p); }
    let loadGen = 0;
    async function load(fromOther) { const g = ++loadGen; if (fromOther !== true) for (const p of PANES) if (p !== me) setTimeout(() => p.reload(true), 50); say('Looking…'); let got; try { got = await gather(); if (canFolders() && !pcTops.length) pcTops = await pcSaved(); } catch (e) { if (g === loadGen) say(e.message, true); return; } if (g !== loadGen) return; all = got; mergePc(); say(''); if (!ROOT[rootOf(here)] || (!A() && ['account', 'locations', 'bin'].includes(rootOf(here)))) here = 'files'; draw(); if (rootOf(here) === 'computer' && here !== 'computer') readPc(here); }
    // ---------------- My computer
    function mergePc() { all = all.filter((e) => e.root !== 'computer').concat(pcTops.map((t) => ({ id: 'pc|' + t.id, root: 'computer', path: '', name: t.name, dir: true, kind: 'folder', pcTop: t, size: '', time: 0 })), pcEntries); }
    async function nodeAt(p) { // the folder node for computer/<top>/<sub…>
      const parts = pathIn(p).split('/'), t = pcTops.find((x) => x.name === parts[0]); if (!t) return null; let n = t.node;
      if (n.h && (await n.h.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await n.h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error(`This computer did not allow ${t.name} to be opened.`);
      for (const d of parts.slice(1)) n = n.h ? { name: d, h: await n.h.getDirectoryHandle(d) } : roNode(d, n.files, [n.prefix, d].filter(Boolean).join('/'));
      return n;
    }
    async function readPc(p, again) {
      if (pcRead.has(p) && !again) return; const n = await nodeAt(p).catch((e) => { say(e.message, true); return null; }); if (!n) return;
      const path = pathIn(p), got = await listDir(n); pcEntries = pcEntries.filter((e) => e.path !== path);
      for (const x of got) pcEntries.push({ id: `pc|${path}/${x.name}`, root: 'computer', path, name: x.name, dir: x.dir, kind: x.dir ? 'folder' : kindOfFile(x.name, typeOfName(x.name)), size: x.dir ? '' : x.size, time: x.time || 0, pc: x });
      pcRead.add(p); mergePc(); draw();
    }
    async function addPc() {
      let t;
      if (canFolders()) { let h; try { h = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (e) { if (e.name !== 'AbortError') say(e.message, true); return; } t = { id: uid('c'), name: h.name, node: { name: h.name, h } }; await idbPut('craft-files-pc', { id: t.id, name: h.name, handle: h }).catch(() => {}); }
      else { const n = await pickFolderRO(); if (!n) return; if (n.empty) return say('That folder came back empty: the browser hands over only the files in it (an empty folder, or one with only empty folders, shows nothing). Dragging a folder onto My files works too.', true); t = { id: uid('c'), name: n.name, node: n }; say(FOLDER_NOTE()); }
      pcTops = pcTops.filter((x) => x.name !== t.name).concat(t); pcRead.delete('computer/' + t.name); pcEntries = pcEntries.filter((x) => x.path.split('/')[0] !== t.name); mergePc(); if (here === 'computer/' + t.name) await readPc(here, true); else go('computer/' + t.name);
    }
    async function dropPc(e) { pcTops = pcTops.filter((x) => x !== e.pcTop); pcEntries = pcEntries.filter((x) => x.path.split('/')[0] !== e.name); await idbDel('craft-files-pc', e.pcTop.id).catch(() => {}); mergePc(); draw(); say(`${e.name} is off My computer (it stays on the computer).`); }
    // My computer → My files (folders with what is in them), into “From my computer”
    async function pcToMyFiles(list) {
      let n = 0;
      for (const e of list) {
        const files = e.dir ? (await walkLocal(e.pcTop ? e.pcTop.node : await nodeAt(fullOf('computer', [e.path, e.name].filter(Boolean).join('/'))))).map((x) => ({ file: x.file, rel: e.name + '/' + x.rel })) : [{ file: await fileOfLocal(e.pc), rel: e.name }];
        for (const x of files) { const path = ['From my computer', ...x.rel.split('/').slice(0, -1)].join('/'); try { await ensureFolder('files', path); say(`Uploading ${x.file.name}…`); await keepFile(x.file, path, 'files'); n++; } catch (err) { say(`${x.file.name}: ${err.message}`, true); } }
      }
      await load(); say(`Uploaded ${n} into My files › From my computer.`);
    }
    async function pcDelete(list) {
      if (!canFolders()) return say(FOLDER_NOTE(), true);
      if (!confirm(`Delete ${list.length} thing${list.length === 1 ? '' : 's'} from this computer? This cannot be undone (no Recycle bin for this computer's folders).`)) return;
      for (const e of list) { if (e.pcTop) continue; const parent = await nodeAt(fullOf('computer', e.path)); await parent.h.removeEntry(e.name, { recursive: true }); }
      await readPc(fullOf('computer', pathIn(here)), true); say('Deleted from this computer.');
    }

    // ---------------- reading a thing: its bytes (for download, zip, compare)
    async function blobOf(e) {
      if (e.pc) return fileOfLocal(e.pc);
      if (e.x && e.x.data) return dataBlob(e.x.data);
      const v = await e.get();
      if (e.kind === 'calendar' && v && v.raw && v.raw.type === 'ics') return new Blob([v.raw.text], { type: 'text/calendar' });
      if (e.root === 'bin' && v && v.value && v.value.data) return dataBlob(v.value.data);
      return new Blob([typeof v === 'string' ? v : JSON.stringify(v, null, 1)], { type: 'application/json' });
    }
    const fileName = (e, b) => (e.x && e.x.data ? (/\.\w{2,5}$/.test(e.name) ? e.name : `${e.name}.${extOf(b.type) || 'bin'}`) : e.name);
    // a folder's files, with their paths inside it (for zips and downloads of folders)
    function under(e) { const p = e.full || fullOf(e.root, [e.path, e.name].filter(Boolean).join('/')); return all.filter((x) => !x.dir && full(x).startsWith(p) && (full(x) === p || full(x).startsWith(p + '/'))).map((x) => ({ e: x, rel: [e.name, ...full(x).slice(p.length + 1).split('/').filter(Boolean)].join('/') })); }
    async function filesFor(list) { const out = []; for (const e of list) { if (e.dir && e.root === 'computer') { const node = e.pcTop ? e.pcTop.node : await nodeAt(fullOf('computer', [e.path, e.name].filter(Boolean).join('/'))); for (const x of await walkLocal(node)) out.push({ name: e.name + '/' + x.rel, blob: x.file, time: x.file.lastModified }); continue; } if (e.dir) { for (const { e: x, rel } of under(e)) { const b = await blobOf(x); out.push({ name: rel + '/' + fileName(x, b), blob: b, time: x.time }); } } else { const b = await blobOf(e); out.push({ name: fileName(e, b), blob: b, time: e.time }); } } return out; }
    async function doDownload(list) {
      if (!list.length) return; say('Getting it ready…');
      if (list.length === 1 && !list[0].dir) { const b = await blobOf(list[0]); download(b, fileName(list[0], b)); say('Downloaded ' + fileName(list[0], b)); return; }
      const files = await filesFor(list), z = await zipOf(files), nm = (list.length === 1 ? list[0].name : here.split('/').pop() || 'My files') + '.zip'; download(z, nm); say(`Downloaded ${files.length} file${files.length === 1 ? '' : 's'} in ${nm}`);
    }
    // ---------------- your own folders: make, rename, move, upload
    const storeOf = (r) => (r === 'pictures' ? 'pictures' : 'files');
    async function makeFolder(r, path, name) { const x = { id: uid('d'), type: 'folder', name: cleanName(name), path, time: Date.now() }; await storePut(storeOf(r), x); return x; }
    async function ensureFolder(r, path) { if (!path) return; const parts = path.split('/'); for (let i = 0; i < parts.length; i++) { const p = parts.slice(0, i).join('/'), nm = parts[i]; if (!all.some((e) => e.dir && e.root === r && e.path === p && e.name === nm)) { const x = await makeFolder(r, p, nm); all.push({ id: `${storeOf(r)}|${x.id}`, root: r, path: p, name: nm, dir: true, kind: 'folder', x, store: storeOf(r), time: x.time }); } } }
    async function upload(files, relPaths) {
      const r = rootOf(here), base = pathIn(here); let n = 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i], rel = relPaths && relPaths[i] ? relPaths[i].split('/').slice(0, -1).join('/') : '', path = [base, rel].filter(Boolean).join('/');
        try { await ensureFolder(r, path); const same = all.find((e) => !e.dir && e.root === r && e.path === path && e.name === f.name);
          if (same) { if (!confirm(`“${f.name}” is already in this folder. Replace it?`)) continue; await storeDel(storeOf(r), same.x); }
          say(`Uploading ${f.name}…`); await keepFile(f, path, r === 'pictures' && /^image\//.test(f.type) ? 'pictures' : 'files'); n++; } catch (e) { say(`${f.name}: ${e.message}`, true); }
      }
      await load(); if (n) say(`Uploaded ${n} file${n === 1 ? '' : 's'}.`);
    }
    async function rename(e) {
      const nm = cleanName(prompt('New name:', e.name)); if (!nm || nm === e.name) return;
      if (e.dir) { const oldFull = e.full, newRel = [e.path, nm].filter(Boolean).join('/'), oldRel = pathIn(oldFull);
        if (e.x) { e.x.name = nm; await storePut(e.store, e.x); }
        for (const x of all.filter((y) => writable(y.root) && y.root === e.root && (y.path === oldRel || y.path.startsWith(oldRel + '/')))) { x.x.path = newRel + x.path.slice(oldRel.length); await storePut(x.store, x.x); }
      } else { e.x.name = nm; await storePut(e.store, e.x); }
      await load(); say('Renamed.');
    }
    async function moveTo(list, dest) {
      const r = rootOf(dest), path = pathIn(dest); let n = 0;
      for (const e of list) {
        if (!writable(e.root) || !writable(r)) continue;
        if (e.dir) { const from = pathIn(e.full); if (dest === e.full || dest.startsWith(e.full + '/')) { say('A folder cannot go inside itself.', true); continue; }
          const to = [path, e.name].filter(Boolean).join('/'); await ensureFolder(r, to);
          for (const x of all.filter((y) => y.root === e.root && (y.path === from || y.path.startsWith(from + '/')))) { const nx = { ...x.x, path: to + x.path.slice(from.length) }; if (x.root !== r) { await storeDel(x.store, x.x); nx.id = uid(r === 'pictures' ? 'p' : 'f'); } await storePut(storeOf(r), nx); }
          if (e.x) await storeDel(e.store, e.x);
        } else { const nx = { ...e.x, path }; if (e.root === r && (e.path || '') === path) continue;
          const same = all.find((y) => !y.dir && y.root === r && (y.path || '') === path && y.name === e.name && y.id !== e.id);
          if (same) { if (confirm(`“${e.name}” is already in that folder. Replace it? (Cancel keeps both)`)) await storeDel(same.store, same.x); else { let k = 2, b = e.name.replace(/(\.\w+)?$/, ''), x = (e.name.match(/\.\w+$/) || [''])[0]; while (all.some((y) => y.root === r && (y.path || '') === path && y.name === `${b} (${k})${x}`)) k++; nx.name = `${b} (${k})${x}`; } }
          if (e.root !== r) { await storeDel(e.store, e.x); nx.id = uid(r === 'pictures' ? 'p' : 'f'); } await storePut(storeOf(r), nx); }
        n++;
      }
      await load(); if (n) say(`Moved ${n}.`);
    }
    // ---------------- from the other pane (split screen)
    async function receive(src, list, to, copy) {
      const r = rootOf(to);
      if (r === 'computer') {
        if (!canFolders()) return say(FOLDER_NOTE(), true);
        if (to === 'computer') return say('Open one of My computer’s folders to save into it.', true);
        const n = await nodeAt(to); let k = 0;
        for (const f of await src.filesFor(list)) { const parts = f.name.split('/'), nm = parts.pop(); let d = n.h; for (const p of parts) d = await d.getDirectoryHandle(cleanName(p), { create: true }); let exists = false; try { await d.getFileHandle(cleanName(nm)); exists = true; } catch (e) { /* new */ } if (exists && !confirm(`“${nm}” is already in that folder on this computer. Replace it?`)) continue; const w = await (await d.getFileHandle(cleanName(nm), { create: true })).createWritable(); await w.write(f.blob); await w.close(); k++; }
        await readPc(to, true); return say(`Saved ${k} on this computer.`);
      }
      if (!writable(r)) return say('Things go into My files or My pictures (or one of My computer’s folders).', true);
      if (!copy && list.every((e) => writable(e.root))) return moveTo(list, to);
      let k = 0;
      for (const f of await src.filesFor(list)) { const parts = f.name.split('/'), nm = parts.pop(), path = [pathIn(to), ...parts].filter(Boolean).join('/'); try { await ensureFolder(r, path); await keepFile(new File([f.blob], nm, { type: f.blob.type, lastModified: f.time || Date.now() }), path, r === 'pictures' && /^image\//.test(f.blob.type) ? 'pictures' : 'files'); k++; } catch (err) { say(`${nm}: ${err.message}`, true); } }
      await load(); say(`Copied ${k} here.`);
    }
    const otherPane = () => [...PANES].find((p) => p !== me);
    // ---------------- delete: your own things and your account's to the Recycle bin; this browser's (asked); bin: for good
    async function remove(list) {
      const a = A(); if (!list.length) return;
      const r = rootOf(here);
      if (r === 'bin') { if (!confirm(`Delete ${list.length} thing${list.length === 1 ? '' : 's'} for good? This cannot be undone.`)) return; for (const e of list) await a.remove('bin', e.key); await load(); say('Deleted for good.'); return; }
      const own = list.filter((e) => writable(e.root)), acct = list.filter((e) => e.root === 'account'), br = list.filter((e) => e.root === 'browser');
      if (!confirm(`Delete ${list.length} thing${list.length === 1 ? '' : 's'}?${a ? ' They go to the Recycle bin (put them back from there).' : br.length || own.length ? ' This browser keeps no Recycle bin: they are gone (download them first if you may want them).' : ''}`)) return;
      for (const e of own) { if (e.dir) { const p = pathIn(e.full); for (const x of all.filter((y) => y.root === e.root && (y.path === p || y.path.startsWith(p + '/')))) await storeDel(x.store, x.x); if (e.x) await storeDel(e.store, e.x); } else await storeDel(e.store, e.x); }
      for (const e of acct) { const v = await e.get(); await a.put('bin', safeKey(`${Date.now().toString(36)} ${e.app} ${e.key}`), { app: e.app, key: e.key, value: v, label: e.name, deleted: new Date().toISOString() }); await a.remove(e.app, e.key); }
      for (const e of br) { if (a) await a.put('bin', safeKey(`${Date.now().toString(36)} browser ${e.lsKey}`), { app: 'browser', key: e.lsKey, value: localStorage.getItem(e.lsKey), label: e.lsKey, deleted: new Date().toISOString() }); localStorage.removeItem(e.lsKey); }
      sel.clear(); await load(); say('Deleted.');
    }
    async function restore(list) {
      const a = A(); let n = 0;
      for (const e of list) { const v = await e.get(); try {
        if (v.app === 'browser') localStorage.setItem(v.key, v.value);
        else if (v.app === 'files' || v.app === 'pictures') { await idbPut(STORES[v.app].db, v.value); await a.put(v.app, v.key, v.value); }
        else await a.put(v.app, v.key, v.value);
        await a.remove('bin', e.key); n++; } catch (x) { say(`${e.name}: ${x.message}`, true); } }
      await load(); say(`Put back ${n}.`);
    }
    // ---------------- zip: compress here, extract here
    async function compress(list) { const nm = cleanName(prompt('Name of the .zip:', (list.length === 1 ? list[0].name : 'Archive') + '.zip')); if (!nm) return; say('Compressing…'); const z = await zipOf(await filesFor(list)); await keepFile(new File([z], /\.zip$/i.test(nm) ? nm : nm + '.zip', { type: 'application/zip' }), pathIn(here), 'files'); await load(); say('Made ' + nm); }
    async function extract(e) {
      say('Extracting…'); const items = await unzip(await blobOf(e)), base = [pathIn(here), e.name.replace(/\.zip$/i, '')].filter(Boolean).join('/'); let n = 0;
      for (const it of items) { const parts = it.name.split('/'), nm = parts.pop(), path = [base, ...parts].filter(Boolean).join('/'); try { await ensureFolder(rootOf(here), path); await keepFile(new File([it.blob], nm, { type: it.blob.type, lastModified: it.time }), path, 'files'); n++; } catch (x) { say(`${nm}: ${x.message}`, true); } }
      await load(); say(`Extracted ${n} file${n === 1 ? '' : 's'} into ${base.split('/').pop()}.`);
    }
    // ---------------- copy an app's thing into My files (as a file)
    async function toMyFiles(list) { let n = 0; for (const e of list) { if (e.dir) continue; const b = await blobOf(e); await keepFile(new File([b], fileName(e, b), { type: b.type }), 'From apps', 'files'); n++; } await load(); say(`Copied ${n} into My files › From apps.`); }
    // ---------------- export everything chosen (or this folder) in one file; import one
    async function exportNow(list) {
      list = (list.length ? list : shown).filter((e) => e.kind !== 'keys');
      const items = [];
      for (const e of list) { if (e.dir) { for (const { e: x } of under(e)) items.push(await itemOf(x)); if (e.x) items.push({ root: e.root, value: e.x }); } else items.push(await itemOf(e)); }
      download(new Blob([JSON.stringify({ app: 'CraftFiles', kind: 'export', version: 2, saved: new Date().toISOString(), from: app, items })], { type: 'application/json' }), `My files ${new Date().toISOString().slice(0, 10)}.craftfiles.json`);
      say(`Exported ${items.length}: bring it in anywhere with Import.`);
    }
    async function itemOf(e) { if (writable(e.root)) return { root: e.root, value: e.x }; const v = await e.get(); return { root: e.root, app: e.app, key: e.key || e.lsKey, name: e.name, kind: e.kind, value: v, ...(e.locId ? { locId: e.locId } : {}) }; }
    async function importAll(f) {
      let j; try { j = JSON.parse(await f.text()); } catch (e) { return say('That is not a My files export.', true); }
      if (!j || j.app !== 'CraftFiles' || !Array.isArray(j.items)) return say('That is not a My files export.', true);
      const a = A(), items = j.items.filter((x) => x.kind !== 'keys' && x.kind !== 'login');
      if (!confirm(`Bring in ${items.length} thing${items.length === 1 ? '' : 's'} from ${when(j.saved)}? Your own files and pictures are added; the apps' things replace the same ones here${a ? ' (the ones replaced go to the Recycle bin)' : ''}. Location schedules are skipped (bring those in with ShiftCraft).`)) return;
      let n = 0;
      for (const x of items) { try {
        if (x.root === 'files' || x.root === 'pictures') { await storePut(x.root, x.value); n++; }
        else if (x.root === 'account' && a) { const old = await a.get(x.app, x.key).catch(() => undefined); if (old !== undefined) await a.put('bin', safeKey(`${Date.now().toString(36)} ${x.app} ${x.key}`), { app: x.app, key: x.key, value: old, label: x.name, deleted: new Date().toISOString() }); await a.put(x.app, x.key, x.value); n++; }
        else if (x.root === 'browser') { localStorage.setItem(x.key, typeof x.value === 'string' ? x.value : JSON.stringify(x.value)); n++; }
      } catch (e) { say(`${x.name || x.key}: ${e.message}`, true); } }
      await load(); say(`Brought in ${n}.`);
    }
    // ---------------- looking at one (double-click)
    async function viewOne(e) {
      if (takes1(e)) return picked(e);
      if (e.dir) return go(e.full || fullOf(e.root, [e.path, e.name].filter(Boolean).join('/')));
      if (e.kind === 'zip') { try { const it = await unzip(await blobOf(e)); info(e, `<div class="info"><b>${it.length} file${it.length === 1 ? '' : 's'} inside</b><br>${it.slice(0, 200).map((x) => esc(x.name) + ' · ' + sizeText(x.blob.size)).join('<br>')}</div>`); } catch (x) { say(x.message, true); } return; }
      if (e.kind === 'keys') return info(e, '<div class="info">Your keys are not shown here. AccountCraft › Keys shows and changes them, and saves them locked.</div>');
      const b = await blobOf(e);
      if (/^image\//.test(b.type)) { const u = URL.createObjectURL(b); info(e, `<img alt="" src="${u}">`); return; }
      const t = await b.text(); info(e, `<pre>${esc(t.slice(0, 200000))}${t.length > 200000 ? '\n…' : ''}</pre>`);
    }
    function info(e, html) {
      const v = document.createElement('div'); v.className = 'cf-view'; v.innerHTML = `<header><b>${esc(e.name)}</b><button data-v="dl">⬇ Download</button><button data-v="x">Close</button></header><div class="in">${html}</div>`;
      v.addEventListener('click', (ev) => { if (ev.target.closest('[data-v=x]') || ev.target.classList.contains('in')) v.remove(); if (ev.target.closest('[data-v=dl]')) doDownload([e]); });
      document.addEventListener('keydown', function k(ev) { if (ev.key === 'Escape') { v.remove(); document.removeEventListener('keydown', k); } });
      document.body.append(v);
    }
    // ---------------- right-click menu
    function menu(x, y, list) {
      document.querySelectorAll('.cf-menu').forEach((m) => m.remove());
      const r = rootOf(here), W = writable(r), one = list.length === 1 ? list[0] : null;
      const items = [
        one && ['👁', one.dir ? 'Open' : 'Look at it', () => viewOne(one)],
        list.length && ['⬇', list.length > 1 || (one && one.dir) ? 'Download as .zip' : 'Download', () => doDownload(list)],
        local && list.length && ['💻', 'Download to this computer’s folder', () => toLocal(list)],
        '-',
        one && writable(one.root) && ['✎', 'Rename', () => rename(one)],
        list.length && list.every((e) => writable(e.root)) && ['✂', 'Cut', () => { clip = list; buttons(); say(`Cut ${list.length}: open a folder and Paste.`); }],
        W && clip && clip.length && ['📋', `Paste ${clip.length} here`, () => { const c = clip; clip = null; moveTo(c, here); }],
        list.length && r === 'computer' && ['⬆', 'Upload to My files', () => pcToMyFiles(list)],
        list.length && !W && r !== 'bin' && r !== 'computer' && ['📁', 'Copy to My files', () => toMyFiles(list)],
        one && one.pcTop && ['✕', 'Take off My computer (it stays on the computer)', () => dropPc(one)],
        r === 'computer' && list.length && !list.some((e) => e.pcTop) && canFolders() && ['🗑', 'Delete from this computer…', () => pcDelete(list)],
        W && list.length && ['🗜', 'Compress to .zip', () => compress(list)],
        one && one.kind === 'zip' && W && ['📤', 'Extract here', () => extract(one)],
        r === 'bin' && list.length && ['↩', 'Put back', () => restore(list)],
        otherPane() && list.length && list.every((e) => writable(e.root)) && ['⇅', `Move to the other pane (${otherPane().where()})`, () => otherPane().receive(me, list, otherPane().here(), false)],
        otherPane() && list.length && r !== 'bin' && ['⧉', `Copy to the other pane (${otherPane().where()})`, () => otherPane().receive(me, list, otherPane().here(), true)],
        '-',
        W && !list.length && ['＋', 'New folder', () => act('newfolder')],
        W && !list.length && ['⬆', 'Upload files', () => act('upload')],
        list.length && r !== 'locations' && r !== 'computer' && ['🗑', r === 'bin' ? 'Delete for good' : 'Delete', () => remove(list)],
        r === 'computer' && !list.length && ['＋', 'Add a folder from this computer…', () => addPc()],
      ].filter((i) => i);
      const m = document.createElement('div'); m.className = 'cf-menu';
      items.forEach((i, n) => { if (i === '-') { if (n && items[n - 1] !== '-' && n < items.length - 1) m.append(document.createElement('hr')); return; } const b = document.createElement('button'); b.innerHTML = `<span>${i[0]}</span>${esc(i[1])}`; b.onclick = () => { m.remove(); i[2](); }; m.append(b); });
      if (!m.children.length) return; document.body.append(m);
      const w = m.offsetWidth, h = m.offsetHeight; m.style.left = Math.min(x, innerWidth - w - 6) + 'px'; m.style.top = Math.min(y, innerHeight - h - 6) + 'px';
      setTimeout(() => document.addEventListener('pointerdown', function c(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', c); } }), 0);
    }

    // ---------------- This computer: a folder beside, compared file by file
    async function openLocal() {
      if (!canFolders()) { const n = await pickFolderRO(); if (!n) return; local = { stack: [n], entries: [], ro: true }; $('[data-main]').classList.add('two'); say(FOLDER_NOTE()); await readLocal(); return; }
      try { const dir = await window.showDirectoryPicker({ mode: 'readwrite' }); local = { stack: [{ name: dir.name, h: dir }], entries: [] }; $('[data-main]').classList.add('two'); await readLocal(); }
      catch (e) { if (e.name !== 'AbortError') say(e.message, true); }
    }
    async function readLocal() { const out = await listDir(local.stack[local.stack.length - 1]); local.entries = out.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name)); local.sel = new Set(); draw(); }
    // the same name on both sides: same / newer here / newer there / only on one side
    function compareMap() {
      const m = new Map(), L = new Map(local.entries.map((x) => [x.name, x]));
      for (const e of shown) { const nm = e.dir ? e.name : (e.x && e.x.data ? e.name : e.name); const l = L.get(nm); if (!l) { m.set(e.name, ['only', 'only here']); continue; } if (e.dir || l.dir) { m.set(e.name, ['same', 'folder on both']); continue; } const st = e.time || 0, lt = l.time || 0, sz = Math.abs((+e.size || 0) - l.size) < 2;
        m.set(e.name, sz && Math.abs(st - lt) < 2500 ? ['same', 'same'] : sz ? ['same', 'same size'] : st > lt ? ['newer', 'newer here'] : ['older', 'newer there']); }
      return m;
    }
    function drawLocal() {
      let p = root.querySelector('[data-pane=loc]'); if (!p) { p = document.createElement('div'); p.className = 'pane'; p.dataset.pane = 'loc'; p.innerHTML = '<div class="ph" data-lph></div><div class="list" data-llist></div>'; $('[data-main]').append(p); }
      const names = new Set(shown.map((e) => e.name)), path = local.stack.map((h) => h.name).join(' › ');
      p.querySelector('[data-lph]').innerHTML = `💻 <b>${esc(path)}</b><span style="flex:1"></span>${local.stack.length > 1 ? '<button class="bt" data-l="up" title="Up one folder">↑</button>' : ''}<button class="bt" data-l="upload" title="Upload the chosen ones (or all that are newer or only here) into the folder on the left">⇦ Upload</button><button class="bt" data-l="close" title="Close this computer’s folder">✕</button>`;
      p.querySelector('[data-llist]').innerHTML = local.entries.length ? `<table><thead><tr><th>Name</th><th>Modified</th><th>Size</th><th>My files</th></tr></thead><tbody>${local.entries.map((x, i) => { const e = shown.find((y) => y.name === x.name), st = !e ? ['only', 'only here'] : x.dir || e.dir ? ['same', 'folder on both'] : Math.abs((+e.size || 0) - x.size) < 2 ? ['same', 'same'] : (x.time || 0) > (e.time || 0) ? ['newer', 'newer here'] : ['older', 'newer there'];
        return `<tr data-li="${i}" class="${local.sel.has(i) ? 'sel' : ''}"><td class="n"><span class="ic">${x.dir ? '📁' : (KINDS[kindOfFile(x.name, typeOfName(x.name))] || KINDS.file)[0]}</span>${esc(x.name)}</td><td class="dim">${x.dir ? '' : esc(whenShort(x.time))}</td><td class="dim">${x.dir ? '' : sizeText(x.size)}</td><td><span class="cmp ${st[0]}">${st[1]}</span></td></tr>`; }).join('')}</tbody></table>` : '<p style="padding:14px;opacity:.7">Empty folder.</p>';
      void names;
    }
    // this computer → the folder on the left (files and folders; the newer or missing ones when none are chosen)
    async function fromLocal() {
      if (!writable(rootOf(here))) return say('Upload goes into My files or My pictures: open one of their folders on the left.', true);
      let list = [...local.sel].map((i) => local.entries[i]);
      if (!list.length) { const cm = new Map(shown.map((e) => [e.name, e])); list = local.entries.filter((x) => { const e = cm.get(x.name); return x.dir ? !e : !e || (x.time || 0) > (e.time || 0) + 2500; }); if (!list.length) return say('Nothing newer on this computer.'); if (!confirm(`Upload ${list.length} (the ones newer on this computer, or only there)?`)) return; }
      const files = [], rels = [];
      for (const x of list) { if (x.dir) { for (const y of await walkLocal(x.node, x.name + '/')) { files.push(y.file); rels.push(y.rel); } } else { files.push(await fileOfLocal(x)); rels.push(x.name); } }
      await upload(files, rels);
    }
    // the chosen ones → this computer's folder (asked before replacing)
    async function toLocal(list) {
      if (local.ro || !canFolders()) { say(FOLDER_NOTE()); return doDownload(list); }
      const d = local.stack[local.stack.length - 1].h; let n = 0;
      for (const f of await filesFor(list)) {
        const parts = f.name.split('/'), nm = parts.pop(); let dir = d; for (const p of parts) dir = await dir.getDirectoryHandle(cleanName(p), { create: true });
        let exists = false; try { await dir.getFileHandle(cleanName(nm)); exists = true; } catch (e) { /* new */ }
        if (exists && !confirm(`“${nm}” is already on this computer. Replace it?`)) continue;
        const w = await (await dir.getFileHandle(cleanName(nm), { create: true })).createWritable(); await w.write(f.blob); await w.close(); n++;
      }
      await readLocal(); say(`Downloaded ${n} to this computer.`);
    }

    // ---------------- the buttons
    async function act(a) {
      const S = chosen(), one = S.length === 1 ? S[0] : null;
      if (a === 'close') return onClose && onClose();
      if (a === 'back' && back.length) { fwd.push(here); here = back.pop(); sel.clear(); keepUi(); return draw(); }
      if (a === 'fwd' && fwd.length) { back.push(here); here = fwd.pop(); sel.clear(); keepUi(); return draw(); }
      if (a === 'up' && here.includes('/')) return go(here.split('/').slice(0, -1).join('/'));
      if (a === 'reload') return load();
      if (a === 'view') { view = view === 'list' ? 'grid' : 'list'; keepUi(); return drawList(); }
      if (a === 'upload' || a === 'upfolder') { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; if (a === 'upfolder') i.webkitdirectory = true; i.onchange = () => upload([...i.files], a === 'upfolder' ? [...i.files].map((f) => f.webkitRelativePath) : null); i.click(); return; }
      if (a === 'newfolder') { const nm = cleanName(prompt('Name of the new folder:', 'New folder')); if (!nm) return; await makeFolder(rootOf(here), pathIn(here), nm); return load(); }
      if (a === 'download') return doDownload(S);
      if (a === 'rename' && one) return rename(one);
      if (a === 'cut') { clip = S; buttons(); return say(`Cut ${S.length}: open a folder and Paste.`); }
      if (a === 'paste' && clip) { const c = clip; clip = null; return moveTo(c, here); }
      if (a === 'delete') return remove(S);
      if (a === 'zip') return compress(S);
      if (a === 'extract' && one) return extract(one);
      if (a === 'addpc') return addPc();
      if (a === 'places') { root.querySelector('.cf').classList.toggle('tree-open'); return; }
      if (a === 'pickit') { const c = chosen().find(takes1); if (c) return picked(c); return; }
      if (a === 'split') return split && split();
      if (a === 'local') return local ? (local = null, $('[data-main]').classList.remove('two'), root.querySelector('[data-pane=loc]')?.remove(), draw()) : openLocal();
      if (a === 'export') return exportNow(S);
      if (a === 'importall') { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = () => i.files[0] && importAll(i.files[0]); i.click(); }
    }
    const run = async (fn) => { if (busy) return; busy = true; try { await fn(); } catch (e) { say(e.message || String(e), true); } finally { busy = false; } };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (b && !b.disabled) return run(() => act(b.dataset.a));
      const tw = e.target.closest('[data-tw]'); if (tw) { const p = tw.dataset.tw; open[p] = !(open[p] || here.startsWith(p + '/')); if (!open[p] && here.startsWith(p + '/')) here = p; keepUi(); return drawTree(); }
      if (e.target.closest('[data-upone]')) return act('up');
      const g = e.target.closest('[data-go]'); if (g) { root.querySelector('.cf').classList.remove('tree-open'); return go(g.dataset.go); }
      const s = e.target.closest('th[data-sort]'); if (s) { sort = [s.dataset.sort, sort[0] === s.dataset.sort ? -sort[1] : 1]; return drawList(); }
      const l = e.target.closest('[data-l]'); if (l) { if (l.dataset.l === 'close') return act('local'); if (l.dataset.l === 'up') { local.stack.pop(); return run(readLocal); } if (l.dataset.l === 'upload') return run(fromLocal); }
      const lr = e.target.closest('tr[data-li]'); if (lr) { const i = +lr.dataset.li; if (e.detail >= 2 && local.entries[i] && local.entries[i].dir) { local.stack.push(local.entries[i].node); return run(readLocal); } if (!(e.ctrlKey || e.metaKey)) local.sel.clear(); if (local.sel.has(i) && (e.ctrlKey || e.metaKey)) local.sel.delete(i); else local.sel.add(i); return drawLocal(); }
      const r = e.target.closest('[data-i]'); if (r) { const i = +r.dataset.i, it = shown[i];
        if (e.detail >= 2 && !e.shiftKey && !e.ctrlKey && !e.metaKey) { sel.clear(); sel.add(it.id); paintSel(); return run(() => viewOne(it)); } // the second click of a double-click: open it
        if (e.shiftKey && anchor != null) { const [a1, a2] = [Math.min(anchor, i), Math.max(anchor, i)]; if (!(e.ctrlKey || e.metaKey)) sel.clear(); for (let k = a1; k <= a2; k++) sel.add(shown[k].id); }
        else if (e.ctrlKey || e.metaKey) { if (sel.has(it.id)) sel.delete(it.id); else sel.add(it.id); anchor = i; }
        else { sel.clear(); sel.add(it.id); anchor = i; }
        return paintSel(); }
      if (e.target.closest('[data-list]')) { sel.clear(); paintSel(); }
    });
    root.addEventListener('dblclick', (e) => { if (e.target.closest('[data-i]')) return; const lr = e.target.closest('tr[data-li]'); if (lr) { const x = local.entries[+lr.dataset.li]; if (x.dir) { local.stack.push(x.node); run(readLocal); } } });
    root.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('[data-list]')) return; e.preventDefault();
      const r = e.target.closest('[data-i]'); if (r && !sel.has(shown[+r.dataset.i].id)) { sel.clear(); sel.add(shown[+r.dataset.i].id); drawList(); }
      menu(e.clientX, e.clientY, r ? chosen() : []);
    });
    // a long press on a phone or tablet opens the same menu
    let lp = 0; root.addEventListener('touchstart', (e) => { const r = e.target.closest('[data-i]'); if (!r) return; const t = e.touches[0]; lp = setTimeout(() => { if (!sel.has(shown[+r.dataset.i].id)) { sel.clear(); sel.add(shown[+r.dataset.i].id); drawList(); } menu(t.clientX, t.clientY, chosen()); }, 550); }, { passive: true });
    root.addEventListener('touchend', () => clearTimeout(lp)); root.addEventListener('touchmove', () => clearTimeout(lp), { passive: true });
    $('[data-q]').addEventListener('input', (e) => { q = e.target.value.trim(); sel.clear(); drawList(); });
    // keys: Delete, F2, Ctrl+A, Ctrl+X, Ctrl+V, Enter, Backspace (up)
    root.querySelector('.cf').addEventListener('keydown', (e) => {
      if (e.target.matches('input')) return;
      if (e.key === 'Delete') { e.preventDefault(); run(() => act('delete')); } else if (e.key === 'F2') { e.preventDefault(); run(() => act('rename')); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); shown.forEach((x) => sel.add(x.id)); drawList(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'x') { e.preventDefault(); act('cut'); } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); run(() => act('paste')); }
      else if (e.key === 'Enter') { const c = chosen(); if (c.length === 1) run(() => viewOne(c[0])); } else if (e.key === 'Backspace') { e.preventDefault(); act('up'); }
    });
    // drag: files from the computer onto the list (upload); your own things onto a folder (move)
    let dragging = null;
    root.addEventListener('dragstart', (e) => { const r = e.target.closest('[data-i]'); if (!r) return; const it = shown[+r.dataset.i]; if (!sel.has(it.id)) { sel.clear(); sel.add(it.id); paintSel(); } const all_ = chosen(); dragging = all_.filter((x) => writable(x.root)); DRAG = { pane: me, list: all_.filter((x) => x.kind !== 'keys') }; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', 'craft-files'); });
    const fromOther = () => DRAG && DRAG.pane !== me && DRAG.list.length;
    const takes = (to) => writable(rootOf(to)) || (rootOf(to) === 'computer' && to !== 'computer' && canFolders());
    const dropTarget = (e) => { if (e.target.closest('[data-upone]') && here.includes('/')) return { el: e.target.closest('[data-upone]'), to: here.split('/').slice(0, -1).join('/') }; const r = e.target.closest('[data-i]'), t = e.target.closest('.tn[data-go]'); if (r && shown[+r.dataset.i].dir) return { el: r, to: shown[+r.dataset.i].full }; if (t) return { el: t, to: t.dataset.go }; const l = e.target.closest('[data-list]'); return l ? { el: l, to: here } : null; };
    root.addEventListener('dragover', (e) => { const d = dropTarget(e); root.querySelectorAll('.drop').forEach((x) => x.classList.remove('drop')); if (!d) return; const files = [...e.dataTransfer.types].includes('Files'); if ((files && writable(rootOf(d.to))) || (fromOther() && takes(d.to)) || (!fromOther() && dragging && dragging.length && writable(rootOf(d.to)))) { e.preventDefault(); if (fromOther()) e.dataTransfer.dropEffect = e.ctrlKey || !DRAG.list.every((x) => writable(x.root)) || rootOf(d.to) === 'computer' ? 'copy' : 'move'; d.el.classList.add('drop'); } });
    root.addEventListener('dragleave', (e) => { if (!root.contains(e.relatedTarget)) root.querySelectorAll('.drop').forEach((x) => x.classList.remove('drop')); });
    root.addEventListener('drop', (e) => { const d = dropTarget(e); root.querySelectorAll('.drop').forEach((x) => x.classList.remove('drop')); if (!d) return; e.preventDefault();
      if (fromOther()) { const D = DRAG; DRAG = null; return run(() => receive(D.pane, D.list, d.to, e.ctrlKey || !D.list.every((x) => writable(x.root)))); }
      if (e.dataTransfer.files && e.dataTransfer.files.length) { if (d.to !== here) go(d.to); return run(() => upload([...e.dataTransfer.files])); }
      if (dragging && dragging.length && d.to !== here) { const m = dragging; dragging = null; run(() => moveTo(m, d.to)); } });
    root.addEventListener('dragend', () => { dragging = null; setTimeout(() => { if (DRAG && DRAG.pane === me) DRAG = null; }, 0); });
    // the pane last used is marked (split screen)
    root.addEventListener('pointerdown', () => { for (const p of PANES) p.mark(p === me); });
    const me = { reload: load, go, here: () => here, where: () => (here.includes('/') ? here.split('/').pop() : ROOT[rootOf(here)].name), filesFor, receive, buttons, mark: (on) => root.querySelector('.cf').classList.toggle('active', on && PANES.size > 1), destroy: () => PANES.delete(me) };
    PANES.add(me);
    load();
    return me;
  }
  function mount(el, opts = {}) {
    css(); const box = document.createElement('div'); box.className = 'cf-split'; el.replaceChildren(box);
    const panes = [];
    const add = (at) => { const h = document.createElement('div'); h.className = 'cf-host'; box.append(h); const p = mountOne(h, { ...opts, onClose: panes.length ? null : opts.onClose, startAt: at || opts.startAt, split: opts.pick ? null : toggle, splitOn: () => panes.length > 1, uiKey: opts.uiKey || (panes.length ? 'craft-files-ui-2' : 'craft-files-ui') }); panes.push(p); return p; };
    function toggle() {
      if (panes.length > 1) { const p = panes.pop(); p.destroy(); box.lastChild.remove(); } else add(panes[0].here());
      box.classList.toggle('two', panes.length > 1); try { localStorage.setItem('craft-files-split', panes.length > 1 ? '1' : '0'); } catch (e) { /* blocked */ }
      panes.forEach((p) => { p.buttons(); p.mark(false); });
    }
    add(); let on = false; try { on = !opts.pick && localStorage.getItem('craft-files-split') === '1'; } catch (e) { /* blocked */ } if (on) toggle();
    return { reload: () => panes.forEach((p) => p.reload(true)), go: (p) => panes[0].go(p), panes, split: toggle };
  }
  function open({ app = 'Craft', pick: pk, startAt } = {}) {
    document.querySelectorAll('.cf-back').forEach((x) => x.remove());
    const back = document.createElement('div'); back.className = 'cf-back'; back.style.cssText = 'position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;padding:12px;background:rgba(0,0,0,.55)';
    const box = document.createElement('div'); box.style.cssText = 'width:min(1300px,100%);height:min(860px,calc(100dvh - 24px));box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.5);border-radius:10px';
    back.append(box); document.body.append(back);
    const close = () => back.remove();
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape' && document.body.contains(back) && !document.querySelector('.cf-view, .cf-menu')) { close(); document.removeEventListener('keydown', k); } });
    mount(box, { app, onClose: close, startAt, pick: pk ? { ...pk, onPick: (f) => { close(); pk.onPick(f); } } : null, uiKey: pk ? 'craft-files-pick' : undefined }); setTimeout(() => box.querySelector('.cf')?.focus(), 50);
    return close;
  }
  // choose a file to open (a promise: the file, or null when closed without one)
  function pick({ app = 'Craft', folder = '', accept = null, title } = {}) {
    return new Promise((done) => { let got = null; const close = open({ app, startAt: folder ? 'files/' + folder : 'files', pick: { accept, title: title || `Open a ${app} file`, onPick: (f) => { got = f; done(f); } } });
      const back = document.querySelector('.cf-back'); if (back) new MutationObserver((m, o) => { if (!document.body.contains(back)) { o.disconnect(); if (!got) done(null); } }).observe(document.body, { childList: true }); void close; });
  }
  // a file saved into My files › folder (this browser, and your account when logged in); the same name there is replaced
  async function saveFile({ folder = '', name, blob }) {
    const items = await storeAll('files'), path = folder;
    if (folder) { const parts = folder.split('/'); for (let i = 0; i < parts.length; i++) { const p = parts.slice(0, i).join('/'); if (!items.some((x) => x.type === 'folder' && (x.path || '') === p && x.name === parts[i])) { const d = { id: uid('d'), type: 'folder', name: parts[i], path: p, time: Date.now() }; await storePut('files', d); items.push(d); } } }
    const old = items.find((x) => x.type !== 'folder' && (x.path || '') === path && x.name === name);
    const x = { id: old ? old.id : uid('f'), name: cleanName(name), path, type: blob.type || typeOfName(name), data: await toData(blob), size: blob.size, time: Date.now() };
    await storePut('files', x); return x;
  }
  // the files in My files › folder (this browser, and your account when logged in): names, sizes and times
  async function listFiles({ folder = '' } = {}) { return (await storeAll('files')).filter((x) => x.type !== 'folder' && (x.path || '') === folder).map((x) => ({ name: x.name, path: (folder ? folder + '/' : '') + x.name, size: x.size || 0, time: x.time || 0, type: x.type })); }
  // one file from My files › folder, as a Blob (null when it is not there)
  async function readFile({ folder = '', name }) { const x = (await storeAll('files')).find((y) => y.type !== 'folder' && (y.path || '') === folder && y.name === name); if (!x) return null; return x.data ? (await fetch(x.data)).blob() : null; }
  window.CraftFiles = { open, mount, pick, saveFile, readFile, listFiles, keepFile, gather, zipOf, unzip };
})();
