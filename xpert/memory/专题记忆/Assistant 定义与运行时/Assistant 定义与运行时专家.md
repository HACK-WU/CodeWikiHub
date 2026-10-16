---
groupPath: 专题记忆/Assistant 定义与运行时
relation: Assistant 定义与运行时专家
exportedAt: "2026-10-16T03:52:14.870Z"
---
【专题记忆｜Assistant 定义与运行时】
- 资产路径：.module-experts/后端专题/Assistant 定义与运行时专家/（用 expert-lookup 加载；含 4 个子专家）
- 一句话职责：Assistant 这一「可发布产品实体」的户籍 + 门禁 + 分发——定义（草稿 DSL）→ 发布（版本行）→ 准入（谁能跑）→ 文件授权（能碰哪些文件）→ 创作容器（工作区）→ 分发（模板 / 市场 / 系统槽位绑定 / 企业 H5 / 公共分享）
- 模块范围：packages/server-ai/src 下 xpert/(141) · ai/(~64) · xpert-template/(33) · xpert-workspace/(25) · assistant-binding/(12) · xpert-marketplace/(5) · environment/(12) = ~292 源文件 / 31 controller；不含 xpert-task（调度域）与 shared/stream（共享设施）
- 核心能力：XpertService.saveDraft/publish/allVersions/setAsLatest、PublishedXpertAccessService.getAccessiblePublishedXpert/assertCurrentUserAccess、XpertWorkspaceAccessService.getAccess/assertCan*、AssistantFilesService.forRuntime/forAuthoring、XpertTemplateService.getCatalog/getTemplateDetail、XpertMarketplaceService.requestAccess/approveRequest、AssistantBindingService.getEffectiveBinding
- 高频坑（≤3）：① **三元权限面不可互换**（创作 WorkspaceAuthoringGuard/assertCanAuthorById ・ 运行 PublishedXpertAccessService ・ 文件 AssistantFilesService.forRuntime/forAuthoring）② **绝不接受 HTTP 传入 authoring 模式，运行时被拒后不得回退** ③ 真实前缀是 **/api/ai/assistants**（不是 /api/assistants）；准入硬约束是 `publishAt` 非空（`latest` 由调用方决定）
- 关键代码位置：XpertService @ packages/server-ai/src/xpert/xpert.service.ts；PublishedXpertAccessService @ packages/server-ai/src/xpert/published-xpert-access.service.ts；XpertWorkspaceAccessService @ packages/server-ai/src/xpert-workspace/workspace-access.service.ts；AssistantFilesService @ packages/server-ai/src/xpert/assistant-files/assistant-files.service.ts；EnterpriseChatkitSessionService @ packages/server-ai/src/xpert/enterprise-chatkit-session.service.ts
- 数据落地：xpert、xpert_workspace(+xpert_workspace_member)、assistant_binding(+assistant_binding_user_preference)、xpert_template、xpert_access_request、environment（6 项，见 C4）
- 检索触发词：Assistant, Xpert, 助手, 定义, 发布, publish, 草稿, draft, 版本, latest, 导入导出, DSL, duplicate, 模板, template, xpert-template, 市场, marketplace, 访问申请, access request, 工作区, workspace, authoring, 文件授权, 文件卷, 准入, accessible, 受众, ChatKit, 公共分享, Enterprise H5, assistant-binding, 系统槽位, bosi, trigger-settings, trigger-connections, configuration, appearance, environment
- 详细资产：见 .module-experts/后端专题/Assistant 定义与运行时专家/，契约层 C0~C5 + implementation/01~07