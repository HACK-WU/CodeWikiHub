---
id: REQ-20261124-002
feature: ki-client 取件客户端
status: 设计中
created: 2026-11-24
updated: 2026-11-24
version: 1
tags: [feat, integration]
author: AI
document_type: rehearsal
---

# 场景推演：ki 只读取件契约（`/open/v1`）

**推演对象**：`design/DESIGN.md` + `S01`~`S04` + `IMPL_PLAN.md`（设计文档模式）
**证据性质**：推演结论（基于文档与代码阅读推理，**未实际执行**）

## 1. 全局理解 + 角色清单

**业务目标**：让 AI 与外部程序通过稳定 HTTP 取到 ki 的附件字节与文档正文，替代在 IDE 侧失效的 MCP 取图。

**系统位置**：`{kb}/{scope}/…` 文件 → `/open/v1` 只读路由 → `ki-client` 子包→ AI agent / 人的浏览器。

**整体成功判据（后续每条结论回扣）**：
1. 字节完整（下载后 sha256 一致）；
2. 不绕过 token 的 scope 授权（无越权读）；
3. 读出口可单独关闭，关闭后不泄露存在性；
4. 不破坏 `/api/asset` 既有消费方与 chat 读图；
5. 服务端版本错配时客户端能降级而非崩溃。

| # | 角色 | 类型 | 权限层级 | 职责 | 来源 |
|---|---|---|---|---|---|
| 1 | AI Agent | 用户 | 持 token（经客户端） | 取图/取正文后交给读图能力 | DESIGN §1 |
| 2 | 人 / 运维 | 用户 | 无 token（浏览器） | 兜底：点开链接看原图 | S-04 §3 |
| 3 | `ki-client` | 自动化程序 | 持 token | 多源解析、拼 URL、落盘、打印路径 | requirement R7~R10 |
| 4 | open-api 分发器 + 只读路由 | 内部模块 | — | 鉴权、开关、路由、留痕、计数 | S-01~S-03 |
| 5 | 导入任务 / 文件系统 | 环境角色 | — | 并发覆盖或删除附件 | S-02 §6 |

## 2. 推演矩阵 + 启用 profile

| 场景 \ 角色 | AI Agent | 人/运维 | ki-client | 内部模块 | 环境 |
|---|:--:|:--:|:--:|:--:|:--:|
| S1 取单图 | ✅ | - | ✅ | ✅ | - |
| S2 浏览器点开链接 | - | ✅ | - | ✅ | - |
| S3 取正文 → 按 ref 取附件（两跳） | ✅ | - | ✅ | ✅ | - |
| S4 关闭 `downloadApi` / 与降级叠加 | ✅ | ✅ | ✅ | ✅ | - |
| S5 旧服务端（无能力位） | ✅ | - | ✅ | - | - |
| S6 视图名当 scope（误用） | ✅ | - | ✅ | ✅ | - |
| S7 导入覆盖中的附件 | ✅ | - | ✅ | ✅ | ✅ |

**启用 profile**：✅ 新增功能类（新增模块/接口）｜✅ CRUD/接口类（RESTful 资源）｜✅ 并发/竞态敏感类（导入覆盖、文件删除）｜✅ 重构/迁移类（`ki_get_image` 降级兼容）

### 设计点覆盖矩阵

| 设计点 \ 场景 | S1 | S2 | S3 | S4 | S5 | S6 | S7 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `downloadApi` 独立开关 | ✅ | ✅ | ✅ | ✅ | - | ✅ | - |
| `contractVersion` / `capabilities` | ✅ | - | ✅ | ✅ | ✅ | - | - |
| 双锚点路径校验 | ✅ | ✅ | ✅ | - | - | ✅ | ✅ |
| `images[].ref` ↔ `path` 等价 | - | - | ✅ | - | - | - | - |
| 留痕 + `download` 计量 | ✅ | ✅ | ✅ | - | - | - | - |
| 降级后的替代路径 | - | ✅ | - | ✅ | - | - | - |

## 3. 场景推演详情

### S1 AI 经客户端取单图

```text
{读配置：多源需 --remote} ✅
  ▼
{GET /open/v1/ping 探测能力位} ✅ contractVersion=1, download.asset=true
  ▼
{GET /open/v1/asset?scope&group&path} ✅ 200 + 白名单 Content-Type
  ├─ {双锚点校验} ✅
  ├─ {读字节（stat 后 ENOENT → 404）} ✅
  └─ {留痕 + download 计量} ✅
  ▼
{落盘 + 打印绝对路径/sha256} ⚠️ 落点是否保留 path 子目录未定（见 P7）
  ▼
{IDE 读图} ✅（前提 A2，仍未实测）
```

数据走向：scope/group/path 三参 → 文件系统 → 响应字节，链路完整、无中间态写。**通过**。

### S2 人用浏览器点开 URL（🔴 问题所在）

