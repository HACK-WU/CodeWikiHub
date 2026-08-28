---
groupPath: 数据流/知识索引导入
relation: import-interrupt.json
exportedAt: "2026-08-28T04:31:34.207Z"
---
【数据流｜import-interrupt.json】
- 实体类型：中断标记文件（kb/{scope}/import-interrupt.json，原子写 .tmp + rename）
- 生产方：src/lib/interrupt.ts（导入异常/中断时写入）
- 消费方：interruptGuidance（vector-client.getEngine 打开向量库前检测并引导 ki restore --rebuild-vector）
- 业务用途：标记导入中断导致向量不完整，防止用户在脏向量上继续检索
- 详细流向：见 .module-experts/知识索引导入专家/C4-数据流向与消费.md