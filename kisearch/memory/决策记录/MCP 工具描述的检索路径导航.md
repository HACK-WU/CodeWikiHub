---
groupPath: 决策记录
relation: MCP 工具描述的检索路径导航
exportedAt: "2026-11-13T07:28:58.849Z"
---
给 MCP 工具描述补「精确查询 vs 语义检索」的路径判据，让模型按「是否已知确切位置」选工具，而不是一律 ki_search。

- 落点: `src/lib/mcp-tools/scope-list.ts`（ki_scope_list）、`src/lib/mcp-tools/search.ts`（ki_search）、`docs/mcp-tools.md`
- 精确链路是**三步而非两步**: ki_scope_list（有哪些库）→ ki_group_list（Group 树 + Relation 名）→ ki_get_module_info（读全文）。中间环不可省——get_module_info 的 group/relation 是精确名，scope_list 给不出，跳过只能瞎填参数
- 文案口径: 判据优先于比喻（「已知确切 Group/Relation 名」vs「只有模糊描述」），「像翻书」只作辅助理解
- chat 版（`src/lib/chat/mcp-tool-registry.ts`）**刻意不同步**: 对话场景 scope 由 daemon 注入、模型不可指定，列库无意义；其 group_list 描述早有「先看结构再精确检索」
- 术语: 写 `ki_search`（工具名），不写 `ki-search`（那是 skill 名与默认 tag 名）
- 生效: 改 mcp-tools 后须 `ki mcp restart`，客户端重连才会重新 tools/list；重启前可用进程内白盒 `server._registeredTools` 自查文案