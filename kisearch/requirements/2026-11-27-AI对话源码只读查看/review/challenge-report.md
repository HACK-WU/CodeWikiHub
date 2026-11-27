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

# 质疑报告：S-01 工具面与通道隔离

## 📊 变更概述

- **变更类型**：新增功能
- **变更描述**：对话侧接入 4 个源码只读工具（`fs_*`），通道隔离、KB-first 提示、超时与敏感文件拒绝
- **变更文件**：`code-tools.ts` / `code-tools-types.ts` / `mcp-tool-registry.ts` / `tool-loop.ts` / `prompt-config.ts` / `tool-permissions.ts` / `tool-access.ts` / `operation-coordinator.ts` / `ask-runner.ts` / `analysis-fs-tools.ts` / `web chatContract.ts` + 测试
- **变更目的**：知识库答不准时可下探代码，同时不破坏「知识库为主事实源」与 MCP 隔离

## 🔍 质疑详情

### 质疑 #1：超大文件整读导致 OOM

- 🏷️ 类型：边界 / 资源
- 📍 涉及：`analysis-fs-tools.ts::runFsRead`
- ❓ 质疑点：`fs_read` 先 `readFile` 整个文件再切 200 行；对话面向普通用户后，GB 级文件会打满内存，超时也救不了
- 🔍 验证：在测试目录放 9MB 文件调用 `fs_read`
- ⚠️ 风险：进程 OOM，整个 daemon 的对话/导入一起挂
- 📊 置信度：高
- 💡 建议：对话侧限制单文件字节数；分析侧保持原行为
- **状态：成立，已修复**（`maxFileBytes` 8MB，仅对话侧传；测试覆盖）

### 质疑 #2：敏感文件可被读取 / 搜索 / 列出

- 🏷️ 类型：安全 / 数据泄露
- 📍 涉及：`code-tools.ts::runSandbox`
- ❓ 质疑点：`fs_*` 可读仓库内 `.env`、私钥、`.ssh`；viewer 也能触发
- 🔍 验证：在根目录放 `.env` 与 `.ssh/id_rsa`，分别读 / grep / ls
- ⚠️ 风险：凭据外发到模型与对话记录
- 📊 置信度：高
- 💡 建议：拒绝敏感 basename / 目录；模板与公钥放行
- **状态：成立，已修复**（`denyPath` 可选谓词；测试覆盖）

### 质疑 #3：返回路径不可回传

- 🏷️ 类型：体验 / 工具契约
- 📍 涉及：`code-tools.ts` 4 个 run
- ❓ 质疑点：返回 `path` 带 `label:` 前缀，模型原样回传会找不到文件
- 🔍 验证：`fs_read({ path: "demo:a.txt" })`
- ⚠️ 风险：模型多轮读取失败、浪费轮次
- 📊 置信度：中
- 💡 建议：入参归一化，剥前缀并推断 root
- **状态：成立，已修复**（测试覆盖）

### 质疑 #4：根解析异常被静默吞掉

- 🏷️ 类型：可观测性
- 📍 涉及：`code-tools.ts::resolveChatCodeRoots`
- ❓ 质疑点：`resolveScopeTargets` 任何异常都变成「无根」，用户与排查侧无信号
- 🔍 验证：破坏 `views.json` 后发起对话
- ⚠️ 风险：功能静默消失，误判为"没配目录"
- 📊 置信度：中
- 💡 建议：仅 `VIEW_EMPTY` 视为正常；其余写 stderr 或进 `skipped`
- **状态：成立，未修复（🟡 跟进）**

### 质疑 #5：升级默认开放代码读取

- 🏷️ 类型：兼容性 / 运维
- 📍 涉及：`prompt-config.ts::defaultTools`
- ❓ 质疑点：升级后 `fs_*` 默认开，已配 `defaultDir` 的部署会默认获得目录读取
- 🔍 验证：用旧配置（无 fs_* 键）启动，检查工具面
- ⚠️ 风险：管理员未预期的数据暴露面
- 📊 置信度：高
- 💡 建议：发布说明 + S-03 面板提示；管理员复核目录映射
- **状态：成立，未修复（🟡 发布说明跟进）**

### 质疑 #6：symlink 绕过敏感文件名单

