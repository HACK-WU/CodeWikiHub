---
id: REQ-20261019-004
document_type: design
sub_requirement: S-03
version: 1
updated: 2026-10-19
---

# S-03 任务详情渲染与口径修正

## 1. 术语

| 术语 | 定义 |
|---|---|
| 三段布局 | 参数 / 结果 / 时间三个分组；低频信息（任务 ID）压底 |
| 结果态 | `state ∈ {succeeded, partial, failed, cancelled}` 且 `result` 存在 |
| 旧记录 | 无 `params` / `result` 的历史任务（1h 内外的升级前记录） |
| 阶段进度 | `progress{done,total}`，**单位随 phase 变化**（见 §3.3） |

## 2. 现状（AS-IS）

`web/src/pages/TasksPage.tsx:137-151` 渲染 8 个字段；`taskProgress()`（`:70-76`）把所有阶段压成 `阶段 · 百分比（done/total）`。

🟢 三个具体缺陷：

1. **完成态显示 `persist` 的 `1/1`**：`import.ts:1785` 发 `{phase:'persist', done:0, total:1}`，`:1857` 发 `{done:1,total:1}`，而 `TaskReporter.progress` 是**整体替换** `progress`（`task-registry.ts:257-263`）⇒ 终态只剩 `1/1`。用户读成"这次只导入了 1 篇"。
2. **同一字段三种单位**：`scan.total` = 文件数、`vectorize.total` = chunk 数、`persist.total` = 1。
3. **已有数据未用**：`progress.persisted / failed / cancelled / notProcessed` 全未渲染。

## 3. 方案（TO-BE）

### 3.1 新增 `web/src/lib/taskDetailModel.ts`（纯函数，可单测）

组件不再做判断，只渲染模型：

```ts
export interface DetailRow { label: string; value: string; hint?: string; tone?: 'normal' | 'warn' | 'danger' }
export interface DetailItem { title: string; meta?: string }

export interface TaskDetailView {
  /** 参数段（运行中也显示） */
  params: DetailRow[];
  /** 结果段（仅结果态；旧记录为空数组） */
  results: DetailRow[];
  /** 时间段 */
  times: DetailRow[];
  /** 疑似重复明细（≤20，已截断时含提示行） */
  duplicates: DetailItem[];
  /** 同名冲突明细（≤20） */
  conflicts: DetailItem[];
  /** 顶部结论：错误 / 恢复建议 / 全部重复等 */
  notices: Array<{ tone: 'info' | 'warn' | 'danger'; text: string }>;
  /** 是否显示进度条（仅 queued/running，或结果态缺 result 的旧记录） */
  showProgress: boolean;
  /** 进度文案（含单位） */
  progressText: string;
  /** 进度百分比；缺省 null */
  progressPercent: number | null;
}

export function buildTaskDetail(task: TaskRecord): TaskDetailView;
```

**兜底规则（N2）**：所有取值统一走 `dash(value)` —— `undefined / null / '' / NaN` ⇒ `'—'`；`0` 保留为 `'0'`（`unchanged: 0` 必须显示 0，不能显示 —）。

**失败路径口径（challenger 意见 1）**：`result.files` 缺失是**预期**（任务在元数据提交前中断，见 S-02 §3.4.1）。此时结果段显示一行说明「文件级明细不可用（任务未完成元数据提交）」，并**原样展示 `task.error`**（取消场景的 message 已含「已完成 N/M 个文件」）。**不得**把缺失渲染成 `0`，也不得凭空估算。

**血缘渲染（challenger 意见 3）**：`retryOf` 只渲染**短 ID（前 8 位）+ `title` 提示「原任务保留 1 小时，可能已清理」**，不做成可点击链接——TTL 1h 后目标必然消失，链接会变成死链。

