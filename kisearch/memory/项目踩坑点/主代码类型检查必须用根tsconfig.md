---
groupPath: 项目踩坑点
relation: 主代码类型检查必须用根tsconfig
exportedAt: "2026-11-23T11:49:25.598Z"
---
`npm run build` 实际只编译 `src/zvec-engine`（`tsconfig.src.json` 的 `include` 仅 `src/zvec-engine/**/*.ts`），**主代码没有任何 build / typecheck 脚本**。

- `npx tsc -p tsconfig.src.json --noEmit` 对主代码**等于什么都没检查**，会给出“0 错误”的假绿。2026-11-23 实际踩到：连续两批实施（B0/B1、B2）都以为类型是干净的，改用根配置后立刻冒出 3 个真错误，其中一个还是 import 路径写错（`../../llm-client.js` 少上一级），因为 `import type` 在运行时被擦除，功能照跑、测试全绿，只有类型检查能发现。
- 正确命令：`npx tsc -p tsconfig.json --noEmit`（根配置 include `src/**/*.ts`，exclude `node_modules`/`dist`/`kb`/`test`）。
- **判断“有没有新增错误”要按文件过滤**，不要看总数：根配置下有约 10 个历史错误（`events/type-service.ts`、`import-budget.ts`、`mcp-http-api.ts` 的 UserRecord/UserView、`open-api/multipart.ts` 的 Buffer 泛型、`trash-service.ts` 等）属既有基线。
- `test/` 不在根配置 include 里 → **测试代码不受类型检查保护**，写测试时类型错只能在运行时暴露。