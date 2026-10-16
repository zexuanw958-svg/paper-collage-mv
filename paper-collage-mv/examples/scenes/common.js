// common.js: 场景共用小工具
const SC = {};
// camera keys [[t, x, y, zoom], ...]: x, y eased per segment; zoom eased in log space (monotone, no overshoot)
function camK(t, keys) {
  const k = kf(t, keys.map(([tt, x, y, z]) => [tt, [x, y, Math.log(z)]]));
  setCam(k[0], k[1], Math.exp(k[2]));
}
function hand(x, y, s, seed = 1) { piece(ellP(x, y, 12 * s, 12 * s, 28), SKIN, { seed: 600 + seed, border: 3, lift: .9 }); }
const mid = (a, b, k = .5) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
// little paper hearts floating up from (x, y) after t0
function heartsUp(t, t0, x, y, s = 1, n = 3) {
  for (let i = 0; i < n; i++) {
    const a = t - t0 - i * .18; if (a < 0 || a > 1.6) continue;
    const k = a / 1.6, px = x + (hash(i + 3) - .5) * 70 * s + Math.sin(a * 5 + i) * 10 * s, py = y - a * 120 * s;
    C.save(); C.globalAlpha = 1 - easeIn(k); heartPiece(px, py, (12 + 6 * hash(i)) * s * backOut(clamp(a / .25)), '#e17f86', { seed: 640 + i, border: 2.5, lift: .6 }); C.restore();
  }
}
function sparkle(x, y, r, k) { if (k <= 0 || k >= 1) return; const s = backOut(k) * (1 - k * .5); glow(x, y, r * 3 * s, '#fff2c4', .6 * (1 - k)); C.save(); C.globalAlpha = 1 - k * k; piece(starP(x, y, r * s, .3, 4, k * 1.5), '#fff6dc', { seed: 650, border: 0, noBorder: true, lift: 0, grain: 0 }); C.restore(); }
// sweat drop
function sweat(x, y, s, k) { if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 3); C.translate(x, y + easeOut(k) * 14 * s); C.scale(s, s); piece([[0, -14], [7, 2], [5, 8], [0, 10], [-5, 8], [-7, 2]], '#b9d9ea', { seed: 660, border: 2, lift: .5 }); C.restore(); }
