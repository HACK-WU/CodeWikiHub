---
id: REQ-20261019-004
document_type: review
created: 2026-10-19
updated: 2026-10-19
version: 1
tags: [feat]
author: AI
---

# 代码审查报告（工作区未提交改动）

- **变更范围**：8 个已跟踪文件（+630/−83）+ 4 个新增文件
  - 后端：`src/lib/task-snapshot.ts`(新)、`src/lib/task-registry.ts`、`src/import.ts`、`src/lib/daemon-rpc.ts`、`src/lib/mcp-http-api.ts`
  - 前端：`web/src/lib/taskDetailModel.ts`(新)、`web/src/api/tasksApi.ts`、`web/src/pages/TasksPage.tsx`、`web/src/styles/ki.css`
  - 测试：`test/task-snapshot.test.ts`(新)、`test/task-registry.test.ts`、`web/test/task-detail-model.test.mjs`(新)
- **关联需求**：`REQ-20261019-004 《任务详情导入信息完备》`（用户指定 / 代码语义 ↔ 需求名称 🟡）
- **整体评分**：**C**（存在未修复 P0，上限 C）
- **合入结论**：⚠️ 修复 P0-1 后可合入

### 维度评分

| 维度 | 评分 | 状态 | 一句话 |
|---|---|---|---|
| 🔑 语义一致性 | 5/10 | ⚠️ | 非 import 任务被判「旧记录」；tags 快照≠实际生效；R8/R9 设计未落地 |
| ⚠️ 安全性 | 9/10 | ✅ | 绝对路径拒绝、错误码白名单、文件权限 0600 均到位 |
| 🐛 Bug 风险 | 7/10 | ⚠️ | 12 项 P2 级小问题，无数据丢失类 |
| 📐 代码规范 | 8/10 | ✅ | 注释密度高；个别注释引用错误口径、死字段 |
| 🏗️ 架构设计 | 7/10 | ⚠️ | 列表/详情未分离，明细分摊到 200 条列表载荷 |
| ⚡ 性能 | 7/10 | ⚠️ | 顶栏 15s（活跃 3s）轮询全量明细 |
| 🧪 测试覆盖 | 7/10 | ⚠️ | 27 例新测 + 441 web 全绿，但非 import operation 无覆盖 |

---

## 🔴 P0

### P0-1 非 import 任务被误判为「旧记录」，并附带无关的「文件级明细不可用」

- 📍 `web/src/lib/taskDetailModel.ts:128-130`（`isLegacy`）、`:315-317`（`noticesOf`）
- 🔍 根因：`toParamSnapshot` / `toResultSnapshot` 对 `rebuild-vector` / `restore-snapshot` **按设计返回 `undefined`**（S-02 D2-4 只给 import 写 result），但前端把「params/result 缺失」直接推断为「台账扩展前创建」——把「不适用」误读成「未记录」。
- 💻 实测（探针 `.codebuddy/review/data-flow-test/probe-non-import-legacy.mjs`）：

| 场景（均为**新版本**创建） | legacy | notices |
|---|---|---|
| restore-snapshot 失败 | `true` | 旧记录… ‖ 快照文件损坏 ‖ **文件级明细不可用（任务未完成元数据提交）** |
| restore-snapshot 成功 | `true` | 旧记录… |
| rebuild-vector 部分完成 | `true` | 旧记录… ‖ **文件级明细不可用** ‖ 部分完成 |

- 💡 修复（2 处各加一个前置）：
  ```ts
  function isLegacy(task: TaskRecord): boolean {
    // 「不适用」≠「未记录」：非 import 任务本就不写 params/result
    return task.operation === 'import'
      && TERMINAL_STATES.has(task.state)
      && task.params === undefined && task.result === undefined;
  }
  // noticesOf 内同理：&& task.operation === 'import'
  ```
- 📊 影响面：任务中心现存全部「向量重建」「快照还原」记录（含刚创建），每次打开详情必现。

---

## 🟡 P1

