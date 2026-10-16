# 知识库专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/知识库专家/`
- **职责**：本专家回答「知识怎么进来、以什么代价变成可检索资产、Agent 怎么把它检出来」：以知识库（`Knowledgebase`）为聚合根，向上提供作用域 CRUD、可见性与模型绑定，向内把文档摄取变成一条可幂等、可增量的异步流水线，向 Agent 供给「向量 + 关键词 + 图谱」三路召回与融合/重排/结构化过滤能力，并以派生索引（GraphRAG 图谱、知识 Wiki、自动标签、生成问题、FAQ 语义预热）持续增值。它的核心张力是「主链一次性成功」与「派生索引最终一致」之间的窗口：窗口内的一致性问题被显式记账为可查询、需人工/补偿介入的中间态，而不是被掩盖。
- **子专家**：子专家①[GraphRAG与知识身份子专家](file://.module-experts/后端专题/知识库专家/sub-experts/GraphRAG与知识身份子专家/C0-使用总览.md) · 子专家②[文档摄取与流水线子专家](file://.module-experts/后端专题/知识库专家/sub-experts/文档摄取与流水线子专家/C0-使用总览.md) · 子专家③[知识Wiki与知识组织子专家](file://.module-experts/后端专题/知识库专家/sub-experts/知识Wiki与知识组织子专家/C0-使用总览.md) · 子专家④[知识库检索与向量存储子专家](file://.module-experts/后端专题/知识库专家/sub-experts/知识库检索与向量存储子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/knowledgebase`
  - `server-ai/src/knowledge-document`
  - `server-ai/src/graphrag`
  - `server-ai/src/rag-vstore`
  - `server-ai/src/rag-web`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 绝大多数路由没有 `@UseGuards`
  - `tag-usage` 与 `:id` 的路径形态
  - `graphrag` 与 `wiki` 双挂载 `/knowledgebase` 前缀
  - 派生索引只在源文档 durable FINISH 后派发，且失败静默
  - `indeterminate` 类中间态需人工/补偿
  - 幂等三元组 `sourceKey` + `sourceHash` + `processingHash`
- **测试状态**：1. `rag-web/` 无 `.spec.ts`，只有两个 provider 冒烟 `.test.ts`；`rag-web/loader.ts` 为 **0 字节空文件**（可疑，是否有意未确认）。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
