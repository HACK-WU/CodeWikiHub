---
groupPath: 数据流/向量引擎
relation: Embedding向量
exportedAt: "2026-08-28T04:24:44.863Z"
---
【数据流｜Embedding 向量】
- 实体类型：数据结构（内存 Float32Array，不落盘）
- 结构：Float32Array，维度 4096（必须与集合 dimension 一致，否则 DimensionMismatchError）
- 生产方：SiliconFlowProvider.embed @ src/zvec-engine/embedding/siliconflow.ts（OpenAI 兼容端点，EMBED_BATCH_SIZE=64）
- 主要消费方：engine.write（写入集合 dense 字段）、engine.search（查询文本向量化）；主线程 embed 后经 Transferable 零拷贝传 worker 线程
- 业务用途：文本 → 向量，语义检索的基础
- 详细流向：见 .module-experts/向量引擎专家/C4-数据流向与消费.md