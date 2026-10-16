---
id: REQ-20261014-001
feature: AI对话上下文上限可配置
status: 已完成
created: 2026-10-14
updated: 2026-10-14
version: 2
tags: [feat, ux, config]
depends_on: [REQ-20261013-001]
author: AI
document_type: requirement
---

# PM 报告：AI 对话上下文上限可配置

- **模式**：M1 需求定义（一次成型档）
- **触发**：用户提出「当前 AI 对话中，默认上下文是 1000K。当前是默认的。我希望可以在配置中进行调整。默认为 1000K。」并附上下文窗口面板截图（`1.7% 已用 · 17.2K / 1000.0K`）。
- **证据声明**：最高等级 **🟢**；取证方式 = **代码直读 + 本机配置文件实读 + 用户上传截图**。
  - 代码直读（🟢）：`src/lib/chat/*`、`src/lib/config*.ts`、`src/lib/chat/chat-routes.ts`、`web/src/chat/*`、`web/src/lib/contextUsage.ts`、`web/src/router/routes.tsx`
  - 本机实读（🟢）：`~/.ki/config.yaml`（密钥已排除）；`req` 需求体系配置
  - 用户上传截图（🟢）
  - **降级说明**：无 `🔴` 进结论区；落点与存储取舍属设计判断，标 `🟡` 并进待确认（§5）。

---

## 0. 关键结论（先读这一段）

### 0.1 能力已存在，「配置入口」不存在 —— 缺口在最后一个 mile

- 配置项**已经实现**：`llm.contextChars`（`src/lib/config-schema.ts:225`，v3 / REQ-20261013-001），默认值 = `CHAT_BUDGET.defaultContextChars = 1_000_000` = **1000K**（`src/lib/chat/chat-contract.ts:424`）。🟢
- **本机当前状态已实测**：`~/.ki/config.yaml` 的 `llm` 段**没有** `contextChars` 字段（只有 `baseURL / model / apiKey / kbDisclosureAck`）⇒ 正在使用默认 1000K，与用户描述"当前是默认的"完全一致。🟢
- ⇒ **今天就能改**：在 `~/.ki/config.yaml` 的 `llm:` 下加一行 `contextChars: 500000`（= 500K）即可；配置走 mtime + size 指纹热失效（`src/lib/config.ts:281-330`），**不需要重启 daemon**。🟢
- ⇒ 因此本需求**不是"新增能力"，而是"把已有配置项搬到用户面前"**。成本集中在前端表单 + 一条受限写通路。

### 0.2 缺口的四处证据（全项目没有任何入口能改它）

| 通道 | 现状 | 证据 |
|---|---|---|
| 前端「对话配置」层 | 只有 3 组：基础提示词 / Skill / 工具与权限，**无 LLM 参数** | `web/src/chat/PromptConfigLayer.tsx:143,169-265` 🟢 |
| 前端其它页面 | **无设置页**（路由只有 `/ /browse /search /import /write /tasks /chat`） | `web/src/router/routes.tsx:12-24` 🟢 |
| HTTP | 唯一能写 `config.yaml` 的是 `POST /api/chat/config/ack`，**写死单字段** `llm.kbDisclosureAck` | `src/lib/chat/chat-routes.ts:486-527` 🟢 |
| CLI | `ki config` 只有 `init`，**无 `set` 子命令** | `src/config.ts:201-221` 🟢 |

### 0.3 这个值的语义必须在 UI 里说清（否则做出来会被误用）

`contextChars` **只作占比分母与预警基准**（≥80% 黄 / ≥90% 红），**不参与任何截断、拒绝或自动压缩**：

- 全仓**唯一读取点**：`src/lib/chat/llm-client.ts:120`（`contextChars: llm.contextChars ?? CHAT_BUDGET.defaultContextChars`），只进 `GET /api/chat/config` 响应体。🟢
- 契约注释明写：「前端只用它作占比分母，**不得**当作模型真实窗口（模型按 token 计）」（`src/lib/chat/chat-contract.ts:387-391`）。🟢
- 反证：全仓无 `autoCompact / shouldCompact / 超出上限 / exceeds` 分支；真正裁剪上下文的是另一组常量（`CHAT_BUDGET.maxToolResponseChars` = 10000 等）。🟢

