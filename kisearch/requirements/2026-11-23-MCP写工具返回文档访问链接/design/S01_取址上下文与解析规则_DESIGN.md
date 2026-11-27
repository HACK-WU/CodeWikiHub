---
id: REQ-20261123-003
feature: MCP写工具返回文档访问链接
status: 设计中
created: 2026-11-23
updated: 2026-11-23
version: 2
tags: [feat, mcp, web, ux]
depends_on: []
author: AI
document_type: design
---

# S-01 取址上下文与解析规则

> v2（2026-11-23）：按设计评审 B1 / B3 / W1 / W3 / W4 / G1 修订——`basePath` 承接 publicUrl 子路径、取址顺序改为「Host 为主 + 回环时才信 `X-Forwarded-Host`」、补测试注入与编码边界。

## 1. 术语

| 术语 | 定义 | 不做什么 |
|------|------|---------|
| **运行时快照** | daemon 启动成功后写入进程内的一次性只读状态：`{ webEnabled, publicUrl }` | 不做热更新（`--web` 变更需重启，与现状一致） |
| **web 可用 `webEnabled`** | `--web` 已指定 **且** `web/dist/index.html` 在启动时存在 | 不等于「`webDir` 非空」——产物缺失时 `webDir` 仍被赋值（`mcp-http.ts:1354-1363`） |
| **取址 `base`** | `协议://主机[:端口]`，**不含任何路径** | 不含 `/browse`、不含子路径、末尾无 `/` |
| **`basePath`** | 站点子路径（如 `/ki`），`''` 表示根；由 `publicUrl` 的 pathname 或 `x-forwarded-prefix` 承载 | 不参与主机判定 |
| **显式覆盖** | 配了 `mcp.http.publicUrl` 时**整段地址以它为准**（含子路径），不再看请求头 | 不是「Host 失败后才用」——见 D-02（已拍板） |
| 通配地址 | `0.0.0.0` / `::` / `[::]` / `*`，不可直连 | 不做探测，只做字面归一为 `127.0.0.1` |

## 2. 现状（AS-IS）

```
src/lib/mcp-http.ts
  HttpServerOptions (115-145)             ← 无 publicUrl 字段
  startHttpMcpServer (1330)               ← webDir 在 1353-1363 计算
      └─ if (opts.web) { webDir = web/dist;
             if (!existsSync(index.html)) 仅告警 }          ← webDir 仍非 null
  createMcpHttpServer({... webDir}) (1365-1375)
  httpServer.listen(...) (1378-1383)
  process.stderr 启动日志 (1402-1406)      ← 唯一输出地址处，用 host:port

src/mcp-server.ts
  startHttpMcpServer({ host, port, ..., buildServer: buildKiMcpServer }) (1338-1353)
                                            ← 此处已能读 config，但未传 publicUrl

src/lib/mcp-tools/*                         ← 工具层读不到 webDir，也读不到 config
```

三处硬约束（都已实证）：
1. 工具层拿不到 `webDir`（`startHttpMcpServer` 的局部变量），也拿不到端口（`mcp-http.ts:74` 默认 7423，实际可被 CLI/lock/配置改）。
2. 请求上下文 `extra.requestInfo`（`{headers,url}`）**只在 HTTP 会话存在**；SDK 1.29.0 已在每个 POST 里填充（`webStandardStreamableHttp.js:390-393`，经 `streamableHttp.js:133-148` 转接）。
3. 无任何现成的服务端 URL 拼装代码（`src/` 内 `/browse` 零命中）；前端侧有两份等价实现（`web/src/lib/browseUrl.ts:19-33`、`kiLinks.ts:60-64`）。

## 3. 方案（TO-BE）

### 3.1 目录结构（新增 2 个文件）

```
src/
├── lib/
│   ├── mcp-runtime.ts              # [新增] 进程级只读快照（无任何 import，避免环）
│   ├── mcp-http.ts                 # [修改] HttpServerOptions + listen 后置位
│   ├── mcp-tools/
│   │   ├── doc-link.ts             # [新增] base/basePath 解析 + URL 拼装（纯函数）
│   │   └── sync-relation.ts 等      # [修改] 见 S-02
│   ├── config-schema.ts            # [修改] mcp.http.publicUrl
│   └── config.ts                   # [修改] 解析赋值（schema 加了必须同步，见该处注释）
└── mcp-server.ts                   # [修改] 透传 publicUrl
```

