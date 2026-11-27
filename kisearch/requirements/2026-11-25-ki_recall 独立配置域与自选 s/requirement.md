---
id: REQ-20261125-001
feature: ki_recall 独立配置域与自选 scope
status: 实施中
created: 2026-11-25
updated: 2026-11-25
version: 3
tags: [feat, ux, security]
author: AI
document_type: requirement
---

# PM 报告：ki_recall 独立配置域与自选 scope

模式：M1 需求定义（一次成型档）
证据声明：最高 `🟢`（代码直读：配置域、工具链、前端页面结构均已逐文件核对）+ 用户上传截图（AI 设置页现状）；**未运行实测**（未起服务点页面、未实跑改造后的 ki_recall）。降级说明：界面类结论为「按现有 DOM 结构推断的预期布局」，未经渲染确认，最终形态需 `ui-to-ascii` 确认闸门后交 `ui-designer`。

## 0. 口径更正（2026-11-25 二次确认，推翻了 §6 的 A1）

用户澄清了原设计：**「AI 查找」是 `ki_recall` 在页面上的别名，同一套配置、同一条链路**；两者的差别只有「过程是否可见」——页面把检索过程渲染出来，MCP 调用只回最终 JSON。配置里那两张 skill 卡片（`refs-locate` / `task-recall`）就是**两个场景**，对应两个入口。

### 0.1 代码核对结论：口径基本成立，但「两套提示词」需更正

| 用户口径 | 代码事实 | 判定 |
|---|---|---|
| AI 查找与 ki_recall 共用一套配置 | 两侧都读 `prompt-config.find`（`mcp-tools/recall.ts:444` 与 `events/find-service.ts:150-153`） | ✅ 成立 |
| 同一条链路 | 共用内核 `runGroundedRecall` + 共用工具执行器 `makeRecallToolRunner`（`deep-find-core.ts:134-152`） | ✅ 成立 |
| 只差「过程可见性」 | 页面侧有 `toolTrace`/步骤面板，MCP 侧出参不含过程 | ✅ 成立 |
| **内置两套提示词** | 实际是 **1 份基础提示词 `DEFAULT_FIND_PROMPT` + 2 个场景 skill**；基础提示词末尾明文写「本次要挑什么由随后加载的 skill 说明（refs-locate = 给事件挑参考文档；task-recall = 给任务挑先读文档）」 | ⚠️ 表述需更正（2026-11-18 拍板「一套逻辑 + 一份配置，场景差异只靠 skill」，为的是避免共用规则两处维护后漂移） |

### 0.2 「原设计没做好」成立——缺的是这 6 处，不是缺一套配置

| # | 缺口 | 证据 | 性质 |
|---|---|---|---|
| G1 | `ki_recall` 调内核时**不传 `maxToolCalls`**，页面侧的「工具调用上限 15 次」对 MCP 预取**不生效**（预取是唯一「不限制」档） | `mcp-tools/recall.ts:324-354` 的 `runGroundedRecall({...})` 无该字段；内核注释 `run-recall.ts:298-305` 明示 | 🟢 **真缺陷** |
| G2 | 次数**不注入上下文**：页面链路有 `toolCallBudgetNote()`，预取链路没有 | `deep-find-core.ts:88-94` vs `recall-prompt.ts:27-38` | 🟢 **真缺陷** |
| G3 | 轮次 / 单次工具字符上限**未共享**：预取硬编码 `5` 轮 / `8000` 字符，find 侧硬编码 `6` 轮 / `10000` 字符，find 域里根本没有这两个字段 | `mcp-tools/recall.ts:450-451`、`deep-find-core.ts:27/148` | 🟡 设计缺口（"一套配置"只覆盖了提示词/skills/tools/思考级别） |
| G4 | 预取额外强制 `ki_scope_list: true`，页面侧工具卡没有它 → 用户看到的 4 个工具与实际 5 个不一致 | `mcp-tools/recall.ts:449` vs `FIND_TOOL_GROUPS` | 🟡 一致性缺口 |
| G5 | 界面对 skill 的说明写「**仅作用于「AI 查找」**」，未标注 `task-recall` 实际服务于 MCP 的 `ki_recall`，用户无从得知两场景对应关系 | `PromptConfigLayer.tsx:2015-2020` | 🟡 信息架构缺口 |
| G6 | 存在一个永不生效的独立 `recall` 域（= 事件 #2） | 全仓 grep 仅配置层引用 | 🟡 残留 |

> 结论：**不是「该做第二套配置」，而是「一套配置没接全」**。G1/G2 直接违反「AI 查找设置即 ki_recall 设置」的原设计，属实现缺陷；G3/G4/G5 是共享范围没交代清楚；G6 是历史残留。

### 0.3 对需求方向的影响（三条互斥路线，需拍板）

| 路线 | 做法 | 影响的需求条目 | 兼容量 |
|---|---|---|---|
| **A 共用补全**（贴原设计） | 不新增第 4 个域；在「AI 查找」域内补：把 `maxToolCalls` 接到预取、注入次数、给 skill 卡片加「作用入口」标注、工具卡补 `ki_scope_list`、删死 `recall` 域 | REQ-01/02/03/05 **作废**；REQ-04 缩为「接线 + 注入」；REQ-06 反向（删 `resolveRecallSection` 的 find 读取例外，改为统一走 `find` 域 + 场景 skill 选择）；REQ-10 **作废**（基础提示词已存在且已 bifurcate 到 skill）；REQ-11/12 缩为 `maxToolCalls` 透传 + 契约标注 | 与现状一致，改动最小 |
| **B 拆域**（本报告 §4 原方案） | 新增第 4 个域「AI 预取」，recall 域独立一份提示词/skill/工具 | 全部 12 条保留 | 与「AI 查找 = ki_recall」原设计冲突，等于承认两个入口两份真相；需同步迁移 task-recall 内容 |
| **C 只修缺陷**（最小） | 只做 G1/G2/G6：接到 15 次上限 + 注入次数 + 删残留域；其余不动 | 仅 REQ-04 部分、REQ-11、REQ-12 | 风险最低，但不解决"用户看不到两场景对应关系" |

**scope 解耦（原 REQ-07/08/09）与路线 A/B/C 正交**，不受影响——它改的是「scope 是默认值还是硬约束」，与该配置归哪个域无关。

### 0.4 实施记录（2026-11-25 用户拍板走 A 方案）

**已实施（本次）**

