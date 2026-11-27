---
groupPath: 项目踩坑点
relation: MCP 工具清单三方口径（代码、docs、资源页）
exportedAt: "2026-11-25T09:07:05.461Z"
---
MCP 对外工具清单有三处必须一致：代码注册（`src/lib/mcp-tools/` 每文件对应一工具，`group.ts` 内含 group_create 与 group_delete_empty 两个）、用户文档 `docs/mcp-tools.md`、Web 资源页 `web/src/lib/resourcesPage.ts` 的 `MCP_TOOLS`。漏改任一处就出现「页面列 25 / 文档写 23」这类漂移，用户与 AI 看到两套工具名。
- 权威口径: `src/lib/mcp-tools/` + `src/lib/mcp-server-factory.ts`（2026-11-25 核对：23 个）
- 守卫: `web/test/resources-page.test.mjs` 两例——工具名与 docs/mcp-tools.md 表格逐条一致；分组数量 23 = 读 12、写 8、组织与删除 3（写死数字，增减工具必须同改）
- 实例: 2026-11-23 事件三工具（ki_event_docs、ki_event_refs、ki_event_set_stage）合并为 ki_event_edit 且旧名不留别名，资源页只改了一半 → 页面 25 项 vs 代码 23
- 改动清单: 注册文件 + docs 表格与「共 N 个」+ resourcesPage.ts 分组项与 `MCP_TOOL_COUNT` 注释，三处同批
- 发布门禁缺口: `scripts/release.sh` 只跑 npm test（group-create）与 test:zvec-engine，不跑 web 测试 → 这类红「发得出去」