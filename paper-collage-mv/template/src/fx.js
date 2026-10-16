// fx.js: 让画面「活」的小工具。反应符号、入场、余震、环境里一直在动的东西。全是纸片，帧是 t 的纯函数。

// ---- 入场与反应 ----
// 弹出来：t0 开始，d 秒内从 0 冲过 1 再回到 1。物件、花、符号入场都用它，不要凭空出现。
const pop = (t, t0, d = .35) => t < t0 ? 0 : backOut(seg(t, t0, t0 + d), 1.8);
// 被吓一跳 / 被戳一下的余震：返回一个衰减振荡，加在 tilt、dy、lean 上。
const jolt = (t, t0, amp = .08) => amp * spring(t, t0, 5, 16);
// 漫画符号（? ! 这类，不算画面文字）：k 是 0..1 的出现程度，配 seg() 用。
function mark(ch, x, y, s, col = '#f3ead6', k = 1, rot = 0) { if (k <= 0) return; cutText(ch, x, y, s, col, { k: backOut(k), rot, weight: 900 }); }
function heartPiece(x, y, r, col = '#d8605f', o = {}) { piece(heartP(x, y, r), col, { seed: o.seed ?? 220, border: o.border ?? 4, lift: o.lift ?? 1, ...o }); }
// 从 (x, y) 往上飘的小心，t0 开始，约 1.6 秒
function heartsUp(t, t0, x, y, s = 1, n = 3, col = '#e17f86') {
  for (let i = 0; i < n; i++) {
    const a = t - t0 - i * .18; if (a < 0 || a > 1.6) continue;
    const k = a / 1.6, px = x + (hash(i + 3) - .5) * 70 * s + Math.sin(a * 5 + i) * 10 * s, py = y - a * 120 * s;
    C.save(); C.globalAlpha = 1 - easeIn(k); heartPiece(px, py, (12 + 6 * hash(i)) * s * backOut(clamp(a / .25)), col, { seed: 640 + i, border: 2.5, lift: .6 }); C.restore();
  }
}
// 一闪：k 是 0..1 的进度
function sparkle(x, y, r, k) { if (k <= 0 || k >= 1) return; const s = backOut(k) * (1 - k * .5); glow(x, y, r * 3 * s, '#fff2c4', .6 * (1 - k)); C.save(); C.globalAlpha = 1 - k * k; piece(starP(x, y, r * s, .3, 4, k * 1.5), '#fff6dc', { seed: 650, border: 0, noBorder: true, lift: 0, grain: 0 }); C.restore(); }
// 汗滴：k 从 0 开始往下滑
function sweat(x, y, s, k) { if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 3); C.translate(x, y + easeOut(k) * 14 * s); C.scale(s, s); piece([[0, -14], [7, 2], [5, 8], [0, 10], [-5, 8], [-7, 2]], '#b9d9ea', { seed: 660, border: 2, lift: .5 }); C.restore(); }
// 速度线 / 情绪线：从 (x, y) 向外放射 n 条短纸条，k 是 0..1
function burst(x, y, r, k, n = 6, col = '#f3ead6', rot = 0) { if (k <= 0 || k >= 1) return; const e = easeOut(k); C.save(); C.globalAlpha = 1 - k; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; C.save(); C.translate(x + Math.cos(a) * r * (.6 + .5 * e), y + Math.sin(a) * r * (.6 + .5 * e)); C.rotate(a); piece(rrP(-10 * (1 - k * .5), -2.5, 20 * (1 - k * .5), 5, 2), col, { seed: 670 + i, border: 1.2, lift: .3 }); C.restore(); } C.restore(); }

// ---- 物件沿弧线飞：抛、递、掉落 ----
// 从 a 飞到 b，中间拱起 h（负值往上拱），k 是 0..1 的进度（自己配缓动）
const arc = (a, b, h, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) + h * 4 * k * (1 - k)];

