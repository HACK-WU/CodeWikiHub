# 实施计划 · AI 查找可配置化

- 需求：REQ-20261116-005
- 设计：`DESIGN.md` + `S01`~`S04`
- 计划日期：2026-11-16
- 状态：待开工

## 1. 范围

| 期 | 批次 | 交付内容 | 是否依赖 LLM |
|---|---|---|---|
| 一期 | B0 → B5 | `find` 配置域、检索范围、跨库候选与引用、设置页与弹窗 | 否 |
| 二期 | B6 → B8 | 深度查找（find-runner）、双通道入口、面板真实记录 | 是 |

⛔ 不做：文件工具（`fs_*`）、创建事件时的查找入口、深度查找进 `/mcp` 或对话工具面、快速通道算法改动、异步草稿。

## 2. 前置条件（开工前必须完成）

| # | 事项 | 判据 | 责任 |
|---|---|---|---|
| P1 | **契约形状冻结**（见 §3 B0） | `npm run build` 0 错误，且既有测试全绿 | 开发 |
| P2 | **U-03-1 长请求实测**（只影响二期，可并行） | 真实部署下 45s 同步请求不被网关掐断 | `demo-verify` |
| P3 | 基线全绿 | `npm run test:all` 与 `cd web && npm test` 在改动前先跑一遍留底 | 开发 |

## 3. 一期任务（B0~B5）

### B0 契约冻结（改类型不改行为）

**目的**：让后续前后端按同一形状推进，避免边写边改。

| 文件 | 动作 |
|---|---|
| `src/lib/events/types.ts` | `EventRefDoc` 加可选 `sourceScope?: string` |
| `src/lib/events/refs-service.ts` | `RefCandidate` 加 `origin` / `scope` / `rankInScope?` / `rawScore?` / `visibilityReason?`（**只加可选字段，先给默认值） |
| `src/lib/chat/prompt-config.ts` | 加 `FindConfig` / `FindRangeConfig` / `CapabilityPrompt` 引用（类型先立，默认值 B1 填） |

**完成判据**：`npm run build` 0 错误；`npx jiti test/refs-sr05-search.test.ts` 与 `test/governance-refs-route.test.ts` 仍全绿（新增字段可选，不破坏既有断言）。

**回滚点**：纯类型新增，弃用即可。

---

### B1 配置域 + 后端校验（S-01 后端）

| 文件 | 动作 |
|---|---|
| `src/lib/chat/prompt-config.ts` | `defaultFindConfig()` / `FIND_TOOL_GROUPS` / `FIND_*_DEFAULT` 常量 / `find` 域校验（严格保存、软读取）/ `findPrompt` 迁移 / `capabilities.findDeep=false` |
| `src/lib/chat/retrieval/refs-locate-skill.ts` | **新增**：内置 skill 正文（按 `ki_search` / `ki_get_module_info` 真实语义写） |
| `src/lib/chat/chat-routes.ts` | `GET /api/chat/config` 透出 `find` / `capabilities` / `limits.find*`；`PUT` 接收 `find`（`tools` 增量合并） |
| `test/chat/find-config.test.ts` | **新增**：默认值 / 迁移 / 软读取 / 严格保存 5 类 |

**关键点**（易踩）：
- `find` 缺失 → 补齐**不报 issue**（报 issue 会触发整份回退，把对话配置一起带成默认）。
- 新增内置 skill → 老配置自动多一条，走既有 `BUILTIN_SKILL_NAMES` 补齐口径。
- `extraScopes` 无权限 → **400**（不是 403，理由见 S-01 D-01-7）。

**完成判据**：`npm run test:chat` 全绿 + `npm run build` 0 错误；手工 `curl GET /api/chat/config` 能看到 `find` 与 `capabilities.findDeep=false`。

**回滚点**：仅一个配置文件 + 一个新 skill 文件；回滚删除即可，老配置不受影响（`findPrompt` 未被改写）。

---

### B2 检索范围与跨库（S-02）

| 文件 | 动作 |
|---|---|
| `src/lib/events/find-targets.ts` | **新增**：`resolveFindTargets`（复用 `scope-access` 的 mtime 快照，禁自建 TTL 缓存） |
| `src/lib/events/refs-store.ts` | `refKey` 含 `sourceScope`；`removeRefDoc` 入参改对象（老参数组合按事件库匹配） |
| `src/lib/events/refs-service.ts` | `searchRefCandidates` 收 `targets`、逐 target 检索、`sourceScope` 聚合、按源库可见性、`totalByScope`、`targetErrors`、`empty-scope` 判定；`addRefs` 加 `tokenScopes` + 存在性 + 可检索性；`listRefs` 加 `staleReason` |
| `src/lib/events/refs-search.ts` | `AdapterHit` 保留 `hit.scope` |
| `src/lib/governance-http.ts` | `refs/search` 接 `mode`（一期 `deep` → `FIND_DEEP_NOT_READY`）、回显 `targets`；`DELETE` 接 `sourceScope`；`addRefs`/`removeRef` 传 `ctx.authScopes` |
| `test/refs-sr05-search.test.ts` 等 | **新增用例**：跨库回指、同名不同库、部分库失败、权限剔除、已收口事件拒绝、未收口放行、`staleReason` |

