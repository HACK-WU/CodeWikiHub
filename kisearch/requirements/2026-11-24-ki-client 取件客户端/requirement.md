---
id: REQ-20261124-002
feature: ki-client 取件客户端
status: 草案
created: 2026-11-24
updated: 2026-11-24
version: 1
tags: [feat, integration]
depends_on: []
author: AI
document_type: requirement
---

# 需求：ki-client 独立取件客户端 + `/open/v1` 只读取件契约

**关联**：事件 `#90`（MCP 客户端不渲染 image content，收口跟踪）；`REQ-20261123-008`（MCP 图片可读，B6 端到端实测来源）
**交付面**：两个 —— ① `/open/v1` 只读取件契约（服务端）；② `ki-client` 命令行工具（**同仓子包**：源码在 `<repo>/ki-client/`，发布物独立）

---

## 1. 问题

1. **AI 拿不到图**：`ki_get_image` 协议层完全正确（B6 真 HTTP 断言 `result.content` 含标准 `{type:'image', data, mimeType}`，199KB base64、PNG 魔数正确），但 IDE 侧 MCP 客户端把它转成 `image_url` 后不解码，反而把 base64 当文本注入并截断 → 能力等于不可用（事件 #90）。
2. **`/open/v1` 没有任何读能力**：现有 4 个端点全是诊断/写（`ping`、`import/upload`、`import/status`、`events`），第三方程序无法取正文、取附件、取图。
3. **唯一可用的读通道是浏览器语义的 `/api/*`**：`/api/asset`、`/api/doc/get` 虽然接受 mcp token 的 Bearer，但它们是浏览器语义（Cookie / local-admin / CSRF 基线 / 路由能力表），没有对外契约稳定性承诺，**不能作为独立分发包的依赖面**。
4. **「下载 .md」已有人类入口**：Web 阅读器可把当前正文存成 `<文档名>.md`（纯前端、取 `displayedContent`）。所以客户端价值不在「单篇 md」复用，而在**批量 / 整目录 / 带附件 / 程序化取件**。

---

## 2. 需求条目

### 2.1 本仓（服务端契约）

| ID | 需求 | 验收标准 |
|---|---|---|
| **R1** | `GET /open/v1/asset` 返回附件原始字节 | `scope`/`group`/`path` 三参；命中返回真二进制 + 白名单 `Content-Type`；无 token 401；越界 403；非白名单后缀 404；`downloadApi=false` 时 404（不泄露存在性） |
| **R2** | `GET /open/v1/doc` 返回正文与附图清单 | 返回 `content` + `images[{ref,mime,bytes,supported}]`，形状与 `executeGetModuleInfoLocal` 一致（**不裁剪、不承诺额外字段**）；`content` 与 `displayedContent` 同源（不出现「两套事实」） |
| **R3** | `ping` 增加契约版本与能力位 | 返回体新增 `contractVersion`（整数）与 `capabilities{downloadApi, maxAssetSize}`；旧客户端不传/不读时行为不变（向后兼容） |
| **R4** | 读出口独立开关与留痕 | 新增 `mcp.http.downloadApi`（与 `uploadApi` 对称，缺省见 §10 Q1）；关闭时 `/open/v1/asset`、`/open/v1/doc` 一律 404；每次成功下载记一条访问留痕（remote/token/scope/路径/字节数） |
| **R5** | 契约文档与契约测试 | `docs/open-api.md` 补新端点 + 错误码 + 权限矩阵；新增契约测试覆盖 200/401/403/404/405 与 `downloadApi` 开关两态 |
| **R6** | `ki_get_image` 分步下线 | 阶段一：MCP 通道工具保留，返回 text 摘要 + `/open/v1/asset` 直达 URL + 本地取件命令提示；阶段二：观测后从 MCP 通道与 6 处登记表摘除，**chat 内部注册保留**（它在自家对话面板实测可看图），`docs/mcp-tools.md` 出迁移说明 |

### 2.2 `ki-client` 子包