- 🏷️ 类型：安全
- 📍 涉及：`denyPath` 判定
- ❓ 质疑点：根内 symlink 指向 `.env` 是否会绕过 basename 检查？
- 🔍 验证：`resolveSafePath` 使用 `realpath`，返回的 `relPath` 是目标真实路径
- ⚠️ 风险：若 relPath 是链接名则会绕过
- 📊 置信度：低（已验证不成立）
- 💡 建议：无
- **状态：不成立**（realpath 归一化后命中 `.env`；`fs_grep`/`fs_find` 直接跳过 symlink）

### 质疑 #7：正则 ReDoS 阻塞事件循环（既有）

- 🏷️ 类型：性能 / 安全
- 📍 涉及：`compileSearchMatcher`
- ❓ 质疑点：灾难性正则同步执行，10s 超时无法中断
- 🔍 验证：构造 `(a|aa)+$` 对长行的匹配
- ⚠️ 风险：单次调用卡住整个 Node 事件循环
- 📊 置信度：中
- 💡 建议：后续评估 RE2 / worker；当前行级 16KB 上限限制影响面
- **状态：既有，非本次引入（🟡 建议跟进）**

## 🎨 体验质量质疑

- 正向：工具卡片仍显示「检索知识库」动作（S-03 修）；模型看到的路径带根标签，引用更清楚。
- 负向：`ROOT_REQUIRED` / `FORBIDDEN_PATH` 是模型可读文案，用户看到的是时间线里的技术错误；S-03 可加映射。
- 总体：⚠️ 体验一般，待 S-03 文案与动作标签。

## 🌍 全局回扣质疑

| 全局质疑 | 回扣结论 | 证据/说明 |
|---|---|---|
| 目标回扣 | ✅ 成立 | 目标是「KB 优先、不足下探」；工具 + 提示块 + 根清单构成完整路径；遵从度为软约束（设计已拍板） |
| 位置回扣 | ✅ 成立 | ChatPanel → chat-routes → runToolLoop → code-tools → 沙箱；`ki_ask` / `/mcp` 被通道位与 INTERNAL_ONLY 隔离 |
| 判据回扣 | ✅ 全部成立 | 页面对话 18 / 无根 14 / ask 14 / 无权限 0；分析侧 `denyPath` / `maxFileBytes` 不传，行为不变；不写 KB |

## 📊 质疑总结

### 🎯 裁决结论

✅ **质疑均不成立 / 已澄清，变更可放行**——3 条成立质疑已在本轮修复并验证；2 条 🟡 跟进（静默降级、升级说明）；1 条既有（ReDoS）。

### 💥 缺陷 → 功能影响翻译

| 质疑 | 预期功能行为 | 实际功能行为（修复前） | 功能影响 |
|---|---|---|---|
| #1 | 读代码片段不会拖垮服务 | GB 级文件整读，进程可能 OOM | 🔴 一次提问可让整个 daemon 不可用 |
| #2 | 只读代码，不读凭据 | `.env` / 私钥可被读取并外发 | 🔴 凭据泄露 |
| #3 | 工具返回的路径可直接复用 | 回传 `label:path` 找不到文件 | 🟡 多轮读取失败、浪费轮次 |
| #4 | 功能异常可见 | 根解析失败静默变成"无工具" | 🟡 用户以为没配目录 |
| #5 | 升级行为可预期 | 已配默认目录的部署默认开放读取 | 🟡 未预期的暴露面 |

### 统计

- 总质疑数：6（成立 5 / 待确认 0 / 不成立 1）
- 高风险：2（均已修复）
- 中风险：3（1 已修复 / 2 跟进）
- 低风险：1（既有）

## 🎯 行动建议

### 必须处理（已处理）
1. 限制对话侧单文件读取大小 — 否则一次提问可拖垮 daemon（#1）
2. 拒绝敏感文件 — 否则凭据可被读取外发（#2）
3. 路径入参归一化 — 否则模型复用返回路径会失败（#3）

### 建议处理
1. 根解析异常留痕或进 `skipped` — 避免功能静默消失（#4）
2. 发布说明写明「升级后默认开」— 避免管理员未预期（#5）
3. 评估 ReDoS 隔离 — 既有风险，当前行级上限限制影响面（#7）