⇒ **调整它 = 调整"读数刻度"与"预警何时出现"，不改变 AI 实际能承载多少内容。** 这必须在配置项文案里交代（R5），否则用户会以为自己在设置模型窗口。

### 0.4 必须一并修的现存缺陷：改了不会立刻生效

前端 `getChatConfig()` 只在 `ChatPanel` **挂载时拉一次**（`web/src/chat/ChatPanel.tsx:608-624`，依赖数组 `[]`）。即使把入口做出来，用户改完**不刷新页面看不到任何变化** —— 属静默失败，与项目"fail-loud"哲学冲突。→ 进 R3（P0）。

---

## 1. 执行摘要

1. 需求本质是「**把已有配置项搬到用户面前**」：后端零计算逻辑改动，成本在前端表单与一条**受限写通路**。🟢
2. 语义边界必须定调：调整它只影响**百分比读数与预警时机**，不影响 AI 实际可用上下文（§0.3）。🟢
3. 落点有 3 个候选，推荐 **在「对话配置」层新增「上下文窗口」分组**：该层 footer 已声明「作用域：全局」（`PromptConfigLayer.tsx:275`），与 `contextChars` 的全局性语义一致。🟡（设计取舍，需拍板）
4. 存储归属存在真实分叉：`config.yaml`（现有 SSOT） vs `prompt-config.json`（对话配置层存储）。**推荐保持 `config.yaml` 为 SSOT**，理由：`llm` 段已含 baseURL/model/apiKey，把窗口单拎出去会让"同一模型的参数分家"；且既有测试已断言"配置可覆盖上限"（`test/chat/context-usage.test.ts:249-261`）。**需拍板**（D2）。
5. 若并入该层主「保存」按钮，会产生**跨文件部分失败**（一次点击写两个文件，一个成功一个失败无法原子化）→ 推荐该分组**自带独立「应用」按钮**（D3）。
6. 已知现成实现范式：`handleConfigAck` 已把「读 yaml → 就地改字段 → `atomicWriteConfig`（保留 0600）→ `resetConfigCache`」跑通（`chat-routes.ts:498-519`），写通路可照此收敛扩展。🟢

---

## 2. 现状与范围

### 2.1 走查边界

- **界面**：AI 对话面板（`/chat` 独立页与全站抽屉共用 `ChatPanel`）——上下文环形指示 + 明细面板（截图对象）、「对话配置」层。
- **数据面**：`~/.ki/config.yaml` 的 `llm` 段、`GET /api/chat/config` 响应、前端 `ctxLimit` 消费链。
- **不在范围**：模型真实 token 窗口的探测/换算（项目已决策不做 tokenizer）、费用金额（D16）、每会话独立上限（见 A2）。

### 2.2 消费链路事实（决定"改一个值要动哪些地方"）

| 环节 | 位置 | 说明 |
|---|---|---|
| SSOT 默认值 | `chat-contract.ts:424` | `defaultContextChars: 1_000_000`（K = 1000 字符） |
| 配置校验 | `config-schema.ts:225` | `positiveInt`，非法值在配置加载期即告警 |
| 配置解析 | `config.ts:609` | `rl.contextChars !== undefined ? Number(...) : undefined` |
| 兜默认 + 组装 | `llm-client.ts:120`（未就绪分支 `:78`） | → `toChatConfigOk`（`:125-140`） |
| HTTP | `chat-routes.ts:344-348` → `:470-477` | `GET /api/chat/config`（**只读**） |
| 前端取值 | `chatApi.ts:113-115` → `ChatPanel.tsx:608-614` | 挂载时一次 → `ctxLimit`（`:486`） |
| 展示 | `ChatPanel.tsx:1704-1717`（hero）、`:1742-1757`（分布表）、`:1617-1621`（环） | 分母 = `ctxLimit`，因此**改上限会重算所有历史消息的占比** |
| 预警 | `contextUsage.ts:32-34,79-85` | 0.8 黄 / 0.9 红；忽略记忆存 localStorage（`:154`） |

