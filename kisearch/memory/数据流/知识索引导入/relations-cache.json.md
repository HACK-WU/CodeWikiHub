---
groupPath: 数据流/知识索引导入
relation: relations-cache.json
exportedAt: "2026-08-28T04:31:34.207Z"
---
【数据流｜relations-cache.json】
- 实体类型：本地 JSON 关系缓存（groups 平铺完整路径键 → 文件 relations 与 memoryIds、source 元数据）
- 生产方：handleDirectImport @ src/lib/import.ts
- 消费方：管理命令（export 子树导出、delete-group 级联删除、sync-relation、scope 的 getSource/setSource）
- 业务用途：group 与文件关系、导入来源的本地缓存，管理命令据此遍历与级联
- 详细流向：见 .module-experts/知识索引导入专家/C4-数据流向与消费.md