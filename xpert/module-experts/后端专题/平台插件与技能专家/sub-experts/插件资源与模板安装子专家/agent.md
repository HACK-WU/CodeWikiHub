# 插件资源与模板安装子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（平台插件与技能专家）
- **资产路径**：`.module-experts/后端专题/平台插件与技能专家/sub-experts/插件资源与模板安装子专家/`
- **职责**：本子域是「**不重启也能生效的落点层**」：它把插件域产出的能力，按固定矩阵分发到三个落点，用 `definitionHash` 与 `runtimeNodeKey` 把「定义版本」与「图上的绑定」分开记录，用唯一 `scopeKey` 把并发收口到数据库。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/plugin-resource`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 唯一 `scopeKey` 就是数据库并发锁：`plugin_application_installation` 的 unique `(tenantId, pluginName, appName, scopeKey)` 是「同一 App × 同一 scope 只允许一次编排」的闸门；插入冲突被解释为「别的请求已认领」而**不是错误**（`catch {}` 后回读）。`INITIALIZING` 行只要 `updatedAt` 早于 5 分钟就允许被第二个请求接管 —— 这是**启发式 reclaim 窗口**，长耗时初始化可能被误判为进程已崩。
  - 组件 → 目标合法性固定：`organization` 仅 `TOOLSET`；`workspace` 为 `SKILL` / `MCP_SERVER` / `APP`；`xpert` 为 `HOOK`；**`ASSET` 在无目标时也被排除，永不安装**。显式选择器若与目标不匹配即 400，**绝不静默丢弃**。
  - 模板不得把插件导出的全部 Skill / MCP / Hook / App 当副作用装上：`dependencies.plugins` 被注释定格为「runtime prerequisites only」，解析函数只遍历 portable 资源数组；该隔离**只由注释与测试约束**，契约里没有类型级强制 —— 谁「顺手」读了 `plugins`，模板就会一次装上整包组件。
  - recovery 标识绝不接受 HTTP 输入：`PluginTemplateInstallCommand.bootstrap`（`resumeXpertId` + `onImported`）标注「never accepted from an HTTP body」，实际调用方只有服务端 bootstrap 流程（如 `bosi-bootstrap.service.ts`）。
  - 无登录用户时必须显式解析 scope：`applyPluginResourceOrganizationScope` 在 tenant 缺失时抛 400 `A tenant scope is required to manage plugin resources.`，**绝不发出无 scope 的查询**；`organizationId` 为空时强制 `organizationId IS NULL`，避免 tenant 级行与组织级行互相污染。
  - `definitionHash` 只表达「定义是否陈旧」：组件状态里的 `staleDefinition = 已安装 && effectiveInstallation.definitionHash !== component.definitionHash`；定义变更**不会自动重装**，只是标记陈旧，重装需再次触发安装。
- **测试状态**：本子域共 **16 个 spec**（`packages/server-ai/src/plugin-resource/` 下 32 个源文件 + 16 个 spec），无 `.only` 标记，无按环境变量整组跳过的用例：（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
