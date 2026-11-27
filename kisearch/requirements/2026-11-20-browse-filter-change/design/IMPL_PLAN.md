# 实施计划：浏览页筛选改造（时间 / 标签 / 事件）

- **设计基线**：`DESIGN.md` + `S01/S02/S03`（同目录）
- **评审基线**：`design-review.md`（🔴3 / ⚠️2 / 🟡11）—— 本计划已把 3 条阻断的修正口径写进"修正项"
- **执行方式**：**单窗口串行**（可并行砖头 < 3，且共享面集中在 `mcp-http-api.ts` 与 `BrowsePage.tsx` 两个大文件）

## 1. 前置层（不进批次）

| # | 前置项 | 内容 | 完成判据 |
|---|---|---|---|
| 1 | 数据模型 | `Relation.createdAt?` / `updatedAt?`（ms，可选） | `scoring.ts` 类型定稿，老数据缺省=未知 |
| 2 | 共享契约 | `DocFilters` / `BrowseFilters` 形状、`GET /api/doc/list` 四参数、`undatedExcluded` | `src/lib/doc-filters.ts` + `web/src/lib/browseFilters.ts` 落地并被两侧引用 |
| 3 | 横切约定 | 时间单位统一 ms；`since` 的 `now` 取**服务端**时钟；错误码 `INVALID_SINCE` / `INVALID_SORT`（400）；分页口径 `total/truncated` = 过滤后 | 写在 `doc-filters.ts` 顶部注释 |
| 4 | 权限模型 | 无新增：`GET /api/doc/list` 已要求 `knowledge.read`；`GET /governance/events` 同 | 无需改动 |
| 5 | 前端视觉基线（壳轨） | `demo/browse-filter-builder/index.html`（已确认） | 组件结构与 token 以 demo 为准 |

## 2. 修正项（实施时按评审结论执行，设计文档不改）

| 评审项 | 实施口径 |
|---|---|
| 🔴1 阅读态第二处筛选入口（`BrowsePage.tsx:1429`） | 两处渲染点都替换：工具栏（`:1621`）+ 阅读态头部（`:1429`）→ `ConditionChips` / `ConditionBuilder` |
| 🔴2 "更新"误判为"新增" | 覆盖变更时**不补** `createdAt`；徽标判据 = `createdAt === undefined ? '更新' : (updatedAt - createdAt < 60s ? '新增' : '更新')` |
| 🔴3 `isContentUnchanged` 调用点 | 固定在现有 `import.ts:1398-1408` 位置（切分之后），只去掉 `incremental && vector` 前置；结果**只写 stamp**，不参与 `continue` |
| ⚠️4 tags 逗号歧义 | 前端用**重复参数** `?tags=a&tags=b`；服务端 `getAll('tags')` 为主、逗号串兼容 |
| ⚠️5 事件候选上限 | `listEvents` 用 `q` 服务端搜索 + 默认未收口最近 100，面板显示"输入关键字搜索" |
| 🟡 其他 | 标签候选取**无筛选**的 doc list；视图成员来源=`useScopeList` 的视图定义；queryKey 用排序后 tags；树不传 sort；`TagSelect` 保留（仅浏览页引用，可由新组件内部复用） |

## 3. 批次表

| 批 | 工作项 | 层级 | 承接验收项 | 并行 | 串行原因 | 涉及文件 |
|---|---|---|---|---|---|---|
| 第 1 批 | **S-01** 时间戳数据层 | 根 | 连导两次不变 / 改一字仅该篇变 / 元数据不变 | ∥ | — | `scoring.ts`、`import.ts`、`sync-relation.ts`、`relation-edit-publish.ts`、`trash-service.ts` |
| 第 1 批 | **FE-SHELL** 条件构造器壳 | 壳 | 样式契约（demo 8 态） | ∥ | — | `components/Condition*.tsx`、`ki.css` |
| 第 2 批 | **S-02** 列表接口过滤 | 业务 | since/tags/event/sort + 视图逐成员 | → | 依赖 S-01 字段 | `lib/doc-filters.ts`(新)、`mcp-http-api.ts` |
| 第 3 批 | **S-03** 前端接线 | 业务 | demo 8 态 + 键盘 6 步 + 视图事件分组 | → | 依赖 S-02 契约（第 2 批） | `httpApi.ts`、`hooks.ts`、`browseFilters.ts`、`useEventOptions.ts`、`BrowsePage.tsx` |

> FE-SHELL 与 S-01 同批 ∥：两者文件零交集（`web/**` vs `src/**`）。S-03 接线等 S-02 契约落地，**但壳不等后端实现**。

## 4. 每批检查点

1. 第 1 批后：`tsc -p tsconfig.json --noEmit` 无新增错误；打标矩阵 9 条路径可枚举。
2. 第 2 批后：`doc-filters` 单测绿；不带新参数时单库响应与改造前一致（仅多 docs 字段）。
3. 第 3 批后：`web` 构建通过；浏览器中 demo 8 态可复现。

## 5. 需求侧验收映射（执行后逐条核验）

| 验收项 | 承接批次 |
|---|---|
| 时间筛选命中"最近 6 小时新增或修改" | 1 + 2 + 3 |
| 连导两次不刷 `updatedAt` | 1 |
| 标签多选 OR / 跨字段 AND | 2 + 3 |
| 事件过滤=成员文档 | 2 + 3 |
| 视图下逐成员过滤、事件按库分组 | 2 + 3 |
| 老数据显示"另有 N 篇无时间记录" | 2（`undatedExcluded`）+ 3（展示） |
| 两段式提交（Enter 本条 / Ctrl+Enter 全部） | 3 |

## 6. 执行方式说明

单窗口按 **第 1 批 → 第 2 批 → 第 3 批** 顺序连做；FE-SHELL 与第 1 批本可并行，本次合并进第 3 批一次完成（同一窗口，拆开只增切换成本）。
