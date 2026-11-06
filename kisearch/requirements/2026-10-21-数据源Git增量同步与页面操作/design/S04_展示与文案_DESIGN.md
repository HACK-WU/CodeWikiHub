# S-04 类型 / Commit 展示与文案 — 详细设计

> 父文档：[DESIGN.md](./DESIGN.md)
> 依赖：[S-01](./S01_数据模型与Git识别_DESIGN.md)、[S-02](./S02_Git增量同步引擎_DESIGN.md)、[S-03](./S03_页面同步与限频_DESIGN.md)
> 本子需求不新增数据能力，只消费 S-01/S-02/S-03 的字段。

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| 类型徽标 | 列表 Scope 旁 `Git` / `目录` 小徽标 |
| 同步可用性 | `syncAvailability`：允许 / 冷却 / 运行中 |
| 增量摘要 | 全量扫描 N / 本次变更 M / 内容未变 K |
| 警告条 | `lastSync.warnings` 渲染出的 warn/info 提示 |

---

## 2. 现状（AS-IS）

| 事项 | 现状 | 证据 |
|---|---|---|
| 列表列 | Scope / 源目录 / 落点 Group / 上次同步 / 状态 / 待删 | `web/src/pages/DataSourcePage.tsx:311-350` |
| 抽屉 | 同步参数（scope/源目录/落点/策略/切分）+ 执行结果 + 待删 | `web/src/lib/dataSourceDetailModel.ts:263-281` |
| 页面文案 | 「数据源只能通过命令行登记与同步……本页只读」 | `web/src/pages/DataSourcePage.tsx:250-257` |
| 空态 | 「还没有数据源。数据源只能通过命令行登记」 | `web/src/pages/DataSourcePage.tsx:304-308` |
| 文档 | `docs/cli.md:106-127` 声明「CLI 是登记与同步的唯一入口；页面只读」；`docs/mcp-http.md:119-121` 只列读接口与 prune | 同左 |
| 提示 | 失败明细、冲突明细、待删 stale 提示 | `dataSourceDetailModel.ts:176-242` |

---

## 3. 方案（TO-BE）

### 3.1 Web 类型扩展

`web/src/api/httpApi.ts`：

```ts
export type DataSourceKind = 'directory' | 'git';
export type DataSourceSyncMode = 'incremental' | 'full';

export interface DataSourceGitView {
  repoRoot: string;
  relativeRoot: string;
  branch: string | null;
  remoteUrl: string | null;
  managed: boolean;
  remoteBranch: string | null;
}

export interface DataSourceGitSyncView {
  commit: string | null;
  runCommit: string | null;
  shortCommit: string | null;
  subject: string | null;
  authorTime: number | null;
  changedCount: number;
  fullScanned: number;
  untrackedMarkdown: number;
  update: 'updated' | 'up-to-date' | 'skipped' | 'failed';
  updateDetail?: string;
  fetch: 'ok' | 'failed' | 'skipped';
  fetchDetail?: string;
}

export interface DataSourceWarningView { code: string; message: string }

export interface SyncAvailabilityView {
  allowed: boolean;
  nextAvailableAt: number | null;
  retryAfterSec: number | null;
  reason: 'active' | 'cooldown' | null;
}

export interface DataSourceResultView {
  files: {
    scanned: number;
    fullScanned?: number;   // 旧 daemon 缺省
    changed?: number;       // 旧 daemon 缺省
    completed: number;
    unchanged: number;
    skipped: number;
    incomplete: number;
    duplicatesSkipped: number;
  };
  // ...其余不变
}

// ★ git / warnings 属于 lastSync，不属于 result（与 S-01 的服务端结构一致）
export interface DataSourceLastSyncView {
  // ...现有字段（at/durationMs/state/taskId/params/result/pendingDelete）
  git?: DataSourceGitSyncView;
  warnings?: DataSourceWarningView[];
}
```

- `DataSourceListRow` / `DataSourceRecordView` 增 `type`、`git?`、`syncAvailability?`。
- 所有新字段**可选**：旧 daemon 不返回时不崩。

### 3.2 详情模型映射

`web/src/lib/dataSourceDetailModel.ts`：

**同步参数（params）**

