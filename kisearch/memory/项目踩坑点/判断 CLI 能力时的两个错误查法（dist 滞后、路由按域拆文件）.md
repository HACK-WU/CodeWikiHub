---
groupPath: 项目踩坑点
relation: 判断 CLI 能力时的两个错误查法（dist 滞后、路由按域拆文件）
exportedAt: "2026-11-26T09:22:23.709Z"
---
判断「某条 CLI 或接口到底有没有某能力」时，下面两种查法会把「已实现」误判成「不支持」（2026-11-26 实际踩到：把 ki-client 已有的 `upload-dir --prune` 判成没有）。
- **错法 1：只信 dist 里的 --help**。`ki-client/dist/` 是构建产物，源码加了 flag 但 dist 没重建时，`node dist/cli.js xxx --help` 看不到。先 `grep` 源码 `src/commands/*.ts`，或先 build 再看帮助。
- **错法 2：按能力名去猜文件名**。open-api 路由**按域拆文件**：prune 端点在 `src/lib/open-api/routes/prune.ts`，不在 `routes/import.ts`——`grep prune routes/import.ts` 命中 0 会直接得出「不支持」的错误结论。按能力搜时扫整个目录：`grep -rn "<关键词>" src/lib/open-api/`。
- **附带一条**：`/api/*`（页面，会话鉴权）与 `/open/v1/*`（token 鉴权）是**两套独立路由**，一边有不代表另一边有，判断时要指定通道。
- 正确姿势：先 `grep -rn` 扫整个相关目录 → 再看源码里的参数解析与能力探测（如 ki-client 的 `info.capabilities.prune.query`）→ 最后用 `--help` 或实际调用验证。