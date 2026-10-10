/**
 * temp/exp-indexing-cpu.ts —— 「导入后 CPU 单核 100%」的隔离复现与对照实验
 *
 * 背景：生产 ai-docs-v3（15546 向量 / 78 批）导入报 succeeded 后，仍有 ~11 分钟单核 100% CPU
 *      （线程名 `rocksdb+`），期间 `doc-list` 被同 scope 队列阻塞（见 debug-report.md）。
 *
 * 本实验在**隔离目录**内回答 4 个问题（不触碰 ~/.ki/vector 与真实 scope）：
 *   Q1 复现：同构规模（N 篇 × 每批 200、含 FTS 文本与标量字段）写入后，是否出现"写完之后"的 CPU 尾巴？
 *   Q2 可观测：`collection.stats.indexCompleteness` 在尾巴期间如何变化（能否作为"索引就绪"信号）？
 *   Q3 对照：不调 optimize / optimizeSync()（=当前封装）/ await optimize({concurrency}) 对
 *            「总 CPU 工作量（CPU 秒）」与「尾巴时长」的影响；峰值是否只吃 1 核（限并发是否=限发散）。
 *   Q4 阻塞：尾巴期间同进程查询延迟（后台整理是否顶住前台读）。
 *
 * 运行：
 *   npx jiti temp/exp-indexing-cpu.ts --n=6000 --batch=200 --passes=2 --cap=120 --arms=A,B,C,D
 *   npx jiti temp/exp-indexing-cpu.ts --init=optimizeThreads:1 --arms=E
 * 输出：控制台逐臂摘要 + temp/exp-indexing-cpu-report.txt
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { buildCollectionSchema } from '../src/zvec-engine/schema/builder.js';
import * as zv from '@zvec/zvec';

// ─── 参数 ───
const argv = new Map(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    return (m ? [m[1], m[2]] : [a.replace(/^--/, ''), 'true']) as [string, string];
  }),
);
const N = Number(argv.get('n') ?? 6000);
const BATCH = Number(argv.get('batch') ?? 200);
const PASSES = Number(argv.get('passes') ?? 2);
const CAP_S = Number(argv.get('cap') ?? 120);
/** >0：写入后不做"静默即停"，而是完整观察该秒数（用于抓引擎自发后台工作） */
const OBSERVE_S = Number(argv.get('observe') ?? 0);
const DIM = Number(argv.get('dim') ?? 1024);
const TEXT_BYTES = Number(argv.get('text') ?? 800);
const KEEP = argv.has('keep');
const INIT = argv.get('init');
const ARM_FILTER = (argv.get('arms') ?? '').split(',').filter(Boolean);
const HZ = Number(execSync('getconf CLK_TCK').toString().trim()) || 100;
const WORK = path.resolve('temp', `exp-cpu-${Date.now()}`);

type OptimizeMode = 'none' | 'sync' | 'async';
interface ArmDef {
  id: string;
  label: string;
  passes: number;
  optimize: OptimizeMode;
  concurrency?: number;
  /** 单篇正文体量（字节），缺省用 --text */
  textBytes?: number;
  /** 覆盖删改：删除第一轮 id 后再写一轮新 id（模拟重导入的内容变更） */
  deleteChurn?: boolean;
  /** 先灌这么多篇打底（模拟「库已经很大」再导入） */
  prefill?: number;
  /** 每批提交篇数（缺省用 --batch）——用于验证「减少段数」这一杠杆 */
  batch?: number;
  /** 覆盖写（不删）：用**同一批 id** 写新内容，对比「删旧插新」 */
  overwriteChurn?: boolean;
}