| 行 | 值 | 说明 |
|---|---|---|
| 类型 | `Git 仓库` / `普通目录` | 旧记录缺省「普通目录」 |
| 同步模式 | `params.mode === 'full' ? '全量' : '增量'` | 旧快照无字段时显示 `—`；目录类型恒为全量 |
| 知识库 | scope | 现有 |
| 源目录 | dir（full） | 现有 |
| Git 仓库 | `git.repoRoot`（full） | 仅 git |
| 分支 | `git.branch ?? 'detached'` | 仅 git |
| 最近提交 | `shortCommit · subject` + hint 提交时间 | 仅 git；来自 lastSync.git |
| 落点 Group | 现有 | — |
| 同名策略 | 现有 | — |
| 向量化 | 现有 | — |
| 切分参数 | 现有 | — |

**执行结果（results）**

| 行 | 值 | 说明 |
|---|---|---|
| 全量扫描 | `files.fullScanned ?? files.scanned` | 源目录本次扫描数 |
| 本次变更 | `git.changedCount ?? files.changed ?? files.scanned` | Git 增量数；目录类型 = 全部。旧快照无 `changed/fullScanned` 时加 hint「旧快照无增量字段，按导入基准显示」 |
| 处理 | `files.scanned` | 导入管线基准 |
| 完成 | `files.completed` + hint「内容未变 K」 | 现有 |
| 跳过 | `files.skipped` | 现有 |
| 失败 | `files.incomplete` | 现有 |
| 向量条目 / 全文条目 | 现有 | — |

**提示（notices）** 新增：

| 来源 | tone | 文案 |
|---|---|---|
| `lastSync.git.update === 'failed'` | warn | 自动更新失败：`updateDetail`；本地工作区未改动，本次同步本地内容 |
| `lastSync.git.fetch === 'failed'` | warn | 远端更新检查失败：`fetchDetail`；本次同步基于本地内容 |
| `lastSync.git.untrackedMarkdown > 0` | info | 检测到 N 个未跟踪文件不参与 Git 增量；需要同步它们请执行全量同步 |
| `lastSync.state === 'partial' && lastSync.git.runCommit !== lastSync.git.commit` | warn | 本次有未完成文件，commit 水位未推进；下次同步会重试 |
| `syncAvailability.reason === 'cooldown'` | info | 距上次成功同步不足 30 分钟；剩余约 X 分钟。如需立即同步：`ki datasource sync --scope <s>` |
| `syncAvailability.reason === 'active'` | info | 同步排队中/进行中（现有 active 提示） |

- `lastSync.warnings` 已在 S-02/S-03 中落地；页面直接按 `message` 渲染，不维护 code→文案映射，避免两端漂移。
- 警告最多展示 10 条（服务端已限）。

**时间（times）** 保持现有：上次同步 / 用时；可选追加「提交时间」到 params 的 hint，不新增行。

### 3.3 列表与操作

```text
┌ 数据源                                          [+ 添加 Git 数据源] ┐
│ 共 2 个数据源 · 1 个 Git · 1 个目录 · 1 个从未同步                  │
├────────────────────────────────────────────────────────────────────┤
│ Scope          源目录                  上次同步        状态   操作   │
│ langchain      /root/learning/...      10-21 14:30    成功  [同步] │
│  [Git]                                                             │
│ scope          /root/learning/...      —              从未  [同步] │
│  [目录]                                 （30 分钟后可同步）          │
└────────────────────────────────────────────────────────────────────┘
```

- **类型徽标**放在 Scope 单元格下方：`.ki-ds-type-badge--git`（主色浅底，文案 `Git`）/ `--dir`（中性底，文案 `目录`）。
- **操作列（结构必须改）**：现有 `.ki-ds-table__row` 是 `<button>`（`DataSourcePage.tsx:325-348`），**不能**在其中再嵌「同步」按钮（button 嵌套 button：非法 HTML，键盘/ARIA 语义冲突，`stopPropagation()` 不能修复）。改为：
  - 行容器：`<div className="ki-ds-table__row" role="row" tabIndex={0} aria-label=...>`；`onKeyDown` 仅在 `event.target === event.currentTarget` 时处理 Enter/Space 打开抽屉。
  - 「同步」按钮作为行内**独立** `<button>`（与各单元格平级），`onClick` 里 `stopPropagation()`。
  - 验收补三项：Tab 顺序（行 → 同步按钮）、Enter 在行上打开抽屉、Enter 在同步按钮上只触发同步。
