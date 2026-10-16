---
groupPath: 决策记录/对话域
relation: 架构设计-门面token化解耦骨架与宿主
exportedAt: "2026-10-16T05:00:01.787Z"
---
【决策记录｜门面 token 化解耦骨架与宿主】
- 分类：架构设计
- 动机（避坑，[推测]）：现象——同一套对话骨架（ClawXpert 页面 / /chat/x 工作台 / scoped pane）被三种路由形态复用，骨架若直接依赖某个具体门面，新增形态就得改骨架；后果——骨架里出现形态分支、可选能力靠特性探测散落各处（ki 记为 [推测]，保留标注）
- 决策：契约化——WorkbenchChatFacade type + WORKBENCH_CHAT_FACADE InjectionToken；骨架 ClawXpertConversationDetailComponent 用 inject(WORKBENCH_CHAT_FACADE, { optional: true }) 取门面，缺失时回落 inject(ClawXpertFacade)
- 决策（续）：三处提供点全部 useExisting——XpertWorkbenchFacade（/chat/x/:name）、ClawXpertScopedConversationFacade（pane）、ClawXpertFacade 默认实现，保证同一路由内门面实例唯一
- 背景约束：契约面 31 成员（含 7 可选）；可选成员用「存在性探测 + getOptionalSignalValue」读取而非再拆 token；useExisting 而非 useClass
- 被否决方案：无（ki 与源码均未记录「按形态各写骨架」或「继承骨架」方案的评审痕迹）
- 重新评估触发条件：ki 原文「可选方法 > 5 个导致特性探测泛滥时拆子契约」；另：需要跨形态共享同一份会话运行时状态时
- 关联代码：workbench-chat.facade.ts（WorkbenchChatFacade/WORKBENCH_CHAT_FACADE/WorkbenchChatViewState）；clawxpert-conversation-pane.component.ts、xpert-workbench.component.ts 的 provide 行；详情组件 optional 注入与回退
- 证据来源：ki [推测] 条目（保留标注）+ 代码实证（三处 useExisting、骨架唯一依赖点）；完整推导见 .module-experts/前端专题/对话前端专家/C5-关键决策.md D3