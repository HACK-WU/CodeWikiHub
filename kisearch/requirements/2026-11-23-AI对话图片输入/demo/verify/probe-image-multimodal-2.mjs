// 补充验证：① tool 消息里的图片模型能否读到（不只是不报错）② 大图 image_tokens 与耗时
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const cfgText = fs.readFileSync(path.join(os.homedir(), '.ki', 'config.yaml'), 'utf8');
const llm = {};
let inLlm = false;
for (const line of cfgText.split('\n')) {
  if (/^llm:\s*$/.test(line)) { inLlm = true; continue; }
  if (inLlm && /^\S/.test(line)) inLlm = false;
  if (!inLlm) continue;
  const m = line.match(/^\s+(\w+):\s*(.+?)\s*$/);
  if (m) llm[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

/** 生成 W×H 的 PNG：按 rows 返回每行的 RGB 填充函数 */
function makePng(W, H, rowColor, opts = {}) {
  const noise = opts.noise ?? 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let y = 0; y < H; y += 1) {
    const rowStart = y * (1 + W * 3);
    raw[rowStart] = 0;
    const base = rowColor(y, H);
    for (let x = 0; x < W; x += 1) {
      const p = rowStart + 1 + x * 3;
      const n = noise ? Math.round((rnd() - 0.5) * noise) : 0;
      raw[p] = Math.max(0, Math.min(255, base[0] + n));
      raw[p + 1] = Math.max(0, Math.min(255, base[1] + n));
      raw[p + 2] = Math.max(0, Math.min(255, base[2] + n));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const TINY = makePng(240, 120, (y) => (y < 40 ? [255, 0, 0] : y < 80 ? [0, 255, 0] : [0, 0, 255]));
const uri = (b) => `data:image/png;base64,${b.toString('base64')}`;

async function call(label, messages, extra = {}) {
  const t0 = Date.now();
  const res = await fetch(`${llm.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${llm.apiKey}` },
    body: JSON.stringify({ model: llm.model, messages, stream: false, ...extra }),
    signal: AbortSignal.timeout(240_000),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  if (!res.ok) {
    console.log(`[${label}] HTTP ${res.status} (${ms}ms) ✗\n  ${text.slice(0, 400)}\n`);
    return { ok: false };
  }
  const json = JSON.parse(text);
  const msg = json.choices?.[0]?.message ?? {};
  const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
  const it = json.usage?.prompt_tokens_details?.image_tokens;
  console.log(`[${label}] 200 (${ms}ms) image_tokens=${it ?? '-'} prompt=${json.usage?.prompt_tokens}`);
  console.log(`  回答: ${(content ?? '').replace(/\s+/g, ' ').slice(0, 240)}\n`);
  return { ok: true, content, imageTokens: it, ms };
}

// ① tool 消息里放图，模型能否读到（明确询问工具返回的图片内容）
console.log('── ① tool 消息承载图片，是否真被读到 ──');
const r1 = await call('tool-with-image', [
  { role: 'user', content: '调用 get_band_colors 并如实汇报你从工具结果里看到的颜色（只回答颜色名，逗号分隔）。' },
  { role: 'assistant', content: null, tool_calls: [{ id: 'call_x1', type: 'function', function: { name: 'get_band_colors', arguments: '{}' } }] },
  {
    role: 'tool',
    tool_call_id: 'call_x1',
    content: [
      { type: 'text', text: '{"ok":true,"image_attached":true,"colors":null}' },
      { type: 'image_url', image_url: { url: uri(TINY) } },
    ],
  },
], { tools: [{ type: 'function', function: { name: 'get_band_colors', description: '返回色带信息', parameters: { type: 'object', properties: {} } } }] });

console.log('── ② 大图 image_tokens / 耗时（预算口径依据）──');
for (const [w, h, noise] of [[512, 512, 0], [1024, 1024, 0], [1024, 1024, 60], [1568, 1568, 60]]) {
  const img = makePng(w, h, (y, H2) => (y < H2 / 3 ? [255, 0, 0] : y < (2 * H2) / 3 ? [0, 255, 0] : [0, 0, 255]), { noise });
  const kb = (img.length / 1024).toFixed(0);
  const r = await call(`${w}x${h} noise=${noise} ${kb}KB`, [
    { role: 'user', content: [{ type: 'text', text: '只回答三个色块的顺序颜色名，逗号分隔。' }, { type: 'image_url', image_url: { url: uri(img) } }] },
  ]);
  void r;
}

// ③ 一次消息带 2 张图（张数累加口径）
console.log('── ③ 单条消息 2 张图 ──');
const r3 = await call('two-images', [
  { role: 'user', content: [
    { type: 'text', text: '只说收到。' },
    { type: 'image_url', image_url: { url: uri(TINY) } },
    { type: 'image_url', image_url: { url: uri(TINY) } },
  ] },
]);
void r3;

console.log('tool 图读取结果:', /红/.test(r1?.content ?? '') && /绿/.test(r1?.content ?? '') && /蓝/.test(r1?.content ?? '') ? '读到（红绿蓝）' : `未确认（回答: ${(r1?.content ?? '').slice(0, 80)}）`);
