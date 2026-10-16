---
groupPath: 专题记忆/前端专题
relation: Xpert 工作台专家
exportedAt: "2026-10-16T03:52:14.870Z"
---
**Xpert 工作台专家**（Xpert 前端 · 助手管理与配套资产域，Studio 与对话域的供给方）

- 模块：features/xpert/**（除 studio），194 非 spec .ts / 92 spec：xpert 38（管理页+Studio 宿主层）、knowledge 87（子专家）、workspace 32（子专家）、tools 26、draft 4、assistant-shell 3
- 入口路由：/xpert/x/:id/**（管理页 + Studio 链）、/xpert/tool/:id、工作区 /w/*
- 能力：助手管理页（basic/logs/develop/monitor/manage+DSL 导入）、工具集配置面（create/builtin 参数/授权凭据/api-tool/tool-test）、知识库（子专家）、工作区（子专家）
- 核心契约：XpertService（paramId/latestXpert/xpert draft 优先投影/published$ 发布广播）；utils.ts 注入工厂（injectGetXpertTeam 固定 9 项 relations / injectGetXpertsByWorkspace / genAgentKey）；buildEditableXpertDraft（Studio draft 源头）；XpertAssistantFacade（Studio 可选注入）
- 与 Studio 三条桥：draft 源头 / 门面可选注入 / knowledge pipeline 复用 XpertStudioComponent 画布
- 专家资产位置：.module-experts/前端专题/Xpert 工作台专家/
- 契约层：C0 / C1 / C2 / C4 / C5；实现层：01-架构 至 07-运维
- 子专家：知识库子专家（87，含 02-实现）、工作区子专家（32）
- 何时用：改助手管理页/工具配置/知识库/工作区、查 xpert 接口、感知发布事件、处理与 Studio 的跨域契约
- 测试状态：部分可跑（2026-10-15 实测 92 spec = 36 PASS / 55 FAIL；53 环境级缺依赖 + 2 真实断言，见 test/known-failures.md）
- 资产基线：commit c07bb83d（2026-10-15）