---
groupPath: 数据流/知识索引导入
relation: local KB 原文
exportedAt: "2026-08-28T04:36:03.706Z"
---
【数据流｜local KB 原文】
- 实体类型：kb/{scope}/{groupPath}/index.json——每个 Group 一份未清洗原始 Markdown 文档索引（relation 名 → 原文全文）
- 生产方：handleDirectImport @ src/lib/import.ts（第 1 步最先写入，writeLocalKb；hook 失败/超限时 removeFromLocalKb 回滚）
- 消费方：rebuildScopeVectors（读原文重新 chunk 重建向量）、备份/恢复流程、get-module-info 索引直查
- 业务用途：原始文档持久层，向量丢失或损坏后可据此重建（方案 D 双层数据：local KB 存原文，向量存清洗后 chunk）
- 详细流向：见 .module-experts/知识索引导入专家/C4-数据流向与消费.md