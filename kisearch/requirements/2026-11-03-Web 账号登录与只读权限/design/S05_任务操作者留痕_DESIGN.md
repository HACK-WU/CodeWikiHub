---
id: REQ-20261103-001
feature: Web 账号登录与只读权限
status: 设计中
created: 2026-11-03
updated: 2026-11-03
version: 1
tags: [auth, web, security, ux]
depends_on: []
author: AI
document_type: design
---

# S-05 任务操作者留痕

> 父设计：[DESIGN.md](./DESIGN.md)
> 依赖：S-02（Principal）
> 关联需求：[requirement.md](../requirement.md)

## 1. 术语

| 术语 | 含义 |
|---|---|
| `source` | 任务来源通道：`cli` / `daemon` / `web` / `scheduler`（既有字段） |
| `operator` | 任务发起者快照：谁触发了这次任务（本设计新增） |
| 快照 | 创建任务时写入，之后不随用户名/角色变化 |
| 旧任务 | 本功能上线前创建、没有 `operator` 字段的任务 |

## 2. 现状（AS-IS）

- `TaskRecord` 定义在 `src/lib/task-registry.ts:133-155`，只有 `source`，没有操作者。
- `createTaskReporter()` 在 `src/lib/task-registry.ts:519-540` 创建记录；输入只有 `id/source/operation/scope/retryOf`。
- 任务创建点 10 处（8 个文件/入口）：
  - `src/import.ts:185`（CLI 导入）
  - `src/restore.ts:490,701`（CLI 还原/重建）
  - `src/datasource.ts:503`（CLI 数据源同步）
  - `src/lib/daemon-rpc.ts:396`（CLI 经 daemon RPC）
  - `src/lib/datasource-scheduled-run.ts:112`（定时同步）
  - `src/lib/mcp-http-api.ts:310`（Web job，导入等）
  - `src/lib/mcp-http-api.ts:2558`（Web 数据源同步）
  - `src/lib/mcp-http-api.ts:2605`（添加 Git 源后的首次同步）
  - `src/lib/mcp-http-api.ts:2764`（Web 添加 Git 源）
- 任务列表列：状态 / 任务 / 知识库 / 来源 / 结果摘要 / 开始时间 / 持续时间（`web/src/pages/TasksPage.tsx:891-958`）。
- 任务详情已有「来源」行（`web/src/lib/taskDetailModel.ts:305-308`），没有「操作者」。
- `ki log` 展示任务元信息，但没有操作者（`src/lib/task-log-view.ts`）。

## 3. 方案（TO-BE）

### 3.1 数据模型

```ts
export type TaskOperatorType = 'user' | 'local' | 'cli' | 'daemon' | 'token' | 'scheduler' | 'legacy';

export interface TaskOperator {
  type: TaskOperatorType;
  label: string;         // 展示用，最长 80 字符
  userId?: string;       // type='user' 时的账号 ID
  tokenId?: string;      // type='token' 时的 Token 短 ID
}

export interface TaskRecord {
  // ...既有字段
  operator?: TaskOperator;  // 旧记录缺失 ⇒ 视为 legacy
}
```

- 写入：`createTaskReporter(config, input)` 的 `input.operator` 必填（新调用点）；内部 `sanitizedText` 清洗 `label`。
- 不可变：`TaskPatch` 白名单不包含 `operator`，创建后不能改。
- 重试：重试任务使用**当前操作者**，不继承原任务。
- 旧任务：缺失时前端/CLI 显示 `—`，不做推断回填。

### 3.2 创建点映射

| 创建点 | source | operator |
|---|---|---|
| `src/import.ts:185` | `cli` | `{ type:'cli', label:'本机 CLI' }` |
| `src/restore.ts:490,701` | `cli` | `{ type:'cli', label:'本机 CLI' }` |
| `src/datasource.ts:503` | `cli` | `{ type:'cli', label:'本机 CLI' }` |
| `src/lib/daemon-rpc.ts:396` | `cli` | `{ type:'cli', label:'本机 CLI' }`（由 CLI 发起） |
| `src/lib/datasource-scheduled-run.ts:112` | `scheduler` | `{ type:'scheduler', label:'定时同步' }` |
| `src/lib/mcp-http-api.ts:310` | `web` | 当前 principal：`local` → `{type:'local',label:'本机'}`；`session` → `{type:'user',label:username,userId}`；`token` → `{type:'token',label:'Token <短ID>',tokenId}` |
| `src/lib/mcp-http-api.ts:2558` | `web` | 同上（发起同步的 principal） |
| `src/lib/mcp-http-api.ts:2605` | `web` | 同上（发起添加 Git 源的 principal） |
| `src/lib/mcp-http-api.ts:2764` | `web` | 同上 |

> `source` 与 `operator` 是正交的：`source='web'` 既可能是本机管理员，也可能是远程 editor/viewer；`operator` 才能回答“谁”。

### 3.3 Principal → Operator

```ts
function operatorFromPrincipal(p: Principal): TaskOperator {
  if (p.kind === 'local-admin') return { type: 'local', label: '本机' };
  if (p.kind === 'session') return { type: 'user', label: p.username, userId: p.userId };
  if (p.kind === 'token') return { type: 'token', label: `Token ${p.tokenId ?? '临时'}`, tokenId: p.tokenId };
  return { type: 'legacy', label: '—' };
}
```

- 该函数放在 S-03 的 principal 模块或 `task-registry.ts`，**只能由服务端调用**。
- `createJob` / `handleDatasourceSync` / `handleDatasourceAddRemote` 需要新增 `operator` 形参，由路由层传入。

### 3.4 API 契约

`GET /api/tasks` 与 `GET /api/tasks/:id` 的 `TaskRecord` 直接包含 `operator`：

