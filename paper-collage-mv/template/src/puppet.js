// puppet.js: 剪纸木偶（骨架 + 表情 + 表演关键帧）。来自《只对你有感觉》第五轮定版的 kids.js。
// 骨架、比例和动作参数是统一的，长相全由 spec 决定：发型点列、配色、衣服细节、配饰都自己设计。
//
//   const MEI = { skin: '#f4d2bb', hair: '#3d2a36', coat: '#d6918c', coatDk: '#bd7975', leg: '#3a3344', shoe: '#a8433d',
//                 brow: '#3d2a36', blushCol: '#f09a9c', top: 66, bot: 120,
//                 hairFront: turn => [...点列], hairBack: turn => [...点列] | null,
//                 head: (P, turn, F) => { 帽子、发夹 }, coatDetail: (top, bot, turn) => { 领子、扣子、口袋 }, cheek: (F, turn) => {},
//                 sleeve: '#袖子色', cuff: '#袖口色', sock: '#袜子色', button: '#扣子色', seed: 1 };
//   const P = act(t, [[0, { pose: 'stand', face: 'soft' }], [2.3, { pose: 'offer', face: 'happy' }, 'back'], [3.1, { pose: 'shy', dir: -1, face: 'shy' }]]);
//   const r = puppet(MEI, 900, 820, 1.4, { t, ...P });   // r.handL / r.handR / r.head / r.neck：在调用处坐标系里的位置，递东西、挂东西用
//
// 坐标：(x, y) 是两脚之间的地面点，s = 1 时全高约 250px。头坐标系：头心 (0, 0)，半径约 54 × 51。

var ACTOR = 0;   // tools/motioncheck.mjs 靠它分辨哪些纸片是人物。自己写的人物函数，用 actor(() => { ... }) 包一下
function actor(fn) { ACTOR++; try { return fn(); } finally { ACTOR--; } }

const EYE = '#2b2130', MOUTH = '#4a2a33';
const EXPR = {
  neutral:   { brow: 0, browY: 0, eye: 'open', eyeK: 1, mouth: 'line', blush: .65, look: [0, 0], sparkle: 0 },
  soft:      { brow: .12, browY: -1, eye: 'open', eyeK: 1, mouth: 'smile', blush: .8, look: [0, 0], sparkle: 0 },
  happy:     { brow: .18, browY: -3, eye: 'arc', eyeK: 1, mouth: 'smile', blush: 1.05, look: [0, 0], sparkle: 0 },
  grin:      { brow: .15, browY: -4, eye: 'arc', eyeK: 1, mouth: 'grin', blush: 1.15, look: [0, 0], sparkle: 0 },
  surprised: { brow: .38, browY: -7, eye: 'open', eyeK: 1.18, mouth: 'o', blush: .6, look: [0, 0], sparkle: .4 },
  annoyed:   { brow: -.55, browY: 2, eye: 'half', eyeK: 1, mouth: 'pout', blush: .45, look: [0, 0], sparkle: 0 },
  deadpan:   { brow: 0, browY: 3, eye: 'half', eyeK: 1, mouth: 'line', blush: .35, look: [0, 0], sparkle: 0 },
  shy:       { brow: .35, browY: -1, eye: 'open', eyeK: .95, mouth: 'wobble', blush: 1.6, look: [.7, .45], sparkle: .3 },
  sad:       { brow: .6, browY: -1, eye: 'open', eyeK: .95, mouth: 'frown', blush: .4, look: [0, .5], sparkle: 0 },
  puzzled:   { brow: .45, browY: -2, eye: 'open', eyeK: 1, mouth: 'wobble', blush: .5, look: [.5, -.6], sparkle: 0, browAsym: 1 },
  love:      { brow: .22, browY: -4, eye: 'open', eyeK: 1.12, mouth: 'smile', blush: 1.35, look: [0, 0], sparkle: 1 },
  wow:       { brow: .4, browY: -7, eye: 'open', eyeK: 1.2, mouth: 'O', blush: 1, look: [0, 0], sparkle: 1 },
  closed:    { brow: .1, browY: 0, eye: 'closed', eyeK: 1, mouth: 'smile', blush: 1, look: [0, 0], sparkle: 0 },
};