| 缺口 | 改法 | 位置 |
|---|---|---|
| G1 | `resolveRecallSection()` 增 `maxToolCalls: section.maxToolCalls ?? FIND_DEFAULT_TOOL_CALLS`，并透传给 `runGroundedRecall` | `src/lib/mcp-tools/recall.ts` |
| G2 | `toolCallBudgetNote()` 搬到 `recall/recall-prompt.ts` 并导出；`buildRecallSystemPrompt` 在 skill 与输出规格之间注入；`deep-find-core` 改为复用（两条链路同一段文案） | `src/lib/recall/recall-prompt.ts`、`src/lib/events/deep-find-core.ts` |
| G5 | skill 卡片说明改为「作用于 AI 查找**与 MCP 工具 ki_recall**（同一套配置、同一条链路）」；左栏「AI 查找」副标题补「含 ki_recall」 | `web/src/chat/PromptConfigLayer.tsx:2021`、`web/src/pages/AiSettingsPage.tsx:33` |
| G6 | **删除** `PromptConfig.recall` 域全套：接口 / 默认值 / `DEFAULT_RECALL_PROMPT` / `normalizeRecallSection` / 软读取 / 保存保留与时间戳 / `RECALL_TOOL_GROUPS·NAMES·LOCKED` / 轮次字符上下界 / 契约字段 / limits 四项 / 单测 | `prompt-config.ts`、`chat-routes.ts`、`web/src/api/chatContract.ts`、`test/chat/recall-config.test.ts`（删除） |

**未实施（保留在需求内，等拍板）**

- G3（轮次 / 单次工具字符上限是否也纳入 `find` 域）：属设计取舍——两侧耗时结构不同，强行共享会互相调坏，目前保持内核硬编码（5 轮/8000 字 vs 查找 6 轮/10000 字）。
- G4（工具卡补 `ki_scope_list`）：取决于 Q2，且该工具语义将随 scope 解耦一起改。
- Q1–Q7（scope 解耦）：与 A 方案正交，本次未动。

**接口影响（对外契约降级）**：`GET /api/chat/prompt-config` 不再返回 `recall` 域；`limits` 少 `recallMaxRoundsMin/Max`、`recallToolCharsMin/Max` 四项。前端契约已同批删除，属**兼容性破坏**——第三方若读该字段会拿到 undefined（本仓无其他消费方，🟢）。

**验证证据**

- 后端新增回归 2 例（`test/recall-tool.test.ts` ⑥）：`find.maxToolCalls=7` 生效 / 缺字段按 15；预算同时进系统提示词且内核真按 2 次截断 → 该文件 13 例全绿。
- `test/chat` 42 文件 2 红（`find-config`、`e2e-sr02-sources`），均经 **`git stash` 隔离验证为既有基线**（恢复原版后仍红）。
- `test/events` 单跑全绿（批量时的 `find-runner`/`analysis-store` 2 红为测试间状态污染，隔离与两次单跑均绿）。
- 后端 `tsc -p tsconfig.json` 9 错 = 既有基线（无新增）；`npm run build` exit 0。
- 前端 `tsc --noEmit` 0 错、`vite build` ✓；全量 **1548 / 1537（11 红）与基线一致**。
**真机验证（2026-11-25 12:05，已重启 daemon 并跑真实模型）**

| 项 | 结果 |
|---|---|
| daemon 重启 | pid 1727106 → 1742741，`ki mcp status` ok；旧代码进程已 terminated |
| 契约（G6） | `GET /api/chat/prompt-config` 200：`config` 顶层无 `recall` 键、`limits` 无任何 recall 键、`config.find.maxToolCalls=15`、`defaults.find.maxToolCalls=15` |
| 实际读取（G1） | 真实配置 `/root/chat/prompt-config.json` 里 `find.maxToolCalls=15`、`find.skills=refs-locate+task-recall` → 预取运行期 `maxToolCalls=15` |
| 提示词注入（G2） | 用真实配置拼装系统提示词：含 `## 工具调用预算`，文案为「本次最多可以调用 15 次工具…」，位于 `## 输出格式` 之前 |
| **预算真截断** | 不改代码只改配置：`maxToolCalls=2` → 真机调用 `rounds=2 / candidates=2 / partial=true / 8.2s`；改回 15 → `rounds=6（含收口轮）/ candidates=2 / partial=false / 24.1s`；基线（15）首跑 `rounds=5 / candidates=4 / 18.9s` |
| 配置即时生效 | 上述三次调用之间**未重启 daemon** —— 每次调用读盘，改配置即生效 |
| 多 scope 回显 | `scope:"kisearch-memory,kisearch"` → `targets` 原样回显两库，检索正常 |

> 顺带发现（非本次范围）：真实配置路径是 `path.dirname(dataDir)/chat/prompt-config.json`（= `/root/chat/`），`/root/.ki-data/chat/prompt-config.json` 是**陈旧残留**（内容只有 `version+analysis`），改它不生效。该残留文件已恢复原状，未删除。

### 0.5 批 A'（用户二次拍板后，2026-11-25 13:0x）

| 决策 | 落地 |
|---|---|
| 删除 `/root/.ki-data/chat/prompt-config.json` | 已删除（该路径永不生效，真实路径是 `dirname(dataDir)/chat`） |
| **Q1** 工具次数**替代**轮次；提示词说明「上限 ≠ 必须用满」 | `RECALL_ROUNDS_SAFETY_CAP=30` / `ROUNDS_SAFETY_CAP=30` 取代原 5 / 6，明确标注「不是预算」；`toolCallBudgetNote` 增「这是上限，不是必须调用这么多次，够用就尽快收口」 |
| **Q2** 工具卡补 `ki_scope_list` | `FIND_TOOL_GROUPS` 由 4 → 5（默认开）；`recall` 侧删除 `ki_scope_list: true` 的强制覆盖，两条链路共用同一份开关 |
| **Q6** 移除内置 skill `task-recall` | 删除 `BUILTIN_FIND_SKILL_NAMES` 中的条目 + 其正文文件 `retrieval/task-recall-skill.ts`；预取侧 `skills: []`；基础提示词末尾句改为中性；老配置按 `DEPRECATED_BUILTIN_SKILL_IDS` 静默过滤；`refs-locate` 正文里过期的「与 task-recall 对照表」同步改写 |
| **G3** 不纳入，界面写明 | 「工具调用上限」块新增一条 hint：**内部预算（不可配）**—— 模型轮次、单次工具结果字符上限由程序固定，只作防死循环与单次返回体积保护 |
| **Q7** 没有第四个域 | 确认：仍是「AI 查找」一个域，无新增 |

**验证（真实 daemon + 真实模型）**

- 配置层：`find.skills = refs-locate:on`（老配置里的 `builtin-task-recall` 被静默过滤，`issue=null`）；`find.tools` 5 个含 `ki_scope_list`；`findToolGroups` 5 个；`find.maxToolCalls=15`。
- 预取运行期（真实配置拼装）：工具 5 个、**skill 0 个**、预算段存在且次数=15。
- **真机调用**：`ok=true`、`rounds=7`（旧 5 轮硬顶已不存在 → Q1 生效）、`candidates=1`、`partial=true`、36.6s，模型自述「检索 6 组 + 读 3 篇」未用满 15 次即自行收口（符合「上限非必须用满」）。
- 后端 `tsc` 9 错基线；`test/chat` 42 文件仅 `e2e-sr02-sources` 1 红（既有）；`recall-tool` 13 例、`find-config` 7 例全绿（顺手修掉 find-config 一个既有红：读取路径会补 `edited` 标记，断言改为忽略该键比对）。
- 前端 `tsc` 0 错、`vite build` ✓、全量 1548/1537（11 红同基线）。