**旧记录说明（challenger 意见 4）**：无 `params`/`result` 且 `createdAt < 升级时间` 的记录，在参数段顶部显示一行「旧记录：该任务创建于台账扩展之前，无参数与结果快照」。用户据此知道是"历史数据"而非"功能坏了"。

### 3.2 三段布局

```
┌ DETAIL ─────────────────────────┐ [已完成]
│ 上传导入
├ 本次参数 ────────────────────────┤
│ 知识库     verify-preflight-645092
│ 来源       网页 · 浏览器上传
│ Group      raw（未指定 ⇒ 按源目录派生）
│ 标签       产品 / v2
│ 向量       已开启（dense）
│ 同名策略   增量导入
│ 疑似重复   已启用跳过
├ 执行结果 ────────────────────────┤
│ 文件       扫描 12 篇
│ 成功       10 篇（其中内容未变 9 篇）
│ 未完成     0 篇
│ 跳过       2 篇 · 同名 1 / 疑似重复 1 / 其他 0
│ 向量条目   148
│ 全文索引   132 条
│ 附件       复制 3 张图片
│ 落点 Group raw/browser
│ 索引       已优化（dense 1）
│ 重复明细   ▾ 展开 1 条（共 1 条）
├ 时间 ────────────────────────────┤
│ 创建 → 开始  15:24:10 → 15:24:11（排队 1s）
│ 结束        15:24:14（执行 3s）
└──────────────────────────────────┘
  ⚠ 错误 / 恢复建议（如有）
  任务 ID 85e28e67-…（重试自 3a0d…）
  [ 重试未完成 ]  [ 停止 ]
```

排序依据：**用户决策所需信息从上到下**（参数 → 结果 → 时间 → ID）。任务 ID 与时间下沉，是因为它们在 18 个字段里复用频率最低。

### 3.3 进度口径修正（核心）

`progressTextOf(task)` 按 `state` 与 `progress.phase` 分支：

| 情形 | 显示 | 是否显示进度条 |
|---|---|---|
| `queued` | 「排队中，等待同知识库的写入任务完成」 | 否（无确定总量） |
| `running` + `phase=scan` | 「扫描 3/12 篇」 | 是 |
| `running` + `phase=vectorize` | 「向量化 42/148 段」 | 是 |
| `running` + `phase=persist` | 「写入元数据」 | 否（`total=1` 无意义） |
| 结果态 + 有 `result` | **不显示阶段进度**，由结果段承载 | 否 |
| 结果态 + 无 `result`（旧记录） | 沿用旧 `taskProgress`，追加「（旧记录，无结果摘要）」 | 是（仅保留百分比，不显示 `1/1`） |
| `unknown` | 「心跳丢失，最终结果未知」 | 否 |

**单位映射**：`scan` → 篇，`vectorize` → 段，其他 → 步。`total <= 0` 时返回 `null`（不渲染进度条，沿用现有判据）。

> 这条修正同时修掉「同一字段三种单位」：单位由 phase 显式决定，而不是让用户从 `(1/1)` 猜。

### 3.4 错误码文案表（R3）

`errorCodeText(code)`：

| errorCode | 标题 | 页面内可执行动作 |
|---|---|---|
| `ALL_FILES_DUPLICATES` | 本批全部为疑似重复，未写入任何文件 | 「重新导入并选『仍然导入』」→ `/import` |
| `IMPORT_BUDGET_EXCEEDED` | 超出单批导入预算 | 「分批导入」→ `/import`；CLI 提示 `--max-batch-files` |
| `VECTORIZATION_STOPPED` | 向量化中止（embedding 服务异常） | 「检查 embedding 配置」→ `/overview` + 「重试未完成」 |
| `IMPORT_CANCELLED` | 已取消（已完成部分保留） | 「重试未完成」（如有清单） |
| `INCOMPLETE_LIST_*` | 未完成清单异常（损坏/缺失/归属不符） | 文案直出（后端已给可读原因） |
| 其他 / 无码 | 沿用 `task.error`（`safeErrorSummary` 已分类） | **只给确定可达的动作**：「重试未完成」（有清单时）/「重新导入」；**不得**承诺「在导入页查看本次批次」——导入页结果只活在浏览器内存，刷新即失（challenger 意见 5）。`source === 'cli'` 时额外给可复制命令 |