// ---- 道具零件：软的东西会垂会飘，平的东西绕着一条边翻 ----
// 软带子（围巾、丝带、绳子、布条、旗子）：沿中线 pts 画一条纸带，w 是宽度（数字，或 k => 宽，k 是 0..1 的长度位置，做出收尖）。
//   o.bands 沿长度轮流换的颜色、o.bandLen 每段多长；o.rib 针织纹（沿长度的细线）；o.fringe 两头流苏的长度、o.fringeCol；o.seed
function strip(pts, w, col, o = {}) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = L[L.length - 1] || 1, n = Math.max(2, Math.ceil(len / 8)), P = [];
  for (let k = 0, j = 0; k <= n; k++) { const d = len * k / n; while (j < pts.length - 2 && L[j + 1] < d) j++; const u = clamp((d - L[j]) / ((L[j + 1] - L[j]) || 1)); P.push([lerp(pts[j][0], pts[j + 1][0], u), lerp(pts[j][1], pts[j + 1][1], u)]); }
  const Wd = i => typeof w === 'function' ? w(i / n) : w;
  const nor = i => { const a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; return [-dy / m, dx / m]; };
  const off = (f, i) => { const q = nor(i), h = Wd(i) * f; return [P[i][0] + q[0] * h, P[i][1] + q[1] * h]; };
  const seed = o.seed ?? 710, sc = curScale();
  if (o.fringe) for (const e of [0, n]) {   // 流苏先画，压在带子下面
    const a = P[e], b = P[e ? n - 1 : 1], dx = a[0] - b[0], dy = a[1] - b[1], m = Math.hypot(dx, dy) || 1;
    for (let j = 0; j < 5; j++) { const s = off(-.4 + j * .2, e), r = o.fringe * (.8 + .4 * hash(j + seed)), wg = (hash(j + seed + 7) - .5) * .5;
      line([[s[0] - dx / m * 4, s[1] - dy / m * 4], [s[0] + (dx / m + dy / m * wg) * r, s[1] + (dy / m - dx / m * wg) * r]], Math.max(2, Wd(e) * .07), o.fringeCol || col); }
  }
  const poly = [...P.map((_, i) => off(.5, i)), ...P.map((_, i) => off(-.5, n - i))];
  piece(poly, col, { seed, border: o.border ?? 3, lift: o.lift ?? .9, step: 5, after: () => {
    if (o.bands) { const per = Math.max(1, Math.round((o.bandLen || 40) / (len / n))); for (let i = 0, c = 0; i < n; i += per, c++) { const bc = o.bands[c % o.bands.length]; if (!bc) continue; const e = Math.min(n, i + per); C.beginPath(); for (let k = i; k <= e; k++) { const q = off(.6, k); k === i ? C.moveTo(q[0], q[1]) : C.lineTo(q[0], q[1]); } for (let k = e; k >= i; k--) { const q = off(-.6, k); C.lineTo(q[0], q[1]); } C.fillStyle = bc; C.fill(); } }
    if (o.rib) for (const f of [-.3, -.1, .1, .3]) line(P.map((_, i) => off(f, i)), Math.max(1, 1.4 / sc), 'rgba(255,250,240,.35)');
  } });
  return P;
}
// 一头挂着、一头垂下来的带子中线：从 (x, y) 朝 ang 出发（Math.PI / 2 是正下方），长 len。
// wind 0 是自然下垂，1 是被风吹平（往 o.windDir，默认朝右）；越往末端摆得越大、越晚。返回给 strip() 用的点。
function tail(x, y, len, ang, t, wind = 0, o = {}) {
  const n = 10, P = [[x, y]]; let a = ang, px = x, py = y;
  const target = lerp(Math.PI / 2, o.windDir ?? 0, wind);
  for (let i = 1; i <= n; i++) { const k = i / n; a = lerp(a, target, .2 + .15 * k) + (o.amp ?? .1) * (.3 + wind) * k * Math.sin(t * (o.f ?? 2.4) - k * 2.6 + (o.ph ?? 0)); px += Math.cos(a) * len / n; py += Math.sin(a) * len / n; P.push([px, py]); }
  return P;
}
// 两点之间往下垂的一段（晾衣绳、彩旗绳、搭在两个人肩上的东西）：h 是中间垂多少
const sag = (a, b, h, n = 12) => Array.from({ length: n + 1 }, (_, i) => arc(a, b, h, i / n));
// 绕一条边翻的平板（门、柜门、盒盖、书的封面、窗扇、卡片）：k 0 关着，.5 侧过来看不见，1 翻到另一边、露出背面。
// (x, y) 是转轴那条边的中点，axis 是转轴在板子的哪条边（'left' | 'right' | 'top' | 'bottom'），w、h 是板子立着时的宽和高。
// 开门：axis 'left'（合页在左），k 0..~.45。往镜头这边倒下的门：axis 'bottom'，k 0..1，过了 .5 就是躺在地上露出背面。
// o.front(x0, y0, w, h) / o.back(...) 画正面、背面的细节（门板分格、门把、合页），坐标是板子立着时的样子，翻的时候自动跟着压扁、镜像。
function flap(x, y, w, h, k, col, o = {}) {
  const c = Math.cos(Math.PI * clamp(k)); if (Math.abs(c) < .03) return;
  const ax = o.axis || 'left', R = { left: [0, -h / 2], right: [-w, -h / 2], top: [-w / 2, 0], bottom: [-w / 2, -h] }[ax];
  C.save(); C.translate(x, y); if (ax === 'left' || ax === 'right') C.scale(c, 1); else C.scale(1, c);
  const front = c > 0, draw = front ? o.front : o.back;
  piece(rectP(R[0], R[1], w, h), front ? col : (o.backCol || col), { seed: o.seed ?? 730, border: o.border ?? 3.5, lift: (o.lift ?? 1) * (1 + 1.2 * Math.sin(Math.PI * clamp(k))), after: draw ? () => draw(R[0], R[1], w, h) : null });
  C.restore();
}