### 3.2 快照模块（`src/lib/mcp-runtime.ts`）

```ts
export interface WebRuntime {
  /** --web 且 web/dist/index.html 启动时存在 */
  webEnabled: boolean;
  /** mcp.http.publicUrl 归一后（去尾斜杠）；未配置 / 非法为 null */
  publicUrl: string | null;
}

/** 启动时写一次；之后只读 */
export function setWebRuntime(next: WebRuntime): void;
export function getWebRuntime(): WebRuntime;   // 默认 { webEnabled: false, publicUrl: null }
export function resetWebRuntime(): void;       // 仅测试用
```

**为什么独立成模块**：`mcp-http.ts` 会被工具层间接 import（`mcp-server.ts → mcp-server-factory → mcp-tools`），若把状态直接放在 `mcp-http.ts` 里会形成环；独立模块零依赖，两个方向都安全。

**并发/测试约束（评审 W3）**：这是**进程级单例**——一个进程只允许一个快照值。Node test runner 默认按文件并行，多个测试文件同时 `setWebRuntime` 不同值会互相污染，表现为「偶发没有 url」的 flaky。因此：

- `docUrl` / `resolveBase` 均接受**可选第三/第二参 `runtime?: WebRuntime`**，测试直接注入，不碰全局；
- 仍用全局的测试必须 `before` 置位、`after` 调 `resetWebRuntime()`，且断言只依赖自己置的值。

### 3.3 置位点（`src/lib/mcp-http.ts`）

```ts
// listen 成功之后（1383 之后），保证绑定失败不留脏快照
const indexHtml = webDir ? path.join(webDir, 'index.html') : null;
setWebRuntime({
  webEnabled: !!indexHtml && fs.existsSync(indexHtml),
  publicUrl: normalizePublicUrl(opts.publicUrl),
});
```

`webDir` 与 `index.html` 判定**复用 1353-1363 那次计算**（把 `existsSync` 结果存成局部布尔，避免二次 IO，也避免两处判据漂移）。

### 3.4 解析顺序（`doc-link.resolveBase`）

```
① webEnabled === false                        → null（直接放弃，不再看任何头）
② publicUrl 非空（显式覆盖）
     base      = new URL(publicUrl).origin          // 协议 + 主机 + 端口
     basePath  = new URL(publicUrl).pathname 去尾 / // 子路径由此承接（评审 B1）
     → 不再看 Host / X-Forwarded-*（配置即权威）
③ 无 publicUrl，走请求头
     host = headers['host']（trim 后非空才算）
     xfh  = headers['x-forwarded-host']
     ├─ host 的主机部分是**回环**（127.x / ::1 / localhost）且 xfh 非空 → 用 xfh
     ├─ 否则 host 非空（含通配，稍后归一）                    → 用 host
     ├─ 否则 xfh 非空                                        → 用 xfh
     └─ 都空                                                  → null
     basePath = x-forwarded-prefix ?? ''（必须以 / 开头，去尾 /）
④ 主机部分为通配地址 → 换 127.0.0.1（端口保留）
⑤ 协议 = publicUrl 分支用其自身；header 分支用 x-forwarded-proto ?? 'http'
```

**为什么 ③ 里「回环才信 xfh」**（评审 W4）：无条件信任 `X-Forwarded-Host` 会让客户端自带该头就伪造出任意域名；而纯「Host 优先」又会在反代把 Host 改写成 `127.0.0.1:7423` 时产出用户点不到的地址。折中规则只在一个可判定的窄条件下采信转发头——**Host 本身是回环**（说明请求经过了同机反代），其余一律以 Host 为准。

### 3.5 URL 拼装（`doc-link.docUrl`）

```ts
const resolved = resolveBase(ctx, runtime);        // null ⇒ 调用方不输出字段
const u = new URL(resolved.base);                  // base 无路径，不会被覆盖语义坑到
u.pathname = `${resolved.basePath}/browse`;         // basePath='' → '/browse'
u.search = new URLSearchParams({ scope, group, relation }).toString();
return u.toString();
```

