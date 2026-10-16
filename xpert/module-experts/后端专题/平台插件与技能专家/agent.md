# 平台插件与技能专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/平台插件与技能专家/`
- **职责**：本专家负责「插件与技能的准入 — 落地 — 运行」闭环：插件作为包从市场来源（内置公开目录 / git / github / 平台注册表 / npm）、本地代码目录或上传归档进入平台，经 SDK 兼容校验、归属层级判定、暂存（staging）、数据库结构预检、运行期模块加载与路由/策略注册后成为进程内能力；插件导出的可移植资源（SKILL / MCP_SERVER / TOOLSET / APP / HOOK）按固定矩阵安装到工作区、智能体或组织；技能包的安装、创作、上传、分享与卸载，技能仓库与仓库索引的登记、同步与市场聚合亦归本专家。一句话：**凡涉及「这台机器装了哪些插件、装完什么时候生效、插件能力落到哪个工作区或智能体」的问题，都找这个专家。
- **子专家**：子专家①[技能包与技能仓库子专家](file://.module-experts/后端专题/平台插件与技能专家/sub-experts/技能包与技能仓库子专家/C0-使用总览.md) · 子专家②[插件安装与运行时子专家](file://.module-experts/后端专题/平台插件与技能专家/sub-experts/插件安装与运行时子专家/C0-使用总览.md) · 子专家③[插件资源与模板安装子专家](file://.module-experts/后端专题/平台插件与技能专家/sub-experts/插件资源与模板安装子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server/src/plugin`
  - `server-ai/src/plugin-resource`
  - `server-ai/src/skill-package`
  - `server-ai/src/skill-repository`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 要装 / 卸 / 升级插件（`POST /api/plugin`、`POST /api/plugin/archive`、`POST /api/plugin/update`、`DELETE /api/plugin/uninstall`）。
  - 要配市场来源：内置公开目录、自建 git / github 目录、平台注册表条目（`/api/plugin/marketplace/sources`、`/api/plugin/marketplace/registry`）。
  - 要走系统初始化向导批量装插件（`/api/system/setup/plugins`）。
  - 要从模板或插件把 portable 资源装到工作区 / Xpert / 组织（`/api/plugin/:name/resources/*`、模板安装命令）。
  - 要启用插件导出的 MCP Server 组件并取连接信息或凭据（`/api/plugin/:name/resources/mcp/*`）。
  - 要建技能仓库、登记来源、同步索引（`/api/skill-repository`、`/api/skill-repository-indexes`）。
- **测试状态**：本范围四个目录共 **69** 个 spec：`packages/server/src/plugin` 39、`packages/server-ai/src/plugin-resource` 16、`packages/server-ai/src/skill-package` 7、`packages/server-ai/src/skill-repository` 7。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
