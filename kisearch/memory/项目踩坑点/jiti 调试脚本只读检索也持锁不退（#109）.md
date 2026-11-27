---
groupPath: 项目踩坑点
relation: "jiti 调试脚本只读检索也持锁不退（#109）"
exportedAt: "2026-11-27T02:35:28.430Z"
---
用 jiti 直跑的调试 / 验证脚本，只要调用过 ki_search（即使 `mode=fulltext`）就会打开 zvec 引擎并持该 scope 的 LOCK；脚本没有 CLI 入口那句 `await closeEngine()` 收尾时，进程永不退出、锁一直不释放（2026-11-27 已在引擎层修复，见「修复」）。

## 为什么反直觉
- `fulltext` 不调 embedding，但仍走 `fullTextSearch` → `withEngine(scope)` → `engine.ftsSearch`，打开的是整套 dense Collection（flock 住 LOCK + 30 个 `.ipc` fd）。
- `ki_group_list` 不开引擎（读 KB / relations-cache），所以「纯只读查询」里只有 ki_search 这一步会持锁。
- 引擎是 worker_threads；修复前 worker 始终 ref，只有 `closeEngine()` 会 terminate。

## 复现（修复前实测）
- `repro-chat-tool.ts` 跑完 4 条查询后进程 87s 仍存活、38 线程、30 个 `kisearch-xperts` fd，持该库 LOCK。
- 对照：`getEngine` 后 `closeEngine()` → 3s 退出；不 close → 48s 不退。
- 同族实例：`temp/probe-b1-imagelist.ts` 挂 3 天 16 小时并持 consul 锁（脚本注释还写着「避免引擎初始化拖住」）。

## 修复（2026-11-27）
- `src/zvec-engine/proxy.ts`：`send`/`sendRaw` 时 `worker.ref()`，`onMessage` 后 pending 清空且 open 时在 `setImmediate` 里 unref；`close`/`terminate` 入口先 ref，且 `terminate` **先落 `state='closed'` 再 await**——否则延迟 unref 会把收尾中的 worker 放掉，进程在 terminate 落定前退出。
- 效果：不 close 的脚本 3s 自然退出（fd/锁由 OS 回收）；有在途请求仍 ref，读写不会被截断；daemon 有 HTTP server 句柄、CLI 有显式 closeEngine，均不受影响。
- `.debug` 下 3 个 chat 工具验证脚本补 try/finally `closeEngine()`（优雅 flush + 立即释放锁）。
- 回归：`test/zvec-engine-idle-exit.test.mjs`（子进程 open+upsert+fetch 后不 close，断言 ≤20s 退出且结果完整）；全量 zvec-engine 130/130。

## 仍建议的规避
- 调试脚本末尾 `await closeEngine()`：靠进程退出只是让 OS 回收，不会做 worker `closeSync` 的 flush。
- 判断会不会中招看它是否**间接**走到 `getEngine` / `withEngine`（ki_search、vectorSearch、fullTextSearch、asset-image 等），不看它「声明」只读。

- 位置: `src/lib/vector-client.ts`、`src/zvec-engine/proxy.ts`、`src/mcp-server.ts`
- 关联: #109（已修复）；#97 同类（worker 未 unref）