---
groupPath: 数据流/Agent 执行链专家
relation: prompt_workflow
exportedAt: "2026-10-16T03:54:17.313Z"
---
【数据流｜prompt_workflow 与 prompt_workflow_tag】\n- 实体类型：作者态命令模板（`PromptWorkflow extends WorkspaceBaseEntity`，带软删）+ M2M 连接表\n- 结构：`prompt_workflow`：**唯一 `(workspaceId, name)`（不含 `deletedAt`）**；关键列 `name`(≤64，匹配 `/^[a-z0-9][a-z0-9_-]{0,63}$/`)、`template`(text NOT NULL)、**`sourceTemplateId`（server-owned provenance）**、`visibility`(`private|team|tenant`)、`associatedXpertIds`(json)、`runtimeCapabilities`、`archivedAt`；`prompt_workflow_tag`：由 `@JoinTable` 生成（无自定义列，连接关系即唯一性来源）\n- 生产方：`PromptWorkflowService` 作者态写面（`createInWorkspace/updateInWorkspace/upsertInWorkspaceByKey/archive*/duplicate*/initializeDefaultsInWorkspace`）\n- 主要消费方：prompt-workflow（唯一注册方）；下游为 `xpert.commandProfile`；`prompt_workflow_tag` **未出现在 tables.md 反查索引中**（连接表未被模块级扫描收录）`[基于引用扫描，未深入验证]`\n- 业务用途：工作空间内可辨识的 slash 命令模板，发布时固化为命令档案快照；`tags`(json) 与 `organizationTags`（连接表）是两套数据\n- 详细流向：见 .module-experts/后端专题/Agent 执行链专家/C4-数据流向与消费.md §5