```json
{
  "ok": true,
  "tasks": [
    {
      "id": "0d9f...",
      "source": "web",
      "operation": "datasource-sync",
      "scope": "verify-scroll",
      "state": "succeeded",
      "operator": { "type": "user", "label": "alice", "userId": "a7Kp2mQx" },
      "createdAt": 1760000000000
    }
  ],
  "total": 2,
  "retainedForMs": 604800000
}
```

- 不接受客户端传 `operator`；请求体里出现该字段直接忽略。
- `operator` 对所有可读任务的账号可见（admin/editor/viewer 均可）。

### 3.5 展示

| 位置 | 变更 |
|---|---|
| 任务列表 | 「来源」后新增「操作者」列；`TaskListRowView` 增加 `operatorLabel` / `operatorTitle`；`ariaLabel` 包含操作者；搜索 haystack 包含操作者 |
| 任务详情 | 「本次参数」或「来源」行旁新增「操作者」行；无 `datasource.read` 的账号看不到 `source` / `remoteUrl` / `subdir` 等数据源参数（由服务端脱敏） |
| `ki log` | `LogTaskView.operator`，输出「操作者：alice」；旧日志显示 `—` |
| 任务日志头行 | `TaskLogHead` 增加 `operator`；旧日志缺失时解析容错 |

显示口径：

| operator.type | 展示 |
|---|---|
| `user` | 用户名（如 `alice`） |
| `local` | `本机` |
| `cli` | `本机 CLI` |
| `daemon` | `后台服务` |
| `token` | `Token <短ID>`（如 `Token ab12cd34`） |
| `scheduler` | `定时同步` |
| `legacy` / 缺失 | `—` |

### 3.6 权限与删除边界

- `tasks.read`：admin / editor / viewer 都可看任务与操作者。
- `tasks.cancel`：仅 admin；editor/viewer 不显示取消按钮，接口 403。
- `tasks.delete`：预留能力，仅 admin；**当前没有任务记录删除路由**。
- 任务详情页的「待删除文档」卡片保持只读；删除只在数据源页由 `datasource.delete`（admin）执行。
- 未来新增任务删除接口必须登记 `tasks.delete`，否则默认 403。

### 3.7 前端布局影响

- `web/src/lib/taskListModel.ts`：新增 `operatorLabel` / `operatorTitle`。
- `web/src/pages/TasksPage.tsx`：新增 `<th>` / `<td>`，位置在「来源」之后；`ariaLabel` 与搜索输入包含操作者。
- `web/src/lib/taskDetailModel.ts`：详情 rows 新增「操作者」。
- `web/src/styles/ki.css`：任务表 `th:nth-child` 宽度重排；`≤880` 隐藏操作者列（建议），`≤760` 沿用任务列回退行承载摘要；需在 1920 / 1440 / 1200 / 880 / 375 五档实测不溢出。
- `ki log`：`src/lib/task-log-view.ts` / `src/log.ts` 输出新增一行。

### 3.8 关键决策

| 决策 | 采用 | 被否决方案 | 否决理由 |
|---|---|---|---|
| 存储方式 | 创建时快照 | 查询时按 userId join | 用户删除/改名/角色变化会让历史失真 |
| 可见性 | 三类账号都可见 | 仅管理员可见 | 用户已确认透明可追溯 |
| 展示位置 | 列表列 + 详情行 + CLI | 只放详情 | 列表是排查主入口，缺列要逐条点开 |
| Token 展示 | Token 短 ID | 统一显示「MCP」 | 多 Token 场景无法定位是谁 |
| 旧任务 | 显示 `—` | 按 source 推断回填 | 推断会伪造事实，审计不可靠 |

### 3.9 异常处理

| 场景 | 行为 |
|---|---|
| 旧任务无 operator | 显示 `—`；API 不返回该字段；不报错 |
| operator.label 含换行/控制字符 | 服务端 `sanitizedText` 压成单行，最长 80 字符 |
| 用户被删除后查看历史任务 | 仍显示创建时的用户名快照（不 join） |
| 任务创建时 principal 为空 | 不允许；调用点必须传 operator；测试兜底 |
| `ki log` 读取旧日志头 | 容忍缺字段，操作者显示 `—` |

### 3.10 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/task-registry.ts` | 新增 `TaskOperator`、`operator` 字段、reporter 输入、序列化 |
| `src/lib/task-log.ts` / `task-log-view.ts` | 日志头与 CLI 视图增加 operator |
| `src/import.ts` / `restore.ts` / `datasource.ts` / `daemon-rpc.ts` / `datasource-scheduled-run.ts` | 创建点传 operator |
| `src/lib/mcp-http-api.ts` | `createJob` / sync / add-remote 传 principal 的 operator |
| `web/src/lib/taskListModel.ts` / `taskDetailModel.ts` / `TasksPage.tsx` | 列、详情、搜索、aria |
| `web/src/styles/ki.css` | 列宽与断点 |
| `test/task-registry.test.ts` / `task-operator.test.ts` / `task-log-cli.test.ts` | 新增/更新 |

### 3.11 验收标准

- Web 管理员/editor/viewer 触发任务后，列表/详情显示对应用户名。
- 本机管理员显示「本机」；CLI 显示「本机 CLI」；定时同步显示「定时同步」；MCP Token 任务显示 `Token <短ID>`。
- 旧任务显示 `—`，不报错、不回填。
- 重试任务显示当前操作者，不继承原任务。
- 任务列表在 1440 / 1200 / 880 / 375 无横向溢出；≤880 操作者列隐藏，详情仍可见。
- editor/viewer 看不到任务取消按钮，调取消接口 403；任务详情无删除入口。
