---
groupPath: 决策记录/Xpert 工作台
relation: 架构设计-与Studio三条桥
exportedAt: "2026-10-16T05:00:01.787Z"
---
【决策记录｜与 Studio 三条桥】
- 分类：架构设计
- 动机（避坑）：现象——管理页/工作台与 Studio 分属两个专家域，但共享同一后端草稿与同一画布能力；后果——两域各建装配器、各持宿主壳或另建编排器会造成双写源与形态分叉
- 决策（桥1 draft）：buildEditableXpertDraft 是 Studio draft 的唯一装配器（XpertStudioApiService 初始化源头）——草稿覆盖已发布的合并规则固化在契约层（omit/figureOutXpert/resolveRuntimeXpert 回落序），前端与后端执行侧共享
- 决策（桥2 门面）：XpertAssistantShellComponent（/xpert/** 根壳）providers 提供 XpertAssistantFacade；Studio 以 inject(..., { optional: true }) 消费 setStudioContext/studioRefresh 等，缺失时静默降级、Studio 独立可用
- 决策（桥3 画布复用）：KnowledgebasePipelineComponent 直接 imports XpertStudioComponent + providers:[XpertService]，并订阅 published$ 触发知识库刷新（该页出现 Studio 工具栏属设计预期）
- 背景约束：画布无 @Input/@Output，靠 injectParams('id') 与 XpertService 契约工作；optional 门面 setStudioContext 三字段幂等、刷新事件带 nonce；published$ 与发布方须同一 provider 作用域
- 被否决方案：无（未记录「Studio 自建装配器 / 硬注入 / 另建流水线专用编排器」方案的评审痕迹）
- 重新评估触发条件：多草稿/版本并行编辑或将 draft 装配下沉 packages/contracts 时；Studio 宿主形态 > 2 种时抽象接口族；流水线出现大量专用节点时
- 关联代码：draft/editable-draft.util.ts；assistant-shell/assistant.facade.ts + shell.component.ts；knowledge/knowledgebase/pipeline/pipeline.component.ts；studio/domain/xpert-api.service.ts 引入点
- 证据来源：代码实证 + ki 关联登记（xpert-workbench-三条桥-studio.md、studio-被复用-知识库流水线.md）；完整推导见 .module-experts/前端专题/Xpert 工作台专家/C5-关键决策.md D4/D5/D7