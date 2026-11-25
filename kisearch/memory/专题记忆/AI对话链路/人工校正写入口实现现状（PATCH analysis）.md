---
groupPath: 专题记忆/AI对话链路
relation: 人工校正写入口实现现状（PATCH analysis）
exportedAt: "2026-11-23T04:03:22.323Z"
---
事件 AI 分析三块产物（结论/未确认点/已确认位置）的人工校正写入口，2026-11-23 落地（REQ-20261123-001）。
- 接口：`PATCH /governance/events/:id/analysis`（knowledge.write，整块提交）。字段可省（省 = 不改）；`conclusion: null` / `chain: []` 是合法"人工清空"，判据用 hasOwnProperty 而非真值；`expectedRunId` 三态：undefined 不校验 / null 期望无草稿（有草稿回 409）/ 字符串须等于当前 runId。
- 实现：`analysis-store.saveDraftEdits`（唯一写入口）+ `analysis-edit.validateDraftEdit`（严格校验，阈值全部从 `conclusion-chain` 导入，不复制数字）。三条不变量：空 patch 不写盘/不打 editedAt；清空不置 null（draft 必须留）；每次有效写盘必设 editedAt。
- 位置验真在**锁外**（读真实文件几十 ms，持锁会阻塞后台分析写盘），`targetDir` 由 `resolveAnalysisTargetDir` 从配置解析，因此**重置分析后仍可手工加位置**；人工位置 `confidence: 0` 作"非 AI 判定"约定值，前端 CodeLocRow 显示「人工」。
- 重跑/续跑闸门（`startEventAnalysis`）：`(ready|partial && candidates>0) || editedAt!==undefined` 且未 forceOverwrite → REVISION_CONFLICT；闸门在 resume 读取之前，故续跑同被覆盖。
- 新错误码：`ANALYSIS_EDIT_INVALID=1622`、`ANALYSIS_LOCATION_VERIFY_FAILED=1623`（均 400，同时登记 HTTP_STATUS）。
- 前端：`AnalysisEditor.tsx`（三块 + 计数 + 调序 + 保存）、卡头 `[编辑]`、`editedAt` → 「已人工修订」徽标、`failed/partial + editedAt` → chip 改「已人工定稿」、三态文案（未分析整卡不渲染 / AI 未找到 / 已人工清空）、`EventsPage` 切事件前用 dirty ref 拦一次。
- 测试：`test/events/analysis-edit.test.ts`(33) / `analysis-save-edits.test.ts`(17) / `governance-analysis-edit-route.test.ts`(8)，契约门禁 28 绿。