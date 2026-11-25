---
groupPath: 专题记忆/AI对话链路
relation: 检索范围：默认值 vs 自选（提示词 + 系统段 + 两侧对齐）
exportedAt: "2026-11-25T06:58:47.070Z"
---
2026-11-25：把「scope 只是默认值，可自选」从**代码隐式行为**变成**用户可见的提示词规则 + 两侧一致的运行期能力**。

**基础提示词新增节**（`DEFAULT_FIND_PROMPT`，find 域共用）：「## 检索范围（默认值 ≠ 只能查这里）」——① 传入 scope 只是默认，工具不写 scope 时用它；② 可按问题自己决定每次调用查哪个库/视图；③ 可用库与本次默认范围在系统提示的【检索范围】里（程序按授权生成），以那段为准；④ 传错会直接报错并列出可用项，不会回落。

**系统段**：`buildScopeNote()`（recall-prompt.ts）由代码追加，带本次**动态**清单（默认范围 / 可用库 / 可用视图+成员 / 不支持换库时明说）。顺序：基础提示词 → skill → 范围 → 预算 → 输出格式。

**两侧对齐（关键）**：解析器抽为 `makeScopeResolver()`（`recall/tool-runner.ts`），`ki_recall` 与「AI 查找」共用同一份（存在性 + 授权 + 视图展开 + 错误文案）；开关口径统一为「**调用方显式传 `tokenScopes`（含 null）才开启**」，不传 = 范围锁定（旧调用/单测不受影响）。`DeepFindDeps.tokenScopes` 由 `governance-http` 传 `ctx.authScopes ?? null`。

**真机（事件 #76，流式）**：13 次工具调用**全部显式传了 scope=kisearch-memory**（= 默认范围，未越界），29.8s、4 候选；说明模型真读到了范围说明（否则不会主动传参，且旧 schema 里 ki_search 无 scope 字段）。

- 位置: `src/lib/chat/prompt-config.ts`（DEFAULT_FIND_PROMPT）、`src/lib/recall/recall-prompt.ts`（buildScopeNote）、`src/lib/recall/tool-runner.ts`（makeScopeResolver）、`src/lib/events/deep-find-core.ts`、`src/lib/events/find-service.ts`、`src/lib/events/find-runner.ts`、`src/lib/governance-http.ts`
- 相关: 事件 #2/#3（已收敛）、REQ-20261125-001