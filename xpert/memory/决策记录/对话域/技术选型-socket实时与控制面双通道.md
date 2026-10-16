---
groupPath: 决策记录/对话域
relation: 技术选型-socket实时与控制面双通道
exportedAt: "2026-10-16T05:00:01.787Z"
---
【决策记录｜socket 实时与控制面双通道】
- 分类：技术选型
- 动机（避坑）：现象——对话需要两类能力：历史/反馈/绑定等「可重放的控制面读取」与「服务端一产生就到前端的增量」；后果——一条通道兼做两件事会让实时帧与历史读取互相污染（重复/乱序），且无法按通道独立做鉴权与运维（ki 动机口径为 [推测]，保留标注）
- 决策：约定「socket.io 走实时、HTTP 走控制面」；增量正文与回合级取消（cancel_chain）等生命周期事件在 HTTP 面没有等价端点，HTTP 侧只有 POST /api/chat-conversation/:id/cancel 这类控制面
- 决策（实测修正）：本 commit 活跃链为 HTTP 控制面 + 单流 SSE（ChatService.chat → injectFetchEventSource(API_CHAT)，后台流 joinRunStream 按 lastEventId 续传）；ChatWebsocketServer/ChatWebsocketService 在本域无路由级消费者（保留实现，含 401 刷新与 2s 无 ack 重发）
- 背景约束：socket 客户端未显式配置 transports/reconnection/pingInterval，沿用默认（长轮询起步+升级）；多副本需连接粘性、反代放行 /socket.io/ 与 Upgrade——当前无消费者时不构成线上依赖
- 被否决方案：无（未找到「轮询替代流」或「HTTP 全量替代 socket」方案的评审记录）
- 重新评估触发条件：ki 原文「socket 网关成为部署瓶颈或需无状态横向扩展」；本文追加：若 @shared/chat/preview 等外部消费者也迁往 SSE，应直接删除孤立 socket 路径
- 关联代码：@core chat.service.ts（ChatService.chat/API_CHAT）、@core chat.service.socket.ts（connect/message/clearRetryMessage/refreshToken）、xpert/chat.service.ts（executeChatRequest/startJoinedRunStream）
- 证据来源：ki [推测] 条目（保留标注）+ 代码实证（03-数据流转.md 已把「双实时通道并存」列为已知风险）；完整推导见 .module-experts/前端专题/对话前端专家/C5-关键决策.md D4