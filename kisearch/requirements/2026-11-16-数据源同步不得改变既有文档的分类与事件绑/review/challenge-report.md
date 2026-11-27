# 质疑报告 · REQ-20261116-006 实现（代码变更 / 混合：缺陷修复 + 能力补齐）

## 被质疑对象

`review/code-review.md`（合入结论 ✅）＋ 工作区 diff（`import.ts` / `lifecycle.ts` / `event-service.ts` / `LifecyclePage.tsx` + 3 个测试文件）。

## 质疑策略

混合变更：Bug 修复（同步抹掉用户设置）+ 新增能力（扫描豁免、终态保护、tag 保留）。按「根因验证 / 副作用验证 / 场景完备性 / 搭车变更 / 数据守恒 / 全局回扣」六路加压。

---

## 一 · 成立的质疑

### C1 · 场景完备性 · 🟡 中 · 成立

**质疑**：需求 R2b 写的是「同步必须尊重事件**阶段档位**」，实现只处理了 `hidden`。可见性有三档（`full` / `fts-only` / `hidden`），`fts-only` 阶段的成员在同步后被重新写入 dense，档位名存实亡。

**证据**：`import.ts:2250` 仅 `mode === 'hidden'` 才调 `applyVisibility`；`visibility-index.ts:185-189` 的 `planTransition('full','fts-only')` 明确会摘 dense —— 能力现成但没接。本次改动使「数据源文档处于 fts-only 阶段」首次可达（此前同步会清掉 `eventId`，文档退回 wiki）。

**风险等级**：🟡 中（检索预期被悄悄放宽，不丢数据）。
**建议**：与 `hidden` 同一条通路处理所有非 full 档位；用例需向量模式，标 `[需运行验证]`。

### C2 · 搭车变更 · 🟡 中 · 成立（阻塞已消除）

**质疑**：终态 `trash` 分支的摘除判据从「成员全集」改成「真正进回收站的名字」，与 R8 声称意图（数据源成员改 wiki）无关，且**缺围栏证据**：原写法是否故意让「搬失败也脱离事件」，diff 里没有任何论证。

**后果**：`moveToTrash` 失败的普通成员留在已收口事件上，带悬空 `eventId`；终态阶段为 `hidden` 时文档「在库里但看不见」，比原先「库里没有」更难排查。

**处置**：已回退为「成员一律脱离该事件，只给 `isImported` 开例外」，两处同源同注释；复跑 `datasource-sync-preserve 13/13`、`events-sr02 19/19`、`event-members 9/9`、`build` 0。

### C3 · 可观测性 · 🟡 中 · 成立

**质疑**：不自洽降级只有 `logWarn`（stderr）。daemon 定时同步与 Web 导入场景下用户看不到，「我的临时期限怎么没了」无解。需求 N4 只写「给 warning」，实现选了最弱通道且未在需求里写明取舍。

**建议**：并入 `ImportResult` 的统计或在分类页提示；至少把「二选一」的结论写进需求文档，别只留在 plan。

---

## 二 · 不成立的质疑（已核查，结论站得住）

| # | 质疑 | 核查结果 |
|---|---|---|
| 1 | 悬空 `eventId`（事件已删/类型已删）会不会让导入抛错？ | 不会：`resolveVisibility` 对缺失事件/类型/阶段一律 `fallback → full` 并带 `warning`，纯查询不抛 |
| 2 | 保留 `eventId` 会不会让 `hidden` 成员被同步重新索引回可检索？ | 不会：`import.ts:2239-2266` 按落盘后的实际分类判定并 `from:'full'` 摘除；测试 D 有「绑定前可检索」基线对照 |
| 3 | tag 语义反转会不会影响上传通道？ | 不会：`open-api-upload-lifecycle` 17/17；`args.tags === undefined` 才保留，显式传（含空串）照旧覆盖 |
| 4 | 数据源文档成为事件成员后能否解绑/被终态清理？ | 能：`unbindMember` 与终态 `keep` 分支都不过 `precheckLifecycle`，不会被锁死 |
| 5 | `isImported` 会不会被反向降级？ | 不会：全文件仅一处 `rel.isImported = true`；测试 S1/S2/S6/N1 断言 |
| 6 | 同步是否仍更新正文与索引（判据 ①）？ | 是：S1 用例用 `readKbRelationContent` 断言正文更新；`memoryIds`/`sourcePath` 段落未改 |

---

## 三 · 数据守恒三问 ＋ 异常归宿

| 问 | 结论 |
|---|---|
| **流向** | `lifecycle/eventId` 的消费方已逐个核对：`resolveVisibility`（索引档位）、`collectMembers`（事件成员）、`precheckLifecycle`（锁定）、`unbindMember`、`trash-service.restore`、分类页列表。无新增消费方被遗漏 |
| **数量** | 终态 `affected.docs` 现在把「数据源成员改 wiki」也计入 `done`；消费方只有 `EventsPage:609`（删除事件的 **wiki** 分支）使用该数字，语义未变 → 效果等价 |
| **内容** | `expiresAt` 保留为绝对值（不重算），符合 R1「不变」；`ttlDays` 一并保留 |
| **异常归宿** | `moveToTrash` 失败 → 记 `failed` 且成员照旧脱离事件（与原行为一致，缺陷见 code-review Q3，既有）；降级路径有 `logWarn`（可观测性弱，见 C3）。**无静默丢弃** |

## 四 · 全局回扣

| 回扣 | 结论 |
|---|---|
| **目标回扣** | 用户原话「同步不能改变已经存在的文档的分类、事件类型等等，只需要改 KB 数据或内容」→ 分类/事件/tag 保留，正文与索引更新 ✅ |
| **位置回扣** | `源侧文件 → upsertRelation → 分片 → 检索/成员列表` 全链无遗漏；终态动作两条出口已同源 |
| **判据回扣** | 五条整体成功判据逐条成立；唯一未闭环是「尊重阶段档位」的 `fts-only` 分支（C1） |

## 五 · 认可点

1. 降级路径收口在一个 helper，且用源码断言锁住「`delete rel.lifecycle` 只允许出现在 helper 内」——比口头约定更能防回退。
2. 测试给 hidden 用例加了可检索基线，避免「0 命中」被伪证。
3. 两个既有断言按新语义**反转而非删除**，行为变更留下了显式记录点。

## 六 · 风险汇总

| 编号 | 类型 | 等级 | 状态 |
|---|---|---|---|
| C1 | 场景完备性（fts-only 档位） | 🟡 中 | 待拍板（code-review D1） |
| C2 | 搭车变更（摘除判据） | 🟡 中 | 已修复并复跑 |
| C3 | 可观测性（降级告警） | 🟡 中 | 待拍板（code-review D2） |

**总评**：实现方向正确、副作用已闭合；剩余两项是范围与可观测性取舍，不影响本次合入。
