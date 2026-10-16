// props.js: 纸片道具。全是 piece() 拼起来的。
const FT_COL = ['#e8a3a1', '#eecf87', '#a6cbbb', '#a7c1dd'];
const FT_BACK = '#f7f0e2';
// 东南西北（顶视图，合上时是四个三角瓣盖住一张方纸）。R = 半边长。
// o.open: 0..1 或 [上, 右, 下, 左]，0 合上，1 完全翻开（瓣沿外边翻出去，过 0.5 后看到纸背）。
// o.inner(R): 在方纸里面画内容（已裁剪）。o.backMark(i, R): 瓣背面的小图案。
function fortune(x, y, R, o = {}) {
  C.save(); C.translate(x, y); C.rotate(o.rot || 0); if (o.scale) C.scale(o.scale, o.scale);
  const sq = [[-R, -R], [R, -R], [R, R], [-R, R]];
  if (!o.noBase) piece(sq, o.base || '#f6efe1', { seed: 90, border: 4.5, lift: o.lift ?? 1.4, after: () => {
    // creases
    C.save(); C.globalAlpha = .18; line([[-R, -R], [R, R]], R * .006, '#8a7a6a'); line([[R, -R], [-R, R]], R * .006, '#8a7a6a'); C.restore();
    if (o.inner) o.inner(R);
  } });
  const sides = [[sq[0], sq[1]], [sq[1], sq[2]], [sq[2], sq[3]], [sq[3], sq[0]]];
  // draw open (back-showing) flaps first, then front ones on top
  const order = [0, 1, 2, 3].sort((a, b) => (Array.isArray(o.open) ? o.open[b] : 0) - (Array.isArray(o.open) ? o.open[a] : 0));
  for (const i of order) {
    const [A, B] = sides[i], k = Array.isArray(o.open) ? o.open[i] : (o.open || 0);
    const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], c = Math.cos(Math.PI * clamp(k));
    if (Math.abs(c) < .04) continue;
    const Op = [M[0] * (1 - c), M[1] * (1 - c)], front = c > 0;
    // a folded flap lifts off the paper: bigger shadow mid-fold
    const lift = .5 + 1.4 * Math.sin(Math.PI * clamp(k));
    piece([A, B, Op], front ? (o.cols || FT_COL)[i] : FT_BACK, { seed: 91 + i, border: 3.5, lift, rough: .8 });
    const G = [(A[0] + B[0] + Op[0]) / 3, (A[1] + B[1] + Op[1]) / 3], ang = Math.atan2(-M[1], -M[0]) - Math.PI / 2;
    C.save(); C.translate(G[0], G[1]); C.rotate(ang); C.scale(1, Math.abs(c));
    if (front) ftSymbol(i, R * .16);
    else if (o.backMark) o.backMark(i, R);
    C.restore();
  }
  C.restore();
}
function ftSymbol(i, r) {
  const c = ['#fbf3e6', '#fbf3e6', '#fbf3e6', '#fbf3e6'][i];
  if (i === 0) piece(heartP(0, 0, r), '#d7706f', { seed: 95, border: 2.5, lift: .4 });
  if (i === 1) piece(starP(0, 0, r * 1.05, .48), '#f6e2a6', { seed: 96, border: 2.5, lift: .4 });
  if (i === 2) { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; piece(ellP(Math.cos(a) * r * .5, Math.sin(a) * r * .5, r * .42, r * .42, 20), '#f7ead2', { seed: 97 + k, border: 1.5, lift: .3 }); } piece(ellP(0, 0, r * .32, r * .32, 20), '#e9b85f', { seed: 103, border: 1.5, lift: .3 }); }
  if (i === 3) piece([...ellP(0, 0, r, r, 30)].map(([x, y]) => [x, y]).filter(([x, y]) => true), '#f6e6b8', { seed: 104, border: 2.5, lift: .4, after: () => { C.fillStyle = FT_COL[3]; C.beginPath(); C.arc(r * .45, -r * .25, r * .85, 0, TAU); C.fill(); } });
}

