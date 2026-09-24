/**
 * 验证目的（REQ-20260924-001 最小原型，非生产代码）：
 *   R-02 后端 SSE 流式转发到浏览器（项目零先例）
 *   R-03 reasoning 模型输出形态（reasoning_content vs content、首字/首答延迟、token 成本）
 *   R-05 会话 JSON 落盘 + 进程重启后仍可读
 *
 * 运行：
 *   KI_CHAT_BASE_URL=... KI_CHAT_API_KEY=... KI_CHAT_MODEL=qwen3.8-flash PORT=7799 node server.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.KI_CHAT_BASE_URL;
const KEY = process.env.KI_CHAT_API_KEY;
const MODEL = process.env.KI_CHAT_MODEL || 'qwen3.8-flash';
const PORT = Number(process.env.PORT || 7799);
const DATA = process.env.KI_CHAT_DATA || '/tmp/ki-chat-demo/conversations';
const HERE = path.dirname(fileURLToPath(import.meta.url));

if (!BASE || !KEY) {
  console.error('[demo] 缺少 KI_CHAT_BASE_URL / KI_CHAT_API_KEY');
  process.exit(2);
}

fs.mkdirSync(DATA, { recursive: true });
const convFile = (id) => path.join(DATA, `${id}.json`);
const readConv = (id) => {
  try {
    return JSON.parse(fs.readFileSync(convFile(id), 'utf8'));
  } catch {
    return null;
  }
};
const writeConv = (c) => {
  c.updatedAt = Date.now();
  fs.writeFileSync(convFile(c.id), JSON.stringify(c, null, 2));
};
const listConvs = () =>
  fs
    .readdirSync(DATA)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readConv(f.replace(/\.json$/, '')))
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt);

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 4 * 1024 * 1024) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
  });

/** 把上游 OpenAI 兼容 SSE 解析后，按自定义事件转发给浏览器 */
async function streamChat(req, res, conv, userText) {
  conv.messages.push({ role: 'user', content: userText, at: Date.now() });
  writeConv(conv);

  const msgs = [];
  if (conv.systemPrompt) msgs.push({ role: 'system', content: conv.systemPrompt });
  for (const m of conv.messages) msgs.push({ role: m.role, content: m.content });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const ac = new AbortController();
  req.on('close', () => ac.abort());

  const t0 = Date.now();
  let tFirstChunk = null;
  let tFirstContent = null;
  let reasoning = '';
  let content = '';
  let usage = null;
  let finish = null;

  try {
    const upstream = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: msgs,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: ac.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      send({ type: 'error', message: `upstream ${upstream.status}: ${text.slice(0, 400)}` });
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';
      for (const part of parts) {
        const line = part.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        let chunk;
        try {
          chunk = JSON.parse(payload);
        } catch {
          continue;
        }
        if (chunk.usage) usage = chunk.usage;
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finish = choice.finish_reason;
        const d = choice.delta ?? {};
        if (tFirstChunk === null) {
          tFirstChunk = Date.now() - t0;
          send({ type: 'meta', model: chunk.model ?? MODEL, ttfbMs: tFirstChunk });
        }
        if (d.reasoning_content) {
          reasoning += d.reasoning_content;
          send({ type: 'delta', channel: 'reasoning', text: d.reasoning_content });
        }
        if (d.content) {
          if (tFirstContent === null) {
            tFirstContent = Date.now() - t0;
            send({ type: 'meta', firstContentMs: tFirstContent });
          }
          content += d.content;
          send({ type: 'delta', channel: 'content', text: d.content });
        }
      }
    }

    const timing = {
      ttfbMs: tFirstChunk,
      firstContentMs: tFirstContent,
      totalMs: Date.now() - t0,
      reasoningChars: reasoning.length,
      contentChars: content.length,
    };
    conv.messages.push({
      role: 'assistant',
      content,
      reasoning,
      timing,
      usage,
      at: Date.now(),
    });
    writeConv(conv);
    send({ type: 'done', timing, usage, finish });
    res.end();
  } catch (err) {
    if (ac.signal.aborted) {
      send({ type: 'aborted', timing: { totalMs: Date.now() - t0 } });
      res.end();
      return;
    }
    send({ type: 'error', message: String(err?.message ?? err) });
    res.end();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    // ── 静态页 ──
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/panel.html')) {
      const html = fs.readFileSync(path.join(HERE, 'panel.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // ── 会话 CRUD（R-05）──
    if (req.method === 'GET' && url.pathname === '/api/conversations') {
      const all = listConvs().map((c) => ({
        id: c.id,
        title: c.title,
        systemPrompt: c.systemPrompt,
        archived: !!c.archived,
        updatedAt: c.updatedAt,
        count: c.messages.length,
      }));
      const archived = url.searchParams.get('archived') === '1';
      return json(res, 200, { items: all.filter((c) => !!c.archived === archived) });
    }
    if (req.method === 'POST' && url.pathname === '/api/conversations') {
      const body = await readBody(req);
      const conv = {
        id: `c${Date.now().toString(36)}`,
        title: body.title || '新会话',
        systemPrompt: body.systemPrompt || '',
        archived: false,
        createdAt: Date.now(),
        messages: [],
      };
      writeConv(conv);
      return json(res, 200, { conv });
    }
    const m = url.pathname.match(/^\/api\/conversations\/([\w-]+)(\/archive)?$/);
    if (m) {
      const conv = readConv(m[1]);
      if (!conv) return json(res, 404, { error: 'not found' });
      if (req.method === 'GET') return json(res, 200, { conv });
      if (req.method === 'PATCH') {
        const body = await readBody(req);
        if (typeof body.title === 'string') conv.title = body.title;
        if (typeof body.systemPrompt === 'string') conv.systemPrompt = body.systemPrompt;
        if (typeof body.archived === 'boolean') conv.archived = body.archived;
        writeConv(conv);
        return json(res, 200, { conv });
      }
      if (req.method === 'DELETE') {
        fs.unlinkSync(convFile(m[1]));
        return json(res, 200, { ok: true });
      }
    }

    // ── 对话（SSE）──
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const body = await readBody(req);
      const conv = readConv(body.conversationId);
      if (!conv) return json(res, 404, { error: 'conversation not found' });
      if (!body.text || !String(body.text).trim()) return json(res, 400, { error: 'empty text' });
      return streamChat(req, res, conv, String(body.text));
    }

    json(res, 404, { error: `no route: ${req.method} ${url.pathname}` });
  } catch (err) {
    json(res, 500, { error: String(err?.message ?? err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[demo] http://127.0.0.1:${PORT}  model=${MODEL}  data=${DATA}`);
});
