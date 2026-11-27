// 探测：上游视觉模型对 SVG(data:image/svg+xml) 的处理
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="40" fill="#ff0000"/><rect y="40" width="240" height="40" fill="#00ff00"/><rect y="80" width="240" height="40" fill="#0000ff"/></svg>`;
const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const Q = '这张图从上到下有三个横条，按顺序只回答三个颜色名，用逗号分隔，不要解释。';

const res = await fetch(`${llm.baseURL}/chat/completions`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${llm.apiKey}` },
  body: JSON.stringify({
    model: llm.model,
    stream: false,
    messages: [{ role: 'user', content: [{ type: 'text', text: Q }, { type: 'image_url', image_url: { url: dataUri } }] }],
  }),
  signal: AbortSignal.timeout(120_000),
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
if (!res.ok) {
  console.log(`错误体: ${text.slice(0, 600)}`);
} else {
  const j = JSON.parse(text);
  console.log(`回答: ${String(j.choices?.[0]?.message?.content ?? '').replace(/\s+/g, ' ').slice(0, 300)}`);
  console.log(`image_tokens: ${j.usage?.prompt_tokens_details?.image_tokens ?? '(无)'} · prompt=${j.usage?.prompt_tokens}`);
}
