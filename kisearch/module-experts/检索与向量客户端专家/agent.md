# 检索与向量客户端专家 Agent

## 简介

**一句话职责**：kisearch 的检索与向量写入入口——`vector-client.ts` 把 ZvecEngine 封装为 async Vector Adapter，`relation-map.ts` 提供 memoryId 反查，`search.ts` 编排"检索 + 反查 + 原文召回 + 两级去重"，`store/bulk-store/doc/tag.ts` 是向量层管理面。

**模块根**：`src/lib/{vector-client,relation-map}.ts` + `src/{search,store,doc,tag,bulk-store}.ts`

**何时找这个专家**：
- 需要理解 / 修改检索行为（多 tag OR 策略、TAG_PRIORITY、原文召回与去重）
- 需要排查 `ki search` / `ki store` / `ki bulk_store` / `ki doc` / `ki tag` 相关行为
- 需要理解向量层数据如何写入与删除（幂等 upsert、docId 生成、tag 规范化）
- 需要理解 memoryId 反查 relations-cache 的机制
- 需要排查向量库锁问题（LOCKED、idle close、撞锁重试、`worker not open`）

## 能力清单

| 能力 | 说明 | 入口 |
|------|------|------|
| 语义检索 | hybrid（语义 + FTS + RRF）；默认搜全部只做 **1 次 embedding** | `vectorSearch` / `executeSearch` |
| 原文召回（REQ-09） | 显式开启时从 local KB 取文件级原文；取不到降级为向量文档 + hint | `fetchOriginal` |
| memoryId 反查 | memoryId → `{group, relation}`，TTL + mtime/size 双失效缓存 | `relation-map.ts` |
| 引擎生命周期 | 进程内单例、原生操作串行化、open 超时自愈、空闲释放锁、撞锁重试 | `vector-client.ts` |
| 可用性检测 | `LOCKED` / `CORRUPTED` / `PROBE_ERROR` + 中断标记引导 + `fastFail` | `ensureVectorAvailable` |
| 单条 / 批量写入 | 幂等 upsert，docId = `sha256(text+scope+tag)` 截 32 | `vectorStore` / `vectorBulkStore` |
| 文档管理 | list / fetch / delete（scope 护栏 + `--yes` 预览确认） | `vectorListDocs` / `vectorFetchDocs` / `vectorDelete` |
| scope / tag 枚举 | distinct + 计数（近似，受 scanLimit 约束） | `vectorListScopes` / `vectorListTags` |
| 清空 / 计数 | 分批循环 + 无进展保护 | `vectorCountScope` / `vectorDeleteScope` |
| 管理 CLI | `ki doc list` / `ki doc delete` / `ki tag list`（**无 MCP 暴露**） | `doc.ts` / `tag.ts` |
| 存储 CLI | `ki store` / `ki bulk_store` | `store.ts` / `bulk-store.ts` |

**边界**：不提供向量引擎底层 API（向量引擎专家）、不提供关系/评分/Group 树业务（关系与索引管理专家）、不提供导入 5-Phase（知识索引导入专家，但复用本层 `vectorBulkStore`/`vectorDeleteScope`）、不持久化 KB JSON（存储与配置基础专家）。

## 关键符号（源码导航）