**关键点**：
- 去重 key 必须改（跨库同名会静默跳过）。
- 部分 target 失败时**不判** `empty-scope`（"查不了"≠"没内容"）。
- 事件库本身先鉴权，再逐个 target 鉴权。
- **不要动** `event-service.ts` 的功能；只做核查（事件关闭/回收站/删除只动本库 refs 文件）。

**完成判据**：`npx jiti test/refs-sr05-search.test.ts`、`npx jiti test/refs-sr05.test.ts`、`npx jiti test/governance-refs-route.test.ts`、`npx jiti test/create-event-refs.test.ts` 全绿 + `npm run build` 0 错误。

**回滚点**：`refs-store` 与 `refs-service` 两文件；已写入的 `refs.json` 带 `sourceScope` 对老代码无害（老代码忽略未知字段）。

---

### B3 前端设置页（S-01 前端）

| 文件 | 动作 |
|---|---|
| `web/src/chat/PromptConfigLayer.tsx` | find 分组 6 块：检索范围（`ScopeMultiPicker` 多选，含视图）/ 基础提示词 / Skill / 检索预算 / 思考级别 / 工具与权限；`mutateFind`；`kind:'find'` 弹窗改读 `find.prompt`；一期横幅 |
| `web/src/chat/promptConfigClone.ts` | 草稿克隆纳入 `find` |
| `web/src/api/chatContract.ts` | `FindConfigDto` / `limits.find*` / `capabilities` |
| `web/src/pages/AiSettingsPage.tsx` | 左栏文案（去「未接入」）、页面级说明 |
| `web/test/find-config-ui.test.mjs` | **新增**：6 块渲染、范围即改即存、无权限项不可选、横幅按 `findDeep` 显隐 |

**关键点**：`ScopeMultiPicker` 的选项数据来自 `useScopeList()` 的 `scopes` **与 `views`**（现有代码只用了 `scopes`）。

**完成判据**：`cd web && npm run typecheck && npm test` 全绿。

**回滚点**：仅渲染分支；后端已返回 `find` 时前端不渲染也不影响其它分组。

---

### B4 前端查找弹窗（S-04 一期部分）

| 文件 | 动作 |
|---|---|
| `web/src/api/governanceApi.ts` | `req()` 支持 `signal` + `timeoutMs`（`AbortSignal.any`，超时与 abort 区分）；`findRefCandidates` 增 `mode`；`addRefs` 带 `sourceScope`；删除引用带 `sourceScope` |
| `web/src/api/governanceContract.ts` | DTO 增量（`origin` / `scope` / `visibilityReason` / `targets` / `skippedTargets` / `targetErrors` / `totalByScope`） |
| `web/src/components/governance/FindRefModal.tsx` | 跨库库名徽标、默认勾选按 `origin`、`hidden` 候选禁用/提示、`skippedTargets` 行内提示、模式切换（一期按 `findDeep` 禁用） |
| `web/src/components/governance/AiProcessPanel.tsx` | `STEP_TITLES` 扩 `tools`/`verify`；`partial` / `skippedTargets` / `targetErrors` / `unconfirmed` 呈现 |
| `web/src/pages/EventsPage.tsx` | 参考文档行显示库名（多库时）、删除传 `sourceScope`、`staleReason` 文案 |
| `web/test/find-ref-modal.test.mjs` | **新增**：abort 不弹错、超时提示、跨库徽标条件渲染、默认勾选按 origin |

**完成判据**：`cd web && npm run typecheck && npm test && npm run build` 全绿。

---

### B5 真机联调 + 用户文档（一期收尾）

| 步骤 | 操作 |
|---|---|
| 1 | 造环境：`kisearch-memory` 为事件库，另建 `kisearch-docs` 视图（2 个成员） |
| 2 | 设置页配 `extraScopes=[kisearch-docs]` → 保存 → 刷新仍生效 |
| 3 | 事件详情「AI 查找」→ 候选来自 2 库且显示库名 → 加入 → 详情显示库名 |
| 4 | 造同 `group+name` 在两个库都存在的文档 → 分别加入 → 两条都保留（去重 key 生效） |
| 5 | 删除引用（带 `sourceScope`）→ 只删对应那条 |
| 6 | 权限：用只授权 A 库的 Token 配 B 库 → 400 且列出被拒项 |
| 7 | 可见性：B 库文档绑在**已收口**事件 → 加入被拒 409；绑在未收口事件 → 可加入 + 提示 |
| 8 | 删源文档 → 引用标 `stale` + `doc-deleted`；把源库移出配置 → `stale` + `scope-missing` |
| 9 | 文档：按团队约定更新 `docs/`（只写怎么用 / 会看到什么 / 出错怎么补救，**不写**源码路径与内部术语） |

