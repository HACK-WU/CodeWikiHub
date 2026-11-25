---
groupPath: 项目踩坑点
relation: 新增chat工具需同步5张登记表
exportedAt: "2026-11-23T11:27:01.740Z"
---
新增一个 AI 对话可调用的工具时，必须同步 **5 张登记表**，漏任意一张都**不报错**，只是工具在某一层被静默过滤。2026-11-23 加 `ki_get_image`（REQ-20261123-008）时实际踩到：漏了 `TOOL_CAPABILITIES`，`canUseTool` 恒返回 false，模型在对话里回答“我的工具列表里没有 ki_get_image”；`tsc` 零错、单测全绿、daemon 日志无错误。
- ① `CHAT_MCP_TOOLS`（`src/lib/chat/mcp-tool-registry.ts`）—— 工具实现与 schema（**scope 不进 schema**，由 `run(scope,args)` 注入）
- ② `MCP_TOOL_GROUPS`（`src/lib/chat/prompt-config.ts`）—— 配置层开关与**默认值**：`defaultTools()` 由此展开，漏了就是默认关（存量配置会自动补默认，不会掉）
- ③ `READ_ONLY_TOOL_NAMES`（`src/lib/mcp-tools/tool-access.ts`）—— 只读 Token 能否看见
- ④ `TOOL_CAPABILITIES`（`src/lib/auth/tool-permissions.ts`）—— 能力表，**默认拒绝**，漏了 chat 层永远 false
- ⑤ `READ_MCP_TOOLS`（`src/lib/operation-coordinator.ts`）—— 并发车道，漏了落 write 串行（导入期间看图会排几十秒）
- ⑥ 对外 MCP 另需在 `mcp-server-factory.ts` 的**只读块**注册（写块会暴露给只读 Token）

**验证手法**：改完必须重启 daemon（旧进程不加载新代码）并真发一句对话，看 SSE 里是否出现 `tool_start` 该工具；只跑单测与 tsc 发现不了这一类。同类“硬编码计数断言”也要同批迁移（本次改了 4 处 13→14 / 5→6）。