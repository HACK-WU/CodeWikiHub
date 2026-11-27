# Code Review · 数据源同步保留分类/事件/标签 + 事件终态保护（REQ-20261116-006）

## 审查上下文

| 项 | 值 |
|---|---|
| **变更** | `6 文件 +166 −31` · `src/lib/import.ts`、`src/lib/lifecycle.ts`、`src/lib/events/event-service.ts`、`web/src/pages/LifecyclePage.tsx`、`test/import-scheme-d.test.ts`、`test/lifecycle-sr01.test.ts`；新增 `test/datasource-sync-preserve.test.ts`（397 行） |
| **模式 / 需求** | `深度`（166 行）· `REQ-20261116-006 v3` · 工作区未提交改动 |
| **检查覆盖** | `16 条（✅11 / ❌2 / ⚠️1 / ➖2）` · 未覆盖维度：无 |
| **既有缺陷** | `1 项（Q3，非本次范围）` |

---

## 一 · 审查过程

### 1.1 我的理解（后续判定的前提）

- **业务目标**：数据源同步是「只更新内容与索引」的动作，不得顺带抹掉用户设的分类、事件归属与自定义 tag；由事件终态或过期扫描决定文档去留时，不得让数据源文档出现「回收站有条目 + 检索又能命中」并存。
- **系统位置**：
  ```text
  源侧文件 ──▶ runImport/phase4 upsertRelation ──▶ group 分片（lifecycle/eventId/tags）
                     ▼
              phase4.5 阶段可见性（applyVisibility）
                     ▼
  事件终态(transitionEvent/deleteEvent) ──▶ moveToTrash / 清分类
                     ▼
  检索（dense+FTS）/ 分类页 / 事件成员列表 / 回收站
  ```
- **整体成功判据**：① 覆盖后正文与索引是最新的；② 分类/事件/tag 原样保留；③ `isImported` 只向 true 单向；④ 阶段档位（含 hidden）不被同步悄悄推翻；⑤ 事件终态不再把数据源文档搬走。

| 位置 | 我以为它要做什么 | 置信度 | 状态 |
|------|-----------------|--------|------|
| `import.ts:preserveLifecycleOnOverwrite()` | 覆盖时保留分类，只在不自洽时降级 | 🟢 | ⏩ 未确认（需求 §3 R1/R2/N4 已书面锚定） |
| `lifecycle.ts:findExpiredTemp()` | 扫描侧豁免数据源文档 | 🟢 | ⏩ 未确认 |
| `event-service.ts:applyTerminalAction/deleteEvent` | 终态 trash 时数据源成员改 wiki | 🟢 | ⏩ 未确认 |

### 1.2 问题

#### `Q1` · 🟧 本次激活 · 🟡（`[需运行验证]`）

- **位置**：`src/lib/import.ts:2249-2252`
- **问题**：phase 4.5 的阶段可见性只在 `mode === 'hidden'` 时摘索引，`fts-only` 阶段直接 `continue`；而导入内核在向量模式下**已经写入了 dense**。保留 `eventId` 之后，数据源文档第一次可能「声称处于 `fts-only` 阶段，实际带 dense 向量」。
- **业务后果**：用户在事件里给阶段设了「仅全文」，同步重跑后该文档的语义检索（dense）又能命中——档位被同步悄悄升级，页面仍显示「仅全文」，无人会察觉。
- **依据**：`import.ts:2250` 只判 hidden；`visibility-index.ts:185-189` 的 `planTransition('full','fts-only')` 已能摘 dense（机器现成，只是导入链路没接）。
- **链路**：
  ```text
  {阶段 fts-only · 用户设定}
    ▼
  {数据源同步 · import.ts:1429 写入 dense+FTS}
    ▼
  {phase4.5 · import.ts:2250 mode!=='hidden' → continue}  ← 缺口
    ▼
  {文档带 dense，但 resolveVisibility 仍报 fts-only}
    ▼
  {语义检索命中 / 页面显示仅全文}（用户预期被推翻）
  ```
- **修复方向**：把该段从「只处理 hidden」改为「按 `resolveVisibilityOfRelation` 的结果处理所有非 full 档位」：`applyVisibility({ to: visibility.mode, from: 'full' })`（`fts-only` 会摘 dense）。补一条 `fts-only` 用例——注意 dense 是否存在需向量模式，`vector:false` 测不出，属 `[需运行验证]`。

#### `Q2` · 🟥 本次引入 · 🟡 · **已修复并复检**

- **位置**：`src/lib/events/event-service.ts`（`applyTerminalAction` 与 `deleteEvent` 的 `trash` 分支）
- **问题**：首版把摘除判据从「成员全集」改成「真正进回收站的名字」，属于**与 R8 无关的搭车改动**：`moveToTrash` 失败的普通成员不再被摘除，会留在已收口事件上并保留 `lifecycle=event` + 悬空 `eventId`。
- **业务后果**：终态阶段若为 `hidden`，这篇文档变成「在库里但搜不到」——比原先「库里没有」更难排查，且用户没有任何提示。
- **依据**：原写法 `filter(!(names.has && eventId===event.id))` 表达的是「收口后成员一律脱离该事件」；R8 只需要为数据源成员开例外。
- **链路**：
  ```text
  {终态 trash · moveToTrash 返回 TRASH_CONTENT_MISSING}
    ▼
  {首版：不进 trashed 集合 → 不被摘除}  ← 回归
    ▼
  {文档仍 lifecycle=event，eventId 指向已收口事件}
    ▼
  {终态阶段 hidden → resolveVisibility 返回 hidden}
    ▼
  {文档在库里但检索不到，页面分类仍是「事件」}
  ```
