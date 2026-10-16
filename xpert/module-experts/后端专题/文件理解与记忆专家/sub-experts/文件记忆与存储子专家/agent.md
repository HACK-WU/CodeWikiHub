# 文件记忆与存储子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（文件理解与记忆专家）
- **资产路径**：`.module-experts/后端专题/文件理解与记忆专家/sub-experts/文件记忆与存储子专家/`
- **职责**：本子专家由两条**互不调用**的支柱组成：**支柱 A 文件记忆（`file-memory`）**＝从文件与对话沉淀的可复用知识，本体**不是 DB 行而是卷上的 markdown/JSON**（`.xpert/memory` + `MEMORY.md` 索引 + 四类目录 + `.dream/**` 运行证据），提供写入（显式 `memory_write` / 隐式 writeback / 离线 Dream）、召回（索引 digest + `memory_search`/`memory_get` + 模型筛选）、治理（状态/有用度/记分卡/索引校验）与 Dream 运行编排；**支柱 B 文件存储索引（`storage-file`）**＝字节的落地与取用抽象，`storage_file` 一行 + provider 抽象（`FileStorage`）+ subscriber 收尾。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/file-memory/**（dream / recall-planner / writeback）`
  - `server/src/storage-file/**`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 记忆是卷上文件，不是表：布局 `.xpert/memory`（`FILE_MEMORY_WORKSPACE_PATH`）+ `MEMORY.md` 导航索引 + 四类目录 `user|feedback|project|reference`（`FILE_MEMORY_TYPES`）+ 状态 `active|archived|conflict`（`FILE_MEMORY_STATUSES`）+ 6 类信号（`FILE_MEMORY_SIGNAL_WEIGHTS`）。任何「查库改记忆」的思路都会失败；项目模式下根切到 `.xpert/memory/xperts/<xpertId>`。
  - writeback 串行键与 `softDrain`：`FileMemoryWritebackRunner.enqueue(snapshot)` 按 `createFileMemoryScopeKey`（项目：`<tenant>:project:<projectId>:xpert:<id>`；用户隔离追加 `:<userId>`，缺失时字面量 `missing-user`）**串行**；`softDrain(key, timeoutMs)` 限时等待（`Promise.race`）。内存 `slots` 只在单进程有效，多副本部署下同 scope 可并发。
  - writeback 的跳过与降级条件：本轮已发生显式写入 → `skipped reason=explicit_write`；摘要为空 → `skipped reason=empty_summary`；**模型不可用时只记 `writeback_candidate` 候选、不落盘**；`upsert` 缺 `type/title/summary/content` 任一项即回落 `noop`（`Incomplete upsert payload.`）。
  - dream gate 与出站命令：默认 gate `{enabled:true, minIntervalMinutes:30, minNewOrUpdatedMemories:1, minConversationCount:1}`；未过**不报错**，落 `status='skipped'` 并写 `output/gate.json`；同 scope 已有 pending 直接返回 `coalesced:true`；另一 run 持锁则 `partial`。Dream 是本域**唯一出站**：`XpertDreamerInvoker` 以 `XpertAgentChatCommand` 调 dreamer 助手（超时 10 分钟）；缺 `dreamerXpertId`/`dreamerAgentKey` 不可运行。
  - 召回预算与注入点：`wrapModelCall` 里经 `buildMemoryContextMessages(recall)` 前置注入 `[indexBlock, digestBlock, detailBlock]`；预算常量 `MAX_DETAIL_BYTES_PER_TURN = 20 * 1024`、`MAX_DETAIL_BYTES_PER_SESSION = 60 * 1024`，可用 `options.recall.maxDetailBytesPerTurn/PerSession` 覆盖；日志字段 `detailBytes` / `surfacedSessionBytes` 是对账入口。
  - `explicit_write` 信号属本子域：该信号由 `FileMemoryService` 在写入后 `appendSignal('explicit_write')` 记录（`FILE_MEMORY_SIGNAL_WEIGHTS` 权重 1），跳过逻辑在 `file-memory.middleware.ts` 的 `afterAgent`；子专家①的中间件全目录检索 `explicit_write` **0 命中**，两域不可混谈。
- **测试状态**：只读梳理。本子域 spec = `file-memory` **8 个** + `storage-file` **1 个**，共 **9 个**。引用为仓库根相对路径（`file://`）。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
