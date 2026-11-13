---
groupPath: 项目踩坑点
relation: MCP客户端工具调用硬超时60s与轮次主导耗时
exportedAt: "2026-11-13T03:35:37.667Z"
---
MCP 客户端对单次 tools/call 有**硬超时 60 秒**，progress 通知不能延长（SDK 的 request timeout 与 progress 独立），超时后在客户端侧失败而服务端仍在烧 token。长耗时 MCP 工具（例如让 ki 自己跑一轮 RAG 问答）必须自我限时到 45s 内返回。
- 取证: `@tencent-ai/codebuddy-code/node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js:8` → `DEFAULT_REQUEST_TIMEOUT_MSEC = 60000`；IDE 侧 `~/.codebuddy-server-cn/bin/*/extensions/genie/integration-mcp/lighthouse/index.cjs:3` 同为 `6e4`；`codebuddy.js` 里的 `MCP_TOOL_TIMEOUT` 只用于超时后的提示文案，不是可配置项
- 实测(ki daemon 7423 / deepseek-flash / 真实 chat 链路): 3 轮 6.7s、3 轮 6.1s、11 轮 19.3s、12 轮 19.1s、**36 轮 62.4s**
- 关键结论: 工具执行只占总耗时约 6%（1.12s/19.3s、3.51s/62.4s 单次最慢 694ms）⇒ 优化检索收益极小，**限制轮次收益 10 倍以上**
- 可复用: `tool-loop.ts:692,769` 的「达 maxRounds 后拿掉 tools 再调一次 = 强制作答」正是长工具需要的限流语义；但 `CHAT_BUDGET.maxToolRounds = Infinity`（chat-contract.ts:475）对该场景不可用
- 无会话复用: `test/chat/tool-budget-injection.test.ts:65-73` 已证明纯内存 ConversationFile 骨架可直接喂 `runToolLoop`，不必落盘