---
id: REQ-20261105-001
feature: 第三方 HTTP 上传 API 与开关
status: 设计中
created: 2026-11-05
updated: 2026-11-06
version: 1
tags: [api, upload, auth, openapi, feat]
depends_on: []
author: AI
document_type: requirement
---

# 需求：第三方 HTTP 上传 API 与开关

> **设计文档**：`design/DESIGN.md`（父）+ `S01` / `S02` / `S03` + `design-review.md`
> **实施计划**：`.plans/2026-11-05-open-upload-api/`
> **依据**：2026-11-04 ~ 11-05 共 6 轮需求澄清、代码取证、设计方案拍板

## 1. 背景与目标

### 1.1 真实场景（经过六轮澄清才收敛）

使用者是 **AI Agent**。Agent 与 ki **不在同一台机器**上：

```
AI Agent 所在机器                     ki 所在机器（远端 daemon）
├── 有 MCP 工具调用能力（连远端）      ├── ki CLI 与 daemon
├── 有 shell + curl / tar             ├── 知识库与导入内核
├── 有本机文档与目录（要导入的内容）    └── Token 存储
└── ❌ 没有 ki（任何 ki 命令都不存在）
```

Agent 要做的动作是：**把本机的一份大文档或一整个目录，推给远端 ki 并完成导入。**

### 1.2 现有手段为什么都不成立

| 手段 | 为什么不成立 | 证据 |
|---|---|---|
| `ki import --source` | 前提是 ki 与文件同机；且 Agent 机器上根本没有 ki | `src/lib/import.ts:720` |
| MCP 工具 `sync_relation` | 逐篇写入，一篇一次全套开销；**且不做 chunk 切分**，大文档只落 1 个巨型向量，检索质量差 | `src/sync-relation.ts:1085-1098`、`:1373-1377` |
| MCP 工具 `bulk_sync_relation` | 一次最多 50 条，正文要 Agent 逐条塞进参数（烧上下文） | `src/lib/mcp-tools/bulk-sync-relation.ts:17` |
| 现有 `POST /api/import/upload` | 只吃 JSON + base64，`curl -F` 用不了；请求体 16MB、单文件默认 1MB | `src/lib/mcp-http-api.ts:415-440`、`:156`、`src/lib/import.ts:440` |
| 数据源 `directory` 定时同步 | 前提是目录在 ki 同机 | `src/lib/datasource-types.ts:13` |

**结论：Agent 侧唯一可用通道 = 标准 HTTP（curl 能直接发），而现有上传接口对标准 HTTP 客户端不可用。**

### 1.3 第二个诉求：能关掉这个通道

给第三方程序开放的写入口，必须可控：**默认开启，但允许运维关闭**，且关闭不能影响前端 Web 与 MCP 工具。

### 1.4 目标（可观测）

1. Agent 只看文档就能写出可用的 `curl` / `tar | curl` 命令，完成上传与导入，**全程不把文件内容读进上下文**。
2. 该通道**强制 Bearer Token**：无 Cookie、无匿名、**本机回环也不例外**。
3. 默认开启，`--no-upload-api` 可关闭；关闭后前端 `/api/*` 与 MCP 工具**零影响**。
4. 导入复用现有内核（切分 / chunk / 图片附件 / group 推导 / 批量向量化），不产生第二套真相。

## 2. 范围

### 2.1 本次做

- 新增第三方程序 API 命名空间 `/open/v1/`（与 `/api/*`、`/mcp` 平级隔离）。
- `POST /open/v1/import/upload`：支持 `multipart/form-data`（多文件，`filename` 携带相对路径）与 `application/gzip`（tar 整包流式）两种形态；一步式启动导入并返回 `taskId`。
- `GET /open/v1/import/status`：按 `taskId` 查进度与结果，进程重启后可三级回落。
- `GET /open/v1/ping`：连通性与鉴权自检，回显 token 身份、授权 scope 与上限。
- Bearer-only 鉴权链路（不复用 `resolveWebPrincipal`）。
- 流式落盘（不缓冲全量）、该路由独立的请求体上限、zip-bomb 三重闸门。
- `--no-upload-api` 启动参数 + `mcp.http.uploadApi` 配置 + lock 回显 + `status` 展示 + `restart` 透传。
- `docs/mcp-http.md` 新增章节与可直接复制的 curl 示例。

### 2.2 本次不做（显式排除）

| 排除项 | 原因 |
|---|---|
| Web UI 任何改动 | 前端 `/api/*` 一个字节都不动 |
| 新增 MCP 工具 | MCP 工具读不到 Agent 本机文件，加了也解决不了问题 |
| `ki push` 之类的新 CLI 客户端 | Agent 机器上没有 ki，客户端命令不可达 |
| Token 生命周期（过期 / `lastUsedAt` / 吊销） | 与上传无强耦合，另立一期 |
| `sync_relation` 大文档 chunk 切分 | 索引质量独立问题，另立一期 |
| 上传进度 SSE 推送 | 轮询已够用 |
| 清理能力（`prune` / `skipDuplicates` / `onlyRelPaths`） | 与现有 `/api/import/prune` 的目录结构假定冲突，本期不提供 |

