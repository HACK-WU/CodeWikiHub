---
groupPath: 错误库/AI对话链路
relation: Node workerThreads 的 unref 顺序不对，进程永远退不掉
exportedAt: "2026-11-25T09:20:32.890Z"
---
栅格化过 SVG 的 Node 进程即使跑完也永不退出：所有用例都打印 ok、没有 TAP 汇总行，只能靠 timeout 击杀（exit=124/137）；更坑的是**已经调了 `worker.unref()` 仍然复现**。

- 现象原文：`npx jiti test/asset-image.test.ts` 打印 48 行 ok / 0 失败后挂住；`node scripts/run-tests.mjs` 会把 `test/asset-image.test.ts` 与 `test/svg-raster.test.ts` 判成「超时已终止」的假红。
- 根因：`w.on('message', ...)` 会让 worker 内部的 MessagePort `start()` 并 `ref()`，**把之前 `unref()` 的效果覆盖掉**。所以「`new Worker()` 之后立刻 `w.unref()`」这种最直观写法无效。`process.once('exit', ...)` 里的清理也永远走不到 —— exit 事件只在事件循环排空后触发，而 ref 着的 port 让它排不空。
- 解法：把 `w.unref()` 放在**所有 `w.on(...)` 注册之后**（如 `worker = w` 之前）。
- 陷阱：写成 `once('message')` 反而能退出（触发后监听自动移除、port 又 stop），会把这个 bug 掩盖掉，别用「换成 once 试试」判断是否修好。
- 定位手法：渲染后打印 `process._getActiveHandles()` 里 `MessagePort.hasRef()`；注意 Node 22 的 `Worker` **没有 `hasRef()`**（只有 `ref`/`unref`），插桩写 `w.hasRef()` 会抛 TypeError 并被业务 catch 成渲染失败。
- 验证：改动后 `npx jiti test/asset-image.test.ts` → `# tests 41 / # pass 41` 且 exit 0；`test/svg-raster.test.ts` 7/7；`node scripts/run-tests.mjs` 两个文件 0.6s 全绿（此前各白等 120s 判红）。
- 位置: `src/lib/svg-raster.ts`；案例: `.debug/svg-worker-unref-20261125/`；关联事件 #97。