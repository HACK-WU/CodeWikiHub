---
id: REQ-20261127-001
feature: AI对话源码只读查看
status: 实施中
created: 2026-11-27
updated: 2026-11-27
version: 1
tags: [feat, ai, chat, security, web]
author: AI
document_type: review
---

# 代码审查报告：S-01 工具面与通道隔离

## 审查上下文

| 项 | 值 |
|---|---|
| 变更 | 14 文件 +195 −40；新增 `code-tools.ts`（515 行）、`code-tools-types.ts`（40）、`code-tools.test.ts`（254） |
| 模式 / 需求 | 深度 · REQ-20261127-001 · 工作区未提交 |
| 检查覆盖 | 16 条（✅12 / ⚠️3 / ➖1） |
| 既有缺陷 | 2 项（Q6 / Q7，不阻塞） |
| 验证 | `npm run build` ✅；`test:chat` 41/43 绿（2 项既有基线）；`analysis-fs-tools` 6/6；web `typecheck` ✅ |

## 一 · 审查过程

### 1.1 我的理解

- **业务目标**：对话在知识库答不准时可下探代码，知识库仍是主事实源；MCP 通道不可读取本机源码。
- **系统位置**：ChatPanel → chat-routes → `runToolLoop`（工具面过滤 + 执行 Map）→ `code-tools`（根解析 + 沙箱）→ `analysis-fs-tools`（复用）。
- **整体成功判据**：① 页面对话有根时可调 `fs_*`；② `ki_ask` / `/mcp` 不可见；③ 知识库足够时不强制读代码；④ 代码目录只读且不可越界；⑤ 事件分析行为不变。

| 位置 | 我以为它要做什么 | 置信度 | 状态 |
|---|---|---|---|
| `code-tools.ts::resolveChatCodeRoots` | 单库取 byScope/defaultDir；视图暂空 | 🟢 | ✅ |
| `code-tools.ts::createChatCodeToolEntries` | 4 个只读工具，根由 ctx 注入 | 🟢 | ✅ |
| `tool-loop.ts::selectToolEntries` | 按 capability / 通道 / 有根过滤 | 🟢 | ✅ |
| `tool-loop.ts::codeBlockFor` | 有工具、有根、有权限才注入提示块 | 🟢 | ✅ |
| `analysis-fs-tools.ts::denyPath` | 对话侧敏感路径拒绝，分析侧不传 | 🟢 | ✅ |

### 1.2 问题（本轮已修复）

#### `Q1` · 🟥 本次引入 · 🔴（已修复）
- **位置**：`analysis-fs-tools.ts::runFsRead`
- **问题**：`fs_read` 直接 `readFile` 整个文件再切行；对话侧面向普通用户后，一个 GB 级文件即可打满进程内存（异步读也救不了整块缓冲）。
- **修复**：`FsSandboxContext.maxFileBytes`（新增可选）；对话侧传 8MB，分析侧不传（行为不变）；超限返回 `INVALID_ARG` 并提示改用 `fs_grep`。测试：9MB 文件 → `INVALID_ARG`。

#### `Q2` · 🟥 本次引入 · 🔴（已修复）
- **位置**：`code-tools.ts::isSensitiveRelPath` / `runSandbox`
- **问题**：`fs_*` 可读 / 搜 / 列仓库内 `.env`、私钥、`.ssh` 等凭据；viewer 也能触发。
- **修复**：对话侧传 `denyPath`，拒绝 `.env*`、`.npmrc`、`.netrc`、`.git-credentials`、`id_rsa*`、`credentials*`、`secrets*`、`*.pem|key|p12|pfx|jks|keystore` 及 `.ssh/.aws/.gnupg/.kube/.docker` 目录；`.env.example` 与 `.pub` 放行。分析侧不传（行为不变）。测试：读 `.env` → `FORBIDDEN_PATH`；grep 不命中；`fs_ls` 不列出。

#### `Q3` · 🟥 本次引入 · 🟡（已修复）
- **位置**：`code-tools.ts::normalizePathArg`
- **问题**：工具返回 `path: "{label}:{rel}"`，模型若原样回传（复制引用路径），`fs_read` 会按 `label:rel` 找不到文件。
- **修复**：入参归一化——命中已选根 / 可读根的 `label:` 前缀则剥掉并推断 `root`；显式 `root` 时只剥该根前缀。测试：`path: "demo:a.txt"` → 读取成功。

### 1.3 未修复项（不阻塞，建议跟进）