### P1-2 需求 R8 / R9 的设计未实现

- 📍 设计 `design/S03_任务详情渲染与口径_DESIGN.md` §3.6（embedding 模型/维度，标注「当前配置」）、§3.7（scope 渲染为 `<Link to="/browse?scope=…">`）；`design-review.md` 第 9 条专门要求补齐。
- 💻 实现：`taskDetailModel.ts:173` 的「知识库」是纯文本 `dash(task.scope)`；`resultRows` 只有 `indexReadiness` 一行（`:257`），无 embedding 模型/维度。
- 💡 建议：本轮补 R9（1 行 JSX，退化纯文本逻辑简单）；R8 需要接 `useVectorDimensionStatus`，若本期不做请在 DESIGN.md 明确划出范围，避免下次评审再对账。

### P1-3 标签快照与实际生效标签口径不一致

- 📍 `src/lib/task-snapshot.ts:53-59`
- 🔍 `toParamSnapshot` 自解析（`trim` + `filter` + `slice(20)`），未复用 `parseContentTags`（`constants.ts:65`，另做 **小写化 + 去重 + 过滤保留 tag**）。
- 💻 实测（`temp/probe-tags-review.ts`）：
  - 用户输入：`" 产品 , V2 , ki-search , 产品 ,, "`
  - 台账快照：`["产品","V2","ki-search","产品"]`
  - 实际生效：`["产品","v2"]`
- 📊 影响：详情声称打了 4 个标签（含内部保留 tag `ki-search`），实际只打了 2 个 ⇒ 违背 R2「本次导入写入的文档级 tag」。
- 💡 修复：由调用方传入已解析结果（`tags: parseContentTags(args.tags)`），`task-snapshot.ts` 已依赖业务层（`import-retry.ts`），不违反 D1-3。

### P1-4 `/api/tasks` 列表携带全部明细，被顶栏高频轮询放大

- 📍 `src/lib/mcp-http-api.ts:790-796`（直接 `sendJson({ tasks })`，record 含 `result.duplicates/conflicts/groups` 各 ≤20 条）
- 🔍 消费方只要计数：`taskSummaryLine` 读 `result.files`；`scopeImportRunning` / `activeImportCount` 只读 `state/operation`。
- 📊 放大点：`AppShell.tsx:277` 每 15s（有活跃任务 3s）拉 200 条；`TasksPage` / `ImportPage` 亦各 `getTasks(200)`。
- 💡 建议：列表接口裁剪 `result` 明细（只留 `files` 计数 + `truncated` + `errorCode`），`/api/tasks/:id` 返回全量——与前端「列表只用计数」的现状天然吻合。

---

## 🟢 P2（建议改进）

| # | 位置 | 问题 |
|---|---|---|
| 1 | `task-snapshot.ts:78-94` | `splitSkipped` 注释引用 `import.ts:1961`（顶层 `stats.skipped`，含 `failedRecords.size`），但实际传入的是 `files.skipped`（`:1976`，文件级、不含失败）。两套口径并存，注释会误导后续维护 |
| 2 | `TaskParamSnapshot.chunkSize/chunkOverlap` | 生产有值但前端 `paramRows` 不展示（死字段）；且未传时不写默认值（实际生效 1000/150）——0.9 反向贯通「有生产无消费」 |
| 3 | `taskDetailModel.ts:43` | `TaskDetailView.progressPercent` 无消费者；`TasksPage.tsx:43` 又独立算一遍百分比，与「组件只渲染本文件输出」的自述约定相悖，改一处即漂移 |
| 4 | `taskDetailModel.ts:257` | 「索引」行无条件追加 ⇒ 失败任务显示 `索引 = —` 噪音（探针实测） |
| 5 | `taskDetailModel.ts:362-370` | 无 `progress` 的终态任务由改前「等待开始」变为「—」（探针 3/4 案例命中） |
| 6 | `daemon-rpc.ts:557` | catch 分支 `toResultSnapshot(req.operation, job.result)` 恒为 `undefined`（`job.result` 仅在成功路径赋值），可省 |
| 7 | `task-snapshot.ts:58` | tags 截断到 20 条但不置 `truncated`，详情无「已截断」提示 |
| 8 | `task-registry.ts:345-363` | `fitToBudget` 删 conflicts/duplicates 后未再断言 ≤ 上限；将来新增字段仍可能超 32KB ⇒ 任务静默消失（G1 同类风险） |
| 9 | `web/src/styles/ki.css:3093` | `.ki-task-recovery` 已无使用者（详情改用 `.ki-task-notice--warn`），死 CSS |
| 10 | `design/S03 §3.6` vs `§3.8` | 设计自相矛盾：§3.6 视觉表要求「仅显示前 20 条 / 共 N 条」，§3.8 要求中性「明细未完整显示」。实现选了 §3.8（符合评审 #7），建议回写修正 §3.6 表格 |
| 11 | `taskDetailModel.ts:288-296` | `readableError` 依赖中文文案正则（上一轮 challenger 意见 2 已记，此处确认仍在） |
| 12 | 工作区 | 未跟踪杂项 `0`（空文件）、`.claude/`、`.codewiki-sync.json`、`.dsh-browser-demo/` 不应混入本次提交 |