// 表情关键帧：keys = [[t, 名字 | { ...EXPR.x, look: [x, y] }], ...]。数值在 .28 秒里过渡，换眼型、嘴型藏在一次眨眼里；另外每三四秒自动眨眼。
function face(t, keys, seed = 0, over = {}) {
  const get = k => typeof k === 'string' ? EXPR[k] : { ...EXPR.neutral, ...k };
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const cur = get(keys[i][1]), prev = i > 0 ? get(keys[i - 1][1]) : cur, ti = keys[i][0], k = ease(seg(t, ti, ti + .28));
  const out = {};
  for (const f of ['brow', 'browY', 'eyeK', 'blush', 'sparkle', 'browAsym']) out[f] = lerp(prev[f] || 0, cur[f] || 0, k);
  out.look = [lerp(prev.look[0], cur.look[0], k), lerp(prev.look[1], cur.look[1], k)];
  const sw = t < ti + .1 && i > 0; out.eye = sw ? prev.eye : cur.eye; out.mouth = sw ? prev.mouth : cur.mouth;
  let lid = i > 0 ? Math.max(0, 1 - Math.abs(t - (ti + .1)) / .1) : 0;
  const per = 3.1 + 1.4 * hash(seed * 3 + 1), bt = (t + hash(seed) * per) % per; if (bt < .14) lid = Math.max(lid, 1 - Math.abs(bt - .07) / .07);
  out.lid = lid; out.tear = cur.tear || 0;
  return { ...out, ...over };
}

// 表演关键帧：keys = [[t, { 参数: 值, ... }, 缓动?], ...]。每个参数只在写了它的关键帧之间插值，到 t 时到位；没写的参数保持。
// 缓动写在「到达」的那个关键帧上：'ease'（默认，起停都稳）、'back'（冲过一点再回来：抬手、探头、转身、跳起都用它）、
// 'out'（快出慢停：被吓一跳、缩手）、'in'（慢起快收：蓄力、往下掉）、'lin'。
// face: 名字 写在关键帧里就是表情关键帧，结果在 out.face；其他非数字参数（holdL 这类）按时间切换。
// pose: '名字' 写在关键帧里，一次摆好整个身体（重心、头、两只手、高度），比只动一只胳膊有表现力得多。
// dir: 1 朝画面右（默认），-1 朝画面左，姿势自动镜像。pose 不管朝向（turn）和位置（x），这两个自己写；关键帧里另写的参数会盖过 pose。
//   stand 站好        reach 探身伸手够     offer 递过去        point 指          peek 探出身子偷看
//   startle 吓得往后一仰    crouch 蹲下蓄力（跳之前）   cheer 两手举起欢呼   slump 泄气往下塌
//   shy 害羞缩着、两手在身前   heart 两手捧在胸口   cover 双手捂脸    sulk 背过身生闷气
const POSE_BASE = { lean: 0, tilt: 0, aL: .1, aR: .1, armLen: 70, dy: 0, squash: 0, armFront: '', armBack: '' };
const POSE = {
  stand: {},
  reach: { lean: .1, tilt: .07, aR: 1.5, armLen: 90, aL: .3 },
  offer: { lean: .05, tilt: .1, aR: 1.15, armLen: 80, aL: .15 },
  point: { aR: 1.7, armLen: 86, tilt: .05 },
  peek: { lean: .16, tilt: .2, aL: .15, aR: .45, dy: 6 },
  startle: { lean: -.15, tilt: -.12, dy: -16, aL: 1.05, aR: 1.05, squash: .06 },
  crouch: { squash: -.17, dy: 10, aL: .32, aR: .32 },
  cheer: { aL: 2.2, aR: 2.2, dy: -18, squash: .06 },
  slump: { lean: .05, tilt: .16, squash: -.09, dy: 6, aL: .02, aR: .02 },
  shy: { turn: -.25, tilt: -.16, lean: -.03, squash: -.05, aL: -.46, aR: -.46, armLen: 55 },
  heart: { tilt: .08, lean: -.04, aL: -.8, aR: -.8, armLen: 36 },
  cover: { tilt: .04, squash: -.04, aL: -2.95, aR: -2.95, armLen: 46, armFront: 'LR' },
  sulk: { turn: -.75, tilt: -.1, lean: -.05, aL: -.6, aR: -.6, armLen: 40 },
};
function poseOf(name, dir = 1) {
  const q = { ...POSE_BASE, ...(POSE[name] || {}) };
  if (dir >= 0) return q;
  return { ...q, aL: q.aR, aR: q.aL, lean: -q.lean, tilt: -q.tilt, ...(POSE[name] && 'turn' in POSE[name] ? { turn: -q.turn } : {}) };
}
const ACT_EASE = { ease, back: x => backOut(x, 1.6), out: easeOut, in: easeIn, lin: x => clamp(x) };
function act(t, keys) {
  keys = keys.map(k => { if (!k[1].pose) return k; const { pose, dir, ...rest } = k[1]; return [k[0], { ...poseOf(pose, dir), ...rest }, k[2]]; });
  const out = {}, names = new Set();
  for (const k of keys) for (const n in k[1]) names.add(n);
  for (const n of names) {
    const ks = keys.filter(k => n in k[1]);
    if (n === 'face') { out.face = ks.map(k => [k[0], k[1].face]); continue; }
    if (typeof ks[0][1][n] !== 'number') { let v = ks[0][1][n]; for (const k of ks) if (t >= k[0]) v = k[1][n]; out[n] = v; continue; }
    let v = ks[ks.length - 1][1][n];
    if (t <= ks[0][0]) v = ks[0][1][n];
    else for (let i = 1; i < ks.length; i++) if (t < ks[i][0]) { const a = ks[i - 1], b = ks[i]; v = lerp(a[1][n], b[1][n], (ACT_EASE[b[2]] || ease)((t - a[0]) / (b[0] - a[0]))); break; }
    out[n] = v;
  }
  return out;
}