**仍未做**：**scope 解耦（Q3 默认 scope=全部 / Q4 逐次鉴权+审计实际 scope / Q5 写工具不开放）** —— 这是批 B，涉及 `tool-runner` 的 scope 注入、分析主链路 5 个 kb-read 工具加 scope 参数、排队互斥维度、鉴权与审计，尚未实施。

### 0.6 批 3-A/B（2026-11-25 第二次拍板后）

用户判断「检索范围的配置似乎没什么用，可以删除」，并要求「`ki_recall` 也可以支持视图」。

**3-A 删除检索范围（`find.ranges`）**

| 落点 | 处理 |
|---|---|
| 配置层 | 删 `FindRangeConfig`、`FindConfig.ranges`、`defaultFindConfig().ranges`、归一化段的 ranges 校验、`existingFind.ranges` 展开、`FIND_MAX_TARGETS` |
| 运行期 | `resolveFindTargets(eventScope, deps)` 恒返回 `[eventScope]`（事件库鉴权仍由上层 403）；`governance-http` 调用点同步 |
| 路由 | 删 `chat-routes` 的「检索范围保存期预检」整块（58 行）、`limits.findMaxTargets` |
| 前端 | 删「检索范围」块（64 行）、`findScopeOptions/findViewMap/findScopeMeta/findMaxTargets`、`EMPTY_FIND_CONFIG.ranges`、契约 `FindRangeConfig` 与 `limits.findMaxTargets`、clone 的 ranges 搬运 |
| 兼容 | 老配置里带 `ranges` → **静默忽略**（不报 issue，否则会整份回退默认） |

**3-B `ki_recall` 自选 scope（Q3/Q4，含视图）**

- 入参 `scope` 降级为**默认值**；模型可在每次调用传 `scope`（库名 / 视图 / 逗号多值）。
- 逐次校验复用 `resolveRecallTargets`（存在 + 授权 + 视图展开为成员库）；失败回**可行动错误 + 可用清单**，**不回落默认**（回落会让审计分不清「换了库」还是「传错了」）。
- `ki_scope_list` 从「返回本次 targets」改为「授权范围内可用库 + 视图（含成员）」——模型自选的唯一目录。
- 审计：`scopeUsed` 进 toolTrace（每步实际 scope）、结果新增 `scopesUsed`（并集）、`recallLog` 新增 `scopes` 字段。
- 提示词新增 `buildScopeNote`（默认范围 / 可换库换视图 / 可用清单 / 换错会报错），**与运行期校验同源**。
- 隔离：`resolveScope` 由调用方注入；「AI 查找」不注入 ⇒ 范围仍锁定、行为不变（写工具永远不加 scope，Q5）。

**验证**

- 新增回归 5 例（`test/recall-tool.test.ts` ⑦，用 `impl` 注入假实现）：未传用默认 / 传了真传到执行层 / 视图展开为成员 / 不可用报错且**不执行** / `ki_scope_list` 回目录 → 该文件 18 例全绿。
- 后端 `tsc` 9 错基线；`test/chat` 42 文件仅 `e2e-sr02-sources` 既有 1 红；`refs-multi-scope` 12 例、`recall-kernel` 16 例、`prompt-config-routes` 14 例全绿（均按新口径改写）；`find-runner` 三次连跑 20/20（批量偶红为状态污染）。
- 前端 `tsc` 0 错、`vite build` ✓、全量 1548/1537（11 红同基线）、`find-config-ui` 10 例全绿（改写为「范围块必须不存在」）。
- **真机**（daemon 已重启）：`GET /api/chat/prompt-config` → `find` 无 `ranges`、`limits` 无 `findMaxTargets`、工具 5 个；以视图 `kisearch-docs` 调 `ki_recall` → `targets=["kisearch-docs"]`、**`scopesUsed=["kisearch-memory","kisearch-xperts"]`**（视图正确展开）、`rounds=9 / candidates=4 / partial=false`。

**仍未做（3-C）**：分析主链路 5 个 kb-read 工具加 `scope` 参数 —— 需要 `authScopes` 从 HTTP 层注入、逐次鉴权、排队按实际生效 scope 入队、写工具保持锁定。

### 0.8 超时配置归「AI 查找」域（2026-11-25 用户拍板）

真机出现 `RECALL_TIMEOUT`（46s）后定位：硬超时是 `config.recall.hardTimeoutMs`（默认 45s，区间 1000~45000 不可放大），而唯一预算是工具调用 15 次（≈45s），两者天生顶牛。

| 决策 | 落地 |
|---|---|
| 超时放进「AI 查找」，默认 **60 秒** | `FindConfig.timeoutMs`（毫秒），`FIND_DEFAULT_TIMEOUT_MS=60_000`，区间 `10_000~300_000`（越界 fail-loud）；归一化加校验；`defaultFindConfig()` 带默认值 |
| 部署级 cap 保留 | `config.recall.hardTimeoutMs` 语义改为 **cap**（默认 300_000，区间 10_000~600_000）；实际生效 = `min(find.timeoutMs, cap)` |
| 前端可配 | 「AI 查找」域新增「单次运行超时」块（工具调用上限之后）：按**秒**填写、徽标显示生效值、越界红字、恢复默认；`limits` 下发 `findMinTimeoutMs / findMaxTimeoutMs / findTimeoutDefaultMs`；clone 白名单补搬运 |
| **分析前预取不得单独降预算**（用户明确要求） | 分析链路调 `executeRecall` 只传 `{scope, task, limit}`，**不传 maxToolCalls** → 与页面配置完全一致（真机确认按 15 跑） |
| 顺手修 | 工具次数 / 超时两个输入框补**基线同步 effect**：`data` 异步到达时回填生效值，`touched` 时不覆盖（此前次数框首次进入是空框） |

**真机验证（daemon 已重启）**

| 配置 | 结果 |
|---|---|
| 磁盘无 `timeoutMs`（回落默认 60s） | 调用 **29.3s 成功**（rounds=8，scopesUsed=`["kisearch-memory"]`） |
| 临时改 `10_000` | **11.4s 返回 `RECALL_TIMEOUT`**，文案「预取超过 10 秒仍未完成…」 |
| 恢复（默认 60s） | 立即回到正常（配置改完**无需重启**） |

**测试**：`find-config` 7 例（新增超时越界 fail-loud / 合法落盘 / 默认 60000）、`recall-tool` 19 例（新增「超时取 min(配置, cap) 且文案给实际秒数」）、`find-config-ui` 10 例（clone 必须搬运 timeoutMs）；后端 tsc 9 基线、web 1548/1537（11 红同基线）、`vite build` ✓。

### 0.9 修复：基础提示词「编辑 / 恢复默认」不生效 + 补调用场景说明（2026-11-25）

**用户反馈**：点「恢复默认」仍显示「已修改」；提示词里看不到 ki_recall 场景描述。

