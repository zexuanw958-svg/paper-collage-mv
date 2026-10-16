// 歌词卡点检查：逐帧记录画出了哪些字（lyricLine 自动记，自己画的字要调 lyricMark），对照 lyrics_timing.json。
// 用法：node tools/lyricscheck.mjs [--fps=24]
// 报告：漏掉的字/整句；出现得比开唱晚（不允许）；早于开唱 0.6 秒以上（太早，读的人会对不上）；开唱 0.3 秒内就消失。
import { openPage } from './page.mjs';
const fps = +(process.argv.find(a => a.startsWith('--fps='))?.split('=')[1] || 24);
const { browser, page } = await openPage();
const { seen, lines, duration } = await page.evaluate(async fps => {
  const seen = {};
  for (let f = 0; f < Math.ceil(DUR * fps); f++) { const t = f / fps; window.__LYR_LOG = []; T = t; drawWorld(t); for (const k of window.__LYR_LOG) (seen[k] ||= []).push(t); }
  window.__LYR_LOG = null; return { seen, lines: LYR.lines, duration: DUR };
}, fps);
await browser.close();
const bad = [], warn = [];
lines.forEach((L, idx) => {
  const miss = [];
  L.chars.forEach((c, i) => {
    const ts = seen[idx * 1000 + i];
    if (!ts) { miss.push(c.c); return; }
    const first = Math.min(...ts), visibleAt = ts.some(x => Math.abs(x - (c.t + .25)) < 1.5 / fps);
    if (first > c.t + .02) bad.push(`第${idx + 1}句「${L.line}」的「${c.c}」晚了 ${(first - c.t).toFixed(2)}s（开唱 ${c.t}）`);
    else if (first < c.t - .6 && i > 0) warn.push(`第${idx + 1}句的「${c.c}」早了 ${(c.t - first).toFixed(2)}s`);
    if (!visibleAt && c.t + .25 < duration) warn.push(`第${idx + 1}句的「${c.c}」开唱后 0.25s 已经不在画面上`);
  });
  if (miss.length === L.chars.length) bad.push(`第${idx + 1}句「${L.line}」整句没上屏`);
  else if (miss.length) bad.push(`第${idx + 1}句「${L.line}」漏了：${miss.join('')}`);
});
console.log(bad.length ? '必须修：\n  ' + bad.join('\n  ') : '每个字都按时上屏了');
if (warn.length) console.log('看一眼：\n  ' + warn.slice(0, 30).join('\n  ') + (warn.length > 30 ? `\n  …还有 ${warn.length - 30} 条` : ''));
console.log(`每句一帧（每句最后一个字开唱后 0.3 秒，看画面是不是在演这一句）：\n  node render.mjs --sheet=${lines.map(L => Math.min((L.chars.length ? L.chars[L.chars.length - 1].t : L.start) + .3, duration - .05).toFixed(2)).join(',')} --cols=4 --w=480 --out=out/check/每句一帧.jpg`);