// ---- 默认零件（spec 里不写就用这些）----
function bobHair(turn) {   // 波波头 + 细锯齿齐刘海
  const sh = turn * 6, P = [[-62 + sh * .2, 44], [-62 + sh * .2, 2]];
  for (let k = 0; k <= 20; k++) { const a = Math.PI * (1 + k / 20); P.push([Math.cos(a) * 61 + sh * .2, Math.sin(a) * 60 - 2]); }
  P.push([62 + sh * .2, 44], [49 + sh * .3, 46], [45 + sh * .5, 4]);
  for (let x = 40, i = 0; x >= -40; x -= 6.5, i++) P.push([x + sh, (i % 2 ? -12 : -5) + (hash(i + 4) - .5) * 3]);
  P.push([-45 + sh * .5, 4], [-49 + sh * .3, 46]);
  return P;
}
function defaultCoat(K, bodyTop, bodyBot, turn) {   // 中缝 + 三颗扣子 + 两个口袋
  line([[1 + turn * 6, bodyTop + 10], [1.5 + turn * 7, bodyBot - 3]], 2.2, K.coatDk, 'round', .9);
  if (!SIL) for (let k = 0; k < 3; k++) { C.fillStyle = K.button || '#f1e6d0'; C.beginPath(); C.arc(-6 + turn * 6.5, bodyTop + 26 + k * 20, 3.4, 0, TAU); C.fill(); }
  for (const sx of [-1, 1]) piece(rrP(sx * 30 - 10 + turn * 4, bodyBot - 30, 20, 15, 4), K.coatDk, { seed: 64 + sx, noBorder: true, border: 0, lift: 0, grain: .3 });
}