| ID | 需求 | 验收标准 |
|---|---|---|
| **R7** | 多源配置与源解析 | 支持多个远端源（类比 git remote）；**配置多个源时必须显式指定**，不设隐式默认；单源自动选中；无配置但存在 `KI_URL` 时视为隐式源 |
| **R8** | 取图命令 | `ki-client asset get --remote <n> --scope --group --refs a.png,b.png --out <dir>`：落盘并输出**绝对路径 + 字节数 + sha256**（供 IDE 直接读图）；`--refs` 1~3 张 |
| **R9** | 正文与附件成包取件 | `doc get` / `download group`：正文还原为 `.md`，附件按正文里的相对引用落盘并**保留相对子路径**（如 `out/shots/a.png`，不得拍平）；目录结构可被 IDE / 静态站直接打开；**默认不覆盖**（`--overwrite` 才覆盖） |
| **R10** | 上传沿用旧口径 | `upload` / `upload-dir` 参数与输出 JSON 结构沿用现 `ki_upload.py`，仅新增 `--remote`；写操作前必须打印 `via remote=<name> (<url>)` |
| **R11** | skill 改为教用法 | 删除 `skills/ki-upload/scripts/ki_upload.py` 与 `requirements.txt`；`SKILL.md` 改写为「安装 → 配源 → 调用」三步，不再内置实现 |

---

## 3. 已定口径（用户拍板）

| 项 | 结论 |
|---|---|
| 产品定位 | **MCP-first**：MCP 只回答「图在哪」（ref/mime/bytes 元数据），字节一律走 HTTP |
| 实现语言 | **TypeScript**（Node ≥18，确认于 2026-11-24）：跑 ki 的机器必然有 Node；内置 `fetch`/`FormData`/`Blob` 覆盖 HTTP 与 multipart；契约常量可与服务端同源复制 |
| 仓库归属 | **同仓子包**（`<repo>/ki-client/`）：源码同仓、发布物独立（自有 `package.json`/依赖/版本）。**不是独立仓库**（2026-11-24 用户澄清，早前「独立仓库 + 工作区外目录」作废） |
| 分发方式 | **已定方案 B**：进 `ki-client/` 执行 `npm i && npm run build`，再 `npm i -g .`。主包 `bin` / `prepare` **不动**——方案 A（把 `ki-client` 加进主包 `bin`）会让每次安装 `ki` 都多跑一次子包构建，把客户端失败面绑到主包上，已否决。同仓子包不支持 `npm i -g github:<org>/<repo>/ki-client`（npm 不认带子目录的 git 地址） |
| 依赖策略 | **除配置解析（`yaml`）外零第三方依赖**（推翻早前「完全零依赖」，因解析 YAML 必须有库；Python 方案的 PyYAML 对应物） |
| 配置文件 | `~/.ki-client/config.yaml`：目录 `0700`、文件 `0600`；`--config` > `KI_CLIENT_CONFIG` > 默认路径；**不读工作区配置文件** |
| 多源规则 | 类 git remote；源数 > 1 且未指定 → `NO_REMOTE_SPECIFIED`（列出可用源）；源数 = 1 → 自动 |
| token 策略 | 配置文件存 token 明文 + 强制 `0600`；`KI_TOKEN_<REMOTE>` / `--token-stdin` 优先（CI 用）；`remote add` 同名源 URL 变更时**清空旧 token**并要求重新提供 |
| 服务端通道 | 只用 `/open/v1`，**不复用 `/api/*`**（浏览器语义，无稳定性承诺） |
| 发布顺序 | 服务端先发向后兼容的只读端点 + 能力位，客户端探测后降级，避免版本死锁 |
| 取件语义 | 默认不覆盖本地文件；`hidden` 阶段文档可按名取，但必须提示「当前阶段不可检索」 |
| `ki_get_image` | MCP 通道下线，**chat 面板保留**（两套注册表分离） |
| skill | 删脚本、改教用法；不做「脚本 + 包」双份实现 |
| 读出口开关 | `downloadApi` 独立开关（与 `uploadApi` 分开），**默认开**，`ping` 回显，文档标「生产建议关」 |
| 下载用量 | 计入 usage 的独立 `download` 维度，**不参与**冷热（heat）判定，避免下载把冷库刷热 |

---

## 4. 配置文件与多源模型

```yaml
version: 1
remotes:
  prod:
    url: "http://10.0.0.5:7423"
    token: "ki_xxxxxxxx"
  test:
    url: "http://10.0.0.7:233"
    token: "ki_yyyyyyyy"
```

**解析优先级**：

```
1. --remote <name>
2. KI_REMOTE 环境变量
3. 只有 1 个源 → 自动选中
4. 源数 > 1 且都未指定 → NO_REMOTE_SPECIFIED（列出可用源）
5. 无配置文件但存在 KI_URL / KI_TOKEN → 视为隐式源（兼容旧用法与 CI）
```

**三条 YAML 硬约束**（写入与读取两侧都要挡）：

