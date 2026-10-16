# 知识Wiki与知识组织子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（知识库专家）
- **资产路径**：`.module-experts/后端专题/知识库专家/sub-experts/知识Wiki与知识组织子专家/`
- **职责**：本子专家把 Wiki 当作「知识库上的派生索引」：源文档 durable FINISH 后入队，走 `map`（源映射）→ `identity_resolve`（身份归一，复用子专家③）→ `reduce`（多来源归并）→ 投影（写页面与向量）→ 对账（reconciler 周期收敛）→ 撤回（retraction 回收失源页面）的链条；在此之上提供页面浏览、目录树与自动分类。页面内容通过 `KnowledgeWikiProjectionService` 投影成知识库的**系统托管文档**（`sourceKey = 'system:knowledge-wiki'`），因此 Wiki 产物本身也可以被检索消费。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/knowledgebase/wiki`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - Wiki 状态列挤在 `knowledgebase` 表
  - 配置指纹变化触发重建
  - 页面必须由 source chunk evidence 支撑
  - `requiresAdditionalChargeConfirmation` 需人工确认
  - 分类 run 的幂等与 `apply` 语义
  - 投影后可被检索消费，但与用户文档隔离
- **测试状态**：1. 测试布局（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
