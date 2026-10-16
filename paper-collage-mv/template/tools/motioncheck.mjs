// 动感检查：逐帧追踪每块纸片「自己」的位移（镜头推拉、视差带来的移动不算），找出画面像 PPT 的地方。
// 它是烟雾报警器，不是评分：报哪里死了，就回到那段的戏里加一件事。密度跟着歌走，慢歌本来就该比定版稀。
// 用法：node tools/motioncheck.mjs [--from=秒] [--to=秒]
// 人物：puppet() 画的纸片，或者自己用 actor(() => ...) 包起来画的；都没有时按肤色认。
// 拍点：人物身上有一块纸片开始明显动起来（屏幕上 > 40px/s），算一个拍点；动作之间停了 1/6 秒以上才算下一个。
// 对照：《只对你有感觉》第五轮定版（Claude 做的）每秒唱约 3.1 个字，人物拍点 6.1 次/10 秒，最长一动不动 2.2 秒。
// 这组数不打印成参考值：第 9、10 轮一慢一快两首歌，两个模型都对齐到了 6–7，没在听歌。
// 疏密也不设报警线：第 11 轮报警线就是 6.1，两个模型都压到 6.0 就停了。现在每次都列出动作最满、最空的段落让人回看，改完也还在，没有可以「过关」的数。
// 分段表里列每段唱了几个字，只供参考：副歌常常拖长音，字少，情绪却最满。
// 亮部：画面里接近纸白的地方（天光、窗、奶白纸、辉光）占多少。全片或某几段几乎没有时提醒一句，不打印数（联调第 13 轮做工最好的那支灰扑扑的，几乎没有亮部）。
// 表情：每段每个人依次换过的表情，旁边写这段的歌词，每次都列，不设线（定版每次换表情都有一件事引起它；第 11 轮有一支一个人一秒一换）。
import { openPage } from './page.mjs';
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const { browser, page } = await openPage();
const res = await page.evaluate(async (from, to) => {
  const oPiece = window.piece, oLayer = window.layer, oScreen = window.screen, oPuppet = window.puppet;
  const CW = C.canvas.width, CH = C.canvas.height;
  if (oPuppet) window.puppet = function (K, x, y, s, P = {}) { if (rec && rec.body) rec.body.push([x, y, s, P.turn || 0, P.lean || 0, P.tilt || 0, P.dy || 0, P.squash || 0, Math.abs(P.kickL || 0) + Math.abs(P.kickR || 0), P.sit ? 1 : 0, faceNow(P)]); return oPuppet.apply(this, arguments); };
  const faceNow = P => { const k = P.face, tt = P.t ?? T; if (!Array.isArray(k) || !k.length) return P.F ? '自定' : 'neutral'; let i = 0; while (i + 1 < k.length && tt >= k[i + 1][0]) i++; return typeof k[i][1] === 'string' ? k[i][1] : '自定'; };
  let L = new DOMMatrix(), rec = null;
  window.layer = function () { const r = oLayer.apply(this, arguments); L = C.getTransform(); return r; };
  window.screen = function () { const r = oScreen.apply(this, arguments); L = new DOMMatrix(); return r; };
  const isSkin = c => { if (typeof c !== 'string' || c[0] !== '#' || c.length !== 7) return false; const n = parseInt(c.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return r > 225 && g > 175 && g < 222 && b > 150 && b < 205 && r - b > 35 && r - b < 75; };
  let tagged = 0;
  window.piece = function (pts, col, o = {}) {
    if (rec && pts && pts.length > 2) {
      const M = C.getTransform(), W2 = L.inverse().multiply(M);
      let cx = 0, cy = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const q of pts) { cx += q[0]; cy += q[1]; if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
      cx /= pts.length; cy /= pts.length;
      const w = W2.transformPoint(new DOMPoint(cx, cy)), act = (window.ACTOR || 0) > 0;
      if (act && (o.alpha ?? 1) * C.globalAlpha < .9) rec.ghost = 1;   // 人物纸片画成半透明（淡入淡出）
      if (act) { tagged++; const sc = M.transformPoint(new DOMPoint(cx, cy)), r = Math.max(x1 - x0, y1 - y0) * Math.hypot(M.a, M.b) / 2; const b = rec.box; b[0] = Math.min(b[0], sc.x - r); b[1] = Math.max(b[1], sc.x + r); b[2] = Math.min(b[2], sc.y - r); b[3] = Math.max(b[3], sc.y + r); }
      if (L.isIdentity && Math.max(x1 - x0, y1 - y0) * Math.hypot(M.a, M.b) > CW * .5) rec.mask = 1;   // 屏幕空间的大纸（转场遮罩）
      const key = `${o.seed ?? 1}|${col}|${pts.length}`, n = (rec.cnt[key] = (rec.cnt[key] || 0) + 1);
      rec.items[key + '#' + n] = [w.x, w.y, Math.atan2(W2.b, W2.a), Math.max(x1 - x0, y1 - y0) * Math.hypot(M.a, M.b), Math.hypot(L.a, L.b), L.isIdentity ? 1 : 0, act ? 1 : isSkin(col) ? 2 : 0];
    }
    return oPiece.apply(this, arguments);
  };
  let lastBox = null, lastBody = null, lastDetail = 0, lastMask = 0, lastGhost = 0, lastHi = 0;
  // 画面细节：缩到 192×108 后相邻像素的亮度差（底部歌词区不算）。整屏只剩一块平涂的颜色时会掉得很低
  const SW = 192, SH = 108, sc = document.createElement('canvas'); sc.width = SW; sc.height = SH;
  const sx = sc.getContext('2d', { willReadFrequently: true }); sx.imageSmoothingQuality = 'high';
  const detail = () => {
    sx.drawImage(C.canvas, 0, 0, SW, SH); const d = sx.getImageData(0, 0, SW, SH).data, lum = i => d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
    let g = 0, n = 0, hi = 0; for (let y = 0; y < SH * .82; y++) for (let x = 0; x + 1 < SW; x++) { const i = (y * SW + x) * 4, l = lum(i); g += Math.abs(lum(i + 4) - l) + Math.abs(lum(i + SW * 4) - l); if (l > 217) hi++; n++; }
    lastHi = hi / n;
    return g / n;
  };
  const snap = (t, first) => { rec = { cnt: {}, items: {}, box: [1e9, -1e9, 1e9, -1e9], body: first ? [] : null, mask: 0, ghost: 0 }; T = t; drawWorld(t); const r = rec; rec = null; if (first) { lastBox = r.box[1] > r.box[0] ? [Math.max(0, r.box[0]) / CW, Math.min(CW, r.box[1]) / CW, Math.max(0, r.box[2]) / CH, Math.min(CH, r.box[3]) / CH] : null; lastBody = r.body; lastDetail = detail(); lastMask = r.mask; lastGhost = r.ghost; } return r.items; };
  const dt = 1 / 24, step = 1 / 12, out = [], end = Math.min(to ?? DUR, DUR) - dt;
  for (let t = from ?? 0; t < end; t += step) {
    const a = snap(t, true), c = snap(t + dt, false);
    let n = 0, actorN = [0, 0], actorMove = [0, 0], big = 0, appear = 0;   // [puppet/actor 画的, 按肤色认的]
    for (const k in c) {
      const B = c[k]; if (B[5] || B[3] < 25) continue;   // 屏幕空间（歌词、转场遮罩）和很小的碎片不算
      n++; if (B[6]) actorN[B[6] - 1]++;
      const A = a[k]; if (!A) { if (B[3] > 60) appear++; continue; }
      const sp = Math.hypot(B[0] - A[0], B[1] - A[1]) * B[4] / dt + Math.abs(B[2] - A[2]) * B[3] * .5 / dt;   // 屏幕 px/s
      if (B[6] && sp > 40) actorMove[B[6] - 1]++;
      if (sp > 150 && B[3] > 60) big++;
    }
    out.push([t, n, actorN, actorMove, big, appear, lastBox, lastBody, lastDetail, lastMask, lastGhost, lastHi]);
  }
  const shots = SHOTS.map(s => s[0]);
  return { out, shots, dur: DUR, tagged: tagged > 0, lyr: typeof LYR !== 'undefined' && LYR.lines ? LYR.lines.flatMap(l => (l.chars || []).map(c => c.t)) : [], lines: typeof LYR !== 'undefined' && LYR.lines ? LYR.lines.map(l => [l.chars && l.chars.length ? l.chars[0].t : l.start, l.line]) : [] };
}, arg('from') != null ? +arg('from') : null, arg('to') != null ? +arg('to') : null);
await browser.close();

const { out, shots, dur } = res, step = 1 / 12, lt = res.lyr || [];
const cps = (a, b) => lt.filter(t => t >= a && t < b).length / Math.max(.1, b - a);   // 这段每秒唱几个字
for (const r of out) { const k = res.tagged ? 0 : 1; r[2] = r[2][k]; r[3] = r[3][k]; }   // 有 puppet/actor 标记就只认它，没有才按肤色认
const fmt = x => x.toFixed(1);
const beatsIn = rows => { let b = 0, gap = 9; for (const r of rows) { const f = r[3] > 0; if (f && gap >= 2) b++; gap = f ? 0 : gap + 1; } return b; };
const stillSpans = rows => {   // 没有人物在动、没有大物件在动、也没有新东西进场
  const spans = []; let s = null;
  for (const r of rows) { const live = r[3] > 0 || r[4] > 0 || r[5] > 0; if (!live && s == null) s = r[0]; if (live && s != null) { spans.push([s, r[0]]); s = null; } }
  if (s != null) spans.push([s, rows[rows.length - 1][0] + step]);
  return spans;
};
const span = out.length * step, withActor = out.filter(r => r[2] > 0);
const beats = beatsIn(out), rate = beats / span * 10;
const bigFrac = out.filter(r => r[4] > 0).length / out.length;
const actorMovingFrac = withActor.length ? withActor.filter(r => r[3] > 0).length / withActor.length : 0;
const pieces = out.reduce((a, r) => a + r[1], 0) / out.length;
const tailStart = dur - 2;   // 最后 2 秒允许停住收尾
const spans = stillSpans(out).filter(([a, b]) => b - a > 3 && a < tailStart).map(([a, b]) => [a, Math.min(b, tailStart)]).filter(([a, b]) => b - a > 3);
const must = [], look = [];
for (const [a, b] of spans) must.push(`${fmt(a)}–${fmt(b)}s 有 ${fmt(b - a)} 秒画面里什么都没在动（镜头动不算），像 PPT：这里的戏断了，加一件事（谁做了什么、谁或什么东西接住）`);
const BAR = { cps: 3.1 }, songCps = lt.length / dur, band = songCps < 2.4 ? '疏' : songCps > 3.8 ? '密' : '不疏不密';   // 定版那首唱得不疏不密
// 分段
// 按镜头分段；镜头登记得少（自己在一个镜头函数里切场景）就按 5 秒一段
const t0 = out[0][0], t1 = out[out.length - 1][0] + step;
let bounds = shots.filter(s => s > t0 && s < t1);
if (bounds.length < 2) { bounds = []; for (let x = t0 + 5; x < t1 - 1; x += 5) bounds.push(x); }
bounds = [t0, ...bounds, t1];
const segRows = [], comp = [], segs = [], faces = [];
const med = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
const shotOf = rows => {   // 这段人物的大致构图：占画面多高、在左中右
  const bx = rows.map(r => r[6]).filter(Boolean); if (bx.length < rows.length * .3) return null;
  const h = med(bx.map(b => b[3] - b[2])), cx = med(bx.map(b => (b[0] + b[1]) / 2));
  return { size: h > .78 ? '特写' : h > .5 ? '近景' : h > .28 ? '中景' : '远景', pos: cx < .4 ? '偏左' : cx > .6 ? '偏右' : '居中', h };
};
const pairUp = body => {   // 两个人一样大、脚在同一条线上、挨着站：并排
  if (!body || body.length < 2) return false;
  for (let i = 0; i < body.length; i++) for (let j = i + 1; j < body.length; j++) {
    const a = body[i], b = body[j], s = (a[2] + b[2]) / 2;
    if (Math.abs(a[2] / b[2] - 1) < .15 && Math.abs(a[1] - b[1]) < 30 * s && Math.abs(a[0] - b[0]) < 420 * s) return true;
  }
  return false;
};
const ZH = { neutral: '平静', soft: '温柔', happy: '开心', grin: '大笑', surprised: '吃惊', annoyed: '不耐烦', deadpan: '无语', shy: '害羞', sad: '难过', puzzled: '困惑', love: '心动', wow: '惊喜', closed: '眯眼笑' };
const faceSeq = rows => {   // 这段里每个人依次换过的表情（按画的先后认人）
  const n = Math.max(0, ...rows.map(r => r[7] ? r[7].length : 0)), seqs = [];
  for (let j = 0; j < n; j++) { const q = []; for (const r of rows) { const f = r[7] && r[7][j] ? r[7][j][10] : null; if (f && q[q.length - 1] !== f) q.push(f); } if (q.length) seqs.push(q.map(f => ZH[f] || f)); }
  return seqs;
};
const BODY = [['位移', 0, 40], ['转身', 3, .35], ['前倾后仰', 4, .1], ['歪头', 5, .12], ['起落', 6, 14], ['蹲跳', 7, .08], ['抬腿', 8, .25], ['坐下', 9, .5]];   // 看得出来的幅度才算
const bodyOf = rows => {   // 这段人物除了胳膊还动了哪些
  const used = new Set(), n = Math.max(0, ...rows.map(r => r[7] ? r[7].length : 0)); if (!n) return null;
  for (let i = 0; i < n; i++) for (const [name, k, th] of BODY) { const v = rows.map(r => r[7] && r[7][i] ? r[7][i][k] : null).filter(x => x != null); if (v.length && Math.max(...v) - Math.min(...v) > th) used.add(name); }
  return [...used];
};
for (let i = 0; i + 1 < bounds.length; i++) {
  const rows = out.filter(r => r[0] >= bounds[i] && r[0] < bounds[i + 1]); if (rows.length < 6) continue;
  const len = rows.length * step, wa = rows.filter(r => r[2] > 0), b = beatsIn(rows);
  const cont = wa.length > 24 ? wa.filter(r => r[3] > 0).length / wa.length : 0;
  const sh = shotOf(rows), bd = bodyOf(rows), duo = rows.filter(r => r[7] && r[7].length >= 2), side = duo.length > rows.length * .3 && duo.filter(r => pairUp(r[7])).length > duo.length * .6;
  comp.push([bounds[i], bounds[i + 1], sh, side]); const sing = cps(bounds[i], bounds[i + 1]); if (wa.length) segs.push([bounds[i], bounds[i + 1], b / len * 10, sing]); faces.push([bounds[i], bounds[i + 1], faceSeq(rows)]);
  segRows.push(`  ${fmt(bounds[i]).padStart(5)}–${fmt(bounds[i + 1]).padEnd(5)}${lt.length ? ` 唱 ${fmt(sing).padStart(3)} 字/秒 ` : ' '}拍点 ${fmt(b / len * 10).padStart(4)}/10s  人物在动 ${String(Math.round((wa.length ? wa.filter(r => r[3] > 0).length / wa.length : 0) * 100)).padStart(3)}%  ${wa.length ? '' : '（这段没有人物）'}${sh ? `  构图 ${sh.size}${sh.pos}${side ? '·两人并排' : ''}` : ''}${bd ? `  身体 ${bd.length ? bd.join('、') : '只有胳膊'}` : ''}`);
  if (wa.length && bd && !bd.length) look.push(`${fmt(bounds[i])}–${fmt(bounds[i + 1])}s 人物只动了胳膊：情绪先落在身体上（往前探、往后仰、塌下去、蹦起来、转过身、凑近），见 philosophy.md「用整个身体演」`);
  if (wa.length && b / len * 10 < 2.5) look.push(`${fmt(bounds[i])}–${fmt(bounds[i + 1])}s 这段人物只有 ${b} 个拍点：静音看一遍，能不能用一串动词讲出这段发生了什么`);
  if (cont > .9) look.push(`${fmt(bounds[i])}–${fmt(bounds[i + 1])}s 人物 ${Math.round(cont * 100)}% 的时间都在动：是不是用 sin 一直晃？人物不要「跟着拍子颠」，动作要有起、有到、有停`);
}
for (let i = 0, j; i < comp.length; i = j) {   // 连着几段构图差不多
  j = i + 1; if (!comp[i][2]) continue;
  while (j < comp.length && comp[j][2] && comp[j][2].size === comp[i][2].size && comp[j][2].pos === comp[i][2].pos) j++;
  if (j - i >= 3) look.push(`${fmt(comp[i][0])}–${fmt(comp[j - 1][1])}s 连着 ${j - i} 段构图差不多（人物都是${comp[i][2].size}、${comp[i][2].pos}）：换一种看法，见 philosophy.md「构图」`);
}
{ // 转场中途画面空了：细节掉到全片中位的四成以下，又挨着切镜或有整屏的遮罩纸
  const md = med(out.map(r => r[8])), near = t => shots.some(s => Math.abs(s - t) < .7);
  let s = null; const flush = (e, rows) => { if (s == null) return; const rs = out.filter(r => r[0] >= s && r[0] < e); if (e - s >= .3 && rs.some(r => r[9] || near(r[0]))) must.push(`${fmt(s)}–${fmt(e)}s 转场中途画面几乎空了（细节只有全片平时的 ${Math.round(Math.min(...rs.map(r => r[8])) / md * 100)}%）：遮挡的纸盖住了一切，只剩平涂的颜色。转场用戏里的东西完成，前后两个画面或带你过去的那样东西要一直看得见（philosophy.md「转场」）`); s = null; };
  for (const r of out) { const low = r[8] < md * .4; if (low && s == null) s = r[0]; if (!low) flush(r[0]); }
  flush(out[out.length - 1][0] + step);
}
{ // 人物半透明：淡入淡出的人像鬼影
  let s = null; const flush = e => { if (s != null && e - s >= .12) must.push(`${fmt(s)}–${fmt(e)}s 人物是半透明的（淡入淡出）：纸片人不会半透明，看着像鬼影。转场后人物要么本来就在，要么用动作进场（从画外走进来、从门后探出头），见 philosophy.md「转场」。戏里本来就是幽灵、回忆的话可以忽略`); s = null; };
  for (const r of out) { if (r[10] && s == null) s = r[0]; if (!r[10]) flush(r[0]); }
  flush(out[out.length - 1][0] + step);
}
const withShot = comp.filter(c => c[2]);
{ const sides = comp.filter(c => c[3]).length, cen = withShot.filter(c => c[2].pos === '居中').length;
  if (comp.length >= 4 && sides >= 3 && sides >= comp.length * .4) look.push(`${comp.length} 段里有 ${sides} 段是两个人一样大、并排站在一条线上：并排留给一两个需要它的时刻，其余让两个人有前后、高低、远近，或者只拍一个人（philosophy.md「构图」）`);
  if (withShot.length >= 5 && cen >= withShot.length * .7) look.push(`${withShot.length} 段里有 ${cen} 段人物都在画面正中：试试偏到一边留白、一前一后、框中框`); } if (withShot.length >= 5 && withShot.filter(c => c[2].size === '中景' && c[2].pos === '居中').length / withShot.length > .6) look.push(`六成以上的段落都是「人物中景、站在画面正中」：大脸特写、一前一后、框中框、大世界里的小人轮着来`);
{ // 亮部：不给数，只说方向
  const hiOf = rows => rows.reduce((a, r) => a + r[11], 0) / Math.max(1, rows.length), all = hiOf(out);
  if (all < .08) look.push(`全片${all < .03 ? '几乎没有' : '很少有'}接近纸白的亮处，画面会显灰、显闷。这首歌如果是甜的、暖的，把背景提亮，给每个世界一个本来就亮的东西（天光、窗、奶白的纸、灯），亮的段落把暗角调轻；歌本身就压抑的话可以不管（philosophy.md「色调跟着这首歌走」）`);
  else { const dark = []; for (let i = 0; i + 1 < bounds.length; i++) { const rows = out.filter(r => r[0] >= bounds[i] && r[0] < bounds[i + 1]); if (rows.length >= 24 && hiOf(rows) < .01) dark.push(`${fmt(bounds[i])}–${fmt(bounds[i + 1])}s`); }
    if (dark.length) look.push(`${dark.join('、')} 几乎没有亮部：这几段是该暗吗（夜里、梦里、唱到心里发冷的那句）？不是的话，给这个世界一个亮处（philosophy.md「色调跟着这首歌走」）`); }
}
if (lt.length) console.log(`这首歌：每秒唱 ${fmt(songCps)} 个字，唱得${band}（定版那首每秒约 ${BAR.cps} 个字，不疏不密）`);
const longest = Math.max(0, ...stillSpans(out).map(([a, b]) => Math.min(b, tailStart) - a));
console.log(`本片：拍点 ${fmt(rate)}/10s，大动作帧 ${Math.round(bigFrac * 100)}%，最长静止 ${fmt(longest)}s，人物出镜时在动 ${Math.round(actorMovingFrac * 100)}%，每帧约 ${Math.round(pieces)} 块纸${res.tagged ? '' : '（没找到 puppet/actor 画的人物，按肤色认的）'}`);
console.log(must.length ? '必须修：\n  ' + must.join('\n  ') : '没有整屏死掉的地方');
if (look.length) console.log('看一眼：\n  ' + look.join('\n  '));
console.log('分段：\n' + segRows.join('\n'));
if (faces.some(f => f[2].length)) {   // 表情：每次都列，不是报警
  const words = (a, b) => (res.lines || []).filter(l => l[0] >= a - .3 && l[0] < b - .3).map(l => l[1]).join(' / ');
  console.log('表情（每段每个人依次换过的表情，对着这段唱的词看；每次都会列，不是报警）：\n' + faces.filter(f => f[2].length).map(([a, b, q]) => `  ${fmt(a)}–${fmt(b)}s${words(a, b) ? `「${words(a, b)}」` : ''}  ${q.map((x, j) => `人物${j + 1}：${x.join('→')}`).join('；')}`).join('\n') + '\n  每换一次表情，说得出是刚发生的哪件事引起的吗？这句唱的情绪，和脸上的是不是一回事？说不出原因的那次就删掉，让上一个表情拿住');
}
if (segs.length >= 3) {   // 回看：每次都列，不是报警
  const by = [...segs].sort((x, y) => y[2] - x[2]), k = segs.length >= 6 ? 2 : 1;
  const name = g => `${fmt(g[0])}–${fmt(g[1])}s（${lt.length ? `唱 ${fmt(g[3])} 字/秒，` : ''}拍点 ${fmt(g[2])}）`;
  console.log(`回看（每次都会列，改完也还在；不是报警，也没有该落到的数）：
  动作最满：${by.slice(0, k).map(name).join('、')}
  动作最空：${by.slice(-k).reverse().map(name).join('、')}
  最满的戏该在这首歌最满的地方（不一定是字最多的地方）；最空的那段，人物停住时观众在等什么。看过觉得对就留着，在回报里各写一句为什么；觉得不对就改戏，不是挪数字`);
}