| 符号 | 文件 | 说明 |
|------|------|------|
| `getEngine` / `closeEngine` / `resetEngine` | `src/lib/vector-client.ts` | 引擎单例与关闭（close 先置空再关） |
| `withEngine` / `isWorkerUnavailable` | `src/lib/vector-client.ts` | 在途保护 + worker 不可用自愈重试 |
| `enableIdleClose` / `probeWithRetry` / `serializeEngineOp` | `src/lib/vector-client.ts` | 空闲释放锁 / 撞锁重试 / 原生操作串行化 |
| `ensureVectorAvailable` | `src/lib/vector-client.ts` | 可用性检测（含中断引导与 fastFail） |
| `runWithVectorSource` / `getVectorOpSource` | `src/lib/vector-client.ts` | 撞锁日志来源标注（AsyncLocalStorage） |
| `vectorSearch` / `vectorStore` / `vectorBulkStore` / `vectorDelete` | `src/lib/vector-client.ts` | 检索与写入原语 |
| `generateDocId` / `buildScopeTagFilter` / `normalizeTag` | `src/lib/vector-client.ts` | docId 生成 / 过滤构造 / tag 小写化 |
| `vectorListDocs` / `vectorFetchDocs` / `vectorListScopes` / `vectorListTags` | `src/lib/vector-client.ts` | 管理面枚举 |
| `vectorCountScope` / `vectorDeleteScope` | `src/lib/vector-client.ts` | 计数与清空（导入链路依赖） |
| `getRelationMap` / `buildRelationMap` / `clearRelationMapCache` | `src/lib/relation-map.ts` | memoryId 反查与缓存 |
| `executeSearch` / `fetchOriginal` / `TAG_PRIORITY` | `src/search.ts` | 检索编排与原文召回 |
| `executeStore` | `src/store.ts` | 单条向量存储 |
| `executeBulkStore` | `src/bulk-store.ts` | 批量向量层存储 |
| `executeDocList` / `executeDocDelete` | `src/doc.ts` | 文档管理面 |
| `executeTagList` | `src/tag.ts` | tag 枚举 |

## 设计决策

1. **从 dist 而非源码导入引擎**：`worker_threads` 只能加载编译产物，改 `src/zvec-engine` 必须 `npm run build:zvec-engine`，否则"改了源码没生效"。
2. **原生操作串行化**：`probe/create/open/close` 全部经 `serializeEngineOp` 排队——同进程并发 `ZVecOpen` 同一 dbPath 实测约 **62% 概率原生竞态永久阻塞**。
3. **open 超时自愈**：`withOpenTimeout`（20s，刻意 < 工具护栏 READ 30s）超时后 fire-and-forget 关闭孤儿 engine，保证 `_enginePromise` 必定 settle。
4. **撞锁重试 + 空闲释放锁**（2026-08-14）：`probeWithRetry`（2s × 3）+ `enableIdleClose`（常驻层空闲释放），实现多 MCP 实例与 CLI 短命令错开共享同一向量库。
5. **在途计数 + 自愈重试**（2026-08-27）：`withEngine` 的 `_inFlightOps` 让 idle timer 不打断进行中操作（含 embedding 网络期），修复 `worker not open (state=closed)`；捕获 `WorkerUnavailableError` 后重开重试一次。**自定义 engine 使用必须经 `withEngine`**。
6. **异常判定用 duck-typing**：`isWorkerUnavailable` 检查 `err.name === 'WorkerUnavailableError'` 或 `/worker not open/i`，不用 `instanceof`——旧 dist 产物缺新导出时 `instanceof undefined` 会崩。
7. **docId 含 tag**（2026-08-10，breaking）：`sha256(text + scope + tag)` 截 32。tag 是单值字段，多 tag 必须各写一 doc，故 tag 必须参与 hash 才能各自独立且幂等。**存量数据需 re-import 或 `rebuild-vector` 迁移。**
8. **默认搜全部改单次多 tag OR**（2026-08-28）：一次查询（多 tag OR + `topk = limit × tag数`）取代逐 tag 分查的 N 次 embedding；内存按 tag 分组限额 + `TAG_PRIORITY` 排序。**近似等价**——极端场景单 tag 可能挤掉其他 tag。
9. **传 tag 数组而非逗号字符串**：tag 值可能含逗号，`join/split` 往返会错拆。
10. **REQ-09 默认不返回原文**：`includeOriginal` 默认 false；原文缺失时**降级返回向量文档 content** + `originalHint`，而非静默失败。
11. **两级去重**：多 tag 去重（同 `(group, relation)` 保留最高分）+ 多 chunk 原文去重（后续 `deduplicated: true`）。
12. **管理面用 validateScope 而非 resolveScope**：需能操作"未注册但向量层有数据"的 scope。
13. **apiKey 无隐式 env 回退**：提供商可经 baseURL 自由配置，固定厂商密钥变量会注入错误密钥，故缺失即 fail-loud。

