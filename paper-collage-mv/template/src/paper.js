// paper.js: 纸艺拼贴引擎（Canvas 2D，不用 p5）。来自《只对你有感觉》第五轮 medium 版，API 见 skill 的 references/engine.md。
// 每个东西都是一块带不规则白色纸边、淡投影、纸纤维颗粒的彩色纸片；背景是水彩渐变 + 水渍；
// 全局后期是辉光、光束、光点、暗角和胶片颗粒。帧是 t 的纯函数，可乱序并行渲染：不许在帧之间留状态、不许用 Math.random。
const W = 1920, H = 1080, DUR = PROJECT.duration, BPM = PROJECT.bpm, BEAT = 60 / BPM, OFF = PROJECT.offset || 0;
const TAU = Math.PI * 2;
let C = null, T = 0, OUT = null;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const ease5 = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const backOut = (x, s = 1.7) => { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const frac = x => x - Math.floor(x);
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hashS = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
const wob = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);
const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
// 关键帧：每段用 ease（端点速度为 0，段内单调），关键值单调则整体单调，不会来回冲。
function kf(t, keys, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((t - a) / (b - a));
    return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
  }
  return keys[keys.length - 1][1];
}
// smooth 1D value noise
function vn(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u); }

// ---------- colour ----------
function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(h, a) { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; }
function mixCol(a, b, k) { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k))).toString(16).padStart(2, '0')).join(''); }
const darker = (h, k) => mixCol(h, '#1e1622', k);
const lighter = (h, k) => mixCol(h, '#fffaf0', k);
const PAPER_WHITE = '#f8f3e8', INK = '#2c2330', SHADOW = 'rgba(38,26,40,.30)';

// ---------- shapes (point lists, local coords) ----------
function rectP(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function ellP(cx, cy, rx, ry, n = 56, rot = 0) { const p = []; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
function rrP(x, y, w, h, r, n = 6) {
  r = Math.min(r, w / 2, h / 2); const p = [], c = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  c(x + w - r, y + r, -Math.PI / 2); c(x + w - r, y + h - r, 0); c(x + r, y + h - r, Math.PI / 2); c(x + r, y + r, Math.PI); return p;
}
function starP(cx, cy, r, inner = .45, n = 5, rot = -Math.PI / 2) { const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r * inner : r; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return p; }
function heartP(cx, cy, r, n = 64) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); p.push([cx + x * r / 16, cy + y * r / 16 - r * .1]); } return p; }
// paper cloud: flat bottom, bumpy top
function cloudP(cx, cy, w, h, seed = 1, bumps = 5) {
  const p = [[cx + w / 2, cy]], x0 = cx - w / 2;
  p.push([cx + w / 2, cy + 0]); p.push([x0, cy]);
  const bw = w / bumps;
  for (let i = 0; i < bumps; i++) {
    const bx = x0 + bw * (i + .5), bh = h * (.55 + .45 * hash(seed * 13 + i)) * (i === 0 || i === bumps - 1 ? .7 : 1), br = bw * .62;
    for (let k = 0; k <= 10; k++) { const a = Math.PI + k / 10 * Math.PI; p.push([bx + Math.cos(a) * br, cy - bh * .35 + Math.sin(a) * bh * .75]); }
  }
  return p;
}
function triP(a, b, c) { return [a, b, c]; }

// resample a closed polygon so the cut edge can wobble; d = spacing in local units
function resample(P, d) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / d));
    for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  return out;
}
function area(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
// offset each vertex along its outward normal by dist(i)
function offsetP(P, dist) {
  const n = P.length, sg = area(P) > 0 ? 1 : -1, out = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], p = P[i], b = P[(i + 1) % n];
    let e1x = p[0] - a[0], e1y = p[1] - a[1], e2x = b[0] - p[0], e2y = b[1] - p[1];
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
    let nx = (e1y / l1 + e2y / l2), ny = -(e1x / l1 + e2x / l2); const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln;
    // miter correction, capped
    const cosh = clamp((nx * e1y / l1 - ny * e1x / l1), .45, 1);
    const d = dist(i) / cosh * sg;
    out.push([p[0] + nx * d, p[1] + ny * d]);
  }
  return out;
}
function pathOf(P) { const p = new Path2D(); p.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) p.lineTo(P[i][0], P[i][1]); p.closePath(); return p; }