const ALL_ARMS: ArmDef[] = [
  { id: 'A', label: '单轮写入 + 不调 optimize', passes: 1, optimize: 'none' },
  { id: 'B', label: '两轮写入(覆盖) + 不调 optimize', passes: 2, optimize: 'none' },
  { id: 'C', label: '两轮写入 + optimizeSync()（=当前封装）', passes: 2, optimize: 'sync' },
  { id: 'D', label: '两轮写入 + await optimize({concurrency:1})', passes: 2, optimize: 'async', concurrency: 1 },
  { id: 'E', label: '两轮写入 + await optimize()（进程级 init 生效）', passes: 2, optimize: 'async' },
  { id: 'G', label: '两轮写入 + await optimize({concurrency:4})', passes: 2, optimize: 'async', concurrency: 4 },
  // ── 实验 2：复现生产那 11 分钟（大文本 / 覆盖删改 / 打底库）──
  { id: 'H', label: '实验2·大文本 2KB + 不调 optimize', passes: 1, optimize: 'none', textBytes: 2000 },
  { id: 'I', label: '实验2·大文本 2KB + 覆盖删改（删旧插新）', passes: 1, optimize: 'none', textBytes: 2000, deleteChurn: true },
  { id: 'J', label: '实验2·打底 1 万 + 大文本覆盖删改', passes: 1, optimize: 'none', textBytes: 2000, deleteChurn: true, prefill: 10000 },
  { id: 'K', label: '实验2·大文本覆盖删改（每批 1000 = 引擎上限内最大，验证段数杠杆）', passes: 1, optimize: 'none', textBytes: 2000, deleteChurn: true, batch: 1000 },
  { id: 'L', label: '实验2·大文本覆盖写（同一批 id，不删）', passes: 1, optimize: 'none', textBytes: 2000, overwriteChurn: true },
];

// ─── CPU / 线程采样 ───

interface ThreadSnap {
  totalJiffies: number;
  threads: Map<number, { comm: string; jiffies: number }>;
}

function sampleThreads(): ThreadSnap {
  const threads = new Map<number, { comm: string; jiffies: number }>();
  let total = 0;
  const base = '/proc/self/task';
  for (const tid of fs.readdirSync(base)) {
    try {
      const stat = fs.readFileSync(path.join(base, tid, 'stat'), 'utf-8');
      const comm = stat.slice(stat.indexOf('(') + 1, stat.lastIndexOf(')'));
      const rest = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      const jiffies = Number(rest[11]) + Number(rest[12]); // utime + stime
      threads.set(Number(tid), { comm, jiffies });
      total += jiffies;
    } catch { /* 线程可能刚退出 */ }
  }
  return { totalJiffies: total, threads };
}

interface DirSnap { files: number; bytes: number; lastMtimeMs: number }

function snapshotDir(root: string): DirSnap {
  if (!fs.existsSync(root)) return { files: 0, bytes: 0, lastMtimeMs: 0 };
  let files = 0;
  let bytes = 0;
  let lastMtimeMs = 0;
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else {
        try {
          const st = fs.statSync(abs);
          files += 1;
          bytes += st.size;
          if (st.mtimeMs > lastMtimeMs) lastMtimeMs = st.mtimeMs;
        } catch { /* ignore */ }
      }
    }
  };
  walk(root);
  return { files, bytes, lastMtimeMs };
}

function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? null;
}

/** 进程级 CPU 秒（getrusage，涵盖所有线程）——与 /proc 求和方法交叉验证 */
function cpuSecondsProc(): number {
  const u = process.cpuUsage();
  return (u.user + u.system) / 1e6;
}

// ─── 数据构造（同构：1024 维 + ~800B 中文正文 + 标量字段）───

/** 汉字池：生成"词元丰富"的正文（jieba 分词后 token 多样 → FTS 索引体量接近真实文本） */
const HAN_POOL =
  '知识索引导入向量索引全文检索分批提交暂存缓冲后台整理合并落盘读写队列阻塞延迟资源预算并发限流'
  + '退避压缩蒸馏优化调度观测指标规模边界条件容量估算稳定性验证覆盖写入删除标记合并策略段文件清单';

function makeText(i: number, textBytes: number, seed = 0): string {
  const parts: string[] = [`文档${i}号`];
  let n = 0;
  while (Buffer.byteLength(parts.join(' '), 'utf-8') < textBytes) {
    const len = 8 + ((i * 31 + n * 17 + Math.round(seed * 97)) % 9);
    let token = '';
    for (let k = 0; k < len; k += 1) {
      token += HAN_POOL[(i * 131 + n * 197 + k * 59 + Math.round(seed * 991)) % HAN_POOL.length];
    }
    parts.push(token);
    n += 1;
  }
  return parts.join(' ');
}

function makeVector(seed: number): Float32Array {
  const v = new Float32Array(DIM);
  let norm = 0;
  let x = seed * 2654435761 % 2147483647;
  for (let i = 0; i < DIM; i += 1) {
    x = (x * 48271) % 2147483647;
    const val = (x / 2147483647) * 2 - 1;
    v[i] = val;
    norm += val * val;
  }
  const inv = 1 / Math.sqrt(norm || 1);
  for (let i = 0; i < DIM; i += 1) v[i] *= inv;
  return v;
}

