# 设计评审报告（第 1 轮）

- 评审对象：`DESIGN.md` + `S01`~`S06`（6 子文档）
- 格式：design-craft
- 评审时间：2026-11-04
- 方式：结构完整性 / 内容质量 / 技术正确性挑战 / 跨文档一致性 四阶段

---

## 一、初评结论：❌ 不通过（4 阻断 / 10 警告 / 2 建议）

| 严重度 | 数量 | 处置 |
|---|---|---|
| 🔴 阻断 | 4 | **已全部修复** |
| 🟡 警告 | 10 | 已修 9，1 项由父文档覆盖 |
| 🟢 建议 | 2 | 已采纳 |

---

## 二、🔴 阻断项与修复

### B-1 安全回归：展开前丢失字符校验

**问题**：S-01 §3.3 的 `resolveScopeTargets` 签名与行为表**完全没有提到 `validateScope`**。现状 `parseScopes`（`src/lib/scope.ts:68-84`）承担的正是逐段字符校验，S-02 整段替换它后，`--scope ../etc` 会直接进入路径派生。

**修复**：
- 父文档 §3.2 新增不变量 **I6**（展开前逐段 `validateScope`，标注为安全不变量）
- S-01 §3.3 行为表补两行（`'../etc'` / `'team,../x'` 均抛 `ScopeError('INVALID_SCOPE')`），并写明固定实现顺序
- S-02 §3.1 补安全前置说明；新增验收 B10

### B-2 幽灵接口：`isViewMemberOf`

**问题**：S-02 §3.1 代码调用 `isViewMemberOf()`，S-02 §6 称"S-01 产物补一个小函数"，但 S-01 §3.3 接口清单里没有它（阶段 4.2「幽灵接口」）。

**修复**：S-01 §3.3 补完整签名，并明确「`views` 为空数组时恒返回 `false`」（否则纯 scope 请求会借视图逃过 strict 白名单）；新增验收 A12。

### B-3 循环依赖：S-01 ↔ S-04

**问题**：`ki view delete` 要打印受影响 token（需 S-04 的 token 读取），`ki view show` 要显示 KB/向量/只读（需 S-04 的 `executeScopeList`），而 DAG 是 S-01 → S-04。

**修复**：
- `ki view show` 降级为**配置级**（成员名 + 目录是否存在），不查向量层与只读状态 → 原 A8 改写，新增说明
- `ki view delete` **不查询 token**，改为**静态文案**提示 `ki mcp token list --granting-view <view>`（纯字符串，零代码依赖）
- 该命令作为 S-04 验收项 **D10 / D10-b**（不塞进 `ki view delete`，避免成环）

### B-4 只读态丢失：视图成员无元信息

**问题**：`views[].members` 只是 `string[]`；`scopes[]` 按 token 授权过滤，成员库通常不在其中（授权视图 ≠ 授权成员名）。前端 `useScopeReadonly(成员名)` 查不到条目 → `readonly=false` → **只读库在视图下显示成可写**，S-06 验收 F15 不可达。

**修复**：
- S-04 `ViewInfo` 新增 `memberMeta: ViewMemberMeta[]`（`scope/kb/vector/readonly`），JSON Demo 同步
- S-06 §3.6 改为从 `memberMeta` 取只读态，新增 `useViewMemberReadonly(view, member)`，并显式说明**不能**改查 `scopes[]`
- S-04 过滤规则表同步；新增验收 D11 / S-06 F18

---

## 三、⚠️ 疑似阻断（1，已按建议处理）

| 问题 | 处置 |
|---|---|
| S-06「进入 ↗」用 `setScope()` 会写 localStorage，用户"看一眼单库"后下次打开停在单库，找不到原视图 | 采纳：保留 `setScope` 持久化（避免出现第二套"临时 scope"状态），并在 **S-05** 补「↩ 回到视图」软入口（`web/src/lib/lastView.ts`，sessionStorage）。新增 S-06 D7 + F17 |

---

## 四、🟡 警告与处置

| # | 问题 | 处置 |
|---|---|---|
| W-1 | `SearchResult.views: string[]` 与 `ScopeListResult.views: ViewInfo[]` 同名不同类型 | 检索侧改名 **`matchedViews`**（S-02 §3.3 + JSON Demo + S-05 类型） |
| W-2 | 子文档重复定义父文档已定义的共享术语 | S-01/S-05/S-06 §1 各加指针「通用定义见父文档 §3.3」 |
| W-3 | `INVALID_VIEW_MEMBER` 未进父文档错误码表 | 补入父文档 §3.4 |
| W-4 | S-05 D5（乐观默认）与 E7（无请求携带视图名）矛盾 | D5 改为「乐观默认 + `scopeList.isLoading` 期间禁用提交」；E7 改为「就绪后无泄漏」 |
| W-5 | 核心链路无时序图 | S-02 新增 §3.6 时序图（展开 → strict 过滤 → fan-out → 回填 → 返回） |
| W-6 | 性能假设未落到子文档，S-06「不额外限制」与父文档「≤20」口径不一 | S-06 §3.1 补「成员 ≤ 20 + 响应体估算 + 懒加载触发条件」，新增 D8 |
| W-7 | S-03 C2「不落盘」依赖 `ensureScopeDir` 调用顺序 | C2 补实施前提脚注：须先核实顺序，否则上提门禁 |
| W-8 | S-02 D1 触发条件写"未预见"（不可判定） | 改为「无」 |
| W-9 | 全文档无「待定问题」章 | 由父文档 §4 风险表覆盖（R1~R7），判定为不缺失 |
| W-10 | 「有 KB 无向量」的成员被误报成「尚未导入」 | S-02 新增 §3.5 跳过原因分流；新增验收 B11 |

---

## 五、🟢 建议与处置

| # | 问题 | 处置 |
|---|---|---|
| S-1 | 兜底项把「已删除的视图」塞进「单个知识库」组会困惑 | S-05 §3.2 加 `已失效` 标记（依据 `getLastView()`） |
| S-2 | 视图多库在协调器占多分片的影响未说明 | S-06 §3.1 补：`read` 通道只与元数据提交窗口短互斥，影响可忽略 |

---

## 六、复评（第 2 轮，修复后一致性校验）

| 检查项 | 结果 |
|---|---|
| `matchedViews` 命名已贯通（S-02 / S-05） | ✅ 无残留 `views?: string[]` |
| `memberMeta` 在 S-04 / S-05 / S-06 三处类型一致 | ✅ |
| `isViewMemberOf` 已在 S-01 定义并被 S-02 引用 | ✅ |
| S-01 无任何对 S-04 的能力调用 | ✅（`show` 配置级 + `delete` 静态文案） |
| 子需求间文件互斥（S-05 / S-06） | ✅ 父文档新增 I7 明确归属；`ScopeSelect.tsx`/`scopeContext.tsx`/`lastView.ts` → S-05，`BrowsePage.tsx`/`groupTree.ts`/`hooks.ts` → S-06 |
| 错误码表覆盖全部子文档新增码 | ✅ |
| 一览图节点 ↔ 子文档文件 | ✅ 6/6 |

**复评结论**：✅ 通过（无残留阻断，警告均已落地）

---

## 七、实施时必须先确认的两个前提

1. **`ki store` 的 `ensureScopeDir()` 调用顺序**（S-03 C2 依赖它晚于门禁）。若先建目录，须把 `assertNotScopeView` 上提到命令入口。
2. **`submit(..., scopes, 'read')` 的 `scopes` 形参类型**确为数组（S-06 多库占位依赖）。
