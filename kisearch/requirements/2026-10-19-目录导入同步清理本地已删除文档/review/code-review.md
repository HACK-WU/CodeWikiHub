---
id: REQ-20261019-001
feature: 目录导入同步清理本地已删除文档
status: 设计中
created: 2026-10-20
updated: 2026-10-20
version: 1
tags: [feat]
depends_on: []
author: AI
document_type: review
---

# Code Review：import prune stale 实现

- **审查时间**：2026-10-20
- **审查模式**：深度（净增约 1200 行）
- **变更范围**：`src/lib/import-prune.ts`（新增）、`test/import-prune.test.ts`（新增）、`src/delete-relation.ts`、`src/lib/import.ts`、`src/lib/mcp-http-api.ts`、`web/src/api/httpApi.ts`、`web/src/pages/ImportPage.tsx`
- **需求**：`REQ-20261019-001`
- **无提交上下文**：工作区未提交改动

## 0 · 决策

| 项 | 值 |
|---|---|
| 合入结论 | ⚠️ 修复 `#1` 后可合入 → **修复后 ✅ 可合入** |
| 阻塞项 | `#1`（🟥 本次引入 · 🔴） |
| 既有缺陷 | 0 |
| 整体评分 | **C**（含阻塞项，上限 C）→ 修复后 **B** |

## 0.5 · 我的理解

- **业务目标**：导入后清理「库里有、本次目录没有」的文档，前提是本地仍在的一篇都不能误删
- **系统位置**：`/import/run`（算候选挂 `ImportResult.prune`）→ 前端结果卡 → `/import/prune`（**重算同一逻辑** + token 校验）→ `executeBatchDelete`
- **整体成功判据**：① run 与 prune 两次计算必须得到**同一候选集**；② 既有导入零回归；③ 删除有草稿卫兵（**注意：无回收站，物理删除不可逆**）

## 1 · 问题清单

| # | 归属 | 严重度 | 问题 | 位置 | 业务后果 | 状态 |
|---|---|---|------|------|----------|------|
| **1** | 🟥 | **🔴** | `preserveRels` 只在 run 传入，`/api/import/prune` 重算时缺失 ⇒ 候选集不同 ⇒ **token 必然不匹配** | `mcp-http-api.ts` prune handler | 一旦前端收集上传失败清单，删除功能永久 409，用户看到"库已变化"却删不掉 | ✅ 已修：prune 请求加 `preserveRels` 并在重算时透传 |
| 2 | 🟥 | 🟡 | 删除失败后置 `pruneReceipt`，渲染改走回执分支，勾选清单消失 | `ImportPage.tsx` 结果卡分支 | 部分失败无法重试，只能重新导入 | ✅ 已修：有 `failed` 时仍渲染清单 + 失败摘要 |
| 3 | 🟥 | 🟡 | `dryRun` 仍强制要求 `selected` | prune handler | 与"查询语义"契约不符 | ✅ 已修：`dryRun` 时跳过校验 |
| 4 | 🟥 | 🟡 | handler 用 `loadConfig()` 而非 `requestConfig` 快照 | prune handler 开头 | daemon 内 scope 解析可能与请求方不一致 | ✅ 已修：签名加 `requestConfig` |
| 5 | 🟥 | 🟡 | prune 侧 `precheck.pickMode` 硬编码 `'dir'` | prune handler | 构造请求可绕过"仅目录导入"前提（闸门仍兜底） | ⏳ 保留（有闸门兜底，`uploadId` 判据留待后续） |
| 6 | 🟥 | 🟡 | `/api/import/prune` handler 无单测 | `test/` | token 失配 / `selected` 缺失 / 超限三条关键分支无回归保护 | ⏳ 未补（已记入 plan 遗留） |

**🟢 亮点**：`computePrunePlan` 为零 IO 纯函数，23 条场景单测锁定双闸门；三个 return 点用 `...(prune ? { prune } : {})` 可选展开，既有导入零破坏。

## 2 · 需要你拍板

无。

## 附录 A1 · 关键推演（`#1`）

- 💬 依据：设计 S02 要求「run 与 prune 必须调用同一个纯函数，禁止各写一份差集」；`preserveRels` 是 R11 引入的"上传失败文件视为本次有"
- 💻 实际行为：run 传 `preserveRels` → 有效集合更大 → 候选更少；prune 不传 → 有效集合更小 → 候选更多 → `computePruneToken` 输出不同 → `verifyPruneToken` 必 false
- 🔍 推演：当前前端未收集失败清单（`preserveRels` 恒 undefined），所以线上暂不触发；但接口一旦被 CLI/未来前端使用即 100% 失败
- 💡 修复方向：prune 请求体加同名字段并复用 `sanitizeOnlyRelPaths` 净化，重算时透传

## 附录 B · 检查覆盖（摘要）

| 维度 | 结论 |
|---|---|
| 语义一致性 | ⚠️ `#1` 破坏"看到的 = 删掉的"契约（已修） |
| 安全 | ✅ `selected` 必填、路径入参复用 `sanitizeOnlyRelPaths`、scope 越权校验齐备 |
| Bug 风险 | ⚠️ `#2`/`#3`（已修）；`#5` 保留 |
| 规范 | ✅ 注释与既有风格一致 |
| 架构 | ✅ 纯函数与薄包装分离，前后端类型镜像有注释标注 |
| 性能 | ✅ 全量读缓存与既有 `preflight` 同量级，且仅开关开启时发生 |
| 测试 | ⚠️ 纯函数 23/23，handler 无单测（`#6`） |

## 附录 C · 既有缺陷

无（`src/lib/import-budget.ts:78`、`src/lib/mcp-http.ts:605` 两个 tsc 错误与本次改动无关，已记入 plan 偏差）。

## 附录 D · 修复后验证

| 项 | 结果 |
|---|---|
| root `tsc --noEmit` | 零新增错误 |
| web `tsc --noEmit` | 0 错 |
| `test/import-prune.test.ts` | 23/23 PASS |
| web `npm test` | 454/454 PASS |