// ---------- textures (made once) ----------
let GRAIN = null, GRAIN_PAT = null, FILM = null, STAINS = [], STAIN_CACHE = {};
function lcg(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function makeGrain() {
  const N = 384, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), id = c.createImageData(N, N), d = id.data, r = lcg(7);
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() - .5) * 52 + (r() < .06 ? (r() - .5) * 120 : 0); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  c.putImageData(id, 0, 0);
  // paper fibres
  c.lineWidth = .8;
  for (let i = 0; i < 260; i++) { const x = r() * N, y = r() * N, l = 3 + r() * 10, a = r() * TAU; c.strokeStyle = r() < .5 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.22)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  return cv;
}
function makeFilm() {
  const w = W + 128, h = H + 128, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'), id = c.createImageData(w, h), d = id.data, r = lcg(3);
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() - .5) * 70; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  c.putImageData(id, 0, 0); return cv;
}
// fbm value noise 2D for watercolor stains
function vn2(x, y, s) {
  const h2 = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(h2(i, j), h2(i + 1, j), u), lerp(h2(i, j + 1), h2(i + 1, j + 1), u), v);
}
function makeStain(seed) {
  const N = 320, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), id = c.createImageData(N, N), d = id.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const nx = x / N * 4, ny = y / N * 4;
    const f = vn2(nx, ny, seed) * .5 + vn2(nx * 2.1, ny * 2.1, seed + 1) * .3 + vn2(nx * 4.3, ny * 4.3, seed + 2) * .2;
    const r = Math.hypot(x / N - .5, y / N - .5) * 2, field = f * .62 + (1 - r) * .62, th = .62;
    let a = 0;
    if (field > th) { const fine = vn2(nx * 9, ny * 9, seed + 3); a = .34 + .22 * fine + .32 * Math.exp(-Math.pow((field - th) / .035, 2)); }
    else a = .25 * Math.exp(-Math.pow((th - field) / .02, 2));
    const i = (y * N + x) * 4; d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = clamp(a) * 255;
  }
  c.putImageData(id, 0, 0); return cv;
}
function stainTex(i, col) {
  const k = i + col; if (STAIN_CACHE[k]) return STAIN_CACHE[k];
  const s = STAINS[i % STAINS.length], cv = document.createElement('canvas'); cv.width = s.width; cv.height = s.height; const c = cv.getContext('2d');
  c.drawImage(s, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height);
  return (STAIN_CACHE[k] = cv);
}
function stain(i, x, y, w, h, col, a = .3, op = 'multiply', rot = 0) {
  C.save(); C.globalAlpha = a; C.globalCompositeOperation = op; C.translate(x, y); C.rotate(rot); C.drawImage(stainTex(i, col), -w / 2, -h / 2, w, h); C.restore();
}