---

## 3. 发现 / 需求

### 3.0 影响面（关联功能与影响评估）

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需用户拍板 |
|---|---|---|---|---|---|
| 上下文面板百分比 / 环形 / 分布表占比 | 展示 | 无感（分母变化，历史消息占比按当前分母重算） | `ChatPanel.tsx:486,1704-1757` | 无需改；但须确保改后立即重拉（R3） | 否 |
| `getChatConfig()` 挂载时只拉一次 | 流程 | **降级**（改完不刷新无变化 = 静默失败） | `ChatPanel.tsx:608-624` | **必须一并修**（R3），否则功能白做 | 否 |
| 预警忽略记忆（localStorage 按 会话×档位） | 状态 | 无感 | `contextUsage.ts:154` | 上限变化可能让"已忽略"档位再次出现 —— 可接受 | 否 |
| 后端 `llm.contextChars`（既有 SSOT） | 数据 | 无感（schema / 测试已就绪） | `config-schema.ts:225`、`context-usage.test.ts:249-261` | 保持 SSOT，**不搬迁** | **是**（D2） |
| `prompt-config.json`（对话配置层存储） | 数据 / 契约 | 若并入该文件 → 契约变更 + llm 参数分家 | `prompt-config.ts:210-214,385-397` | 建议**不改其契约**，单开字段通路 | **是**（D2） |
| `config.yaml` 写通路的安全面 | 权限 / 外部契约 | **新增能力**（现仅 ack 单字段可写） | `chat-routes.ts:486-527` | 白名单收敛到 `llm.contextChars`；复用 `atomicWriteConfig` 保 0600 | **是**（D3） |
| 配置文件的其它使用者（CLI / 手改 yaml） | 数据 | 无感（last-write-wins） | `handleConfigAck` 同语义 | 文档说明即可 | 否 |
| 既有测试断言 | 测试 | 无感（已覆盖"配置可覆盖上限"） | `test/chat/context-usage.test.ts:258-261` | 复用，新增写通路用例 | 否 |

> `⚪ 未发现`：未发现外部订阅方 / 报表 / webhook 消费 `contextChars`（该字段不出现在对外 API 文档的写接口中）。

### 3.1 需求清单

| 编号 | 需求 | 优先级 | 预期效果 | 验收标准 |
|---|---|---|---|---|
| R1 | 在「对话配置」层新增「上下文窗口」分组：展示当前值（K 单位，与面板同口径）并允许修改 | P0 | 用户不必手改 yaml | 打开配置可见当前值；改后保存成功；面板分母随之变化 |
| R2 | 默认值可见与「恢复默认」 | P0 | 明确默认口径 = 1000K | 未配置时显示 1000K 并标注"默认"；点恢复默认 → 值回到 1000K |
| R3 | 保存后**立即生效**（重拉 `/api/chat/config`，刷新分母与预警档位） | P0 | 消除"改了没反应" | 保存后**不刷新页面**，面板分母即刻变化 |
| R4 | 后端新增**受限写通路**：只允许 `llm.contextChars` 一个字段；白名单 + 现有 schema 校验 + `atomicWriteConfig` + `resetConfigCache` | P0 | 能持久化且不污染其它配置 | 写成功返回新值；非法值 400 附人话原因；写失败 500 且**文件未改动** |
| R5 | 语义文案：「仅用于占比与预警的字符口径上限，不是模型 token 窗口」 | P1 | 防误用 | 配置项旁有说明；明细面板同样可见 |
| R6 | 输入校验与防呆提示（正整数 / 建议范围 / 极小或极大值提示） | P1 | 防呆 | 0 / 负数 / 非数字被拒并给原因；极小值提示"将立即显示为高占比，不影响 AI 实际能力" |
| R7 | 上下文明细面板内给出可发现性入口 | P2 | 用户知道去哪改 | 明细面板出现"上限可在对话配置中调整" |
| R8 | CLI `ki config set llm.contextChars <n>` | P2 | 覆盖不开前端的场景 | 命令可读可写；非法值 fail-loud |