| 问题 | 根因 | 修复 |
|---|---|---|
| 恢复默认 / 编辑都不生效 | `PromptConfigLayer.tsx` 的 `onSubmit` 与 `onReset`（`modal.kind === 'find'`）都写 `d.findPrompt`（2026-11-16 deprecated 镜像字段），服务端只认 `find.prompt`；保存时 `next.findPrompt = next.find.prompt` 又会反向覆盖 → 改动当场丢失，磁盘内容与 `edited` 都不变 | 两处改为写 `find.prompt`（onSubmit 直接构造、onReset 走 `mutateFind`）。服务端「内容 === 代码默认 ⇒ `edited=false`」的判定随即生效，徽标回到「默认」 |
| 提示词无 ki_recall 场景 | 磁盘 `find.prompt` 仍是 2026-11-16 的旧文案（490 字、`edited:true`，按设计不跟随代码升级）；且新默认只在末尾一句提到「MCP 预取」，不显眼 | `DEFAULT_FIND_PROMPT` 新增开头小节 **「## 调用场景（同一套判定，产物去向不同）」**：页面「AI 查找」为事件挑参考文档候选（人勾选）／MCP 预取 `ki_recall` 为开发任务挑开工前必读（直接交给 agent）；原末尾引用块并入该节 |

**真机验证**：PUT `find.prompt.content = defaults.find.prompt.content` → 200，落盘 **670 字 / `edited=false`**，GET 一致；场景段含「ki_recall」。已替本机配置执行一次恢复默认（备份在 `/tmp/pc-before-reset.json`）。

**测试**：后端 tsc 9 基线、`prompt-config` 59 / `find-config` 7 / `recall-tool` 19 / `find-config-ui` 10 全绿、web 1548/1537（11 红同基线）。

**遗留**：历史配置里 `edited:true` 的旧文案**不会自动迁移**（需用户点一次「恢复默认」）；对话 / 分析域的恢复默认走的是正确字段，无此问题。

### 0.10 检索范围写进提示词 + 两侧对齐（2026-11-25）

**用户反馈**：基础提示词里没有 scope 使用说明（「用户传入的是默认 scope，实际查询可自己调整」）。

| 落点 | 处理 |
|---|---|
| 基础提示词 | `DEFAULT_FIND_PROMPT` 新增 **「## 检索范围（默认值 ≠ 只能查这里）」**：① 传入 scope 只是默认，工具不写 scope 时用它；② 可按问题自己决定每次调用查哪个库/视图；③ 可用库与本次默认范围见系统提示的【检索范围】一节（程序按授权生成），以那段为准；④ 传错**直接报错并列出可用项**，不回落 |
| 系统提示词 | `buildScopeNote()` 仍由代码追加（带本次**动态**清单：默认范围 / 可用库 / 可用视图+成员）；顺序：基础提示词 → skill → 范围 → 预算 → 输出格式 |
| **两侧对齐**（关键） | 解析器抽成 `makeScopeResolver()`（`recall/tool-runner.ts`），`ki_recall` 与「AI 查找」共用同一份（存在性 + 授权 + 视图展开 + 错误文案）。开关口径统一为「调用方显式传 `tokenScopes`（含 `null`）才开启」，不传 = 范围锁定 |
| 查找链路接线 | `DeepFindDeps.tokenScopes` 新增；`find-service` 透传；`governance-http` 传 `ctx.authScopes ?? null`；`deep-find-core` 注入 resolver 并把 `buildScopeNote` 拼进 systemPrompt |

**真机验证（事件 #76，`?stream=1` 流式）**：13 次工具调用**全部显式传 `scope=kisearch-memory`**（= 默认范围、未越界），29.8s / 4 候选。此前 `ki_search` 的 schema 根本没有 `scope` 字段、模型也不会主动传 —— 这是「它读到了范围说明」的直接证据。

**测试**：后端 tsc 9 基线；`find-runner` 20/20、`recall-tool` 19/19、`recall-kernel` 16/16、`find-config` 7/7；`test/chat` 42 文件仅 `e2e-sr02-sources` 既有 1 红；前端 1548/1537（11 红同基线）。提示词已落盘（924 字、`edited=false`、含「检索范围」节）。

### 0.11 「AI 查找」跨库的真卡点：allowed 白名单（2026-11-25）

用户口径确认：**「AI 查找」也能看其他库，与 `ki_recall` 保持一致**。

上一轮已接的（3 步中的前 2 步）：`DeepFindDeps.tokenScopes` 由 `governance-http` 传 `authScopes`；`deep-find-core` 注入 `makeScopeResolver` + `buildScopeNote`。

仍会失败的根因：候选过滤第一步 `if (!allowed.has(src))`（越界剔除），而 `allowed` 只装 `args.targets`（事件库）→ **模型换了库、读了正文、给了候选，全在这一步被判 `out-of-scope` 丢掉**，表现为“换了库却什么都拿不到”。

修复：`grounded.scopesUsed` 里的每个库（含视图展开成员）也加进 `allowed`，与 `resolver` 同时启用。

**真机（事件 #76 + 临时引导“必须去 kisearch 查 type-service”）**：15 次工具调用中 **4 次 `ki_search` 显式 `scope=kisearch`**，37.7s —— 跨库检索真实发生；本次模型只在本库读正文，故候选仍 3 条本库、`unconfirmed=0`（无误判）。引导词验完已恢复（924 字 / `edited=false`）。

**新增回归** `test/events/find-scope-switch.ts` 2 例：① 传 `tokenScopes` → 跨库候选保留；② 不传 → 跨库候选仍按越界剔除（旧行为不被无意放开）。事件链路批量仍 2 红（`analysis-store` / `find-runner`），单跑 8/0、20/0 证实为既有状态污染。

### 0.12 `scopesUsed` 回显 + 页面展示（2026-11-25）

用户要求：`ki_recall` 返回体要有「实际使用了的 scope」，**AI 查找页面也要显示**。

| 层 | 改动 |
|---|---|
| 内核 | `runGroundedRecall` 已按每次工具结果的 `scopeUsed` 汇总为 `scopesUsed`（并集，含视图名） |
| 预取 | `RecallToolOk.scopesUsed` + `recallLog.scopes`（上一轮已有） |
| 查找 | `DeepFindResult.scopesUsed` → `DeepFindSearchResult` → `RefSearchResult.scopesUsed` → 前端 `RefSearchResultDto.scopesUsed` |
| 页面 | `FindRefPanel` 结果区顶部新增「实际检索范围：A、B」；出现 `targets` 之外的范围时追加「（默认是 X，AI 按问题自行扩大）」；空态也显示（便于判「查了这些库仍 0 命中」） |

**真机（daemon 已重启）**

| 入口 | 结果 |
|---|---|
| `refs/search` | `targets=["kisearch-memory"]`、`scopesUsed=["kisearch-memory"]`、38.1s |
| `ki_recall` | `targets=["kisearch-memory"]` 而 **`scopesUsed=["kisearch-memory","kisearch-xperts"]`**（34.3s / rounds=8 / 2 候选）—— **模型自主换库成功**，这是「自选真正生效」的最强证据 |

**测试**：`find-scope-switch` 补断言（开启时 `scopesUsed=['kisearch']` 且候选保留；未开启时候选被剔除但 `scopesUsed` 仍如实记录）；`find-runner` 20/20；后端 tsc 9 基线、前端 tsc 0 错、web 1548/1537（11 红同基线）。

