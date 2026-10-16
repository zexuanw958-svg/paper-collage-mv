// 打开 studio.html 的 headless Chrome 页（给 tools/*.mjs 用）。Chrome 路径和 render.mjs 一样自动找，或用 CHROME_PATH。
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
// 工具在 tools/ 下，工程目录是上一级；从别的目录调用也切过去
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (resolve(process.cwd()) !== ROOT) process.chdir(ROOT);
const CHROME = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));
export async function openPage() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0, args: ['--allow-file-access-from-files', '--use-angle=metal'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[page error]', e.message));
  await page.goto(pathToFileURL(resolve('studio.html')).href + '?render', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready === true', { timeout: 60000 });
  return { browser, page };
}