function eyeDraw(x, y, sx, F) {
  const rx = 7.6 * sx, ry = 9.8 * F.eyeK, lx = F.look[0] * 2.6, ly = F.look[1] * 2.2;
  if (F.eye === 'arc') { curve([[x - rx, y + 2], [x, y - 7], [x + rx, y + 2]], 2.8, EYE); return; }
  if (F.eye === 'closed' || F.lid > .82) { curve([[x - rx, y - 1], [x, y + 4], [x + rx, y - 1]], 2.6, EYE); return; }
  const open = 1 - F.lid;
  C.save();
  if (F.eye === 'half') { C.beginPath(); C.rect(x - 20, y - ry * .05, 40, 40); C.clip(); }
  C.fillStyle = EYE; C.beginPath(); C.ellipse(x + lx, y + ly + ry * (1 - open) * .5, rx, ry * open, 0, 0, TAU); C.fill();
  if (open > .4) {
    const hs = 1 + F.sparkle * .35;
    C.fillStyle = '#fffaf2'; C.beginPath(); C.arc(x + lx + 2.6 * sx, y + ly - 3.8, 2.7 * hs, 0, TAU); C.fill();
    C.fillStyle = 'rgba(255,250,242,.85)'; C.beginPath(); C.arc(x + lx - 3 * sx, y + ly + 4.4, 1.2 * hs, 0, TAU); C.fill();
    C.fillStyle = `rgba(236,120,140,${.55 + .3 * F.sparkle})`; C.beginPath(); C.arc(x + lx - 1.2 * sx, y + ly + 2.4, 1.7, 0, TAU); C.fill();
  }
  C.restore();
  if (F.eye === 'half') line([[x - rx - 1, y - ry * .05], [x + rx + 1, y - ry * .05 + .5]], 2.4, EYE);
}
function faceDraw(K, F, turn) {
  const fx = turn * 26, ex = 19.5 * (1 - .16 * Math.abs(turn)), ey = 9;
  for (const s of [-1, 1]) { const far = s * turn < 0; softDot(s * 31 * (1 - .1 * Math.abs(turn)) + fx * .85, 22, 13 * (far ? 1 - .25 * Math.abs(turn) : 1), 8.5, K.blushCol || '#ef9f9a', clamp(.5 * F.blush, 0, .85)); }
  if (K.cheek) K.cheek(F, turn);
  for (const s of [-1, 1]) {
    const far = s * turn < 0, sx = far ? 1 - .25 * Math.abs(turn) : 1, x = s * ex + fx;
    eyeDraw(x, ey, sx, F);
    const by = -9 + F.browY - (F.browAsym && s > 0 ? 4 : 0), inner = by - F.brow * 4.5, outer = by + F.brow * 4.5, w = 6.2 * sx;
    line([[x - s * w * .9, inner], [x + s * w, outer]], 2.5, K.brow || K.hair);
  }
  const mx = fx * 1.05, my = 30;
  switch (F.mouth) {
    case 'line': line([[mx - 4.5, my], [mx + 4.5, my + .4]], 2.3, MOUTH); break;
    case 'o': C.fillStyle = MOUTH; C.beginPath(); C.ellipse(mx, my + 1, 3.6, 4.8, 0, 0, TAU); C.fill(); break;
    case 'O': C.fillStyle = MOUTH; C.beginPath(); C.ellipse(mx, my + 2, 5.4, 7, 0, 0, TAU); C.fill(); C.fillStyle = '#d97b84'; C.beginPath(); C.ellipse(mx, my + 5.5, 3.4, 2.4, 0, 0, TAU); C.fill(); break;
    case 'smile': curve([[mx - 7, my - 1.5], [mx, my + 4.5], [mx + 7, my - 1.5]], 2.4, MOUTH); break;
    case 'grin': { C.fillStyle = MOUTH; C.beginPath(); C.moveTo(mx - 9, my - 2); C.quadraticCurveTo(mx, my - .5, mx + 9, my - 2); C.quadraticCurveTo(mx + 7, my + 10, mx, my + 10); C.quadraticCurveTo(mx - 7, my + 10, mx - 9, my - 2); C.fill(); C.fillStyle = '#e0838c'; C.beginPath(); C.ellipse(mx, my + 7, 4.4, 2.6, 0, 0, TAU); C.fill(); break; }
    case 'pout': curve([[mx - 4, my + 1.5], [mx, my - 1.5], [mx + 4, my + 1.5]], 2.3, MOUTH); break;
    case 'frown': curve([[mx - 6, my + 3], [mx, my - 2], [mx + 6, my + 3]], 2.3, MOUTH); break;
    case 'wobble': curve([[mx - 6, my + 1], [mx - 3, my - 1.2], [mx, my + 1], [mx + 3, my - 1.2], [mx + 6, my + 1]], 2.1, MOUTH); break;
  }
  if (F.tear > 0) { C.save(); C.translate(-ex + fx - 2, ey + 14 + 10 * frac(F.tear)); piece([[0, -7], [4.5, 1], [3, 5], [0, 6.5], [-3, 5], [-4.5, 1]], '#a9cde0', { seed: 5, border: 1.4, lift: .3, grain: .3, rough: .2 }); C.restore(); }
}