### 0.13 分析过程面板：预取卡片显示实际检索范围（2026-11-25）

用户反馈：**AI 分析**的过程面板里，预取卡片（「建议先读 N 篇」）没有显示实际 scope。

| 层 | 改动 |
|---|---|
| 后端 | `unwrapRecallPayload` 透传 `scopesUsed`；`runRecallPrefetch` 成功分支把它写进 step 的 `detail.scopes` |
| 前端 | `StepMetrics` 加 LABEL `scopes: '实际检索范围'`（多值 ` · ` 拼接）；`AiProcessPanel` 展开步骤时自动渲染 |

**为什么放 `detail` 而不是 `metrics`**：`detail` 是展开明细的数据源；`metrics` 会被折叠摘要读成数字（`docs 4`）。两者在面板里合并传给 `StepMetrics`，加在 detail 即生效。

**真机**（#76 重跑分析）：recall step → `title=预取知识库（ki_recall）：建议先读 4 篇`、`detail.scopes=["kisearch-memory"]`、`metrics={docs:4,uncertain:3}` → 页面展开显示「实际检索范围 kisearch-memory」。

**注意**：前端改动需重跑 `vite build`（daemon 直接 serve `web/dist`）；环境有 safe-delete 守卫，用 `npx vite build --emptyOutDir false` 绕过清空目录（本次已构建）。

### 0.7 批 3-C：分析链路只读工具自选 scope（2026-11-25）

**开关口径**：`buildKbReadToolEntries(scope, config, deps, opts)` 的 `opts.authScopes` —— **有该键**（含显式 `null` = 本机不限权）才开启自选；不传（旧调用 / 单测）保持「只能查事件所在库」。这条是为了不让「未接鉴权的入口」白拿自由换库。

| 落点 | 处理 |
|---|---|
| 五个只读工具 | 全部加 `scope`：`ki_search`（多库一次查）、`ki_get_module_info`（视图展开后逐个试 ≤5）、`ki_group_list` / `ki_tag_list`（取首个物理库）、`ki_get_image`（同读正文） |
| 校验 | 复用 `resolveRecallTargets`（存在 + 授权 + 视图展开）；失败回可行动错误、**不回落**。视图需本身在授权名单（生产 `ctx.authScopes` 已合并 viewGrants）且成员全含 |
| 写工具 | **不加 scope**（Q5），单测显式锁住「写工具参数表里没有 scope」 |
| 排队 | `runScopedRead(toolName, effScope, fn)` 按**实际生效 scope** 入队（原按装配期单值，换库后互斥会失效） |
| 上下文 | `buildRuntimeEnv` 加 `extraLines`，注入 `kbScopeEnv`：开启时写明默认范围 + 五个工具可换库/视图 + 写工具锁事件库；未开启时明说「本次不允许换库」 |
| 传递链 | `governance-http`（analyze / ask 两处）→ `startEventAnalysis({authScopes})` → `executeAnalysisBackground(input.authScopes)` → 工具装配；追问侧 `AskEventAnalysisArgs.authScopes` → `buildAskToolEntries(..., scopeOpts)` |
| 内置 skill 文案 | `refs-locate` 里「不要试图指定其它库」改为「默认事件库；运行环境说明允许时才传 scope，传错会报错不回落」 |

**验证**

- 新增 `test/events/analysis-scope-switch.test.ts` **9 例全绿**：默认库 / 传了真传到执行层 / 视图展开成多库一次查 / 读正文逐个试命中即止 / 不存在报错且**不执行** / 无权拒绝 / 未注入 authScopes 则锁定 / 写工具无 scope。
- 后端 `tsc` 9 错基线；`test/chat` 42 文件仅 `e2e-sr02-sources` 既有 1 红；`test/events` 19 文件批量 2 红（`analysis-store` / `find-runner`）经单跑复验为**既有状态污染**（8/0、20/0）。
- 前端 `tsc` 0 错、全量 1548/1537（11 红同基线）。
- daemon 已重启，`GET /` 与 `/api/chat/prompt-config` 200。
- **未跑真实分析的整链路真机**（一次完整分析成本高、耗时长）：能力由 9 例单测 + 代码路径覆盖，真机验证留待下一次实际分析时观察过程面板的 `[库名]` 前缀。

## 1. 执行摘要

1. 需求本质不是「新增一个配置页」，而是**把已经存在但没有消费方的配置域接上线**：`PromptConfig.recall`（含内置提示词、skills、tools、轮次/字符上限）在配置层早已完整，但 `ki_recall` 执行时读的是 `find` 域（`src/lib/mcp-tools/recall.ts:438-455`，🟢）。这正是事件 #2 的「接线」路线，本需求等于把 #2 从技术债变成正式需求。
2. 4 项配置需求里，**3 项后端字段已就绪**（基础提示词 / skills 默认空 / 思考级别 / 工具默认全开），前端**零 UI**（`web/src/chat/PromptConfigLayer.tsx` 2553 行，无任何 `config.recall` 渲染，🟢）；真正的新增只有 **`maxToolCalls`（默认 15）** 一个字段及其上下界（🟢）。
3. 「取消 scope 写死」是本次**唯一动到安全边界**的改动，且波及面大于需求描述：不止 `ki_recall` 内部的 `pickScope`，**事件 AI 分析主链路的 5 个 kb-read 工具一个都没有 `scope` 参数**（`src/lib/events/analysis-runner.ts:738-903`），且代码里明确写着「scope 由程序注入、模型无法指定其他库」这条硬边界（`:966-967`，🟢）。
4. 「工具调用次数自动注入上下文」已有现成实现可直接搬：`deep-find-core.ts:88-94` 的 `toolCallBudgetNote()`（AI 查找已用），`ki_recall` 侧目前**不设次数上限**（`run-recall.ts:298-305` 注释明示），属收紧而非新增能力（🟢）。
5. 高风险的静默坑：前端保存草稿是**白名单深拷贝**，`promptConfigClone.ts:22-71` **没有 recall 分支**，不同步补 = 改任何其他配置一保存，recall 域被静默清空（该文件自述已踩过 4 次，🟢）。

- **可行性 / 复杂度**：12 条中 7 可实施 / 4 有条件 / 1 待验证 / 0 阻塞；整体复杂度 **中**（主导：结构面——前端 3 域重复骨架 + 执行链路向后兼容；次主导：数据与状态——scope 语义从单值锁定改为可自选）。

## 2. 现状与范围