**完成判据**：上述 9 步逐条通过并留证据（截图或 curl 输出）；daemon 已重启。

## 3.5 一期执行结果（2026-11-16）

| 批次 | 状态 | 备注 |
|---|---|---|
| B0 契约冻结 | ✅ 完成 | `EventRefDoc.sourceScope` / `RefCandidate` 五字段 / `FindConfig` 类型 |
| B1 配置域后端 | ✅ 完成 | find 域软读严存 + 字段级增量、内置 skill `refs-locate`、`findPrompt` 迁移、GET 透出 `find`/`limits`/`capabilities.findDeep` |
| B2 范围与跨库 | ✅ 完成 | `find-targets` / 去重 key 含库 / 多库聚合 / 源库可见性 / `staleReason` / 可检索性分界 / extraScopes 权限预检 |
| B3 设置页前端 | ✅ 完成（六块齐） | 范围多选（含视图映射）/ 提示词 / Skill（启停 + 依赖守卫）/ 预算三输入 / 思考级别 / 工具开关 / 一期横幅 |
| B4 弹窗前端 | ✅ 完成（一期口径） | 跨库徽标与库内排名、默认勾选按 `origin`、`hidden` 禁勾、abort、`skippedTargets`/`targetErrors` 提示、勾选 key 含源库、删除带 `sourceScope` |
| B5 真机联调 | ⏳ 待执行 | 需重启 daemon 后按 §3 B5 九步走 |

**已知偏差（一期与此前设计的差别，需在二期补齐）**

| # | 偏差 | 原因 | 补齐批次 |
|---|---|---|---|
| 1 | 查找 skill 只支持启停，**正文编辑未接**（`ItemCard` 的 `onClick` 改为可选，卡片不可点） | 编辑弹窗要新增 `find-skill` modal 类型 + 保存分支，一期未做 | B8 |
| 2 | 弹窗**无「快速 / 深度」切换** | 后端 `capabilities.findDeep=false`，渲染即禁用，等价于灰度关闭 | B8 |
| 3 | 深度通道的 `partial` / `unconfirmed` 提示未渲染 | 一期没有 deep 产出 | B8 |
| 4 | `extraScopes` 的视图选择用「最小 `ScopeInfo` 载体」映射 | `ScopeMultiPicker` 只认 `ScopeInfo`；未改组件契约 | 保持（无功能损失） |

## 4. 二期任务（B6~B8）

| 批次 | 内容 | 前置 | 完成判据 |
|---|---|---|---|
| B6 | `demo-verify`：真实部署下 45s 同步请求是否被掐断 | — | 得到可用的 `timeoutMs` 上限，回填 S-03 U-03-1 |
| B7 | `find-runner.ts` + `find-service.ts`（门禁 / 工具作用域注入 / 定向输出 / 三重校验 / 预算 / abort） | B1、B2、B6 | `test/events/find-runner.test.ts` 全绿：门禁 5 路、预算 3 路、校验 3 类、超时 2 路；且**每个工具调用独立 submit** |
| B8 | 双通道前端：模式切换启用、深度 loading + 停止、面板 `tools`/`verify` 真实记录、`partial` 提示 | B7 | `cd web` 全绿 + 真机跑通「深度查找 1 次成功 / 1 次中途停止 / 1 次超时」 |

## 5. 依赖与顺序

```mermaid
flowchart LR
    B0["B0 契约冻结"] --> B1["B1 配置域后端"]
    B0 --> B2["B2 范围与跨库后端"]
    B1 --> B2
    B1 --> B3["B3 设置页前端"]
    B2 --> B4["B4 弹窗前端"]
    B3 --> B5["B5 真机联调"]
    B4 --> B5
    B5 --> B6["B6 长请求实测"]
    B6 --> B7["B7 find-runner"]
    B7 --> B8["B8 双通道前端"]
```

B1 与 B2 必须串行（B2 依赖配置来源）；B3 与 B4 可在 B1/B2 完成后并行。

## 6. 验证策略