```text
{AI 拿到 hint 里的 url} ✅
  ▼
{人在本机浏览器粘贴 url} ❌ ← 401
  │  原因：/open/v1 是 Bearer-only（auth.ts:31，明确不读 Cookie、回环也必须带 Token）
  │        浏览器无法附加 Authorization 头
  └─ 事件 #90 原方案给的 /api/asset 链接之所以能点开，是因为 /api/* 走 local-admin（回环免登录）
  ▼
{实际结果：白屏 401，用户以为服务坏了} ❌
```

**这是本次推演最重要的发现**：S-04 明确把「浏览器直接打开 url」写成人的兜底路径，但 `/open/v1` 的鉴权模型决定了它**不可能**被浏览器直开。兜底路径实际只剩 `ki-client`，而「人只想看一眼图」恰恰是最不该要求装客户端的场景。

### S3 取正文 → 按 ref 取附件（两跳）

```text
{GET /open/v1/doc} ✅ 200 content + images[{ref,mime,bytes}]
  ▼
{对每个 images[].ref 调 /open/v1/asset?path=<ref>} ✅
  ├─ ref 若为 ./assets/x.svg → normalizeImageRef 归一化后落 {group}/assets/assets/x.svg ✅（双层自洽，asset-image.ts:13-16 已声明）
  ├─ ref 为外链 http(s):// → 404 + 提示 ref 应为相对路径 ✅
  └─ 文档 5 张图但 ki_get_image refs ≤3 → 需分两次（P8）
  ▼
{附件按相对引用落盘，md 可直接打开} ✅
```

数据走向：`images[].ref` 原样作为 `path`，端点侧归一化 → 与文档相对引用严格对齐。**通过**（但建议加一条断言覆盖 `./` 前缀形态，P7）。

### S4 关闭 `downloadApi` / 与降级叠加

```text
{运维 downloadApi=false} ✅
  ▼
{/open/v1/asset 与 /open/v1/doc → 404} ✅ 不泄露存在性
  ▼
{ki_get_image 仍返回 url + hint} ⚠️ 该 URL 必 404
  └─ hint 已写「若 404 说明关闭或已删除」✅ 说明清楚
  └─ 但此时 ki_get_image 的唯一价值（给链接）归零，且未提供「改用 MCP 清单 + 请运维开开关」的替代 → P6
```

### S5 旧服务端（无 `contractVersion`）

```text
{客户端 ping 旧服务端} ⚠️ 返回体没有 contractVersion / capabilities
  ▼
{客户端如何判定？} ❌ 设计未定义
  └─ 应视为 contractVersion=0 + 无下载能力 → CONTRACT_TOO_OLD（P4）
```

### S6 视图名当 scope

```text
{用户在 MCP 里习惯用视图 kisearch-docs} ✅（MCP 支持视图）
  ▼
{客户端传 --scope kisearch-docs} ❌ 404「文档不存在」
  └─ getKbDir('kisearch-docs') 无此目录；文案与实际原因不符，用户会以为文档丢了（P3）
```

### S7 导入覆盖中的附件

```text
{GET /open/v1/asset 期间导入任务覆盖同名附件} ✅
  └─ 导入侧 tmp+rename 原子化（import.ts::collectAndCopyAssets）→ 读到「完整或不存在」两态
  ▼
{期间附件被删} ✅ stat 后 ENOENT → 404（S-02 §6 已补）
```

## 4. 问题汇总

| # | 类型 | 角色 | 场景 | 问题描述 | 功能影响（预期 → 实际） | 建议 | 严重度 |
|---|---|---|---|---|------|------|:--:|
| P1 | 流程缺陷 | 人/运维 | S2 | S-04 把「浏览器直开 url」当作人的兜底路径，但 `/open/v1` 是 Bearer-only，浏览器无法带 Token | 预期：人点开链接看到原图 → 实际：401 白屏，误判服务故障 | hint 分两条链接：`apiUrl`（`/open/v1/asset`，给程序，需 Bearer）+ `humanUrl`（`/api/asset`，本机回环免登录，给人点开）；或 hint 明写「浏览器直开需本机登录态，否则用 `ki-client asset get`」 | 🔴 |
| P2 | 数据问题 | ki-client | S5 | 旧服务端缺 `contractVersion` / `capabilities` 时，客户端的判定规则未在契约中定义 | 预期：报 `CONTRACT_TOO_OLD` 并提示升级 → 实际：可能按 undefined 继续走，取件 404 时误报「文档不存在」 | 契约补一条：**字段缺失视为 `contractVersion=0`、下载能力为 false** | 🟡 |
| P3 | 遗漏场景 | AI Agent | S6 | 视图名作为 `scope` 时返回 404「文档不存在」 | 预期：提示「视图不支持取件，请用成员库名」 → 实际：用户以为文档丢失（MCP 侧同一视图是好用的） | 新增 `OPEN_API_VIEW_UNSUPPORTED` 或 404 文案区分视图名（`isViewName` 已有实现可复用） | 🟡 |
| P4 | 流程缺陷 | AI Agent | S4 | `downloadApi=false` 与降级叠加时，`ki_get_image` 的唯一产出（URL）必然 404，未给替代 | 预期：仍能引导 agent 拿到图 → 实际：工具变成纯噪声，agent 反复调用 | hint 在该态下补「清单仍可从 `ki_get_module_info` 的 `images[]` 取；取件需运维开启下载接口」 | 🟡 |
| P5 | 边界处理 | AI Agent | S1 | 读取侧无大小上限，历史遗留的超大附件会一次性读进内存 | 预期：单文件 ≤ 5MB → 实际：历史数据可能更大，内存峰值不可控（不致命但不符「有界」） | S-02 补一句「读取侧不设上限，依赖导入侧 `maxAssetSize`；若放开该配置需改流式」 | 🟡 |
| P6 | 遗漏场景 | ki-client | S3 | 文档图 > 3 张时需多次调用 `ki_get_image`，设计未说明分批口径 | 预期：一次拿全 → 实际：agent 可能以为只有前 3 张 | S-04 返回体加 `total` / `nextRefs` 或 hint 明说「本工具单次最多 3 张，共 N 张」 | 🟢 |
| P7 | 数据问题 | ki-client | S3 | 「`ref` 原样当 `path`」未被列入契约测试要求，`./` 前缀形态未断言 | 预期：两跳链路恒通 → 实际：归一化行为变更时无测试报警 | IMPL_PLAN 契约测试补一条：分别用 `shots/a.png` 与 `./assets/a.svg` 两种 ref 断言 200 | 🟢 |
| P8 | 遗漏场景 | ki-client | S1 | 单张 `asset get` 落盘时是否保留 `path` 的子目录结构，契约未明确 | 预期：落 `out/shots/a.png` 使 md 引用可直接用 → 实际：若拍平到 `out/a.png`，批量还原失效 | 在 requirement R9 口径里补「落盘保留 ref 的相对路径」 | 🟢 |