// ---------- camera & layers ----------
// cam = { x, y, z, r }: world point (x, y) lands at screen centre. layer(d) applies it with parallax depth d
// (d = 1 the main plane, < 1 farther, > 1 nearer). ZB is the screen scale of the main plane: borders and shadows
// grow with it, softly.
let CAM = { x: W / 2, y: H / 2, z: 1, r: 0 }, ZB = 1, LAST_CAM = CAM;
function setCam(x, y, z = 1, r = 0) { CAM = LAST_CAM = { x, y, z, r }; ZB = Math.sqrt(z); }
function layer(d = 1) {
  const z = Math.pow(CAM.z, d), cx = lerp(W / 2, CAM.x, d), cy = lerp(H / 2, CAM.y, d);
  C.setTransform(1, 0, 0, 1, 0, 0); C.translate(W / 2, H / 2); C.rotate(CAM.r * d); C.scale(z, z); C.translate(-cx, -cy);
}
function screen() { C.setTransform(1, 0, 0, 1, 0, 0); }
function toScreen(x, y, d = 1) { const z = Math.pow(CAM.z, d), cx = lerp(W / 2, CAM.x, d), cy = lerp(H / 2, CAM.y, d); const dx = (x - cx) * z, dy = (y - cy) * z, c = Math.cos(CAM.r * d), s = Math.sin(CAM.r * d); return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c]; }
const curScale = () => { const m = C.getTransform(); return Math.hypot(m.a, m.b) || 1; };
// 运镜：keys = [[t, x, y, zoom], ...]。位置逐段 ease，缩放在对数空间 ease：每段端点速度为 0、段内单调，不会来回冲。
// 想要「停一下」就放两个相同的关键帧；不要用 Catmull-Rom 一类会过冲的插值。出片前跑 tools/camcheck.mjs。
// 关键帧可以带第 5 项，写到达这一帧的那一段怎么走：'in' 一路加速到这一帧（推进匹配推到切点），'out' 起步快、越走越慢（切过去以后往外拉），'lin' 匀速；不写就是两头慢的 ease。
const CAM_EASE = { in: x => x * x * x, out: x => 1 - (1 - x) ** 3, lin: x => x };
function camK(t, keys, r = 0) {
  let i = 1; while (i < keys.length - 1 && t >= keys[i][0]) i++;
  const a = keys[i - 1], b = keys[i] || a, u = clamp((t - a[0]) / Math.max(1e-6, b[0] - a[0])), k = (CAM_EASE[b[4]] || ease)(u);
  setCam(lerp(a[1], b[1], k), lerp(a[2], b[2], k), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), k)), r); CAM_MAIN = CAM;
}
let CAM_MAIN = null;   // 本帧主镜头（camK 设的），tools/camcheck.mjs 读它

// ---------- the paper piece ----------
// piece(pts, colour, o): o.seed (edge noise), o.border (screen px, default 4), o.lift (shadow depth, default 1, 0 = none),
// o.grain (0..1), o.alpha, o.noBorder, o.back (colour of the white edge), o.shade (top-light gradient, default .5),
// o.stains: [[i, x, y, w, h, col, a], ...] watercolour stains clipped inside, o.after(path): extra drawing clipped inside.
let SIL = null;   // silhouette mode: every piece fills flat in this colour (shadow puppets)
function piece(pts, col, o = {}) {
  if (SIL) { C.fillStyle = SIL; C.fill(pathOf(pts)); return null; }
  const sc = curScale(), seed = o.seed ?? 1, bpx = (o.border ?? 4) * Math.min(ZB, 2.2), b = bpx / sc;
  const P = resample(pts, (o.step ?? 7) / sc);
  const amp = (o.rough ?? 1) * 1.1 / sc;
  const inner = offsetP(P, i => amp * (vn(i * .35, seed) - .5) * 2);
  const outer = o.noBorder ? inner : offsetP(P, i => b * (.62 + .55 * vn(i * .23, seed + 9) + .25 * hash(i + seed * 31)));
  const pin = pathOf(inner), pout = pathOf(outer);
  C.save();
  if (o.alpha != null) C.globalAlpha = o.alpha;
  const lift = o.lift ?? 1;
  if (lift > 0) { const z = Math.min(ZB, 2.2) * lift; C.shadowColor = o.shadowCol || SHADOW; C.shadowBlur = 9 * z; C.shadowOffsetX = 3.5 * z; C.shadowOffsetY = 4.5 * z; }
  C.fillStyle = o.noBorder ? col : (o.back || PAPER_WHITE); C.fill(pout);
  C.shadowColor = 'transparent'; C.shadowBlur = 0; C.shadowOffsetX = C.shadowOffsetY = 0;
  if (!o.noBorder) { C.fillStyle = col; C.fill(pin); }
  // inside the cut: shading, stains, extras, grain
  C.save(); C.clip(pout);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of outer) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const sh = o.shade ?? .5;
  if (sh > 0) { const g = C.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(255,252,240,${.1 * sh})`); g.addColorStop(.55, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(40,20,40,${.12 * sh})`); C.fillStyle = g; C.fillRect(x0, y0, x1 - x0, y1 - y0); }
  if (o.stains) { C.save(); C.clip(pin); for (const s of o.stains) stain(s[0], s[1], s[2], s[3], s[4], s[5], s[6] ?? .25, s[7] || 'multiply', s[8] || 0); C.restore(); }
  if (o.after) { C.save(); C.clip(pin); o.after(pin, [x0, y0, x1, y1]); C.restore(); }
  const gr = o.grain ?? .55;
  if (gr > 0) {
    GRAIN_PAT.setTransform(new DOMMatrix().scale(1 / sc));
    C.globalCompositeOperation = 'overlay'; C.globalAlpha = (o.alpha ?? 1) * gr; C.fillStyle = GRAIN_PAT; C.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  C.restore();
  C.restore();
  return pin;
}
// a thin printed / drawn line (for seams, mouths, brows). width in local units.
function line(P, w, col, cap = 'round', alpha = 1) {
  if (SIL) return;
  C.save(); C.globalAlpha *= alpha; C.strokeStyle = col; C.lineWidth = w; C.lineCap = cap; C.lineJoin = 'round';
  C.beginPath(); C.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) C.lineTo(P[i][0], P[i][1]); C.stroke(); C.restore();
}
function curve(P, w, col, alpha = 1) {   // quadratic smooth through points
  C.save(); C.globalAlpha *= alpha; C.strokeStyle = col; C.lineWidth = w; C.lineCap = 'round'; C.lineJoin = 'round'; C.beginPath(); C.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; C.quadraticCurveTo(P[i][0], P[i][1], mx, my); }
  C.lineTo(P[P.length - 1][0], P[P.length - 1][1]); C.stroke(); C.restore();
}
function fillP(P, col, alpha = 1) { C.save(); C.globalAlpha *= alpha; C.fillStyle = col; C.fill(pathOf(P)); C.restore(); }
function softDot(x, y, rx, ry, col, a) {   // soft-edged blush / glow spot (normal blend)
  C.save(); C.translate(x, y); C.scale(1, ry / rx); const g = C.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgba(col, a)); g.addColorStop(.55, rgba(col, a * .75)); g.addColorStop(1, rgba(col, 0)); C.fillStyle = g; C.fillRect(-rx, -rx, rx * 2, rx * 2); C.restore();
}

