// example.js: 最小示例（换成你自己的场景文件后删掉）。
// 这段的小戏：他趴在窗边泄气。她从窗外溜过来敲玻璃，他吓一跳；她举起一只纸风车，他探身去够，她一缩手藏到背后逗他，
// 他又塌回去；她笑着蹦一下，把风车递进窗，他捧在胸口，冒出小心。
// 看写法：全身姿势（act 里的 pose）+ 一次性小动作（hop、jolt）；一前一后站（他在窗里、她在窗外离镜头更近）；
// 窗框当画框、窗台和前景花盆挡住一部分；镜头从他横移到她；道具在两人手里传。学写法，别学内容。
const SC = {};
const DEMO_A = { skin: '#f4d2bb', hair: '#4a3040', coat: '#d6918c', coatDk: '#bd7975', leg: '#3a3344', shoe: '#a8433d', brow: '#3d2a36', blushCol: '#f09a9c', top: 66, bot: 118,
  hairBack: turn => rrP(-59 + turn * 4, -40, 118, 86, 30),
  head: (P, turn) => { C.save(); C.translate(-38 + turn * 5, -14); C.rotate(.3); piece(starP(0, 0, 9, .48), '#ecc760', { seed: 74, border: 2, lift: .6 }); C.restore(); } };
const DEMO_B = { skin: '#f4d2bb', hair: '#5a3b31', coat: '#7d9f90', coatDk: '#62857a', leg: '#3a3344', shoe: '#7a4c3d', brow: '#4a2f28', blushCol: '#ef9f9a', top: 74, bot: 104,
  hairFront: turn => { const sh = turn * 7, P = []; for (let k = 0; k <= 24; k++) { const a = Math.PI * (1.04 + .92 * k / 24); P.push([Math.cos(a) * 60 + sh * .3, Math.sin(a) * 59 - 2]); }
    for (const [x, y] of [[51, -2], [40, -20], [28, -10], [14, -28], [0, -10], [-14, -27], [-28, -12], [-42, -24], [-56, 3]]) P.push([x + sh, y]); return P; } };
