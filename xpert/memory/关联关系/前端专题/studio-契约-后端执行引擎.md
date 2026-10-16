---
groupPath: 关联关系/前端专题
relation: studio-契约-后端执行引擎
exportedAt: "2026-10-16T03:52:14.870Z"
---
**强关联：Xpert Studio 与后端 xpert-agent / xpert-agent-execution 的 HTTP 契约**

- 方向：Studio（前端）→ 后端执行引擎（跨端契约，非代码依赖）
- 内容：
  - 编排读写：/api/xpert/:id/team、/draft、/publish、/version（后端 packages/server-ai/src/xpert）
  - 执行触发：POST /api/xpert/:id/chat（SSE 预览）、POST /api/xpert-agent/chat（SSE）
  - 执行回查：GET /api/xpert-agent-execution/:id/log | /checkpoints | /state
- 改动风险：后端改这些端点的路径/出参结构（尤其 SSE 事件类型）会直接破坏 Studio 的预览调试与状态检查器；改 draft 保存语义会影响自动保存链路
- 证据：.fe-index/xpert-server/modules/xpert-agent.md、xpert-agent-execution.md；Studio implementation/05-接口.md 的 24 条接口清单
- 用法：改后端这些端点前，用 .fe-index/xpert-cloud/apis/xpert-project.md 反查前端调用页面