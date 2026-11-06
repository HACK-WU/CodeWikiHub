# S-03 上传开关与状态回显

> 父需求：REQ-20261105-001 ｜ 依赖：S-01（分发点拦截位） ｜ 被依赖：无

## 1. 术语

| 术语 | 定义 |
|---|---|
| uploadApi | 上传接口开关状态。`true`（默认）= 开放 `/open/v1/import/*`；`false` = 该前缀返回 404 |
| 开关作用域 | **仅** `/open/v1/import/*`。`/api/*`、`/mcp`、`/healthz`、`/open/v1/ping` 不受影响 |
| 三段优先级 | CLI flag > 配置文件 > 内置默认（`true`） |
| lock 回显 | 把生效值写入 `~/.ki/mcp-http-<fp>.lock`，供 `status` / `restart` 读取 |

## 2. 现状（AS-IS）

| 关键事实 | 证据 |
|---|---|
| `ki mcp` 的 known flag 列表（无任何关闭 API 的开关） | `src/mcp-server.ts:170` |
| `--no-web` 的解析方式（`--web` 与 `--no-web` 同给时后者胜） | `src/mcp-server.ts:175` |
| `--no-local-admin` 的解析方式 | `src/mcp-server.ts:216` |
| 配置字段白名单 `mcp.http.{host,port,allowedHosts,localAdmin}` | `src/lib/config-schema.ts:297-305` |
| 配置解析块**只解析** `host/port/allowedHosts` | `src/lib/config.ts:698-714` |
| `startHttpMcpServer` **无条件** `listen` | `src/lib/mcp-http.ts:1181` |
| lock 文件字段：`pid/host/port/startedAt/web/identityFingerprint` | `src/lib/mcp-http.ts:1255-1276` |
| stdio MCP 桥接依赖 `http://host:port/mcp` | `src/lib/daemon-bridge.ts:43-46` |
| daemon 即 `ki mcp --http --daemon` 进程 | `src/lib/daemon-client.ts:309` |

**既有缺陷（本子需求必须顺带修，否则会重犯）**

`mcp.http.localAdmin` 在 schema 里有定义（`config-schema.ts:297-305`）、在类型里有字段（`src/lib/config.ts:145`）、在消费端有读取（`src/mcp-server.ts:216`），但**配置解析块从未给它赋值**（`config.ts:698-714`）→ 写进 YAML 静默无效，只有 CLI 的 `--no-local-admin` 生效。文档 `docs/mcp-http.md:64` 却声称配置可关。

新增 `uploadApi` / `uploadMaxBytes` 若照抄这个模式，会一模一样地失效。

## 3. 方案（TO-BE）

### 3.1 开关链路

```
ki mcp --http --daemon --no-upload-api
        │
        ▼
parseMcpArgs：uploadApi = !args.includes('--no-upload-api')
        │  优先级：CLI > config.mcp.http.uploadApi > true
        ▼
startHttpMcpServer({ ..., uploadApi })
        │
        ├─▶ createMcpHttpServer({ ..., uploadApi })   ← 分发器拦截位
        │        └─ /open/v1/import/* 且 uploadApi=false → 404 OPEN_API_NOT_FOUND
        │
        └─▶ writeLockFile(..., uploadApi)             ← 状态回显
                 └─ ki mcp status 读取并打印
                 └─ ki mcp restart 沿用上次值
```

### 3.2 接口设计（CLI 契约 / 配置契约 / lock 契约）

