# GraphRAG与知识身份子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（知识库专家）
- **资产路径**：`.module-experts/后端专题/知识库专家/sub-experts/GraphRAG与知识身份子专家/`
- **职责**：本子专家覆盖「知识图谱」与「知识身份」两件事，二者同域的原因写在数据模型里：图谱节点的归一结果直接落在图实体自身的唯一键上——`KnowledgeGraphEntity` 声明 `@Index(['knowledgebaseId', 'identityId'], { unique: true })`，即「同一 KB 内一个身份最多对应一个实体」。图谱侧负责索引链、实体 / 关系的手工修正与清理、邻域与可视化；身份侧负责把候选名归一为稳定身份（`resolve` / `resolveBatch`），并用 LLM 裁判处理歧义。Wiki 与图谱共用同一身份层。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/graphrag`
  - `server-ai/src/knowledgebase/identity`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 唯一 `(knowledgebaseId, identityId)` 是归一底线
  - 语义检索有界，且从不授权 merge
  - 域 / 范围文本是证据，不是本地分类
  - `hide` ≠ 删除
  - `_contribution` 的 `sourceDocumentIdSnapshot` 是溯源锚点
  - 索引 job 并发与重试
- **测试状态**：1. spec 总量与布局（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
