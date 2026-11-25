---
groupPath: 项目踩坑点
relation: 改 MCP 工具 schema 后要重启 daemon 且重连客户端
exportedAt: "2026-11-24T04:15:37.649Z"
---
改完 MCP 工具的 zod schema（增删参数、改描述）后，**daemon 重启了也可能在 IDE 里看不到新字段** —— 两个层面的缓存各自独立：

1. **daemon 进程**：必须重启（`ki mcp restart`）才加载新代码。
2. **MCP 客户端（stdio 桥接）**：工具清单在**连接建立时**拉一次并缓存，daemon 重启不会让已建立的会话重新 tools/list → 工具描述与参数仍是旧的。

**判定方法（不要凭工具描述下结论）**：直接打新 daemon 的 HTTP `tools/list`：
```bash
# initialize 拿 Mcp-Session-Id，再带 header 请求 tools/list
curl -s -X POST http://127.0.0.1:7423/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
```
新字段出现在这里 = 代码正确，问题在客户端缓存。

- 踩坑场景：REQ-20261124-001 给 `ki_event_edit` 加 `dataFlow`，代码与 daemon 都对，但 `ki_event_edit` 的工具描述仍写「上传结论」（旧文），差点被误判为「改了没生效」。
- 客户端侧修法：IDE 里重连 MCP / 新开会话；不能靠等。
- 附带一坑：新增参数后，**旧客户端**即使拿到新 schema 也可能不传该字段 —— 所以字段必须保持可选，不能设必填。