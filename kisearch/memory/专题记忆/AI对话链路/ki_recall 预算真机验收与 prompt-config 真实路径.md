---
groupPath: 专题记忆/AI对话链路
relation: ki_recall 预算真机验收与 prompt-config 真实路径
exportedAt: "2026-11-25T04:05:16.465Z"
---
**真机验收（2026-11-25，A 方案落地后）**：`ki_recall` 的工具调用预算确认端到端生效。

| 配置 | rounds | candidates | partial | 用时 |
|---|---|---|---|---|
| 15（基线） | 5 | 4 | false | 18.9s |
| 2（收紧） | 2 | 2 | true | 8.2s |
| 15（恢复，双 scope） | 6（含收口轮） | 2 | false | 24.1s |

结论：\n1. `find.maxToolCalls` 真被读到（真实配置 `/root/chat/prompt-config.json`，值 15）；\n2. 预算文案真注入系统提示词（`## 工具调用预算` 在 `## 输出格式` 之前，次数与配置一致）；\n3. **改配置无需重启 daemon** —— 每次 `executeRecall` 都 `readPromptConfig` 读盘，三次调用之间未重启即生效；\n4. 删掉 `PromptConfig.recall` 域后 `GET /api/chat/prompt-config` 无 recall 键、limits 无 recall 键，daemon 无异常。\n\n⚠️ **踩坑：prompt-config.json 的真实路径**\n`resolveDefaultChatDir(dataDir) = path.join(path.dirname(dataDir), 'chat')`（`src/lib/config.ts:88`）—— dataDir=`/root/.ki-data` 时真实路径是 **`/root/chat/prompt-config.json`**，不是 `/root/.ki-data/chat/`。后者是**陈旧残留**（内容只有 version+analysis），改它完全不生效、且看起来一切都正常（读到的是默认值），极容易误判为「配置没生效」。真要改配置前先打印 `promptConfigPath(loadConfig())` 核对。\n\n常见假象：读取路径对非法值走软通道（写 `softNotes` 后忽略），例如超出 2~30 的次数会被静默丢弃并回落默认 15 —— 表现为「我改了但没变」，实际是值非法。