## 已知坑

| 现象 | 触发条件 | 正确做法 |
|------|----------|----------|
| 改 `src/zvec-engine` 没生效 | 只改源码未重建 | `npm run build:zvec-engine` |
| `worker not open (state=closed)` | 自定义代码绕过 `withEngine` 直接 `await getEngine()` | 所有 engine 使用走 `withEngine` |
| CLI 进程不退出 | 忘 `closeEngine()` | 每个 CLI action 末尾 `await closeEngine()` |
| 长期占锁导致 CLI 全撞锁 | 常驻进程未启用 `enableIdleClose` | 常驻层 `enableIdleClose(idleMs)` |
| 分不清哪个端点撞锁 | 多端点共进程 | `runWithVectorSource('端点名', fn)` 标注 |
| 升级后召回/删除异常 | 存量数据用旧 docId scheme | re-import 或 `ki restore <scope> --rebuild-vector` |
| 结果无 `group`/`relation` | 数据来自 `ki store`/`ki bulk_store` | 属预期（不写 KB）；要定位原文用 `sync-relation` |
| 用 `ki_bulk_store` 写记忆后查不到 | 它是向量层专用，不写 cache/KB/树 | 写记忆用 `ki sync-relation --input` |
| `threshold` 过滤掉全部结果 | 沿用了余弦 0.75 | RRF 融合分量级远小于 1，从小值试 |
| 多 tag 过滤错拆 | tag 值含逗号 | `tags` 传数组 |
| 枚举结果不全 | 超 scanLimit | 看 `truncated`，加大 `--scan-limit` |
| `ki doc delete` 后 KB 仍有引用 | 只删了向量层 | 删关系用 `ki delete-relation` |
| 测试挂起 | IDE 注入 `NODE_OPTIONS` | `env -u NODE_OPTIONS -u BASH_ENV npx jiti test/<name>.test.ts` |

## 相关专家

- **向量引擎专家** — 本专家是其上层适配层；引擎公开导出面变更须重建 dist 才能被本层加载
- **知识索引导入专家** — 复用本专家 `vectorBulkStore` / `vectorCountScope` / `vectorDeleteScope` 做批量写入、清空与重建
- **关系与索引管理专家** — 复用 `vectorSearch`（`searchPath` 语义兜底）与 `vectorDelete`；依赖 `NOT_FOUND` 语义与 `getRelationMap` 反查
- **存储与配置基础专家** — 提供 `config`（embedding / vectorDir / scopeMode）、`scope`（validateScope / resolveScope）、`store`（readJson）、`interrupt`（中断标记引导）

## 测试状态

6 个测试文件 / **79 例，实测 78 通过 + 1 过期失败**（2026-08-28，commit `9841255`）。

| 文件 | 用例数 | 状态 |
|------|--------|------|
| `test/vector-cli-functions.test.ts` | 28 | ✅ |
| `test/scope-doc.test.ts` | 14 | ✅ |
| `test/relation-map.test.ts` | 8 | ✅ |
| `test/search-original.test.ts` | 6 | ✅ |
| `test/vector-idle-race.test.ts` | 1 | ✅ |
| `test/cli-aliases.test.ts` | 22 | ⚠️ 21 通过 / 1 过期失败 |

**唯一失败**：`cli-aliases` 断言 `ki scan-kb diff -h` 帮助含 `-o, --output`，但该子命令已于 2026-08-14（`fce0b57`）移除。与本模块功能无关，详见 `test/known-failures.md`。