**约束**：无码时**不得**保留原兜底句「请查看发起端的命令输出或服务日志」——网页用户没有发起端。该句仅在 `source === 'cli'` 时保留。

**`notices.tone` 映射（评审 #11）**：`ALL_FILES_DUPLICATES` → `warn`（**不是** danger，它不是故障）且带「仍然导入」动作；`IMPORT_CANCELLED` → `info`；`VECTORIZATION_STOPPED` / 未知错误 → `danger`；`partial` → `warn`。

### 3.5 列表行摘要（R10）

```ts
export function taskSummaryLine(task: TaskRecord): string;
```

结果态显示 `成功 10 · 跳过 2 · 失败 0`；运行中沿用 `scan x/y 篇`；无 result 回退旧文案。列表行 `TasksPage.tsx:451` 与详情共用该函数，避免两套口径。

### 3.6 索引与「当前配置」（R8）

| 展示项 | 来源 | 口径 |
|---|---|---|
| dense 就绪 | `task.indexReadiness`（已落台账） | 沿用既有 `indexReadinessLabel`（含 `unknown ≠ 未建` 判据） |
| 全文索引条目 | `task.result.fullTextIndexed` | 缺失显示「—」 |
| 嵌入模型 / 维度 | `GET /api/vector/status?scope=`（**非任务快照**） | 标签必须写「当前配置」，并在 `title` 说明「不代表本次导入实际使用的模型」 |

> 理由：集合不持久化模型名，拿不到"当时用的模型"；把当前配置写成任务快照会造成错误归因。取数失败时该行显示「—」，不阻断详情其余部分。

### 3.7 知识库跳转（R9）

scope 行渲染为链接：`<Link to={`/browse?scope=${encodeURIComponent(task.scope)}`}>`（沿用 Browse 页既有的 scope 查询参数）。链接失败/scope 非法时不渲染链接，退化为纯文本。

### 3.8 `truncated` 文案口径

明细被截断时统一显示 **「明细未完整显示」**（中性），不得写「超过 20 条」——`truncated` 同时覆盖「条数超限」与「字节预算裁剪」两种成因（评审 #7）。完整条数见对应计数行。

### 3.6 视觉与无障碍

| 项 | 做法 |
|---|---|
| 分组标题 | 新增 `.ki-task-detail__section`（11px / 600 / `--ki-color-text-subtle` + 上分隔线），复用既有 token，不引入新颜色 |
| 明细折叠 | `<details>` + `<summary>`，默认收起；展开后 `max-height: 160px; overflow-y: auto` |
| 长文本 | `overflow-wrap: anywhere`（沿用 `.ki-task-detail__grid dd`） |
| 截断提示 | 「仅显示前 20 条 / 共 N 条」，`title` 属性带全文 |
| 右栏高度 | 字段增至约 18 行，超过 `max-height: calc(100vh - 16px)` 时列内滚动（既有 sticky 设计已支持，见 `ki.css:3036-3045`） |
| 语义 | 结果段用 `<dl>`；错误用 `role="alert"`；快照缺失不渲染空 `<div>` |

## 4. 数据模型

