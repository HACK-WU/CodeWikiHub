---
groupPath: 数据流/身份与权限
relation: user_group
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜user_group】
- 实体类型：表（UserGroup extends TenantOrganizationBaseEntity）+ 关联表 user_group_to_user（M2M → user）
- 结构：name、description、托管三元组 managedBy/managedEntityType/managedEntityId（部分唯一索引 IDX_user_group_managed_entity_unique）
- 生产方：UserGroupService.create / update / updateMembers；托管三元组仅平台侧可写（HTTP 入口剥离）
- 主要消费方（3 个模块）：user-group、organization（删除组织前置校验）、xpert-marketplace
- 业务用途：给一组用户批量授权（当前用于把已发布智能体的运行能力桥接给组内成员）
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md；授权边界见其 C5-关键决策（只补 canRun）