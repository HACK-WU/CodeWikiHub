# S-03 写端点视图门禁与错误契约

父文档：`DESIGN.md` ｜ 依赖：无（与 S-02 同文件，执行期串行）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 视图门禁 | `assertNotScopeView(scope, operation)`：scope 是视图名时抛 `ScopeViewWriteError` |
| 裸写端点 | 不经 `withScopeWriteLock` 因而绕过视图门禁的治理写端点 |

## 2. 现状（AS-IS）

### 2.1 已守住的部分

`withScopeWriteLock` 在**建目录与取锁之前**调用 `assertNotScopeView`（`src/lib/scope-write-lock.ts:106-111`），覆盖：

| 端点 | 走到的写锁 op | 结果 |
|---|---|---|
| `POST /governance/lifecycle/apply` | `event-update`（`relation-lifecycle.ts:251`） | 视图下抛 `VIEW_NOT_WRITABLE` |
| `POST /governance/lifecycle/batch-apply` | 同上（逐条） | 同上 |
| `POST /governance/events`、`/stage`、`/reopen`、`DELETE` | `event-create` / `event-transition` / … | 同上 |
| 事件类型增删改 | `event-type-write` | 同上 |

### 2.2 两处裸写（实测存在的漏洞）

| 端点 | 位置 | 后果 |
|---|---|---|
| `POST /governance/lifecycle/presets`、`DELETE …/presets/:id` | `governance-http.ts:595`、`:607` 直接 `writeGovernance(scope, …)` | 视图下点「＋新建分类」→ `writeJson → walWrite`（`src/lib/wal.ts:140` `mkdirSync`）→ 建出 `dataDir/<视图名>/governance.json` |
| `PUT /governance/trash/settings` | `governance-http.ts:1398-1405` | 同上 |

> `governance-store.ts:139` 注释已写明「调用方必须已持 scope 写锁」，但这两处 handler 没持锁——属于既有实现缺口，本次一并补。

### 2.3 错误码丢失

`governance-http.ts:181-192` 的 `fail()` 只识别 `GovernanceError`，其余一律 500：

```ts
function fail(res, err) {
  if (err instanceof GovernanceError) { ...httpStatusFor(err.code)...; return; }
  sendJson(res, 500, { ok:false, error: (err as Error).message });   // ← VIEW_NOT_WRITABLE 变 500
}
```

于是视图下写操作虽然被拦，但前端拿到的是 **500 + 通用错误**，既不是 409 也没有 `code`。

## 3. 方案（TO-BE）

### 3.1 补齐两处裸写

在 `governance-http.ts` 的三个 handler 入口（`scopeFromBody` 之后）加：

```ts
import { assertNotScopeView } from './scope-policy.js';

assertNotScopeView(scope, 'governance-preset');   // presets POST / DELETE
assertNotScopeView(scope, 'trash-settings');      // trash settings PUT
```

同时给回收站恢复/彻底删除补**纵深防御**（当前靠"视图下回收站为空"才安全）：

```ts
assertNotScopeView(scope, 'trash-restore');       // POST /governance/trash/restore
assertNotScopeView(scope, 'trash-purge');         // POST /governance/trash/purge
```

> 文案：`ScopeViewWriteError.buildMessage`（`scope-policy.ts:250-262`）对未命中 `WRITE_CMD` 的 operation 走通用分支：「视图 X 是只读聚合，不是知识库，不能作为写入目标（operation=…）+ 成员清单」。本次**不新增 CLI 命令映射**——这些操作没有对应 CLI，硬编命令会误导。

### 3.2 `fail()` 增加两类映射

```ts
function fail(res: ServerResponse, err: unknown): void {
  if (err instanceof GovernanceError) { /* 现有 */ return; }
  if (isScopeViewWriteError(err)) {
    sendJson(res, 409, {
      ok: false, code: 'VIEW_NOT_WRITABLE',
      error: err.message, view: err.view, members: err.members, action: err.action,
    });
    return;
  }
  if (isScopeReadonlyError(err)) {
    sendJson(res, 409, scopeReadonlyBody(err));   // scope-policy.ts:174-188
    return;
  }
  sendJson(res, 500, { ok: false, error: (err as Error).message });
}
```

**为什么用 409**：与 `SCOPE_READONLY` 对齐（同为"当前目标不允许写"的冲突语义），前端可按 `code` 分支给不同文案。

### 关键决策点

| 决策 | 被否决方案 | 否决理由 |
|---|---|---|
| 视图写拒绝 = 409 `VIEW_NOT_WRITABLE` | 400 | 语义是"目标状态与操作冲突"（不是参数非法）；且与既有 `SCOPE_READONLY`（409）一致，前端一处分支可处理两类只读 |
| 裸写端点加 `assertNotScopeView`，而非给它们套写锁 | 给 presets/settings 加 `withScopeWriteLock` | 它们写的是 `governance.json`（配置），套整库写锁会让「改一个预设」阻塞正在跑的导入；只加门禁即可解决 |
| 回收站恢复/彻底删也加门禁 | 维持现状（视图下列表为空天然安全） | 直接调 API（curl/脚本）可绕过"列表为空"；门禁是零成本的纵深防御，且能给出可读错误 |

## 4. 接口错误契约

| 端点 | 视图下响应 | 响应体 Demo |
|---|---|---|
| `POST /governance/lifecycle/presets` | 409 | `{"ok":false,"code":"VIEW_NOT_WRITABLE","error":"视图 monitor-docs 是只读聚合，不是知识库，不能作为写入目标（operation=governance-preset）。它的成员：monitor-memory、ops-wiki","view":"monitor-docs","members":["monitor-memory","ops-wiki"],"action":"governance-preset"}` |
| `DELETE /governance/lifecycle/presets/:id` | 409 | 同上 |
| `PUT /governance/trash/settings` | 409 | 同上（action=`trash-settings`） |
| `POST /governance/trash/restore` | 409 | action=`trash-restore` |
| `POST /governance/trash/purge` | 409 | action=`trash-purge` |
| `POST /governance/lifecycle/apply` | 409 | 同上（action=`event-update`，由写锁抛出） |
| 只读库（`scopeReadonly`） | 409 | `{"ok":false,"code":"SCOPE_READONLY","error":"该知识库为只读，禁止写入与导入。…","hint":"…"}` |

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 视图名 + 写请求 | 409 `VIEW_NOT_WRITABLE` + 成员清单（便于用户切库） | 是 |
| 只读库 + 写请求 | 409 `SCOPE_READONLY` + 解除命令 | 是 |
| `views.json` 损坏时写请求 | `isViewName` 返回 false（`scope-view.ts:778-788`）→ 门禁失效，但随后 `loadGroupCache` 找不到文档 → `DOC_NOT_FOUND` | 是（不会建目录：写锁内 `assertNotScopeView` 之后的 `mkdir` 仅在 import 链路） |
| 前端已禁用但仍收到 409 | 前端按 `code` 显示 hint，不弹原始 message | 是 |

## 6. 验收

1. 视图下直连 `curl` 上述 7 个端点，全部 409 且 `code` 正确；
2. 修复前后对比 `ls ~/.ki-data/`：修复前用 `just-test` 复现出 `just-test/` 目录，修复后不再产生；
3. 单测：`test/governance-view.test.ts` 覆盖 4 个裸写端点 + 2 个写锁端点；
4. 回归：`test/governance-routes.test.ts`、`test/governance-refs-route.test.ts`、`test/trash-service*.test.ts` 全绿。