// 一条袖子 + 圆手，绕肩转。ang：0 垂下，1.57 平举，2.7 举过头。sleeve 换袖子颜色（毛衣、背带裙里面的衬衫）。
function puppetArm(K, sx, ang, hold, len, lab) {
  C.save(); C.rotate(-sx * ang);
  piece(rrP(-11.5, -6, 23, len + 2, 7), K.sleeve || K.coat, { seed: lab === 'L' ? 21 : 22, border: 3.2, lift: .9 });
  piece(rrP(-12, len - 12, 24, 10, 3), K.cuff || K.coatDk, { seed: lab === 'L' ? 23 : 24, border: 0, lift: 0, noBorder: true, grain: .4 });
  piece(ellP(0, len + 4, 12, 12, 28), K.skin, { seed: lab === 'L' ? 25 : 26, border: 3, lift: .9 });
  if (hold) { C.save(); C.translate(0, len + 4); hold(sx * ang); C.restore(); }
  const m = C.getTransform(); C.restore();
  return m.transformPoint(new DOMPoint(0, len + 4));
}

// 整个人。P 的动作参数（都可以用 act() 做关键帧）：
//   turn  -1..1 侧身（正值朝画面右）      lean  整个人倾斜（弧度，绕脚底）       tilt  歪头（弧度）
//   aL/aR 左右手臂角度                    armLen 手臂长度（默认 70，够东西时拉长到 90）
//   kickL/kickR 抬腿（弧度）              dy    上下位移（跳起来用负值）           squash 压扁拉长（-.15 蹲下蓄力，+.1 弹起）
//   sit   坐下                            holdL/holdR 手里拿的东西：函数，在手心坐标系里画
//   armFront 'L' | 'R' | 'LR' 这只手画在脸前面   armBack 'L' | 'R' | 'LR' 这只手画在身子后面（藏东西、背着手）   face  表情关键帧 [[t, 名字], ...]，或者直接给 F（face() 的结果）
//   chest(bodyTop, bodyBot) 身上额外画的东西（抱着的、挂着的）
// 返回 { handL, handR, head, neck }：调用处坐标系里的位置。把东西从一个人手里递到另一个人手里，就用它们插值；
// 围在脖子上的东西画在 chest 里（跟着身体走），从脖子垂到外面、或者连着两个人的部分从 neck 拉出去。
function puppet(K, x, y, s, P = {}) {
  ACTOR++;
  try {
    const t = P.t ?? T, seed = K.seed ?? (K.hair ? hashS(K.hair) * 9 | 0 : 1);
    const F = P.F || face(t, P.face || [[0, 'neutral']], seed);
    const turn = P.turn || 0, breath = Math.sin(t * TAU * .27 + seed * 2);
    const M0 = C.getTransform();
    C.save(); C.translate(x, y); C.scale(s, s); C.rotate(P.lean || 0);
    const sq = P.squash || 0; C.scale(1 - sq * .5, 1 + sq);
    C.translate(0, (P.dy || 0) - (P.sit ? -46 : 0));
    const res = {};
    const bt = K.top ?? 70, bb = K.bot ?? 110, bodyTop = -146, bodyBot = -54;
    const shY = -133, shX = bt / 2 - 7;
    const headY = -188 + breath * 1.2;
    const aL = (P.aL ?? .1) + .02 * Math.sin(t * 1.3 + seed), aR = (P.aR ?? .1) + .02 * Math.sin(t * 1.1 + seed + 1);
    const legLen = P.sit ? 26 : 46;
    const headXf = () => { C.translate(0, headY); C.rotate((P.tilt || 0) + .012 * breath); };
    if (K.hairBack) { const hb = K.hairBack(turn); if (hb) { C.save(); headXf(); piece(hb, K.hair, { seed: 31, border: 3.5, lift: 1 }); C.restore(); } }
    const legX = [-16, 16].map(v => v + turn * 3);
    legX.forEach((lx, i) => {
      C.save(); C.translate(lx, bodyBot - 4); C.rotate(i === 0 ? (P.kickL || 0) : (P.kickR || 0));
      piece(rectP(-7.5, 0, 15, legLen + 4), K.leg, { seed: 40 + i, border: 3, lift: .8 });
      if (K.sock) piece(rectP(-8, legLen - 6, 16, 8), K.sock, { seed: 44 + i, border: 0, noBorder: true, lift: 0, grain: .3 });
      piece(ellP(turn * 5 + (i ? 2 : -2), legLen + 8, 16, 9.5, 30), K.shoe, { seed: 42 + i, border: 3, lift: .9 });
      C.restore();
    });
    const drawArm = side => {
      const sx = side === 'L' ? -1 : 1, ang = side === 'L' ? aL : aR;
      C.save(); C.translate(sx * shX, shY);
      const p = puppetArm(K, sx, ang, side === 'L' ? P.holdL : P.holdR, P.armLen || 70, side);
      C.restore();
      const q = M0.inverse().transformPoint(p); res['hand' + side] = [q.x, q.y];
    };
    const farSide = turn > .35 ? 'L' : turn < -.35 ? 'R' : null;
    const front = P.armFront || '', back = P.armBack || '';
    if (farSide && !front.includes(farSide) && !back.includes(farSide)) drawArm(farSide);
    for (const sd of back) if (!front.includes(sd)) drawArm(sd);
    C.save(); C.translate(0, bodyBot); C.scale(1, 1 + .01 * breath); C.translate(0, -bodyBot);
    const body = [[-bt / 2 + 9, bodyTop], [bt / 2 - 9, bodyTop], [bt / 2, bodyTop + 10], [bb / 2, bodyBot], [-bb / 2, bodyBot], [-bt / 2, bodyTop + 10]];
    piece(body, K.coat, { seed: 52 + seed, border: 4, lift: 1.1 });
    { const q = M0.inverse().transformPoint(C.getTransform().transformPoint(new DOMPoint(0, bodyTop + 6))); res.neck = [q.x, q.y]; }
    (K.coatDetail || ((a, b, tn) => defaultCoat(K, a, b, tn)))(bodyTop, bodyBot, turn);
    if (P.chest) P.chest(bodyTop, bodyBot);
    C.restore();
    for (const sd of ['L', 'R']) if (sd !== farSide && !front.includes(sd) && !back.includes(sd)) drawArm(sd);
    C.save(); headXf();
    piece(ellP(0, 0, 54, 51.5, 64), K.skin, { seed: 70 + seed, border: 4.2, lift: 1.2 });
    if (!SIL) faceDraw(K, F, turn);
    piece((K.hairFront || bobHair)(turn), K.hair, { seed: 72 + seed, border: 4, lift: .9 });
    if (K.head) K.head(P, turn, F);
    if (P.headExtra) P.headExtra();
    { const q = M0.inverse().transformPoint(C.getTransform().transformPoint(new DOMPoint(0, 0))); res.head = [q.x, q.y]; }
    C.restore();
    for (const sd of front) drawArm(sd);
    C.restore();
    return res;
  } finally { ACTOR--; }
}
// 脚下的柔影
function groundShadow(x, y, s, a = .22) { C.save(); C.globalCompositeOperation = 'multiply'; softDot(x + 6 * s, y + 6 * s, 70 * s, 12 * s, '#4a3550', a); C.restore(); }
// 单独一只手（拿着东西伸进画面、特写里的手）
function hand(x, y, s, seed = 1, skin = '#f4d2bb') { actor(() => piece(ellP(x, y, 12 * s, 12 * s, 28), skin, { seed: 600 + seed, border: 3, lift: .9 })); }
const mid = (a, b, k = .5) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
