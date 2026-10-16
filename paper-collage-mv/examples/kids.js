// kids.js: 两个主角，剪纸木偶。约 2.5 头身：头 ~42%，身体 ~35%，腿 ~23%。
// kid(who, x, y, s, P): (x, y) 是两脚之间的地面点，s 是缩放（s = 1 时全高约 250px）。
// 每块都是 piece()：没有描边，白纸边 + 投影 + 纸纹。动作靠纸片绕关节转：直袖子长条绕肩、头绕脖子。
const SKIN = '#f4d2bb', EYE = '#2b2130', MOUTH = '#4a2a33';
const KIDS = {
  // 阿栗：栗色乱发、斜刘海锯齿剪口，后脑翘两撮；鼠尾草绿牛角扣大衣带兜帽；脸上贴一块创可贴（笨手笨脚的证据）
  boy: { hair: '#5a3b31', coat: '#7d9f90', coatDk: '#62857a', hood: '#6b8f82', shirt: '#efe4cc', toggle: '#d8b47b', leg: '#3a3344', shoe: '#7a4c3d', brow: '#4a2f28', top: 74, bot: 104, blushCol: '#ef9f9a' },
  // 小柿：深梅色波波头、齐刘海细锯齿，砖红贝雷帽 + 黄星星发夹；灰粉 A 字外套、奶白大圆领、白袜红鞋
  girl: { hair: '#3d2a36', coat: '#d6918c', coatDk: '#bd7975', collar: '#f4ebd9', beret: '#b4504a', star: '#ecc760', leg: '#3a3344', shoe: '#a8433d', sock: '#f4ebd9', brow: '#3d2a36', top: 66, bot: 120, blushCol: '#f09a9c' },
};
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
// Acted expression changes. keys: [[t, name | {..}], ...]. Numbers blend over .28 s; the face swap (eyes, mouth) happens
// under a quick blink, so nothing snaps. Also auto-blinks every few seconds.
function face(t, keys, seed = 0, over = {}) {
  const get = k => typeof k === 'string' ? EXPR[k] : { ...EXPR.neutral, ...k };
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const cur = get(keys[i][1]), prev = i > 0 ? get(keys[i - 1][1]) : cur, ti = keys[i][0], k = ease(seg(t, ti, ti + .28));
  const out = {};
  for (const f of ['brow', 'browY', 'eyeK', 'blush', 'sparkle', 'browAsym']) out[f] = lerp(prev[f] || 0, cur[f] || 0, k);
  out.look = [lerp(prev.look[0], cur.look[0], k), lerp(prev.look[1], cur.look[1], k)];
  const sw = t < ti + .1 && i > 0; out.eye = sw ? prev.eye : cur.eye; out.mouth = sw ? prev.mouth : cur.mouth;
  let lid = i > 0 ? Math.max(0, 1 - Math.abs(t - (ti + .1)) / .1) : 0;
  // auto blink
  const per = 3.1 + 1.4 * hash(seed * 3 + 1), bt = (t + hash(seed) * per) % per; if (bt < .14) lid = Math.max(lid, 1 - Math.abs(bt - .07) / .07);
  out.lid = lid; out.tear = cur.tear || 0;
  return { ...out, ...over };
}

