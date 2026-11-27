/**
 * 验证目的：准备两个图集包
 *   - real.html    真包：project-atlas demo 的烘焙产物（252 KB，4 图）
 *   - synth.html   合成包：真包 + 6 份内联 SVG 副本（≈1.2 MB），仅用于 R-03 体积/解析压测
 * 合成包不代表真实内容，只是把「1.2 MB 级负载」喂给 iframe 测解析与首屏成本。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC_PKG = '/root/skills/demo/verify/kisearch-atlas/atlas.html';
const SRC_SVG = '/root/skills/demo/verify/kisearch-atlas/views/overview.svg';
const OUT = path.join(ROOT, 'packages');

fs.mkdirSync(OUT, { recursive: true });

const real = fs.readFileSync(SRC_PKG, 'utf8');
fs.writeFileSync(path.join(OUT, 'real.html'), real);

const svg = fs.readFileSync(SRC_SVG, 'utf8').replace(/^<\?xml[^>]*\?>/, '');
const padding = Array.from({ length: 6 }, (_, i) => `<template data-bulk="${i}">${svg}</template>`).join('\n');
const synth = real.replace('</body>', `${padding}\n</body>`);
fs.writeFileSync(path.join(OUT, 'synth.html'), synth);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log(`real.html  ${kb(real)}`);
console.log(`synth.html ${kb(synth)}`);