- **`base` 保证无路径**：子路径一律走 `basePath`，避免 `new URL(base).pathname` 被整段覆盖（评审 B1 的根因）；
- 编码一律交 `URLSearchParams`（中文 / `#` / `&` / 空格 / `+` 全部安全）；**禁止手工拼串**；
- `group` 直接用 canonical 值：根目录为 `__root__`（浏览页已支持，`BrowsePage.tsx:735-743`）；
- **不写** `member` / `anchor` / `reader`：写入落点是真实库，不是视图；锚点与全屏态属于阅读现场，不由服务端决定；
- **URL 不含任何凭证**：只有 `scope` / `group` / `relation` 三个参数，不携带 Token、会话 id、用户标识（评审 G1）。

### 3.6 配置项（`mcp.http.publicUrl`）

| 项 | 类型 | 默认 | 语义 |
|---|------|------|------|
| `mcp.http.publicUrl` | string | 无 | 对外可访问的站点根，如 `https://ki.example.com/ki`。**配置即覆盖**（含子路径），用于反代 / 容器 / 端口映射 |

校验：必须能被 `new URL()` 解析且协议为 `http:`/`https:`，否则**启动告警一次并忽略**（不阻塞 MCP 启动，与 `--web` 缺产物同风格）；归一为去尾斜杠。

**带子路径时的实际产出**（评审 B1 的验收样本）：

```
publicUrl = https://ki.example.com/ki
→ base = https://ki.example.com      basePath = /ki
→ url  = https://ki.example.com/ki/browse?scope=…&group=…&relation=…
```

## 4. 接口设计

```ts
// src/lib/mcp-tools/doc-link.ts
export interface DocTarget { scope: string; group: string; relation: string }

/** SDK 下发的请求上下文（stdio 会话为 undefined） */
export interface DocLinkContext {
  requestInfo?: { headers: Record<string, string | string[] | undefined> };
}

/** 运行时快照（S-01 §3.2）；传了就不读全局，供测试注入 */
export interface WebRuntime { webEnabled: boolean; publicUrl: string | null }

/**
 * 生成可点开的绝对地址。无法确定时返回 undefined —— 调用方**不得**输出空串或占位地址。
 * @param runtime 可选：覆盖进程级快照（测试用）
 */
export function docUrl(target: DocTarget, ctx: DocLinkContext, runtime?: WebRuntime): string | undefined;

/** 便捷合并：url 为 undefined 时结果里不出现该字段 */
export function withUrl<T extends object>(result: T, url: string | undefined): T & { url?: string };

/** **仅供单测**直接验证取址判据（生产无调用方，评审 G3） */
export function resolveBase(
  ctx: DocLinkContext,
  runtime?: WebRuntime,
): { base: string; basePath: string } | null;
```

**Demo 返回示例（仅示意格式）**

```json
{
  "ok": true,
  "scope": "monitor-memory",
  "group": "项目踩坑点",
  "relation": "APIResource把ReadTimeout转成BKAPIError导致超时判定失效",
  "url": "http://127.0.0.1:7433/browse?scope=monitor-memory&group=%E9%A1%B9%E7%9B%AE%E8%B8%A9%E5%9D%91%E7%82%B9&relation=APIResource%E6%8A%8AReadTimeout%E8%BD%AC%E6%88%90BKAPIError%E5%AF%BC%E8%87%B4%E8%B6%85%E6%97%B6%E5%88%A4%E5%AE%9A%E5%A4%B1%E6%95%88"
}
```

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|------|------|------------|
| 无 `requestInfo`（纯 stdio） | `resolveBase` 返回 null ⇒ 不注入 | 否（字段不出现） |
| `webEnabled=false` | 同上，**不读任何头** | 否 |
| `host` 头缺失/为空 | 走 `x-forwarded-host`，仍空则 null | 否 |
| `host` 为回环且 `x-forwarded-host` 存在 | 采信 `x-forwarded-host`（反代场景） | 否 |
| `host` 与 `x-forwarded-host` 都在但主机不同、且 `host` 非回环 | 以 `host` 为准（防伪造） | 否 |
| `publicUrl` 带子路径 | `base` 去路径、`basePath` 承接（`/ki/browse`） | 否 |
| `x-forwarded-prefix` 不以 `/` 开头 | 忽略该头，`basePath` 用 `''` | 否 |
| `host` 含非法字符（`new URL` 抛错） | `docUrl` 捕获后返回 undefined | 否 |
| `publicUrl` 非法 | 启动打印一行警告，运行期当未配置 | 是（仅 stderr） |
| `x-forwarded-proto` 为 `https` 而 daemon 无 TLS | 照用（反代终止 TLS 的常态） | 否 |
| 链接生成任何异常 | **吞掉**，写工具结果原样返回 | 否（写已成功，不能因链接失败而报错） |