- **修复方向（已执行）**：回退为「成员一律脱离该事件，仅 `isImported` 成员例外」，并在两处同步同一写法与注释。
- **复检**：`npm run build` exit 0；`test/datasource-sync-preserve.test.ts` 13/13、`test/events-sr02.test.ts` 19/19、`test/event-members.test.ts` 9/9。

#### `Q4` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/import.ts`（`preserveLifecycleOnOverwrite` 的 `logWarn`）
- **问题**：分类不自洽降级 wiki 的告警只写 stderr。CLI 手动导入看得见，**daemon 定时同步或 Web 导入不可见**。
- **业务后果**：用户设的 `temp` 因缺 `expiresAt` 被降级成 wiki，事后无法解释「为什么我的临时文档又变长期了」。
- **依据**：需求 §4 N4 只要求「给出 warning」，方案表里二选一（logWarn / task snapshot），本次选了 logWarn。
- **链路**：
  ```text
  {历史脏数据 temp 缺 expiresAt}
    ▼
  {同步覆盖 → 降级 wiki + logWarn(stderr)}
    ▼
  {daemon 定时任务：stderr 进日志文件}  ← 用户不可见
    ▼
  {用户看到分类变了，却找不到原因}
  ```
- **修复方向**：把降级计数并入导入结果（`ImportResult` 已有 `stats`），或落 task snapshot 后由分类页提示。

### 1.3 既有缺陷（非本次范围）

#### `Q3` · ⬜ 既有 · 🟡

- **位置**：`src/lib/events/event-service.ts`（`trash` 分支的原摘除逻辑）
- **问题**：`moveToTrash` 失败（如读不到正文）的成员，仍会被从分片摘除，文档从库中消失而回收站里没有快照。
- **引入版本**：本次改动前即存在（事件终态初次实现，早于本次 diff；与本次无因果关系）。
- **建议**：另开任务，按「失败即保留并暴露 `failed`」的方向修；本次不动（Q2 已确认不扩大战线）。

### 1.4 待验证项

- `T1` · 0.9 数据流 · Q1 中 dense 是否真的残留 · 原因：验证需要向量模式（embedding），当前环境以 `vector:false` 跑测试，静态可证但未动态复现。

---

## 二 · 结论

### 2.1 合入结论

**✅ 可合入**（Q2 已在本轮修好并复跑；Q1 属 `🟡`，建议按 §2.3 D1 拍板后跟进）

阻塞项：无 ｜ 既有缺陷：1 项（Q3，不阻塞）｜ 理由：五条整体成功判据逐条成立，唯一新增风险是 `fts-only` 档位未覆盖。

### 2.2 质量评分

| 维度 | 评分 | 状态 | 依据 |
|------|------|------|------|
| 语义一致性 | 8/10 | ⚠️ | Q1：`hidden` 处理了、`fts-only` 漏了，与「尊重阶段档位」不完全一致 |
| 安全性 | 10/10 | ✅ | 未触及认证/权限/注入面 |
| Bug 风险 | 8/10 | ⚠️ | Q2 已修；Q1 残留但影响限于检索档位 |
| 代码规范 | 9/10 | ✅ | 判据与原因写在注释里，降级路径统一收口在 helper |
| 架构设计 | 9/10 | ✅ | 「身份」与「分类」两个维度解耦，扫描侧豁免承接旧 R4 的风险 |
| 性能 | 9/10 | ✅ | 仅多一次 `resolveVisibility` 读事件表（`lifecycle!=='event'` 时不读） |
| 测试覆盖 | 8/10 | ⚠️ | 13 例覆盖 S1–S11 主体；`fts-only` 与 stderr 告警无断言 |

整体：**A**（8.71）

### 2.3 需要你拍板

#### `D1` · Q1（`fts-only` 档位）本次一并修，还是另开任务

- **背景**：机器现成（`planTransition` 支持摘 dense），改动约 10 行 + 1 个用例；但用例要在有 embedding 的环境才能验「dense 真的不在」。
- **为什么要你定**：这是需求 R2b 之外的档位扩展（R2b 只点了 `hidden`），属范围决定。
- **选项**：① 本次一并修（推荐）② 另开任务（R2b 保持只覆盖 hidden，在需求文档里注明已知缺口）

#### `D2` · Q4（降级告警可见性）是否升级到 task snapshot

- **为什么要你定**：会动前端契约（`ImportResult`/任务详情多一个字段），成本高于一条 `logWarn`。
- **选项**：① 保持 `logWarn`（当前）② 落 snapshot 并在分类页提示

### 2.4 亮点

- 保留分类与「身份只升不降」是同一条 `if/else` 分支的两半，没有把分类逻辑散到调用方。
- 新测试给 `hidden` 用例加了「绑定前可检索」的基线对照——否则 0 命中说明不了任何事。
- `test/lifecycle-sr01` 的源码防线断言被反转而不是删除：新断言要求「`delete rel.lifecycle` 全仓只允许一处且在降级 helper 内」，后续有人再静默清分类会立刻红。