// ---- part shapes (head coords: head centre 0,0, rx 54, ry 51) ----
function boyHair(turn) {
  const sh = turn * 7, P = [[-57 + sh * .3, 6 + Math.max(0, turn) * 26], [-58 + sh * .3, 2]];
  for (let k = 0; k <= 24; k++) {
    const a = Math.PI * (1.04 + .92 * k / 24); let r = 59;
    // crown tufts at the back-top
    if (k === 6) r = 72; if (k === 8) r = 70;
    P.push([Math.cos(a) * r * 1.02 + sh * .3, Math.sin(a) * r * .98 - 2]);
  }
  P.push([58 + sh * .3, 2], [57 + sh * .3, 4 + Math.max(0, -turn) * 26]);
  const teeth = [[51, -2], [43, -19], [33, -12], [21, -29], [10, -9], [-6, -27], [-17, -14], [-30, -30], [-41, -11], [-50, -21], [-56, 3]];
  for (const [x, y] of teeth) P.push([x + sh, y]);
  return P;
}
function girlHairFront(turn) {
  const sh = turn * 6, P = [[-62 + sh * .2, 44], [-62 + sh * .2, 2]];
  for (let k = 0; k <= 20; k++) { const a = Math.PI * (1 + k / 20); P.push([Math.cos(a) * 61 + sh * .2, Math.sin(a) * 60 - 2]); }
  P.push([62 + sh * .2, 44], [49 + sh * .3, 46], [45 + sh * .5, 4]);
  for (let x = 40, i = 0; x >= -40; x -= 6.5, i++) P.push([x + sh, (i % 2 ? -12 : -5) + (hash(i + 4) - .5) * 3]);
  P.push([-45 + sh * .5, 4], [-49 + sh * .3, 46]);
  return P;
}

