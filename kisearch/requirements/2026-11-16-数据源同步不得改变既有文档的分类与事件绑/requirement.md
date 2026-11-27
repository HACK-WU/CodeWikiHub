---
req: REQ-20261116-006
title: 数据源同步不得改变既有文档的分类与事件绑定
status: 已确认
created: 2026-11-16
updated: 2026-11-17
tags: [fix, datasource, lifecycle, event]
---

# 数据源同步不得改变既有文档的分类与事件绑定

## 1. 背景

用户提出的原始要求：

> 同步不能改变已经存在的文档的分类，事件类型等等。只需要修改 KB 数据，或者文档内容即可。

当前实现与该要求相反：**数据源同步覆盖一篇已存在的文档时，会强制清空它的分类与事件绑定**。这导致一个已被用户设成「临时 30 天」或挂到某个事件上跟踪的文档，只要源侧文件被改一次（哪怕只改一个字），就会静默退回「长期保留 wiki」并脱离事件。

2026-11-17 完成 PM 评审，三处连带缺口（事件终态 / `temp` 语义 / 自定义 tag）已拍板纳入，见 §7。

## 2. 现状（AS-IS，代码直读）

### 2.1 覆盖时强制清空分类

`src/lib/import.ts:2568-2581`（`upsertRelation`，数据源同步与 `ki import --source` 共用）：

```js
} else if (datasource) {
  rel.isImported = true;
  /**
   * REQ-20261113-004（R4）：数据源文档强制 wiki。
   * 不清会让一次「导入覆盖」把手动建的生命周期带进数据源文档，
   * 形成 `isImported=true` + `lifecycle=temp` 的矛盾态，随后被回收站扫描当临时文档删掉。
   * 这是「数据源豁免」的最后一道防线：UI 与 MCP 层都拦不住导入链路。
   */
  delete rel.lifecycle;
  delete rel.expiresAt;
  delete rel.eventId;   // ← 事件绑定一并丢失
  delete rel.ttlDays;
}
```

### 2.2 新增文档确实默认 wiki（这部分符合预期）

`src/lib/import.ts:2557-2566` 新建 Relation 时不写 `lifecycle` 字段；读取统一经 `resolveLifecycle()`（`src/lib/lifecycle.ts`）兜底为 `wiki`，`src/lib/scoring.ts:57` 明确禁止各处自行 `rel.lifecycle ?? 'wiki'`。

### 2.3 数据源同步本就不参与分类校验

`src/lib/import.ts:1089-1090`：

```js
const lifecycleRequested = args.isDatasourceDocument === false
  && (args.lifecycle !== undefined || args.ttlDays !== undefined || args.eventId !== undefined);
```

数据源同步不传 `isDatasourceDocument`（缺省 `true`），因此既不做分类预检、也不应用分类计划 —— 分类的唯一写入点就是 2.1 的四处 `delete`。只有 `/open/v1` 上传通道显式传 `isDatasourceDocument: false`（`src/lib/open-api/routes/import.ts:247`），走的是另一条可带分类的路径。

### 2.4 分类修改入口本身已锁死（不需改动）

`src/lib/relation-lifecycle.ts:88-95`：`isImported === true` 且显式指定分类 → `DATASOURCE_LIFECYCLE_LOCKED` 拒绝。页面、`lifecycle/apply`、MCP 都走这里。

> 副作用（本次保留分类后变得可见）：一旦文档被保留为 `event` 或 `temp`，它同时被这把锁冻结，用户**无法再自行改回** wiki / 换分类，只能通过事件解绑（`unbindMember` 不过这把锁）退出。验收与文案需承认这是预期单向门。

### 2.5 R4 顾虑的现状校对

R4 的立论是「矛盾态会被回收站扫描当临时文档删掉」。实际情况：

- 扫描函数 `findExpiredTemp`（`src/lib/lifecycle.ts:213-218`）**不豁免 `isImported`**，确实会把 `isImported=true` + `lifecycle=temp` 的文档判为过期；
- 但该函数**当前没有任何生产调用点**（全仓 grep 仅命中定义处与单测）—— 即"过期自动进回收站"目前尚未接线。