**"需配套改"项已进清单**（不是只写在影响表里）：R3 = `getChatConfig()` 时机缺陷、R4 = 写通路缺口、R5 = 语义缺失。

### 3.2 负向需求

| 场景（negative-requirement 分类） | 处理要求 |
|---|---|
| **参数错误**：0 / 负数 / 非数字 / 空串 | 前端内联拦截 + 后端 `positiveInt`（`config-schema.ts:225`）→ 400 附人话原因，不得静默落默认 |
| **极小值**（如 1000 = 1K） | 保存后立刻 100% 红 + 预警条刷屏；文案须说明"这只会让读数变红，不改变 AI 实际能力"，避免用户以为弄坏了 |
| **极大值**（如 10⁹） | 占比永远 `0.0%` ⇒ **预警静默失效**；需上限或明确提示（fail-loud） |
| **保存后不生效** | 由 R3 兜底；不得依赖用户手动刷新 |
| **写失败**（只读 FS / 权限 / 磁盘满） | fail-loud：复用 `CHAT_WRITE_FAILED`（`chat-routes.ts:484`），错误文案须明确"配置文件未改动" |
| **配置被外部同时修改** | last-write-wins（与既有 ack 通路同语义）；须在文档或文案交代 |
| **改坏全局配置** | 写前用现有 schema 校验，避免污染 `llm` 段其它字段（尤其 apiKey） |
| **中途放弃**（改了没保存） | 复用层内草稿语义：取消即回滚，无需额外设计 |
| **状态异常**：daemon 未运行 / 配置缓存未刷新 | 写成功后必须 `resetConfigCache()`（`chat-routes.ts:519` 先例） |

---

## 4. 优先级排序

| 优先级 | 条目 | 来源 | Kano 分类 | 价值 | 成本 | 证据 | 建议方向 |
|---|---|---|---|---|---|---|---|
| **P0** | R1 + R2 + R3 + R4（可调 + 默认 + 立即生效 + 写通路） | M1 | 期望（依据：用户原话明确要求"可以在配置中进行调整"） | 高 | 中 | 🟢 | **一次做完**：拆开会产生"能改但不生效"的半成品 |
| **P1** | R5 语义文案 | M1 | 必备（误用会直接导致错误预期） | 高 | 低 | 🟢 | 与 R1 同批落地 |
| **P1** | R6 校验防呆 | M1 | 必备（无校验 = 静默失效路径） | 中 | 低 | 🟢 | 与 R1 同批落地 |
| **P2** | R7 可发现性入口 | M1 | 期望 | 中 | 低 | 🟡 | 可延后 |
| **P2** | R8 CLI `config set` | M1 | 无差异（目标用户有前端） | 低 | 低 | 🟢 | 可延后 |

**排序理由**：R1–R4 共同构成"可用"的最小闭环；R5/R6 低成本且直接决定不被误用；R7/R8 是体验增益，不阻塞。
**P0 校验**：P0 条目价值=高且成本=中，且为用户显式要求 ⇒ 符合 P0 判据。

---

## 5. 待确认清单（需用户拍板）

