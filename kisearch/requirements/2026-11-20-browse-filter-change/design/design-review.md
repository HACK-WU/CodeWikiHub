# 设计评审报告：浏览页筛选改造

- **文档**：`DESIGN.md` + `S01_timestamp_DESIGN.md` + `S02_doclist-filter_DESIGN.md` + `S03_condition-builder_DESIGN.md`
- **格式**：design-craft（父文档含「共享术语速查」+ mermaid 一览图；子文档 `S0X_*_DESIGN.md`）
- **评审时间**：2026-11-20
- **评审方式**：文档全量评审 + 对关键事实做代码交叉核验（`src/lib/events/store.ts`、`src/lib/datasource.ts`、`src/lib/rebuild-vector.ts`、`web/src/pages/BrowsePage.tsx`、`web/src/components/TagSelect.tsx`）

## 🔴 阻断（必须修复）

| # | 维度 | 位置 | 问题 | 修改建议 |
|---|---|---|---|---|
| 1 | 完整性 | S-03 §2、§3.4 | **漏掉阅读态的第二处筛选入口**。现状 `TagSelect` 有两处渲染：空态/结果态工具栏 `BrowsePage.tsx:1621`，以及**阅读态头部** `BrowsePage.tsx:1429`。按现设计只替换前者，阅读态会残留旧的单标签下拉，形成"两套筛选入口" | §2 补第二处渲染点；§3.4 明确阅读态由 `ConditionChips` 徽标承载入口（点击回落结果态），`BrowsePage.tsx:1429` 一并移除 |
| 2 | 正确性 | S-01 §3.3 + S-03 §3.4 | **`createdAt` 补锚点会让"更新"显示成"新增"**。§3.3 写"内容变更且 `createdAt` 缺失时补 `now`"，同时 `updatedAt = now` ⇒ 两者相等；而前端徽标判据是 `updatedAt - createdAt < 60s` ⇒ 该文档被判为"新增"，与事实相反 | §3.3 改为**不补** `createdAt`（保持缺省=未知）；S-03 §3.4 徽标判据改为 `createdAt === undefined ? '更新' : (diff < 60s ? '新增' : '更新')` |
| 3 | 正确性 | S-01 §3.2 | **判定调用点未写死，且未声明"只用于打标"**。`isContentUnchanged` 依赖已切分好的 `entries`（现调用点 `import.ts:1398-1408` 在切分之后）。若实现者提前到切分前调用 → `entries` 为空 → 恒定判"内容变更"，功能退化为全量刷新；若误当作跳写条件 → 改变 FTS-only 导入的既有语义 | 写死：调用点=现有 `import.ts:1398-1408`，**仅去掉 `conflictMode==='incremental' && vector` 前置**；结果只写 `stamp`，不参与 `continue`，既有增量跳写行为原样保留 |

## ⚠️ 疑似阻断（需人工确认）

| # | 维度 | 位置 | 问题 | 修改建议 |
|---|---|---|---|---|
| 4 | 正确性 | S-02 §4 / D7 | **`tags=a,b` 逗号分隔与 tag 名含逗号冲突**。D7 自己也写了"若确认全网无含逗号 tag"——把结论留成了条件句。tag 是用户自定义字符串，含逗号完全可能 | 改为**重复 query 参数** `?tags=a&tags=b`（`URLSearchParams.getAll('tags')`），彻底消除歧义且不限制命名（置信度 🟡，需确认是否存在含逗号 tag 的历史数据） |
| 5 | 体验 | S-03 §3.5 | **事件候选 `limit:100` 无兜底**。事件超过 100 个时用户无法选到目标事件，且无提示 | 明确方案：优先用 `listEvents(q)` 服务端搜索（该接口已支持 `q`）+ 默认只列未收口最近 100 个，并在面板里显示「已显示前 100，输入关键字搜索」 |

## 🟡 警告（强烈建议修复）

