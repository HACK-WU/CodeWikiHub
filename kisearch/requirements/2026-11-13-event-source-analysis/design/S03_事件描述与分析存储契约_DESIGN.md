---
id: REQ-20261113-003
feature: 事件源码分析（只读）· S-03 事件描述与分析存储契约
status: 设计中
created: 2026-11-16
updated: 2026-11-16
version: 1
tags: [设计, S-03, 事件模型, 契约]
depends_on: [REQ-20261113-004]
author: AI
document_type: design
---

# S-03：事件描述与分析存储契约设计

## 1. 术语

跨子需求共享术语见父文档 `DESIGN.md` §4.3（`EventAnalysisDoc`、`AnalysisDraft`、`ConfirmedCodeLocation`、`AnalysisStepRecord`）。本子需求特有术语：

| 术语 | 含义 | 引用 |
|---|---|---|
| `EVENT_DESCRIPTION_MAX_CHARS` | 事件可选描述长度上限（4000 字符） | — |
| `CodeLocationPreview` | 暴露给 `ki_event_list` 的精简代码位置摘要（`file / line / why` 截断），防爆上下文 | — |
| `analysis-store.ts` | 专责读写 `{scope}/.events/{eventId}.analysis.json` 的存储模块 | — |

---

## 2. 现状（AS-IS）

### 2.1 现状描述

- **事件主体（`src/lib/events/types.ts:44-59`）**：`EventRecord` 包含 `id / shortId / scope / title / typeId / stageKey / stageIndex / closedAt / revision / createdAt / updatedAt`，**缺少 `description` 字段**；`PATCH /api/governance/events/:id`（`governance-http.ts:391`）仅调 `updateEventTitle` 改标题。
- **分文件存储先例（`src/lib/events/refs-store.ts`）**：参考文档单独存 `{eventId}.refs.json`，避免高频增删引用与低频状态流转写同一文件互相覆盖。
- **契约与错误码约束（`test/governance-contract.test.ts`）**：前后端 DTO（`src/lib/governance-contract.ts` ↔ `web/src/api/governanceContract.ts`）逐字段机械比对一致；`GOVERNANCE_CODE_NUMBERS`（`src/lib/governance-errors.ts`）规定了分段号段校验，当前仅到 `1599`。

### 2.2 痛点

- 痛点 1：没有「事件描述」区，无法沉淀详细的报错堆栈/复现条件，冷启动分析缺少上下文线索。
- 痛点 2：分析任务异步运行可能历时 90s，若把运行态和草稿塞进 `{eventId}.json`，期间用户改阶段/流转会与后台写入发生竞态覆盖。
- 痛点 3：需要扩展事件详情、列表接口与 `ki_event_list` 的同时保证前后端契约与错误码号段守卫不破。

---

## 3. 方案（TO-BE）

### 3.1 方案概述

> 默认假设：本子需求默认单机存储、单 scope 事件数 ≤ 数千级（`listEvents` 对分页后 ≤100 条事件按需读取 `.analysis.json` 预览，不对过滤前全量事件读盘）。

1. 在 `EventRecord` 新增可选 `description?: string`（≤ 4000 字符），扩展 `createEvent` 与 `PATCH /api/governance/events/:id`（支持同原子 `revision` 更新 `title` 和/或 `description`）；
2. 新增 `src/lib/events/analysis-store.ts` 独立读写 `.events/{eventId}.analysis.json`，并在 `deleteEvent` 时联动删除；
3. 扩展 `GOVERNANCE_CODE_NUMBERS` 增加 `1600–1699`（AI 分析专段），同步更新前后端契约 DTO 与 `ki_event_list` 输出投影。

### 3.2 关键决策点