| # | 待确认项 | 选项 | 推荐 |
|---|---|---|---|
| **D1** | 「配置」的落点 | (a) 对话配置层新增分组 (b) 上下文面板内联编辑 (c) 仅 CLI | **(a)** —— 该层已是"全局对话配置"的既有语义（`PromptConfigLayer.tsx:275`） |
| **D2** | 存储归属 | (a) 保持 `config.yaml` 为 SSOT + 新增受限写通路 (b) 值搬进 `prompt-config.json`（后者优先于前者的回退） | **(a)** —— 避免"同一模型参数分家"，且既有测试与 schema 已就绪 |
| **D3** | 保存事务 | (a) 该分组自带独立「应用」按钮（只写 config.yaml） (b) 并入层主「保存」（一次点击写两个文件） | **(a)** —— (b) 无法保证跨文件原子性，易出现"提示成功但一半没写" |
| **D4** | 语义范围 | (a) 仅占比与预警口径（现状） (b) 还要它**参与真实截断 / 自动压缩** | **(a)** —— (b) 会把需求从"配置项"升级为"上下文管理策略"，需另立需求 |
| **D5** | 是否要 R8（CLI set） | 要 / 不要 | 先不做，需要时另立 |

> **验证方法（D2 若选 (b)）**：需回归 `test/chat/context-usage.test.ts:249-261`（现断言 `config.yaml` 的 `llm.contextChars` 生效），并新增优先级用例。

---

## 6. 关键假设

| 假设 ID | 内容 | 错了会怎样 | 验证方法 |
|---|---|---|---|
| **A1** | 用户所说的「配置」= 前端「对话配置」层 | 若指 `~/.ki/config.yaml`，则**需求已满足**、无需开发（只需文档说明） | 用户确认（本报告唯一确认点） |
| **A2** | 该上限是**全局单值**（非每会话独立） | 若要求每会话独立，需扩展会话文件 + 契约 + 压缩联动，成本显著上升 | 用户确认 |
| **A3** | 该值**仅作占比/预警口径**，不要求参与真实截断 | 若要求参与，需改 `tool-loop` 的构造逻辑 + 自动压缩策略，需求升级为设计级 | 用户确认（同 D4） |
| **A4** | K = 1000 字符的换算口径不变 | 若改按 1024，展示与配置需同步开口径 | 沿用 REQ-20261013-001 的 A7（已定 K=1000） |

---

## 7. 建议下一步

1. **先答 1 个问题**（唯一确认点）：此处的「配置」是否指前端「对话配置」层？并请同时拍板 **D2 / D3 / D4**（这三项决定实现形态）。
2. **复杂度判定**：单点改动 + 无外部依赖 + 无状态机变更 ⇒ **低复杂度**，但含一条新增 HTTP 写通路（安全面）。
   - 默认推荐：`plan-track` 建档直接实现 R1–R6。
   - 例外：若 **D4 选 (b)**（要求参与真实截断/自动压缩），改走 `design-craft` 先出技术设计。
3. **本报告不修改任何产品代码**（PM 契约）；实施前经 `request-guard`、实施后经 `code-review`。

---

## 附：即时可用的替代方案（不等开发）

```yaml
# ~/.ki/config.yaml
llm:
  baseURL: https://...      # 保持不变
  model: qwen3.8-flash      # 保持不变
  contextChars: 500000      # 新增：500K（字符口径，K = 1000）
```

- 配置走 mtime 指纹热失效 ⇒ **无需重启 daemon**，下次 `GET /api/chat/config` 即返回新值。
- 面板若仍显示旧分母，**刷新一次页面**即可（受 §0.4 的挂载时机缺陷所限）。
- 目标形态若显示 `3.4%`，说明分母已按 500K 生效。

---

## 8. 实施记录（2026-10-14）

**状态**：已完成（用户确认 A1 =「配置」指前端对话配置层；D1–D4 按推荐执行）。

### 8.1 交付物

