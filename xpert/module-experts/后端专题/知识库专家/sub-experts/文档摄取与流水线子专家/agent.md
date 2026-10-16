# 文档摄取与流水线子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（知识库专家）
- **资产路径**：`.module-experts/后端专题/知识库专家/sub-experts/文档摄取与流水线子专家/`
- **职责**：本子专家负责「文件怎么变成可检索资产」：单篇 / 批量 / 幂等 / 增量四种登记口径，一条以 Bull 队列 `embedding-document` 为主干的异步流水线（validate → transform → split → understand → embedding → finish），本子域自持的 3 条派生队列（自动标签 / 生成问题 / FAQ 语义预热），chunk 与页面的读写面，原文件预览下载，以及删除回收与重处理能力探测。检索与向量存储不在本子专家，见子专家①。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/knowledge-document`
  - `server-ai/src/rag-web`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 就绪门：Bull 注册 worker 早于 CQRS 注册 handler
  - 队列 payload 让 `mode` 跨边界持久
  - 派生索引只在 durable FINISH 后派发，且队列不可用时静默滞后
  - splitter / image 设置故意不进 transform 快照指纹
  - `rechunk` 遇非法快照故意失败，而非静默转换
  - 删除侧 `indeterminate` 需人工 / 补偿
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
