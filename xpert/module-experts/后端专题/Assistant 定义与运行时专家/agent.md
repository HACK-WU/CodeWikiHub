# Assistant 定义与运行时专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/Assistant 定义与运行时专家/`
- **职责**：本域是 Assistant 的**「户籍 + 门禁 + 分发」**：定义（DSL 草稿）→ 发布（版本行）→ 准入（谁能跑）→ 文件授权（能碰哪些文件）→ 创作容器（`XpertWorkspace`）→ 分发（模板 / 市场 / 系统槽位绑定 / 企业 H5）。本域不拥有 Agent 执行链，也不拥有会话本体。
- **子专家**：子专家①[助手定义与发布子专家](file://.module-experts/后端专题/Assistant 定义与运行时专家/sub-experts/助手定义与发布子专家/C0-使用总览.md) · 子专家②[工作区与文件授权子专家](file://.module-experts/后端专题/Assistant 定义与运行时专家/sub-experts/工作区与文件授权子专家/C0-使用总览.md) · 子专家③[模板市场绑定与环境子专家](file://.module-experts/后端专题/Assistant 定义与运行时专家/sub-experts/模板市场绑定与环境子专家/C0-使用总览.md) · 子专家④[运行时API与准入子专家](file://.module-experts/后端专题/Assistant 定义与运行时专家/sub-experts/运行时API与准入子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/xpert`
  - `server-ai/src/ai`
  - `server-ai/src/xpert-template`
  - `server-ai/src/xpert-workspace`
  - `server-ai/src/assistant-binding`
  - `server-ai/src/xpert-marketplace`
  - `server-ai/src/environment`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 新建 / 改草稿 / 发布 / 回滚版本 / DSL 导入导出 / 复制一个 Assistant。
  - 读一个已发布 Assistant 的对外投影、运行时能力、可用模型与模型偏好。
  - 判断「谁能跑这个 Assistant」：公共 App、企业 H5、工作区 API-Key、登录用户四类受众。
  - 读写在 **Assistant 数据卷**里的文件（运行时侧或 Studio 创作侧）。
  - 管理创作容器 `XpertWorkspace`：成员、可见性、默认工作区、软删 / 归档 / 恢复。
  - 取模板目录与详情、安装模板、同步技能资产。
- **测试状态**：1 测试框架与运行方式（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