function pinwheel(x, y, s, spin, k = 1) {   // 纸风车：k 是弹出的缩放
  if (k <= 0) return;
  C.save(); C.translate(x, y); C.scale(s * k, s * k);
  piece(rrP(-3, -110, 6, 125, 3), '#b58a62', { seed: 120, border: 1.5, lift: .6 });   // 手握在杆子下端，风车在上面
  C.translate(0, -110); C.rotate(spin);
  ['#e58f95', '#f2c86b', '#8fb8c9', '#a8c79a'].forEach((c, i) => { C.save(); C.rotate(i * TAU / 4); piece([[0, 0], [0, -46], [30, -22]], c, { seed: 121 + i, border: 2, lift: .7 }); C.restore(); });
  piece(ellP(0, 0, 6, 6, 16), '#f6efe2', { seed: 126, border: 1.2, lift: .4 });
  C.restore();
}
SC.example = (t, lt, dur) => {
  // 镜头：先贴着窗里的他，她出现时横移过去，再慢慢退开，让窗框把两个人框在一起。每段都单调
  camK(t, [[0, 760, 520, 1.55], [1.0, 760, 520, 1.55], [2.4, 990, 560, 1.22], [6.5, 1010, 570, 1.1]]);
  layer(.3);
  wash(-500, -400, W + 1000, H + 800, [[0, '#f1d3c2'], [1, '#e7c4bb']], { seed: 3, stains: 10, stainA: .12 });
  layer(1);
  // 屋里：暖色墙、一盏灯（他所在的世界）
  piece(rectP(380, 170, 720, 540), '#f6dcae', { seed: 10, border: 0, noBorder: true, lift: 0, after: () => { glow(560, 300, 260, '#fff1c4', .7); stain(1, 700, 260, 300, 200, '#e9b98a', .2); } });
  piece(rrP(520, 170, 80, 40, 10), '#d98e6c', { seed: 11, border: 2, lift: .8 });
  // 屋里的生活痕迹：墙上一幅小画、架子和几个罐子（世界要具体，细节比大片颜色更能说明这是哪儿）
  piece(rectP(880, 250, 120, 92), '#f4ecdf', { seed: 40, border: 2.5, lift: .9, after: () => { piece(cloudP(940, 300, 70, 30, 2), '#9fbfcf', { seed: 41, border: 1.2, lift: .3 }); } });
  piece(rectP(860, 430, 190, 12), '#b98b68', { seed: 42, border: 2, lift: .8 });
  [['#8fb8c9', 880, 34, 46], ['#e8a59a', 930, 28, 60], ['#f2c86b', 980, 38, 40]].forEach(([c, x, w, h], i) => piece(rrP(x, 430 - h, w, h, 8), c, { seed: 43 + i, border: 2, lift: .8 }));
  // 他：趴在窗边泄气 → 被敲窗吓一跳 → 探身去够 → 又塌回去 → 接住、捧在胸口
  const B = act(t, [
    [0, { pose: 'slump', turn: .2, face: 'sad' }],
    [2.15, { pose: 'slump' }], [2.35, { pose: 'startle', face: 'surprised' }, 'out'],
    [2.9, { pose: 'stand', face: 'puzzled' }],
    [3.55, { pose: 'stand' }], [3.95, { pose: 'reach', face: 'wow' }, 'back'],
    [4.3, { pose: 'reach' }], [4.55, { pose: 'slump', face: 'annoyed' }, 'out'],
    [5.15, { pose: 'slump' }], [5.45, { pose: 'reach', armLen: 95, face: 'surprised' }],
    [5.7, { pose: 'reach', armLen: 95 }], [6.0, { pose: 'stand', aR: 1.05, armLen: 62, tilt: .14, face: 'love' }, 'back'],   // 举在脸边看
  ]);
  const boy = puppet(DEMO_B, 720, 800, 1.35, { t, ...add(B, { tilt: jolt(t, 2.2, .12) }) });
  // 窗：窗下的墙把他的下半身挡住，窗框、窗台、两边的窗帘（慢慢摆）
  piece([[-600, 700], [W + 600, 700], [W + 600, H + 500], [-600, H + 500]], '#ead2bf', { seed: 12, border: 3, lift: 1, stains: [[2, 200, 760, 900, 260, '#d9b9a3', .25]] });
  for (const [x, y, w, h] of [[360, 150, 760, 26], [360, 150, 26, 580], [1094, 150, 26, 580], [556, 170, 12, 530]]) piece(rectP(x, y, w, h), '#f7f0e4', { seed: 13 + x % 7, border: 2.5, lift: 1.1 });
  for (const sd of [0, 1]) { const x0 = sd ? 1040 : 385, sw = sway(t, 10, .17, sd * 1.7); piece([[x0, 170], [x0 + 80, 170], [x0 + 80 + sw, 640], [x0 + 70 + sw * 1.4, 680], [x0 + 6 + sw, 650]], '#c97f80', { seed: 20 + sd, border: 3, lift: 1 }); }
  piece(rrP(340, 700, 800, 34, 6), '#f3e6d4', { seed: 22, border: 3, lift: 1.3 });
  // 屋外：几块砖、落水管、壁灯、窗台上的花箱、从上面垂下来的藤（会轻轻摆）
  for (let i = 0; i < 9; i++) piece(rrP(150 + hash(i) * 1500 + (i % 3) * 60, 120 + hash(i + 9) * 860, 70, 26, 4), '#e3c3b0', { seed: 50 + i, noBorder: true, border: 0, lift: 0, grain: .4 });
  piece(rectP(1380, -200, 34, 1400), '#c9b7a8', { seed: 60, border: 3, lift: 1 }); for (const y of [200, 520, 840]) piece(rectP(1370, y, 54, 16), '#b3a090', { seed: 61 + y % 5, border: 2, lift: .8 });
  piece(rrP(1200, 300, 44, 60, 12), '#f2d79a', { seed: 64, border: 2.5, lift: 1 }); glow(1222, 330, 90, '#fff0c4', .45);
  piece(rrP(400, 662, 300, 44, 6), '#a86a54', { seed: 65, border: 3, lift: 1.2 });
  for (let i = 0; i < 5; i++) { const fx = 425 + i * 60, fy = 650 + sway(t, 3, .3, i); C.save(); C.translate(fx, fy); for (let k = 0; k < 5; k++) { C.save(); C.rotate(k * TAU / 5); piece(ellP(0, -11, 7, 11, 16), i % 2 ? '#ef9fa6' : '#f6d27a', { seed: 66 + i * 5 + k, border: 1.4, lift: .5 }); C.restore(); } piece(ellP(0, 0, 5, 5, 12), '#fff3dc', { seed: 95 + i, border: 1, lift: .3 }); C.restore(); }
  for (let i = 0; i < 9; i++) { const vx = 1150 + Math.sin(i * .9) * 14 + sway(t, 6, .16, i * .4) * (i / 8), vy = 140 + i * 46; C.save(); C.translate(vx, vy); C.rotate((i % 2 ? .7 : -.7) + sway(t, .08, .2, i)); piece(ellP(0, 0, 14, 24, 18), i % 2 ? '#8faa7e' : '#a6bf92', { seed: 100 + i, border: 2, lift: .8 }); C.restore(); }
  // 她：从右边溜进来（偷看的姿势，冲过一点）→ 敲两下玻璃 → 举起风车 → 一缩手藏到背后 → 笑着蹦一下 → 递进窗 → 害羞
  const A = act(t, [
    [0, { x: 2200, pose: 'peek', dir: -1, face: 'grin' }],
    [.9, { x: 2200 }], [1.6, { x: 1180 }, 'back'],
    [1.75, { pose: 'reach', dir: -1, aL: 2.35, armLen: 84 }], [1.88, { armLen: 95 }], [1.98, { armLen: 84 }], [2.08, { armLen: 95 }], [2.2, { armLen: 86 }],   // 踮着手敲两下玻璃
    [2.75, { pose: 'stand', dir: -1, face: 'happy' }], [3.05, { pose: 'offer', dir: -1, aL: 2.1, face: 'grin' }, 'back'],
    [4.2, { pose: 'offer', dir: -1, aL: 2.1 }], [4.45, { pose: 'stand', dir: -1, aL: .3, armBack: 'L', lean: .07, tilt: .08, face: 'grin' }, 'out'],   // 藏到背后
    [4.9, { pose: 'stand', dir: -1, aL: .3, armBack: 'L', lean: .07 }], [5.2, { pose: 'offer', dir: -1, aL: 2.35, armLen: 95, face: 'soft' }, 'back'],
    [5.75, { pose: 'shy', dir: -1, face: 'shy' }],
  ]);
  const girl = puppet(DEMO_A, A.x, 940, 1.6, { t, ...add(A, hop(t, 4.62, 34)) });
  if (t > 1.82 && t < 2.3) for (const tk of [1.86, 2.06]) burst(girl.handL[0] - 10, girl.handL[1], 20, seg(t, tk, tk + .25), 5, '#fff6e6');
  // 风车：2.95 秒在她手里弹出来，3.3 秒起风转起来，4.4 秒藏到她背后，5.5–5.7 秒两只手碰上、换到他手里
  const spin = 2.2 * Math.max(0, t - 3.3) ** 1.3, hidden = t > 4.38 && t < 5.05;
  const pk = ease(seg(t, 5.5, 5.7)), fp = mid(girl.handL, boy.handR, pk), ps = lerp(1.6, 1.35, pk);
  if (!hidden && t > 2.95) { pinwheel(fp[0], fp[1] + 6, ps, spin, pop(t, 2.95)); if (pk < 1) hand(girl.handL[0], girl.handL[1], 1.6, 3); if (pk > 0) hand(boy.handR[0], boy.handR[1], 1.35, 4); }
  if (t > 3.3 && t < 4.2) sparkle(fp[0] + 30, fp[1] - 130, 14, seg(t, 3.35, 3.95));
  mark('!', 720 + 120, 800 - 400, 70, '#f3ead6', seg(t, 2.3, 2.45) * (1 - seg(t, 2.95, 3.1)), -.15);
  heartsUp(t, 6.1, 720 + 40, 800 - 380, 1.1, 3);
  // 前景：窗台下的花盆，视差比主平面大，跟镜头走得快一点，挡住画面一角
  layer(1.35);
  piece([[150, 980], [370, 980], [340, 1180], [180, 1180]], '#b8674f', { seed: 30, border: 4, lift: 1.4 });
  for (let i = 0; i < 6; i++) { C.save(); C.translate(260, 980); C.rotate(-1.1 + i * .44 + sway(t, .05, .2, i)); piece(ellP(0, -120, 34, 110, 24), i % 2 ? '#8faa7e' : '#a6bf92', { seed: 31 + i, border: 3, lift: 1.2 }); C.restore(); }
  layer(1); drift(t, 6, [200, -100, 1700, 1100], '#e7b7a8', 7, 12, 'petal');   // 几片花瓣慢慢飘下来
  screen(); motes(t, 14, [0, 0, W, H], '#fff1c8', .5, 4);
  lyricLine(t, 0, { exit: lyricEnd(0) });
  post(t, { tone: '#f6c89a', toneA: .22 });
};
shots([[0, SC.example]]);
// 设定图：node render.mjs --loop=sheet --stills=0 --out=out/check/sheet
LOOPS.sheet = t => {
  setCam(W / 2, H / 2, 1);
  wash(0, 0, W, H, [[0, '#f6ead8'], [1, '#efdccb']], { seed: 5, stains: 4, stainA: .08 });
  const poses = [{ pose: 'stand', face: 'neutral' }, { pose: 'stand', turn: .6, face: 'soft' }, { pose: 'startle', face: 'surprised' }, { pose: 'shy', face: 'shy' }, { pose: 'cheer', face: 'grin' }, { pose: 'sulk', face: 'annoyed' }];
  poses.forEach((k, i) => { const x = 200 + i * 304; groundShadow(x, 900, 1.5); puppet(DEMO_A, x, 900, 1.5, { t: 0, ...act(0, [[0, k]]) }); });
  post(0, { toneA: 0 });
};
LOOPS.sheet.len = 1;