| 决策 | 选择 | 理由 | 备选方案 | 否决原因 | 重新评估触发条件 |
|---|---|---|---|---|---|
| **草稿与代码位置存放位置** | 独立文件 `{eventId}.analysis.json` | 复用 `.refs.json` 同款设计，后台异步写运行态与前端流转/改描述写 `{eventId}.json` 完全物理隔离，零互相覆盖风险 | 直接挂在 `EventRecord`（`{eventId}.json`） | 异步分析 90s 期间用户流转阶段或改标题，`revision` 会冲突或被旧快照覆盖 | 迁移到统一数据库事务引擎（SQLite/PG）时 |
| **`ki_event_list` 透出粒度** | 透出已确认位置前 `N` 条预览（默认 5，上限 10）+ `codeLocationTotal`，**不透出草稿和代码片段 `snippet`** | 满足 Q5「`ki_event_list` 可见」同时守住 `event-list.ts` 防爆上下文上限约定（R42）；草稿未确认不是事实 | 返回全部已确认位置的完整 `snippet` 与草稿 | 单个事件确认 10 处带代码片段即可占数 KB，100 条事件列表会撑爆 AI 上下文 | 外部 MCP 需要 `ki_event_detail` 单条读取全量位置时 |
| **分析错误码归属** | 在 `GOVERNANCE_CODE_NUMBERS` 开 `1600–1699` 专段，同步放宽 `governance-contract.test.ts` 区间至 `1000–1699` | 遵循号段隔离原则，不把新业务码混入 `15xx` 通用层或挤占 `14xx` 参考文档段 | 直接复用字符串错误不进 `GOVERNANCE_CODE_NUMBERS` | 破坏错误码统一登记与防撞码机械校验 | 治理模块拆出独立错误表时 |

---

## 4. 数据模型 & 接口设计

### 4.1 持久化结构

#### 1) `EventRecord` 扩展（`src/lib/events/types.ts`）

```typescript
export const EVENT_DESCRIPTION_MAX_CHARS = 4000;

export interface EventRecord {
  // ...既有字段不变...
  title: string;
  description?: string; // [新增] 可选事件描述（trim 后空串不落或删去），≤ 4000 字
  // ...
}
```

#### 2) `.events/{eventId}.analysis.json`（`src/lib/events/types.ts` & `analysis-store.ts`）

```typescript
export type AnalysisRunStatus = 'running' | 'ready' | 'partial' | 'failed';

export interface AnalysisCandidate {
  id: string;                 // 稳定候选 id（如 cand_1）
  file: string;               // 相对 targetDir 的 posix 路径
  line: number;               // 1-based 起始行
  endLine?: number;           // 可选结束行
  snippet: string;            // 命中的代码片段摘要（≤ 600 字符）
  why: string;                // 因果判断依据
  confidence: number;         // 0..1 置信度
}

export interface AnalysisStepRecord {
  name: string;               // 步骤键（context | explore | summarize | verify 等）
  title: string;              // 展示标题
  ms: number;
  metrics: Record<string, number | string>;
  detail?: Record<string, unknown>;
  calls?: Array<{
    kind: 'tool' | 'skill';
    name: string;
    label: string;
    ms: number;
    note?: string;
  }>;
}

export interface AnalysisStats {
  turns: number;
  filesRead: number;
  tokens: number;
  ms: number;
}

export interface AnalysisDraft {
  runId: string;
  bootId?: string;            // 发起该任务的 daemon 进程实例 UUID（重启后即时识别僵尸 running）
  status: AnalysisRunStatus;
  targetDir: string;
  commit: string | null;
  errorCode?: string;
  errorMessage?: string;
  candidates: AnalysisCandidate[];
  unconfirmed: string[];
  steps: AnalysisStepRecord[];
  stats: AnalysisStats;
  startedAt: number;
  updatedAt: number;
}

export interface ConfirmedCodeLocation {
  id: string;                 // loc_<ts>_<rand>
  file: string;
  line: number;
  endLine?: number;
  snippet: string;
  why: string;
  confidence: number;
  targetDir: string;
  commit: string | null;
  confirmedAt: number;
}

export interface EventAnalysisDoc {
  version: 1;
  eventId: string;
  draft: AnalysisDraft | null;
  confirmed: ConfirmedCodeLocation[];
  updatedAt: number;
}
```

