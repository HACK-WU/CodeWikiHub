# 知识库检索与向量存储子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（知识库专家）
- **资产路径**：`.module-experts/后端专题/知识库专家/sub-experts/知识库检索与向量存储子专家/`
- **职责**：本子专家是知识库域的「资产 + 出口」面：以 `Knowledgebase` 为聚合根管理作用域、可见性、模型绑定与结构化过滤定义；把「向量 + 关键词 + 图谱」三路召回组装成一次可调参、可审计、可重排的检索；并以唯一入口 `KnowledgeDocumentStore` 读写向量，以 `rag-vstore` 抽象具体向量库（PGVector 是当前落地分支）。摄取与切片加工不在本子专家，见子专家②。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/knowledgebase（主体 / retrieval / tags / faq / runtime）`
  - `server-ai/src/rag-vstore`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 绝大多数路由没有 `@UseGuards`
  - `tag-usage` 与 `:id` 的路由遮蔽
  - 库级前缀的实际形态是 `/api/knowledgebase/:id/...`
  - 向量表不是 TypeORM 实体（运行期建表）
  - `assertNotRebuilding` 只在 `REBUILDING` 时阻断
  - 切模型期间新旧 collection 并存
- **测试状态**：1. 测试分布与规模（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
