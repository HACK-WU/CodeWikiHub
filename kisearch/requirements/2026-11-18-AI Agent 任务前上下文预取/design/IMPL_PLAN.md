# 实施计划：AI Agent 任务前上下文预取（ki_recall）

- 设计基线：`design/DESIGN.md`（+ S01 / S02 / S04，S03 属二期）
- 骨架冻结 commit：—（不走并行链，无骨架）
- 执行方式：**单窗口串行**

## 0. 并行判定（为什么不切片并行）

| 代理指标 | 实测 | 阈值 | 倾向 |
|---|---|---|---|
| 可并行砖头数 | 3（S-01 / S-02 / S-04） | < 3 才串行 | 勉强够 3 |
| 跨砖头接口数 | 2（`runFastRecall` / `RecallCandidate`） | > 3×砖头才串行 | — |
| 改造现有逻辑的砖头占比 | 1/3（S-01 改 `find-targets.ts`） | > 1/2 才串行 | — |
| **共享面处数** | **5**（`find-targets` / `config-schema` / `tool-access` / `mcp-server-factory` / `docs` 5 处计数） | > 3 即倾向串行 | **命中** |
| 量级估不出 | 否（预计 3~4 天） | — | — |

**结论：单窗口串行。** 主因是共享面 5 处、且其中 3 处（工具注册、准入名单、文档计数）任意一处漏改都会「静默错」——并行时没有第二个窗口能发现。

## 1. 前置层（不进批次，先于全部砖头）

| # | 前置项 | 内容摘要 | 完成判据 |
|---|---|---|---|
| P1 | 数据模型 / DTO 定稿 | `RecallRequest`（`scope` 必填 `string[]`）/ `RecallCandidate`（含 `alsoIn`）/ `CoreRecallResult` / `RecallToolResponse`（`targets: string[]`）；配置键 **5** 个 | 类型文件落地且 S-01/S-02 均按它实现，不再各写一份 |
| P2 | 全局清单定稿 | **11 个 `RECALL_*` + `TOKEN_MODEL_FORBIDDEN`（共 12）**；配置键与默认值；文档计数 5 处位置清单 | 清单落进设计文档 §4.4/§3.2/§7，实施期只读 |
| P3 | 公共代码改动（**风险最高的一项**） | `find-targets.ts` 抽出 `resolveScopeSet(bases, extras, deps)`，`resolveFindTargets` 改为调用它（行为等价） | ✅ **已完成 2026-11-18**：`tsc --noEmit` 0、`npm run build` 0；回归 81 例全绿（refs-sr05 11 / refs-sr05-search 17 / create-event-refs 6 / event-refs-upload 11 / governance-refs-route 3 / governance-routes 14 / find-config 6 / refs-multi-scope 11）；`test/chat/prompt-config-routes` 3 例失败经 **stash 基线对照确认为既有**（非本次引入）。**尚未提交**，待与本需求其余改动一并确认 |
| P4 | 横切约定 + 非功能预算 | 日志前缀 `[recall]`（字段：principalKey/scopes/taskChars/candidates/channel/durationMs/cached）；超时 20s（fast）/45s（deep）；并发 4；配额 20/min；targets ≤6；候选 ≤8 | 写进 `src/lib/recall/log.ts` 与 `limits.ts` 的注释头，实施期不再讨论 |
| P5 | 权限模型 | ① `scope` 必填且逐项过 `tokenScopes`；② `ki_recall` 对只读 Token **不可见**（注册层）+ 不可调（`MODEL_CONSUMING_TOOL_NAMES`）；③ hidden 文档不召回；④ 越权错误语义（`RECALL_SCOPE_FORBIDDEN` vs `RECALL_SCOPE_UNKNOWN`） | 4 条各配一条负向用例，进 S-02 的 V1/V7 |
| P6 | **R0 试点语料就绪** | 10 个真实任务（含 5 例命中 / 5 例未命中），每例标注「真正该读的文档」 | ✅ **已完成 2026-11-18**：`reference/recall-corpus.md`（H1~H5 命中组 / M1~M5 未命中组 + 双侧判据 + 实测记录表） |

**前置层门禁**：P3 未通过回归前不得开始 S-01（否则在一个"可能已被改坏"的范围解析上开发）；**P6 未就绪前不得开始第 2 批**（V5 无判据）。

## 1.5 前端视觉基线

无（本次不涉及前端页面，`docs/` 与 skill 文档不属于界面）。

## 2. 批次表