### 4.2 新增错误码与 HTTP / MCP 接口

**`GOVERNANCE_CODE_NUMBERS` 新增 `1600–1699`（`src/lib/governance-errors.ts`）**：
- `ANALYSIS_ALREADY_RUNNING: 1601` (409)
- `ANALYSIS_TARGET_NOT_CONFIGURED: 1602` (400)
- `ANALYSIS_TARGET_UNREADABLE: 1603` (400)
- `ANALYSIS_TOOLS_ALL_DISABLED: 1604` (400)
- `ANALYSIS_DISCLOSURE_REQUIRED: 1605` (403)
- `ANALYSIS_LLM_UNAVAILABLE: 1606` (503)
- `ANALYSIS_TOOLS_UNSUPPORTED: 1607` (400)
- `ANALYSIS_RATE_LIMITED: 1608` (429)
- `ANALYSIS_TARGET_SYNCING: 1609` (409)
- `ANALYSIS_DRAFT_NOT_FOUND: 1610` (404)
- `ANALYSIS_LOCATION_NOT_FOUND: 1611` (404)

**接口清单（全部注册进 `src/lib/auth/route-permissions.ts`，且所有 `/governance/events/[^/]+/analysis*` 子路径规则必须排在 `/governance/events/[^/]+$` 之前）**：

| 方法与路径 | 权限 | 入参 | 返回 Demo / 形状 |
|---|---|---|---|
| `POST /api/governance/events` | `knowledge.write` | `{ scope, title, description?, typeId, stageKey? }` | `{ ok: true, scope, event }` |
| `PATCH /api/governance/events/:id` | `knowledge.write` | `{ scope, title?, description?, revision }` | `{ ok: true, scope, event }`（标题或描述任一可改，带 `revision` 乐观锁） |
| `GET /api/governance/events/:id` | `knowledge.read` | `?scope=` | 原响应新增 `analysis: { draft: AnalysisDraft \| null, confirmed: ConfirmedCodeLocation[] }` |
| `GET /api/governance/events/:id/analysis` | `knowledge.read` | `?scope=` | `{ ok: true, scope, eventId, draft, confirmed }` |
| `POST /api/governance/events/:id/analysis/confirm` | `knowledge.write` | `{ scope, candidateIds: string[], expectedRunId?: string, discardDraft?: boolean }` | `{ ok: true, scope, added: number, confirmed: ConfirmedCodeLocation[], draft: AnalysisDraft \| null }`（按 `file+line` 去重；若传 `expectedRunId` 且与当前 `draft.runId` 不符返回 409 `REVISION_CONFLICT`） |
| `DELETE /api/governance/events/:id/analysis/draft` | `knowledge.write` | `?scope=` | `{ ok: true, scope, cleared: true }` |
| `DELETE /api/governance/events/:id/analysis/confirmed/:locId` | `knowledge.write` | `?scope=` | `{ ok: true, scope, removed: true, confirmed }` |
| `ki_event_list`（MCP 工具） | 只读 | 新增可选 `locations_preview_limit?: number`（默认 5，上限 10） | 每个事件追加 `codeLocationTotal: number`、`codeLocationsPreview: [{ file, line, endLine?, why, commit? }]` |

```json
// Demo 返回示例：GET /api/governance/events/:id/analysis
{
  "ok": true,
  "scope": "kisearch-memory",
  "eventId": "evt_123",
  "draft": {
    "runId": "run_abc",
    "status": "ready",
    "targetDir": "/root/knowledge-indexer",
    "commit": "a1b2c3d",
    "candidates": [
      {
        "id": "cand_1",
        "file": "src/lib/auth/guard.ts",
        "line": 128,
        "endLine": 135,
        "snippet": "const user = getToken(req);",
        "why": "未判空直接读取 user.id",
        "confidence": 0.86
      }
    ],
    "unconfirmed": ["未找到上层全局异常兜底拦截点"],
    "steps": [],
    "stats": { "turns": 4, "filesRead": 4, "tokens": 3200, "ms": 24500 },
    "startedAt": 1763260000000,
    "updatedAt": 1763260024500
  },
  "confirmed": []
}
```

