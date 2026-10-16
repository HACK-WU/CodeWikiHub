---
groupPath: 关联关系/Assistant 定义与运行时
relation: xpert表-运行时准入与消费面
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] xpert 表 与 运行时准入与消费面
强度：必改——改 xpert 的发布态/草稿列语义（publishAt / latest / version / graph / draft / type / slug）→ 准入层各 `build*Query` 与全部运行时消费面必改；改准入层内部实现 → xpert 表不用管
原因：准入判定把「已发布且可访问」写死在查询里（publishAt 非空为硬约束、latest 由调用方决定），而 xpert 同表双列（draft/graph）+ 多版本行让任何列语义变更都可能静默放宽可见性

xpert 端：
- Xpert @ packages/server-ai/src/xpert/xpert.entity.ts（唯一索引 `(tenantId,organizationId,type,slug,version,latest)`）
- XpertService.saveDraft / updateDraft / publish @ packages/server-ai/src/xpert/xpert.service.ts

准入与消费端：
- PublishedXpertAccessService.buildAccessibleQuery / getPublishedXpertInTenant / applyPublishedFilters @ packages/server-ai/src/xpert/published-xpert-access.service.ts
- AssistantsController / ThreadsController / ConversationsController（`/api/ai/*`）@ packages/server-ai/src/ai/
- 工作区与文件入口：XpertWorkspaceAccessService.getCapabilities / AssistantFilesService.forRuntime @ packages/server-ai/src/{xpert-workspace,xpert}/