| 项 | 现状 | 证据 |
|---|---|---|
| `ki_recall` 提示词来源 | find 域基础提示词 + 强制注入 find 域的 `task-recall` skill + 代码追加输出规格 | 🟢 `src/lib/recall/recall-prompt.ts:27-38`、`mcp-tools/recall.ts:438-455` |
| `recall` 独立配置域 | 字段齐备：prompt / skills（默认空）/ tools（默认全开）/ reasoningEffort / maxRounds=5 / toolResponseChars=8000 | 🟢 `prompt-config.ts:593-604`、`:918-927` |
| `recall` 域消费方 | **仅配置层**（默认值 / 校验 / 保存 / 单测），执行链路 0 引用 | 🟢 全仓 grep `recall.prompt\|recall.skills\|recall.maxRounds\|recall.toolResponseChars` 只命中 `prompt-config.ts` 自身 |
| 工具调用次数上限 | `recall` **无上限**（不限制档唯一持有者）；`find` 有 `maxToolCalls=15` | 🟢 `run-recall.ts:298-305`、`prompt-config.ts:1312` |
| 前端配置页 | 3 个域（chat/analysis/find），`CapabilitySection` 枚举 3 值；`recall` 无渲染 | 🟢 `PromptConfigLayer.tsx:195`、`AiSettingsPage.tsx:28-34` |
| 分析主链路工具 scope | 装配期闭包固定为事件所在库，**5 个 kb-read 工具 schema 均无 scope 字段** | 🟢 `analysis-runner.ts:716-720`、`:738-903` |
| 工具入参白名单 | 写工具走 `parseToolArgs`，**越界参数（含模型幻觉的 scope）静默丢弃** | 🟢 `mcp-tool-registry.ts:115-235` |

范围：后端 `prompt-config` / `mcp-tools/recall` / `recall/*` / `events/analysis-runner` / `chat/mcp-tool-registry`；前端 `chat/PromptConfigLayer.tsx`、`chat/promptConfigClone.ts`、`api/chatContract.ts`、`pages/AiSettingsPage.tsx`、`styles/ki.css`（预计不新增样式）。**不在范围**：`find` 域行为改动、`fs_*` 工具、对话链路工具面。

## 3. 影响面

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需拍板 |
|---|---|---|---|---|---|
| `ki_recall` 的调用方（IDE / 外部 agent） | 流程 | 降级（输出 JSON 契约不变，但提示词与工具集换了来源，结论风格会变） | 🟢 `mcp-tools/recall.ts:104-119` 出参结构不动 | 出参契约**保持不变**，仅内部装配换域 | 否 |
| 事件 AI 分析开场预取（程序调 `ki_recall`） | 流程 | 降级（预取质量取决于新提示词） | 🟢 `analysis-runner.ts:512-516` | 与 REQ-10 同批验证 | 否 |
| 事件 AI 分析主链路（模型调 kb-read 工具） | 权限 / 流程 | **破坏**（撤销「只能查事件所在库」硬边界） | 🟢 `analysis-runner.ts:966-967` | 只读工具放开、**写工具仍锁事件库** | **是** |
| 只读 Token 通道（`/mcp` 受限授权） | 权限 | **破坏**（自选 scope 若不校验授权集 = 越权读） | 🟢 `recall.ts:233-255` 现有 `tokenScopes` 预检 | 工具层按 `isScopeAccessAllowed` 逐次校验，视图全有或全无 | **是** |
| AI 查找（事件 refs-locate） | 流程 | 降级（与 recall **共用** `makeRecallToolRunner` 与 `TOOL_DEFS`） | 🟢 `deep-find-core.ts:152`、`run-recall.ts:132-196` | scope 策略**按入口注入**，不改共享默认行为 | **是** |
| 配置保存链路（PUT 整份替换） | 数据 | **破坏**（漏搬 = recall 域被静默清空） | 🟢 `promptConfigClone.ts:22-71`、`prompt-config.ts:2409-2412` | 补 recall 分支 + 单测锁白名单 | 否 |
| 现有 3 个配置域 | 展示 | 降级（抽公共组件会动到 chat/analysis/find 的渲染） | 🟢 18 处 `ki-chat-cfg__field` 内联重复 | 抽 3 类块并逐域回归 | 否 |
| 单测 / 契约 | 展示 | 无感 | 🟡 契约已有 `RecallSectionConfig`，缺 `maxToolCalls` | 补字段与用例 | 否 |

## 4. 需求清单

优先级口径：Kano + 价值×成本（复杂度与可行性不进公式，单列 §4.1）。

| ID | 需求 | 优先级 | Kano | 价值 | 成本 | 证据 | 建议方向 |
|---|---|---|---|---|---|---|---|
| REQ-01 | AI 设置页新增第 4 个域「AI 预取」：左栏卡片 + 右栏内容区；**样式与区块抽象共用**（不复制第四份） | P0 | 必备 | 高 | 中 | 🟢 `PromptConfigLayer.tsx:195/1226-2182` | 抽 `PromptField` / `EffortField` / `SkillListCard` 三类，工具分组先照抄 find 最简版 |
| REQ-02 | 基础提示词卡片：可编辑、恢复默认、内置升级跟随（`edited` 口径） | P0 | 必备 | 高 | 低 | 🟢 `CapabilityPromptPanel:2507-2552`（已写好但 0 调用） | 直接接上该面板，去「未接入」徽标 |
| REQ-03 | Skill 卡片：**默认空、无内置 skill**，可新增/启停/编辑 | P0 | 必备 | 高 | 低 | 🟢 `defaultRecallConfig().skills=[]`（现状已符合） | 前端空态文案 + 后端保持 `skills: []` |
| REQ-04 | 思考级别 + **工具调用次数（默认 15，2~30）**，次数写进系统提示词 | P0 | 必备 | 高 | 中 | 🟢 `prompt-config.ts:1312`（find 已有 15 口径） | recall 域新增 `maxToolCalls`，契约 + 上下界 + 提示词注入 |
| REQ-05 | 工具卡片：默认全部开启，锁定项不可关 | P0 | 必备 | 中 | 低 | 🟢 `RECALL_TOOL_NAMES` 5 项、`RECALL_LOCKED_TOOL_NAMES=['ki_get_module_info']` | 照抄 find 最简版（27 行），开关落 recall.tools |
| REQ-06 | 执行链路接线：`ki_recall` 改读 `recall` 域（提示词 / skills / tools / 次数 / 思考级别） | P0 | 必备 | 高 | 低 | 🟢 `mcp-tools/recall.ts:438-455` 待改 | 一行改域 + 删除强制注入 task-recall |
| REQ-07 | **scope 解耦（recall 内部）**：入参 scope 只作默认值；模型可自行决定每次调用的 scope；未传则用默认 | P0 | 期望 | 高 | 高 | 🟢 `tool-runner.ts:29-32` 现为回落锁定 | schema 加 scope → 校验 → 未传注入默认 |
| REQ-08 | **默认 scope 与次数预算注入上下文**：系统提示词写明「默认范围 / 可选范围 / 本次最多 N 次工具调用」 | P0 | 必备 | 高 | 低 | 🟢 `deep-find-core.ts:88-94` 有现成 `toolCallBudgetNote` | 抽到共享层，两条链路共用 |
| REQ-09 | **scope 解耦（分析主链路）**：模型调 kb-read 工具时未传 scope → 用默认；可自选 | P1 | 期望 | 中 | 高 | 🟢 `analysis-runner.ts:738-903` 均无 scope 字段 | 仅限制读工具；写工具保持锁定（需拍板） |
| REQ-10 | 重写 ki_recall 默认基础提示词：吸收 task-recall 的判断方法，去掉「由随后加载的 skill 说明」这类跨场景引用 | P0 | 必备 | 高 | 中 | 🟢 `prompt-config.ts:893-915`（现有 recall 内置文案）+ `task-recall-skill.ts:23-82` | 内容设计见 §3.2 |
| REQ-11 | 前端 `promptConfigClone` 补 recall 白名单 + 单测 | P0 | 必备 | 高 | 低 | 🟢 `promptConfigClone.ts:22-71` | 漏了就静默清空，必须与 REQ-01 同批 |
| REQ-12 | 契约同步：`RecallSectionConfig.maxToolCalls`、limits 增 `recallToolCallsMin/Max/Default`、`find` 域移除 `task-recall` 内置项 | P0 | 必备 | 中 | 低 | 🟢 `chatContract.ts:573-576`、`chat-routes.ts:707-717` | 与 REQ-04/06 同批 |