结论：R4 的风险是**未来接线时**才会发生，不是当前正在发生的删除；它可以通过在扫描侧加一行豁免来解决，不必用"覆盖时清空分类"这种破坏性手段。

### 2.6 覆盖时同时清空自定义 tag（同类抹除）

`src/lib/import.ts:2206-2207`（向量化后的 tag 落盘）与 `2597-2598`（`upsertRelation`）：

```js
// 2207
rel.tags = customTags.length > 0 ? customTags : undefined;
// 2597-2598
if (tags && tags.length > 0) rel.tags = tags;
else rel.tags = undefined; // 清空已删除的 tag（无 tag 时不留字段）
```

`upsertRelation` 的唯一调用点（`import.ts:2774`）传的是 `undefined`，因此**任何一次同步都会把 `rel.tags` 清空**，除非本次显式带 `--tags`。本机 `kisearch-memory` 58 篇中 45 篇带 tag（且 0 篇是数据源文档），说明 tag 是真实在用的元数据。

### 2.7 事件终态与删除事件不区分 `isImported`

`src/lib/events/event-service.ts:535-543`（`applyTerminalAction`）与 `607-613`（`deleteEvent` 的 `docAction==='trash'`）：只要 `rel.eventId === event.id` 就 `moveToTrash`，**没有 `isImported` 分支**。

回收站安全（已核对）：`moveToTrash` 只快照 local KB 正文（`trash-service.ts:62-91`），`purgeExpired` 只删回收站条目（`trash-service.ts:322-348`），**不会删源文件**。真正的问题是：数据源文档被搬走后源文件仍在，下次同步会重新导入，形成"回收站有条目 + 检索又能命中"并存。

### 2.8 唯一能产生 `isImported + eventId` 的路径

`src/lib/events/members.ts:241-255`：绑事件前用 `locked: rel.isImported === true` 过 `precheckLifecycle`（`lifecycle: 'event'`），直接返回 `DATASOURCE_LIFECYCLE_LOCKED`。即**数据源文档无法在正常路径绑进事件**。

因此 `isImported + eventId` 只能通过"路径碰撞"产生：

1. 普通文档 `G/x` 建好并绑到事件 #N（此步 `isImported=false`，允许）；
2. 数据源目录里出现同名 `x.md`（或本来就有）；
3. 同步命中该路径 → `isImported=true`，`eventId` 被 2.1 清掉（修复后保留）。

R2 的验收必须按这三步搭场景，否则第一步就会被锁定拒绝。

### 2.9 阶段 `hidden` 的索引摘除已在导入链路生效

`src/lib/import.ts:2239-2266`：导入写完元数据后，对 `rel.lifecycle === 'event'` 且当前阶段为 `hidden` 的文档调 `applyVisibility({ to: 'hidden', from: 'full' })` 摘除 dense/FTS/关系/path 索引（`from` 必须显式 `'full'`）。判据是**落盘后的实际分类**，不是"本次入参有没有传 event"。

结论：保留 `eventId` 不会让 `hidden` 阶段成员被下次同步悄悄拉回检索；该行为已有实现，本需求只需补回归测试（原文档 Q2 由此从"决策"降级为"验收项"）。

## 3. 需求（TO-BE）

