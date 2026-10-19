---
id: REQ-20261019-004
document_type: review
created: 2026-10-19
updated: 2026-10-19
version: 1
tags: [feat]
author: AI
---

# 代码变更二次质疑报告（auto-review → challenger）

- 对象：本次 9 个源码文件 + 3 个测试文件的改动
- 变更类型：新增功能（叠加数据持久化关键路径）
- 证据：静态审查 + 已执行单测（后端 17、web 441）+ 实机走查（20/20、9/9）

## auto-review 自查并已修复（3 项）

| # | 级别 | 问题 | 修复 |
|---|---|---|---|
| 1 | P0 | `fitToBudget` 用 `JSON.stringify(...).length`（UTF-16 码元）与 32KB **字节**上限比较 → 中文台账低估约 3 倍，落盘后仍超限，`readRecordFile` 返回 null，**任务静默消失** | 改 `Buffer.byteLength(..., 'utf8')`；新增中文 20 条 × ~1800B 的用例锁死 |
| 2 | P1 | 重写详情时丢了 `partialCommitted` 行 → rebuild/restore 任务的「已提交条目」凭空消失（结果段直接不渲染） | `resultRows` 单独兜住：`partialCommitted` 存在且 `result.vectorized` 缺省时输出该行；+2 单测 |
| 3 | P2 | `assets === 0` 渲染「复制 0 个」噪音；`startedAt` 缺失时显示「创建 → —」 | 0 不显示；未开始显示「创建 <时间> / 尚未开始执行」 |

## challenger 质疑

### 意见 1：同 uploadId 幂等复用 job 时，参数快照可能与最新提交不一致（🟡）

- **反对理由**：`/api/import/run` 在 `session.jobId` 存在且 `skipDuplicates` 相同时**直接返回旧 jobId**（`mcp-http-api.ts` 的复用分支），不再写 `params`。但用户可能改了 group / tags / conflictMode——这些**不参与复用判据**。详情于是展示上一次的参数，用户会以为新参数已生效。
- **功能影响**：预期「详情展示本次提交的参数」→ 实际展示上一次的参数，且无任何提示。
- **替代方案**：复用分支同时比对 `group/tags/conflictMode`，不一致则新建 job（与 `IMPORT_JOB_PARAMS_MISMATCH` 同思路）；或在详情标注「参数快照来自发起时，若中途改动以实际执行为准」。
- **状态**：**既有行为**，非本次引入；本次改动**放大了它的可见性**（以前看不到参数，现在看得到一个可能是旧的参数）。建议单独开需求处理。

### 意见 2：`readableError` 依赖中文文案匹配（🟡）

- **反对理由**：`/查看发起端的命令输出或服务日志/` 是硬编码文案；`safeErrorSummary` 一旦改字，替换静默失效，网页用户又会看到无效引导。
- **替代方案**：改由错误码驱动（无 `errorCode` 时才走文案兜底），或在 `task-registry` 增加 `errorKind` 枚举。
- **状态**：可接受（有注释标明耦合点），纳入后续。

### 意见 3：时间格式化函数重复（🟢）

- `TasksPage.timeLabel` 与 `taskDetailModel.timeLabel` 两份相同实现，格式若改一处会不一致。
- 建议：从 model 导出，页面引用。

### 意见 4：`normalizeResult` 对缺失的 `files` 字段补 0（🟢）

- 若某调用方只传部分字段，其余会显示「0 篇」而非「—」。当前业务层 `toResultSnapshot` 总是传全，风险低；建议后续改为字段级可选。

## ✅ 认可点

1. **`fitToBudget` 挂在 `writeRecord` 唯一入口**，配合"超限即任务消失"的真实后果做论证，不是抽象防御。
2. **`splitSkipped` 有恒等式单测**（三项之和 = skipped），避免了"分类相加反而大于总数"这类统计漂移。
3. **失败路径不虚构数字**：`toResultSnapshot` 对无 `stats.files` 的错误返回 undefined，UI 明说「文件级明细不可用」。
4. **实机走查覆盖了旧记录 / 失败 / 全部重复 / 窄屏 / 暗色**，不是只跑 happy path。

## 结论

- 🔴 0 项，🟡 2 项（1 项为既有行为，1 项可接受并已注释），🟢 2 项
- **裁决：可交付**；意见 1 建议单开需求（幂等复用判据不含全部参数）