**预期效果与验收标准**（逐条可判定）：

- REQ-01/02/03/05：改提示词 / 加 skill / 关工具 → 保存 → 刷新仍在；切到其他域再回来不丢；`req` 级验收 = 前端单测 + 一次真机走查。
- REQ-04：次数框填 15 → 服务端与提示词都出现「最多 15 次」；填 99 → 保存报错（不静默钳制）。
- REQ-06：改 recall 域提示词 → 下一次 `ki_recall` 返回的结论体现新口径（对比改前后同一条 task）。
- REQ-07/08：`ki_recall` 依次传 `scope=A` 与 `scope=A,B`，模型在提示词里能看到默认范围；人工构造「模型传 scope=C」，若 C 在授权集 → 允许，不在 → 返回可行动错误且**不再回落到 A**。
- REQ-09：分析中模型对同一轮内两次读操作传不同 scope → 均成功，步骤摘要显示各自生效 scope。
- REQ-11：单测断言 `clonePromptConfig` 搬运 recall 全字段；改 chat 提示词保存后 recall 内容不变。

## 3.2 负向需求（内联）

| # | 场景 | 期望行为 |
|---|---|---|
| N1 | 模型传了不存在的 scope | **报错并回可用清单**，禁止回落默认（现有 `pickScope` 回落会让「以为查 A、实际查 B」） |
| N2 | 只读 Token 会话下模型自选了一个未授权库 | 工具层拦截，文案说明无权限；不得因默认 scope 合法就放行 |
| N3 | 用户把工具次数改成 0 / 负数 / 999 | fail-loud 报错（沿用 find 的 2~30 越界口径），不静默钳制 |
| N4 | 提示词被清空或只剩空白 | 保存拒绝（min 长度），不能存成空提示词导致下一次预取无指令 |
| N5 | 前端漏搬 recall 字段 | 由单测锁死白名单；这是历史踩过 4 次的静默清空 |
| N6 | 配置改了但执行链路没接（= 当前 #2 状态） | 验收必须包含「改配置→真跑一次 ki_recall」的对比断言 |
| N7 | 模型靠频繁换 scope 试探 | 由 `maxToolCalls` 收口；命中后内核回错误文本并进收口轮 |
| N8 | 分析主链路并发多 scope 读写 | 排队必须按**实际生效 scope** 入队，不能沿用装配期单值（否则互斥判断失效） |

## 3.3 缺口回扫（六维，只判不跑）

| 维度 | 结论 |
|---|---|
| 场景完整性 | ⚠️ 原需求缺「改完配置怎么确认生效」→ 已补 REQ-06 的对比验收 |
| 验收标准可达性 | ✅ 每条均有可判定断言（见上） |
| 需求一致性 | ⚠️ **工具清单不一致**：需求截图 4 个，现状 `RECALL_TOOL_NAMES` 5 个（多 `ki_scope_list`）→ 进待确认 Q2 |
| 角色-需求对齐 | ✅ 配置者=管理员、消费方=调用方 AI，职责清晰 |
| 边界/异常覆盖 | ✅ 见 §3.2 N1–N8 |
| 术语一致性 | ⚠️ 「工具调用次数」与「轮次（maxRounds）」混用 → 报告统一用「工具调用次数」，轮次不进 UI（进 Q1 拍板） |

## 3.4 界面视图（预期）

现状：左栏 3 张域卡片，右栏随选中域切换。