#### `Q4` · 🟥 本次引入 · 🟡
- **位置**：`code-tools.ts::resolveChatCodeRoots` 的 `try/catch`
- **问题**：`resolveScopeTargets` 的任何异常（含 `views.json` 损坏）都被吞成「无根」，`fs_*` 静默消失，用户与排查侧都没有信号。
- **建议**：仅把 `VIEW_EMPTY` 视为正常空；其余错误写一行 stderr（不打断对话），或进 `skipped` 让 S-03 的清单显示原因。

#### `Q5` · 🟥 本次引入 · 🟡（运维）
- **位置**：`prompt-config.ts::defaultTools`
- **问题**：升级后 `fs_*` 默认开；已配 `defaultDir` 的部署，对话会默认获得该目录的读取能力，管理员未必预期。
- **建议**：发布说明明确「升级后默认开」并提示复核 `analysis.targetDirs`；S-03 的面板文案已计划标注。

#### `Q6` · ⬜ 既有 · 🟡
- **位置**：`analysis-fs-tools.ts::compileSearchMatcher`
- **问题**：正则 ReDoS 只做了简单嵌套量词启发式；灾难性正则运行在同步 `test()` 中，10s 超时无法中断（事件循环被占）。
- **建议**：后续评估 RE2 / worker 隔离；当前行级 16KB 上限可限制影响面，非本次引入。

#### `Q7` · ⬜ 既有 · 🟢
- **位置**：`operation-coordinator.ts::READ_MCP_TOOLS`
- **问题**：`fs_*` 已登记读车道，但对话侧 `entry.run` 不经过 coordinator，登记实际无效（无害）。
- **建议**：后续若把 `fs_*` 接入 MCP 面再启用；当前保留不影响行为。

### 1.4 待验证项

- `T1` · 真机 SSE：起 daemon + 配置目录，确认对话出现 `fs_*`、答案带 `label:file:line`；`ki_ask` 工具面仍 14 个。
- `T2` · KB-first 遵从度：三组问题集各 10 次，统计「KB 足够却读代码」比例（设计 Q4 抽样）。
- `T3` · 视图会话：S-02 完成后验证成员多根与 `ROOT_REQUIRED`。

## 二 · 结论

### 2.1 合入结论

**✅ 可直接合入**（Q1/Q2/Q3 已在本轮修复并验证；Q4/Q5 为 🟡 非阻塞跟进项）。

### 2.2 质量评分

| 维度 | 评分 | 状态 | 依据 |
|---|---|---|---|
| 语义一致性 | 9/10 | ✅ | 意图与实现一致；KB-first 为软约束（设计已确认） |
| 安全性 | 9/10 | ⚠️ | 敏感文件与超大文件已拦；ReDoS 属既有 |
| Bug 风险 | 9/10 | ✅ | 通道 / 查表 / 超时 / 根路由均有测试 |
| 代码规范 | 9/10 | ✅ | 类型集中、注释解释约束 |
| 架构设计 | 9/10 | ✅ | 复用沙箱、适配层隔离、分析侧零行为变化 |
| 性能 | 8/10 | ⚠️ | 每轮 stat + grep 全仓扫描；10s 超时兜底 |
| 测试覆盖 | 8/10 | ⚠️ | 23 例新测；缺 loop 级构造调用与真机 |

整体：**A（8.7）**

### 2.3 需要你拍板

无（Q4/Q5 为跟进项，不阻塞；是否补 stderr 日志 / 发布说明可按批次安排）。

### 2.4 亮点

- 执行查表从全局 `getChatTool` 改为过滤后的 Map，同时堵住构造式调用绕过。
- 敏感路径拒绝做成可选 ctx 参数，分析侧零改动。
- 返回路径带根标签且入参可回传，避免多根串台与复制路径失败。

## 阶段 8 测试验证

| 项 | 结果 |
|---|---|
| `npm run build` | ✅ 0 |
| `test/chat/code-tools.test.ts` | ✅ 23/23（含敏感文件、超大文件、路径回传、通道隔离） |
| `test/events/analysis-fs-tools.test.ts` | ✅ 6/6（隔离断言已按新策略更新） |
| `npm run test:chat` | 41/43；失败：`prompt-config-routes`（3 例既有基线）、`e2e-sr02-sources`（模块别名，既有环境问题） |
| `test/events/analysis-runner.test.ts` | ✅ 9/9 |
| `test/events/analysis-ask-tools.test.ts` | ✅ 6/6 |
| `web npm run typecheck` | ✅ 0 |
| web `npm test` | 10 项 event 页面既有断言失败（未触及相关文件） |

## 影响面提示

