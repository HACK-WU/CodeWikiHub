---
groupPath: 项目架构
relation: AI对话上下文上限的可配置写通路
exportedAt: "2026-10-14T02:42:03.743Z"
---
# AI 对话上下文上限（2026-10-14 · REQ-20261014-001，**已按用户裁决改为两层存储**）

## 存储与优先链（改动的核心）
生效值 `contextChars` = **用户覆盖值** ?? **部署默认** ?? 内置 1000K：
1. `{chatDir}/prompt-config.json` 的 `contextChars`（**用户覆盖**；**缺省 = 未覆盖**，字段不落盘）
2. `{chatDir}/config.yaml` 的 `llm.contextChars`（**部署默认**，运维级；本机默认未设 → 走内置）
3. `CHAT_BUDGET.defaultContextChars = 1_000_000`（= 1000K，**K = 1000 字符**）

**用户裁决（2026-10-14）**：`config.yaml` 只作默认值，**界面改的值不得写 config.yaml**，单独存。为此：
- **已撤销** `PUT /api/chat/config`（曾实现的受限单字段写通路）—— 现在该路径 PUT → 404。
- 写通路回到既有的 `PUT /api/chat/prompt-config`（整体替换语义，`PT`校验由 `normalizePromptConfig` 强制）。
- ⚠️ **`patchLlmConfigField` 仍存在且只服务 `POST /api/chat/config/ack`**（隐私确认写 `llm.kbDisclosureAck`）—— 它是现在唯一会写 config.yaml 的 HTTP 通路。

## 语义边界（最易误用，先看这条）
`contextChars` **只作上下文占比的分母与预警阈值基准**（≥80% 黄 / ≥90% 红），**不参与**截断 / 拒绝 / 自动压缩。
- 唯一读取点（算生效值）：`chat-routes.ts::handleConfigGet`（`readPromptConfig` + `resolveLlmStatus` 组装）。
- 契约注释明写「前端只用它作占比分母，**不得**当作模型真实窗口（模型按 token 计）」（`chat-contract.ts`）。

## 接口形态
- `GET /api/chat/config`：`contextChars`（**生效值**）、`contextCharsDefault`（部署默认，供「恢复默认」）、`contextCharsOverridden`（是否覆盖）。旧 daemon 不返后两者 → 前端回退。
- `GET /api/chat/prompt-config`：`contextCharsDefault`（顶层）+ `limits.contextCharsMax`（硬上界 `CONTEXT_CHARS_MAX = 1 亿字符`，它从 chat-routes 移到了 **prompt-config.ts**）。
- 前端「对话配置」层「上下文窗口」分组（位置：**Skill 与「工具与权限」之间**）：K 输入 + 「恢复默认」；**无独立「应用」按钮**，与其余项一起走层主「保存」。

## 前端实现要点（三个坑）
1. **`cloneConfig` 是白名单式拷贝** —— 可选字段必须显式搬运，否则「改 skill 然后保存」会把用户的覆盖值静默清掉（已修，并在端到端 E2 加锁）。
2. **输入框文本只在「基线变化」时同步**（`useEffect([data])`），不能随草稿逐字符同步 —— 否则用户输 `5000` 到 `500` 时会被归一化打断。
3. **「恢复默认」= 删掉 `contextChars` 键**（回到部署默认），**不是**写 1000K；空输入框等价于未覆盖。

## 验证锚点
- 后端 `test/chat/context-limit-config.test.ts`（23 例）：★②c/③c/⑤/⑥a/⑧/Z 断言 **config.yaml 逐字节不变**；④ 锁定「对话配置是整体替换，调用方必须带全字段」。
- 前端 `web/test/context-limit-config.test.mjs`（22 例）：换算（拒 `1e3`/`0x10`/`1000K`）、往返一致、极值提示不拦截。
- 端到端 `temp/verify-context-limit-config.cjs`（38 项）：A2/F3 位置在「工具与权限」上方（DOM 顺序）、B3/Z1 config.yaml 逐字节不变、B6 不刷新即生效、C5 恢复默认回部署默认 6000、E2 草稿不丢字段。