## 3. 角色与场景

| 角色 | 在哪台机器 | 做什么 |
|---|---|---|
| AI Agent | 本机（无 ki） | 生成并执行 `curl` / `tar \| curl`，轮询 status |
| 运维 / 开发者 | ki 所在机器 | 启动 daemon、决定是否开放上传、签发与分发 Token、调 `maxFileSize` |
| Web 浏览器用户 | 任意 | 继续使用现有 Web 导入页（本需求零影响） |

**主场景（三条，必须都走通）**

1. **一份大文档**：`curl -F "files=@big.md"` → 200 + taskId → 轮询 → 完成，`ki_search` 能命中。
2. **一个目录**：`tar czf - -C ./docs . | curl --data-binary @-` → 层级与 group 完整保留。
3. **关闭通道**：`ki mcp restart --no-upload-api` → `/open/v1/import/*` 变 404，Web 与 MCP 一切如常。

## 4. 功能需求

### 4.1 上传接口

| ID | 需求 | 说明 |
|---|---|---|
| FR-01 | `POST /open/v1/import/upload` 支持 `multipart/form-data` | `filename` 可含相对路径（`sub/a.md`）以保留目录层级；支持 RFC 5987 `filename*` 中文文件名 |
| FR-02 | 同接口支持 `application/gzip` 的 tar 整包流式 | 目录场景首选；`tar czf - -C ./docs .` 的打包根即知识库根 |
| FR-03 | 文本参数走 query（`scope`/`group`/`tags`/`vector`/`conflictMode`/`chunkSize`/`chunkOverlap`） | 便于 Agent 读文档后直接拼命令 |
| FR-04 | 一步式：上传收完即创建导入 job，返回 `taskId` + `statusUrl` | 不需要二次调用 `/run` |
| FR-05 | 部分文件失败不中断整包 | 返回 `files.saved` / `files.skipped` + 最多 10 条原因样本 |
| FR-06 | 内容落 `<uploadId>/content/`，`sourceDir` 永远是目录 | 保证 `sourcePath` 与 uploadId 无关 → Agent 重试不产生副本 |

### 4.2 状态查询

| ID | 需求 | 说明 |
|---|---|---|
| FR-07 | `GET /open/v1/import/status?taskId=` 返回 `state` / `phase` / `progress` / `result` | — |
| FR-08 | 进程重启后三级回落：内存 job → 任务台账（1h）→ 任务日志（7d）→ 才 404 | 响应带 `source: memory\|ledger\|log`，让 Agent 知道状态可信度 |
| FR-09 | 并发导入排队时返回 `waitingForScopeLock: true` + `phase='waiting'` | 区分「排队」与「卡住」，否则 Agent 会误取消或重提 |
| FR-10 | status 按 job 的 `scope` 校验 token 授权，越权 403 | 防跨 token 枚举他人任务 |

### 4.3 鉴权

| ID | 需求 | 说明 |
|---|---|---|
| FR-11 | 只接受 `Authorization: Bearer <token>` | 不读 Cookie、不做 local-admin 判定、不支持匿名 |
| FR-12 | **本机回环也必须带 token** | 与 `/api/*` 的「本机免登录」语义明确区分 |
| FR-13 | 只读 Token 调写接口 → 403 `OPEN_API_TOKEN_READONLY` | 与 MCP 通道的只读语义对齐 |
| FR-14 | 请求 scope 不在 token 授权集合 → 403（脱敏，scope 名只进服务端日志） | — |
| FR-15 | Token 复用现有存储 `~/.ki/mcp-tokens.json` | `ki mcp token create --scope x` 创建的 token 直接可用 |

### 4.4 上传开关

| ID | 需求 | 说明 |
|---|---|---|
| FR-16 | `--no-upload-api` 启动参数，默认开启 | — |
| FR-17 | 配置 `mcp.http.uploadApi`（默认 `true`），优先级 CLI > 配置 > 默认 | — |
| FR-18 | 关闭后 `/open/v1/import/*` 返回 **404**（不泄露接口存在性） | `/open/v1/ping` 不受影响，保留诊断能力 |
| FR-19 | 关闭**不影响** `/api/*`、`/mcp`、`/healthz`、静态页 | 这是本需求的硬边界 |
| FR-20 | lock 记录开关状态；`ki mcp status` 可见；`ki mcp restart` 支持透传 | 否则「关掉」要么两步走、要么重启后自己开回来 |

### 4.5 容量与安全