---

# 质疑报告：S-02 多根目录与视图选根

## 📊 变更概述

- **变更类型**：新增功能（视图多根）
- **变更文件**：`src/lib/chat/code-tools.ts`（视图分支 / `resolveByScopeOnly` / `describeChatCodeRoots`）、`code-tools-types.ts`（`view-error`）、`test/chat/code-tools.test.ts`、S-01/S-02/S-03 设计文档
- **变更目的**：视图会话不配目录，按成员库各自的 `byScope` 由模型选根；单库仍 `byScope → defaultDir`

## 📋 需求确认

- **需求**：R3「单库 A/B 各取各；视图两成员各读各；全未映射不暴露」（Q3 拍板：视图不可配目录、只读展示成员映射）
- **理解偏差**：无；实现与拍板一致

## 🔍 质疑清单

| # | 质疑 | 验证 | 风险 | 结论 |
|---|---|---|---|---|
| 1 | 视图文件损坏时，单库会话也会失去代码工具（`resolveScopeTargets` 对所有 scope 先读 views.json） | 构造坏 `views.json` + 单库 `byScope`：原实现返回 0 根 | 🟡 中（功能静默消失） | **已修复**：非 `VIEW_EMPTY` 时写 stderr，并回退到 `resolveByScopeOnly`；单库仍可读，且不回落 `defaultDir`。补测试 |
| 2 | 模型提示块的根清单含 `aliases`，但 `pickRoot` 只接受 `label` | 根清单文本 vs `pickRoot` 分支对比 | 🟡 中（模型用别名 → `UNKNOWN_ROOT`，浪费一轮） | **已修复**：`renderCodeReadBlock` 不再列别名；别名仅留 UI。补测试 |
| 3 | S-02 新增 `view-error`，S-03 窗口的前端 `CodeRootSkipReason` 仍是 5 值 | 读 `web/src/api/chatContract.ts` | 🟡 中（类型/文案缺一支） | **已同步**：S-03 收口后补入 web 契约与 `CODE_ROOT_SKIP_TEXT`（2026-11-27）；typecheck 与 S-03 UI 测试通过 |
| 4 | 视图成员多时，每轮生成 2~3 次 `resolveScopeTargets` + N 次同步 stat | 读 `buildUpstreamMessages` / `toolLoopPath` 调用点 | 🟢 低（视图成员规模小，单机低并发） | 保留；设计 S-02 待定 1 已记缓存方案 |
| 5 | 视图成员未按 principal 授权过滤 | 读 `resolveScopeTargets` 与 chat scope 鉴权 | 🟢 低 | **不成立**：能使用该视图即拥有其成员的聚合读权限，代码访问与 `ki_search` 一致 |
| 6 | `targets.skipped` 统一标 `strict-skipped`，未来新增 skip 原因会误标 | 读 `resolveScopeTargets` 当前只对 strict 产生 skipped | 🟢 低 | 成立但当前无影响；已在文档注明来源限定，后续新增原因需补映射 |

## 🔄 数据守恒 / 全局回扣

- **流向**：根集合 → `selectToolEntries`（工具面）→ `entry.run(ctx.codeRoots)` → 结果 `label:path`；无持久化，无下游数据变更。
- **数量**：`roots` 由成员数经「未映射剔除 + 不可读剔除 + 同 realRoot 去重」后得到；`skipped` 补齐被剔除的成员，数量可对账（roots + skipped ≈ 参与解析的成员数，严格模式下 skipped 含未注册成员）。
- **内容**：`label` 取首个命中成员，`aliases` 保留其余库名（仅 UI）；引用前缀统一 `label:path`。
- **异常归宿**：不可读 → `unreadable`；未映射 → `unmapped`；坏 views → `view-error` + stderr；无静默丢弃。
- **全局回扣**：单库路径不变；视图从「S-01 不装配」变为「按成员多根」，与 R3 目标一致；`ki_ask` 仍不装配（`toolFace` 过滤不变）。

## 🎯 结论

- 质疑 6 条：成立 5（2 已修 / 1 跨窗口待同步 / 2 低风险跟进）、不成立 1。
- **变更可放行**；`view-error` 已补入 S-03 前端契约与文案映射。