| 层 | 内容 | 位置 |
|---|---|---|
| 后端 | **API-15 `PUT /api/chat/config`** —— 受限单字段写；并抽出 `patchLlmConfigField`（ack 与它共用） | `src/lib/chat/chat-routes.ts` |
| 前端 | 「对话配置」层新增「上下文窗口」分组：K 输入 + 单位 + 恢复默认 + **独立「应用」** + 语义文案 + 非法/极值提示 + 成功反馈 | `web/src/chat/PromptConfigLayer.tsx`、`web/src/lib/contextUsage.ts`、`web/src/api/chatApi.ts` |
| 前端 | 应用成功后**立即生效**：抽出 `refreshConfig` 并接线 page / dock 两处挂载点（顺带让 T12 的 `ack` 复用同一路径） | `web/src/chat/ChatPanel.tsx` |
| 样式 | `ki.css` 追加段；**并补齐此前缺失的 `.ki-chat-cfg__warn`**（JSX 早已使用、样式表从未定义） | `web/src/styles/ki.css` |
| 测试 | 后端 29 例、前端 32 例、端到端脚本 33 项断言 | `test/chat/context-limit-config.test.ts`、`web/test/context-limit-config.test.mjs`、`temp/verify-context-limit-config.cjs` |

### 8.2 接口契约（API-15 · 本项目约定新接口契约记录在本需求目录，不回填老需求的 api 文档）

```
PUT /api/chat/config
  认证：Bearer Token（启用鉴权且非回环时）
  权限：**全局配置写**（`requireGlobalConfigWrite`）—— 仅 authScopes 为 null 或含 `all` 时放行，否则 403 SCOPE_FORBIDDEN
  幂等：是
  请求体：{ contextChars: number }        // **白名单单字段**：出现任何其它键 → 400（整体拒绝，不部分生效）
  校验：正整数（Number.isInteger 同时挡 NaN/Infinity/小数）且 ≤ 100,000,000
  成功：200 { ok: true, contextChars: <新值> }
  错误：
    400 API_ERROR + details[{field:'contextChars',...}]  —— 非正整数 / 超上界 / 含其它字段 / 请求体非对象
    403 SCOPE_FORBIDDEN                                  —— 非全局授权身份
    500 CHAT_WRITE_FAILED                                —— 未找到配置文件路径 或 读写失败（**文件未改动**）
  落盘语义：就地改 `llm.contextChars`，其余字段保留；复用 `atomicWriteConfig`（沿用原 mode，保 0600 保护 apiKey）
            → 写后 `resetConfigCache()` 使本次改动立即生效
  语义边界：该值**只作占比分母与预警阈值基准**，不参与截断 / 拒绝 / 自动压缩
  ⚠️ 已知：整文件重写会丢失手写注释（继承自 API-13 ack 的既有行为；语义字段守恒有测试）
```

### 8.3 验证结论

| 项 | 结果 |
|---|---|
| 后端单测 | `test/chat/context-limit-config.test.ts` **29/29**（含白名单整体拒绝、越权、权限保留 0600、缓存失效、ack 重构回归 4 例） |
| 后端全量 | `npm run test:chat` **286/286**（原 257 + 29） |
| 前端单测 | `web/test/context-limit-config.test.mjs` **32/32**（K⇄字符往返、13 类非法写法、极值提示不拦截、请求形状、错误映射） |
| 前端全量 | `npm test` **224/224**（原 218 + 6） |
| 类型检查 | `tsc -p tsconfig.src.json --noEmit` 与 web `tsc --noEmit` 均 **0 错** |
| 构建 | `vite build` 通过 |
| 端到端 | `temp/verify-context-limit-config.cjs` **33/33**（隔离实例 + mock 上游）：A 入口 / B 应用与**不刷新即生效**（分母 6.0K→12.0K、占比约减半、`__noReload` 标记仍在）/ C 恢复默认 / D 校验与极值 / E 抽屉变体；截图 4 张 |

### 8.4 需求条目落实

| 编号 | 状态 | 实现证据 |
|---|---|---|
| R1 分组可查看可修改 | ✅ | 端到端 A1–A4 |
| R2 默认 1000K + 恢复默认 | ✅ | 端到端 C3–C6（写显式值 1000000，不删字段） |
| R3 保存后立即生效 | ✅ | 端到端 B4/B5/B6 |
| R4 受限写通路 | ✅ | 单测 ⑫–⑮ |
| R5 语义文案 | ✅ | 端到端 A5 |
| R6 校验与极值提示 | ✅ | 端到端 D1–D7（**极值只提示不拦截**：`1K` 与 `20000K` 仍可提交） |
| R7 面板内可发现性入口 | ⏸ **未做**（P2） | 待拍板落点；且新分组位于配置层最底部，可发现性偏弱 |
| R8 CLI `config set` | ⏸ **未做**（P2） | 用户未提需求 |