| ID | 需求 | 优先级 | 验收标准 |
|---|---|---|---|
| **R1** | 数据源同步覆盖**已存在**文档时，保留其 `lifecycle` / `expiresAt` / `ttlDays` / `eventId` 四个字段，不得删除 | P0 | 文档设 `temp`（30 天）后改源文件再同步 → 仍为 `temp` 且 `expiresAt` 不变 |
| **R2** | 数据源同步覆盖已存在文档时，保留其事件归属（`eventId`） | P0 | **按 §2.8 三步搭场景**：普通文档绑事件 #N → 数据源出现同名文件 → 同步 → 该事件成员列表仍含此文档，且分类未被改写 |
| **R2b** | 同步必须尊重事件阶段档位（回归保护，实现已存在见 §2.9） | P0 | 承接 R2 场景，把事件推到 `hidden` 后再跑一次同步 → `ki_search` 对该文档 0 命中；切回 `full` → 重新可检索 |
| **R3** | 数据源同步**新增**文档时，默认分类为 `wiki`（保持现状） | P0 | 新增文件同步后 `resolveLifecycle()` 返回 `wiki` |
| **R4** | 数据源同步照常更新内容与索引：KB 正文、`memoryIds`/`memoryId`、`sourcePath`、dense 向量、FTS | P0 | 改源文件正文 → 同步后 `ki_get_module_info` 与新内容一致，检索命中新内容 |
| **R5** | `isImported` 身份照常刷新为 `true`（身份维度不变，只改分类维度） | P0 | 同步后 `isImported === true` |
| **R6** | 页面 / `lifecycle/apply` / MCP 对 `isImported` 文档的显式改分类继续拒绝（`DATASOURCE_LIFECYCLE_LOCKED`） | P0 | 对数据源文档调 `lifecycle/apply` 改 temp → 仍 400 |
| **R7** | 过期临时文档扫描（`findExpiredTemp`，当前未接线）必须豁免 `isImported === true`，防止"数据源文档被当临时文档清走"的未来事故 | P1 | 单测：`isImported=true` + 过期 `expiresAt` → 不被 `findExpiredTemp` 返回 |
| **R8** | 事件终态（收口时 `terminalAction==='trash'`）与删除事件（`docAction==='trash'`）对 `isImported` 成员**不搬回收站，改为 wiki** | P0 | 造 `isImported + eventId` 成员 → 事件收口 → 回收站 0 条、文档仍在且 `lifecycle` 已清空 |
| **R9** | 同步**未显式指定** tags 时不清空既有 `rel.tags`；显式传 `--tags`（含空串）时才覆盖 | P1 | 带 tag 的文档改源文件后裸同步 → `rel.tags` 不变；`--tags ""` → 清空 |

> **R7 + R1 的口径（2026-11-17 拍板）**：保留 `temp` 字段只为不丢用户设置，**对数据源文档不生效**（扫描豁免）。页面需明示"该文档由数据源同步，临时期限不生效"，避免用户以为到期会自动清理。

## 4. 负向需求

| # | 场景 | 期望 |
|---|---|---|
| N1 | 同步不得把数据源文档降级为普通文档（`isImported` 只会 `false → true`，不会反向） | 一次同步后身份仍为数据源文档 |
| N2 | 同步不得把**源侧已删除**的文档"复活" | 只在源侧存在的文件被处理 |
| N3 | 同步不得改动文档的 `group` 与名称（`text`） | 路径与名称不变 |
| N4 | 保留分类后，不得出现 `lifecycle` 有值但配套字段缺失的矛盾态 | 保留时四个字段成组保留（`temp` 必带 `expiresAt`、`event` 必带 `eventId`），否则降级 `wiki` 并在同步报告里给出 warning |
| N5 | 保留 `eventId` 后，若该事件已收口（成员本应已解绑） | 按悬空 `eventId` 处理：`resolveVisibility` 已按 wiki 兜底，同步只如实保留，不做额外改写 |
| N6 | 事件终态把数据源文档搬进回收站（R8 修复前的行为） | 不得出现"回收站有条目 + 检索仍命中"并存：源文件仍在 ⇒ 下次同步重新导入 |
| N7 | 保留分类后用户想改回 wiki / temp | 明确提示"数据源文档分类锁定，请走事件解绑"；不得静默失败或误以为设置已生效 |
| N8 | 同步未带 tags | 不得清空 `rel.tags`（见 R9）；只有显式传 `--tags`（含空串）才覆盖 |

