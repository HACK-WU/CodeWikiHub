# S05 回收站页与清库提示

## 术语

| 术语 | 定义 |
|---|---|
| 组行 | 回收站列表中 `kind='group'` 的一行，代表一次组删除 |
| 收缩后条目 | 部分恢复后的组条目，`docCount` 变小但仍留在回收站 |
| 清库 | CLI `ki scope clear`（清内容保目录）/ `ki scope delete`（整目录删） |

## 现状（AS-IS）

| 事实 | 证据 |
|---|---|
| 筛选段 4 项：全部 / 临时到期 / 事件关闭 / 手动删除，计数按 `item.reason` 累加 | `web/src/pages/TrashPage.tsx:109-113, 165-175` |
| 表格 6 列：勾选 / 文档名 / 原 Group / 删除原因 / 剩余 / 操作 | `TrashPage.tsx:242-267` |
| 操作列两个按钮：恢复 / 沉淀为 wiki，`sizeBytes === 0` 时两个都禁用 | `TrashPage.tsx:273, 303-321` |
| 批量恢复只收 `sizeBytes > 0` 的条目 | `TrashPage.tsx:117-119` |
| 侧栏角标 `counts.trash` = `listTrash().total`（条目数） | `AppShell.tsx:713`；`governance-http.ts:2069` |
| 清库 / 删库只有 CLI，且会连 `.trash` 一起清 | `src/scope.ts:64-79`；`ResourcesPage.tsx:126-129` 仅文案 |

## 方案（TO-BE）

### 1. 回收站表：组行靠行内徽标区分，**不新增筛选段**

```text
┌ 回收站 ──── 保留 7 天，到期自动清除 ─────────────── [回收站设置] ┐
│ [全部 12] [临时到期 3] [事件关闭 2] [手动删除 6]                    │  ← 不新增「分组」段
├──────────────────────────────────────────────────────────────────┤
│ ☐ │ 文档名                          │ 原 Group │ 删除原因 │ 剩余 │ 操作 │
│ ☐ │ Redis 主从切换                   │ 部署运维 │ 手动删除 │ 剩 7 天 │ 恢复 · 沉淀为 wiki │
│ ☐ │ ▸ 部署运维  〔分组 · 含 8 篇〕    │ 部署运维 │ 手动删除 │ 剩 7 天 │ 恢复整组 · 彻底删除 │
│ ☐ │   分组 · 含 6 篇（部分已恢复）    │          │          │        │                     │
└──────────────────────────────────────────────────────────────────┘
```

变更点：

| 变更点 | 现状 | 预期 |
|---|---|---|
| 名称列 | 纯文档名 | 组行加 `▸` 前缀 + 徽标「分组 · 含 N 篇」（`N = groupSnapshot.docCount`） |
| 操作列 | 恢复 / 沉淀为 wiki | 组行改为「恢复整组」/「彻底删除」；不出现「沉淀为 wiki」（组内每篇分类各自不同） |
| broken 判据 | `sizeBytes === 0` 即禁用恢复 | 追加 `kind !== 'group'`：组条目即使 0 字节也可恢复（空组快照） |
| 批量恢复 | 收 `sizeBytes > 0` 的所有选中项 | 只收 `kind === 'doc'`；选中含组条目时提示「分组条目请单独恢复」 |
| 批量彻底删除 | 全部选中项 | 不变（组条目可批量彻底删） |

### 2. 为什么**不加**「分组」筛选段（决策点）

现有筛选段是**单一维度**（按 `reason` 过滤）。组条目的 `reason` 同样是 `manual`，若再加「分组 N」段，同一批条目会同时落入两个段：

```text
全部 12 = 临时到期 3 + 事件关闭 2 + 手动删除 6   ← 手动删除已含 1 个组条目
         再加「分组 1」→ 3+2+6+1 = 12？其实 6 里已经算过那 1 个 → 用户看到"数字对不上"
```

要把类型与原因做成**两组独立维度**（左侧「全部/文档/分组」+ 右侧「全部/临时到期/事件关闭/手动删除」），属于工具栏布局改版，不在本次范围。本次先用行内徽标满足识别需求。

### 3. 清库 / 删库提示

`src/scope.ts` 的 `executeScopeClear` / `executeScopeDelete` 在执行前（含 `--yes` 预览分支）输出一行：

```text
⚠ 该库回收站现有 4 条（含 1 个分组，约 12.3 MB），清库 / 删库会一并清除且无法恢复。
  如需保留，请先在 Web 回收站恢复或导出。
```

条数与体积由 `listTrash(scope)` 汇总得出；读不到回收站时降级为「回收站条数未知」而不是报错阻断。

`web/src/pages/ResourcesPage.tsx:126-129` 的说明文案补同一句口径，避免用户只在 CLI 才看到。

### 4. 删除文档侧（与 S01 同图，此处给确认用）

```text
现状                                    预期
┌ 删除文档 ───────────────── ✕ ┐      ┌ 删除文档 ───────────────── ✕ ┐
│ 删除后无法恢复，请确认          │      │ 删除后可在回收站恢复            │
├──────────────────────────────┤      ├──────────────────────────────┤
│ 文档 部署运维/Redis 主从切换    │      │ 文档 部署运维/Redis 主从切换    │
│ · 正文、元数据、向量与全文索引一并删除 │  │ · 正文与元数据移入回收站，可恢复 │
│ · 正文里的链接、AI 引用会失效     │      │ · 索引在恢复时重建（数秒）       │
│ ☑ 同时删除 wiki 源文件 …/redis.md│     │ · 正文里的链接、AI 引用会失效     │
│                  [取消] [删除]  │      │ ☑ 同时删除 wiki 源文件 …/redis.md│
└──────────────────────────────┘      │   ⚠ 源文件为物理删除，回收站不保留 │
                                       │                  [取消] [删除]  │
                                       └──────────────────────────────┘
```

