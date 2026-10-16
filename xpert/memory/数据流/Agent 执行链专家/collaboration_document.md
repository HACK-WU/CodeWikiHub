---
groupPath: 数据流/Agent 执行链专家
relation: collaboration_document
exportedAt: "2026-10-16T03:54:17.313Z"
---
【数据流｜collaboration_document 与 collaboration_update】\n- 实体类型：CRDT 权威快照 + 有界不可变更新日志\n- 结构：`collaboration_document`：**唯一 `(scopeKey, providerKey, resourceId)`** + 普通索引 `(tenantId, organizationId, providerKey, status)`；关键列 `stateBase64`、`stateVectorBase64`、`sequenceNumber`、`updateCount`、`materializedSequence`、`materializationStatus`；`collaboration_update`：**唯一 `(documentId, sequenceNumber)` 与 `(documentId, updateHash)`** + 索引 `(tenantId, organizationId, documentId)`；列 `documentId`(FK CASCADE)、`updateBase64`、`updateHash`、`origin/actorType/presenceId/userId`\n- 生产方：`CollaborationService.applyUpdateWithScope`（事务内 `pessimistic_write` 后重编码）与物化处理器\n- 主要消费方：collaboration（唯一注册方）`[基于引用扫描，未深入验证]`\n- 业务用途：协作文档权威状态与跨节点广播落点；update 表用于**幂等去重**（`updateHash`）与运维诊断；保留量 `UPDATE_RETENTION_COUNT = 200` / 24h 由 `pruneUpdates` 控制\n- 详细流向：见 .module-experts/后端专题/Agent 执行链专家/C4-数据流向与消费.md §5