| 契约 | 定义位置 | 类型 | 默认 | 校验规则 | 失败行为 |
|---|---|---|---|---|---|
| CLI `--no-upload-api` | `src/mcp-server.ts:170` known 列表 | 布尔型 flag（出现即为 false） | 不传 → 回落配置 | 无需校验 | 无 |
| 配置 `mcp.http.uploadApi` | `config-schema.ts:297-305` + `config.ts:698-714` | `boolean` | `true` | 类型校验 | 配置校验失败 → 启动报 `CONFIG_INVALID` |
| 配置 `mcp.http.uploadMaxBytes` | 同上 | `integer` | `536870912`（512MB） | `> 0` 且 `≤ 4294967296`（4GiB） | 越界 → 启动 fail-loud `INVALID_UPLOAD_MAX_BYTES`（**不静默回落默认**） |
| lock 字段 `uploadApi` | `src/lib/mcp-http.ts:1255-1276` | `boolean` | — | 读侧容错（缺失按 config 兜底） | 写失败不阻塞启动 |
| `status --json` 字段 `uploadApi` | `src/mcp-server.ts` status 输出 | `boolean` | — | — | — |

**CLI**

```bash
# 默认开放
ki mcp --http --daemon

# 关闭上传 API（其余一切不变）
ki mcp --http --daemon --no-upload-api

# 重启时若不显式指定，沿用上次 lock 里的值
ki mcp restart
```

**配置文件**

```yaml
mcp:
  http:
    host: 0.0.0.0
    port: 7423
    allowedHosts: []
    uploadApi: true        # false = 关闭 /open/v1/import/*
    uploadMaxBytes: 536870912   # 单次上传总字节上限，默认 512MB
    # localAdmin: false    # ← 既有字段，解析块修复后才会真正生效
```

**lock 文件（新增字段）**

```json
{
  "pid": 48213,
  "host": "0.0.0.0",
  "port": 7423,
  "startedAt": "2026-11-05T10:12:00.000Z",
  "web": true,
  "uploadApi": true,
  "identityFingerprint": "..."
}
```

**`ki mcp status` 输出（新增一行）**

```
上传 API：开启（/open/v1/import/*）
# 或
上传 API：已关闭（--no-upload-api）
```

**`ki mcp restart` 必须支持这几个开关的透传（不做会让"关掉"变成两步操作）**

推演发现的死结：daemon 已在跑 → 用新参数启动会命中幂等单例直接 `exit(0)`（`mcp-http.ts:1150-1156`），开关不生效；而 `restart` 若只沿用 lock 里的旧值，就永远关不掉。于是运维只能 `ki mcp stop` → 再 `ki mcp --http --daemon --no-upload-api` 两步走。

要求：`ki mcp restart` 接受并透传 `--no-upload-api`（不给该 flag 时才回落 lock 值）。这样一条命令即可切换：

```bash
ki mcp restart --no-upload-api     # 关掉上传 API
ki mcp restart                     # 沿用上次 lock 值
```

### 3.3 拦截位实现

在 S-01 的分发器入口（`src/lib/open-api/index.ts` 的 `handleOpenApiRequest` 第一行）：

```ts
if (!ctx.uploadApi && isUploadPath(url.pathname)) {
  return sendJson(res, 404, { ok: false, code: 'OPEN_API_NOT_FOUND', error: 'Not Found' });
}
```

`isUploadPath` 判定 `/open/v1/import` 及其子路径。**`/open/v1/ping` 不受开关影响** —— 它本身没有写能力，且是诊断入口；关闭后可继续用它确认 token 与服务存活。

**为什么拦截在分发器而不在 `mcp-http.ts`**：分发器持有路径语义（哪些算上传），`mcp-http.ts` 只该知道"有个 open-api 前缀"。放错层会让 `mcp-http.ts` 逐渐理解 open-api 的内部路由。

### 3.4 全文件清单

```
src/mcp-server.ts          # [修改] known 列表 + uploadApi 解析 + 透传 + status 输出
src/lib/config-schema.ts   # [修改] mcp.http.{uploadApi, uploadMaxBytes} 字段
src/lib/config.ts          # [修改] 解析块赋值（★ 关键，防静默失效）
src/lib/mcp-http.ts        # [修改] HttpServerOptions + HttpAppOptions 加 uploadApi/uploadMaxBytes；writeLockFile 写入
src/lib/open-api/index.ts  # [修改] 分发器入口拦截（S-01 创建）
```

## 4. 关键决策点

