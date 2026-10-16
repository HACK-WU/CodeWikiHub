---
groupPath: 决策记录/对话与会话
relation: 安全合规-envelope不是授权
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜envelope 不是命令/授权、不放 prompt 与凭据、分支复制保留原 envelope】
- 分类：安全合规
- 动机：避坑——现象：把 envelope 当命令/授权载体；后果：第三方 payload 就能影响 host provenance 或权限判定，造成越权与审计失真（一个「只是展示来源」的字段承载了授权语义）
- 决策：TChatMessageEnvelope 只描述「谁产生了输入、它在会话中如何呈现」，**不是**命令、模型角色、运行时主体、路由请求或权限授予；执行仍归 XpertChatCommand、handoff 队列与既有 Agent 调用/任务运行时。公开 mutation 的写白名单**不含**该字段；分支复制保留原 envelope；可信生产者写 options.messageEnvelope，命令入口只校验一次（失败 400 Error.ChatMessageEnvelopeInvalid）
- 背景约束：version 当前为字面量 1；presentation='runtime' 只是「不进入公开历史」，**呈现策略不把输入从模型祖先或重试中移除**（隐藏 ≠ 未参与推理）；非法/未知持久化版本对公开历史隐藏但运行时水合保留
- 被否决方案：让第三方 payload 决定 host provenance/presentation；在 envelope 里写 prompt 文本、凭据或授权声明（MESSAGE-ENVELOPES 明写禁止）
- 重新评估触发条件：引入新的可信生产者需要新的 source 判别联合分支，或需跨版本兼容非 1 的 envelope（届时需复核 No additional column is needed 的结论）
- 关联代码：chat-message/message-envelope.schema.ts、chat-message/commands/handlers/upsert.handler.ts、conversation-branch.service.ts
- 证据来源：chat-message/MESSAGE-ENVELOPES.md（明写）