// ---------- watercolour backdrops ----------
// wash(x, y, w, h, stops, o): gradient sheet + stains + blooms, in the current layer.
function wash(x, y, w, h, stops, o = {}) {
  const g = o.radial ? C.createRadialGradient(o.radial[0], o.radial[1], 0, o.radial[0], o.radial[1], o.radial[2]) : C.createLinearGradient(x, y, o.horiz ? x + w : x, o.horiz ? y : y + h);
  stops.forEach(([s, c]) => g.addColorStop(s, c)); C.fillStyle = g; C.fillRect(x, y, w, h);
  const n = o.stains ?? 7, seed = o.seed ?? 1, base = o.stainCol || stops[stops.length - 1][1];
  C.save(); C.beginPath(); C.rect(x, y, w, h); C.clip();
  for (let i = 0; i < n; i++) {
    const sx = x + hash(seed * 7 + i) * w, sy = y + hash(seed * 11 + i * 3) * h, sz = (.25 + .45 * hash(seed + i * 5)) * Math.max(w, h) * (o.stainSize ?? .7);
    stain((seed + i) % 4, sx, sy, sz, sz * (.6 + .5 * hash(i + seed * 3)), darker(base, .18), (o.stainA ?? .15) * (.6 + .6 * hash(i * 9 + seed)), 'multiply', hash(i) * 6);
  }
  for (let i = 0; i < (o.blooms ?? 3); i++) {
    const sx = x + hash(seed * 5 + i * 17) * w, sy = y + hash(seed * 3 + i * 13) * h, sz = (.3 + .4 * hash(seed + i * 7)) * Math.max(w, h) * .5;
    stain((seed + i + 2) % 4, sx, sy, sz, sz * .7, '#fffaf0', .18, 'screen', hash(i + 4) * 6);
  }
  C.restore();
}