function makeDocs(
  scope: string,
  from: number,
  count: number,
  textBytes: number,
  prefix: string,
  seed = 0,
): zv.ZVecDocInput[] {
  const docs: zv.ZVecDocInput[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = from + i;
    docs.push({
      id: `${prefix}${idx}`,
      vectors: { dense: Array.from(makeVector(idx + 1)) },
      fields: {
        tag: `tag-${idx % 50}`,
        scope,
        group: `group-${idx % 200}`,
        content: makeText(idx, textBytes, seed),
      },
    });
  }
  return docs;
}

/** 集合目录下「相对路径 → mtime」快照，用于指认尾巴期间哪些文件在变（fts/idmap/scalar/dense） */
function fileMtimes(root: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!fs.existsSync(root)) return out;
  const walk = (dir: string, base: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(abs, rel);
      else {
        try { out.set(rel, Number(fs.statSync(abs).mtimeMs)); } catch { /* ignore */ }
      }
    }
  };
  walk(root, '');
  return out;
}

// ─── 单臂执行 ───

interface Sample {
  t: number;
  phase: string;
  cpuPct: number;
  totalCpuSeconds: number;
  topThread: string;
  busyThreadsGt50: number;
  files: number;
  bytes: number;
  indexCompleteness: Record<string, number> | null;
  queryMs: number | null;
}

