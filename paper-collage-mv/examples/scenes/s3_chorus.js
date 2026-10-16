// s3_chorus.js: 副歌一（23.3–36.6）。一整张摊开的东南西北纸，四格是四个小世界；镜头一格格走过，
// 「全世界」拉到全景，四角折起，合成东南西北。
(() => {
  const PW = 1920, PH = 1080;
  const P = { candy: [-2000, -1140], rain: [80, -1140], lamp: [80, 60], flower: [-2000, 60] };
  const centre = k => [P[k][0] + PW / 2, P[k][1] + PH / 2];
  const S = 1.7;

  // ---------- panel: candy smiles (都不特别) ----------
  const MASKS = [[330, 640, '#f7e0b0', -.15], [600, 520, '#cfe3d4', -.06], [1330, 520, '#d9d0ec', .06], [1600, 640, '#f6c9c0', .15]];
  function candy(t) {
    piece(rectP(0, 0, PW, PH), '#f6d3d6', { seed: 700, border: 6, lift: 1.4, after: () => {
      wash(0, 0, PW, PH, [[0, '#f4c6cf'], [1, '#fbe5dc']], { seed: 41, stains: 6, stainA: .12 });
      // candy confetti
      for (let i = 0; i < 26; i++) { const x = hash(i * 3) * PW, y = frac(hash(i * 5) + t * .03 * (1 + hash(i))) * PH; C.save(); C.translate(x, y); C.rotate(t * (hash(i) - .5) * 2 + i); piece(rrP(-8, -4, 16, 8, 3), ['#f7e0b0', '#cfe3d4', '#d9d0ec', '#ffffff'][i % 4], { seed: 710 + i, border: 1.4, lift: .4 }); C.restore(); }
      piece([[-20, 900], [PW + 20, 880], [PW + 20, PH + 20], [-20, PH + 20]], '#eab7b9', { seed: 701, border: 4, lift: 1 });
      const flips = [26.58, 26.82, 27.02, 27.2];
      MASKS.forEach(([x, y, col, lean], i) => {
        const up = backOut(seg(t, 24.3 + i * .32, 24.62 + i * .32), 1.3), fl = seg(t, flips[i], flips[i] + .2), fall = easeIn(seg(t, flips[i] + .25, flips[i] + .65));
        if (up <= 0) return;
        const by = y + (1 - up) * 700 + fall * 760;
        C.save(); C.translate(x, by); C.rotate(lean + fall * lean * 3 + .03 * wob(t, .6, i));
        piece(rrP(-7, 60, 14, 520, 6), '#c9a27a', { seed: 720 + i, border: 2.5, lift: .8 });
        const sx = Math.cos(Math.PI * fl), front = sx > 0;
        C.scale(Math.max(.04, Math.abs(sx)), 1);
        piece(ellP(0, 0, 112, 106, 48), front ? col : '#dcd8d4', { seed: 730 + i, border: 5, lift: 1.2 });
        if (front) {
          for (const s of [-1, 1]) { curve([[s * 38 - 18, -8], [s * 38, -26], [s * 38 + 18, -8]], 7, EYE); softDot(s * 62, 26, 26, 15, '#ef8f97', .55); }
          C.fillStyle = MOUTH; C.beginPath(); C.moveTo(-40, 28); C.quadraticCurveTo(0, 36, 40, 28); C.quadraticCurveTo(30, 82, 0, 82); C.quadraticCurveTo(-30, 82, -40, 28); C.fill();
          C.fillStyle = '#e88e97'; C.beginPath(); C.ellipse(0, 66, 18, 10, 0, 0, TAU); C.fill();
          sparkle(70, -70, 22, frac(t * .8 + i * .3));
        } else { line([[-30, 10], [30, 10]], 5, '#b9b4b0'); }
        C.restore();
      });
      const gF = face(t, [[0, { ...EXPR.deadpan, look: [0, 0] }], [25.4, { ...EXPR.deadpan, look: [-.8, 0] }], [25.9, { ...EXPR.deadpan, look: [.8, 0] }], [26.5, 'deadpan'], [27.25, { ...EXPR.neutral, look: [1, -.2] }]], 2);
      kid('girl', 960, 930, S, { t, F: gF, aL: .1 + .25 * Math.sin(Math.PI * seg(t, 27.25, 27.7)), aR: .1 + .25 * Math.sin(Math.PI * seg(t, 27.25, 27.7)), turn: kf(t, [[27.2, 0], [27.45, .4]]), headExtra: () => flower(-34, -54, 13, 'daisy', 31, .4) });
    } });
  }
  // ---------- panel: rain → sun (又是晴天) ----------
  function rain(t) {
    const sunny = ease(seg(t, 29.72, 30.1));
    piece(rectP(0, 0, PW, PH), '#b9c5d1', { seed: 702, border: 6, lift: 1.4, after: () => {
      wash(0, 0, PW, PH, [[0, '#9fb0c2'], [1, '#d3dbe0']], { seed: 42, stains: 7, stainA: .16 });
      if (sunny > 0) { C.save(); C.globalAlpha = sunny; wash(0, 0, PW, PH, [[0, '#f6d58e'], [1, '#fdf0cf']], { seed: 43, stains: 5, stainA: .1 }); C.restore(); }
      piece([[-20, 900], [PW + 20, 890], [PW + 20, PH + 20], [-20, PH + 20]], mixCol('#93a3b0', '#b9cf97', sunny), { seed: 703, border: 4, lift: 1 });
      const GX = 1000, cloudY = 270, flip = seg(t, 29.68, 29.95), sy = Math.cos(Math.PI * flip);
      // rain drops (stop when it turns sunny)
      if (flip < .5) for (let i = 0; i < 26; i++) { const x = GX - 210 + hash(i) * 420, y = cloudY + 40 + frac(hash(i * 3) + t * 1.6) * 560; C.save(); C.globalAlpha = .8 * (1 - flip * 2); piece(rrP(x, y, 6, 26, 3), '#dfe9f2', { seed: 740 + i, border: 0, noBorder: true, lift: .3, grain: .2 }); C.restore(); }
      if (sunny > 0) { rays(GX, cloudY, Math.PI / 2, 3.4, 12, 1300, '#fff2c6', .35 * sunny, t, 5); motes(t, 14, [200, 100, 1500, 800], '#fff2c6', .7 * sunny, 8); }
      // the boy walks in and pats her head
      const inK = easeOut(seg(t, 28.5, 29.0)), pat = ease(seg(t, 28.95, 29.2));
      const bF = face(t, [[0, { ...EXPR.soft, look: [.8, -.2] }], [29.8, 'happy']], 1);
      const boy = kid('boy', lerp(-200, 760, inK), 930, S, { t, F: bF, turn: .5, aR: lerp(.1, 2.05, pat) + .08 * Math.sin(t * 14) * pat * (1 - seg(t, 29.7, 29.9)), dy: -Math.abs(Math.sin(inK * Math.PI * 3)) * 6 * (1 - inK) });
      const gF = face(t, [[0, { ...EXPR.sad, tear: 0 }], [28.6, { ...EXPR.sad, look: [-.6, -.2] }], [29.78, 'happy']], 2);
      const tearK = t < 29.7 ? frac((t - 27.6) * .7) : 0;
      kid('girl', GX, 930, S, { t, F: { ...gF, tear: t < 29.7 ? tearK + .001 : 0 }, turn: -.2, tilt: lerp(-.06, .04, sunny), aL: lerp(.12, .5, sunny), aR: lerp(.12, .5, sunny), headExtra: () => flower(-34, -54, 13, 'daisy', 31, .4) });
      // the little rain cloud flips over: its back is the sun
      C.save(); C.translate(GX, cloudY + 8 * wob(t, .4)); C.scale(1, Math.max(.04, Math.abs(sy)));
      if (sy > 0) { cloud(0, 40, 340, 120, 9, '#8e9cab', { bumps: 4 }); }
      else { glow(0, 0, 420, '#ffe9a8', .8); piece(ellP(0, 0, 110, 110, 48), '#f3c75e', { seed: 750, border: 5, lift: 1, after: () => { for (const s of [-1, 1]) curve([[s * 34 - 12, -6], [s * 34, -18], [s * 34 + 12, -6]], 6, '#8a5a2e'); curve([[-26, 26], [0, 44], [26, 26]], 6, '#8a5a2e'); softDot(-62, 22, 18, 11, '#ef9a7a', .6); softDot(62, 22, 18, 11, '#ef9a7a', .6); } }); }
      C.restore();
    } });
  }
  // ---------- panel: two lamps, shadows far apart → hug → shadows meet in a heart ----------
  function lamp(t) {
    const hug = ease(seg(t, 32.2, 32.55)), meet = ease(seg(t, 32.35, 33.1));
    piece(rectP(0, 0, PW, PH), '#9d93bd', { seed: 704, border: 6, lift: 1.4, after: () => {
      wash(0, 0, PW, PH, [[0, '#7f75a6'], [1, '#b4a6c8']], { seed: 44, stains: 7, stainA: .16 });
      // wall shadows (shadow puppets): each lamp throws one kid's shadow far to the other side
      const shX = [lerp(330, 840, meet), lerp(1590, 1080, meet)];
      C.save(); C.filter = 'blur(5px)'; C.globalAlpha = .38; SIL = '#3a2f55';
      kid('girl', shX[0], 760, 1.95, { t, turn: .3, aR: lerp(.1, 1.5, hug), lean: .12 * hug, headExtra: () => flower(-34, -54, 13, 'daisy', 31, .4) });
      kid('boy', shX[1], 760, 1.95, { t, turn: -.3 });
      SIL = null; C.restore();
      if (meet > .5) { C.save(); C.globalAlpha = ease(seg(t, 32.8, 33.2)); glow(960, 330, 300, '#ffd2dc', .7); heartPiece(960, 330, 70 * backOut(seg(t, 32.85, 33.25)), '#e27f88', { seed: 760, border: 5 }); C.restore(); }
      piece([[-20, 900], [PW + 20, 900], [PW + 20, PH + 20], [-20, PH + 20]], '#6d6390', { seed: 705, border: 4, lift: 1 });
      // floor lamps
      for (const [x, s] of [[230, 1], [1690, -1]]) {
        piece(rectP(x - 6, 500, 12, 410), '#4d4466', { seed: 770 + s, border: 2.5, lift: .8 });
        piece(ellP(x, 905, 50, 12, 24), '#4d4466', { seed: 772 + s, border: 2.5, lift: .8 });
        glow(x, 470, 420, '#ffd99a', .75);
        piece([[x - 70, 500], [x + 70, 500], [x + 46, 400], [x - 46, 400]], '#f3dca2', { seed: 774 + s, border: 3.5, lift: 1 });
      }
      const gF = face(t, [[0, { ...EXPR.neutral, look: [.7, 0] }], [31.4, { ...EXPR.shy, look: [.9, .1] }], [32.25, 'closed']], 2);
      const bF = face(t, [[0, { ...EXPR.neutral, look: [-.7, 0] }], [31.6, { ...EXPR.shy, look: [-.9, .1] }], [32.3, 'surprised'], [32.75, 'love']], 1);
      kid('boy', 1045, 930, S, { t, F: bF, turn: -.25, aL: .08, aR: .1 });
      kid('girl', lerp(885, 925, hug), 930, S, { t, F: gF, turn: .3, aR: lerp(.1, 1.45, hug), lean: .1 * hug, tilt: .12 * hug, headExtra: () => flower(-34, -54, 13, 'daisy', 31, .4) });
      if (t > 32.6) heartsUp(t, 32.6, 970, 520, 1.3, 3);
    } });
  }
  // ---------- panel: the flower street, remembered ----------
  function flowerPanel(t) {
    piece(rectP(0, 0, PW, PH), '#f7dcb8', { seed: 706, border: 6, lift: 1.4, after: () => {
      wash(0, 0, PW, PH, [[0, '#f2c49c'], [1, '#fbead0']], { seed: 45, stains: 6, stainA: .12 });
      sun(1500, 220, 80, t, { a: .6 });
      piece([[-20, 900], [PW + 20, 890], [PW + 20, PH + 20], [-20, PH + 20]], '#dcc5a6', { seed: 707, border: 4, lift: 1 });
      kid('girl', 880, 930, S, { t, F: face(t, [[0, 'closed']], 2), turn: .3, lean: .1, tilt: .16, headExtra: () => flower(-34, -54, 13, 'daisy', 31, .4) });
      kid('boy', 1060, 930, S, { t, F: face(t, [[0, 'shy']], 1), turn: -.2, aL: 1.15, holdL: a => { C.rotate(a); bouquet('daisy', .95, 3); } });
    } });
  }

  // ---------- board + fold ----------
  const A = 2200;   // board half-size (a square), centred on the origin
  const CORNERS = [{ c: [-A, -A], col: FT_COL[0], i: 0 }, { c: [A, -A], col: FT_COL[1], i: 1 }, { c: [A, A], col: FT_COL[2], i: 2 }, { c: [-A, A], col: FT_COL[3], i: 3 }];
  function panels(t) {
    C.save(); C.translate(...P.candy); candy(t); C.restore();
    C.save(); C.translate(...P.rain); rain(t); C.restore();
    C.save(); C.translate(...P.lamp); lamp(t); C.restore();
    C.save(); C.translate(...P.flower); flowerPanel(t); C.restore();
  }
  function centreKids(t) {
    const k = ease(seg(t, 33.95, 34.45));
    if (k <= 0) return;
    C.save(); C.globalAlpha = k;
    glow(0, -120, 900, '#ffe1e6', .6 * k + .4 * Math.sin(Math.PI * seg(t, 35.1, 35.9)));
    heartPiece(0, 260, 330, '#e9a3a6', { seed: 780, border: 8, lift: 2 });
    kid('girl', -150, 470, 3.3, { t, F: face(t, [[0, 'happy'], [35.0, 'love']], 2), turn: .3, aR: .5, headExtra: () => flower(-34, -54, 13, 'daisy', 31, .4) });
    kid('boy', 150, 470, 3.3, { t, F: face(t, [[0, 'grin'], [35.0, 'love']], 1), turn: -.3, aL: .5 });
    C.restore();
    heartsUp(t, 35.2, 0, -560, 3, 3);
  }
  function foldAffine(M, n, c) {
    const d = M[0] * n[0] + M[1] * n[1], q = 1 - c;
    return [1 - q * n[0] * n[0], -q * n[0] * n[1], -q * n[0] * n[1], 1 - q * n[1] * n[1], q * d * n[0], q * d * n[1]];
  }
  function board(t) {
    // desk under the board
    const fold = CORNERS.map((_, i) => ease(seg(t, 35.0 + i * .12, 35.55 + i * .12)));
    // base board (white paper with creases)
    piece(rectP(-A, -A, 2 * A, 2 * A), '#f7f0e3', { seed: 790, border: 8, lift: 2, after: () => {
      C.save(); C.globalAlpha = .25; line([[-A, 0], [A, 0]], 6, '#c9b9a2'); line([[0, -A], [0, A]], 6, '#c9b9a2'); line([[-A, -A], [A, A]], 4, '#d9cbb6'); line([[A, -A], [-A, A]], 4, '#d9cbb6'); C.restore();
    } });
    panels(t);
    centreKids(t);
    // the four corners fold in
    CORNERS.forEach(({ c, col, i }, j) => {
      const k = fold[j]; if (k <= 0) return;
      const cs = Math.cos(Math.PI * k), n = [Math.sign(c[0]) / Math.SQRT2, Math.sign(c[1]) / Math.SQRT2];
      const M = [c[0] / 2, c[1] / 2];   // a point on the fold line
      const tri = [c, [c[0], 0], [0, c[1]]];
      const proj = p => { const d = (p[0] - M[0]) * n[0] + (p[1] - M[1]) * n[1]; return [p[0] - (1 - cs) * d * n[0], p[1] - (1 - cs) * d * n[1]]; };
      // cover the original corner (the paper has left it)
      const triP = tri.map(proj);
      C.save(); C.fillStyle = '#e9dcc8'; C.fill(pathOf(tri)); C.restore();
      if (cs > .05) {
        C.save(); C.transform(...foldAffine(M, n, cs)); C.beginPath(); C.moveTo(...tri[0]); C.lineTo(...tri[1]); C.lineTo(...tri[2]); C.closePath(); C.clip();
        piece(rectP(-A, -A, 2 * A, 2 * A), '#f7f0e3', { seed: 790, border: 0, lift: 0 }); panels(t);
        C.restore();
      } else if (cs < -.05) {
        piece(triP, col, { seed: 795 + i, border: 7, lift: 1.5 + 2 * Math.sin(Math.PI * k) });
        const G = [(triP[0][0] + triP[1][0] + triP[2][0]) / 3, (triP[0][1] + triP[1][1] + triP[2][1]) / 3];
        C.save(); C.translate(...G); C.rotate(Math.atan2(-n[1], -n[0]) - Math.PI / 2 + Math.PI / 4 * 0); C.scale(1, -cs); ftSymbol(i, 280); C.restore();
      }
    });
  }

  SC.chorus1 = (t, lt, dur) => {
    const c1 = centre('candy'), c2 = centre('rain'), c3 = centre('lamp');
    camK(t, [[23.3, c1[0], c1[1], 1.0], [24.2, c1[0], c1[1] + 40, 1.1], [27.3, c1[0], c1[1] + 60, 1.16], [27.9, c2[0], c2[1] + 60, 1.16], [30.4, c2[0], c2[1] + 70, 1.22], [30.95, c3[0], c3[1] + 70, 1.22], [33.8, c3[0], c3[1] + 80, 1.3], [34.9, 0, 0, .36], [35.75, 0, 0, .34], [36.6, 0, 0, .707]]);
    CAM.r = Math.PI / 4 * ease(seg(t, 35.75, 36.6)); LAST_CAM = CAM;
    screen(); C.fillStyle = '#d8c7b0'; C.fillRect(0, 0, W, H);
    layer(.3); wash(-3000, -3000, 6000, 6000, [[0, '#e3d3bd'], [1, '#d4bfa5']], { seed: 46, stains: 10, stainA: .12, stainSize: .3 });
    layer(1);
    board(t);
    screen();
    // the full-screen flaps from the street shot open onto the first panel
    if (lt < .6) fortune(W / 2, H / 2, 1100, { noBase: true, open: [0, 1, 2, 3].map(i => easeInOut(seg(lt, .02 + i * .06, .38 + i * .06))), lift: 2 });
    // lyrics
    lyricLine(t, 6, { exit: 27.55 });
    lyricLine(t, 7, { exit: 27.55, x: W / 2, y: 190, size: 92, hi: { 2: '#d9d4d2', 3: '#d9d4d2' } });
    lyricLine(t, 8, { exit: 30.5 });
    lyricLine(t, 9, { exit: 30.5, x: W / 2 + 330, y: 190, size: 92, bg: '#f4dc93' });
    lyricLine(t, 10, { exit: 33.75 });
    lyricLine(t, 11, { exit: 33.75, x: W / 2, y: 190, size: 92, bg: '#d9cbe6' });
    lyricLine(t, 12, { exit: 36.3, style: 'big', size: 118, y: 168, gap: 1.02, hi: { 5: '#c9343a' } });
    post(t, { tone: '#f0c7a8', toneA: .2 });
  };
  const easeInOut = ease;
})();