```ts
// web/src/api/tasksApi.ts —— 与后端 TaskRecord 同步（手写副本，必须同改）
export interface TaskParamSnapshot { /* 见 S-01 */ }
export interface TaskResultSnapshot { /* 见 S-01 */ }
export interface TaskRecord {
  // ...既有...
  params?: TaskParamSnapshot;
  result?: TaskResultSnapshot;
  retryOf?: string;
}
```

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 旧记录无 `params` / `result` | 参数段按「—」渲染；结果段隐藏；追加「旧记录，无结果摘要」 | 是 |
| `result.truncated` | 明细区显示「仅显示前 20 条 / 共 {计数值} 条」 | 是 |
| 明细为空数组 | 不渲染该折叠区（不显示"0 条"噪音） | 否 |
| `progress.total === 0` | 不渲染进度条 | 否 |
| `state === 'unknown'` | 提示「心跳丢失，最终结果未知；**记录可能不完整**」——台账写入失败也会表现为心跳停滞（见 S-01 §5），故文案必须覆盖「数据不可信」而不只是「进程可能还在跑」；不给重试动作（沿用 `taskActions.ts` 判据） | 是 |
| 详情请求 404（已过期） | 现有「任务详情暂不可用，可能已过期」保留，文案改为「记录已清理（任务保留 1 小时）」；**`refetchInterval` 返回 `false` 停止轮询**（否则 `unknown` 态每 15s 持续打 404） | 是 |

## 6. 影响范围

| 文件 | 变更 |
|---|---|
| `web/src/api/tasksApi.ts` | 同步 2 个 interface + 3 个可选字段 |
| `web/src/lib/taskDetailModel.ts` | **新增**（约 200 行，纯函数） |
| `web/src/lib/taskActions.ts` | 不改（动作判据只依赖 state/source/清单） |
| `web/src/pages/TasksPage.tsx` | `TaskDetail` 改为渲染 `buildTaskDetail()` 结果；列表行改 `taskSummaryLine` |
| `web/src/styles/ki.css` | 新增 `.ki-task-detail__section`、明细折叠样式（约 40 行） |
| `web/test/task-detail-model.test.mjs` | **新增**：见下 |

**单测覆盖（`web/test/task-detail-model.test.mjs`，vite ssrLoadModule 加载 TS）**：

1. 完成态有 result ⇒ `showProgress === false`，结果段含「扫描 12 / 成功 10 / 内容未变 9」；
2. 完成态无 result（旧记录）⇒ 回退文案 + 「旧记录」提示；
3. `unchanged: 0` 显示 `0` 而非 `—`；`unchanged: undefined` 显示 `—`；
4. `skippedReasons` 三项之和 === `skipped`；
5. `errorCode='ALL_FILES_DUPLICATES'` ⇒ 不给红态、给「仍然导入」动作文案；
6. `source='web'` 且无码 ⇒ 不出现「查看服务日志」；
7. `running + phase='persist'` ⇒ 不渲染 `1/1`；
8. `truncated` ⇒ 出现「仅显示前 20 条」。

## 7. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 |
|---|---|---|---|
| D3-1 | 模型层纯函数 + 组件只渲染 | 直接在 JSX 里写三元表达式 | 当前 `TaskDetail` 已 50 行、字段将增至 18 个，JSX 内判断不可单测；且「口径修正」需要被测试锁死（`verify-import-form-reset.cjs` 曾把错误值锁成期望值，教训在案） |
| D3-2 | 结果态**隐藏**进度条 | 保留进度条 + 旁边加结果 | 进度条表达"还剩多少"，终态无意义；184px 宽的右栏里保留它会把结果段挤出首屏 |
| D3-3 | 明细用原生 `<details>` | 自研展开组件 | 零 JS、天然键盘可达、无状态残留；`TasksPage` 已有 `useState` 较多，不宜再加 |
| D3-4 | 任务 ID 下沉到底部 | 保持现有位置（头部下方） | 18 个字段里 ID 复用频率最低；排障需要时它仍在同屏（右栏 100vh 内滚动） |

## 8. 待定问题

| # | 问题 | 状态 |
|---|---|---|
| 1 | 窄屏（<960，单列）下详情在列表下方，18 行字段是否需要折叠"参数段"默认收起 | 走查后定 |
| 2 | 列表行是否显示「内容未变」 | 信息密度考虑，暂不加 |
