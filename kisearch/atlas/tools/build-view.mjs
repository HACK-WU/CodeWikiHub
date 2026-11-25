/**
 * 一条命令跑完单张视图的构建链：archify finalize → 回拷交付 HTML → 导出 SVG。
 *
 * 为什么不在图集目录里直接 finalize：本机 archify 的 receipt 原子发布在 `/tmp` 之外的
 * 目录一律报 `finalize/receipt-publication … finalize-receipt-hardlinked (links=2)`
 * （同一候选在 /tmp 下四闸全绿），所以构建在 /tmp 暂存，成功后再回拷。
 *
 * 用法：node .atlas/tools/build-view.mjs <viewId>
 *   输入：.atlas/views/<viewId>.archify.json
 *   产物：.atlas/build/<viewId>.html、.atlas/views/<viewId>.svg
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ARCHIFY = '/root/.codebuddy/skills/archify/bin/archify.mjs';
const REPO = '/root/knowledge-indexer';
// 每个视图独立 stage：同一输出路径被复用会让 archify 的 browser-check 判定
// ownership-artifact-mismatch（旧 HTML 的交付回执仍绑在该路径上）。
const STAGE_ROOT = '/tmp/atlas-build';

const viewId = process.argv[2];
if (!viewId) {
  console.error('用法：node .atlas/tools/build-view.mjs <viewId>');
  process.exit(2);
}

const src = path.join(REPO, `.atlas/views/${viewId}.archify.json`);
if (!fs.existsSync(src)) {
  console.error(`缺少图源：${src}`);
  process.exit(2);
}
const candidate = JSON.parse(fs.readFileSync(src, 'utf8'));
const type = candidate.diagram_type;

const STAGE = path.join(STAGE_ROOT, viewId);
fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
const stagedJson = path.join(STAGE, `${viewId}.archify.json`);
const stagedHtml = path.join(STAGE, `${viewId}.html`);
fs.copyFileSync(src, stagedJson);

let raw;
try {
  raw = execFileSync(process.execPath, [
    ARCHIFY, 'finalize', type, stagedJson, stagedHtml,
    '--repo-root', REPO, '--quality', 'showcase', '--json',
  ], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  raw = String(e.stdout || '');
  if (!raw) {
    console.error('finalize 未产出 JSON：', e.message);
    console.error(String(e.stderr || '').slice(0, 2000));
    process.exit(1);
  }
}

const receipt = JSON.parse(raw.trim().split('\n').pop());
console.log(`[${viewId}] ok=${receipt.ok} gates=${JSON.stringify(receipt.gates)}`);
if (!receipt.ok) {
  console.log(JSON.stringify(receipt.diagnostics, null, 1).slice(0, 4000));
  process.exit(1);
}

fs.mkdirSync(path.join(REPO, '.atlas/build'), { recursive: true });
fs.copyFileSync(stagedHtml, path.join(REPO, `.atlas/build/${viewId}.html`));
console.log(`[${viewId}] HTML ${(receipt.artifact.bytes / 1024).toFixed(0)} KB → .atlas/build/${viewId}.html`);

execFileSync(process.execPath, [
  path.join(REPO, '.atlas/tools/export-svg.mjs'),
  path.join(REPO, `.atlas/build/${viewId}.html`),
  path.join(REPO, `.atlas/views/${viewId}.svg`),
], { cwd: REPO, encoding: 'utf8', stdio: 'inherit' });
