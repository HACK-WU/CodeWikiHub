---
groupPath: 数据流/知识库专家
relation: knowledgebase_task
exportedAt: "2026-10-16T03:53:30.128Z"
---
【数据流｜knowledgebase_task】\n- 实体类型：表（KB 级长任务台账）\n- 结构：`taskType`(默认 embedding)、`status`(`pending|running|success|failed|cancelled`)、`steps`(jsonb)、`error`、`finishedAt`、`context`、`conversationId`/`executionId`；无额外唯一索引\n- 生产方：`POST :id/task` 与 `POST :id/task/:taskId/process`（`PermissionGuard`）\n- 主要消费方：knowledgebase(4) `[基于引用扫描，未深入验证]`\n- 业务用途：可观测的 KB 级长任务（含流水线回调 `knowledge.pipeline_callback.v1` 汇聚）\n- 详细流向：见 .module-experts/后端专题/知识库专家/C4-数据流向与消费.md §2