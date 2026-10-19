---
id: REQ-20261019-004
document_type: review
created: 2026-10-19
updated: 2026-10-19
version: 1
tags: [feat]
author: AI
---

# 设计文档评审报告

- 文档：`design/DESIGN.md` + `S01/S02/S03`
- 格式：design-craft（子文档命名+一览图命中强信号；缺 feature 前缀 → 已记 🟢）
- 评审方式：结构/质量/正确性/一致性四阶段全量评审，**已交叉代码**（不只在文档内自洽）

---

## 🔴 阻断（必须修复）

| # | 维度 | 位置 | 问题描述 | 修改建议 | 来源 |
|---|---|---|---|---|---|
| 1 | 一致性 | S-01 §5 vs 需求 N3 | 需求 N3 要求「台账写入失败不得静默：任务详情应能表达数据可能不完整」，S-01 §5 却写「不对外暴露（仅进程日志）」——**需求未落实且自相矛盾** | 改为可落地链路：写失败 ⇒ 内存记录不前进 ⇒ 心跳停滞 ⇒ 读侧 30s 判 `unknown`（既有机制）；UI 在 `unknown` 文案中显式提示「数据可能不完整」 | 阶段4 |
| 2 | 正确性 | S-02 §3.3(3) | daemon 血缘只从 `req.params.retryOf` 取，但 CLI 的 daemon 分支 `callDaemon('import', importParams, …)`（`src/import.ts:250`）**从未把 retryOf 放进 params** ⇒ daemon 路径血缘恒为 undefined，AC7 不成立 | ① 设计补「CLI daemon 分支需注入 retryOf」；② 代码 `callDaemon('import', { ...importParams, ...(retryRecord?.taskId ? { retryOf } : {}) })` | 阶段3 |

## ⚠️ 疑似阻断（需人工确认）

无。

## 🟡 警告

| # | 维度 | 位置 | 问题描述 | 修改建议 | 来源 |
|---|---|---|---|---|---|
| 3 | 结构 | 父文档 §3.2 | 共享术语速查放在第 3 章，基线要求第 4 章 | 迁移到 §4（与共享契约并列） | 阶段1 |
| 4 | 接口 | S-01 §3.1 | `TaskReporter.update` 返回类型写成 `boolean`，既有 interface 声明是 `void`（`task-registry.ts:55`），**契约变更未声明** | 文档显式标注「update 返回值 void → boolean」及理由（既有实现已返回 boolean，仅为类型对齐） | 阶段4 |
| 5 | 接口 | S-01 §3.2/§3.1 | 只声明 `update` 白名单新增 `params`，但 `finish` 复用 `update(terminalPatch)` ⇒ `result` 实际也进白名单，文档与实现不符 | 白名单条目补 `result`，并说明「result 只由 finish 写入」 | 阶段4 |
| 6 | 正确性 | S-02 §3.1 | `toParamSnapshot` 签名无 `uploadsRoot` 参数，但口径要求 `uploadIdFromSourceDir(sourceDir, getUploadsRoot())`；`getUploadsRoot()` 是 `mcp-http-api.ts` 内私有函数，**未导出** ⇒ 设计缺口 | 签名加 `uploadsRoot?: string`（默认 `~/.ki/import-uploads`），web 端显式传入 | 阶段3 |
| 7 | 质量 | S-01 §3.3 | `fitToBudget` 伪代码含死变量 `candidate`、重复 `JSON.stringify`；且「超 20 条截断」与「字节预算裁剪」共用 `truncated`，UI 文案会失真（把预算裁剪显示成"超过 20 条"） | 修伪代码；`truncated` 语义限定为「明细被截断（条数超限或预算裁剪）」，S-03 文案改为中性表述 | 阶段2 |
| 8 | 质量 | S-02 §3.3(2) | 引用 CLI 行号 `:187-200` 与真实 `finish` 位置不符（已实施，行号进一步漂移） | 改为符号定位（`import.ts` 的 `task.finish(...)`），不写行号 | 阶段2 |
| 9 | 范围 | S-03 | 需求 R8（embedding 模型/维度「当前配置」）与 R9（scope 跳转 Browse）在子文档中**无对应设计** | S-03 补 §3.7 两小节 | 阶段4 |

## 🟢 建议

| # | 维度 | 位置 | 问题描述 | 修改建议 | 来源 |
|---|---|---|---|---|---|
| 10 | 质量 | S-03 §3.5 | `taskSummaryLine` 只有用途说明，无签名 | 补 `taskSummaryLine(task: TaskRecord): string` | 阶段2 |
| 11 | 体验 | S-03 §3.4 | 未说明 `notices.tone` 与 `errorCode` 的映射；`ALL_FILES_DUPLICATES` 若用 danger 会与「不是故障」冲突 | 明确：`ALL_FILES_DUPLICATES` → `warn`，系统故障 → `danger` | 阶段3 |
| 12 | 结构 | 子文档命名 | 文件名为 `S01_…`，基线模式是 `<feature>_S01_…` | 保持现状（目录已隔离），不再改 | 阶段1 |

## 📊 统计

| 维度 | 🔴 | 🟡 | 🟢 |
|---|---|---|---|
| 完整性/结构 | 0 | 1 | 1 |
| 质量 | 0 | 2 | 1 |
| 正确性 | 1 | 2 | 0 |
| 一致性 | 1 | 2 | 0 |
| 体验/范围 | 0 | 2 | 1 |
| **合计** | **2** | **9** | **3** |

**评审结论：❌ 不通过**（2 个阻断）。

**修复计划**：#1 #2 必须改（文档 + 代码同步）；#3~#9 改文档；#10~#11 改文档。
