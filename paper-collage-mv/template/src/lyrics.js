// lyrics.js: 歌词纸片字卡。每个字比开唱早 LEAD 秒落下（宁早勿晚），整句在 exit 时飘走。
// 时间来自 assets/lyrics_timing.json（new_project.py 生成 src/lyrics_data.js）。字卡默认画在屏幕空间（不跟镜头）。
// 自己在场景里画歌词（字长在物件上、红色大字放进画面……）时，每画出一个字就调 lyricMark(句号, 字号)，
// tools/lyricscheck.mjs 靠这个检查每个字出现得够不够早、有没有漏句。
const LEAD = .22;
const LYR = LYR_DATA;
window.__LYR_LOG = null;
function lyricMark(idx, i) { if (window.__LYR_LOG) window.__LYR_LOG.push(idx * 1000 + i); }
// 第 idx 句第 i 个字该出现的时间：句首字用 earliest 和 t 里更早的那个
function lyricAt(idx, i) { const L = LYR.lines[idx], c = L.chars[i]; return (i === 0 ? Math.min(c.t, L.earliest ?? c.t) : c.t) - LEAD; }
// 画一句。style: 'cards'（默认奶白小纸片）| 'big'（红色剪纸大字）
// o: { x, y, size, exit, hi: {字号: 底色}, align: 'center'|'left', gap, rotAmp, vertical, bg, col }
function lyricLine(t, idx, o = {}) {
  const L = LYR.lines[idx]; if (!L) return;
  const chars = L.chars, n = chars.length, s = o.size || 62, gap = s * (o.gap ?? 1.1);
  const exit = o.exit ?? 1e9;
  if (t < lyricAt(idx, 0) - .05 || t > exit + .5) return;
  const zb = ZB; screen(); ZB = 1;
  const x0 = (o.x ?? W / 2) - (o.align === 'left' ? 0 : (n - 1) * gap / 2), y0 = o.y ?? 968;
  chars.forEach((c, i) => {
    const age = t - lyricAt(idx, i); if (age < 0) return;
    const k = clamp(age / .26), seedv = hash(idx * 31 + i);
    let x = o.vertical ? (o.x ?? W / 2) : x0 + i * gap, y = o.vertical ? (o.y ?? 200) + i * gap : y0 + (seedv - .5) * s * .08;
    let rot = (seedv - .5) * (o.rotAmp ?? .12), alpha = clamp(age / .08), kk = 1;
    // 落下：从上方掉下来，旋转带一点回弹
    y -= (1 - easeOut(k)) * s * .9; rot += (1 - k) * (seedv - .5) * 1.1; kk = lerp(1.25, 1, easeOut(k));
    // 退场：错开一点点，往上飘走淡出
    const ex = t - (exit + i * .015);
    if (ex > 0) { const e = clamp(ex / .3), f = easeIn(e); y -= f * s * 1.3; x += f * s * (seedv - .5) * .8; rot += f * (seedv - .5) * 1.4; alpha *= 1 - ease(e); }
    if (alpha <= .01) return;
    if (alpha > .3) lyricMark(idx, i);
    const hi = o.hi && o.hi[i];
    if (o.style === 'big') cutText(c.c, x, y, s, hi || o.col || '#b8443f', { rot, k: kk, alpha, weight: 900 });
    else card(c.c, x, y, s, { rot, k: kk, alpha, bg: hi || o.bg || '#f3ead6', seed: idx * 17 + i, col: o.col });
  });
  ZB = zb;
}
// 某句唱完的时间（最后一个字开唱 + 0.35 秒），常拿来定 exit
const lyricEnd = idx => { const L = LYR.lines[idx]; return Math.max(L.end ?? 0, L.chars[L.chars.length - 1].t + .35); };
