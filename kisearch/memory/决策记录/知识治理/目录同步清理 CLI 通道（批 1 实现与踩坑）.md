---
groupPath: 决策记录/知识治理
relation: 目录同步清理 CLI 通道（批 1 实现与踩坑）
exportedAt: "2026-11-26T09:05:43.927Z"
---
`ki import` 的目录同步清理（事件 #105 批 1）已实现并真机验证：`--prune` 打印候选、`--prune --yes` 删除、`--no-wiki-delete` 保留镜像；候选口径复用 `planImportPrune`，与页面 / `/api/import/prune` 同源。
- 参数守卫（三条都 fail-loud）：`--prune` × `--retry-incomplete` 互斥；`--yes` 单独使用拒绝；`--no-wiki-delete` 未配 `--yes` 拒绝。互斥校验**必须先于 retry 清单校验**，否则被「没有待重试清单」盖住，用户看不出真实原因。
- 实测踩坑（P0）：`--prune --yes` 删除完成后进程不退出。根因是 `executeBatchDelete` 会重新打开 FTS 句柄，而导入收尾的 `closeFtsEngine` 已执行过；修法是在 prune 块 finally 里再关一次（`useDaemon` 时跳过，句柄在 daemon 进程内）。
- 回执契约：stdout 的 `pruneDelete.ok` 必须单独给。`result.ok` 反映的是导入结果——导入成功、删除部分失败时它仍为 true，只读 JSON 的脚本会误判成功；退出码与 `pruneDelete.ok` 同判据。
- 破坏面披露：`--yes` 默认连带硬删 wiki 镜像 `.md`（不进回收站），删除前打印「即将删除 N 篇并一并删除镜像」；未指定 `--group` 时额外警告「作用域是整个库」。
- 验证：直连与 daemon（`bin/ki.mjs`）两条路径各跑「空库 → 预览 1 篇 → 删除 1 篇 → 候选 0」，另验参数守卫三条与「不带 `--prune` 时 stdout 无 `prune` 字段」；`import-prune` / `import-prune-e2e` / `import-retry` 三套全绿，tsc 0。
- 未做：CLI 文档（docs/import.md 等）未同步；候选不支持「只删一部分」（无勾选/过滤参数）。
- 位置: `src/import.ts`