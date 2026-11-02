/* PressCraft colours (PCColours): a picture in fewer colours for documents, from the original each time
   (the same colour reducer as ImageCraft's, PressCraft's own copy).
     reduce(canvas, { colours, dither, palette }) → canvas
       colours  '256' | '16' | 'grey' (256 greys) | 'bw' (black and white, 1 bit)
       dither   'fs' (smooth) | 'atkinson' (crisp, the classic Mac) | 'bayer4' (ordered dots) | 'none'
       palette  for 16 colours: 'best' (picked to suit the picture) | 'win16' (the classic Windows 16)
   See-through parts stay see-through (solid or clear, as in an indexed picture). */
(function () {
  'use strict';
  const hex = (s) => s.split(' ').map((h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
  const greys = (n) => Array.from({ length: n }, (_, i) => { const v = Math.round((i * 255) / (n - 1)); return [v, v, v]; });
  const WIN16 = hex('000000 800000 008000 808000 000080 800080 008080 c0c0c0 808080 ff0000 00ff00 ffff00 0000ff ff00ff 00ffff ffffff');
  // a colour distance a little closer to how eyes see (green counts most)
  const dist = (r, g, b, p) => { const rm = (r + p[0]) / 2, dr = r - p[0], dg = g - p[1], db = b - p[2]; return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; };

  // colours that suit the picture: median cut on a 5-bit-a-channel histogram, then a few rounds of k-means
  function quantize(img, n) {
    const d = img.data, H = new Uint32Array(32768);
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 128) H[((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)]++;
    const bins = []; for (let k = 0; k < 32768; k++) if (H[k]) bins.push([((k >> 10) << 3) + 4, (((k >> 5) & 31) << 3) + 4, ((k & 31) << 3) + 4, H[k]]);
    if (!bins.length) return [[0, 0, 0]];
    if (bins.length <= n) return bins.map((b) => [b[0], b[1], b[2]]);
    let boxes = [bins];
    const range = (bx) => { const lo = [255, 255, 255], hi = [0, 0, 0]; let c = 0; for (const b of bx) { for (let q = 0; q < 3; q++) { if (b[q] < lo[q]) lo[q] = b[q]; if (b[q] > hi[q]) hi[q] = b[q]; } c += b[3]; } return { lo, hi, c }; };
    while (boxes.length < n) {
      let best = -1, bs = -1, ax = 0;
      boxes.forEach((bx, i) => { if (bx.length < 2) return; const { lo, hi, c } = range(bx), sp = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], a = sp.indexOf(Math.max(...sp)), s = sp[a] * Math.sqrt(c); if (s > bs) { bs = s; best = i; ax = a; } });
      if (best < 0) break;
      const bx = boxes[best].sort((p, q) => p[ax] - q[ax]), half = bx.reduce((s, b) => s + b[3], 0) / 2; let acc = 0, cut = 1;
      for (let i = 0; i < bx.length - 1; i++) { acc += bx[i][3]; if (acc >= half) { cut = i + 1; break; } }
      boxes.splice(best, 1, bx.slice(0, cut), bx.slice(cut));
    }
    let pal = boxes.map((bx) => { let r = 0, g = 0, b = 0, c = 0; for (const x of bx) { r += x[0] * x[3]; g += x[1] * x[3]; b += x[2] * x[3]; c += x[3]; } return [r / c, g / c, b / c]; });
    for (let it = 0; it < 4; it++) {
      const sum = pal.map(() => [0, 0, 0, 0]);
      for (const x of bins) { let bi = 0, bd = Infinity; for (let j = 0; j < pal.length; j++) { const e = dist(x[0], x[1], x[2], pal[j]); if (e < bd) { bd = e; bi = j; } } const s = sum[bi]; s[0] += x[0] * x[3]; s[1] += x[1] * x[3]; s[2] += x[2] * x[3]; s[3] += x[3]; }
      pal = pal.map((p, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : p));
    }
    return pal.map((p) => p.map((v) => Math.max(0, Math.min(255, Math.round(v)))));
  }
  // nearest palette colour, remembered for each 6-bit-a-channel colour
  function nearestOf(pal) {
    const cache = new Int16Array(262144).fill(-1);
    return (r, g, b) => {
      r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
      const k = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2); let i = cache[k];
      if (i < 0) { let bd = Infinity; for (let j = 0; j < pal.length; j++) { const e = dist(r, g, b, pal[j]); if (e < bd) { bd = e; i = j; } } cache[k] = i; }
      return pal[i];
    };
  }
  const KERNELS = { fs: [16, [1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]], atkinson: [8, [1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] };
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
  // every pixel to its nearest palette colour, dithered
  function mapPixels(img, near, dither, spread) {
    const W = img.width, H = img.height, s = img.data, out = new ImageData(W, H), d = out.data, K = KERNELS[dither];
    if (K) {
      const buf = new Float32Array(W * H * 3); for (let p = 0; p < W * H; p++) { buf[p * 3] = s[p * 4]; buf[p * 3 + 1] = s[p * 4 + 1]; buf[p * 3 + 2] = s[p * 4 + 2]; }
      const div = K[0], taps = K.slice(1), cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
      for (let y = 0; y < H; y++) {
        const rtl = y & 1, x0 = rtl ? W - 1 : 0, dx = rtl ? -1 : 1; // serpentine: every other row right to left
        for (let x = x0; x >= 0 && x < W; x += dx) {
          const p = y * W + x, i = p * 4; if (s[i + 3] < 128) continue;
          const r = cl(buf[p * 3]), g = cl(buf[p * 3 + 1]), b = cl(buf[p * 3 + 2]), c = near(r, g, b);
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
          const er = r - c[0], eg = g - c[1], eb = b - c[2];
          for (const [tx, ty, w] of taps) { const nx = x + (rtl ? -tx : tx), ny = y + ty; if (nx < 0 || nx >= W || ny >= H) continue; const q = (ny * W + nx) * 3, f = w / div; buf[q] += er * f; buf[q + 1] += eg * f; buf[q + 2] += eb * f; }
        }
      }
      return out;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (s[i + 3] < 128) continue;
      const t = dither === 'bayer4' ? BAYER4[(y & 3) * 4 + (x & 3)] * spread : 0, c = near(s[i] + t, s[i + 1] + t, s[i + 2] + t);
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    return out;
  }
  function reduce(src, { colours = '16', dither = 'fs', palette = 'best' } = {}) {
    const c = document.createElement('canvas'); c.width = src.naturalWidth || src.width; c.height = src.naturalHeight || src.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0);
    const img = x.getImageData(0, 0, c.width, c.height), grey = colours === 'grey' || colours === 'bw';
    if (grey) { const d = img.data; for (let i = 0; i < d.length; i += 4) { const v = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114); d[i] = d[i + 1] = d[i + 2] = v; } }
    const pal = colours === 'bw' ? greys(2) : colours === 'grey' ? greys(256) : colours === '16' && palette === 'win16' ? WIN16 : quantize(img, colours === '256' ? 256 : 16);
    // ordered dots spread each pixel by about one step between the palette's colours
    const step = grey ? 255 / (pal.length - 1) : 255 / Math.max(1, Math.cbrt(pal.length) - 1);
    x.putImageData(mapPixels(img, nearestOf(pal), colours === 'grey' ? 'none' : dither, Math.min(128, step)), 0, 0);
    return c;
  }
  window.PCColours = { reduce };
})();
