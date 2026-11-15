---
groupPath: 通用记忆片段/待生效变更
relation: 上传导入uploadId复用口径待订正
exportedAt: "2026-11-15T06:36:43.580Z"
---
# 待生效变更：上传导入 uploadId 复用口径

**触发**：REQ-20260928-001（上传导入跨页面任务与暂存清理）合入后，同一 uploadId 已启动导入即绑定任务、**不可复用重导**，须重新选文件并用新 uploadId 重传。

**合入后要订正的两处知识资产**（2026-11-15 核实：两处仍是旧口径）：

1. `.module-experts/知识索引导入专家/C0-使用总览.md:41` 已知坑「`/api/import/status` 404 → 重新 upload + run（上传目录文件仍在可重用 uploadId）」
   → 改为：同一 uploadId 启动导入后不可复用；`run` 返回同一 jobId（202）或 409 状态已失效，须用新 uploadId 重传。
2. `src/lib/daemon-rpc.ts` 的 `IMPORT_CANCELLED` hint「可用原 uploadId 重新导入」
   → 改为：取消后须重新选文件并用**新 uploadId** 导入（原 uploadId 已绑定终态任务）。

**详情**：`CodeWikiHub/kisearch/requirements/2026-09-28-上传导入跨页面任务与暂存清理/review/code-review.md`。