---
groupPath: 项目架构
relation: jiti启动开销与编译产物评估
exportedAt: "2026-11-15T06:36:43.580Z"
---
# jiti 启动开销实测与编译产物评估（2026-10-19，当次未改代码）

环境：Node v22.15.1 / jiti 2.7.0 / macOS；`src` 129 个 ts、43,654 行。

| 入口 | jiti | 编译后 node 直跑 |
|------|------|------------------|
| 空脚本 | 0.03s（冷 0.09s） | 0.02s |
| `src/scope.ts --help` | 0.16–0.18s | 0.05s |
| `src/search.ts --help` | 0.20–0.21s | 0.05s |
| `src/mcp-server.ts --help` | 0.98–1.09s | 0.14s |
| `node bin/ki.mjs scope --help`（含 spawn+npx） | 0.34–0.35s | — |

结论：

- 第三方依赖加载仅 60–65ms，差值来自 jiti 现场转译整条 import 图；`node_modules/.cache/jiti` 只省 transform。
- **运行期无成本**：模块转译一次后常驻内存，daemon 稳态延迟/吞吐不受影响；运行期仅 8 处 `await import()`（均为本地小模块）。
- 转编译产物的前置已具备：`src` 相对导入 **100% 带 `.js` 后缀**，`npx tsc -p tsconfig.json` 0.34s 全量编译。
- 唯一硬骨头：`src/lib/vector-client.ts` 从 `../../dist/zvec-engine/index.js` 取相对路径，dist 布局下变成 `dist/dist/...`，需改成包根解析或调整 outDir。
- **不可**改用 Node 原生 type stripping：源码导入写 `./x.js`、磁盘是 `x.ts`，strip 不重写路径 → 解析失败。
- jiti 启动点仅 2 处：`bin/ki.mjs`、`src/mcp-server.ts`（均为 `spawn('npx', ['jiti', ...])`）。