// question mark / exclamation as a small cut-out
function mark(ch, x, y, s, col = '#f3ead6', k = 1, rot = 0) { if (k <= 0) return; cutText(ch, x, y, s, col, { k: backOut(k), rot, weight: 900 }); }
// paper light bulb (an idea), glowing
function bulb(x, y, s, k) {
  if (k <= 0) return; const kk = backOut(k);
  glow(x, y - 4 * s, 70 * s * kk, '#ffe39a', .7 * k);
  C.save(); C.translate(x, y); C.scale(kk * s, kk * s);
  piece(rrP(-8, 14, 16, 12, 3), '#b9b2a8', { seed: 120, border: 2, lift: .5 });
  piece(ellP(0, 0, 18, 19, 30), '#fbe8a6', { seed: 121, border: 2.5, lift: .7 });
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .45; C.save(); C.rotate(a + Math.PI / 2); piece(rrP(-2, -42, 4, 11, 2), '#f6d77c', { seed: 122 + i, border: 1.5, lift: .3 }); C.restore(); }
  C.restore();
}
function cloud(x, y, w, h, seed = 1, col = '#f4ede0', o = {}) { piece(cloudP(x, y, w, h, seed, o.bumps || 5), col, { seed: 130 + seed, border: o.border ?? 4, lift: o.lift ?? 1, ...o }); }
function sun(x, y, r, t, o = {}) {
  glow(x, y, r * 4.5, o.glowCol || '#ffe7a8', o.a ?? .75);
  piece(ellP(x, y, r, r, 48), o.col || '#f2c766', { seed: 140, border: 4, lift: .6, stains: [[1, x - r * .3, y - r * .3, r * 2, r * 2, '#e9a94a', .25]] });
}
function moon(x, y, r) { glow(x, y, r * 4, '#e8eefc', .55); piece(ellP(x, y, r, r, 40), '#f6f0de', { seed: 141, border: 3, lift: .6 }); }
function stars(t, n, box, seed = 1, a = 1) {
  const [x, y, w, h] = box;
  for (let i = 0; i < n; i++) { const px = x + hash(i * 3 + seed) * w, py = y + hash(i * 7 + seed) * h, tw = .55 + .45 * wob(t, .3 + .5 * hash(i), hash(i * 5)), r = 1.5 + 2.5 * hash(i * 11 + seed); glow(px, py, r * 7, '#f3f0ff', .55 * tw * a); C.save(); C.globalAlpha = tw * a; C.fillStyle = '#fffbea'; C.beginPath(); C.arc(px, py, r * .8, 0, TAU); C.fill(); C.restore(); }
}
// a flower head: petals around a centre; kind 'rose' (pink, layered) | 'daisy' (yellow, many petals)
function flower(x, y, r, kind = 'rose', seed = 1, rot = 0) {
  C.save(); C.translate(x, y); C.rotate(rot);
  if (kind === 'rose') {
    piece(ellP(0, 0, r, r * .95, 30), '#e59aa2', { seed: 150 + seed, border: 2, lift: .6 });
    C.save(); C.rotate(.5); piece(ellP(0, -r * .05, r * .68, r * .6, 24), '#d9808b', { seed: 151 + seed, border: 1.5, lift: .4 }); C.restore();
    piece(ellP(r * .05, -r * .05, r * .32, r * .3, 18), '#c66b78', { seed: 152 + seed, border: 1.2, lift: .3 });
  } else {
    const n = 12; for (let k = 0; k < n; k++) { const a = k / n * TAU + seed; C.save(); C.rotate(a); piece(ellP(0, -r * .62, r * .2, r * .48, 14), '#f0c94e', { seed: 153 + seed + k, border: 1.4, lift: .35 }); C.restore(); }
    piece(ellP(0, 0, r * .36, r * .36, 20), '#c8853b', { seed: 170 + seed, border: 1.4, lift: .4 });
  }
  C.restore();
}
function stem(x0, y0, x1, y1, w = 4) { const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); C.save(); C.translate(x0, y0); C.rotate(a); piece(rectP(0, -w / 2, L, w), '#7a9a5e', { seed: 180 + Math.round(L), border: 1.2, lift: .35, grain: .3 }); C.restore(); }
function leaf(x, y, s, rot, seed = 1) { C.save(); C.translate(x, y); C.rotate(rot); piece([[0, 0], [s * .5, -s * .35], [s, 0], [s * .5, s * .35]], '#8fae6c', { seed: 190 + seed, border: 1.4, lift: .35 }); C.restore(); }
// a bouquet held at (0,0): kind decides colour
function bouquet(kind, s = 1, seed = 1) {
  C.save(); C.scale(s, s);
  const heads = [[-26, -96, 20], [0, -110, 22], [26, -94, 20], [-12, -76, 18], [14, -74, 18]];
  for (const [hx, hy] of heads) stem(0, 0, hx * .9, hy + 8, 4);
  leaf(-8, -46, 30, -2.4, 1); leaf(6, -50, 30, -.7, 2);
  heads.forEach(([hx, hy, r], i) => flower(hx, hy, r, kind, seed + i, i));
  // paper wrap
  piece([[-30, -60], [30, -60], [8, 18], [-8, 18]], '#f2e8d4', { seed: 200, border: 3, lift: .9, after: () => { line([[-18, -40], [-4, 10]], 1.4, '#c9b89a', 'round', .6); } });
  piece(rrP(-12, -6, 24, 10, 4), '#d8746f', { seed: 201, border: 1.5, lift: .5 });
  C.restore();
}
function paperBird(x, y, s, t, seed = 1) {
  const f = Math.sin(t * 9 + seed) * .8;
  C.save(); C.translate(x, y); C.scale(s, s);
  piece([[-22, 0], [16, -3], [26, 2], [8, 6]], '#f5efe4', { seed: 210 + seed, border: 2, lift: .8 });
  piece([[-4, 0], [10, 0], [2, -26 * f - 4]], '#e9e1d2', { seed: 211 + seed, border: 2, lift: .8 });
  C.restore();
}
function heartPiece(x, y, r, col = '#d8605f', o = {}) { piece(heartP(x, y, r), col, { seed: o.seed ?? 220, border: o.border ?? 4, lift: o.lift ?? 1, ...o }); }
// buildings strip for skylines; windows light up with lit (0..1)
function skyline(x0, y0, w, n, seed, col, winCol, lit = 0, t = 0) {
  for (let i = 0; i < n; i++) {
    const bw = 90 + 80 * hash(i * 3 + seed), bh = 160 + 260 * hash(i * 5 + seed), bx = x0 + i * w / n + (hash(i + seed) - .5) * 30;
    piece(rectP(bx, y0 - bh, bw, bh + 60), mixCol(col, '#ffffff', hash(i * 7 + seed) * .12), { seed: 300 + i + seed, border: 3, lift: .8, after: () => {
      for (let r = 0; r < Math.floor(bh / 46); r++) for (let c = 0; c < Math.floor(bw / 34); c++) {
        const on = hash(i * 100 + r * 10 + c + seed) < lit;
        C.fillStyle = on ? winCol : rgba(darker(col, .25), .5); C.fillRect(bx + 12 + c * 32, y0 - bh + 18 + r * 44, 14, 20);
        if (on) glow(bx + 19 + c * 32, y0 - bh + 28 + r * 44, 26, '#ffd98a', .35);
      }
    } });
  }
}
