---
groupPath: 数据流/Assistant 定义与运行时
relation: xpert
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜xpert】
- 实体类型：表（Xpert extends WorkspaceBaseEntity）
- 结构：唯一索引 `(tenantId, organizationId, type, slug, version, latest)`；关键列 `slug/name/type/title/description`、`workspaceDataScope('shared'|'user', update:false)`、发布态 `version/latest/releaseNotes/publishAt`、配置 `options/agentConfig/memory/features/commandProfile/api/app/starters/avatar`、**草稿 `draft` 与运行图 `graph` 同表双列**、`exportedTemplate`、`marketplace` json、`userId`（助手自身的外部服务账号）、`environmentId`；关系 agent 1:1、agents 1:N、copilotModel 1:1、knowledgebase(s)、executors/leaders 自引用 M:N（xpert_to_executor）、toolsets、userGroups（xpert_to_user_group）、tags（tag_xpert）、integrations
- 生产方：XpertService.create/update/saveDraft/updateDraft；XpertPublishHandler（publish 写 graph、draft=null、publishAt、latest）；XpertImportCommand / XpertExportTemplateCommand / XpertSyncTemplateCommand；XpertTemplateWorkspaceInitializer（模板安装）
- 主要消费方：本域（准入 PublishedXpertAccessService、文件卷、触发器）+ AI 域运行时面（xpert-agent / agent-invocation / chat-conversation / model-execution / membership / xpert-project / xpert-workspace / skill-package / plugin-resource / assistant-binding / model-access）[基于引用扫描，未深入验证]
- 业务用途：Assistant 的定义与版本行的唯一载体（草稿态与运行态同表分列）
- 详细流向：见 .module-experts/后端专题/Assistant 定义与运行时专家/C4-数据流向与消费.md