## 组件与数据契约

`TrashPage` 消费的条目视图（扩展 `web/src/api/governanceApi.ts:397` 的 `TrashItemView`）：

```ts
export interface TrashItemView {
  kind: 'doc' | 'group';     // ★新增
  scope: string;
  group: string;
  name: string;
  reason: 'temp-expired' | 'event-closed' | 'event-expired' | 'manual';
  deletedAt: number;
  expiresAt: number;
  ttlDays: number;
  ttlAssumed: boolean;
  restoreCount: number;
  sizeBytes: number;
  hasAssets: boolean;
  dirName: string;
  docCount?: number;         // ★新增：kind='group' 时剩余篇数（收缩后变小）
  groupCount?: number;       // ★新增：被删组连同子组的节点数
}
```

| 组件 / 函数 | 输入 | 输出 / 行为 |
|---|---|---|
| `rowLabel(item)` | `TrashItemView` | doc → 文档名；group → `▸ <name>` + 徽标「分组 · 含 N 篇」（N 取 `docCount`） |
| `canRestore(item)` | `TrashItemView` | `kind === 'group' ? !isView : item.sizeBytes > 0` |
| `restoreTrash(scope, { group, dirName })` | 签名不变 | 返回 `RestoreResult \| RestoreGroupResult`，按 `kind` 判别分支 |
| 批量恢复 | 选中集合 | 仅取 `kind === 'doc'`；选中含 group 时提示「分组条目请单独恢复」 |
| 批量彻底删除 | 选中集合 | 不限 `kind`，沿用 `purgeTrash` 逐条 |
| 清库提示 | `listTrash(scope)` 汇总 | 输出条数与体积；读取失败降级为「条数未知」 |
| 到期清理提示（设置弹窗 / sweep） | `PurgeOutcome`（已带 `kind` / `docCount`） | 文案区分类型：「将清理 5 条（其中 1 个分组，含 8 篇）」；只显示组名会让人以为清的是空分组 |

```json
// 组行恢复回执（页面提示用）
{
  "ok": true,
  "kind": "group",
  "restored": { "group": "部署运维", "groups": ["部署运维", "部署运维/网络"], "docs": 7 },
  "failed": [{ "group": "部署运维", "name": "旧 FAQ", "code": "RESTORE_NAME_CONFLICT" }],
  "hint": "1 篇未恢复（同名冲突），已保留在回收站"
}
```

## 关键决策点

| 决策 | 采纳 | 被否决方案 | 否决理由 |
|---|---|---|---|
| 组条目如何被识别 | 行内徽标 `▸` + 「分组 · 含 N 篇」 | 新增「分组」筛选段 | 与现有 reason 段维度重叠，计数会重复（见上推算），用户会认为数字错乱 |
| 组行是否提供「沉淀为 wiki」 | 不提供 | 提供（整组转 wiki） | 组内每篇分类各自不同，整组改分类会覆盖用户原有的 temp / event 决策 |
| 批量恢复是否含组条目 | 不含，提示单独恢复 | 含（逐组发请求） | 组的返回是 `restored/failed` 明细，与文档的单条回执难以合并成一句提示 |
| 清库提示是否阻断 | 不阻断，只提示 | 强制二次确认 / 先导出 | 清库本就是危险操作（已要求 `--yes`），再加阻断会让运维批量操作变低效 |

## 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 组条目 `docCount = 0`（空组 / 已收缩完） | 仍可恢复（重建空节点），徽标显示「分组 · 空」 | 是 |
| 组条目部分恢复后再点恢复 | 只处理剩余 `docs/*`；全部成功才删条目 | 是（回执给剩余篇数） |
| 组恢复 409（同名冲突） | 页面提示「目标组已有内容，请先改名或清理」，条目不消失 | 是 |
| 清库时回收站读失败 | 提示「回收站条数未知」，继续清库 | 是（提示降级） |
| 视图 scope 下的回收站列表 | 沿用现有视图分支（逐库合并，写操作 409） | 是 |

## 影响范围

| 文件 | 改动 |
|---|---|
| `web/src/pages/TrashPage.tsx` | 名称列徽标；操作列按 kind 分支；broken 判据；批量恢复过滤 |
| `web/src/api/governanceApi.ts` | `TrashItemView` 加 `kind` / `docCount` / `groupCount` |
| `web/src/styles/governance.css` | 组行徽标样式（复用 `gov-badge`） |
| `web/src/pages/ResourcesPage.tsx` | 清库文案补回收站连带口径 |
| `src/scope.ts` | 清库 / 删库前输出回收站条数与体积 |
| `web/src/components/DocDeleteDialog.tsx` | 见 S01 |

## 待确认问题

| # | 问题 | 状态 |
|---|---|---|
| 1 | 上述两张 ASCII 图需按「界面确认闸门」逐项确认（区块 / 排列 / 入口 / 显隐） | **待确认** |
| 2 | 是否需要「只看分组」的独立筛选（需把工具栏改成两组维度） | 待定：默认不做，用户反馈后再加 |
| 3 | 组行是否需要展开看组内文档清单 | 待定：默认不做（恢复粒度是整组） |