**覆盖缺口**：`ensureVectorAvailable.fastFail`、`probeWithRetry` 撞锁重试、`vectorDeleteScope` 无进展保护、`vectorDelete` 的 `NOT_FOUND` 语义、`generateDocId` tag 参与回归保护、`runWithVectorSource` 来源透传、`vectorListScopes`/`vectorCountScope`、`ki doc` scope 护栏。详见 `implementation/06-测试.md`。

## Root Cause 记录

### [Root Cause] embedding 期间 idle close 打断在途检索 → `worker not open (state=closed)`

- **现象**：常驻 MCP 场景下 `ki_search` 偶发报 `worker not open (state=closed)`。
- **根因**：embedding 在主线程进行（网络 0.5s~数秒），`proxy.close()` 的 drain 只等已 `postMessage` 的请求，**embedding 阶段不可见** → drain 立即完成 → worker closed → embedding 返回后 `proxy.send` 报错。
- **修复**：`_inFlightOps` 在途计数（idle timer 见此计数不释放）+ `withEngine` 统一包装全部 engine 使用点 + `WorkerUnavailableError` 自愈重试一次。异常判定用 duck-typing 以兼容旧 dist 产物。

### [Root Cause] 多 stdio 实例与 CLI 短命令互相抢锁

- **现象**：常驻 MCP 运行时，CLI 命令报"向量库被其他进程占用"。
- **根因**：向量库为单进程独占锁，常驻进程长期持锁。
- **修复**：双向配合——常驻层 `enableIdleClose` 空闲释放（下次惰性 reopen 约 0.7s），请求方 `probeWithRetry` 撞锁等 2s×3；撞锁日志经 `runWithVectorSource` 标注来源便于定位。

### [Root Cause] 默认搜全部时 embedding 重复 N 次

- **现象**：tag 较多时检索延迟线性放大。
- **根因**：旧实现"按 tag 分查"，对同一 query 重复 embedding N 次。
- **修复**：改为单次多 tag OR 查询（`topk = limit × tag数`），内存按 tag 分组限额 + `TAG_PRIORITY` 排序。属**近似等价**——topk 全局分配，极端场景单 tag 可能挤掉其他 tag。

### [Root Cause] 多标签能力导致 docId 冲突

- **现象**：同一内容打多 tag 时，各 tag 的 doc 互相覆盖。
- **根因**：docId 原为 `sha256(text + scope)`，不含 tag；而 tag 是单值字段，多 tag 必须各写一 doc。
- **修复**：`generateDocId(text, scope, tag)` 引入 tag 参与 hash。**副作用（breaking）**：所有链路产出的 docId 改变，存量 `memoryId`/`memoryIds` 失配，需 re-import 或 `rebuild-vector` 迁移。

## 最近更新

- **2026-08-28**（git `9841255`）：全量合并补全更新。修正 5 处重大漂移（docId 含 tag、默认搜全部单次多 tag OR、`isFullText`/`keywords` 删除并引入 REQ-09 原文召回、idle close + 在途计数 + 自愈重试、撞锁重试 + 空闲释放锁）；新增 `implementation/04-模型.md` 与 `07-运维.md`；实测 79 例回归并登记 1 例过期失败。

## 更新日志（最近 10 条）

| 日期 | git | 更新内容 |
|------|-----|----------|
| 2026-08-28 | `9841255` | 全量合并补全：C0/C1/C2/C4 + 实现层 01-04、06-07；5 处重大契约漂移修正；新增 04-模型与 07-运维；登记 `cli-aliases` 过期失败 |
| 2026-08-06 | 未提交 | 初版创建：契约层 C0/C1/C2/C4 + 实现层 01-03、06 |

---

> **下一步建议**：① 清理 `test/cli-aliases.test.ts:50` 的过期断言（恢复套件退出码）；② 补齐引擎锁策略的四处覆盖缺口（`fastFail` / `probeWithRetry` / `vectorDeleteScope` 保护 / `NOT_FOUND` 语义）。
