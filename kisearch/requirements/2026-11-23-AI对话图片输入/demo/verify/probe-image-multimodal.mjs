// Q3 验证：上游是否支持「图片作为 content part」以及「tool 消息后追加带图的 user 消息」
// 用法: node temp/probe-image-multimodal.mjs
// 只读探测，不改产品代码；apiKey 从 ~/.ki/config.yaml 读取，不硬编码。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

// ── 1. 读配置 ───────────────────────────────────────────
const cfgText = fs.readFileSync(path.join(os.homedir(), '.ki', 'config.yaml'), 'utf8');
const llm = {};
let inLlm = false;
for (const line of cfgText.split('\n')) {
  if (/^llm:\s*$/.test(line)) { inLlm = true; continue; }
  if (inLlm && /^\S/.test(line)) { inLlm = false; }
  if (!inLlm) continue;
  const m = line.match(/^\s+(\w+):\s*(.+?)\s*$/);
  if (m) llm[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
if (!llm.baseURL || !llm.model || !llm.apiKey) {
  console.error('配置缺失: 需要 llm.baseURL / model / apiKey');
  process.exit(1);
}
console.log(`上游: ${llm.baseURL} · 模型: ${llm.model}`);

// ── 2. 生成一张内容确定的 PNG（三段横条：红 / 绿 / 蓝）────
const W = 240, H = 120;
const bands = [
  [0, 40, [255, 0, 0]],
  [40, 80, [0, 255, 0]],
  [80, 120, [0, 0, 255]],
];
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y += 1) {
  const rowStart = y * (1 + W * 3);
  raw[rowStart] = 0; // filter type 0
  const band = bands.find(([a, b]) => y >= a && y < b)?.[2] ?? [255, 255, 255];
  for (let x = 0; x < W; x += 1) {
    const p = rowStart + 1 + x * 3;
    raw[p] = band[0]; raw[p + 1] = band[1]; raw[p + 2] = band[2];
  }
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
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
const dataUri = `data:image/png;base64,${png.toString('base64')}`;
console.log(`测试图: ${W}x${H} PNG ${(png.length / 1024).toFixed(1)}KB（自上而下 红/绿/蓝 三段）\n`);

// ── 3. 调用上游 ─────────────────────────────────────────
const TOOLS = [{
  type: 'function',
  function: {
    name: 'get_band_colors',
    description: '读取色带元数据（不含图像）',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
}];

async function call(label, messages, extra = {}) {
  const body = { model: llm.model, messages, stream: false, ...extra };
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${llm.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${llm.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (err) {
    console.log(`[${label}] 请求异常: ${err.message}\n`);
    return { ok: false };
  }
  const ms = Date.now() - t0;
  const text = await res.text();
  if (!res.ok) {
    console.log(`[${label}] HTTP ${res.status} (${ms}ms) ✗`);
    console.log(`  错误体: ${text.slice(0, 500)}\n`);
    return { ok: false, status: res.status, text };
  }
  let json;
  try { json = JSON.parse(text); } catch { console.log(`[${label}] 非 JSON 响应: ${text.slice(0, 300)}\n`); return { ok: false }; }
  const msg = json.choices?.[0]?.message ?? {};
  const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
  console.log(`[${label}] HTTP 200 (${ms}ms) ✓`);
  console.log(`  回答: ${(content ?? '').replace(/\s+/g, ' ').slice(0, 300)}`);
  const imgTokens = json.usage?.prompt_tokens_details?.image_tokens;
  console.log(`  usage: prompt=${json.usage?.prompt_tokens} completion=${json.usage?.completion_tokens}${imgTokens ? ` image_tokens=${imgTokens}` : ''}`);
  if (msg.tool_calls) console.log(`  tool_calls: ${JSON.stringify(msg.tool_calls).slice(0, 200)}`);
  console.log('');
  return { ok: true, content, toolCalls: msg.tool_calls, usage: json.usage };
}

const Q = '这张图从上到下有三个横条，按顺序只回答三个颜色名，用逗号分隔，不要解释。';

// probe A：user 消息的 content 为 parts 数组（text + image_url data URI）
const a = await call('A user-parts', [
  { role: 'user', content: [{ type: 'text', text: Q }, { type: 'image_url', image_url: { url: dataUri } }] },
]);

// probe B：先让模型发起工具调用 → 拿到真实 tool_calls id → 再在 tool 消息后追加「带图的 user」
let b;
{
  const first = await call('B1 触发工具调用', [
    { role: 'user', content: '请调用 get_band_colors 工具，然后只回复 OK。' },
  ], { tools: TOOLS, tool_choice: 'auto' });

  if (first.ok && Array.isArray(first.toolCalls) && first.toolCalls.length > 0) {
    const tc = first.toolCalls[0];
    console.log(`  → 使用真实 tool_call: ${tc.id} / ${tc.function?.name}\n`);
    b = await call('B2 tool 后追加带图 user', [
      { role: 'user', content: '请调用 get_band_colors 工具，然后只回复 OK。' },
      { role: 'assistant', content: null, tool_calls: [tc] },
      { role: 'tool', tool_call_id: tc.id, content: '{"ok":true,"bands":3,"colors":null}' },
      {
        role: 'user',
        content: [
          { type: 'text', text: `上面工具没有给出颜色。现在看这张图：${Q}` },
          { type: 'image_url', image_url: { url: dataUri } },
        ],
      },
    ]);
  } else {
    // 上游没发起工具调用 → 用构造的 tool_call 再试（等价形状）
    console.log('  ⚠ 未触发 tool_calls，改用构造的 tool_call 形状继续\n');
    b = await call('B2 tool 后追加带图 user（构造）', [
      { role: 'user', content: '请调用 get_band_colors 工具，然后只回复 OK。' },
      { role: 'assistant', content: null, tool_calls: [{ id: 'call_probe_1', type: 'function', function: { name: 'get_band_colors', arguments: '{}' } }] },
      { role: 'tool', tool_call_id: 'call_probe_1', content: '{"ok":true,"bands":3,"colors":null}' },
      {
        role: 'user',
        content: [
          { type: 'text', text: `上面工具没有给出颜色。现在看这张图：${Q}` },
          { type: 'image_url', image_url: { url: dataUri } },
        ],
      },
    ]);
  }
}

// probe C：图片直接塞进 role:'tool' 的 content 数组（预期被拒或忽略）
const c = await call('C tool-message-parts', [
  { role: 'user', content: '回答 OK。' },
  { role: 'assistant', content: null, tool_calls: [{ id: 'call_probe_2', type: 'function', function: { name: 'get_band_colors', arguments: '{}' } }] },
  {
    role: 'tool',
    tool_call_id: 'call_probe_2',
    content: [{ type: 'text', text: 'tool result: colors unknown' }, { type: 'image_url', image_url: { url: dataUri } }],
  },
]);

// probe D：连发两条 user（中间夹 tool）后末条 user 带图是否被接受（对照 A/B 的位置差异）
const d = await call('D user-parts-no-tool', [
  { role: 'user', content: '请只回答“收到”。' },
  { role: 'assistant', content: '收到' },
  { role: 'user', content: [{ type: 'text', text: Q }, { type: 'image_url', image_url: { url: dataUri } }] },
]);

// ── 4. 结论汇总 ─────────────────────────────────────────
const verdict = (x) => (x?.ok ? 'OK' : `FAIL(${x?.status ?? 'n/a'})`);
console.log('── 汇总 ─────────────────────────────────────');
console.log(`A user parts 支持              : ${verdict(a)}`);
console.log(`B tool 后追加带图 user 支持    : ${verdict(b)}`);
console.log(`C tool 消息承载 image parts    : ${verdict(c)}`);
console.log(`D 多轮后 user parts 支持       : ${verdict(d)}`);

// 生成能力核对：模型是否真“看到”图（颜色顺序是否含红绿蓝）
const sawB = typeof b?.content === 'string' && /红/.test(b.content) && /绿/.test(b.content) && /蓝/.test(b.content);
const sawA = typeof a.content === 'string' && /红/.test(a.content) && /绿/.test(a.content) && /蓝/.test(a.content);
console.log(`A 是否真读到图（红绿蓝）       : ${sawA ? '是' : '否/未确认'}`);
console.log(`B 是否真读到图（红绿蓝）       : ${sawB ? '是' : '否/未确认'}`);