async function runArm(arm: ArmDef): Promise<Record<string, unknown>> {
  const root = path.join(WORK, arm.id);
  // 注意：ZVecCreateAndOpen 要求目标路径不存在（由引擎创建），只保证父目录存在
  fs.mkdirSync(WORK, { recursive: true });
  const scope = `exp-${arm.id}`;
  const schema = buildCollectionSchema({
    dbPath: root,
    collection: {
      name: 'kisearch',
      denseField: 'dense',
      dimension: DIM,
      metric: 'COSINE',
      scalarFields: [
        { name: 'tag', dataType: 'STRING', indexed: true },
        { name: 'scope', dataType: 'STRING', indexed: true },
        { name: 'group', dataType: 'STRING', indexed: true },
        { name: 'content', dataType: 'STRING' },
      ],
      fts: { field: 'content', tokenizer: 'jieba' },
    },
    embedding: undefined,
  } as never);

  const coll = zv.ZVecCreateAndOpen(root, schema);
  const samples: Sample[] = [];
  const batchMs: number[] = [];
  const queryMs: number[] = [];
  const wall0 = Date.now();
  let prev = sampleThreads();
  let prevAt = Date.now();
  let prevCpuSeconds = 0;

  let statsError: string | null = null;
  const readStats = (): { indexCompleteness: Record<string, number> | null; docCount: number | null; error?: string } => {
    try {
      const s = coll.stats;
      return { indexCompleteness: s.indexCompleteness ?? null, docCount: s.docCount ?? null };
    } catch (err) {
      statsError = (err as Error).message;
      return { indexCompleteness: null, docCount: null, error: statsError };
    }
  };

  const probe = (): number | null => {
    try {
      const t = Date.now();
      coll.querySync({ fieldName: 'dense', vector: Array.from(makeVector(1)), topk: 10 });
      return Date.now() - t;
    } catch {
      return null;
    }
  };

  const tick = (phase: string, withProbe: boolean): Sample => {
    const now = Date.now();
    const snap = sampleThreads();
    const dt = (now - prevAt) / 1000;
    let topThread = '';
    let topDelta = -1;
    let busy = 0;
    for (const [tid, info] of snap.threads) {
      const before = prev.threads.get(tid);
      if (!before) continue;
      const delta = info.jiffies - before.jiffies;
      const pct = (delta / HZ / dt) * 100;
      if (pct > 50) busy += 1;
      if (delta > topDelta) {
        topDelta = delta;
        topThread = info.comm;
      }
    }
    const deltaAll = snap.totalJiffies - prev.totalJiffies;
    const cpuPct = dt > 0 ? (deltaAll / HZ / dt) * 100 : 0;
    const totalCpuSeconds = prevCpuSeconds + deltaAll / HZ;
    prevCpuSeconds = totalCpuSeconds;
    prev = snap;
    prevAt = now;
    const dir = snapshotDir(root);
    const st = readStats();
    const qms = withProbe ? probe() : null;
    if (qms !== null) queryMs.push(qms);
    const s: Sample = {
      t: now - wall0,
      phase,
      cpuProcSeconds: Number(cpuSecondsProc().toFixed(2)),
      cpuPct: Number(cpuPct.toFixed(1)),
      totalCpuSeconds: Number(totalCpuSeconds.toFixed(2)),
      topThread,
      busyThreadsGt50: busy,
      files: dir.files,
      bytes: dir.bytes,
      indexCompleteness: st.indexCompleteness,
      queryMs: qms,
    };
    samples.push(s);
    return s;
  };

  const result: Record<string, unknown> = {
    arm: arm.id,
    label: arm.label,
    config: { n: N, batch: BATCH, passes: arm.passes, optimize: arm.optimize, concurrency: arm.concurrency, init: INIT ?? null },
    statsAtCreate: readStats(),
  };

  const phases: { name: string; wallMs: number; cpuSec: number; note?: string }[] = [];
  const textBytes = arm.textBytes ?? TEXT_BYTES;
  const runPhase = async (name: string, fn: () => void, note?: string): Promise<void> => {
    const t0 = Date.now();
    const c0 = cpuSecondsProc();
    await fn();
    phases.push({ name, wallMs: Date.now() - t0, cpuSec: Number((cpuSecondsProc() - c0).toFixed(2)), note });
    tick(`${name}#end`, true);
  };

  try {
    // ── 写入阶段：可选打底 → 第 1..passes 轮 → 可选覆盖删改（删旧 id + 插新 id）──
    const tWrite = Date.now();
    let written = 0;
    const writeRound = (prefix: string, count: number, seed: number, phaseName: string): void => {
      const bs = arm.batch ?? BATCH;
      for (let start = 0; start < count; start += bs) {
        const docs = makeDocs(scope, start, Math.min(bs, count - start), textBytes, prefix, seed);
        const tb = Date.now();
        const statuses = coll.upsertSync(docs);
        batchMs.push(Date.now() - tb);
        const failed = statuses.filter((s) => !s.ok).length;
        if (failed > 0 && !result.firstBatchFailures) {
          result.firstBatchFailures = { failed, sample: statuses.find((s) => !s.ok) };
        }
        written += docs.length;
        if (start % (bs * 10) === 0 || start + bs >= count) tick(phaseName, false);
      }
    };

    if (arm.prefill) {
      await runPhase('prefill', () => writeRound('base-', arm.prefill as number, 0, 'prefill'), `${arm.prefill} 篇打底`);
    }
    for (let pass = 1; pass <= arm.passes; pass += 1) {
      await runPhase(`write${pass}`, () => writeRound('chunk-', N, 0, `write${pass}`), `${N} 篇 / 每篇 ${textBytes}B`);
    }
    if (arm.deleteChurn) {
      const ids = Array.from({ length: N }, (_, i) => `chunk-${i}`);
      await runPhase('deleteOld', () => {
        for (let i = 0; i < ids.length; i += 2000) coll.deleteSync(ids.slice(i, i + 2000));
      }, `删除 ${ids.length} 个旧 id（分批 2000，模拟内容变更后的清理）`);
      await runPhase('writeNew', () => writeRound('chunk2-', N, 0.5, 'writeNew'), `${N} 篇新 id（内容已变）`);
    }
    if (arm.overwriteChurn) {
      await runPhase('overwrite', () => writeRound('chunk-', N, 0.5, 'overwrite'), `${N} 篇同一批 id 覆盖写新内容（不删除）`);
    }
    const writeEnd = tick('write#end', true);
    result.write = {
      docs: written,
      wallMs: Date.now() - tWrite,
      cpuSeconds: writeEnd.totalCpuSeconds,
      batchMsP50: quantile(batchMs, 0.5),
      batchMsP95: quantile(batchMs, 0.95),
      batches: batchMs.length,
      indexCompleteness: writeEnd.indexCompleteness,
      phases,
    };
    const tailStart = Date.now();
    const cpuAtTailStart = writeEnd.totalCpuSeconds;

    // ── 尾巴阶段：采样到「静默」或 cap ──
    const sampleOnce = (phase: string, withProbe: boolean): Sample => tick(phase, withProbe);
    let quietStreak = 0;
    let quiet = false;
    let lastDirSig = '';
    let lastCompleteness = JSON.stringify(writeEnd.indexCompleteness);
    const watchMs = OBSERVE_S > 0 ? OBSERVE_S * 1000 : CAP_S * 1000;
    const mtStart = fileMtimes(root);
    const spikes: { tMs: number; cpuPct: number; topThread: string; completeness: string; indexFiles: number }[] = [];
    while (Date.now() - tailStart < watchMs) {
      await new Promise((r) => setTimeout(r, 250));
      const s = sampleOnce(arm.optimize === 'none' ? 'tail' : 'tail:pre-optimize', true);
      const dirSig = `${s.files}:${s.bytes}:${snapshotDir(root).lastMtimeMs}`;
      const compSig = JSON.stringify(s.indexCompleteness);
      if (s.cpuPct >= 30) spikes.push({ tMs: s.t, cpuPct: s.cpuPct, topThread: s.topThread, completeness: compSig, indexFiles: s.files });
      if (s.cpuPct < 25 && dirSig === lastDirSig && compSig === lastCompleteness) quietStreak += 1;
      else quietStreak = 0;
      lastDirSig = dirSig;
      lastCompleteness = compSig;
      if (OBSERVE_S === 0 && quietStreak >= 8) { // ~2s 静默（静置观察模式下不提前结束）
        quiet = true;
        break;
      }
    }
    const mtEnd = fileMtimes(root);
    const filesAdded = [...mtEnd.keys()].filter((f) => !mtStart.has(f)).slice(0, 40);
    const filesChanged = [...mtEnd.entries()]
      .filter(([f, t]) => mtStart.has(f) && t > (mtStart.get(f) as number))
      .map(([f]) => f)
      .slice(0, 40);
    const tailEndSample = samples[samples.length - 1];
    result.tail = {
      quietReached: quiet,
      wallMs: Date.now() - tailStart,
      cpuSeconds: Number((tailEndSample.totalCpuSeconds - cpuAtTailStart).toFixed(2)),
      maxCpuPct: Math.max(...samples.filter((s) => s.phase.startsWith('tail')).map((s) => s.cpuPct), 0),
      maxBusyThreads: Math.max(...samples.filter((s) => s.phase.startsWith('tail')).map((s) => s.busyThreadsGt50), 0),
      topThreads: [...new Set(samples.filter((s) => s.phase.startsWith('tail')).map((s) => s.topThread).filter(Boolean))],
      indexCompletenessAtQuiet: tailEndSample.indexCompleteness,
      queryMsP50: quantile(queryMs, 0.5),
      queryMsP95: quantile(queryMs, 0.95),
      observedMs: Date.now() - tailStart,
      spikeCount: spikes.length,
      spikes: spikes.slice(0, 40),
      filesAdded,
      filesChanged,
    };

    // ── optimize 阶段 ──
    if (arm.optimize !== 'none') {
      const tOpt = Date.now();
      const cpuBefore = samples[samples.length - 1].totalCpuSeconds;
      if (arm.optimize === 'sync') {
        coll.optimizeSync();
        result.optimizeCall = 'optimizeSync()';
      } else {
        await (arm.concurrency !== undefined ? coll.optimize({ concurrency: arm.concurrency }) : coll.optimize());
        result.optimizeCall = arm.concurrency !== undefined ? `optimize({concurrency:${arm.concurrency}})` : 'optimize()';
      }
      const optWall = Date.now() - tOpt;
      const after = tick('optimize#end', true);
      result.optimize = {
        wallMs: optWall,
        cpuSeconds: Number((after.totalCpuSeconds - cpuBefore).toFixed(2)),
        indexCompleteness: after.indexCompleteness,
      };
      // optimize 之后再观察一段，看是否仍有尾巴
      const tPost = Date.now();
      const cpuAtPost = after.totalCpuSeconds;
      let postQuiet = 0;
      while (Date.now() - tPost < Math.min(CAP_S, 30) * 1000) {
        await new Promise((r) => setTimeout(r, 250));
        const s = tick('post-optimize', true);
        postQuiet = s.cpuPct < 25 ? postQuiet + 1 : 0;
        if (postQuiet >= 8) break;
      }
      const lastPost = samples[samples.length - 1];
      result.postOptimize = {
        wallMs: Date.now() - tPost,
        cpuSeconds: Number((lastPost.totalCpuSeconds - cpuAtPost).toFixed(2)),
        quietReached: postQuiet >= 8,
        indexCompleteness: lastPost.indexCompleteness,
      };
    }

    // ── 重开校验 ──
    const infoBefore = readStats();
    coll.closeSync();
    const tOpen = Date.now();
    const coll2 = zv.ZVecOpen(root);
    const reopenMs = Date.now() - tOpen;
    const statsAtOpen = readStats();
    let hitCount: number | null = null;
    try {
      hitCount = coll2.querySync({ fieldName: 'dense', vector: Array.from(makeVector(1)), topk: 10 }).length;
    } catch { /* ignore */ }
    let statsAfterQuery: Record<string, unknown>;
    try {
      const s = coll2.stats;
      statsAfterQuery = { docCount: s.docCount, indexCompleteness: s.indexCompleteness };
    } catch (err) {
      statsAfterQuery = { error: (err as Error).message };
    }
    result.reopen = { reopenMs, docCountBefore: infoBefore.docCount, statsAtOpen, hitCount, statsAfterQuery };
    coll2.closeSync();
  } catch (err) {
    result.fatalError = `${(err as Error).message}\n${(err as Error).stack ?? ''}`;
    try { coll.closeSync(); } catch { /* ignore */ }
  }

  const finalDir = snapshotDir(root);
  result.finalDir = finalDir;
  result.samples = samples; // 全量采样入库（每臂样本量很小，便于离线按阶段核算 CPU）
  result.sampleCount = samples.length;
  console.log(`\n[arm ${arm.id}] ${arm.label}`);
  console.log(JSON.stringify({ write: result.write, tail: result.tail, optimize: result.optimize, postOptimize: result.postOptimize, reopen: result.reopen }, null, 2));
  return result;
}

