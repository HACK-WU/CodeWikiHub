---
groupPath: 数据流/租户与平台设置
relation: feature
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜feature】
- 实体类型：表
- 结构：feature 表（实体 Feature extends BaseEntity）；关键列 name、code（复合唯一索引）、parentId（自关联，CASCADE）、isPaid、status、icon；非列字段 isEnabled/imageUrl 由 subscriber 计算
- 生产方：FeatureService.seedDB（POST /api/feature/upgrade、FeatureBulkCreateCommand）；启动时 purgeRetiredFeatures 清理退役行
- 主要消费方：feature 自身（读侧过滤退役码）、xpert-project、xpert-project-access
- 业务用途：功能开关的定义与展示层级（父子分组），是开关状态与配额判定的定义来源
- 详细流向：见 .module-experts/后端专题/租户与平台设置专家/C4-数据流向与消费.md