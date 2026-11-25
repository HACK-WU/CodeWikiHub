/**
 * 从 archify 交付的 HTML 里导出独立 SVG，落到图集 views/ 目录。
 *
 * 为什么需要它：project-atlas 的图源规范要求 `views/{id}.svg`（内联字体与样式），
 * 而 archify 只提供两种形态 —— 交付 HTML 与「Viewer 自带的 SVG 导出」。官方配套
 * skill `archify-svg-export` 在本机未安装，因此这里用它等价的 UI 路径：
 * 打开 HTML → 导出菜单 → 「SVG · 浅色」→ 捕获浏览器下载。
 *
 * 用法：
 *   node .atlas/tools/export-svg.mjs <交付HTML> <输出SVG>
 * 依赖：playwright（本机在 /root/pw/node_modules，浏览器只装了 chromium headless shell）
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire('/root/pw/node_modules/');
const { chromium } = require('playwright');

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('用法：node export-svg.mjs <交付HTML> <输出SVG>');
  process.exit(2);
}

// 本机 playwright 自带浏览器版本（1254）未下载，但有系统 Chrome；与 archify 的 browser-check 用同一个。
const SYSTEM_CHROME = '/usr/bin/google-chrome';
const fs = await import('node:fs');
const browser = await chromium.launch(
  fs.existsSync(SYSTEM_CHROME) ? { executablePath: SYSTEM_CHROME } : {},
);
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
await page.goto('file://' + path.resolve(input));

await page.waitForSelector('.diagram-container svg [data-node-id]', { timeout: 20000 });

// 导出菜单是运行期构建的，按可见文案定位「SVG · 浅色」。
await page.getByRole('button', { name: /导出/ }).first().click();
const item = page.getByRole('menuitem', { name: /SVG · 浅色/ }).first();
await item.waitFor({ state: 'visible', timeout: 10000 });

const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  item.click(),
]);
await download.saveAs(path.resolve(output));

const nodes = await page.$$eval('.diagram-container svg [data-node-id]', (els) =>
  els.map((el) => el.getAttribute('data-node-id')));
console.log(JSON.stringify({ svg: path.resolve(output), nodeCount: nodes.length, nodes }, null, 1));

await browser.close();