## 6. 影响范围

| 文件 | 改动 |
|------|------|
| `src/lib/mcp-runtime.ts` | 新增（~30 行） |
| `src/lib/mcp-tools/doc-link.ts` | 新增（~110 行） |
| `src/lib/mcp-http.ts` | `HttpServerOptions` 加 `publicUrl?`；1353-1363 存布尔；listen 后置位 |
| `src/mcp-server.ts` | 1338-1353 传 `publicUrl: config.mcp?.http?.publicUrl` |
| `src/lib/config-schema.ts` / `config.ts` | 新增字段 + 解析（schema 加了必须同步解析，见该文件既有注释） |
| `docs/configuration.md` | 新增一项说明（归 S-03） |
| `test/mcp-doc-link.test.ts` | 新增：取址（Host / 回环+转发头 / 非回环+转发头 / 都空）、**publicUrl 带子路径**、**publicUrl 覆盖反代头**、通配归一、编码（中文 / `#` / `&` / 空格）、`webEnabled=false`、`runtime` 注入隔离 |

## 7. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|------|-----------|---------|----------------|
| D-01 | 快照放独立 `mcp-runtime.ts` | 给 `buildKiMcpServer(auth, ctx)` 加第二参数 | 要改 `mcp-server-factory` + `HttpServerOptions.buildServer` 签名 + 全部测试构造点；且 ctx 与会话授权语义无关，混在一起会让人以为「授权决定链接」 | 出现第二个需要请求期上下文的工具族（如读工具也要链接）时重新评估 |
| **D-02** | **`publicUrl` = 显式覆盖**（`publicUrl ?? fromHost()`）；已由用户在评审后拍板，需求 §5 U1 同步改为「Host 为默认、配置为显式覆盖」 | `fromHost() ?? publicUrl`（U1 原字面顺序） | `Host` 头几乎总存在 ⇒ 兜底分支**永不可达**；反代加前缀时 Host 存在但地址错，配置形同虚设 | 若要求「配置只做兜底」，改回并接受反代需 `--no-web` |
| D-03 | `webEnabled` 含 `index.html` 存在性 | `webEnabled = !!webDir` | `mcp-http.ts:1354-1363` 在产物缺失时**仍给 webDir 赋值**，会生成必然 404 的链接（违背 U2） | 无 |
| D-04 | 拆出 `basePath`，`base` 恒无路径 | 单个 `base` 字符串（`new URL(base).pathname` 直接被覆盖） | 配 `publicUrl=https://h/ki` 时产出 `https://h/browse`，子路径丢失、链接必坏（评审 B1） | 无 |
| D-05 | 编码全部走 `URLSearchParams` | 手拼 + `encodeURIComponent` 仅编码值 | 手拼易漏（`#` 截断、`?` 注入）；`URLSearchParams` 同时管分隔符与值 | 无 |
| D-06 | `x-forwarded-host` **仅当 Host 为回环时**采信 | ① 无条件让 `xfh` 优先；② 纯 `host` 优先 | ① 客户端自带该头即可伪造任意域名；② 反代把 Host 改写成 `127.0.0.1:7423` 时链接用户点不到 | 若确认生产反代一律保留原始 Host，可退化为纯 Host 优先（更简单） |

## 8. 待定问题

| # | 问题 | 影响 | 处置 |
|---|------|------|------|
| ~~Q1~~ | ~~U1 字面顺序 vs 显式覆盖~~ | — | **已拍板（2026-11-23 评审后）**：采用显式覆盖，D-02 生效 |
| Q2 | `publicUrl` 是否需要 CLI 参数（如 `--public-url`） | 容器部署想免改配置文件 | 本期不做；`restart` 透传链路另议 |
| Q3 | 是否需要 `x-forwarded-prefix` 与 `publicUrl.pathname` **同时**生效 | 极少数双层反代 | 本期按「配置优先、不叠加」处理，见 §3.4 ② |