// ---- 环境里一直在动的东西（慢、小、各自不同步，用来让背景活着；人物别用这个晃）----
const sway = (t, amp = 1, f = .15, ph = 0) => amp * wob(t, f, ph);   // 窗帘、叶子、挂饰、灯绳
function steam(x, y, t, n = 3, s = 1, col = '#fffaf0') {             // 热气 / 炊烟
  for (let i = 0; i < n; i++) {
    const ph = frac(t * .35 + i / n), sx = x - 20 * s + i * 20 * s;
    C.save(); C.globalAlpha = .55 * Math.sin(ph * Math.PI);
    curve([[sx, y - ph * 60 * s], [sx + 10 * s * Math.sin(ph * 6 + i), y - (30 + ph * 70) * s], [sx - 6 * s, y - (60 + ph * 80) * s], [sx + 8 * s, y - (90 + ph * 90) * s]], 5 * s, col);
    C.restore();
  }
}
// 飘落的纸片（花瓣、雪、叶子）：box = [x, y, w, h]，每片自己的速度和翻转
function drift(t, n, box, col = '#f2c9c4', seed = 1, size = 10, shape = 'petal') {
  const [bx, by, bw, bh] = box;
  for (let i = 0; i < n; i++) {
    const sp = .06 + .06 * hash(i + seed), ph = frac(hash(i * 7 + seed) + t * sp);
    const x = bx + bw * hash(i * 3 + seed) + 40 * Math.sin(t * .8 + i), y = by + bh * ph;
    C.save(); C.translate(x, y); C.rotate(t * (1 + hash(i)) + i); C.scale(1, .4 + .6 * Math.abs(Math.sin(t * 1.7 + i)));
    const r = size * (.7 + .6 * hash(i + 11));
    piece(shape === 'snow' ? ellP(0, 0, r * .6, r * .6, 12) : [[0, -r], [r * .55, 0], [0, r * .9], [-r * .55, 0]], col, { seed: 680 + (i % 7), border: 1.2, lift: .4, grain: .3 });
    C.restore();
  }
}

// ---- 一次性的身体小动作：返回要叠加到 puppet 参数上的增量，用 add() 叠上去 ----
//   puppet(K, x, y, s, { t, ...add(P, hop(t, 2.1), nod(t, 3.0)) })
function add(P, ...ds) { const o = { ...P }; for (const d of ds) for (const k in d) o[k] = (typeof o[k] === 'number' ? o[k] : 0) + d[k]; return o; }
function hop(t, t0, h = 40) {            // 原地蹦一下：先蹲、弹起、落地压一下
  const k = seg(t, t0, t0 + .5); if (k <= 0 || k >= 1) return {};
  if (k < .22) { const a = Math.sin(Math.PI * k / .22); return { squash: -.12 * a, dy: 6 * a }; }
  const u = (k - .22) / .78, air = Math.sin(Math.PI * Math.min(1, u / .8));
  return { dy: -h * air, squash: u < .8 ? .06 * air : -.1 * Math.sin(Math.PI * (u - .8) / .2) };
}
function hopTo(t, t0, t1, x0, x1, n = 2, h = 26) {   // 蹦蹦跳跳挪过去（开心时用，不是走路循环）
  const k = seg(t, t0, t1), e = ease(k), ph = frac(k * n), air = k > 0 && k < 1 ? Math.sin(Math.PI * ph) : 0;
  return { x: lerp(x0, x1, e), dy: -h * air, squash: k > 0 && k < 1 ? .05 * air - .06 * Math.max(0, 1 - ph * 6) : 0 };
}
const nod = (t, t0, n = 2, amp = .1) => { const k = seg(t, t0, t0 + .3 * n); return k <= 0 || k >= 1 ? {} : { tilt: amp * Math.sin(Math.PI * n * k), dy: 3 * Math.abs(Math.sin(Math.PI * n * k)) }; };
const headShake = (t, t0, n = 3, amp = .35) => { const k = seg(t, t0, t0 + .22 * n); return k <= 0 || k >= 1 ? {} : { turn: amp * Math.sin(TAU * n / 2 * k) * (1 - k) }; };
const shiver = (t, t0, t1, amp = .025) => t < t0 || t > t1 ? {} : { lean: amp * Math.sin(t * 70) * Math.min(1, (t - t0) * 6, (t1 - t) * 6), squash: -.04 };
function stomp(t, t0, side = 'R') {      // 跺脚：抬腿、踩下去、身子一震
  const k = seg(t, t0, t0 + .4); if (k <= 0 || k >= 1) return {};
  const up = Math.sin(Math.PI * Math.min(1, k / .5)), hit = k > .5 ? Math.sin(Math.PI * (k - .5) / .5) : 0;
  return { ['kick' + side]: (side === 'R' ? -1 : 1) * .5 * up * (k < .5 ? 1 : 1 - (k - .5) * 2), squash: -.08 * hit, dy: 4 * hit };
}