// ---- eyes / brows / mouth (drawn as small printed pieces, no outline) ----
function eyeDraw(x, y, sx, F, seed) {
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
function faceDraw(who, F, turn, K) {
  const fx = turn * 26, ex = 19.5 * (1 - .16 * Math.abs(turn)), ey = 9;
  // blush first (under everything on the face)
  for (const s of [-1, 1]) { const far = s * turn < 0; softDot(s * 31 * (1 - .1 * Math.abs(turn)) + fx * .85, 22, 13 * (far ? 1 - .25 * Math.abs(turn) : 1), 8.5, K.blushCol, clamp(.5 * F.blush, 0, .85)); }
  if (who === 'boy') {   // band-aid on the left cheek
    C.save(); C.translate(-33 + fx * .8, 16); C.rotate(-.55);
    piece(rrP(-9, -4, 18, 8, 3.5), '#e9c79c', { seed: 77, border: 1.2, lift: .25, grain: .4, rough: .3 });
    C.fillStyle = 'rgba(150,100,70,.55)'; for (const [a, b] of [[-2, -1.4], [2, -1.4], [-2, 1.4], [2, 1.4]]) { C.beginPath(); C.arc(a, b, .8, 0, TAU); C.fill(); }
    C.restore();
  }
  for (const s of [-1, 1]) {
    const far = s * turn < 0, sx = far ? 1 - .25 * Math.abs(turn) : 1, x = s * ex + fx;
    eyeDraw(x, ey, sx, F);
    // brow: inner end up for +brow (worry), down for -brow (cross)
    const by = -9 + F.browY - (F.browAsym && s > 0 ? 4 : 0), inner = by - F.brow * 4.5, outer = by + F.brow * 4.5, w = 6.2 * sx;
    const pi = [x - s * w * .9, inner], po = [x + s * w, outer];
    line([pi, po], 2.5, K.brow);
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

// ---- one sleeve + round hand, pivoting at the shoulder. ang: 0 hangs down, + swings outward / up. ----
function arm(K, sx, ang, hold, len = 70, lab) {
  C.save(); C.rotate(-sx * ang);
  piece(rrP(-11.5, -6, 23, len + 2, 7), K.coat, { seed: lab === 'L' ? 21 : 22, border: 3.2, lift: .9 });
  piece(rrP(-12, len - 12, 24, 10, 3), K.coatDk, { seed: lab === 'L' ? 23 : 24, border: 0, lift: 0, noBorder: true, grain: .4 });
  piece(ellP(0, len + 4, 12, 12, 28), SKIN, { seed: lab === 'L' ? 25 : 26, border: 3, lift: .9 });
  if (hold) { C.save(); C.translate(0, len + 4); hold(sx * ang); C.restore(); }
  const m = C.getTransform(); C.restore();
  return m.transformPoint(new DOMPoint(0, len + 4));
}

// ---- the whole kid ----
function kid(who, x, y, s, P = {}) {
  const K = KIDS[who], t = P.t ?? T, seed = who === 'boy' ? 1 : 2;
  const F = P.F || face(t, P.face || [[0, 'neutral']], seed);
  const turn = P.turn || 0, breath = Math.sin(t * TAU * .27 + seed * 2);
  const M0 = C.getTransform();
  C.save(); C.translate(x, y); C.scale(s, s); C.rotate(P.lean || 0); C.translate(0, (P.dy || 0) - (P.sit ? -46 : 0));
  const res = {};
  const bt = K.top, bb = K.bot, bodyTop = -146, bodyBot = -54;
  const shY = -133, shX = bt / 2 - 7;
  const headY = -188 + breath * 1.2;
  const aL = (P.aL ?? .1) + .02 * Math.sin(t * 1.3 + seed), aR = (P.aR ?? .1) + .02 * Math.sin(t * 1.1 + seed + 1);
  const legLen = P.sit ? 26 : 46;
  // back hair (girl) behind everything
  const headXf = () => { C.translate(0, headY); C.rotate((P.tilt || 0) + .012 * breath); };
  if (who === 'girl') { C.save(); headXf(); piece(rrP(-59 + turn * 4, -40, 118, 86, 30), K.hair, { seed: 31, border: 3.5, lift: 1 }); C.restore(); }
  // legs + shoes
  const legX = [-16, 16].map(v => v + turn * 3);
  legX.forEach((lx, i) => {
    const kick = i === 0 ? (P.kickL || 0) : (P.kickR || 0);
    C.save(); C.translate(lx, bodyBot - 4); C.rotate(kick);
    piece(rectP(-7.5, 0, 15, legLen + 4), K.leg, { seed: 40 + i, border: 3, lift: .8 });
    if (K.sock) piece(rectP(-8, legLen - 6, 16, 8), K.sock, { seed: 44 + i, border: 0, noBorder: true, lift: 0, grain: .3 });
    piece(ellP(turn * 5 + (i ? 2 : -2), legLen + 8, 16, 9.5, 30), K.shoe, { seed: 42 + i, border: 3, lift: .9 });
    C.restore();
  });
  // far arm behind the body when turned
  const drawArm = side => {
    const sx = side === 'L' ? -1 : 1, ang = side === 'L' ? aL : aR;
    C.save(); C.translate(sx * shX, shY);
    const p = arm(K, sx, ang, side === 'L' ? P.holdL : P.holdR, P.armLen || 70, side);
    C.restore();
    { const q = M0.inverse().transformPoint(p); res['hand' + side] = [q.x, q.y]; }
  };
  const farSide = turn > .35 ? 'L' : turn < -.35 ? 'R' : null;
  if (farSide) drawArm(farSide);
  // hood (boy)
  if (who === 'boy') piece(ellP(0, -146, 50, 21, 40), K.hood, { seed: 51, border: 3.5, lift: .8 });
  // body
  C.save(); C.translate(0, bodyBot); C.scale(1, 1 + .01 * breath); C.translate(0, -bodyBot);
  const body = [[-bt / 2 + 9, bodyTop], [bt / 2 - 9, bodyTop], [bt / 2, bodyTop + 10], [bb / 2, bodyBot], [-bb / 2, bodyBot], [-bt / 2, bodyTop + 10]];
  piece(body, K.coat, { seed: who === 'boy' ? 52 : 53, border: 4, lift: 1.1 });
  // coat details: centre seam, buttons / toggles, collar, pockets
  line([[1 + turn * 6, bodyTop + 10], [1.5 + turn * 7, bodyBot - 3]], 2.2, K.coatDk, 'round', .9);
  if (who === 'boy') {
    piece([[-12, bodyTop - 2], [0, bodyTop + 14], [-2, bodyTop - 2]], K.shirt, { seed: 54, border: 1.5, lift: .4, grain: .3 });
    piece([[12, bodyTop - 2], [2, bodyTop - 2], [0, bodyTop + 14]], K.shirt, { seed: 55, border: 1.5, lift: .4, grain: .3 });
    for (let k = 0; k < 3; k++) {
      const ty = bodyTop + 30 + k * 22, tx = 1.5 + turn * 6.5;
      line([[tx - 9, ty], [tx + 9, ty]], 1.3, '#4b5f57', 'round', .7);
      piece(rrP(tx - 7.5, ty - 3.2, 15, 6.4, 3.2), K.toggle, { seed: 56 + k, border: 1.4, lift: .45, grain: .45, rough: .3 });
    }
    for (const sx of [-1, 1]) piece(rrP(sx * 28 - 11 + turn * 4, bodyBot - 32, 22, 6, 2), K.coatDk, { seed: 60 + sx, noBorder: true, border: 0, lift: 0, grain: .3 });
  } else {
    for (const sx of [-1, 1]) piece(ellP(sx * 15 + turn * 4, bodyTop + 3, 18, 12.5, 30, sx * .25), K.collar, { seed: 62 + sx, border: 2, lift: .55, grain: .45 });
    if (!SIL) for (let k = 0; k < 2; k++) { C.fillStyle = K.collar; C.beginPath(); C.arc(-6 + turn * 6.5, bodyTop + 36 + k * 22, 3.6, 0, TAU); C.fill(); C.fillStyle = 'rgba(150,100,100,.35)'; C.beginPath(); C.arc(-6 + turn * 6.5 + .8, bodyTop + 37 + k * 22, 1.2, 0, TAU); C.fill(); }
    for (const sx of [-1, 1]) piece(rrP(sx * 32 - 10 + turn * 4, bodyBot - 30, 20, 16, 4), K.coatDk, { seed: 64 + sx, noBorder: true, border: 0, lift: 0, grain: .3 });
  }
  if (P.chest) P.chest(bodyTop, bodyBot);
  C.restore();
  // near arms
  for (const sd of ['L', 'R']) if (sd !== farSide && !(P.armFront && P.armFront === sd)) drawArm(sd);
  // head
  C.save(); headXf();
  piece(ellP(0, 0, 54, 51.5, 64), SKIN, { seed: who === 'boy' ? 70 : 71, border: 4.2, lift: 1.2 });
  if (!SIL) faceDraw(who, F, turn, K);
  if (who === 'boy') piece(boyHair(turn), K.hair, { seed: 72, border: 4, lift: .9 });
  else {
    piece(girlHairFront(turn), K.hair, { seed: 73, border: 4, lift: .9 });
    C.save(); C.translate(-38 + turn * 5, -14); C.rotate(.3); piece(starP(0, 0, 9, .48), K.star, { seed: 74, border: 2, lift: .6 }); C.restore();
    C.save(); C.translate(14 - turn * 4, -33); C.rotate(.22 + turn * .05);
    piece(rrP(-2.5, -27, 6, 11, 3), K.beret, { seed: 75, border: 2, lift: .6 });
    piece([...ellP(0, -6, 42, 15, 48)].map(([px, py]) => [px, py < -6 ? py * 1.25 + 1.5 : py]), K.beret, { seed: 76, border: 3.5, lift: 1, after: () => { line([[-40, 4], [40, 4]], 4, darker(K.beret, .2), 'round', .6); } });
    C.restore();
  }
  if (P.headExtra) P.headExtra();
  { const q = M0.inverse().transformPoint(C.getTransform().transformPoint(new DOMPoint(0, 0))); res.head = [q.x, q.y]; }
  C.restore();
  if (P.armFront) drawArm(P.armFront);   // an arm crossing in front of the face
  C.restore();
  return res;
}
// soft contact shadow on the ground under a kid
function groundShadow(x, y, s, a = .22) { C.save(); C.globalCompositeOperation = 'multiply'; softDot(x + 6 * s, y + 6 * s, 70 * s, 12 * s, '#4a3550', a); C.restore(); }