| 批 | 工作项 | 层级 | 承接验收项 | 并行 | 串行原因 | 基线 |
|---|---|---|---|---|---|---|
| 第 0 批 | P1~P6 | 前置 | —（P5 的 4 条负向用例进第 2 批 V1/V7；P6 供 V5） | — | — | HEAD |
| 第 1 批 | **S-01 召回内核**（`src/lib/recall/{types,codes,keywords,targets,fast-recall,assemble}.ts` + `test/recall-kernel.test.ts`） | 根 | V6（同名提示）/ V7（不漏名）的内核侧；中文切分 ≥3 线索、同输入可复现 | — | — | ✅ **已完成 2026-11-18**：`tsc` 0 / `build` 0 / 单测 **16/16**；实现期修掉「视图名直接做 IO ⇒ 命中全丢」的缺口（改为 `physicalTargets` 展开） |
| 第 2 批 | **S-02 ki_recall 工具**（`mcp-tools/recall.ts` + `limits.ts` + `log.ts` + `engine-search.ts` + 配置 schema + 工厂/准入/能力表 + 文档计数 5 处） | 业务 | V1~V7 全部 | — | 实现级依赖 S-01（`runFastRecall` 真实实现未完成前只能 mock，mock 契约不全过） | ✅ **已完成 2026-11-18**：`tsc` 0 / `build` 0；`recall-tool` **11/11**、`recall-kernel` 16/16、`capability-coverage` 4/4、`mcp-token-readonly` 28/28；`mcp-http` 1 例失败经 stash 基线对照确认为既有（healthz 事件循环延迟断言） |
| 第 3 批 | **S-04 引导与文档**（`skills/task-recall` + AGENTS.md「第三原则」+ `ki_search`/`ki_ask` 描述追加 + `docs/agent-integration.md` 节 + 工具计数 5 处） | 业务 | A1~A6 | — | 文档级依赖 S-02：调用示例、错误码、可用清单必须匹配最终 schema | ✅ **已完成 2026-11-18**：A5 通过（`docs/mcp-tools.md` 含 `ki_recall`、5 处计数均为 24）；`tsc`/`build` 0；回归 6 个文件全绿。**A1~A4 / A6 需真机抽样**（重启 daemon 后由 agent 实际调用） |
| 二期 | S-03 深度通道 | 业务 | 另立需求 | — | 依赖 S-02 真机数据（V5 是否值得再加一条通道） | — |

**本可并行但本次串行**：S-01 与 S-04 在代码层面互不接触（S-04 只写文档），理论上可同批；但 S-04 的调用示例依赖 S-02 的最终 schema，单独并行会写出"示例与实现不符"的文档，收益不抵返工。

## 3. 每批检查点

① 上批契约测试全绿 ｜ ② 契约是否需修订（**仅此处可改**，改则回填设计文档并通知后续批次） ｜ ③ 主干可编译可运行（`tsc --noEmit` + `npm run build`）

## 4. 完成判据（一期整体）

| 判据 | 方式 |
|---|---|
| 设计里的 12 个错误码（11 `RECALL_*` + `TOKEN_MODEL_FORBIDDEN`）各有一例 | S-02 V1 |
| V5 质量验收 ≥7/10 | ✅ **2026-11-18 实测 9/10**（命中组 5/5、未命中组 4/5）：`reference/recall-corpus.md` §5。**已做 MCP 交叉验证**（daemon 重启后经真实 `ki_recall` 复跑 10 例，结果与本地逐条一致）。**两点保留**：① M5 仍误报（字面像、语义不同）；② 执行者是 S-01/S-02 的实现者本人，**不满足语料的独立性要求**，需第二人复核后才是正式结论。达标前修了三处（强/弱线索分离、双路并行交替合并、相关性分级与下限），逐轮数据见语料 §5 |
| 「AI 查找」行为无变化 | 第 0 批 P3 回归 + 第 2 批全量回归 |
| 文档一致 | `grep -c ki_recall docs/mcp-tools.md`，5 处 23→24 全改 |
| agent 真会用 | S-04 A1/A2/A3 抽样 |

## 5. 风险与回滚

| 风险 | 触发信号 | 回滚 / 备选 |
|---|---|---|
| P3 抽 `resolveScopeSet` 改坏 find | 「AI 查找」测试失败或库统计口径变化 | 直接回滚该提交；S-01 自带一份范围解析（放弃复用，代价约 60 行重复） |
| V5 不达标（候选没用） | 人工标注 <7/10 | **不进入第 3 批**；先调 `tokens` 规则与 `topK`，最多两轮；仍不达标则回退到「纯 skill + `ki_search`」方案 |
| 文档计数漏改 | `grep -rn "23 个"` 有残留 | 第 2 批检查点强制跑该 grep |
| 配额过严导致 Agent 放弃预取 | 审计日志 `RECALL_THROTTLED` 占比 > 10% | 调 `recall.throttlePerMinute`（配置项，不改代码） |

## 6. 三问自查

① **谁必须先行** → 前置层 P1~P6（尤其 P3 的回归、P6 的语料）✅
② **哪些能同批、不能的为什么** → 单窗口串行，三条串行原因分别为「实现级依赖 S-01」「文档级依赖 S-02」「二期依赖真机数据」；并显式标注 S-01 ∥ S-04 本可并行 ✅
③ **本次是并行还是串行** → 单窗口串行（共享面 5 处，任一处漏改会静默错）✅
