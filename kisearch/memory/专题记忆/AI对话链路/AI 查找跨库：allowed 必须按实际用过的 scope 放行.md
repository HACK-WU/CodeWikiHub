---
groupPath: 专题记忆/AI对话链路
relation: AI 查找跨库：allowed 必须按实际用过的 scope 放行
exportedAt: "2026-11-25T07:06:40.255Z"
---
2026-11-25 用户口径：**「AI 查找」也能看其他库的内容，与 ki_recall 一致**。

接线分三步（前两步上一轮已做，第三步是本轮真正的卡点）：
1. `DeepFindDeps.tokenScopes` 由 `governance-http` 传 `ctx.authScopes ?? null`；
2. `deep-find-core` 用 `makeScopeResolver` 注入 `resolveScope` + `scopeCatalog`（与 `ki_recall` 同一份），并把 `buildScopeNote` 拼进 systemPrompt；
3. **`allowed` 集合必须按实际用过的 scope 动态扩展** —— 这是“看起来不支持换库”的真因：
   候选过滤第一步是 `if (!allowed.has(src))` （越界剔除），而 `allowed` 原只装 `args.targets`（事件库）→ 模型换了库、读了正文、给了候选，**全部在这里被判 `out-of-scope` 丢掉**。修法：`grounded.scopesUsed` 里的每个库（含视图展开成员）也加进 `allowed`。

**真机（事件 #76，临时在提示词加“必须去 kisearch 库查 type-service”的引导）**：15 次工具调用里 **4 次 `ki_search` 显式传 `scope=kisearch`**，37.7s —— 跨库检索已真实发生；模型本次只在本库读正文，故结果仍是 3 条本库候选（`unconfirmed=0`，没有误判）。引导词验完后已恢复（提示词 924 字 / edited=false）。

**回归测试**：新增 `test/events/find-scope-switch.ts` 2 例——① 传 `tokenScopes` 时跨库候选必须保留（不得判越界）；② 不传时跨库候选仍按越界剔除（旧行为不被无意放开）。

⚠️ 同样口径适用于 `ki_recall`：它的 `scopesUsed` 已回显到出参与日志（无候选过滤环节，故不需要 allowed）。

- 位置: `src/lib/events/deep-find-core.ts`（allowed 放行）、`src/lib/events/find-service.ts`、`src/lib/recall/tool-runner.ts`（makeScopeResolver）
- 相关: REQ-20261125-001、事件 #3（已收敛）