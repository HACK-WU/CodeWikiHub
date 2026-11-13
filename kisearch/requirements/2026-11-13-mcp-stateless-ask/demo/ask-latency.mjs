#!/usr/bin/env node
/**
 * R-02 验证：ki 侧「RAG 问答」端到端耗时构成（真实 daemon 链路）
 *
 * 为什么要走 HTTP 而不是直接 import runToolLoop：
 *   daemon 持有向量库锁，独立进程直连 zvec 会冲突（项目既有约束：
 *   stdio 是 daemon 桥）。因此本原型走 /api/chat/* 真实链路，
 *   每道题新建一个会话（等价于 ki_ask 的「全新对话」首轮）。
 *
 * 采集指标：
 *   - tMeta      首帧（meta）
 *   - tFirstTok  首个 content 字节
 *   - 每轮工具耗时（tool_end.durationMs）、工具名、命中数
 *   - 总耗时 / 答案字符数 / sources 条数 / usage
 *
 * 用法：node ask-latency.mjs [额外问题...]
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.KI_BASE ?? 'http://127.0.0.1:7423';
const SCOPE = process.env.KI_SCOPE ?? 'monitor-memory';
const OUT = path.join(import.meta.dirname, 'out');

const DEFAULT_QUESTIONS = [
  '这个知识库里都有哪些内容？',
  '处理记录ID 和告警ID 是怎么关联的？',
  '如果我要新增一个通过 action_id 反查告警 ID 的能力，需要改动哪些地方？',
];
const questions = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_QUESTIONS;

const ms = () => Date.now();

async function createConv() {
  const r = await fetch(`${BASE}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: SCOPE }),
  });
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error(`建会话失败: ${r.status} ${JSON.stringify(j)}`);
  return j.conv.id;
}

async function deleteConv(id) {
  await fetch(`${BASE}/api/chat/conversations/${id}`, { method: 'DELETE' }).catch(() => {});
}

/** 发一条消息并消费 SSE，返回耗时与事件统计 */
async function ask(convId, text) {
  const t0 = ms();
  const res = await fetch(`${BASE}/api/chat/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`发消息失败: ${res.status} ${body.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let tMeta = null;
  let tFirstTok = null;
  let answer = '';
  let reasoning = 0;
  let sources = [];
  let usage = null;
  let degraded = null;
  let doneEv = null;
  const tools = [];

  const handle = (ev) => {
    switch (ev.type) {
      case 'meta':
        tMeta ??= ms() - t0;
        break;
      case 'content':
        tFirstTok ??= ms() - t0;
        answer += ev.text ?? '';
        break;
      case 'reasoning':
        tFirstTok ??= ms() - t0;
        reasoning += (ev.text ?? '').length;
        break;
      case 'tool_end':
        tools.push({ name: ev.name, hits: ev.hits, durationMs: ev.durationMs, error: ev.error });
        break;
      case 'sources':
        sources = ev.sources ?? [];
        break;
      case 'degraded':
        degraded = { reason: ev.reason, message: ev.message };
        break;
      case 'usage':
        usage = ev;
        break;
      case 'done':
        doneEv = { finishReason: ev.finishReason, warning: ev.warning, sources: ev.sources };
        if (Array.isArray(ev.sources)) sources = ev.sources;
        break;
      default:
        break; // tool_start / skill 等不入统计
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      try { handle(JSON.parse(line.slice(6))); } catch { /* 半帧忽略 */ }
    }
  }

  const total = ms() - t0;
  return {
    totalMs: total,
    metaMs: tMeta,
    firstTokenMs: tFirstTok,
    toolMs: tools.reduce((s, t) => s + (t.durationMs ?? 0), 0),
    toolRounds: tools.length,
    tools,
    answerChars: answer.length,
    reasoningChars: reasoning,
    sourceCount: sources.length,
    usage,
    degraded,
    finishReason: doneEv?.finishReason ?? null,
    warning: doneEv?.warning ?? null,
    answer,
  };
}

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const [i, q] of questions.entries()) {
    const convId = await createConv();
    process.stdout.write(`\n[${i + 1}/${questions.length}] ${q}\n`);
    try {
      const r = await ask(convId, q);
      results.push({ question: q, convId, ...r });
      fs.writeFileSync(path.join(OUT, `answer-${i + 1}.md`), `# ${q}\n\n${r.answer}\n`);
      process.stdout.write(
        `  total=${r.totalMs}ms 首帧=${r.metaMs}ms 首token=${r.firstTokenMs}ms ` +
        `工具=${r.toolRounds}轮/${r.toolMs}ms 答案=${r.answerChars}字 来源=${r.sourceCount}条` +
        (r.degraded ? ` 降级=${r.degraded.reason}` : '') + '\n',
      );
    } catch (err) {
      results.push({ question: q, convId, error: String(err?.message ?? err) });
      process.stdout.write(`  ❌ ${err?.message ?? err}\n`);
    } finally {
      await deleteConv(convId);
    }
  }

  const ok = results.filter((r) => !r.error);
  const summary = {
    scope: SCOPE,
    ranAt: new Date().toISOString(),
    count: ok.length,
    totalMs: ok.map((r) => r.totalMs),
    avgTotalMs: ok.length ? Math.round(ok.reduce((s, r) => s + r.totalMs, 0) / ok.length) : null,
    maxTotalMs: ok.length ? Math.max(...ok.map((r) => r.totalMs)) : null,
    toolRounds: ok.map((r) => r.toolRounds),
    slowestToolMs: Math.max(0, ...ok.flatMap((r) => r.tools.map((t) => t.durationMs ?? 0))),
    results,
  };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(summary, null, 2));
  process.stdout.write(`\n=== 汇总 ===\n${JSON.stringify({ ...summary, results: undefined }, null, 2)}\n`);
  process.stdout.write(`明细：${path.join(OUT, 'result.json')}\n`);
};

main().catch((e) => { console.error(e); process.exit(1); });
