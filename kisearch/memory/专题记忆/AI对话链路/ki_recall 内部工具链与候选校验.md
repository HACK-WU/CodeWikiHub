---
groupPath: 专题记忆/AI对话链路
relation: ki_recall 内部工具链与候选校验
exportedAt: "2026-11-25T03:09:35.254Z"
---
`ki_recall` 内部是一个多轮 function-calling 小循环：模型自己决定调哪个工具，但工具是**进程内直调实现函数**（不走 MCP transport，也不回环调自身）。循环内核 `runGroundedRecall`，工具映射在 `makeRecallToolRunner`。

**工具白名单（5 个只读，`RECALL_TOOL_GROUPS`）**：`ki_search`（→executeSearch，hybrid/fulltext）、`ki_get_module_info`（→executeGetModuleInfo，核心，锁定不可关）、`ki_group_list`（→executeQueryGroup）、`ki_scope_list`（→返回本次 targets，不是全库清单）、`ki_tag_list`（→executeTagList）。

**没有的**：`fs_*`（不读源码目录）、任何写工具、`ki_ask`（避免递归与成本）、`ki_get_image`。

**约束**：
1. 模型传的 `scope` 一律被覆盖——runner 注入 targets，`ki_search` 直接用 `targets.join(',')`，`pickScope()` 只认 targets，防模型扩范围；
2. 白名单校验：非本次启用的工具回 `{"error":"工具未启用"}`，仍要回 tool 消息；
3. 结果按 toolChars（默认 8000）截断并告知“已截断”；
4. 默认 maxRounds=5；轮次用完但模型还在调工具时补一次**不带工具**的收口轮，逼它输出 JSON；
5. 候选后处理（防编造）：只有本次真读过正文的进 `evidence:'full'`，只读到片段的降级 `snippet`，没读过的直接 dropped；exclude 命中的也 dropped。

→ 所以返回给调用方的 candidates 是“读过并被程序核验过”的，不只是模型自述。

- 位置: `src/lib/recall/run-recall.ts`、`src/lib/recall/tool-runner.ts`、`src/lib/chat/prompt-config.ts`（RECALL_TOOL_GROUPS）