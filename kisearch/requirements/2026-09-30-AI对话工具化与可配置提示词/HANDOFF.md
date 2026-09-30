# HANDOFF · 一键继续指引

> 需求：**REQ-20260930-001**「AI对话工具化与可配置提示词」
> 更新：2026-09-30 09:20 ｜ 状态：**草案**（批次 1 进行中：1/5 工作项完成）
> 用途：在新环境（新机器 / 新会话 / 换 IDE）按本文即可接上，无需回溯对话

---

## 1. 一句话现状

把「AI 对话如何用知识库」从**内置工具链**改成「**暴露 MCP 工具 + 可配置 skill/提示词**」。
当前：**配置模型与存储已完成**（含 19 条单测）；配置 API、注入生效、配置层 UI 未做；
MCP 工具暴露（批次 2）、工具调用展示（批次 3）**待拍板**后开工。

## 2. 环境与代码位置

| 项 | 值 |
|---|---|
| 仓库 | `HACK-WU/kisearch`（原 `knowledge-indexer`，**已改名**；本机 remote URL 未更新，靠 GitHub 重定向） |
| 开发分支 | `feat/sidebar-ai-chat` |
| 本需求提交 | `fabd5fd` 配置模型+单测 ｜ `0595646` 需求报告+UI方案+demo ｜ `cb37f28` 批次台账 |
| 前提基线 | 需含 `a1215c1`（master 合并 + 多轮上下文修复）；缺失会导致本需求代码无依 |
| 需求库（本目录） | `CodeWikiHub/kisearch/requirements/2026-09-30-AI对话工具化与可配置提示词` |
| 元数据 | 由 `req` 工具维护（`CodeWikiHub/kisearch/requirements/meta.json`） |

## 3. 一键继续（新环境按序照做）

```bash
# ① 起代码环境（新 worktree 必须自装依赖 + 编译引擎，见 §6）
git fetch --all
git worktree add ../ki-tools feat/sidebar-ai-chat
cd ../ki-tools
npm install && (cd web && npm install)
npm run build:zvec-engine            # daemon 运行时硬依赖

# ② 起 daemon（★ env -u NODE_OPTIONS 不能省）
env -u NODE_OPTIONS node bin/ki.mjs mcp --http --daemon --no-web --config ./config.dev.yaml

# ③ 起前端（开发模式）
cd web && npm run dev                # http://127.0.0.1:5173（/api 代理到 7423）

# ④ 验证本需求已有成果
npx jiti test/chat/prompt-config.test.ts   # 本需求新增的 19 条，应全绿
npm run test:chat                           # 全量：10 文件 / 122 断言
```

**续做的第一个动作**：读 `progress/plan.md` 的「工作项」与「进度日志」（状态只认台账，不认记忆）。

## 4. 工作项进度（批次 1）

| # | 工作项 | 状态 | 证据 |
|---|--------|------|------|
| 1 | 配置模型与存储 `src/lib/chat/prompt-config.ts` | ✅ 已完成 | 19 条单测全绿 · `tsc --noEmit` exit 0 · `test:chat` 122 断言 0 失败 |
| 2 | 配置 API `GET/PUT /api/chat/prompt-config` | ⬜ 待办 | ← **下一步**（挂进 `chat-routes.ts`；错误码先用本地常量，勿改冻结契约） |
| 3 | 注入生效（`buildSystemMessages` 接配置，按序：内置 skill → 基础提示词 → 用户 skill → 会话 prompt） | ⬜ 待办 | - |
| 4 | 配置层 UI（⚙ 入口 + 列表→预览→编辑 + **14 个真实工具·三组**） | ⬜ 待办 | demo 里只画了 5 个工具，属错漏，落地时按 14 个 |
| 5 | 回归（单测 + `test:chat` + 后端 tsc + 前端 typecheck） | ⬜ 待办 | - |

## 5. 待拍板项（阻塞批次 2 / 3）

| # | 事项 | 选项 | 影响 |
|---|------|------|------|
| 1 | 暴露哪些 MCP 工具 | 只读 6 个（建议）／ 全量 14 个（含写 6 + 删 2） | 全量 = 给 AI 知识库写删权限 |
| 2 | 无工具时行为 | 明示「本次未检索」／ 保留服务端预检索 | 后者与需求 R1「AI 内部不做知识库交互」**冲突** |
| 3 | R12 工具调用落盘口径 | 仅生成中可查 ／ **落盘摘要（建议）** ／ 落盘完整 | 决定是否触碰 N22 不变量与契约变更范围 |

> 另：`scope` 口径**已定** —— 跨 scope 检索用户已接受；`scope` **不由模型指定**，默认取页面当前选中的 scope
> （实现仍须 ① schema 层剥离该参数 ② 执行层白名单取键；详见 `requirement.md` §5.1）。

## 6. 环境注意事项（已踩过的坑，别重踩）

| 坑 | 现象 | 做法 |
|---|---|---|
| worktree 不共享依赖 | 新 worktree 无 `node_modules` | root + `web/` 各自 `npm install` |
| 沙箱安装被拦 | `CODEBUDDY_BROKER_DENY`（`.bin/` rename 被拒） | **先把 `node_modules` 移走腾空**，再关沙箱装一次 |
| 缺引擎产物 | daemon 报 `Cannot find module dist/zvec-engine` | `npm run build:zvec-engine` |
| 宿主 shim 让服务假死 | daemon 活过会话后 healthz/SSE 无响应、只能 SIGKILL | 常驻服务一律 `env -u NODE_OPTIONS` |
| 预览面板只下发单个 HTML | demo 的相对 `<link>` 取不到 CSS → 整页无样式 | demo 的 CSS **必须内联** |
| 本机 grep 陷阱 | BSD `grep -E` 不支持 `\s`；`\|` 交替会**假阴性** | 用检索工具，或 `[[:space:]]` / `-E` |

## 7. 物料清单（本目录）

| 路径 | 内容 |
|---|---|
| `requirement.md` | M1 需求报告：R1–R12 需求、影响面评估、负向需求、优先级、待确认清单 |
| `design/ui-design.md` | 配置层 UI 方案（含 4 轮返工的「方案基线纠正」：必须复用真实 `ki.css` 与 `ChatPanel` 真实类名） |
| `design/评估-LangChain采纳.md` | 技术选型评估（结论：不整体替换，按"能力是否通用"分层引入） |
| `demo/chat-tools-config/index.html` | 零构建 demo（`ki.css` 内联，单文件自包含，双击即开） |
| `progress/plan.md` · `progress/checklist.md` | 批次台账与自评审清单（含 6 条执行护栏，判据已定死） |

## 8. 需求库卫生（`req doctor` 报的既有问题）

`2026-09-24-Web侧边栏AI对话模块`（AI 对话模块原需求）**存在于磁盘但未登记 meta** → 被 `doctor` 判为孤儿目录。
本需求与它是同一模块的增量关系，但因其未注册，**未建立 `depends_on`**（只在 `requirement.md` 里写明关系）。
处置建议：确认后**补录 meta** 或删除该目录 —— 由你决定。
