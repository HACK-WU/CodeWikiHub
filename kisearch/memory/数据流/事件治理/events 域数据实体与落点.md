---
groupPath: 数据流/事件治理
relation: events 域数据实体与落点
exportedAt: "2026-11-25T08:06:49.680Z"
---
事件治理域的数据实体流向（基线 0f1426b）。
- {eventId}.json：生产方 createEvent / transitionEvent，落 {dataDir}/{scope}/.events/，消费方为事件详情与治理路由，用途是存事件主体与当前阶段。
- {eventId}.log.jsonl：生产方 transitionEvent，消费方为阶段时间线，用途是流转审计（状态先写、日志后追加）。
- {eventId}.analysis.json / .refs.json / .ask.json / .ask.running.json：分别由分析执行器、refs 服务、追问执行器写，供结论区/参考文档区/追问区读。
- governance.json：由治理配置写，供分类预设、组默认与回收站设置读。
- 详细流向：见 .module-experts/事件治理专家/C4-数据流向与消费.md。