| ID | 需求 | 说明 |
|---|---|---|
| FR-21 | 流式落盘，不 `Buffer.concat` 全量 | 并发上传不打爆内存 |
| FR-22 | 该路由独立的请求体上限 `mcp.http.uploadMaxBytes`（默认 512MB） | 不动全局 16MB |
| FR-23 | 单文件上限沿用 `scopes.<scope>.import.maxFileSize` | 默认 1MB，**部署需按文档体积调大** |
| FR-24 | tar 三重闸门：条目数 ≤20k、解包总量 ≤ min(传输×10, 4GiB)、压缩比 >10 判可疑 | 防 zip-bomb |
| FR-25 | tar 越界条目（`..` / 绝对路径 / 符号链接）整包拒收且**零落盘** | 复用现有 `safe-tar.ts` 校验口径 |

## 5. 非功能需求

| 维度 | 要求 |
|---|---|
| 兼容性 | 前端 `/api/*` 零改动；`ki restore` 行为逐字不变；既有测试全绿 |
| 可诊断性 | 超限错误必须给出「实际值 + 上限值 + 调整方法」，不能只说"超过大小上限" |
| Token 预算 | 500 个文件的上传响应 ≤ 2KB（摘要 + 最多 10 条跳过样本） |
| 并发 | 单机低并发（≤3 路同时上传）；导入阶段由 scope 写锁串行 |
| 依赖 | 不引入新的 npm 依赖（multipart 手写） |

## 6. 验收标准

| # | 验收标准 | 可执行验证 |
|---|---|---|
| A1 | Agent 只靠 curl 推动一份大文档 | `curl -F "files=@big.md"` → 200 + taskId，`ki_search` 能命中 |
| A2 | Agent 只靠 tar+curl 推动整个目录，层级保留 | 与 `ki import --source` 的 group 树逐项一致 |
| A3 | **不装 ki 也能用** | 验证机不装 ki，仅 curl/tar |
| A4 | 无 token 一律进不来（含本机） | 401；127.0.0.1 无 token 也 401 |
| A5 | 越权进不来 | scope 外 token → 403 |
| A6 | 只读 token 不能上传 | 403 `OPEN_API_TOKEN_READONLY` |
| A7 | 能关掉 | `--no-upload-api` 后 `/open/v1/import/*` → 404 |
| A8 | 关掉后前端与 MCP 不受影响 | Web 导入页、MCP 工具照常 |
| A9 | 关掉后重启不会自己开回来 | `ki mcp restart` 后仍为关（或按 flag 正确切换） |
| A10 | 大目录不会静默半成功 | 响应含 `files.skipped` + 原因样本 |
| A11 | 配置能真正生效 | 配置文件写 `uploadApi: false` 后行为同 CLI |
| A12 | 单文件重传不堆副本 | 同一文档连推两次，relation 数不增加 |

## 7. 关键澄清记录（防止后续重犯）

本需求的认知经过 6 轮修正，以下四条是**曾经理解错、已纠正**的点，后续讨论不得回退：

| # | 曾经的错误理解 | 实际情况 |
|---|---|---|
| 1 | 「前端 Web 导入页已经能拖拽上传，需求已完成」 | Web 页面上传需要人工操作浏览器；Agent 无法使用 |
| 2 | 「补一个 MCP 工具吃 `sourcePath` 即可」 | Agent 与 ki 不同机，MCP 工具在远端执行，读不到 Agent 本机路径 |
| 3 | 「加一个 `ki push` 客户端命令」 | **Agent 机器上根本没有 ki**，任何 ki 命令都不可达；这是本需求的根约束 |
| 4 | 「`--no-api` 关闭全部 `/api/*`」 | 只关**给第三方程序调用的独立 API**；前端对接的 `/api/*` 必须永远开 |

**这条根约束要反复确认**：使用者 = AI Agent；Agent 机器 = 有 MCP、有 shell/curl、有文件，**没有 ki**。任何依赖 ki 客户端的方案都不成立。

## 8. 依赖与前置

| 项 | 状态 |
|---|---|
| 导入内核 `handleDirectImport` | 已有，直接复用 |
| 上传会话目录 `~/.ki/import-uploads/` | 已有，复用（内容改落 `content/` 子目录） |
| Token 存储与 scope 模型 | 已有，复用 |
| 任务台账 / 任务日志 | 已有，复用 |
| `safe-tar.ts` 越界校验 | 已有，需抽通用版 |
| 设计文档 | 已完成并通过评审（2 阻断 + 8 警告 + 3 推演问题全部修入） |
| 实施计划 | 已建档 `.plans/2026-11-05-open-upload-api/` |

## 9. 待定与风险

| # | 项 | 现状 |
|---|---|---|
| R1 | `mcp.http.uploadMaxBytes` 默认 512MB 是否合适 | 建议值，实施时可调 |
| R2 | 「一份大文档」实际最大体积未知 | 若 >12MB 需要确认流式链路承载；已知默认 1MB 必须调大 |
| R3 | 远端是否经反向代理 | 代理默认 `client_max_body_size` 1MB 会在代理层直接拒掉 tar 上传，部署前必须确认 |
| R4 | `ki mcp restart` 的 flag 透传现状 | 设计已要求支持，实施时需核实现有实现是否已具备 |
