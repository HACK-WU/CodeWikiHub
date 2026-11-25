---
groupPath: 错误库/AI对话链路
relation: AI查找流式响应无终帧与 daemon 被打死
exportedAt: "2026-11-20T09:49:50.941Z"
---
「AI 查找」偶发报「流式响应未返回结果（连接可能被中断）」时的根因与修法：流式分支（refs/search?stream=1）在跑查找前就发出 200 + text/event-stream，门禁失败 / 45s 硬超时 / 上游异常都没有 HTTP 状态码可用；旧实现在 catch 里继续走统一错误出口 fail() → 二次 writeHead 抛 ERR_HTTP_HEADERS_SENT → 从 catch 逃出成 unhandledRejection → 整个 daemon 退出（实测 code=1），客户端 0 字节断流，面板只能显示「连接可能被中断」，原始错误码全丢。
- 现象: 面板报该文案 + 出现「重试 / 改用手动添加」，过程区无任何 step 帧；daemon 重启后自行恢复（用户描述为偶发、同时跑着 AI 分析）
- 判别: 前端 governanceApi.ts 的 findRefCandidatesStream 里 `if (!result) throw` 就是该文案，出现它说明流结束但没收到 result 帧，不是 HTTP 错误也不是客户端 95s 超时；无法从日志确认时先跑 scripts/probe-find-timeout.mjs 区分「服务端错误」与「网关先断连」
- 修法(2026-11-20): 服务端流式分支 catch 内改发 `event: error` + {code,error,details}（非 GovernanceError 用 FIND_FAILED=1429），并让 fail() 与 mcp-http-api 外层 catch 在 res.headersSent 时只 res.end() 不再 writeHead；前端解析 error 帧抛 GovernanceApiError，面板显示 `[错误码] 原因`
- 实测补充: 写**已 end()** 的 ServerResponse → 异步 'error' 事件 ERR_STREAM_WRITE_AFTER_END → 无监听器即进程退出；写**已 destroyed** 的响应只是静默丢弃不崩（两半护栏依据不同，别把后者也说成防崩）
- 同类风险: /analysis/ask/stream 已有 type:error + finally end（无缺陷）；chat 的 writeSseStream 无 catch，流内抛错靠本次 mcp-http-api 护栏兜住（不再崩，但仍不下发错误事件）
- 位置: src/lib/governance-http.ts（refs/search 流式分支 + writeFrame + fail）、src/lib/mcp-http-api.ts（外层 catch）、web/src/api/governanceApi.ts::findRefCandidatesStream、回归 test/governance-find-stream-error.test.ts
- 边界: 真正的触发条件未定论（并发分析时更可能命中 45s FIND_TIMEOUT 或上游模型错误）；修复只在协议层验证过，未做真机浏览器走查；daemon 长驻不热加载，改完必须重启才生效
- 证据: .debug/find-stream-error-20261120/（E-02/E-03 复现、E-04 修复后、E-05 回归）