- 行整体仍可点开抽屉（现有行为），但不再用 `<button>` 承载整行。
- 只新增一个「操作」列；**类型塞进 Scope 单元格**，不再加「类型」列，避免源目录列被挤压。`@media (max-width: 1100px)` 时隐藏 `落点 Group`。
- 同步中的行：按钮文字「同步中…」，`disabled`；与状态列同源。

### 3.4 抽屉

- 头部：kicker `DATASOURCE` + scope + 类型徽标；右侧状态 + `同步` 按钮（primary/secondary 小按钮）+ 关闭。
- Git 信息块：仓库 / 分支 / 最近提交（短 hash + subject + 时间）。
- 同步按钮旁：
  - Git：下拉/次级按钮「全量同步」；文案「含未跟踪文件」。
  - 目录：无次级按钮。
- 冷却态：按钮禁用 + 提示条（含 CLI 命令，可复制）。
- 未跟踪警告：`info` 提示 + 「全量同步」按钮（仅 git）。
- 旧 daemon：`syncAvailability === undefined` → 同步按钮禁用，提示「当前 daemon 不支持页面同步，请升级并重启」。
- 无障碍：
  - 按钮标题/aria-label 说明模式（增量/全量）。
  - 冷却倒计时用 `aria-live="polite"`（避免每秒播报，30s 更新一次）。
  - 类型徽标是视觉增强，`aria-label` 已在行级包含类型。

### 3.5 文案反转（页面 + 文档）

**页面 callout（替换现有 `ki-ds-callout`）**

> ⓘ 本地目录数据源通过命令行登记：`ki datasource add --scope <scope> --source <目录>`。Git 仓库可在本页「添加 Git 数据源」；同步可在本页触发（普通目录 30 分钟一次，CLI 可强制）。本页的删除仅针对待删候选，不动源目录文件。

**空态**

> 还没有数据源。
> 本地目录：`ki datasource add --scope <scope> --source <目录>`
> Git 仓库：点击右上角「添加 Git 数据源」

**历史目录提示**（保持不变，仍是本地目录）

> ⓘ 检测到 N 个历史导入目录（目录可读且非上传暂存；只能通过命令行登记）

**docs/cli.md**

- 删除「CLI 是登记与同步的唯一入口；页面只读」。
- `datasource` 命令块新增：`add --type`、`add --git-url`（S-05）、`sync --full`、`remove --purge`。
- 增加一节「Git 数据源同步语义」：fetch + 自动更新（ff-only/托管 reset）、只同步 tracked 变更、untracked 警告、commit 水位只在 ok 推进。

**docs/mcp-http.md**

- 接口表新增 `/api/datasource/sync`、`/api/datasource/add-remote`。
- 修改 `list/detail` 描述：新增 `type/git/syncAvailability`；`prune` 不再是「唯一写接口」，改为「唯一删除接口」。
- 增加错误码表：`SYNC_ALREADY_RUNNING` / `SYNC_RATE_LIMITED` / `SOURCE_UNREACHABLE` / `INVALID_GIT_URL` / `CLONE_TARGET_EXISTS` 等。

### 3.6 CSS

新增类（复用现有 token，不引入新色）：

```css
.ki-ds-type-badge { /* 12px, 圆角胶囊, 与 ki-badge 同族 */ }
.ki-ds-type-badge--git { color: var(--ki-color-primary); background: color-mix(in srgb, var(--ki-color-primary) 10%, transparent); }
.ki-ds-type-badge--dir { color: var(--ki-color-text-subtle); background: var(--ki-color-bg-secondary); }
.ki-ds-table__actions { /* 右对齐, white-space: nowrap */ }
.ki-ds-sync-btn { /* 与 ki-btn--secondary ki-btn--small 同尺寸 */ }
.ki-ds-rate-note { /* 11px, subtle, 单行省略 + title */ }
.ki-ds-git-facts { /* 键值两列, 与 DetailRow 同构 */ }
```