// ---------- light ----------
function glow(x, y, r, col = '#ffe6a8', a = .8, op = 'screen') {
  if (a <= 0 || r < 1) return;
  C.save(); C.globalCompositeOperation = op; const g = C.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(.2, rgba(col, a * .6)); g.addColorStop(.5, rgba(col, a * .18)); g.addColorStop(1, rgba(col, 0));
  C.fillStyle = g; C.fillRect(x - r, y - r, 2 * r, 2 * r); C.restore();
}
// god rays from (x, y), spread around angle a0
function rays(x, y, a0, spread, n, len, col, a, t = 0, seed = 1) {
  C.save(); C.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const ang = a0 + (i / (n - 1) - .5) * spread + .03 * wob(t, .07, hash(i + seed)), wdt = (.02 + .045 * hash(i * 3 + seed)), al = a * (.45 + .55 * (.5 + .5 * wob(t, .11 + .1 * hash(i), hash(i * 7))));
    const g = C.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.addColorStop(0, rgba(col, al)); g.addColorStop(1, rgba(col, 0));
    C.fillStyle = g; C.beginPath(); C.moveTo(x, y); C.lineTo(x + Math.cos(ang - wdt) * len, y + Math.sin(ang - wdt) * len); C.lineTo(x + Math.cos(ang + wdt) * len, y + Math.sin(ang + wdt) * len); C.closePath(); C.fill();
  }
  C.restore();
}
// floating motes of light drifting upward (screen space or in a layer)
function motes(t, n, box, col = '#fff1c8', a = .8, seed = 3, size = 1) {
  const [x, y, w, h] = box;
  for (let i = 0; i < n; i++) {
    const sp = 12 + 22 * hash(i * 5 + seed), px = x + frac(hash(i + seed) + .02 * wob(t, .05 + .05 * hash(i), hash(i * 2))) * w, py = y + frac(hash(i * 3 + seed) - t * sp / h) * h;
    const tw = .5 + .5 * wob(t, .4 + .6 * hash(i * 11), hash(i * 13)), r = (2 + 4 * hash(i * 17 + seed)) * size;
    glow(px, py, r * 5, col, a * tw * .5); glow(px, py, r * 1.4, '#ffffff', a * tw * .7);
  }
}

// ---------- lettering: serif cards ----------
const FONT = '"NotoSerifSC"';
// one card with a character on it. (x, y) centre, s size.
function card(ch, x, y, s, o = {}) {
  C.save(); C.translate(x, y); C.rotate(o.rot || 0); C.scale(o.k ?? 1, o.k ?? 1);
  if (o.alpha != null) C.globalAlpha = o.alpha;
  const w = s * (o.wk ?? 1), h = s * (o.hk ?? 1.06);
  piece(rrP(-w / 2, -h / 2, w, h, s * .06), o.bg || '#f3ead6', { seed: o.seed ?? hashS(ch) * 50, border: o.border ?? 2.5, lift: o.lift ?? .8, grain: .5, rough: .8 });
  C.fillStyle = o.col || '#3a2c36'; C.font = `${o.weight || 700} ${s * .66}px ${FONT}`; C.textAlign = 'center'; C.textBaseline = 'middle';
  C.fillText(ch, 0, s * .03);
  C.restore();
}
// cut-out paper letters (no card): red serif glyph with white paper edge and shadow
function cutText(txt, x, y, s, col = '#b8443f', o = {}) {
  C.save(); C.translate(x, y); C.rotate(o.rot || 0); C.scale(o.k ?? 1, o.k ?? 1); if (o.alpha != null) C.globalAlpha = o.alpha;
  C.font = `${o.weight || 900} ${s}px ${FONT}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.lineJoin = 'round';
  const z = Math.min(ZB, 2);
  C.shadowColor = SHADOW; C.shadowBlur = 10 * z; C.shadowOffsetX = 4 * z; C.shadowOffsetY = 5 * z;
  C.strokeStyle = PAPER_WHITE; C.lineWidth = s * .13; C.strokeText(txt, 0, 0);
  C.shadowColor = 'transparent';
  C.fillStyle = col; C.fillText(txt, 0, 0);
  if (o.glowCol) { C.globalCompositeOperation = 'screen'; C.globalAlpha *= .25; C.fillStyle = o.glowCol; C.fillText(txt, 0, 0); }
  C.restore();
}

// ---------- post ----------
function post(t, o = {}) {
  screen();
  // colour grade
  if (o.tone) { C.save(); C.globalCompositeOperation = 'soft-light'; C.globalAlpha = o.toneA ?? .35; C.fillStyle = o.tone; C.fillRect(0, 0, W, H); C.restore(); }
  // vignette
  C.save(); C.globalCompositeOperation = 'multiply'; const g = C.createRadialGradient(W / 2, H * .48, H * .42, W / 2, H / 2, H * 1.08);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(${o.vig || '70,50,70'},${o.vigA ?? .55})`); C.fillStyle = g; C.fillRect(0, 0, W, H); C.restore();
  // film grain (moves at 12 fps)
  const f = Math.floor(t * 12); C.save(); C.globalCompositeOperation = 'overlay'; C.globalAlpha = o.grain ?? .13;
  C.drawImage(FILM, -Math.floor(hash(f) * 120), -Math.floor(hash(f + 7) * 120)); C.restore();
}

