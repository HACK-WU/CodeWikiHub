---
id: REQ-20261124-002
feature: ki-client 取件客户端
status: 设计中
created: 2026-11-24
updated: 2026-11-24
version: 1
tags: [feat, integration]
author: AI
document_type: design
---

# S-01 只读通道基础（开关 / 能力位 / 留痕 / 用量）

**父文档**：[DESIGN.md](DESIGN.md) ｜ **需求**：[requirement.md](../requirement.md) R3 / R4 + Q1 / Q2

## 1. 术语

| 术语 | 定义 |
|---|---|
| `downloadApi` | 读出口独立开关。`false` 时 `/open/v1/asset` 与 `/open/v1/doc` 一律 404（不泄露存在性），`ping` 不受影响。**作用域仅限 `/open/v1` 程序通道**：Web 侧 `/api/asset` 的浏览能力不受影响（既有能力，非本需求引入）——关闭它等于「停掉程序化取件」，不是「停掉所有读」（推演 P9） |
| `contractVersion` | 契约版本整数。仅破坏性变更才 +1，初值 `1` |
| `capabilities` | `{ download: { asset: boolean, doc: boolean }, maxAssetSize: number }` |
| 留痕 | 每次成功下载写一行结构化日志（stderr），含 token 前 8 位、scope、端点、路径、字节数 |
| `download` 计量 | usage 新增的第三维度，只做用量展示，**不参与 heat 计算** |

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/lib/open-api/index.ts:58-68` | 路由表仅 4 条（`ping` / `import/upload` / `import/status` / `events`） |
| `src/lib/open-api/index.ts:71-73, 86-90` | `isUploadPath()` 只拦上传；开关关闭时连鉴权都不做，直接 404 |
| `src/lib/open-api/routes/ping.ts:24-67` | 返回 `tokenId / scopes / readOnly / uploadApi / limits`，无版本与能力位 |
| `src/lib/open-api/constants.ts` | 只有前缀与上传路径常量，无版本号 |
| `src/lib/scope-usage.ts:34` | `UsageKind = 'read' \| 'write'` |
| `src/lib/scope-usage.ts:49-56` | `DayBucket = [read, write]` 二元组；累加点 `:151-152`、合并点 `:180` / `:197` |
| `src/lib/scope-usage.ts:220-237` | `readScopeUsage()` 聚合 `bucket[0]/[1]`；`ScopeUsageSnapshot` (`:37`) 只有 `read/write` |
| `src/lib/config-schema.ts:421-425` | `mcp.http` 段已有 `uploadMaxBytes` 等；开关 `uploadApi` 沿同一段的读取方式 |

## 3. 方案（TO-BE）

1. **配置**：`mcp.http` 新增 `downloadApi`（boolean，**默认 `true`**，Q1 拍板）。关闭时两个读端点 404，`ping` / `events` 照常可用。
2. **分发器**：`open-api/index.ts` 新增 `isDownloadPath(pathname)`（匹配 `/open/v1/asset`、`/open/v1/doc`），在现有开关判定处并列插入一段 404 分支；**不改变鉴权顺序**（仍是「开关 → 鉴权 → 路由」）。
3. **版本与能力位**：`open-api/constants.ts` 新增 `CONTRACT_VERSION = 1` 与 `OpenApiCapabilities` 类型；`ping` 追加两个字段。
4. **留痕**：新增 `src/lib/open-api/audit.ts::logDownload()`，**只写 stderr**，不落盘、不建目录。
5. **用量**：`UsageKind` 增 `'download'`；`DayBucket` 由二元组扩为三元组 `[read, write, download]`；聚合快照增 `download` 字段；heat 计算**只用 `[0]/[1]`**。

```
src/lib/open-api/
├── index.ts          # [修改] 新增 isDownloadPath 与开关分支
├── constants.ts      # [修改] CONTRACT_VERSION / OpenApiCapabilities
├── audit.ts          # [新增] logDownload
└── routes/
    └── ping.ts       # [修改] 追加 contractVersion / capabilities
