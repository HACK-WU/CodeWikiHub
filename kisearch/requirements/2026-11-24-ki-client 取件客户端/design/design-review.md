---
id: REQ-20261124-002
feature: ki-client 取件客户端
status: 设计中
created: 2026-11-24
updated: 2026-11-24
version: 1
tags: [feat, integration]
author: AI
document_type: review
---

# 设计评审报告：ki 只读取件契约（`/open/v1`）

**评审对象**：`design/DESIGN.md` + `S01`~`S04` + `IMPL_PLAN.md`（7 篇，与需求 `REQ-20261124-002` 关联）
**格式判定**：design-craft 格式（父文档含「关键环节一览图」mermaid + 「共享术语速查」）
**评审时间**：2026-11-24 ｜ **轮次**：第 1 轮（阻断/警告项已自动修复，下表为修复后状态）

## 🔴 阻断（已修复）

| # | 维度 | 位置 | 问题 | 修复 |
|---|---|---|---|---|
| B-1 | 一致性 / 完整性 | `IMPL_PLAN.md` §2 覆盖检查 | 需求 **R5（契约文档 + 契约测试）无任何子文档承接**，而覆盖检查却写「无孤儿」——自相矛盾 | 明确 R5 **不单列子文档、随批交付**（写入 §3 检查点 1），覆盖检查补该行并注明「有意决定，不是遗漏」 |
| B-2 | 正确性 | `S01` §5 | 断言「heat 只用 `[0]/[1]`」**未给落地依据**，且真实约束点被说错：heat 入口是 `scope-heat.ts:79 computeHeat(HeatEntry)`，入参只有 `{read,write}`，真正的约束在 `readScopeUsage()` 的聚合层 | 补入 `scope-heat.ts:79 / :83 / :95` 与 `HeatEntry` 结构，明确「`readScopeUsage` 的 `read` 只累加 `bucket[0]`，不得并入 `bucket[2]`」 |
| B-3 | 一致性 | `requirement.md` R2 vs `S03` §3 | 需求承诺返回 `lifecycle` / `updatedAt`，设计却说「原样透出、不裁剪」，两者对返回字段的承诺不一致 | 修需求 R2 为「形状同 `executeGetModuleInfoLocal`，不裁剪、不承诺额外字段」 |

## ⚠️ 疑似阻断（评审中已查清并定案）

| # | 位置 | 问题 | 结论 |
|---|---|---|---|
| S-1 | `S03` §3 第 4 条 | 需求 N6 要 hidden 文档「可取但有提示」，提示责任在响应还是客户端未定 | **已实读定案**（`src/get-module-info.ts:453-477`）：返回体含 `lifecycle` / `eventId` / `expiresAt` / `remainDays` / `lifecycleWarning` / `revision`，**不含事件阶段可见性**。故生命周期类提示由响应承载，hidden 提示由客户端固定文案承载，端点不追加阶段查询 |

## 🟡 警告（已修复）

| # | 维度 | 位置 | 问题 | 修复 |
|---|---|---|---|---|
| W-1 | 质量 | `DESIGN.md` §1 | 缺**非功能默认假设**（design-craft 要求显式标注） | 补「单机低并发 / 单篇 ≤ 数 MB / 附件 ≤ maxAssetSize / 秒级 / 最终一致」 |
| W-2 | 正确性 | `S01` §4 | `capabilities.maxAssetSize` 在**不带 `scope` 时取值未定义**（按 scope 配置，无 scope 无从取值） | 明确未带 `scope` 时为 `null`，不拿默认库冒充 |
| W-3 | 正确性 | `S02` §6 | `stat` 通过后文件被删/正被覆盖的竞态未覆盖，可能落 500 | 异常表补 404 映射，并引用 `import.ts::collectAndCopyAssets` 的 tmp+rename 原子化作为「不会读到半写文件」的依据 |
| W-4 | 质量 | `IMPL_PLAN.md` 前置层 1 | 「删掉一份 `ASSET_MIME` 改 import」**未核对两份是否等价**——若集合不同，收敛会改变 `/api/asset` 行为 | **已实读核对**：两份均为相同 9 项且值一致，收敛不改行为；证据写入前置层 |

## 🟢 建议（记录，未修改）

| # | 位置 | 建议 |
|---|---|---|
| S-2 | `DESIGN.md` §2 | 一览图偏「模块视角」，缺一条用户视角步骤链（猜 ref → 取字节 → 交读图）；当前不影响设计与实现 |
| S-3 | `S02` §3 | 未设 `Content-Disposition`（浏览器直接内联显示而非下载）。对「人点开看图」更合适，故维持不设 |
| S-4 | `S02` §6 | `OPEN_API_BAD_REQUEST` / `OPEN_API_PATH_FORBIDDEN` 是否已存在未核实；已在前置层第 2 项声明「核对码表，缺则新增」 |

## 📊 统计

| 维度 | 🔴 | 🟡 | 🟢 |
|---|---|---|---|
| 完整性 | 1 | 0 | 0 |
| 正确性 | 1 | 2 | 0 |
| 一致性 | 1 | 0 | 0 |
| 质量 | 0 | 2 | 1 |
| 建议类 | 0 | 0 | 3 |
| 合计 | **3** | **4** | **3** |

**结论**：修复后 **⚠️ 有条件通过（需人工确认 S-1）**。S-1 是唯一遗留的事实待查项（`executeGetModuleInfoLocal` 是否返回阶段字段），不影响主体设计成立。

**下一步**：① 拍板 S-1 的承载方式（响应字段 vs 客户端文案）；② 进入 `challenger` 二次质疑；③ 之后可进 `design-to-code` 生成路由桩 + 契约测试骨架。