⚠️ 影响面未做穷举：本次改了 `ChatMcpToolEntry.run` 签名（新增可选 `ctx`）、`FsSandboxContext`（新增可选字段 + 错误码）、`PromptToolGroup.key` 联合类型、`CHAT_MCP_TOOLS` 数量（14→18）。建议转 `code-change-impact` 补齐调用方与回归清单（已 grep 的调用方见设计 §7，可确认后忽略）。

## 质疑记录

见 [challenge-report.md](challenge-report.md)：6 条质疑，3 条成立且已修复（OOM、敏感文件、路径回传），2 条 🟡 跟进（静默降级、升级默认开），1 条既有（ReDoS）。

---

# Code Review · S-03 界面与可观测（2026-11-27）

## 审查上下文

| 项 | 值 |
|---|---|
| **变更** | 9 文件 +204 −29 · `chat-routes.ts` / `prompt-config.ts` / `PromptConfigLayer.tsx` / `ChatPanel.tsx` / `chatApi.ts` / `chatContract.ts` / `usePromptConfig.ts` + 2 测试 |
| **模式 / 需求** | 标准 · `REQ-20261127-001` · 工作区未提交 |
| **检查覆盖** | 13 条（✅9 / ❌1 / ⚠️2 / ➖1） |
| **既有缺陷** | 2 项（`e2e-sr02-sources` 模块别名、web 10 项 event 页面断言，均与本次无关） |

## 一 · 审查过程

### 1.1 我的理解

- **业务目标**：让用户在设置页看清「对话能读哪些代码目录」（尤其是视图会话），并在时间线看懂 AI 在读代码。
- **系统位置**：`GET /api/chat/prompt-config?scope=`（`buildCodeRootsDto` → `resolveChatCodeRoots`）→ `PromptConfigLayer` 渲染 → `ChatPanel` 时间线动作标签。
- **整体成功判据**：单库/视图的目录展示与执行侧同源；纯文案改动不改变工具开关语义；旧版 daemon（无 `codeRoots`）不报错。

### 1.2 问题

#### `Q1` · 🟥 本次引入 · 🟡（已修复）

- **位置**：`web/src/chat/PromptConfigLayer.tsx` `CodeRootsBlock`
- **问题**：banner 的成员列表直接合并 `codeRoots.skipped`。`view-empty` / `view-error` / `forbidden` 是**整视图级原因**（`label` = scope 本身），被当成成员渲染：空视图会显示「视图「v」= v」，坏视图会把视图名混进成员列表。
- **业务后果**：用户看到视图把自己当成员、或把错误原因当成员名；与设计「视图无成员 →（无成员）」不符。
- **依据**：`resolveChatCodeRoots` 的 `view-empty` / `view-error` 返回 `{ label: scope, reason }`。
- **修复**：拆 `memberSkipped`（unmapped / unreadable / strict-skipped）与 `scopeIssues`（view-empty / view-error / forbidden）；成员列表只用前者，后者单独成提示行。补 `web/test/code-roots-ui.test.mjs` 断言。

#### `Q2` · 🟥 本次引入 · 🟡（需拍板）

- **位置**：`src/lib/chat/chat-routes.ts` `buildCodeRootsDto`
- **问题**：`isView` 为真时**跳过** `authScopes` 检查（注释：视图由顶栏过滤、只泄露目录路径）；而设计 §5 写的是「scope 不在授权范围 → `forbidden`」。
- **业务后果**：受限 Token 只要知道视图名，就能拿到成员库的绝对目录路径（不含正文）。属低敏感信息泄露，但与既有 `datasourceDirs` 的授权口径不一致。
- **依据**：`if (!allowAll && !isView && !authScopes!.includes(scope))`。
- **修复方向**：① 接受该例外并在设计 §5 补「视图按成员可见性放行」的口径；② 收紧为「视图成员全部在 `authScopes` 内才放行」，否则 `forbidden`。
- **修复（2026-11-27）**：采用 ② 并兼容显式授权——`authScopes` 含视图名，或成员全部在 `authScopes` 内，才返回目录；否则 `forbidden`。补 4 条路由用例（成员不全 / 成员全含 / 显式授权视图名 / 非视图原行为）。

#### `Q3` · 🟥 本次引入 · 🟢

- **位置**：`src/lib/chat/chat-routes.ts:779-792`
- **问题**：`buildCodeRootsDto` 先 `readViews(cfg)` 判断 `isView`，再 `resolveChatCodeRoots` → `resolveScopeTargets` 又读一次 `views.json`。设置页每打开一次读两遍。
- **业务后果**：无功能影响；`views.json` 很小，仅多一次同步读。
- **修复方向**：把 `isView` 作为可选入参传给解析器，或让解析器返回 `isView`。

#### `Q4` · 🟥 本次引入 · 🟢（已修复）

