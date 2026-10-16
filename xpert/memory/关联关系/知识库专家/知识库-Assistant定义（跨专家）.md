---
groupPath: 关联关系/知识库专家
relation: 知识库-Assistant定义（跨专家）
exportedAt: "2026-10-16T03:54:47.084Z"
---
[强关联] 知识库专家 与 Assistant 定义与运行时（跨专家，助手挂载知识库）\n强度：必改——改 `xpert_agent.knowledgebaseIds`(json，**非 FK**)或 `Xpert.knowledgebase` 关系结构 → 助手挂载的知识库解析与模板安装必改；反向改 KB 的可见性（`permission`）或删除语义 → 已挂载助手的检索必受影向（会静默检索不到或越权可见）\n原因：助手↔知识库是 **json 引用 + 关系列两套**，json 侧不做引用完整性校验；模板安装会同时建助手与知识库绑定\n\n知识库端：\n- Knowledgebase.permission（Private/Organization/Public）@ packages/server-ai/src/knowledgebase/knowledgebase.entity.ts\n- KnowledgebaseService.assertKnowledgebaseReadAccess / findAllByPublic @ packages/server-ai/src/knowledgebase/knowledgebase.service.ts\n\n助手端：\n- Xpert.knowledgebase（ManyToMany）与 XpertAgent.knowledgebaseIds(json) @ packages/server-ai/src/{xpert,xpert-agent}/\n- XpertTemplateWorkspaceInitializer（模板安装 = 建 Assistant + 工作区 + 绑定）@ packages/server-ai/src/xpert/template-workspace-initializer.service.ts\n- KnowledgeRetriever 作为工具面被助手运行时调用 @ packages/server-ai/src/knowledgebase/retriever.ts