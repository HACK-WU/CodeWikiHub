---
groupPath: 决策记录/工具与MCP专家
relation: 架构设计-工具集provider化
exportedAt: "2026-10-16T07:28:46.847Z"
---
【决策记录｜架构设计-工具集 provider 化（四实现统一抽象）】
- 分类：架构设计
- 动机（避坑）：**现象** 每种工具来源（内置 / OpenAPI / OData / MCP）各建一套工具模型与执行分支，助手挂载、Agent 装配、MCP 发布各自按来源 switch；**后果** 执行面扩散成多条路径，新增来源要改所有下游，且「能力声明」无处收敛
- 决策：`provider/{builtin,openapi,odata,mcp}` 四实现统一承担「工具发现 + schema 生成」，落点统一为 `XpertToolset`/`XpertTool`，执行统一经 `ToolRuntimeService`（`loadToolsets`/`executeTool`），能力统一经 `_BaseToolset` 的 `initTools`/`getTool`/`getVariables`/`close` 契约暴露；服务端执行侧只用一个类型判断（`instanceof MCPToolset`）决定「直连」还是「走声明」
- 背景约束：`loadToolsets` 按 `category` + `type` 分派（`builtin → createBuiltinToolset`、`api + openapi → OpenAPIToolset`、`api + odata → ODataToolset`、`mcp → MCPToolset`，其它抛 `ToolProviderNotFoundError`）；内置注册表未命中回落 `CreateToolsetCommand`（由平台插件提供实现）；只有 `source === 'api'` 允许 `toolsetSnapshots` 快照通道（否则 `McpToolsetSnapshotApiOnly`）
- 被否决方案：无（实现层未见对「按来源分治多套执行面」的显式否决记录；此边界是「统一落点 + 统一执行面」取舍的结果）
- 重新评估触发条件：新增第五类 provider（如远程 A2A / HTTP 插件工具）时，须同时补齐 `provider/` 实现、`category` 分派、能力声明与 catalog 刷新四处，**不得**在 `ToolRuntimeService` 之外新开执行入口
- 失败面：provider 分派失败抛 `ToolProviderNotFoundError`；快照通道越权抛 `McpToolsetSnapshotApiOnly`；执行期 `finally` 无条件 `toolset.close()`
- 关联代码：file://packages/server-ai/src/xpert-toolset/provider/index.ts、file://packages/server-ai/src/tool-runtime/tool-runtime.service.ts、file://packages/server-ai/src/shared/tools/toolset.ts
- 证据来源：C5-关键决策.md §D1；implementation/02-实现.md「工具集 provider 体系」与「设计模式及落点」；implementation/03-数据流转.md「链路一」按 `category` 分派清单
- 详细资产：.module-experts/后端专题/工具与 MCP 专家/ C5-关键决策.md §D1 · C1-能力契约.md §2