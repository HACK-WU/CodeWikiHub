/**
 * 把图集视图的独立 SVG 渲染成 README 用的 PNG（默认 2x），并按内容包围盒裁掉多余留白。
 *
 * 为什么需要裁剪：视图 SVG 的 viewBox 是排版画布（1190×762），内容只占其中一块，
 * 顶部可能空出 170px；README 里直接贴会显得上方大片空白。
 * 裁剪只改交付用的位图，不动 `.atlas/views/*.svg`（图集查看器需要完整画布）。
 *
 * 用法：node .atlas/tools/render-readme-png.mjs <in.svg> <out.png> [scale] [padding]
 * 依赖：playwright（本机在 /root/pw/node_modules）+ 系统 Chrome（/usr/bin/google-chrome）
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('/root/pw/node_modules/');
const { chromium } = require('playwright');

const [input, output, scaleArg, padArg] = process.argv.slice(2);
if (!input || !output) {
  console.error('用法：node render-readme-png.mjs <in.svg> <out.png> [scale=2] [padding=24]');
  process.exit(2);
}
const scale = Number(scaleArg || 2);
const pad = Number(padArg || 24);

const svg = fs.readFileSync(path.resolve(input), 'utf8');
const m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
if (!m) throw new Error('SVG 缺少 viewBox');
const [W, H] = [Number(m[1]), Number(m[2])];

const SYSTEM_CHROME = '/usr/bin/google-chrome';
const browser = await chromium.launch(
  fs.existsSync(SYSTEM_CHROME) ? { executablePath: SYSTEM_CHROME } : {},
);
const page = await browser.newPage({
  viewport: { width: Math.ceil(W), height: Math.ceil(H) },
  deviceScaleFactor: scale,
});
await page.setContent(
  `<!doctype html><html><head><meta charset="utf-8">
   <style>html,body{margin:0;padding:0;background:#f4f5f7}svg{display:block}</style>
   </head><body>${svg}</body></html>`,
  { waitUntil: 'load' },
);
// 字体就绪后再量/截图，避免回退字体改变文本宽度导致包围盒偏差
await page.evaluate(() => document.fonts.ready);

const cropped = await page.evaluate(({ pad }) => {
  const svg = document.querySelector('svg');
  const vb = svg.viewBox.baseVal;
  const els = [
    ...svg.querySelectorAll('[data-node-id], [data-edge-id], [data-legend], [data-graph-role]'),
    ...[...svg.children].filter((el) => el.tagName.toLowerCase() === 'text'),
  ];
  if (!els.length) throw new Error('未找到内容元素');
  const boxes = els.map((el) => el.getBBox()).filter((b) => b.width || b.height);
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  // 加内边距后夹回画布：底色与网格只覆盖画布范围，越界会露出透明条
  const x = Math.max(vb.x, Math.floor(minX - pad));
  const y = Math.max(vb.y, Math.floor(minY - pad));
  const right = Math.min(vb.x + vb.width, Math.ceil(maxX + pad));
  const bottom = Math.min(vb.y + vb.height, Math.ceil(maxY + pad));
  const width = right - x;
  const height = bottom - y;

  svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;

  return { x, y, width, height, contentBBox: { minX, minY, maxX, maxY } };
}, { pad });

await page.setViewportSize({ width: cropped.width, height: cropped.height });
await page.waitForTimeout(150);
await page.screenshot({
  path: path.resolve(output),
  clip: { x: 0, y: 0, width: cropped.width, height: cropped.height },
});
await browser.close();

console.log(JSON.stringify({
  out: path.resolve(output),
  srcCanvas: [W, H],
  crop: { viewBox: [cropped.x, cropped.y, cropped.width, cropped.height], content: cropped.contentBBox },
  css: [cropped.width, cropped.height],
  scale,
  px: [cropped.width * scale, cropped.height * scale],
  kb: Math.round(fs.statSync(output).size / 1024),
}, null, 1));