### 8.5 质量闭环结论（auto-review → code-review → challenger）

- **code-review**：整体 **A**，无 P0，结论「可直接合入」。发现：P1-1 写通路重写整文件丢注释（继承自 ack）；P2-1 用通用 `API_ERROR` 未新增 1xxx 段码；P2-2 两处分支未覆盖。搭车变更 3 项均立了案（`patchLlmConfigField` 抽取、`__warn` 样式补齐、去可见文案星号）。
- **challenger**（新增功能策略）：成立 3 条 —— Q1 **R6 极值提示未实现**（已即时补齐并加测量：单测 6 例 + 端到端 D6/D7）；Q2 可发现性（R7 未做 + 分组在底部，**待拍板**）；Q3 部署时效（7423 旧进程 → 需重启，否则「应用」得 404，**已在交付说明中明示**）。数据守恒三问 + 贯通两问、搭车围栏质疑均不成立（有测试/实测证据）。

### 8.6 遗留（需用户知晓/拍板）

1. ⚠️ **需重启 daemon**：7423 上是旧进程内代码 —— 新分组会显示，但点「应用」得到 404 → "应用失败，请重试"。重启后可用；期间可手改 `~/.ki/config.yaml`（该配置热失效，**不重启即生效**）。
2. **分组位置**：当前在配置层最底部（其后是底栏），需滚动越过 12 个工具条目才能看到；是否上移到「基础提示词」之前待拍板。
3. **注释丢失**：经 UI 改一次上限会重写整个 `config.yaml`（手写注释消失，语义字段保留）。是否改为文本级按行替换待拍板。
4. 可延后：R7 入口、CLI `set`、专用错误码、`!configPath` / 磁盘写失败分支的运行时覆盖。

---

## 9. v3 修订（2026-10-14 · 用户四条裁决）

用户在看过 §8 的实施结果后给出四条指令，其中第 2 条推翻了 §8 的存储归属（**本节的结论取代 §8.6 的第 2、3 条**）。

| # | 用户裁决 | 落地 |
|---|---------|------|
| 1 | 分组位置移到「工具与权限」**上方** | 已移动（顺序：基础提示词 → Skill → **上下文窗口** → 工具与权限）；端到端 A2 / F3 用 **DOM 顺序**断言（不受滚动位置影响） |
| 2 | **`config.yaml` 配的是默认值；界面改的值不要改 `config.yaml`，单独存储** | **存储模型改为两层**（见 §9.1）；**已撤销** `PUT /api/chat/config`（该路径 PUT → 404） |
| 3 | CLI `ki config set` 不做 | 未实现（原 R8 **撤销**） |
| 4 | 杀掉卡住的验证进程 `716569` | 已终止（连同子进程链 `716582` / `716583`） |

### 9.1 存储模型（v2 → v3）

**生效值三级链**（`handleConfigGet` 组装）：

```
① {chatDir}/prompt-config.json 的 contextChars   ← 用户覆盖（缺省 = 未覆盖，字段不落盘）
② ~/.ki/config.yaml 的 llm.contextChars          ← 部署默认（运维级）
③ CHAT_BUDGET.defaultContextChars = 1000K        ← 内置兜底
```

**为什么分层**：`config.yaml` 是**运维级**（含 apiKey / 模型 / scope，且是 yaml 整文件重写、会丢手写注释），对话配置是**产品级**；两者的责任人与变更频率不同，混在一起会让"界面上点一次保存"写出运维级文件的 diff。

### 9.2 契约变更

