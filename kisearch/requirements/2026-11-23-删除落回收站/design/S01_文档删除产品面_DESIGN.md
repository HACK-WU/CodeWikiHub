# S01 文档删除的产品面曝光

## 术语

| 术语 | 定义 |
|---|---|
| 回执 | 删除成功后返回给调用方的结构化结果（HTTP body / MCP tool result / 页面提示） |
| 改口 | 把"不可恢复"的既有文案替换为与真实行为一致的表述 |
| 保留天数 | 回收站设置 `keepDays`（3/7/14/30，默认 7），逐库可不同 |

## 现状（AS-IS）

删除链路：`POST /api/doc/delete`（`src/lib/mcp-http-api.ts:1651-1702`）→ `deleteDocument`（`src/lib/doc-delete.ts:173-256`）→ `executeBatchDelete` → `executeDeleteRelation`，后者在**删除任何数据之前**调用 `moveToTrash`（`src/delete-relation.ts:233-254`），快照落 `{kbDir}/.trash/{group}/{dirName}/`。MCP `ki_delete_relation` 走同一函数。

**能力已在，产品面三处说反了：**

| 位置 | 现有文案 / 行为 | 问题 |
|---|---|---|
| `web/src/components/DocDeleteDialog.tsx:153` | 「删除后无法恢复，请确认」 | 与真实行为相反 |
| `web/src/components/DocDeleteDialog.tsx:172-196` | 只列"正文/元数据/索引一并删除" | 未提可恢复，也未提源文件不可恢复 |
| `web/src/api/httpApi.ts:535-547` | `DeleteDocumentResponse` 无 `trash` | 后端 `DeleteResult.trash`（`src/delete-relation.ts:113-120`）在 `doc-delete.ts:60-71` 被丢弃 |
| `web/src/api/httpApi.ts:562` | 注释「删除一篇文档（不可恢复）」 | 与实现相反 |
| `web/src/pages/ResourcesPage.tsx:130-134, 344-348` | 「删除不可恢复，也没有回收站」 | 与实现相反 |
| `src/lib/mcp-tools/delete-relation.ts:9` | 工具描述只说"删除关联数据" | 模型无法告知用户"可恢复" |
| `docs/mcp-tools.md` | 未记录 `trash` 回执字段 | 外部调用方无从知晓 |

## 方案（TO-BE）

### 1. 后端回执透传

`src/lib/doc-delete.ts`：`DocDeleteResult` 增加可选 `trash`，`deleteDocument` 从 `batch.results[0].trash` 透传（不新增计算，只是别丢）。

```ts
export interface DocDeleteResult {
  ok: true;
  scope: string; group: string; relation: string;
  deleted: boolean;
  wikiRemoved: boolean;
  wikiSkipReason?: string;
  datasourceSource?: string;
  /** 回收站回执（本次新增）：进站成功才有；KI_TRASH_DISABLED=1 时不出现 */
  trash?: { dirName: string; reason: TrashReason; expiresAt: number; ttlDays: number };
  warnings: string[];
}
```

### 2. 前端契约与文案

`web/src/api/httpApi.ts`：`DeleteDocumentResponse` 同步加 `trash?`（同形状）。

`DocDeleteDialog.tsx` 三处：

| 变更点 | 现状 | 预期 |
|---|---|---|
| 副标题（:153） | 删除后无法恢复，请确认 | 删除后可在回收站恢复 |
| 说明列表（:172-196） | 未提可恢复 | 新增一条「正文与元数据会移入回收站，可恢复；向量与全文索引在恢复时重建（数秒）」 |
| wiki 勾选框（:177-192） | 「同时删除 wiki 源文件」 | 勾选框下方补一行警示：「源文件为物理删除，回收站不保留它」 |

`BrowsePage.tsx` 的 `handleDocDeleted`（:1406-1423）回执：当 `result.trash` 存在时，提示改为「已移入回收站，可在回收站恢复」，并给一个「去回收站」链接（`/governance/trash`）；无 `trash` 时保持原文案（应急开关关闭的场景）。

### 3. MCP 与文档

`src/lib/mcp-tools/delete-relation.ts:9` 工具描述追加：**「删除会先把正文与元数据移入回收站（可在 Web 回收站恢复），索引在恢复时重建」**。工具结果里 `result.trash` 已随 `JSON.stringify(result)` 输出，无需改结构。

`docs/mcp-tools.md` 的 `ki_delete_relation` 段补 `trash` 回执字段说明。

## 接口设计

### `POST /api/doc/delete`（响应新增字段）

```json
{
  "ok": true,
  "scope": "default",
  "group": "部署运维",
  "relation": "Redis 主从切换",
  "deleted": true,
  "wikiRemoved": true,
  "trash": {
    "dirName": "Redis 主从切换",
    "reason": "manual",
    "expiresAt": 1764576000000,
    "ttlDays": 7
  },
  "warnings": []
}
```

字段缺省语义：`trash` 缺失 = 本次未进站（应急开关 `KI_TRASH_DISABLED=1`、或 `wikiDelete=false` 的数据源 prune 场景）；前端不得把它当失败。

## 关键决策点

| 决策 | 采纳 | 被否决方案 | 否决理由 |
|---|---|---|---|
| 弹窗是否显示具体保留天数 | 不显示，只说"可在回收站恢复"；准确天数由删除回执给出 | 弹窗打开时额外拉 `/api/governance/trash/settings` | 多一次请求；且视图 scope 下各库设置不同，弹窗取哪个都是撒谎（与 `TrashPage.tsx:45-48` 同一口径） |
| 删除成功后是否自动跳转回收站 | 不跳转，只在回执里给提示 + 链接 | 自动跳转 `/governance/trash` | 批量连续删除时会被打断，用户还得自己走回来 |
| MCP 工具描述是否写死"7 天" | 不写天数，只写"可在回收站恢复" | 写「7 天内可恢复」 | 保留天数逐库可配，写死即骗人 |
| 源文件说明放哪 | 勾选框下方紧邻说明 | 只在弹窗底部统一说明 | 用户勾选时才是决策点，说明必须贴着勾选框 |

## 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| `trash` 字段缺失（应急开关 / 数据源 prune） | 前端按原有"不可恢复"文案渲染 | 是（文案差异） |
| 进站失败（`TRASH_CONTENT_MISSING` 等） | 后端已中止删除，返回 500 + 原因（`delete-relation.ts:245-247`） | 是 |
| 删除成功但 `wikiRemoved=false` | 沿用现有 `warnings` 通道（`doc-delete.ts:230-236`） | 是 |
| 视图 scope 下打开删除弹窗 | 现状即不支持（视图下无删除入口），无需处理 | — |

## 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/doc-delete.ts` | `DocDeleteResult` + 透传 `trash` |
| `src/lib/mcp-tools/delete-relation.ts` | 工具描述 |
| `web/src/api/httpApi.ts` | `DeleteDocumentResponse` + 注释 |
| `web/src/components/DocDeleteDialog.tsx` | 副标题 / 说明列表 / 源文件警示 |
| `web/src/pages/BrowsePage.tsx` | `handleDocDeleted` 回执 |
| `web/src/pages/ResourcesPage.tsx` | 两处"没有回收站"的表述 |
| `docs/mcp-tools.md` | `trash` 回执字段 |

## 待确认问题

| # | 问题 | 状态 |
|---|---|---|
| 1 | 弹窗与回收站页的 ASCII 布局需按「界面确认闸门」确认 | 待确认（本文档 §方案 2 已给出变更点，图形见 S05） |
