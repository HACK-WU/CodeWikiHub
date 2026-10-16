---
groupPath: 关联关系/Assistant 定义与运行时
relation: xpert_workspace-助手文件授权
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] xpert_workspace 与 助手文件授权（**解耦型强关联**：共享输入、不同判定）
强度：必改——改 `settings.access.visibility`（尤其 `tenant-shared`）或工作区成员/owner 语义 → 文件访问与列表投影（原生 SQL 读 settings json）必改；反之改文件授权入口（forRuntime/forAuthoring、ResolveAssistantFileAccessCommand）→ 工作区能力面不用管
原因：两者共享 `xpert.workspaceId` 与 members，但**能力位不是文件 ACL**（AGENTS.md 明写）；`TENANT_SHARED_WORKSPACE_FILTER` 是读 json 的原生 SQL，字段改名会静默改变可见性且无编译期保护

工作区端：
- XpertWorkspace / xpert_workspace_member @ packages/server-ai/src/xpert-workspace/workspace.entity.ts
- XpertWorkspaceAccessService.getAccess/getCapabilities/getResourceCapabilities/assertCan* @ packages/server-ai/src/xpert-workspace/workspace-access.service.ts
- TENANT_SHARED_WORKSPACE_FILTER / applyCurrentReadScope @ packages/server-ai/src/xpert-workspace/

文件授权端：
- AssistantFilesService.forRuntime/forAuthoring @ packages/server-ai/src/xpert/assistant-files/assistant-files.service.ts
- ResolveAssistantFileAccessCommand / AssistantFileAccessService.execute @ packages/server-ai/src/xpert/assistant-files/
- AssistantWorkspaceFilesController（8 端点每次重授权）@ packages/server-ai/src/ai/