| # | 维度 | 位置 | 问题 | 修改建议 |
|---|---|---|---|---|
| 6 | 质量 | 全部 | 未标注**非功能性默认假设** | 父文档 §1 或各子文档方案章补：单机部署、单库文档量级 ≤ 5 万、筛选为内存 O(n)、无并发写保护 |
| 7 | 完整性 | S-02 | **缺时序图**（视图逐成员属复杂时序流程，触发章节） | 补 mermaid sequence：BrowsePage → /api/doc/list → handleDocList 解析一次 → 逐成员 buildDocListPayload → 合并 buckets |
| 8 | 质量 | S-02 §4、§5 | 只给 Demo JSON，**缺响应字段表**；且 §5 只说明 `tags` 不随过滤变，**未说明 `groups` 计数口径** | 补响应字段表（含 `filters` 结构与 `undatedExcluded` 位置）；§5 补一行"`groups[].count` 与顶层 `tags` 均为全量口径，不随过滤变" |
| 9 | 一致性 | S-03 §3.5 | 成员列表来源写成「`/api/doc/list` 响应 members（或视图成员 API）」——**"或"是未决项**，且事件候选需要在**列表尚未请求**时先加载 | 定稿单一来源（建议 `useScopeList()` 里的视图定义），并写入 §3.6 |
| 10 | 正确性 | S-03 §3.5 | **标签候选来源未定义**。现有 `TagSelect` 从 `useDocList(scope)` 的无筛选响应取 `tags`（`hooks.ts:132`）；若改造后取自已过滤响应，选中一个标签后其余标签会消失 | 明确：标签候选固定取**无筛选**的 doc list（或新增 `useDocTags`），视图下用顶层合并 `tags` |
| 11 | 正确性 | S-01 | **未覆盖"改名/移动"场景**。仓库已有文档移动能力；改名会生成新 relation ⇒ 被判为"新增"而非"更新"，`createdAt` 丢失 | 明确口径：接受（文档化"改名视为新文档"），或按 `sourcePath` 继承 `createdAt`；二选一写进 §5 |
| 12 | 质量 | S-02 §3.2 / S-03 §3.4 | `undatedExcluded` 计算式写成伪函数 `matchAllWithoutSince`；视图下**前端累加**未在 S-03 写明 | 补出可实现的表达式；S-03 写明"视图下累加各桶 `undatedExcluded`" |
| 13 | 完整性 | S-01 §8 | 打标矩阵未写 **`datasource` 同步 / rebuild** 入口 | 已核实：`datasource.ts:1651` 复用 `handleDirectImport`；`rebuild-vector.ts:142-154` 直接复用同一 `hot_relations` 对象 ⇒ **无需改动**，但必须在文档里写明"已复用、不变"，否则实现者会去改 |
| 14 | 一致性 | S-03 §7 | **未交代 `TagSelect` 的去留** | 已核实仅浏览页引用（`BrowsePage.tsx:29/1429/1621`）⇒ 写明"组件保留、由 `ConditionBuilder` 复用其 combobox 交互与 `.ki-combobox` 样式（`ki.css:3530`）"，或"删除并迁走 CSS 段" |

## 🟢 建议

| # | 位置 | 建议 |
|---|---|---|
| 15 | S-03 §3.6 | queryKey 用 `[...filters.tags].sort().join(',')`，避免标签顺序产生不同缓存键 |
| 16 | S-03 §3.6 | 目录树不传 `sort=recent`（组内顺序无意义），只在全局结果分支传 |
| 17 | S-02 §3.1 | 明确 `since` 的 `now` 取**服务端**时钟（客户端时钟仅用于展示相对时间） |
| 18 | 父文档 R3 | "并发上限 4"无依据，改为"可配置，默认 4"并说明来源 |

## ✅ 已核查通过（不作为问题）

1. **事件 id 是否跨库撞车**：`evt_${now.toString(36)}_${rand}`（`src/lib/events/store.ts:186`）⇒ 全局唯一，视图下 `event=evt_x` 不会串到其他库的不同事件。
2. **数据源同步是否绕过打标**：`src/lib/datasource.ts:1651` 调 `handleDirectImport`，同链路。
3. **rebuild 是否会清空时间字段**：`shardedGroupsFromRc`（`src/lib/rebuild-vector.ts:142-154`）复用同一 `hot_relations` 引用，不重建 Relation 对象。
4. 结构：父文档 4 章齐、含 mermaid 一览图与共享术语速查；三个子文档术语条目均 ≤ 7；12 条决策均含被否决方案 + 可观测的重评触发条件。

## 📊 统计

| 维度 | 🔴 | 🟡 | 🟢 | 合计 |
|---|---|---|---|---|
| 完整性 | 1 | 2 | 0 | 3 |
| 正确性 | 2 | 3 | 0 | 5 |
| 质量 | 0 | 3 | 2 | 5 |
| 体验 | 0 | 1 | 0 | 1 |
| 一致性 | 0 | 2 | 2 | 4 |
| 合计 | 3 | 11 | 4 | 18 |

> ⚠️ 疑似阻断 2 项单列，不计入 🔴。

**结论：❌ 不通过**（3 个阻断项）。修复阻断 + 疑似阻断后可复审。
