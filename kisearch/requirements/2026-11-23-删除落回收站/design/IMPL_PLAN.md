# 实施计划：删除落回收站（REQ-20261123-005）

设计基线：`design/DESIGN.md` + `S01~S05`（已过 design-review 第 3 轮 + challenger 修复）｜ 骨架冻结 commit：—（不走骨架）
执行方式：**单窗口串行**（判定依据见 §4）

---

## 1. 前置层（不进批次，先于全部工作项）

> 串行路径的前置层 = 设计文档中声明"定稿后只读"的共享面。无骨架代码产出，由实现者**先按设计直接做**，做完冻结。

| # | 前置项 | 内容摘要 | 完成判据 |
|---|--------|---------|---------|
| 1 | **契约与类型定稿** | `governance-contract.ts`：`TrashKindDto` / `TrashItemDto`(+kind/docCount/groupCount) / `RestoreGroupResult`；`trash-store.ts`：`TrashKind` / `GroupSnapshot` / `GroupSnapshotDoc`(含 `source`) / `TrashItem.kind`；`web/src/api/governanceApi.ts`：`TrashItemView` | 三处类型一次性改完并 `tsc --noEmit` 通过；声明**之后只增不改** |
| 2 | **数据布局定稿** | `.trash/{group}/{__group__<stamp>}/{meta.json, assets.json, assets/<序号>/, docs/NNNN/{doc.json, content.md}}`；`assets.json` 形状 `[{group, dir}]` | 目录契约写进 `trash-store.ts` 头注释，S03/S04 按此实现，不再商量 |
| 3 | **错误码定稿** | 新增 `TRASH_WRITE_FAILED`（组入站失败）、`TRASH_CORRUPTED`（条目损坏，HTTP 422）；复用 `GROUP_NOT_EMPTY` / `RESTORE_NAME_CONFLICT` / `TRASH_NOT_FOUND` | 码表随前置项 1 一起落，前端 `describeDeleteError` 类映射同步 |
| 4 | **横切约定** | ① 条目坐标恒为 `(group, dirName)`，不新增 ID；② `kind` 缺省补 `'doc'` 且**不写回**；③ `sizeBytes` = 写入时累加（不递归统计）；④ 所有回收站写端点必须持 `withScopeWriteLock`；⑤ 组条目 `dirName` 强制 `__group__` 前缀；⑥ 组路径含 `.trash` 段在 `planGroupDelete` 阶段拒绝 | 写进 `trash-store.ts` 头注释"三条硬约束"同段，作为实现期唯一口径 |
| 5 | **权限模型** | 资源 × 操作：回收站（read=查看 / write=恢复·彻底删除·保存设置）；组恢复与文档恢复同权限；视图 scope 下写一律 409；越权错误语义沿用 `SCOPE_READONLY` / 403 | 在 `route-permissions.ts` 回收站段核对一遍，不改动现有粒度；补 1 条越权负向用例（只读账号点恢复 → 403） |

**前置层完成即冻结**：之后任何批次不得修改前置项 1/2/3/4/5 —— 要改必须回退到本层重做该批。

---

## 1.5 前端视觉基线（壳）

**无（无 demo）**。本次是改现有页面（`DocDeleteDialog` 文案、`TrashPage` 组行），沿现有 `.gov-*` / `.ki-dialog` 组件与 `governance.css` 风格小改，不新建页面、不铺壳。

- 无壳轨 → 不占用批次，无「与块头不同批」约束；
- 界面验收按设计文档 S01/S05 的变更点表逐条核（不走"样式契约清单 + 三档截图"那套壳验收）。

---

## 2. 批次表

> 串行路径：`并行` 列统一 `—`；`串行原因` 写依赖或"本可并行但本次单窗口"。