**统计**：🔴 1 ｜ 🟡 4 ｜ 🟢 3

## 5. 结论

- 推演覆盖：5 个角色 / 7 个场景 / 6 个设计点
- 全局回扣：S1/S3/S7 与全局判据 1/2/4 相符；S4 与判据 3 相符；**S2 破坏「人可兜底取件」这一隐含目标**（判据外，但属业务目标的一部分）；S5 影响判据 5。
- 证据性质：**推演结论（未实际执行）**。

**评审结论**：❌ 不通过（存在 1 个 🔴）

**下一步建议**：
1. 修 P1（`humanUrl` 与 `apiUrl` 分开）后可转「⚠️ 有条件通过」；
2. P2/P3/P4 建议同批修（都是契约文案与判定规则，成本低）；
3. P5/P7/P8 可在实施批内处理；
4. 修复后建议增量推演：只重推 S2 / S4 / S5 / S6。

---

# 增量推演（第 2 轮，修复后）

**变更范围**：S-04 双 URL（`apiUrl` / `humanUrl`）、S-01 版本协商规则、S-02/S-03 视图名错误码、S-02 读取侧无上限说明、IMPL_PLAN 契约测试补 ref 形态断言、requirement R9 补落盘保留子路径。

| 场景 | 上轮 | 本轮 | 说明 |
|---|:--:|:--:|---|
| S2 浏览器点开 | ❌ 401 | ✅ **有条件通过** | 改点 `humanUrl`（`/api/asset`，本机回环 local-admin 免登录）可 200；**跨机 / 反代**仍不可用，hint 已注明 |
| S4 关闭开关 / 叠加降级 | ⚠️ | ✅ 通过 | hint 换专用文案并给替代（清单 + 请运维开开关）；`humanUrl` 不受开关影响 |
| S5 旧服务端 | ❌ 未定义 | ✅ 通过 | 契约表明确「字段缺失视为 `contractVersion=0` → `CONTRACT_TOO_OLD`」 |
| S6 视图名 | ❌ 404 误导 | ✅ 通过 | 400 `OPEN_API_VIEW_UNSUPPORTED` + 区分性文案，复用 `isViewName` |

## 增量发现（新增 1 条）

| # | 类型 | 场景 | 问题 | 建议 | 严重度 |
|---|---|---|---|---|:--:|
| P9 | 设计冲突 | S4 | 「关闭 `downloadApi` = 阻断数据外流」的直觉与实际不符：开关只关 `/open/v1`，同机浏览器仍能通过 `/api/asset` 读取（既有能力，本需求未引入） | 已在 S-01 术语表写明开关作用域：「停掉程序化取件」，不是「停掉所有读」；若未来要把「全通道停读」作为合规要求，需另立需求 | 🟡（已随本轮修复，见 S-01 §1） |

## 本轮结论

**评审结论**：⚠️ **有条件通过（4 项通过 / 1 项新增已修）**——原 🔴 P1 已消除，无遗留阻断。

剩余已知边界（不阻断、已记录）：
- `humanUrl` 仅在本机回环直连场景可用，跨机 / 反代需登录态；
- P6（多图 > 3 张分批）已在 hint 说明，未做自动分批；
- P5（读取侧无上限）已写明依赖导入侧 `maxAssetSize`，放开需改流式；
- 证据性质仍为**推演（未实际执行）**，A2 / A4 需一次小样验证。
