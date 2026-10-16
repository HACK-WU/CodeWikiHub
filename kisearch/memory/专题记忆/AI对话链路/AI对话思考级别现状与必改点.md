---
groupPath: 专题记忆/AI对话链路
relation: AI对话思考级别现状与必改点
exportedAt: "2026-10-16T02:50:08.502Z"
---
# AI 对话思考级别（reasoning effort）现状与必改点

## 现状：完全不下发该参数（§结论）
- 请求体组装：`src/lib/chat/llm-client.ts:267-282` → `{model, messages, stream, stream_options}` + 可选 `tools` / `temperature` / `max_tokens`；**没有任何思考级别字段**。
- 配置段：`src/lib/config.ts:171-205`（LlmConfig）/ `src/lib/config-schema.ts:207-227`（字段白名单）—— 同样没有该字段。
- 上游 `reasoning_content` 已被完整支持：`llm-client.ts:468-470` → `reasoning` 事件（仅转发、**不落盘 D7**、**永不进 messages N12**）→ 前端折叠展示 `web/src/chat/ChatPanel.tsx:2555`（`ReasoningBlock`）。
- ⇒ 「不配置思考级别」= 完全不下发、走上游默认档，**不是**关闭思考。

## 若要新增该配置（REQ-20261016-001 的落点）
- **装配点只有一处**：`src/lib/chat/retrieval/tool-loop.ts:137-146` 的 `resolveRuntime()`；消费两处：`:577-583`（工具路径 llmOpts）、`:862-873`（预检索降级路径）。
- 压缩摘要走**独立参数块**：`src/lib/chat/compaction.ts:85-96`（读 `cfg.llm`，**不读**对话配置覆盖）⇒ 是否继承需显式定死。
- 三级链先例：`prompt-config.ts:158-190`（用户覆盖值）→ `config.yaml` 的 llm 段（部署默认）→ 内置默认；「恢复默认」= 删覆盖值。
- ★ **双白名单拷贝坑（必改点）**：前端 `web/src/chat/PromptConfigLayer.tsx:61-72` 的 `cloneConfig` 是白名单拷贝；服务端 `normalizePromptConfig`（`prompt-config.ts:302-467`）同为白名单，且 `savePromptConfig` 用归一化结果**整体覆写**文件 ⇒ 新增覆盖值漏加入任一处，会在用户保存其它配置时被**静默清除**（contextChars、工具预算已各踩一次）。
- 下发通道先例：`GET /api/chat/config`（`contextCharsDefault` 范式）与 `GET /api/chat/prompt-config`（`limits` + `defaults` + `toolGroups`，`chat-routes.ts:578-613`）。
- 配置热生效：`loadConfig` 按 stat 指纹失效（`config.ts:314-336`）+ 请求级配置快照 ⇒ 改 `config.yaml` **无需重启 daemon**。

## 轮次叠加（成本/延迟）
- `DEFAULT_MAX_TOOL_ROUNDS = Number.POSITIVE_INFINITY`（`llm-client.ts:67`）+ `tool-loop.ts:585` 的 `while(true)` ⇒ 单次提问可发起多轮上游请求，**每轮都带同一档位**，代价按轮次叠加。