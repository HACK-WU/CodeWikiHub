---
groupPath: 决策记录/模型访问与计费
relation: 兼容处理-native协议默认关闭
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜native 协议默认关闭，须由 catalog 显式声明】
- 分类：兼容处理
- 动机：避坑：按 Provider 名称推断协议兼容性或对未知字段静默丢弃 → 请求语义被悄悄改变、上游报错不可归因
- 决策：nativeProtocols（openai_responses、anthropic_messages）默认关闭，需租户策略与模型 catalog 双声明；未声明时走版本受限的 chatBridgeProtocols 转换（快照分别记为 openai_responses_chat / anthropic_messages_chat）；传输在签发时固定，两条路径都可用时 native 优先；无法等价转换的字段（native thinking、加密推理、多媒体、hosted tools、嵌套 namespace、严格 JSON schema）在调用 provider 前拒绝
- 背景约束：native 能力因 provider/模型而异；Responses 强制 store:false 并拒绝 background 与服务端会话引用；输入端仅支持内联文本与客户端工具
- 被否决方案：native 失败后自动改走 Chat 重试或扩大授权（文档明确排除：A native failure does not trigger a retry through Chat or expand authorization）
- 重新评估触发条件：新增 native 协议或新增 CLI 版本需进入兼容清单（必须复核请求形状、多轮工具调用、取消与逐次计量）；多媒体/文件引用能力开放
- 关联代码：execution-native.controller.ts、execution-native-protocol.ts、execution-chat-bridge-request.ts、execution-policy.defaults.ts
- 证据来源：docs/model-execution.md（Model Protocols 表与 Chat 转换边界段）