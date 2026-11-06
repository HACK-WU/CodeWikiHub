---
id: REQ-20261021-001
feature: 写入落点留痕（Group 留空兜底可追溯）
status: 实施中
created: 2026-10-21
updated: 2026-10-21
version: 2
tags: [feat, traceability]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：写入落点留痕（Group 留空兜底可追溯）

- **来源**：2026-10-20 写入页 debug（「知识写入怎么写不了」）衍生结论 Q9 —— 为让用户能写入而不被 Group 卡住，当日把 Group 改为「可留空，留空落到与 scope 同名的组」，但**落点本身没有落库**，事后无法区分"用户显式选了同名组"与"留空兜底落进来"。
- **分析口径**：debug + challenger 二次质疑遗留项（`review/challenge-report.md` Q9），本文档仅做需求定义，未进入设计。
- **证据声明**：`🟢` = 代码直读；`🟡` = 推理未验证。本文所有现状判断均为 `🟢`。

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | 当前落点信息**只存在于一次性响应**里：前端是保存成功后的一行提示，后端是 `hint` / `hints` 字段，均不落库 | `web/src/pages/WritePage.tsx` 成功提示拼接 `（Group 留空 → 写入「x」组）`；`src/sync-relation.ts` 单条 `hint`、批量 `hints` 只挂在响应体 |
| 2 | 文档列表接口无"来源"维度，只有结果维度（`group` / `logicalPath` / `matchedBy`） | `/api/doc/list` 返回结构（`src/lib/mcp-http-api.ts` handleDocList） |
| 3 | 因此无法回答"这篇文档是显式写进 `<scope>` 同名组的，还是留空兜底进来的"，也无法统计兜底比例、无法排查"为什么这里多了一个和 scope 同名的组" | 推论（🟡） |
| 4 | 补该字段**不影响检索**：只要不进向量文本，FTS / dense / 路径向量语义保持不变 | `buildRelationContent` 已退化为纯 relation 名，group 不参与向量文本 |

## 2. 现状与问题

### 2.1 落点信息的生命周期

```text
用户留空 Group → 前端 resolveWriteGroup() 补成 <scope>
    → ki_sync_relation(group=<scope>) → 写入 cache/local-kb/向量/wiki
    → 响应体 hint「Group 为空，已落到与 scope 同名的组「x」」
    → 前端渲染一行成功提示
    → 刷新页面 / 换设备 / 换 CLI 调用 → 信息彻底消失
```

`relation` 元数据里只存 `text / id / score / useCount / lastUsedTime / memoryId(s) / ftsIds / tags / isImported`，**没有"这个 group 是怎么来的"**。

### 2.2 造成的能力缺口

| 场景 | 今天能不能回答 |
|---|---|
| 用户在浏览页看到 `<scope>` 同名目录，问"这是我自己建的组吗" | ❌ |
| 运维想统计"有多少文档是靠兜底落进 scope 组的" | ❌ |
| 排查"某个文档位置不对"时，判断是用户选错组还是系统兜底 | ❌ |
| MCP / CLI 调用方想知道自己那次写入是否触发了兜底 | ⭕ 仅当次响应内可见 |

## 3. 需求描述

- **R1 持久化来源**：写入 Relation 时记录落点来源 `groupSource: 'explicit' | 'scope-fallback'`，落在 relation 元数据上（`RelationsCache` 的 relation 记录），缺省值 = `explicit`（老数据零迁移）。
- **R2 接口透出**：`/api/doc/list`、`/api/doc/get`、`/api/doc/edit` 与 `ki get-module-info` 的返回体带该字段；缺省（老数据 / 老 daemon）按 `explicit` 处理，前端不得因此报错。
- **R3 展示（弱化）**：浏览页文档行或阅读器可显示「自动落到 scope 组」徽标；默认**不**高亮，避免制造视觉噪声。
- **R4 不入向量**：该字段仅存元数据，**不得**拼
进 `buildRelationContent` / 内容向量文本 / `docId` 计算——否则改变检索语义与既有 docId（会产出孤儿向量）。
- **R5 覆盖语义**：同一 `(group, relation)` 再次写入时按本次实际来源覆盖：显式写入 → `explicit`；留空兜底 → `scope-fallback`。不做"首次固化"。
- **R6 批量一致**：`ki_bulk_sync_relation` 每个 item 独立判定并各自落值。

