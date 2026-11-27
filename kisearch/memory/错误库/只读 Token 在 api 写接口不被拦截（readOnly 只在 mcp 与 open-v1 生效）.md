---
groupPath: 错误库
relation: 只读 Token 在 api 写接口不被拦截（readOnly 只在 mcp 与 open-v1 生效）
exportedAt: "2026-11-25T09:25:59.504Z"
---
只读 Token（readOnly=true）在 /api 通道完全不生效的问题，**已于 2026-11-25 修复**（#96 · 代码已落地未提交）。

- 原现象: viewer 账号自助建 Token（服务端强制 readOnly=true），直调 `POST /api/doc/edit` → 400、`DELETE /api/atlas/package` → **200**；同一 Token 调 `/open/v1` 却被 403 OPEN_API_TOKEN_READONLY。
- 根因: `capabilitiesForPrincipal()` 对 `kind==='token'` 固定返回 `TOKEN_CAPABILITIES`（含 knowledge.write，按设计只防扩权），既不参考 owner role 也不参考 `readOnly`；`/api` 中央闸门只查 capability，全文无 readOnly 判定。readOnly 此前只在 `/mcp` 与 `/open/v1` 落地。
- 别被误导: 「`/api` 写接口不校验 knowledge.write」是错的 —— `auth/route-permissions.ts` 已登记 40 条 knowledge.write + 15 条其它写能力路由，viewer 会话本就被 403 USER_READONLY。
- 修法（已落地）: ① `capabilities.ts` 新增 `withoutWriteCapabilities()`；② 中央闸门在 **capability 判定之后**追加「token + readOnly + WRITE_CAPABILITIES → 403 TOKEN_READONLY」，新增 `denyReadonlyToken()` 带双出路 hint；③ chat 挂载点对只读 Token 传收窄后的能力集（**不动 role**：token 无 userId，降级 viewer 会让 chat 会话读取直接 403）；④ 模型维（Q2 对齐）：`route-permissions.ts` 新增 `modelConsuming` 标记，只给「发起追问」两个入口（含 SSE）打标 → 403 TOKEN_MODEL_FORBIDDEN，停止与读记录仍放行。
- 顺序是硬约束: 只读判定若排在 capability 前面，viewer 会话错误码会从 USER_READONLY 变 TOKEN_READONLY，`test/web-auth-api.test.ts` 直接红。
- 验证: `test/token-readonly-api.test.ts` 8 例（从 route-permissions 源码解析全部写能力路由参数化 + chat 工具面 `canUseTool` 实测）+ 既有权限/集成用例全绿；build 退出码 0；chat 目录仅既有 e2e-sr02 红。
- 真机限制: daemon 绑 127.0.0.1 时本机请求一律 local-admin（`authEnabled = !isLoopbackHost`），该门禁在单机部署下走不到，只能用非回环绑定或 `--no-local-admin` 触达。
- 对外影响: breaking —— 外部脚本用只读 Token 直调 `/api` 写接口或发起追问会由 200 变 403；docs 两处已同步。