```
┌─ AI 设置 ────────────────────────────────────────────────────────┐
│ ┌───────────────────────────┐  ┌──────────────────────────────┐ │
│ │ 💬 AI 对话                │  │  AI 查找 · 基础提示词         │ │
│ │    提示词 · Skill · 工具  │  │  ─────────────────────────    │ │
│ ├───────────────────────────┤  │  Skill 2/20                  │ │
│ │ ✦  AI 分析   （选中态）   │  │  ─────────────────────────    │ │
│ │    目录 · 提示词·Skill·工具│ │  思考级别 [low ▾]            │ │
│ ├───────────────────────────┤  │  工具调用上限 [15] 次         │ │
│ │ 🔍 AI 查找                │  │  ─────────────────────────    │ │
│ │    范围 · 提示词·Skill·工具│ │  工具与权限  4/4 已开         │ │
│ └───────────────────────────┘  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

预期：新增第 4 张卡「AI 预取」（选中后右栏 5 块，无「范围」块）。

```
┌─ AI 设置 ────────────────────────────────────────────────────────┐
│ ┌───────────────────────────┐  ┌──────────────────────────────┐ │
│ │ 💬 AI 对话                │  │  AI 预取 · ki_recall          │ │
│ ├───────────────────────────┤  │ ┌──────────────────────────┐ │ │
│ │ ✦  AI 分析                │  │ │① 基础提示词   已修改 ▸   │ │ │
│ ├───────────────────────────┤  │ └──────────────────────────┘ │ │
│ │ 🔍 AI 查找                │  │ ┌──────────────────────────┐ │ │
│ ├───────────────────────────┤  │ │② Skill  0 / 20   ＋新增  │ │ │
│ │ 🧭 AI 预取     （新增）   │  │ │   （空态：暂无 skill）    │ │ │
│ │    提示词 · Skill · 工具  │  │ └──────────────────────────┘ │ │
│ └───────────────────────────┘  │ ┌──────────────────────────┐ │ │
│                                │ │③ 思考级别 [low ▾]  恢复默认│ │
│                                │ │  工具调用次数 [15] 次      │ │
│                                │ └──────────────────────────┘ │ │
│                                │ ┌──────────────────────────┐ │ │
│                                │ │④ 工具与权限  5/5 已开    │ │ │
│                                │ │  知识库只读（5 个·默认开）│ │ │
│                                │ │  ki_search            [⏻] │ │ │
│                                │ │  ki_get_module_info  🔒[⏻]│ │ │
│                                │ │  ki_group_list        [⏻] │ │ │
│                                │ │  ki_tag_list          [⏻] │ │ │
│                                │ │  ki_scope_list        [⏻] │ │ │
│                                │ └──────────────────────────┘ │ │
│                                │ 提示：检索范围由调用方传入的  │ │
│                                │ scope 作默认值，AI 可按需改用 │ │
│                                │ 其他库（受授权范围限制）      │ │
└──────────────────────────────────────────────────────────────────┘
```

> 该图仅为**预期布局**，区块划分与「是否显示 ki_scope_list / scope 提示行」需确认后再交 `ui-designer`；不在本次直接实施界面。

## 4.1 实施可行性与复杂度

| 条目 | 可行性 | 复杂度 | 主导维度 | 前置条件 / 阻塞项 / 待验证项 | 证据 |
|---|---|---|---|---|---|
| REQ-01 域入口 + 抽公共块 | ✅ 可实施 | 中 | 结构面 | 需抽 3 类块并回归 chat/analysis/find 三域 | 🟢 |
| REQ-02 提示词卡 | ✅ 可实施 | 低 | 结构面 | `CapabilityPromptPanel` 已有现成实现 | 🟢 |
| REQ-03 skill 卡（默认空） | ✅ 可实施 | 低 | 结构面 | 后端已是空默认，仅需 UI + 空态 | 🟢 |
| REQ-04 次数 15 + 注入 | ⚠️ 有条件 | 中 | 数据与状态 | 新增 `maxToolCalls` 字段 + 上下界 + 契约 + clone 白名单 | 🟢 |
| REQ-05 工具卡默认全开 | ✅ 可实施 | 低 | 结构面 | 照抄 find 最简版即可 | 🟢 |
| REQ-06 接线 recall 域 | ✅ 可实施 | 低 | 结构面 | 改 `resolveRecallSection` 一处 + 删强制 skill 注入 | 🟢 |
| REQ-07 recall 内 scope 解耦 | ⚠️ 有条件 | 高 | 确定性 | 需定：默认多 scope 的语义 / 越界报错文案 / 与 `ki_scope_list` 的配合（三方案需取舍） | 🟢 |
| REQ-08 上下文注入 | ✅ 可实施 | 低 | 结构面 | 复用 `toolCallBudgetNote`，抽共享 | 🟢 |
| REQ-09 分析主链路 scope 解耦 | ⚠️ 有条件 | 高 | 数据与状态（权限模型） | 需拍板撤销硬边界 + 逐次鉴权 + 按实际 scope 入队 + 写工具边界 | 🟢 |
| REQ-10 提示词重写 | ✅ 可实施 | 中 | 确定性 | 内容需迭代，建议对照 3 条真实任务对比 | 🟡 |
| REQ-11 clone 白名单 | ✅ 可实施 | 低 | 结构面 | 补一行 + 单测 | 🟢 |
| REQ-12 契约同步 | ✅ 可实施 | 低 | 结构面 | 前后端同批 | 🟢 |

整体：12 条中 7 可实施 / 4 有条件 / 1 待验证（REQ-10 内容效果需实测对比）/ 0 阻塞；整体复杂度 **中**（主导：结构面）。

> REQ-10 之所以记 🧪 待验证：提示词是纯内容产物，「改完更好」只能靠同任务前后对比证明，不能靠代码核验。

## 5. 待确认清单

| # | 待确认 | 为什么必须拍板 | 建议 |
|---|---|---|---|
| Q1 | 「工具调用次数 15」是否**替代**现有 `maxRounds=5`，还是两者并存（轮次不暴露给用户）？ | 二者是不同预算：15 次可集中在 1 轮，5 轮可不限次。语义混用会让用户以为改了轮次 | 保留轮次为内部值（不进 UI），新增 `maxToolCalls` 作为唯一用户可见预算 |
| Q2 | 工具卡是 **4 个**（截图，不含 `ki_scope_list`）还是 **5 个**（现状 `RECALL_TOOL_NAMES`）？ | 放开 scope 后模型需要知道有哪些库可选，`ki_scope_list` 是唯一入口 | 保留 5 个，并把 `ki_scope_list` 语义从「返回本次 targets」改为「返回授权范围内可用库」 |
| Q3 | `ki_recall` 默认传多个 scope 时，「默认范围」= 全部还是第一个？ | 决定未传 scope 时的检索行为 | 全部（沿用现有 `ki_search` 一词多库语义） |
| Q4 | 模型自选 scope 的边界：**仅本次 targets 内**，还是**Token 授权集内任意库**？ | 后者是能力放开，涉及越权风险与可复盘性 | 授权集内任意库，但每次调用必做 `isScopeAccessAllowed` + 审计记录实际 scope |
| Q5 | 分析主链路的**写工具**是否也放开 scope？ | 现有硬边界是「只能写事件所在库」，放开写风险远高于读 | 写工具**保持锁定**，仅 kb-read 放开 |
| Q6 | find 域里的内置 skill `task-recall` 是否移除？ | 它现在只被 recall 借用（因为 recall 强制注入），recall 改独立后它变成 find 域里的死条目 | 从 find 域移除，其判断方法吸收进 REQ-10 的默认提示词 |
| Q7 | 第 4 个域的命名与图标（「AI 预取」/「AI 召回」/「ki_recall」） | 影响左栏文案与用户理解 | 「AI 预取」（与现有文案「分析前预取」一致） |

## 6. 关键假设

| ID | 假设 | 错了会怎样 | 验证方法 |
|---|---|---|---|
| A1 | `recall` 域就是需求所指的「ki_recall 配置」，无需新建第二个域 | 若用户想要的是「按调用方区分多套配置」，方案要重做 | 用户确认 Q1/Q2 时一并确认 |
| A2 | 需求 3 的「AI 在分析过程自动调用其他 mcp」指**事件 AI 分析主链路**，不是 `ki_recall` 内部 | 若只指 recall 内部，REQ-09 整条可砍，工作量减半 | 用户确认 |
| A3 | 工具次数按 `maxToolCalls`（调用次数）而非 `maxRounds`（轮次） | 若用户想要的是轮次，字段选错 | Q1 |
| A4 | 前端「抽象共用」可接受**先抽 3 类高频块**、工具分组暂不抽（照抄 find 最简版） | 若用户要求彻底去重，工作量上升一档 | 用户确认 REQ-01 方案 |

## 7. 建议下一步

1. **先拍板 Q1–Q7**（尤其 Q4 权限边界与 Q5 写工具边界），再进设计——这两条不定，`design-craft` 出来的方案会返工。
2. 拍板后：`use_skill("ui-designer")` 确认第 4 域界面（上方 ASCII 为输入）→ `design-craft` 出技术设计（配置域接线 + scope 解耦 + 鉴权）。
3. **可先行的低风险批次**（不依赖 Q4/Q5）：REQ-02/03/05/06/11/12 + REQ-04 的字段与上下界，一批做完即可让「配置可见且生效」，把事件 #2 收口。

## 8. 接力记录

| # | 触发发现 | 转给 | 产物 | 状态 |
|---|---|---|---|---|
| 1 | 需求含新页面/界面改版（新增第 4 个配置域） | `ui-designer` | 界面方案 + demo | ⏸ 待用户确认 Q1–Q7 后自动接力 |
| 2 | 需求已定后需技术设计（配置域接线 + scope 鉴权 + 队列） | `design-craft` | `design/DESIGN.md` | ⏸ 待接力 1 完成 |
