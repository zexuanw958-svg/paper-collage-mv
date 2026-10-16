// s1_room.js: A1 开场顶视东南西北（0–2.2）；A2+B 黄昏小屋（2.2–12.4）
(() => {
  // ---------- A1: top-down insert ----------
  const FT1 = [960, 500], R1 = 300;
  SC.open = (t, lt, dur) => {
    // camera: gentle drift, then push into the closed fortune teller's centre (match cut to the room)
    camK(t, [[0, 960, 520, 1.0], [1.85, 960, 508, 1.04], [2.2, FT1[0], FT1[1], 3.0]]);
    layer(.4);
    wash(-200, -200, W + 400, H + 400, [[0, '#f4e6d2'], [1, '#ead2bd']], { seed: 11, stains: 8, stainA: .12, stainCol: '#d9b79a', radial: [960, 480, 1200] });
    // gingham-ish tablecloth stripes, printed into the paper
    C.save(); C.globalAlpha = .07; C.fillStyle = '#c96f6f'; for (let i = -6; i < 20; i++) { C.fillRect(-200 + i * 140, -200, 46, H + 400); C.fillRect(-200, -200 + i * 140, W + 400, 46); } C.restore();
    layer(1);
    glow(FT1[0], FT1[1], 760, '#ffe8c2', .35);
    // the kid's hands come in from the bottom and hold two corners
    const breathe = 4 * Math.sin(t * 2.2);
    const op = k0 => easeOut(seg(t, k0, k0 + .32)) * (1 - ease(seg(t, 1.3 + (k0 - .1) * .5, 1.62 + (k0 - .1) * .5)));
    const open = [op(.1), op(.17), op(.24), op(.31)];
    const look = kf(t, [[0, 0], [.62, 0], [.82, -.9], [1.02, -.9], [1.18, .9], [1.5, .9]]);
    fortune(FT1[0], FT1[1] + breathe * .3, R1, {
      open, rot: kf(t, [[0, -.035], [2.2, 0]]),
      inner: R => {
        // inside: her eyes, up close and unreadable
        C.save(); C.fillStyle = '#f4d2bb'; C.fillRect(-R, -R, 2 * R, 2 * R);
        kid('girl', 0, 188 * 4.3 + 22, 4.3, { t, F: face(t, [[0, { ...EXPR.neutral, look: [look, 0], brow: .05, browAsym: 1, blush: .55 }]], 2) });
        C.restore();
      }
    });
    // sleeves + hands
    for (const s of [-1, 1]) {
      const hx = FT1[0] + s * (R1 + 18), hy = FT1[1] + 150 + breathe;
      C.save(); C.translate(hx, hy); C.rotate(s * -.18); piece(rrP(-48, 20, 96, 420, 20), KIDS.boy.coat, { seed: 701 + s, border: 5, lift: 1.3 }); piece(rrP(-50, 20, 100, 40, 8), KIDS.boy.coatDk, { seed: 703 + s, noBorder: true, lift: 0, grain: .4 }); C.restore();
      hand(hx, hy, 4.4, 5 + s);
    }
    lyricLine(t, 0, { exit: 3.0 });
    post(t, { tone: '#f6c89a', toneA: .25 });
  };

  // ---------- A2 + B: the room at dusk ----------
  const BOY = [900, 840], S = 1.5, GIRL = [1362, 792], FTR = 85, SILL = 652;
  const WIN = [1170, 200, 470, 452];   // x, y, w, h of the window opening
  function room(t) {
    layer(.85);
    wash(-300, -300, W + 600, H + 600, [[0, '#f2dcc4'], [.65, '#e9c9b0'], [1, '#d9b39b']], { seed: 21, stains: 9, stainA: .14, stainCol: '#c99d82' });
    // shelf, books, plant, hanging lamp at upper left
    piece(rectP(150, 330, 330, 20), '#b98d64', { seed: 30, lift: 1 });
    const books = [['#c86d64', 32, 96], ['#7d9f90', 26, 84], ['#e2c27a', 30, 104], ['#8a7aa6', 22, 78]];
    let bx = 180; books.forEach(([c, w, h], i) => { piece(rectP(bx, 330 - h, w, h), c, { seed: 31 + i, border: 3, lift: .8 }); bx += w + 6; });
    piece([[360, 330], [404, 330], [412, 270], [352, 270]], '#d79a73', { seed: 36, border: 3, lift: .9 });
    for (let i = 0; i < 5; i++) leaf(382, 272, 46 + 10 * hash(i), -Math.PI / 2 + (i - 2) * .45 + .04 * wob(t, .2, i), i);
    line([[300, -40], [300, 120]], 3, '#8a6f5c');
    piece([[250, 120], [350, 120], [330, 80], [270, 80]], '#efd9a8', { seed: 37, border: 3, lift: .8 });
    glow(300, 128, 260, '#ffd796', .55);
    // lower wall
    piece([[-300, 770], [W + 300, 770], [W + 300, H + 300], [-300, H + 300]], '#cfa58a', { seed: 38, border: 4, lift: .8, stains: [[2, 500, 900, 900, 400, '#b9876c', .15]] });
  }
  function windowView(t, girlFn) {
    const [x, y, w, h] = WIN;
    layer(.92);
    // dusk sky through the window
    C.save(); C.beginPath(); C.rect(x - 6, y - 6, w + 12, h + 12); C.clip();
    wash(x - 40, y - 40, w + 80, h + 80, [[0, '#b7a1cc'], [.5, '#eeaa97'], [1, '#f7d39a']], { seed: 23, stains: 5, stainA: .16 });
    sun(x + w * .62, y + h * .78, 46, t, { a: .8 });
    cloud(x + 60 + 12 * wob(t, .05), y + 120, 220, 70, 3, '#f6dcd0');
    cloud(x + 300 - 10 * wob(t, .04), y + 210, 190, 56, 5, '#f3cfc4');
    // far rooftops
    for (let i = 0; i < 5; i++) { const rx = x - 20 + i * 110, rh = 90 + 60 * hash(i + 2); piece([[rx, y + h + 20], [rx, y + h - rh + 30], [rx + 50, y + h - rh], [rx + 100, y + h - rh + 30], [rx + 100, y + h + 20]], mixCol('#8b6f93', '#c99aa6', hash(i)), { seed: 40 + i, border: 3, lift: .6 }); }
    C.restore();
    // window frame
    layer(.95);
    piece(rectP(x - 30, y - 30, w + 60, 30), '#f0e3c9', { seed: 46, lift: 1 });
    piece(rectP(x - 30, y - 30, 30, h + 40), '#f0e3c9', { seed: 47, lift: 1 });
    piece(rectP(x + w, y - 30, 30, h + 40), '#f0e3c9', { seed: 48, lift: 1 });
    // curtains
    const sw = 6 * wob(t, .15);
    piece([[x - 50, y - 50], [x + 70, y - 50], [x + 40 + sw, y + 200], [x + 80 + sw, y + 380], [x - 50, y + 400]], '#f2dc9c', { seed: 49, lift: 1.2, after: () => { for (let k = 0; k < 3; k++) line([[x - 20 + k * 28, y - 40], [x - 10 + k * 26 + sw * .6, y + 380]], 2, '#e2c682', 'round', .7); } });
    piece([[x + w + 50, y - 50], [x + w - 70, y - 50], [x + w - 40 - sw, y + 200], [x + w - 80 - sw, y + 380], [x + w + 50, y + 400]], '#f2dc9c', { seed: 50, lift: 1.2, after: () => { for (let k = 0; k < 3; k++) line([[x + w + 20 - k * 28, y - 40], [x + w + 10 - k * 26 - sw * .6, y + 380]], 2, '#e2c682', 'round', .7); } });
    layer(1);
    if (girlFn) { C.save(); C.beginPath(); C.rect(x - 400, -400, w + 800, SILL + 400 + 2); C.clip(); girlFn(); C.restore(); }
    piece(rectP(x - 50, SILL, w + 100, 28), '#efe1c6', { seed: 51, lift: 1.3 });
    // warm light falling into the room
    rays(x + w * .6, y + h * .7, Math.PI * .93, .5, 7, 1500, '#ffd9a6', .12, t, 4);
  }
  function table(t) {
    layer(1);
    piece(rectP(470, 732, 760, 30), '#c99d70', { seed: 60, lift: 1.3, stains: [[0, 800, 745, 500, 80, '#a87b52', .2]] });
    piece(rectP(492, 760, 716, 400), '#b88b61', { seed: 61, lift: 1, after: () => { line([[500, 800], [1200, 800]], 3, '#a57a52', 'round', .6); } });
  }
  function bowl(t, push) {
    const x = 1088 + push, y = 734;
    // steam curls
    for (let i = 0; i < 3; i++) {
      const ph = frac(t * .35 + i / 3), sx = x - 20 + i * 20;
      C.save(); C.globalAlpha = .55 * Math.sin(ph * Math.PI);
      curve([[sx, y - 70 - ph * 60], [sx + 10 * Math.sin(ph * 6 + i), y - 100 - ph * 70], [sx - 6, y - 130 - ph * 80], [sx + 8, y - 160 - ph * 90]], 5, '#fffaf0');
      C.restore();
    }
    piece(ellP(x, y - 46, 50, 22, 30).concat([]), '#fbf6ec', { seed: 62, border: 3, lift: .6, after: () => { for (let k = 0; k < 5; k++) { C.fillStyle = 'rgba(235,225,205,.9)'; C.beginPath(); C.arc(x - 30 + k * 15, y - 56 + (k % 2) * 6, 9, 0, TAU); C.fill(); } } });
    piece([[x - 58, y - 46], [x + 58, y - 46], [x + 46, y - 12], [x + 22, y], [x - 22, y], [x - 46, y - 12]], '#9fbcd2', { seed: 63, border: 3.5, lift: 1, after: () => { line([[x - 52, y - 30], [x + 52, y - 30]], 5, '#f4efe4', 'round', .9); for (let k = 0; k < 4; k++) { C.fillStyle = '#e48d8d'; C.beginPath(); C.arc(x - 33 + k * 22, y - 30, 3.2, 0, TAU); C.fill(); } } });
    // chopsticks resting on top
    C.save(); C.translate(x + 30, y - 66); C.rotate(-.5); piece(rrP(-4, -70, 8, 100, 3), '#b5674f', { seed: 64, border: 1.6, lift: .6 }); C.rotate(.18); piece(rrP(-4, -70, 8, 100, 3), '#b5674f', { seed: 65, border: 1.6, lift: .6 }); C.restore();
  }

  SC.room = (t, lt, dur) => {
    // ---- camera: out of the fortune teller, settle, drift right to the window, then dive into the flap ----
    const ftUp = [BOY[0], 540];
    const roseAt = [1143.5, 624.5 - FTR * .5];
    camK(t, [[2.2, ftUp[0], ftUp[1], 10.6], [3.7, 1010, 590, 1.3], [6.4, 1040, 580, 1.34], [9.3, 1070, 570, 1.38], [10.45, 1128, 578, 1.5], [12.4, roseAt[0], roseAt[1], 15]]);
    room(t);
    // ---- girl (outside the window) ----
    let girlRes = null;
    const gUp = backOut(seg(t, 6.42, 6.8), 1.4), gLean = kf(t, [[6.8, 0], [7.0, -.42], [7.18, -.42], [7.55, 0]]);
    const gArmL = kf(t, [[6.8, .1], [7.0, 1.48], [7.2, 1.48], [7.55, 2.72], [8.2, 2.72], [8.45, .3], [9.25, .3], [9.6, 1.42]]);
    const gArmR = kf(t, [[7.3, .1], [7.6, 2.72], [8.2, 2.72], [8.45, .3]]);
    const gFace = face(t, [[0, 'grin'], [7.55, { ...EXPR.grin, look: [-.5, 0] }], [8.42, 'happy'], [9.3, { ...EXPR.soft, look: [-.6, .1] }], [10.25, { ...EXPR.grin, look: [-.7, -.2] }]], 2);
    windowView(t, () => {
      if (t < 6.42) return;
      girlRes = kid('girl', GIRL[0], GIRL[1] + (1 - gUp) * 330, S, { t, F: gFace, turn: -.45, lean: gLean, aL: gArmL, aR: gArmR, armLen: t < 7.6 ? lerp(70, 92, ease(seg(t, 6.8, 7.0)) * (1 - ease(seg(t, 7.2, 7.55)))) : 70, tilt: kf(t, [[8.3, 0], [8.5, .12], [9.3, .12], [9.5, 0]]) });
    });
    if (t >= 8.4 && t < 9.4) for (let i = 0; i < 4; i++) sparkle(GIRL[0] - 120 + i * 80, GIRL[1] - 360 + (i % 2) * 70, 16, seg(t, 8.5 + i * .12, 9.1 + i * .12));
    // ---- the boy ----
    const lower = ease(seg(t, 2.85, 3.35));
    let aBoy = lerp(2.7, .2, lower);
    const snatch = seg(t, 7.0, 7.22);
    if (t > 7.05) aBoy = lerp(.2, .06, ease(seg(t, 7.05, 7.4)));
    const pushArm = t > 4.6 && t < 7.0 ? ease(seg(t, 4.6, 5.0)) * (1 - ease(seg(t, 5.7, 6.1))) : 0;
    const pointArm = ease(seg(t, 9.55, 9.85)) * (1 - ease(seg(t, 10.6, 10.9)));
    const bF = face(t, [[0, { ...EXPR.neutral, look: [0, -.4] }], [3.0, 'puzzled'], [4.62, { ...EXPR.sad, look: [.8, .35] }], [5.75, { ...EXPR.sad, look: [0, .6], eyeK: .8 }], [7.16, 'surprised'], [7.6, { ...EXPR.surprised, look: [.8, -.3] }], [8.72, 'love'], [9.4, { ...EXPR.soft, look: [.7, -.2] }], [10.3, { ...EXPR.wow, look: [.7, -.2] }]], 1);
    const boyRes = kid('boy', BOY[0], BOY[1] + 6 * ease(seg(t, 5.7, 6.1)) * (1 - ease(seg(t, 7.1, 7.4))), S, {
      t, F: bF, turn: kf(t, [[4.5, 0], [4.8, .35], [5.6, .35], [5.8, 0], [7.2, 0], [7.5, .55]]),
      aL: t < 7.05 ? aBoy : aBoy, aR: t < 7.05 ? lerp(aBoy, .55, pushArm) : lerp(aBoy, 1.55, pointArm),
      tilt: kf(t, [[5.7, 0], [6.1, -.1], [7.1, -.1], [7.25, .05], [7.5, 0]]) + .05 * spring(t, 7.16, 5, 16),
    });
    table(t);
    // ---- bowl pushed away by one finger ----
    bowl(t, 26 * ease(seg(t, 5.0, 5.5)));
    if (pushArm > .05) hand(boyRes.handR[0], Math.min(boyRes.handR[1], 726), S, 9);
    // ---- the fortune teller: in his hands → snatched → in her hands → offered ----
    const hm = mid(boyRes.handL, boyRes.handR);
    let ftPos = [hm[0], hm[1] - 18], ftOpen = 0, ftRot = 0;
    if (t < 7.0) {
      // he flips it open twice: only a question mark inside
      const o1 = easeOut(seg(t, 3.85, 4.1)) * (1 - ease(seg(t, 4.35, 4.55)));
      const o2 = t < 6.6 ? easeOut(seg(t, 5.9, 6.15)) * (1 - ease(seg(t, 6.6, 6.8))) : 0;
      ftOpen = [o1 * .9, o2 * .9, o1 * .9, o2 * .9];
    }
    if (girlRes) {
      const gh = girlRes.handL, gm = mid(girlRes.handL, girlRes.handR);
      if (t >= 7.0 && t < 7.55) ftPos = [lerp(ftPos[0], gh[0] - 40, easeIn(snatch)), lerp(ftPos[1], gh[1] + 10, easeIn(snatch))];
      if (t >= 7.22 && t < 7.55) ftPos = [gh[0] - 40, gh[1] + 10];
      if (t >= 7.55 && t < 9.3) { ftPos = [gm[0], gm[1] + 30]; ftRot = .05 * wob(t, .5); }
      if (t >= 9.3) ftPos = [gh[0] - 70, gh[1] + 14];
      if (t >= 7.0 && t < 7.55) ftRot = -1.2 * Math.sin(Math.PI * seg(t, 7.0, 7.55));
      if (t >= 7.7 && t < 8.3) { const k = seg(t, 7.7, 8.3); ftOpen = [Math.sin(k * Math.PI * 2) > 0 ? .9 * Math.sin(k * Math.PI * 2) : 0, Math.sin(k * Math.PI * 2) < 0 ? -.9 * Math.sin(k * Math.PI * 2) : 0, Math.sin(k * Math.PI * 2) > 0 ? .9 * Math.sin(k * Math.PI * 2) : 0, Math.sin(k * Math.PI * 2) < 0 ? -.9 * Math.sin(k * Math.PI * 2) : 0]; }
      if (t >= 10.15) ftOpen = [easeOut(seg(t, 10.15, 10.45)) * .98, 0, 0, 0];
    }
    if (window.DBGFT) console.warn('FT', t, ftPos[0].toFixed(1), ftPos[1].toFixed(1));
    const hidden = t >= 8.3 && t < 9.32;   // lowered below the sill while she peeks out
    if (!hidden) {
      // in front of the boy before the snatch; behind the sill-line it's fine either way
      fortune(ftPos[0], ftPos[1], FTR, { open: ftOpen, rot: ftRot, lift: 1.2,
        inner: R => {
          if (t < 7.0) { C.fillStyle = '#fbf3e4'; C.fillRect(-R, -R, 2 * R, 2 * R); mark('?', 0, 4, R * 1.1, '#b9504a', 1); }
          else { C.fillStyle = '#fdf1e4'; C.fillRect(-R, -R, 2 * R, 2 * R); flower(0, -R * .5, R * .34, 'rose', 2, .3); stem(0, -R * .3, 0, -R * .05, 3); }
        } });
      if (t < 7.0) { hand(boyRes.handL[0], boyRes.handL[1], S, 1); if (pushArm < .05) hand(boyRes.handR[0], boyRes.handR[1], S, 2); }
      else if (girlRes) { hand(girlRes.handL[0], girlRes.handL[1], S, 3); if (t >= 7.55 && t < 9.3) hand(girlRes.handR[0], girlRes.handR[1], S, 4); }
    }
    if (t >= 7.16 && t < 8) mark('!', BOY[0] + 110, BOY[1] - 380, 70, '#f3ead6', seg(t, 7.16, 7.4) * (1 - seg(t, 7.75, 7.95)), .15);
    if (t >= 3.4 && t < 4.6) mark('?', BOY[0] + 95, BOY[1] - 375, 64, '#f3ead6', seg(t, 3.4, 3.65) * (1 - seg(t, 4.35, 4.6)), .2);
    heartsUp(t, 8.85, BOY[0] + 40, BOY[1] - 360, S * .9, 3);
    // ---- lyrics ----
    lyricLine(t, 0, { exit: 3.0 });
    lyricLine(t, 1, { exit: 6.45 });
    lyricLine(t, 2, { exit: 9.6, hi: { 2: '#c9cdd6', 7: '#efc3c4' } });
    post(t, { tone: '#f2b88a', toneA: .3 });
  };
})();
