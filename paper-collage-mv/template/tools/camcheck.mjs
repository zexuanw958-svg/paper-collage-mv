// 运镜检查：逐帧读主镜头（camK 设的 CAM_MAIN），找「一下放大一下缩小」这类来回冲。用法：node tools/camcheck.mjs [--fps=24]
// 报告：缩放方向在 1.2 秒内反转（波浪感）、位置速度在 0.6 秒内来回反向、相邻帧缩放跳变 > 6%（没接好的硬切会这样，故意的切镜可以忽略）。
import { openPage } from './page.mjs';
const fps = +(process.argv.find(a => a.startsWith('--fps='))?.split('=')[1] || 24);
const { browser, page } = await openPage();
const cams = await page.evaluate(async fps => { const out = []; for (let f = 0; f < Math.ceil(DUR * fps); f++) { const t = f / fps; T = t; drawWorld(t); out.push(CAM_MAIN ? [t, CAM_MAIN.z, CAM_MAIN.x, CAM_MAIN.y] : [t, null]); } return out; }, fps);
await browser.close();
const issues = []; let noCam = 0;
const dirChanges = (idx, eps, win, label) => {
  let dir = 0, lastFlip = -1e9;
  for (let i = 1; i < cams.length; i++) {
    const a = cams[i - 1], b = cams[i]; if (a[1] == null || b[1] == null) { dir = 0; continue; }
    const d = b[idx] - a[idx]; if (Math.abs(d) < eps) continue; const s = Math.sign(d);
    if (dir && s !== dir) { if (b[0] - lastFlip < win) issues.push(`${b[0].toFixed(2)}s ${label}在 ${(b[0] - lastFlip).toFixed(2)}s 内来回反向`); lastFlip = b[0]; }
    dir = s;
  }
};
for (const c of cams) if (c[1] == null) noCam++;
dirChanges(1, 1e-5, 1.2, '缩放');
dirChanges(2, .05, .6, '横移');
dirChanges(3, .05, .6, '竖移');
{ let g = null; const flush = () => { if (g) issues.push(g.n > 1 ? `${g.a.toFixed(2)}–${g.b.toFixed(2)}s 连续 ${g.n} 帧缩放每帧变化超过 6%（最多 ${g.m}%）：是推进匹配一路冲进去或切镜就忽略` : `${g.a.toFixed(2)}s 缩放一帧跳了 ${g.m}%（是切镜就忽略）`); g = null; };
  for (let i = 1; i < cams.length; i++) { const a = cams[i - 1], b = cams[i]; const j = a[1] && b[1] ? Math.log(b[1] / a[1]) : 0; if (Math.abs(j) > .06) { const m = Math.round((b[1] / a[1] - 1) * 100); if (g && i - g.i <= 2) { g.b = b[0]; g.n++; g.i = i; if (Math.abs(m) > Math.abs(g.m)) g.m = m; } else { flush(); g = { a: b[0], b: b[0], n: 1, i, m }; } } }
  flush(); }
console.log(issues.length ? issues.join('\n') : '镜头没有来回冲（每段都朝一个方向走）');
{ // 看一眼：镜头是不是只钉在原地推拉
  const v = cams.filter(c => c[1] != null), xs = v.map(c => c[2]), ys = v.map(c => c[3]);
  if (v.length > 48 && Math.max(...xs) - Math.min(...xs) < 80 && Math.max(...ys) - Math.min(...ys) < 80) console.log('看一眼：镜头中心全片几乎没动，只是在原地推拉，像在一张图上缩放。让镜头在世界里走：从一个人移到另一个人、从手里的东西移到脸、顺着东西钻进下一个世界（philosophy.md「镜头是第三个演员」）');
  let flips = 0, dir = 0; for (let i = 24; i < v.length; i += 24) { const d = Math.sign(Math.log(v[i][1] / v[i - 24][1])); if (Math.abs(Math.log(v[i][1] / v[i - 24][1])) < .01) continue; if (dir && d !== dir) flips++; dir = d; }
  if (flips >= 4 && v.length / 24 / flips < 6) console.log(`看一眼：缩放方向换了 ${flips} 次，一段推近一段拉远，连起来像呼吸一样一胀一缩。推拉跟着戏走：要揭示就推，要交代处境就拉，不用每段都换`);
}
if (noCam) console.log(`另有 ${noCam} 帧没用 camK（主镜头没检查到，这些帧请用 camK）`);
