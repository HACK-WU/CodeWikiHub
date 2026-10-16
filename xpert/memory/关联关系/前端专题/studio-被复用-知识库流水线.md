---
groupPath: 关联关系/前端专题
relation: studio-被复用-知识库流水线
exportedAt: "2026-10-16T03:52:14.870Z"
---
**强关联：知识库流水线复用 Studio 画布组件**

- 方向：Studio → Xpert 工作台域的知识库流水线（Studio 是被复用方）
- 内容：knowledge/knowledgebase/pipeline/pipeline.component.ts 直接 imports XpertStudioComponent 并 providers: [XpertService]，订阅 xpertService.published$ 刷新知识库
- 契约点：
  - apps/cloud/src/app/features/xpert/knowledge/knowledgebase/pipeline/pipeline.component.ts:4-16
  - Studio 组件契约：无 @Input/@Output；注入 XpertService + paramId；可选 XpertAssistantFacade
- 改动风险：改 XpertStudioComponent 的构造/依赖契约（如新增必填 provider、改 paramId 语义）会连带影响知识库流水线页面；改 providers 提供范围会影响复用方
- 证据：pipeline.component.ts 的 imports/providers 段（已在 Studio 专家 C1 §1 与 01-架构 登记）