| 接口 | v2 | v3 |
|---|---|---|
| `PUT /api/chat/config` | 受限单字段写 `config.yaml` | **已删除**（PUT → 404） |
| `PUT /api/chat/prompt-config` | `{prompt, skills, tools}` | **+ 可选 `contextChars`**（正整数、≤ 1 亿字符；缺省 = 未覆盖） |
| `GET /api/chat/config` | `contextChars`（= config.yaml 值） | `contextChars`（**生效值**）+ `contextCharsDefault` + `contextCharsOverridden` |
| `GET /api/chat/prompt-config` | — | + 顶层 `contextCharsDefault` + `limits.contextCharsMax` |

`CONTEXT_CHARS_MAX` 常量由 `chat-routes.ts` 迁至 `prompt-config.ts`（校验侧 SSOT）。
`patchLlmConfigField` **保留**，但只剩一个调用方：`POST /api/chat/config/ack`（隐私确认写 `llm.kbDisclosureAck`）—— 它是现在唯一会写 `config.yaml` 的 HTTP 通路。

### 9.3 关键语义：「恢复默认」回的是**部署默认**，不是 1000K

v2 的「恢复默认」写入 `1000000`；v3 改为**删除覆盖值**，生效值回到 `config.yaml` 的值。端到端用部署默认 6K 验证：C3 输入框回 `6`、C5 生效值回 `6000`。
这也修掉了"运维把默认设成 500K，用户点恢复默认却拿到 1000K"的隐患。

### 9.4 v3 验证

| 项 | 结果 |
|---|---|
| 后端单测 | `test/chat/context-limit-config.test.ts` **23/23** —— 核心断言 ②c / ③c / ⑤ / ⑥a / ⑧：**`config.yaml` 逐字节不变**；④ 锁定"对话配置是整体替换，调用方必须带全字段" |
| 后端全量 | `npm run test:chat` **280/280** |
| 前端单测 | `web/test/context-limit-config.test.mjs` **22/22** |
| 前端全量 | `npm test` **222/222** |
| 类型检查 | `tsc -p tsconfig.src.json` 与 web `tsc` 均 **0 错** |
| 端到端 | `temp/verify-context-limit-config.cjs` **39/39**（A2/F3 位置、B3/Z1 逐字节不变、B4 落 prompt-config.json、B6 不刷新即生效、C5 回部署默认、E2 草稿不丢字段、D1–D5 校验、**G1 旧版服务端降级提示**） |
| 构建 | `vite build` 通过 |

### 9.5 需求条目落实（v3 最终）

| 编号 | 状态 |
|---|---|
| R1 分组可查看可修改 | ✅（位置按本次裁决调整到「工具与权限」上方） |
| R2 默认值 + 恢复默认 | ✅（恢复默认 = 回**部署默认**） |
| R3 保存后立即生效 | ✅（随层主保存） |
| R4 写通路 | ✅（改为复用 `PUT /api/chat/prompt-config`，专用通路已撤销） |
| R5 语义文案 | ✅（含"不修改该文件"） |
| R6 校验与极值提示 | ✅（非法禁用保存；极值只提示不拦截） |
| R7 面板内可发现性入口 | ⏸ 未做（P2） |
| R8 CLI `config set` | ❌ **按裁决撤销** |

### 9.6 剩余遗留

1. ⚠️ **需重启 daemon**（7423 仍是旧进程内代码）—— 重启前「保存」会 404；`config.yaml` 的手改仍即时生效。
2. 写 `config.yaml` 的通路（现仅 ack）仍会重写整文件、丢手写注释（既有行为，见 ki 记忆「写config.yaml的通路会重写整个文件丢注释」）。
3. R7 可发现性入口；专用错误码；`!configPath` / 磁盘写失败分支的运行时覆盖。
4. `PUT /api/chat/prompt-config` 是**整体替换**：任何调用方（含未来的 CLI / 第三方）保存时必须带全 `contextChars`，否则会清掉用户的覆盖值 —— 已由测试 ④ 锁定该契约。
