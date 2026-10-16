---
groupPath: 关联关系/前端专题
relation: xpert-workbench-三条桥-studio
exportedAt: "2026-10-16T03:52:14.870Z"
---
**强关联：Xpert 工作台与 Studio 的三条桥**

- 方向：双向（供给 + 复用）
- 桥 1 draft：features/xpert/draft/editable-draft.util.ts 的 buildEditableXpertDraft 是 Studio XpertStudioApiService 初始化 draft 的工具源头
- 桥 2 门面：features/xpert/assistant-shell/assistant.facade.ts 的 XpertAssistantFacade 被 Studio 以 inject(..., {optional:true}) 注入；方法 setStudioContext（assistant.facade.ts:172）与 studioRefresh（:133）；Studio 消费点 studio.component.ts:331,340
- 桥 3 画布复用：features/xpert/knowledge/knowledgebase/pipeline/pipeline.component.ts 直接 imports XpertStudioComponent 并订阅 xpertService.published$
- 共享层：features/xpert/utils.ts（injectGetXpertTeam 等）与 XpertService 由双方共用
- 改动风险：改 utils.ts 的 relations/签名、XpertService 成员、XpertAssistantFacade 方法、buildEditableXpertDraft 输出结构，需同时回归 Studio（画布/预览）与本域管理页
- 证据：两侧源码（Studio 专家 C1/C4 与本专家 C1 已双向登记）