- **位置**：`src/lib/chat/prompt-config.ts:1180`、`src/lib/events/analysis-runner.ts:1500`、`analysis-store.ts:309`
- **问题**：目录卡片已改名「代码目录（分析 / 对话共用）」，但校验错误与分析错误仍写「分析目标目录」。
- **业务后果**：用户按错误提示在界面上找不到「分析目标目录」。
- **修复**：三处文案统一为「代码目录」；无测试断言旧文案。

#### `Q5` · 🟥 本次引入 · 🟢（已同步）

- **位置**：`web/src/api/chatContract.ts`、`PromptConfigLayer.tsx` 的 `CodeRootSkipReason` / `CODE_ROOT_SKIP_TEXT`
- **问题**：S-02 新增 `view-error`，S-03 前端契约与文案缺该值；后端可返回它，UI 会渲染空文案。
- **修复**：补 `view-error` 与「视图定义读取失败」；`code-roots-ui` 测试加入该值。

### 1.3 既有缺陷

- `test/chat/e2e-sr02-sources.test.ts`：`@/lib/authEvents` 模块别名解析失败（与本次无关）。
- web 全量 10 项 event 页面源码断言失败（未触及本次文件）。

### 1.4 待验证项

无（真机验证见阶段 8）。

## 二 · 结论

### 2.1 合入结论

**✅ 通过（D1 已修复）**：Q1/Q4/Q5 已修复；Q2 对应 D1，2026-11-27 已收紧为「视图显式授权或成员全部在 `authScopes` 内才展示目录」。

### 2.2 质量评分

| 维度 | 评分 | 状态 | 依据 |
|---|---|---|---|
| 语义一致性 | 8/10 | ⚠️ | Q2 与设计 §5 口径不一致 |
| 安全性 | 7/10 | ⚠️ | Q2 目录路径对受限 Token 可见 |
| Bug 风险 | 8/10 | ✅ | Q1 已修 |
| 代码规范 | 9/10 | ✅ | 文案与类型同步 |
| 架构设计 | 9/10 | ✅ | 展示与执行共用 `resolveChatCodeRoots` |
| 性能 | 9/10 | ✅ | Q3 低影响 |
| 测试覆盖 | 7/10 | ⚠️ | 路由测试覆盖 3 态；视图/forbidden 无常驻用例，靠真机 |

### 2.3 需要你拍板

#### `D1` · 视图会话的目录展示是否按 `authScopes` 收紧

- **背景**：视图名通常不在 Token 的库白名单里；当前放行只泄露成员目录路径，不含正文。
- **为什么要你定**：这是安全口径与既有 `datasourceDirs` 一致性的取舍，不是纯技术选择。
- **选项**：① 接受例外 + 补设计文档；② 收紧为「成员全部可访问才放行」。
- **决定（2026-11-27）**：**已修复**。`buildCodeRootsDto` 改为「显式授权视图名，或成员全部在 `authScopes` 内」才返回目录；否则 `roots=[]` + `skipped: forbidden`。设计 §5 同步。

### 2.4 亮点

- 展示接口复用执行侧 `resolveChatCodeRoots`，杜绝「展示的目录」与「AI 能读的目录」两套口径。
- `usePromptConfig` 以 `scope` 为依赖重新拉取，视图清单随顶栏切换即时更新。
- 时间线动作标签按工具名映射，其余工具保持原文案，旧记录零影响。

## 阶段 8 测试验证

| 项 | 结果 |
|---|---|
| `npm run build` | ✅ 0 |
| `npm run test:chat` | 42/43（仅 `e2e-sr02-sources` 既有） |
| `web npm run typecheck` | ✅ 0 |
| `web/test/code-roots-ui.test.mjs` | ✅ 9/9 |
| `prompt-config-routes` / `prompt-config` / `analysis-runner` | ✅ 19/19（含 4 条视图授权收紧用例）、全绿 |
| 真机 LLM（隔离实例 7435，alpha） | ✅ `ki_search`（无 KB）→ `fs_grep` → `fs_read`；答案 `alpha:src/lib/chat/code-tools.ts:39`，值 `10_000` 正确 |
| 真机 LLM（视图 `s03-view`） | ✅ 模型自选 `root: beta` 调 `fs_find` / `fs_ls` / `fs_read`；答案 `beta:package.json:2` = `xpert.ai` |
| 时间线动作标签（Playwright 1440） | ✅ 「检索知识库 / 检索源码 / 读取文件」，0 console error |
| `GET /prompt-config?scope=s03-view` | ✅ alpha/beta + gamma `unmapped`，与面板一致 |