| 批 | 工作项（子需求） | 层级 | 承接验收项 | 并行 | 串行原因 | 基线 commit |
|---|---|---|---|---|---|---|
| **前置层** | F1~F5（契约/布局/错误码/横切/权限） | 前置 | — | — | 先于全部 | 起始主干 |
| **第 1 批** | **S01** 文档删除产品面 | 业务 | ①弹窗不再出现"无法恢复"；②回执含 `trash`；③MCP 描述含"回收站"；④源文件警示可见 | — | 本可 ∥ S02（无文件交集），本次单窗口串行 | F1~F5 提交后 |
| **第 2 批** | **S02** 回收站类型扩展与组快照存储 | 根 | ①组条目能被 `listTrash` 读出且 `kind='group'`；②附件只占 1 倍；③存量条目仍按 doc 展示 | — | → 实现级依赖 前置层 F1/F2 | 第 1 批合入后 |
| **第 3 批** | **S03** 组删除入站 | 业务 | ①删组后回收站出现组条目；②窗口 1 后失败不回滚快照；③`kb-only` 篇进快照且 warnings 提示 | — | → 实现级依赖 S02（`writeGroupTrashItem`） | 第 2 批合入后 |
| **第 4 批** | **S04** 组条目恢复 | 业务 | ①恢复后树节点+N 篇+附件齐全；②部分失败可重试且条目收缩；③`kb-only` 篇按最小元数据恢复；④event 不存在时降级 wiki | — | → 实现级依赖 S02（读取函数）+ S03（先有组条目才能验恢复） | 第 3 批合入后 |
| **第 5 批** | **S05** 回收站页与清库提示 | 业务 | ①组行徽标与操作列正确；②批量恢复不含组条目；③清库输出回收站条数与体积 | — | → 依赖 S02（类型）+ S04（恢复接口）；与 S01 共享 `ResourcesPage.tsx` 故不能同批 | 第 4 批合入后 |

**本可并行但本次串行的相邻项**（信息不缺失，只是选择了串行）：

| 本可并行项 | 为何技术上可并行 | 本次串行的原因 |
|---|---|---|
| S01 ∥ S02 | 文件零交集（S01 全是 `doc-delete.ts` + 前端弹窗；S02 是 `trash-store.ts` + 契约） | 单窗口执行，S01 是 P0 先出价值 |
| S05 的「清库提示」∥ S03 | 前者只动 `scope.ts` + ResourcesPage 文案，后者动 `group-delete.ts` | 同属第 5 批尾巴，拆批收益低于协调成本 |

**批次数告警**：5 批（≥3）。已核查：批次全部由**真实依赖**推导（S02 是 S03/S04 的实现级前置），非骨架缺口所致；无共享面遗漏。

**新增数据贯通核对**（前置层产出的新字段，逐跳确认不掉链）：

| 新字段 | 生产 | 存储 | 下发 | 消费 |
|---|---|---|---|---|
| `TrashItem.kind` | S03（组入站）/ 既有 `writeTrashItem`（doc） | `meta.json` | `governance-http` list | S05 行渲染、批量过滤 |
| `GroupSnapshotDoc.source` | S03 | `docs/NNNN/doc.json` | 不下发（内部） | S04 恢复分支 |
| `TrashItemDto.docCount` | S02（写 meta 时回填） | `meta.json` | list | S05 徽标「含 N 篇」 |
| `PurgeOutcome.kind/docCount` | S02 §6 | 不落盘 | `/trash/sweep` | S05 到期提示文案 |
| `DocDeleteResult.trash` | 既有 `executeDeleteRelation`（被 `doc-delete.ts` 丢弃） | 不落盘 | `/api/doc/delete` | S01 回执 + 前端提示 |

---

## 3. 每批检查点（批次边界）

每批收尾必过三条，任一不过不得进下一批：

1. **上批契约测试全绿**：本批相关单测 + 上批新增测试全绿
2. **契约是否需修订**：只有此处可改前置层契约；改了必须回退重做受影响批次（并更新 `design/DESIGN.md` §4 接口速查表）
3. **主干可编译可运行**：`tsc --noEmit`（两端）+ `npm run build`（web）通过

### 各批验证方式