// ---------- frame plumbing ----------
const SHOTS = [], LOOPS = {};
function shots(list) { SHOTS.push(...list); SHOTS.sort((a, b) => a[0] - b[0]); }
function drawWorld(t) {
  C.setTransform(1, 0, 0, 1, 0, 0); C.globalAlpha = 1; C.globalCompositeOperation = 'source-over';
  C.fillStyle = '#efe6d6'; C.fillRect(0, 0, W, H);
  setCam(W / 2, H / 2, 1); CAM_MAIN = null;
  if (window.LOOP) window.LOOP(t);
  else if (SHOTS.length) {
    let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++;
    const t0 = SHOTS[i][0], end = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : DUR;
    SHOTS[i][1](t, t - t0, end - t0);
  }
  C.setTransform(1, 0, 0, 1, 0, 0);
}
async function setup() {
  OUT = document.getElementById('out'); C = OUT.getContext('2d');
  GRAIN = makeGrain(); GRAIN_PAT = C.createPattern(GRAIN, 'repeat'); FILM = makeFilm();
  for (let i = 0; i < 4; i++) STAINS.push(makeStain(i * 3 + 1));
  // 把歌词和 PROJECT.extraText 里出现的字都按三种字重预载，免得渲染时缺字掉回系统字体
  const chars = [...new Set(((typeof LYR_DATA !== 'undefined' ? LYR_DATA.lines.map(l => l.line).join('') : '') + (PROJECT.extraText || '') + '0123456789?!').split(''))].join('');
  for (const w of [400, 700, 900]) await document.fonts.load(`${w} 60px ${FONT}`, chars);
  window.ready = true;
  if (!location.search.includes('render')) devUI();
}
window.renderAt = async (t, type = 'image/png', q = .92) => { T = t; drawWorld(t); return OUT.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null, at = null) => {
  const [, , cw, ch] = at || crop || [0, 0, W, H], h = Math.round(w * ch / cw), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); T = times[i]; drawWorld(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    const [cx, cy] = at ? toScreen(at[0], at[1]).map((v, j) => v - (j ? ch : cw) / 2) : crop || [0, 0];
    c.drawImage(OUT, cx, cy, cw, ch, x, y, w, h); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x, y, 84, 24); c.fillStyle = '#fff'; c.font = '15px sans-serif'; c.fillText(times[i].toFixed(2) + 's', x + 6, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => 'canvas2d';
function devUI() {
  const s = document.getElementById('scrub'), lab = document.getElementById('tt'); s.max = window.LOOP ? window.LOOP.len : DUR;
  const go = async () => { const t0 = performance.now(); await window.renderAt(+s.value); lab.textContent = `${(+s.value).toFixed(2)}s · ${Math.round(performance.now() - t0)} ms`; };
  s.addEventListener('input', go); s.value = +(new URLSearchParams(location.search).get('t') || 0); go();
}
window.addEventListener('load', () => { const q = new URLSearchParams(location.search).get('loop'); if (q && LOOPS[q]) window.LOOP = LOOPS[q]; setup(); });