## 4. 验收标准

| # | 用例 | 期望 |
|---|---|---|
| A1 | 写入页留空 Group 写一篇 → `GET /api/doc/list` | 该文档 `groupSource = 'scope-fallback'`，且 `group === scope` |
| A2 | 显式填 `项目根/测试模块` 写一篇 | `groupSource = 'explicit'` |
| A3 | 对同一 relation 先留空兜底、再显式写入 | 最终为 `explicit`（R5） |
| A4 | 读取本次改动前的历史文档 | 返回缺省（视为 `explicit`），前端渲染不报错 |
| A5 | 同一文档写入前后对比 dense/FTS/路径向量 docId | 完全一致（证明 R4 未被破坏） |
| A6 | MCP `ki_sync_relation` 传 `group: ""` 与 CLI 省略 `--group` | 落值均为 `scope-fallback`，与写入页一致 |

## 5. 影响面

| 层 | 位置 | 改动 |
|---|---|---|
| 元数据 | `src/lib/scoring.ts` `Relation` 接口 | 加可选字段 `groupSource?: 'explicit' \| 'scope-fallback'` |
| 写入 | `src/sync-relation.ts` 单条 `syncSingleRelation` / 批量 | 落值（与现有 `groupFellBack` 判定复用） |
| 读 | `src/lib/mcp-http-api.ts` doc list/get/edit | 透出字段 |
| CLI | `src/get-module-info.ts` | 打印字段 |
| 前端 | `web/src/api/httpApi.ts` 类型 + `BrowsePage` / 阅读器 | 类型与可选徽标 |
| 兼容 | 分片缓存、旧 daemon | 字段可选，缺省=explicit |

## 6. 未决问题（待设计阶段拍板）

1. **字段名**：`groupSource`（两个枚举值）vs 布尔 `groupFallback`。前者可扩展（未来可能出现"导入兜底""AI 自动归类"），倾向 `groupSource`。
2. **是否需要聚合统计**：总览/浏览页是否展示"兜底文档数"。若要，需要 `/api/doc/list` 之外再加计数接口。
3. **R3 徽标位置**：文档行内联 vs 阅读器头部信息区。需先出 ASCII 图确认（界面确认闸门）。
4. **是否回填历史数据**：老数据一律视为 `explicit`（零迁移）vs 提供一次性推断回填（`group === scope` 的历史文档标记为 `scope-fallback`）。后者会在同名组里误伤"用户显式选的同名组"，倾向不推断。

---

## 7. 实施进度（2026-10-21）

| 需求 | 状态 | 落地位置 |
|---|---|---|
| R1 持久化来源 | ✅ | `src/lib/scoring.ts` `Relation.groupSource?`；`src/sync-relation.ts` 单条 + 批量落值。**只在兜底时写字段**，显式写入执行 `delete relRec.groupSource` ⇒ 缺省即 explicit，不给绝大多数文档加冗余字段 |
| R2 接口透出 | ✅ | `/api/doc/list`（`docs[].groupSource`）、`/api/doc/get`（复用 `executeGetModuleInfo` 返回）、`ki get-module-info`。`/api/doc/edit` 未加（编辑场景不需要来源信息） |
| R3 展示 | ❌ 未做 | 页面新增徽标属界面元素，按界面确认闸门需先出 ASCII 图与用户确认 |
| R4 不入向量 | ✅ | 字段只进 relation 元数据；`buildRelationContent` / `generateDocId` 未改动，检索与 docId 语义不变 |
| R5 覆盖语义 | ✅ | 单测覆盖：先兜底写入（`scope-fallback`）→ 再显式写入 → 字段被删除 |
| R6 批量一致 | ✅ | 批量按 `itemGroupFellBack` 逐条判定 |

验证：
- 单测 `test/sync-relation.test.ts`「落点来源留痕：兜底写 scope-fallback，显式写入清除该字段」✅
- 端到端（daemon 重启后）：留空写入 → `curl '/api/doc/list?scope=ui-write-check'` → `{"name":"Q9Q10验证","group":"ui-write-check",...,"groupSource":"scope-fallback"}` ✅