1. 写入一律走 `safe_dump`，字符串强制带引号（否则 `token: a: b` 解析成嵌套 map、`#` 被截断）。
2. 源名白名单 `[a-z0-9][a-z0-9_-]*`，并拒绝 `on/off/yes/no/true/false/null`（PyYAML 会解析成布尔/None 键）。
3. 读入后做形状校验：未知顶层键 fail-loud 报「不认识的配置项」，不静默忽略。

**客户端错误码**（与 `OPEN_API_*` 分开）：`UNKNOWN_REMOTE` / `NO_REMOTE_SPECIFIED` / `REMOTE_UNREACHABLE` / `TOKEN_MISSING` / `CONTRACT_TOO_OLD`（服务端能力位不足，需明说「升级服务端」而不是 decode 崩）。

---

## 5. 负向需求

| ID | 场景 | 应有行为 |
|---|---|---|
| N1 | token 泄露就把全库拉走 | 读出口独立开关 `downloadApi` + 访问留痕；`--token` 参数给出「会进 shell history」提示 |
| N2 | 外链形态图片（引用是 `http(s)://`） | 404 并在错误体列出可用 `refs`，不让 AI 猜 |
| N3 | 大文件 / 批量超限 | fail-loud 给「分批」或「调大 `maxAssetSize`」的出路，不静默跳过 |
| N4 | 目录下载中途失败 | 打印「成功 N / 失败 M + 每项原因」，保留已完成产物，退出码非 0 |
| N5 | 本地已有同名文件 | 默认拒绝覆盖，提示 `--overwrite`（数据丢失级） |
| N6 | `hidden` 阶段文档 | 允许按名取，但必须提示不可检索 |
| N7 | group 名含 Windows 非法字符 | 落盘净名 + 打印映射表 |
| N8 | SVG | 下载原文件，不栅格化、不进浏览器上下文渲染（保 `sandbox` 口径） |
| N9 | 多源误写生产 | 每次写操作打印 `via remote=<name> (<url>)`，不给默认源兜底 |
| N10 | 服务端版本过旧 | `CONTRACT_TOO_OLD` 明说缺哪个能力位与升级动作，不抛 traceback |

---

## 6. 影响面

| 受影响功能/方 | 类型 | 程度 | 处理 |
|---|---|---|---|
| `ki_get_image`（外部 MCP 通道） | 外部契约 | 破坏 | 分两步：先降级（保留 + 给替代路径），观测后移除；发迁移说明 |
| chat 面板读图 | 流程 | 破坏（若误删共享注册） | 只从 MCP 通道移除，chat 注册保留；下线前先验证两套表可分离 |
| `/api/asset` / `/api/doc/get` 既有消费方 | 展示 | 无感 | 不改原行为，新通道复用同一套解析与校验 |
| `skills/ki-upload` 与外部自动化脚本 | 外部契约 | 降级 | 上传参数与输出结构不变，只多 `--remote`；脚本删除属破坏，需在 skill 文档给出迁移命令 |
| 只读 Token 语义 | 权限 | 需定义 | 下载属 GET 读动作，只读 token 可下载（与 `/open/v1` 只读会话口径一致） |
| scope 用量统计（热/冷、配额） | 数据 | 无感或轻微 | 明确下载是否计入 read；计入前先在 `ping` 回显口径 |
| `docs/open-api.md` / `docs/mcp-tools.md` | 文档 | 需同步 | 随实现更新 |

`⚪ 未发现（需确认）`：是否有外部系统已在直连 `/api/asset` 或 `/api/doc/get`（无跨仓调用方清单，无法穷举）。

---

## 7. 现状证据

- `/open/v1` 路由表：`src/lib/open-api/index.ts:58-68`（4 个端点，无读能力）；分发器注释明确「与 `/api/*` 各自独立、互不调用」`:12-13`
- `/open/v1` 鉴权：`src/lib/open-api/auth.ts:31,42-86`（Bearer-only，只读 token 只许 GET/HEAD/OPTIONS）
- `/api/*` 接受同一 token：`src/lib/web-auth.ts:166-176`、`src/lib/mcp-http.ts:911-925`；S-06 只限浏览器请求（非浏览器不带 Origin 不受影响）`:838-839`
- `/api/asset`：`src/lib/mcp-http-api.ts:2201-2217`（参数）、`:2184-2199`（`resolveAssetDir` 双锚点）、`:2144-2154`（mime 白名单）、`:2237-2262`（SVG CSP sandbox）
- `/api/doc/get`：`src/lib/mcp-http-api.ts:2276,2356-2359`（JSON，含正文与 `images[]`）
- 附件解析可复用：`src/lib/asset-image.ts:182`（`resolveAssetPath`，与 `/api/asset` 同口径，返回结构化原因）
- `ki_get_image`：`src/lib/mcp-tools/get-image.ts:23-82`；注册 6 处（`mcp-server-factory.ts:67` + 5 张登记表）
- CLI 现状：`bin/ki.mjs:31-57`（本地 daemon RPC，`export` 只读本地数据目录，无远端取件）
- Web 下载 md 已存在：`决策记录/文档下载入口（.md）`（纯前端、取 `displayedContent`）