> N4 的 warning 落点说明：`ImportLifecycleSummary`（`import.ts:241-249`）只在 `isDatasourceDocument === false`（上传通道）产出，**数据源同步目前没有分类汇总通道**。实施时用 `logWarn`（CLI 看得见）或 task snapshot 承载，二者取其一并在实施说明里写明。

## 5. 影响面（必填）

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需拍板 |
|---|---|---|---|---|---|
| 数据源同步（`ki import --source` / daemon 定时同步） | 数据 | **改善** | `import.ts:2568-2581` | 改 R1/R2 | 否 |
| 事件成员列表 / 事件阶段档位 | 数据/展示 | 改善（成员不再静默消失；档位已正确） | `members.ts:241-255`、`import.ts:2239-2266` | 补 R2/R2b 验收 | 否 |
| 事件终态（收口 trash / 删除事件 trash） | 数据 | **破坏**（与同步复活冲突） | `event-service.ts:535-543`、`607-613` | 改 R8 | ✅ 已拍板 2026-11-17 |
| 文档分类可改性 | 权限 | **降级**（保留后不可再自行改） | `relation-lifecycle.ts:88-95` | 文案提示（N7） | ✅ 已拍板 |
| 临时文档过期回收 | 数据 | **风险↑** | `lifecycle.ts:213-218` 无 `isImported` 豁免 | 加 R7 豁免，页面明示不生效 | ✅ 已拍板 |
| 自定义 tag | 数据 | **降级**（用户 tag 被清） | `import.ts:2206-2207`、`2597-2598` | 改 R9 | ✅ 已拍板 |
| 同步的分类汇总 / warning 通道 | 展示 | 缺口 | `import.ts:241-249` 仅上传通道产出 | N4 warning 落点（CLI 或 snapshot） | 否 |
| Web 上传（`isDatasourceDocument: false`） | 数据 | 无感 | `open-api/routes/import.ts:247` | 不改 | 否 |
| 分类锁定（`DATASOURCE_LIFECYCLE_LOCKED`） | 权限/数据 | 无感 | `relation-lifecycle.ts:88-95` | 不改 | 否 |
| 已有矛盾态数据（`isImported=true` + 非 wiki 分类） | 数据 | 无对象 | 本机 45 个 scope 缓存 / 1385 篇 / 0 条矛盾态 | 不补偿（§7 Q3） | 否 |

## 6. 方案选项

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A（已拍板）** | 覆盖时四个字段原样保留 + `findExpiredTemp` 豁免 `isImported`（R7） | 完全满足用户诉求；用"扫描侧豁免"闭合 R4 的矛盾态，语义清晰：身份与分类是两个维度 | 需同时改扫描函数（当前无调用点，改动无行为回归风险） |
| B | 只保留 `eventId`（事件绑定），其余分类字段照旧清空 | 改动最小 | `temp` 仍会被抹掉，与用户"不得改变分类"不符 |
| C | 保留分类但把 `isImported` 改为 `false`（身份降级） | 无矛盾态 | 破坏"数据源文档"身份：下次同步又变回来，来回跳；且会让文档获得改分类权限 |

> R8 / R9 是对方案 A 的连带补齐，不影响方案选择。

## 7. 决策记录

| # | 决策 | 结论 | 时间 |
|---|---|---|---|
| Q1 | 采用哪个方案 | **A** | 2026-11-17 用户拍板 |
| Q3 | 历史上已被清空分类的文档是否补偿 | **不补偿**：本机 45 个 scope 缓存 / 1385 篇文档中 `lifecycle` 与 `eventId` 全为 0，无补偿对象 | 2026-11-17 |
| Q5 | 事件终态 `trash` 遇到数据源成员怎么办 | **改并行 wiki**（不搬回收站）：源文件不可删，搬了必复活；删除事件同理 | 2026-11-17 用户拍板 |
| Q6 | `temp` 对数据源文档是否有意义 | **保留字段但不生效**：扫描豁免（R7）+ 页面明示"临时期限不生效"。不做"脱离数据源"出口（成本高、当前无使用场景） | 2026-11-17 用户拍板 |
| Q7 | 自定义 tag 是否纳入 | **纳入（R9）**：同类"同步抹掉用户设置"，一并修完 | 2026-11-17 用户拍板 |
| Q2（原） | 数据源成员进 `hidden` 阶段要不要真摘索引 | **降级为验收项 R2b**：`import.ts:2239-2266` 已实现且按落盘后分类判定，本需求只补回归测试 | 2026-11-17 核实 |
| — | `temp` 明示文案的具体位置与措辞 | 实施细节，随实现定（分类页/事件成员行），不进拍板 | — |

