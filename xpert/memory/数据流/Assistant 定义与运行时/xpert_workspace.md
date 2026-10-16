---
groupPath: 数据流/Assistant 定义与运行时
relation: xpert_workspace
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜xpert_workspace】
- 实体类型：表（XpertWorkspace extends TenantOrganizationBaseEntity）+ 成员关联表 `xpert_workspace_member`
- 结构：`name/description/status（含 'archived'）/ownerId`、`settings` json（**`access.visibility`，含 `tenant-shared`**）、`members` M:N、`environments` 1:N
- 生产方：XpertWorkspaceService.create/update/updateMembers/updateVisibility/softRemove/softRecover/archive；EnsurePersonalDefaultWorkspaceCommand（个人默认工作区）
- 主要消费方（实测 16 个模块 import XpertWorkspaceModule）：xpert、assistant-binding、xpert-marketplace、xpert-table、xpert-toolset、xpert-template、environment、connector、artifacts、file-memory、plugin-resource、prompt-workflow、chat-group、skill-package、knowledgebase、initialization [基于引用扫描，未深入验证]
- 业务用途：Assistant/skills/connectors 的**创作资源容器**；其四动作能力**不是** Assistant 文件权限
- 详细流向：见 .module-experts/后端专题/Assistant 定义与运行时专家/C4-数据流向与消费.md；能力判定与不变量见 sub-experts/工作区与文件授权子专家/