---

## 🟢 亮点

1. **`fitToBudget` 挂在 `writeRecord` 唯一落盘入口**，并用 UTF-8 字节（`Buffer.byteLength`）而非 `String.length` 比较——直接对准「超 32KB ⇒ `readRecordFile` 返回 null ⇒ 任务静默消失」的真实后果，不是抽象防御。
2. **抽取逻辑单一实现**（`task-snapshot.ts`），三端只调用不各自组装；注释显式援引「daemon-rpc.ts:492-493 曾因两处判断漏标 coordinator kind」的历史教训。
3. **`splitSkipped` 以 `skipped` 为上限反算 `other`**，并配恒等式单测（三项之和 == skipped），避免「分类相加反而大于总数」。
4. **失败路径不虚构数字**：`toResultSnapshot` 对无 `stats.files` 的错误返回 `undefined`，UI 显式说明原因，而不是渲染 `成功 0 / 跳过 0`。
5. **参数快照写在入队之前**（`mcp-http-api.ts:1881`、`daemon-rpc.ts:458`），排队态详情不为空——上一轮 challenger 意见已被正确吸收。

---

## 🧪 测试验证（已执行）

| 项 | 命令 | 结果 |
|---|---|---|
| 后端任务快照 | `npx jiti test/task-snapshot.test.ts` | **11/11 通过** |
| 后端台账 | `npx jiti test/task-registry.test.ts` | **6/6 通过** |
| web 单测 | `cd web && npm test` | **441/441 通过** |
| web 类型 | `cd web && npx tsc --noEmit` | exit 0 |
| 后端类型 | `npx tsc -p tsconfig.src.json --noEmit` | exit 0 |
| **P0-1 动态取证** | `node .codebuddy/review/data-flow-test/probe-non-import-legacy.mjs` | 4 案例中 3 例误判 `legacy=true` |
| **P1-3 动态取证** | `npx jiti temp/probe-tags-review.ts` | 快照 4 个标签 vs 实际 2 个 |

> 现有测试**未覆盖**非 import operation 的 `buildTaskDetail`（`task-detail-model.test.mjs:187` 虽构造了 `rebuild-vector`，但只断言「已提交条目」一行存在，未断言 `legacy=false`）——这是 P0-1 逃过测试的直接原因，修复时请一并补断言。

## 📌 合入后跟进

| 优先级 | 行动项 |
|---|---|
| P1 | 补 R9（scope 链接）与 R8（当前配置模型/维度），或回写 DESIGN 明确划出范围 |
| P1 | `toParamSnapshot` 复用 `parseContentTags` 口径 |
| P1 | `/api/tasks` 列表裁剪明细 |
| P2 | 上述 12 项 |