## 8. 不在范围

- 数据源同步的增量策略、git 拉取、`sourcePath` 解析规则
- `/open/v1` 上传通道的分类能力（`isDatasourceDocument: false` 路径，行为不变）
- **事件绑定对数据源文档的准入**：`bindMembers` 现拒 `isImported`（`members.ts:241-255`），本需求不改准入，只保证"已被接管"的文档不丢绑定
- 回收站整体策略（本需求只在 R7 里给扫描函数加一行豁免，在 R8 里给终态加 `isImported` 分支）
- "脱离数据源管辖 / 把数据源文档转成普通文档"的能力（Q6 已明确不做）

## 9. 验收场景（可执行）

| # | 覆盖 | 步骤要点 |
|---|---|---|
| S1 | R1 | 普通文档设 `temp` 30 天 → 数据源同名文件改一个字 → 同步 → 仍 `temp`、`expiresAt` 不变 |
| S2 | R2 | 普通文档绑事件 #N → 数据源出现同名文件 → 同步 → 仍是成员、分类未被改写 |
| S3 | R2b | 接 S2，事件推到 `hidden` → 再同步 → 检索 0 命中；切回 `full` → 可检索 |
| S4 | R3 | 源侧新增文件 → 同步 → `resolveLifecycle()` 为 `wiki` |
| S5 | R4 | 改源文件正文 → 同步 → `ki_get_module_info` 为新内容、检索命中新内容 |
| S6 | R5 / N1 | 同步后 `isImported === true`；重复同步不变 |
| S7 | R6 | 对数据源文档调 `lifecycle/apply` 改 temp → 400 `DATASOURCE_LIFECYCLE_LOCKED` |
| S8 | R7 | 单测：`isImported=true` + 过期 `expiresAt` → `findExpiredTemp` 不返回 |
| S9 | R8 | `isImported + eventId` 成员 → 事件收口（`trash`）/ 删除事件（`trash`）→ 回收站 0 条、文档为 wiki |
| S10 | R9 | 带 tag 文档裸同步 → tag 不变；`--tags ""` → 清空 |
| S11 | N4 | 人为造 `temp` 缺 `expiresAt` → 同步后降级 wiki 且给出 warning |

## 10. 评审结论（2026-11-17 定稿）

需求质量六维回扫（只判不跑）：

| 维度 | 结论 |
|---|---|
| 场景完整性 | ✅ 补齐"数据源文档成为事件成员之后"（R8 / N6 / N7）与 tag（R9 / N8） |
| 验收标准可达性 | ✅ R2 补 §2.8 三步前置；R2b 补 hidden 回归；N4 明确 warning 落点二选一 |
| 需求一致性 | ✅ R1 + R7 的联合效果已显式写成"保留但不生效"，与页面明示口径一致 |
| 角色-需求对齐 | ✅ CLI/daemon 同步、治理页、MCP 三方均有条目 |
| 边界/异常覆盖 | ✅ N1–N8 覆盖身份、复活、路径、成组一致、悬空绑定、终态、锁定、tag |
| 术语一致性 | ✅ `lifecycle` / `temp` / `wiki` / `event` / 数据源文档 口径统一 |

复杂度：低（单点改动 + 无状态机变更），可 `plan-track` 建档直接实现。实施时四处 `delete`、`findExpiredTemp`、事件终态两处分支、tag 两处落盘一起改，测试覆盖 R1–R9 与 N1–N8。
