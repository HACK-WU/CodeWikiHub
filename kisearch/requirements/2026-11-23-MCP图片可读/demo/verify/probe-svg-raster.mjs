// 验证：SVG → PNG 栅格化可行性（中文渲染 + 上游可读）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Resvg } = require('@resvg/resvg-js');

const SVG = '/root/.ki-data/consul/consul/assets/assets/learning-path-overview.svg';
const svgText = fs.readFileSync(SVG, 'utf8');
console.log(`源 SVG: ${(Buffer.byteLength(svgText) / 1024).toFixed(0)}KB`);

// ── 栅格化：限制最大边长 1568 ──
const t0 = Date.now();
const resvg = new Resvg(svgText, {
  fitTo: { mode: 'width', value: 1568 },
  font: { loadSystemFonts: true, fontDirs: ['/usr/share/fonts', '/usr/share/fonts/opentype/noto'] },
  background: 'white',
});
const png = resvg.render().asPng();
const ms = Date.now() - t0;
console.log(`栅格化: ${ms}ms · ${(png.length / 1024).toFixed(0)}KB`);

// 读 PNG 头拿实际尺寸
const w = png.readUInt32BE(16);
const h = png.readUInt32BE(20);
console.log(`输出尺寸: ${w}×${h}`);

// ── 发给上游，验证中文是否渲染出来 ──
const cfg = fs.readFileSync(path.join(os.homedir(), '.ki', 'config.yaml'), 'utf8');
const llm = {};
let inLlm = false;
for (const line of cfg.split('\n')) {
  if (/^llm:\s*$/.test(line)) { inLlm = true; continue; }
  if (inLlm && /^\S/.test(line)) inLlm = false;
  if (!inLlm) continue;
  const m = line.match(/^\s+(\w+):\s*(.+?)\s*$/);
  if (m) llm[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

const res = await fetch(`${llm.baseURL}/chat/completions`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${llm.apiKey}` },
  body: JSON.stringify({
    model: llm.model,
    stream: false,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: '这张图讲的是什么？请列出你能读到的「阶段」名称，并说说图里有哪些课。只根据图里能看到的内容回答。' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}` } },
      ],
    }],
  }),
  signal: AbortSignal.timeout(180_000),
});
const t1 = await res.text();
if (!res.ok) {
  console.log(`上游 HTTP ${res.status}: ${t1.slice(0, 400)}`);
} else {
  const j = JSON.parse(t1);
  console.log(`\n上游: image_tokens=${j.usage?.prompt_tokens_details?.image_tokens ?? '-'} prompt=${j.usage?.prompt_tokens}`);
  console.log(`\n模型回答:\n${String(j.choices?.[0]?.message?.content ?? '').slice(0, 900)}`);
}
fs.writeFileSync('/root/knowledge-indexer/temp/raster-probe.png', png);