src/lib/scope-usage.ts # [修改] UsageKind / DayBucket / 聚合 / 合并
src/lib/config-schema.ts # [修改] mcp.http.downloadApi
```

## 4. 接口设计

### `GET /open/v1/ping`（扩展现有）

| 项 | 内容 |
|---|---|
| 方法/路径 | `GET /open/v1/ping`（不变） |
| 鉴权 | `Authorization: Bearer <token>`（不变，不读 Cookie） |
| 入参 | `scope?`（可选，查该库上限） |
| 返回 | 200 JSON，**在原有字段上追加** `contractVersion`、`capabilities`；`capabilities.maxAssetSize` 按入参 `scope` 取值，**未带 `scope` 时为 `null`**（不拿默认库的上限冒充） |
| 异常 | 401 `OPEN_API_TOKEN_REQUIRED` / `OPEN_API_TOKEN_INVALID`；405 非 GET |

```json
// Demo 返回示例（仅示意格式）
{
  "ok": true,
  "contractVersion": 1,
  "capabilities": { "download": { "asset": true, "doc": true }, "maxAssetSize": 5242880 },
  "tokenId": "tok_ab12…",
  "readOnly": false,
  "uploadApi": true,
  "scopes": ["prod"],
  "limits": { "maxFileSize": 1048576, "uploadMaxBytes": 33554432 }
}
```

### 版本协商与降级规则（客户端判定口径，契约的一部分）

| 服务端状态 | 客户端应判定 | 对外表现 |
|---|---|---|
| `contractVersion` 缺失（旧服务端） | 视为 `0` = 不支持任何 v1 取件能力 | 报 `CONTRACT_TOO_OLD`，提示「升级服务端」，**不得**按 undefined 继续尝试取件 |
| `contractVersion` > 客户端已知最大值 | 按已知能力子集工作，忽略多余字段 | 正常取件，仅日志提示服务端契约更新 |
| `capabilities.download` 缺失 | 视为 `{ asset: false, doc: false }` | 同 `CONTRACT_TOO_OLD` |
| `capabilities.download.asset=false` | 不发起 asset 取件 | 直接提示「服务端未开放附件下载」 |

> 归属说明：判定逻辑实现在`ki-client` 子包，但**判定口径属契约**，写在此处以避免两侧各自理解（推演 P2）。

### 内部函数

```ts
// src/lib/open-api/constants.ts
export const CONTRACT_VERSION = 1;
export interface OpenApiCapabilities {
  download: { asset: boolean; doc: boolean };
  maxAssetSize: number;
}

// src/lib/open-api/index.ts
export function isDownloadPath(pathname: string): boolean; // /open/v1/asset | /open/v1/doc

// src/lib/open-api/audit.ts
export interface DownloadAuditEvent {
  tokenId: string;        // 只写前 8 位 + '…'
  scope: string;
  endpoint: 'asset' | 'doc';
  path: string;           // asset: group/path；doc: group/relation
  bytes?: number;         // doc 端点可缺省
  status: number;
}
export function logDownload(ev: DownloadAuditEvent): void; // 失败无声，不影响响应