| 批 | 单测 | 真机 / 手工 |
|---|---|---|
| 前置层 | 契约类型编译通过 | — |
| S01 | `doc-delete` 回执含 `trash`；`KI_TRASH_DISABLED=1` 时不含 | Web 删一篇 → 弹窗文案、回执、跳转链接；回收站里能看到它 |
| S02 | `listTrash` 读出组条目；`readGroupSnapshotAssets` 降级；存量条目 `kind` 补全 | 手工造一个组条目目录 → 回收站页能列出来 |
| S03 | 组入站成功/失败回滚；**窗口 1 成功后失败保留快照**；`kb-only` 入快照；附件只存一份（总大小断言 ≤ 1.2 倍源） | CLI `ki group delete <非空组> --yes` → 回收站出现组条目；构造"分片删键留 KB"验证不漏篇 |
| S04 | 恢复组（全成功 / 部分冲突 / kb-only / event 已删）；收缩后 docCount 递减；并发恢复第二次 404 | Web 恢复整组 → 浏览页树里组与 N 篇都在、附件能打开 |
| S05 | 组行渲染分支；批量恢复过滤 | 1440 宽走查回收站页；CLI `ki scope clear --dry-run` 看清库提示 |

---

## 4. 执行方式

### 判定：单窗口串行

| 判定项 | 实际情况 | 结论 |
|---|---|---|
| 可并行砖头数 | 5（S01~S05） | 够 |
| 跨砖头接口数 | 约 6 个（`writeGroupTrashItem` / `readGroupSnapshotDocs` / `readGroupSnapshotAssets` / `TrashItemDto` / `RestoreGroupResult` / `DocDeleteResult.trash`） | 未超 5×3 |
| **改造现有逻辑的砖头占比** | **4/5**（S01 改文案与回执、S03 改 `executeLocal`、S04 改 `restoreFromTrash`、S05 改 `TrashPage`），仅 S02 以新增为主 | **> 1/2 → 倾向串行** |
| **共享面处数** | **5 处**（契约 DTO / trash-store 类型 / governanceApi 类型 / `trash-service.ts` / `ResourcesPage.tsx`） | **> 3 → 倾向串行** |
| 量级可估 | 约 10~12 个文件、600~900 行 | — |

两条"倾向串行"指标同时命中，按 design-craft 阶段 5.5 的判定规则：**不走并行链，单窗口串行执行**。

补充理由：本需求是在既有回收站机制上做**扩展**，S02 与 S04 都改 `trash-service.ts`、S02 与 S04 都改 `governance-contract.ts`，骨架与预演成本会吃掉并行收益；串行还能保证每批都能真机验证（S03 产出的组条目正好是 S04 的验证输入）。

### 串行顺序

```text
前置层 F1~F5（契约/布局/错误码/横切/权限，一次性冻结）
   ↓
S01 文档删除产品面（P0，独立，先出用户可感价值）
   ↓
S02 回收站类型扩展（根：类型 + 存储 + 契约）
   ↓
S03 组删除入站（产出组条目）
   ↓
S04 组条目恢复（消费组条目）
   ↓
S05 回收站页与清库提示（消费类型与恢复接口）
```

### 不在本计划内

- 界面 ASCII 图的定稿（S01/S05 待确认项）—— 若定稿有变，只影响 S01/S05 两批的前端部分，前置层与 S02~S04 不受影响
- 空组条目堆积（challenger 🟢 意见 6）—— 未纳入实施
- 大组容量上限与恢复耗时优化 —— 分别在 S02 待定 1 / S04 待定 2、3
- 事件 #74（残壳文档无法删除）—— 独立事件，不属本需求

---

## 三问自查

| 问题 | 答案 |
|---|---|
| ① 谁必须先行？ | 前置层 F1~F5（契约/布局/错误码/横切/权限）；**根砖头 S02**（被 S03/S04/S05 实现级依赖） |
| ② 哪些能同批开工？不能的为什么？ | 本次单窗口串行，无同批项。技术上可并行的是 S01 ∥ S02 与 S05 清库提示 ∥ S03，未采用（见 §2 说明表） |
| ③ 本次如何执行？ | 单窗口串行，顺序：前置层 → S01 → S02 → S03 → S04 → S05，每批过三条检查点 |
