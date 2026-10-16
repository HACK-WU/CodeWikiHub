---
groupPath: 决策记录/Xpert 工作台
relation: 接口契约-injectGetXpertTeam固定9项relations
exportedAt: "2026-10-16T05:00:01.787Z"
---
【决策记录｜injectGetXpertTeam 固定 9 项 relations】
- 分类：接口契约
- 动机（避坑，[推测]）：ki——多页面（管理页、Studio、XpertAssistantFacade）共享同一团队聚合形态；避免各页自拼 relations 造成投影口径漂移（该动机 ki 记为 [推测]，保留标注）
- 决策：injectGetXpertTeam() 冻结 9 项 relations——agent、agent.copilotModel、agents、agents.copilotModel、executors、executors.agent、executors.copilotModel、copilotModel、knowledgebase
- 决策（续）：成为全域唯一的团队聚合读取口径（GET /api/xpert/:id/team?data={"relations":[9 项]}）；XpertService.getXpertTeam 与 Studio xpert-api.service 共用，调用方无法传入自定义 relations
- 背景约束：固定数组、无入参可调；不含 toolsets/userGroups/knowledgebases（各页自行补拉、缺统一入口）；relation 名为单数 knowledgebase；增删任一项都会改变下游画布/面板拿到的聚合形态
- 被否决方案：无（ki 未记录「按需 relations」方案的评审痕迹）
- 重新评估触发条件：ki 原文「单请求聚合过大导致加载慢时拆按需 relations」
- 关联代码：features/xpert/utils.ts（injectGetXpertTeam）；xpert/xpert.service.ts（getXpertTeam）；studio/domain/xpert-api.service.ts 引入点；assistant-shell/assistant.facade.ts
- 证据来源：ki [推测] 条目（结构暗示的决策集（推测）.md，保留标注）+ 代码实证；另见 ki 接口条目「助手工具集知识库.md」；完整推导见 .module-experts/前端专题/Xpert 工作台专家/C5-关键决策.md D3