// ─── 主流程 ───

const report: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  workDir: WORK,
  params: { N, BATCH, PASSES, CAP_S, DIM, TEXT_BYTES, INIT: INIT ?? null, HZ },
  arms: [],
};

if (INIT) {
  const [key, value] = INIT.split(':');
  const opts: Record<string, number> = { [key]: Number(value) };
  zv.ZVecInitialize(opts);
  report.initApplied = opts;
  console.log(`[init] ZVecInitialize(${JSON.stringify(opts)})`);
}

const arms = ALL_ARMS.filter((a) => (ARM_FILTER.length === 0 ? true : ARM_FILTER.includes(a.id)));
for (const arm of arms) {
  // E 臂依赖进程级 init，未指定 init 时跳过
  if (arm.id === 'E' && !INIT) {
    console.log('[skip] arm E 需要 --init=optimizeThreads:N');
    continue;
  }
  if (arm.id !== 'E' && INIT) {
    console.log(`[skip] arm ${arm.id} 在 init 模式下跳过（对照需默认 init）`);
    continue;
  }
  (report.arms as Record<string, unknown>[]).push(await runArm(arm));
}

console.log('\n===== EXP-INDEXING-CPU SUMMARY =====');
const summary = (report.arms as Record<string, any>[]).map((a) => ({
  arm: a.arm,
  label: a.label,
  'write.cpuSec': a.write?.cpuSeconds,
  'write.wallMs': a.write?.wallMs,
  'tail.wallMs': a.tail?.wallMs,
  'tail.cpuSec': a.tail?.cpuSeconds,
  'tail.maxCpuPct': a.tail?.maxCpuPct,
  'tail.busyThreads': a.tail?.maxBusyThreads,
  'tail.quiet': a.tail?.quietReached,
  'opt.wallMs': a.optimize?.wallMs,
  'opt.cpuSec': a.optimize?.cpuSeconds,
  'post.cpuSec': a.postOptimize?.cpuSeconds,
  'query.p95ms': a.tail?.queryMsP95,
  finalCompleteness: JSON.stringify(a.reopen?.indexCompleteness ?? a.tail?.indexCompletenessAtQuiet ?? null),
  docCount: a.reopen?.docCountAfter,
}));
console.table(summary);
report.summary = summary;
report.finishedAt = new Date().toISOString();

const out = path.resolve('temp', 'exp-indexing-cpu-report.txt');
fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf-8');
console.log(`\n报告：${out}`);

if (!KEEP) {
  try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* ignore */ }
  console.log('隔离目录已清理（--keep 可保留）');
} else {
  console.log(`隔离目录保留：${WORK}`);
}