---

## 8. 验收标准（整体）

1. **本仓**：只读 token `curl` 打 `/open/v1/asset` 拿到 image/png，字节数与本地文件一致；sha256 一致；无 token 401、越界 403、非白名单 404、`downloadApi=false` 404。
2. **本仓**：`ping` 返回 `contractVersion` 与 `capabilities.downloadApi`；旧客户端（不读新字段）行为不变。
3. **客户端**：配两个源时不带 `--remote` → `NO_REMOTE_SPECIFIED` 且列出源；只有一个源时自动成功。
4. **客户端**：`asset get` 输出的绝对路径可被 IDE 直接读图，模型能说出图内像素级信息（对照 B2 口径）。
5. **客户端**：`doc get` 产出的 `.md` 与 Web「下载」内容一致（正文同源），附件落在相对引用位置；默认不覆盖已存在文件。
6. **回归**：`ki_get_image` 降级后，chat 面板读图不退化；`/api/asset` 既有消费方零影响。

---

## 9. 交付切片

| 批次 | 仓 | 内容 | 依赖 |
|---|---|---|---|
| B1 | 本仓 | `R1` + `R4` + `R3`（能力位）+ `R5`（文档 + 契约测试） | 无，**先发** |
| B2 | 本仓 | `R2` `GET /open/v1/doc` + 测试 | B1 |
| B3 | 本仓 | `R6` 阶段一：`ki_get_image` 降级（text + URL + 命令提示） | B1 |
| B4 | `ki-client` 子包 | 骨架 + `R7` 多源配置 + `remote`/`ping` 子命令 | B1 |
| B5 | `ki-client` 子包 | `R8` `asset get` | B1、B4 |
| B6 | `ki-client` 子包 | `R9` `doc get` / `download group` | B2、B4 |
| B7 | `ki-client` 子包 | `R10` `upload` 迁移 + `R11` skill 改造 + 使用文档 | B4 |
| B8 | 本仓 | `R6` 阶段二：MCP 通道物理移除（观测后） | B3 + 至少一个版本观察期 |

**跨仓约束**：客户端测试不进本仓测试套件；跨仓契约测试需要本仓提供可 CI 启动的服务（容器或 mock），否则客户端 CI 只能跑 mock 契约，标 `🟡`。

---

## 10. 关键假设与待确认

| ID | 内容 | 错了会怎样 | 验证方法 |
|---|---|---|---|
| A1 | IDE 侧 MCP 客户端短期不会渲染 image content | 下线 `ki_get_image` 属白做 | 跟客户端版本；事件 #90 已实测 |
| A2 | IDE 侧能执行 shell 且能读本地图片文件 | 「下载 → 看到」闭环断掉，R8 价值大减 | 一次小样：下载 1 张 PNG → 读图 → 复述像素信息 |
| A3 | `/open/v1` 能从 `mcp-http-api` 侧复用的函数边界清晰 | 需先抽公共模块，B1 工作量上浮 | 实现前确认 `resolveAssetPath` 是否可直接 import |
| A4 | `/api/doc/get` 的 `content` 可无损还原为原始 md（图片相对引用原样保留） | R9 还原度下降，退化为「JSON 自己拼」 | 取一篇带图文档实测 |
| A5 | chat 工具注册可独立于 MCP 通道 | R6 会连坐砍掉自家可看图能力 | 查 chat tool-loop 的工具来源 |

**待确认**

| # | 项 | 结论 |
|---|---|---|
| Q1 | `downloadApi` 缺省值：开 / 关 | **已定：开**（`ping` 回显，文档标「生产建议关」） |
| Q2 | 下载是否计入 scope 用量 | **已定：计入**，以独立 `download` 维度记录，不参与 `heat` 判定 |
| Q3 | `ki-client` 子包名与 `uv tool install` 的 URL | **已定：可以**，仓名与地址待实施 B4 前给出 |