// src/lib/scope-usage.ts
export type UsageKind = 'read' | 'write' | 'download';
```

## 5. 数据模型

`{dataDir}/.ki-usage/scope-usage.json`：

```jsonc
{
  "v": 1,
  "updatedAt": "2026-11-24T08:00:00.000Z",
  "scopes": {
    "prod": {
      "firstSeen": "2026-11-12",
      "lastUsedAt": 1795505121915,
      "days": { "2026-11-24": [12, 3, 7] }   // [read, write, download]，第三位新增
    }
  }
}
```

- **兼容**：旧文件 `days` 值为长度 2，读取时按 `bucket[2] ?? 0` 处理，不改 `v`、不迁移。
- **heat（落地依据）**：冷热计算的入口是 `src/lib/scope-heat.ts:79 computeHeat(entries: HeatEntry[])`，其入参结构 `HeatEntry` 只有 `{scope, read, write, lastUsedAt}`，判活与打分都用 `read + write`（`:83`、`:95`）。因此**约束点在聚合层**：`readScopeUsage()`（`scope-usage.ts:220`）返回的 `read` 字段**只累加 `bucket[0]`**，`download` 单独成字段；只要不把 `bucket[2]` 并进 `read`，heat 天然不受影响。
- `ScopeUsageSnapshot`（`scope-usage.ts:37`）追加 `download: number`，消费方可忽略（`/api/scope/list` 与 `ki_scope_list` 的 `usage` 会多出该字段，属追加式变更）。
- **上限逻辑不变**：`entries.size` 与落盘侧 key 数兜底（`:347-350`）不受影响。

## 6. 关键决策点

| 决策 | 选择 | 被否决方案 | 否决理由 | 重评触发 |
|---|---|---|---|---|
| 读出口开关 | 独立 `downloadApi` | ① 复用 `uploadApi` ② 不做开关 | ① 写污染库、读是数据外流，风险不同向 ② 读面全开等于 token 泄露即全库可拉 | 若 3 个月内只出现过「两开关总是一起关」→ 合并 |
| 留痕落地 | stderr 结构化一行 | ① JSONL 文件 ② 写 meta / 库表 | ① 需新增目录 + 轮转 + 清理策略，收益不足 ② 污染知识数据 | 需要按 token 出审计报表时改落文件 |
| 用量计量 | 新增 `download` 维度 | 直接记 `read` | 记 read 会把冷库刷热，污染评分衰减与冷热判定 | 产品若决定「下载也算使用热度」→ 并入 read |
| 能力位粒度 | 一次给全 `{asset, doc}` | 只给 `downloadApi: boolean` | 客户端需按端点降级；一次给全避免 S-03 再改 `ping` 形状 | 无 |
| 版本号 | 常量 `1`，硬编码 | 读 `package.json` 版本 | 契约版本与发布版本解耦，否则每次发版都「契约变更」 | 无 |

## 7. 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| `downloadApi=false` | 404 `OPEN_API_NOT_FOUND`（与路径不存在同语义） | 是 |
| 未带 token | 401 `OPEN_API_TOKEN_REQUIRED`（复用 `auth.ts`） | 是 |
| 只读 token 访问 GET | 放行 | — |
| 只读 token 发 POST | 405（复用 `auth.ts` 只读拦 GET/HEAD 逻辑） | 是 |
| `logDownload` 内部异常 | 吞掉，响应照常 | 否 |
| `recordScopeUsage` 异常 | 吞掉（现有实现已 try/catch） | 否 |
| daemon 身份漂移 | 读端点**不**走 `assertDaemonIdentityCurrent`（仅上传路径有该守卫），保持 ping 同级可用 | 是 |

## 8. 影响范围

| 文件 | 改动 | 风险 |
|---|---|---|
| `src/lib/open-api/index.ts` | 新增开关分支 + `isDownloadPath` | 开关顺序错会把 `ping` 一起关掉 → 必须有测试覆盖 |
| `src/lib/open-api/routes/ping.ts` | 追加两字段 | 低（追加式） |
| `src/lib/open-api/constants.ts` / `audit.ts` | 新增 | 无 |
| `src/lib/scope-usage.ts` | `UsageKind` / `DayBucket` / 聚合 | 中：**所有累加与合并点必须同步**（`:151-152`、`:180`、`:197`、`:235-237`），漏一处即丢计数 |
| `src/lib/config-schema.ts` | 新增 `downloadApi` | 低（缺省 true，旧配置无需改） |
| `/api/scope/list` 消费方 | usage 多一个 `download` 字段 | 低（追加字段，前端可忽略） |

**测试要求**：开关两态 × 两个端点 404/200；`ping` 新旧字段共存；三元组桶的「旧文件读入 → 新增 download → 再合并」不丢数。