### 4.3 契约变更声明

| 变更类型 | 接口 | 变更内容 | 影响的子需求 |
|---|---|---|---|
| 修改 | `EventRecord` / `governance-contract.ts` / `governanceContract.ts` | 新增 `description?` 与分析 DTO 接口集 | S-04, S-05 |
| 修改 | `GOVERNANCE_CODE_NUMBERS` | 新增 `1600–1699` 专段 | S-04, S-05 |
| 修改 | `ki_event_list` | 返回 `codeLocationTotal` 与 `codeLocationsPreview` | — |

---

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `description` 超过 4000 字符 | 返回 400 参数校验错误（写明当前与上限字符数） | 是 |
| `PATCH /events/:id` 或确认草稿时 `revision` 不匹配 / 事件不存在 | 返回 409 `REVISION_CONFLICT` / 404 `EVENT_NOT_FOUND` | 是 |
| `.analysis.json` 损坏导致 JSON 解析失败 | 记 warn 降级为空 `{ draft: null, confirmed: [] }`，不让整个事件详情页 500 | 否（服务端日志 warn） |
| 后台写 `draft` 进度/终态与用户确认/删除 `confirmed` 并发 | 所有 `.analysis.json` 写操作通过短写锁串行读-改-写；后台更新 `draft` 仅替换 `draft` 字段并校验磁盘 `draft?.runId === runId`，绝不覆盖在途写入的 `confirmed[]` | 否 |
| 勾选确认时某 `candidateId` 已不在草稿（或草稿不存在） | 若草稿缺失抛 404 `ANALYSIS_DRAFT_NOT_FOUND`；已存在的 `file+line` 幂等跳过不重复写入 | 是 |
| `deleteEvent` 执行删除事件 | 同步调用 `removeAnalysisFile(scope, event.id)` 清理 `.analysis.json` | 否 |

---

## 8. 测试方案

| 类型 | 范围 | 工具 |
|---|---|---|
| 契约测试 | `test/governance-contract.test.ts`：前后端 DTO 一致性与 `1600–1699` 号段校验 | `npx jiti` |
| 单元测试 | `test/events/analysis-store.test.ts`：描述 CRUD + `revision` 冲突、草稿读写、勾选确认与去重、丢弃草稿、删除确认位置、`deleteEvent` 联动删除、`ki_event_list` 投影预览上限 | `npx jiti` |

---

## 10. 影响范围

| 影响对象 | 影响类型 | 影响描述 | 是否破坏性变更 |
|---|---|---| :---: |
| `src/lib/events/types.ts` | 数据变更 | `EventRecord.description?` 与分析文档结构 | 否 |
| `src/lib/events/analysis-store.ts` | 新增 | `.analysis.json` 原子读写、确认、清理 | 否 |
| `src/lib/events/event-service.ts` | 行为变更 | 创建/更新事件支持 `description`；`deleteEvent` 清理分析文件 | 否 |
| `src/lib/governance-contract.ts` & `web/src/api/governanceContract.ts` | 接口变更 | 双端 DTO 同步扩展 | 否 |
| `src/lib/governance-errors.ts` | 接口变更 | 新增 `1600–1699` 分析错误码 | 否 |
| `src/lib/governance-http.ts` & `route-permissions.ts` | 接口变更 | 注册分析读写路由与描述更新逻辑 | 否 |
| `src/lib/mcp-tools/event-list.ts` | 接口变更 | 透出已确认代码位置摘要 | 否 |
| `web/src/api/governanceApi.ts` | 接口变更 | 新增前端调用封装函数 | 否 |