- 表格新增操作列后，验证 1440/1024/900 三档无横向溢出。
- 按钮用现有 `.ki-btn` 基类；不要新造一套。

---

## 4. 展示映射（数据 → UI）

| 数据 | UI |
|---|---|
| `record.type` | Scope 下方徽标 + 抽屉「类型」行 |
| `record.git.repoRoot` | 抽屉「Git 仓库」行 |
| `record.git.branch` | 抽屉「分支」行；null → `detached` |
| `lastSync.git.shortCommit` | 列表 Scope 下第二行（可选）或抽屉「最近提交」 |
| `lastSync.git.subject` | 抽屉「最近提交」hint |
| `lastSync.git.authorTime` | 抽屉「最近提交」hint |
| `lastSync.git.changedCount` | 抽屉「本次变更」 |
| `lastSync.result.files.fullScanned` | 抽屉「全量扫描」 |
| `lastSync.git.untrackedMarkdown` | 抽屉警告 + 全量同步入口 |
| `lastSync.git.update/fetch` | 抽屉警告条 |
| `lastSync.warnings` | 抽屉警告条（直接 message） |
| `syncAvailability` | 同步按钮启用/禁用 + 冷却提示 |
| `activeState` | 状态列/头部/按钮文案 |

---

## 5. 影响范围

| 文件/模块 | 变更 |
|---|---|
| `web/src/api/httpApi.ts` | 新增/扩展数据源类型与 `syncAvailability` |
| `web/src/pages/DataSourcePage.tsx` | 类型徽标、操作列、同步按钮、全量同步、冷却提示、callout/空态 |
| `web/src/lib/dataSourceDetailModel.ts` | params/results/notices 映射 |
| `web/src/styles/ki.css` | 徽标、操作列、冷却提示、Git 信息块 |
| `web/test/data-source-detail-model.test.mjs` | 新增 Git/警告/冷却映射用例；旧记录降级用例 |
| `docs/cli.md` / `docs/mcp-http.md` | 语义与接口表更新 |

**兼容性**：
- 旧 daemon 返回的 `DataSourceRecordView` 没有 `type/git/syncAvailability` → 页面显示「目录」、隐藏同步按钮并提示升级；不报错。
- 旧 `datasource.json` 的 `lastSync.result.files` 没有 `fullScanned/changed` → 页面回退 `scanned`。

---

## 6. 关键决策点

| 决策 | 采用 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 类型展示 | Scope 下徽标 | 新增「类型」列 | 表格已有 6 列，再加会挤压源目录 | 类型成为筛选维度时 |
| 同步入口 | 行内按钮 + 抽屉按钮 | 只在抽屉 | 行内更快；抽屉是详情 | 行内按钮导致误点（有 stopPropagation） |
| 冷却提示 | 服务端 `retryAfterSec` + 本地递减 | 只用绝对时间 | 客户端时钟偏差会显示错误剩余时间 | 无 |
| 警告渲染 | 服务端给完整 message，前端直出 | 前端维护 code→文案 | 两端漂移（项目已多次踩坑） | 需要 i18n 时 |
| 旧 daemon | 隐藏同步入口 + 升级提示 | 允许点击后 404 | 用户无法理解 404 | 无 |
| 全量同步入口 | Git 抽屉次级按钮 | 全局开关/CLI only | untracked 警告需要就地出路 | 全量同步使用频率高时 |

---

## 7. 待定问题

| 问题 | 当前处理 | 需要谁决定 |
|---|---|---|
| 列表是否显示短 commit | 首版只在抽屉显示；列表保持紧凑 | 用户走查后决定 |
| 类型是否参与筛选 | 首版不做 | 数据源数量增长后 |
| 页面移除托管 clone | 首版 CLI `remove --purge`，页面不做 | Q7 默认 |
| 暗色主题徽标对比度 | 使用现有 token；走查时验证 | 前端走查 |

---

## 8. 不在范围内

- 任何新的数据能力（类型/commit/限频均由 S-01~S-03 提供）。
- Git URL 添加表单与 clone 流程（S-05）。
- 页面移除数据源/托管 clone（CLI `remove --purge`）。
- 列表的类型筛选、短 commit 列（后续迭代）。