// 道具设定图：每样会进戏的道具摆一排，每个状态一个。node render.mjs --loop=props --sheet=0 --w=1920 --cols=1 --out=out/check/道具.jpg
// 不看分镜只看这张图，叫得出每样东西是什么、现在是什么状态，才算过关。这里摆了三种做法：
// 软的、围在身上的（围巾：绕脖子那圈画在 chest 里跟着身体走，垂下来那截从 neck 用 tail() 拉出来，strip() 画针织纹和流苏）；
// 绕一条边翻的（门：门框和合页不动，门板用 flap() 绕合页开、绕底边往镜头这边倒）；硬的小东西（风车，在手里时压一只手）。
// 学写法，别学内容：你的道具从你的戏里来。
function demoDoor(x, y, k, fall = 0) {   // (x, y) 是门底边中点；k 开门，fall 往镜头这边倒
  const w = 170, h = 320;
  if (!fall) piece(rectP(x - w / 2 - 16, y - h - 16, w + 32, h + 16), '#9b7a62', { seed: 750, border: 3, lift: .8 });   // 门框
  if (!fall) piece(rectP(x - w / 2, y - h, w, h), '#4a4f69', { seed: 751, border: 0, noBorder: true, lift: 0 });           // 门洞
  groundShadow(x, y, 1.5);
  const front = (x0, y0, W, H) => {   // 两格门板、门把、两片合页
    piece(rrP(x0 + 20, y0 + 20, W - 40, H * .4, 6), '#c99b74', { seed: 752, border: 1.5, lift: .4 });
    piece(rrP(x0 + 20, y0 + H * .5, W - 40, H * .42, 6), '#c99b74', { seed: 753, border: 1.5, lift: .4 });
    piece(ellP(x0 + W - 22, y0 + H * .47, 9, 9, 20), '#e6c37a', { seed: 754, border: 1.5, lift: .6 });
    for (const yy of [.14, .82]) piece(rectP(x0 - 2, y0 + H * yy, 10, 26), '#8d8173', { seed: 755, border: 1, lift: .3 });
  };
  const back = (x0, y0, W, H) => {   // 背面：同样的门板和门把，换个深一点的颜色
    piece(rrP(x0 + 20, y0 + 20, W - 40, H * .4, 6), '#b0825e', { seed: 756, border: 1.5, lift: .3 });
    piece(rrP(x0 + 20, y0 + H * .5, W - 40, H * .42, 6), '#b0825e', { seed: 757, border: 1.5, lift: .3 });
    piece(ellP(x0 + 22, y0 + H * .47, 9, 9, 20), '#e6c37a', { seed: 758, border: 1.5, lift: .6 });
  };
  if (fall) flap(x, y, w, h, fall, '#b8865f', { axis: 'bottom', front, back, backCol: '#c49a74' });
  else flap(x - w / 2, y - h / 2, w, h, k, '#b8865f', { axis: 'left', front, back, backCol: '#c49a74' });
}
LOOPS.props = t => {
  setCam(W / 2, H / 2, 1);
  wash(0, 0, W, H, [[0, '#f6ead8'], [1, '#efdccb']], { seed: 6, stains: 4, stainA: .08 });
  [[200, 0], [500, .85]].forEach(([x, wind], i) => {   // 围巾：静静垂着 / 被风吹起来
    const sc = { draw: (top) => strip([[-44, top + 2], [-20, top + 13], [20, top + 13], [44, top + 2]], 24, '#d79a55', { rib: true, seed: 760 }) };
    groundShadow(x, 960, 1.5);
    const r = puppet(DEMO_A, x, 960, 1.5, { t, ...act(0, [[0, { pose: i ? 'startle' : 'stand', face: i ? 'surprised' : 'soft' }]]), chest: sc.draw });
    strip(tail(r.neck[0] + 26, r.neck[1] + 12, 150, Math.PI / 2 - .15, t + i, wind, { windDir: -.25 }), 30, '#d79a55', { rib: true, fringe: 16, bands: [null, '#c4843f'], bandLen: 34, seed: 761 });
  });
  [[780, 0], [1010, .3], [1240, .62]].forEach(([x, k]) => demoDoor(x, 520, k));   // 门：关着 / 开一半 / 开过了露出背面
  demoDoor(1480, 520, 0, .28); demoDoor(1720, 520, 0, .62);                        // 门：往镜头这边倒到一半 / 拍在地上（离镜头近的地面压得很扁）
  pinwheel(1000, 960, 1.5, .4);                                                   // 风车：自己立着 / 拿在手里
  pinwheel(1300, 960, 1.5, 1.1); hand(1300, 950, 1.5, 7);
  post(0, { toneA: 0 });
};
LOOPS.props.len = 1;