| # | 决策 | 选中 | 被否决 | 否决理由 |
|---|---|---|---|---|
| D-01 | 关闭后的响应 | `404 OPEN_API_NOT_FOUND` | `403 OPEN_API_DISABLED` | 403 会泄露"接口存在但被关"，与既有"未匹配路由 = 404"语义不一致 |
| D-02 | 关闭方式 | 路由级拦截 | 不 `listen` / 关端口 | daemon 即 HTTP 进程，stdio MCP 桥接依赖 `http://host:port/mcp`（`daemon-bridge.ts:43-46`），停监听会打死全部 MCP 工具 |
| D-03 | 开关粒度 | 仅 `/open/v1/import/*` | 关闭整个 `/open/v1/*` | `/ping` 是诊断入口，关闭后仍应可用；且未来 `/open/v1/*` 可能加只读接口 |
| D-04 | 配置挂载点 | `mcp.http.uploadApi` | 新增顶层 `server.uploadApi` | 复用现有 HTTP 配置段，最小改动，不引入新顶层概念 |
| D-05 | `restart` 是否延续 | 延续上次 lock 值 | 每次重启回到默认 `true` | 参照 `--no-web` 的既有做法（`mcp-server.ts:888-891`）；否则"关掉后重启又开了"是安全回退 |
| D-06 | `uploadMaxBytes` 位置 | `mcp.http.uploadMaxBytes` | 固定常量不可配 | 部署环境差异大（代理/磁盘），硬编码会逼用户改代码 |
| D-07 | 顺带修 `localAdmin` | 修 | 只加新字段不碰旧的 | 不修则会重犯同一 bug；修复成本 < 10 行 |

## 5. 影响范围

| 受影响方 | 影响 | 说明 |
|---|---|---|
| `/api/*`（前端 Web） | **无影响** | 拦截位只在 `/open/v1/import/*` |
| `/mcp`（MCP 工具） | **无影响** | 不受开关控制 |
| `/healthz` | **无影响** | 免鉴权诊断端点 |
| `/open/v1/ping` | **无影响** | 关闭上传后仍可用于诊断 |
| `ki mcp status` / `restart` | 输出多一行；restart 沿用上次值 | 见 §3.2 |
| `ki mcp --http` 已有实例在跑 | 命中幂等单例直接 `exit(0)`，新开关不生效 | 需提示"请先 `ki mcp restart`" |
| `ki mcp`（stdio 模式） | `--no-upload-api` 无意义 | 提示一行，不报错 |

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `--no-upload-api` + 无 `--http` | stderr 提示"stdio 模式无 HTTP 服务，该参数不生效"，正常启动 | 是（stderr） |
| 已有实例在跑 + 新参数不同 | 幂等命中直接 exit，提示"已有实例在运行，开关未生效，请 `ki mcp restart`" | 是（stderr） |
| lock 文件读不到 / 损坏 | `status` 按 CLI > config > 默认 兜底，标注来源 | 是 |
| 配置写了 `uploadApi` 但解析块未实现 | **必须被测试捕获**：新增一条"配置生效"单测，断言 `config.mcp.http.uploadApi === false` 能传到 `HttpServerOptions` | — |
| `uploadMaxBytes` ≤ 0 或非数字 | 启动 fail-loud `INVALID_UPLOAD_MAX_BYTES`（不静默回落默认） | 是 |
| `uploadMaxBytes` 小于单文件上限 | 不报错，但 `/open/v1/ping` 的 `limits` 会同时回显两个值，用户可见矛盾 | 是 |

## 7. 待定问题

| # | 问题 | 建议默认 |
|---|---|---|
| Q-01 | `uploadMaxBytes` 默认 512MB 是否合适（是否要跟 `import-budget` 的 4GiB 对齐） | 512MB；单次请求不宜等于全库预算 |
| Q-02 | 是否提供 `ki mcp status --json` 里的 `uploadApi` 字段 | 是（与现有 `--json` 输出体例一致） |