| 层 | 命令 | 通过线 |
|---|---|---|
| **后端类型（真）** | `npx tsc -p tsconfig.json --noEmit` | **只看本次改动的文件无新增错误**（项目存量错误见 §9） |
| ~~后端编译~~ | ~~`npm run build`~~ | ⚠️ **不可作后端类型依据**：它走 `tsconfig.src.json`，`include` 只有 `src/zvec-engine/**`（实测 `--listFiles \| grep governance-http` = 0）。B0/B1 阶段曾误以为"build 0 错误"通过，B2 用真实检查才发现 `removeRef` 调用签名不匹配 |
| 后端测试 | `npm run test:all` | 与基线一致（不新增失败） |
| 定向测试 | `npx jiti test/<file>` | 全绿 |
| 前端类型 | `cd web && npm run typecheck` | 退出码 0 |
| 前端测试 | `cd web && npm test` | 与基线一致 |
| 前端构建 | `cd web && npm run build` | 成功 |
| 真机 | 见 §3 B5 九步 | 逐条留证据 |

**基线留底**：开工前先跑一遍 `npm run test:all` 与 `cd web && npm test`，把通过数记在本文件末尾（改动后只跟这个数比，避免拿历史数字自我安慰）。

## 7. 风险与回滚

| 风险 | 触发信号 | 处置 |
|---|---|---|
| 去重 key 改动导致既有引用重复/丢失 | 真机第 4/5 步异常 | 回滚 `refs-store.ts`；已写入数据可用脚本按 `sourceScope ?? scope` 归一后重建 |
| 多库聚合让快速通道变慢（N 库 = N 次检索） | 2 库时 `durationMs` > 1.5s | 回退为单次 `executeSearch({scope:"a,b"})`（S-02 D-02-2 的重新评估条件） |
| 内置 skill 补齐让老配置界面多一条，用户困惑 | 用户反馈 | 改为默认停用（S-01 D-01-6 的重新评估条件） |
| 一期横幅被当成「又没做」 | 用户反馈 | 文案承认"已实现、当前路径不用"，并给「去了解深度查找」入口 |
| 45s 请求被网关掐断 | B6 实测失败 | 把 `timeoutMs` 降到网关上限以下，或改异步草稿（S-03 D-03-1 回退） |

## 8. 提交策略

**不自动提交**。每批完成并自验通过后，把改动清单与验证证据交用户确认，再由用户决定是否 `git commit`。

## 9. 基线记录（开工前填写）

| 项 | 数值 | 日期 |
|---|---|---|
| `npm run build` | ✅ 0 错误 | 2026-11-16 |
| `cd web && npm run typecheck` | ✅ 0 错误 | 2026-11-16 |
| `cd web && npm test` | **1236 / 1237**（1 例既有失败：`resources-page.test.mjs` 页面工具清单缺 `ki_event_create/delete/docs`，来自 REQ-20261116-004 在途改动，与本期无关） | 2026-11-16 |
| 后端定向测试 | `governance-contract` 24 · `refs-sr05-search` 17 · `refs-sr05` 11 · `governance-refs-route` 3 · `create-event-refs` 5 = **60 例全绿** | 2026-11-16 |
| `npm run test:all` | ⚠️ 未跑完（单次执行超时；项目当前有多个在途失败文件）。改动仅限类型层，已由上面 5 个定向文件覆盖 refs / 契约相关面 | 2026-11-16 |

> 开工后与 `web` 基线对比时，目标是不低于 **1236**；后端以 60 例定向为准，另加各批次新增用例。

### 存量类型错误（`npx tsc -p tsconfig.json --noEmit`，2026-11-16 实测）

项目**没有全量 tsc 门禁**（运行时走 jiti），因此存量错误存在但无害。本次改动只要求**自己碰过的文件零新增**：

| 文件 | 存量错误 |
|---|---|
| `src/lib/import-budget.ts` | `DISABLED` 当类型用 |
| `src/lib/mcp-http-api.ts` | `UserRecord` vs `UserView`（×2）、`force` 属性不存在 |
| `src/lib/mcp-http.ts` | `getActiveResourcesCount` 不存在 |
| `src/lib/open-api/multipart.ts` | `Buffer<ArrayBufferLike>` 不兼容（×2） |

### 存量测试失败（与本需求无关，勿当回归）

| 测试 | 失败原因 |
|---|---|
| `test/chat/prompt-config-routes.test.ts` | ① `toolGroups` 断言 14 个工具、实际 13；② 首个 PUT 用中文 skill 名 `部署检索`，保存严格态必拒；③ 「删掉内置 skill → 400」与 2026-11-11 的「缺失即补回默认」口径矛盾（测试过期） |
| `test/chat/e2e-sr02-sources.test.ts` | `web/src/api/chatApi.ts` 引用不存在的 `@/lib/authEvents` |
| `resources-page.test.mjs`（web） | 页面工具清单缺 `ki_event_create/delete/docs`（REQ-20261116-004 在途） |
