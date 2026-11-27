---
id: REQ-20261120-003
feature: 知识地图图集
status: 草案
created: 2026-11-20
updated: 2026-11-24
version: 5
tags: [feat, web, 知识地图]
depends_on: []
author: AI
document_type: requirement
---

# 知识地图图集（REQ-20261120-003）v4

> **v4 修订说明（重要）**：本版把交付形态从「平台拆条目 + 前端重新渲染」改为「**整包部署 + iframe 加载**」。
> 起因是评估外部 `project-atlas` skill 时发现：原方案要求 kisearch 侧按 `config + SVG + snippets` 再实现一遍渲染与抽屉，等于同一件事做两次。
> **被推翻的旧判断**：v3 的 D8「单条上传 `POST /api/atlas/entry`（base64 ≤5MB）+ MCP `ki_atlas_save`」、D10「抽屉 `min(560px,92vw)`」——整包形态下不再需要平台侧抽屉；D9 软归档与 D12「快照随包、平台不读源码」保留并适配。
> **待用户拍板**：D8 正式作废与否（见 §9 P1）。

---

## 1. 背景与目标

知识库擅长回答「已知要找什么」，回答不了「这套系统大概是怎么回事」：架构、核心链路、后台进程、配置只能一篇篇搜。本需求给出一个**独立浏览入口**，把系统按「读者想理解什么」画成图集，每张图配摘要与逐条解读，点节点可看生成时的代码快照。

**这一版要达成的目标（可判定）**：

| 目标 | 判定方式 |
|---|---|
| G1 有人能在浏览器里看到「本项目的地图」 | 打开 `/atlas` 能看到至少 1 张图，节点可点开代码 |
| G2 生成只做一次 | 生成与打包全部在本地 skill 完成，平台侧零渲染实现 |
| G3 不新增渲染维护面 | 平台新增代码只含「存的接口 + 取的接口 + 一个 iframe 页面」 |

**不追求**：图集替代搜索、图集在线编辑、图集自动更新。

## 2. 范围

### 2.1 一期做

- 图集**整包**上传、存储、鉴权下发、页面嵌入、状态可见、删除
- 生成与打包沿用外部 `project-atlas` skill（`pack_atlas.py` 产出**自包含单文件 HTML**）
- 随包携带元信息（标题、分支、基线 commit、生成时间、图数），用于顶栏展示与过期判断

### 2.2 一期不做（明确排除）

| 不做 | 理由 |
|---|---|
| 平台侧解析包内容、重渲染、重做抽屉 | 会把同一件事做两遍（本版修订的直接原因） |
| 平台内 AI 在线生成图集 | 运行时无 archify，需自研 IR→SVG 渲染器；二期 |
| 图集文字进检索索引 | 切片粒度与混排效果未验证；二期 |
| 深链到某一页（`/atlas?page=search`） | iframe 内状态不进外层 URL；二期用 `postMessage` 同步 |
| 暗色主题适配 | 图集框架目前零暗色支持，属生成侧改造；一期接受为已知限制 |
| 图集作为「文档」出现在浏览页列表 | 图集不是文档，不参与文档计数与生命周期分类 |

## 3. 方案

### 3.1 形态

```
生成侧（本地，一次）                        平台侧（一次）
  策划分类 + 解读 ┐                       ┌─ /atlas 页（iframe）
  archify 出 SVG  ├─ pack_atlas.py ──▶    │      │
  collect_snippets┘   单文件 atlas.html    │      ▼
                     （baked:true，自包含） └─ GET /api/atlas/view?scope=…
                                                   │  鉴权 + scope 校验
                                                   ▼
                                          <kb>/<scope>/.atlas/atlas.html
                                          （+ meta.json 记录基线）
```

要点：

- **包是自包含的**：图源、字体、片段、配置全内联，`baked: true` 时不读外部 `atlas.config.json`，因此不依赖任何静态目录（已实测 `file://` 双击可运行）。
- **平台不做静态托管**：`webDir` 的静态服务在鉴权之前（`src/lib/mcp-http.ts:901-908` 调 `serveStatic`，鉴权在 `:911`），把 HTML 放进去会绕过登录暴露整份架构与代码快照。**必须走 `/api/*` 分支**。
- **iframe 取数靠 Cookie 会话**：同源 iframe 不会带 `Authorization` 头，只能用登录 Cookie。接口契约里禁止用 URL 传 token。

### 3.2 生成侧约定（部署包契约）

| 项 | 约定 |
|---|---|
| 产物 | `pack_atlas.py <图集目录> dist/` 产出的**单个** `.html` 自包含文件 |
| 必需标记 | 含 `baked: true`；首 1 KB 内出现 `<!DOCTYPE html` |
| 禁止项 | 外链资源（`http(s)://` 的 script/style/img/font）；未替换的占位符 |
| 体积 | 单包 ≤ 10 MB（典型 6 图 ≈ 1.4 MB，字体去重后；实测 249 KB 与 1266 KB 首屏无差异，见验证报告 R-03） |
| 随包元信息 | `{ title, branch, baseline, generatedAt, viewCount, gitCommit }`，由生成侧从 `atlas.config.json` 读取后一并提交 |
| 校验 | 上传接口拒绝：非 HTML、缺 `baked`、含外链、超体积、解析 meta 失败 |

### 3.3 存储

```
<kbDir>/<scope>/.atlas/
├── atlas.html          # 当前生效的包（原子替换）
├── meta.json           # { title, branch, baseline, generatedAt, viewCount, sha256, size, uploadedAt, uploadedBy, previous? }
├── archive/            # 保留最近 1 版，便于回滚（见 §9 P3）
│   └── atlas-<ts>.html
└── .upload/<uploadId>/ # 分片暂存，最后一片到达才合并落盘（验证报告 A2）
```

- 目录以 `.` 前缀与 group 区分，避免被文档扫描当成知识内容（与 `.relations`、`.trash` 同口径）。
- 写入走 `walWrite` + 先写临时文件再原子替换，禁止半成品落盘。
- **分片暂存必须有过期清理**：中断的上传会留下 `.upload/<uploadId>/`，超过 24h 未完成即删除（复用 `~/.ki/import-uploads` 的清理范式，勿另造一套）。

## 4. 需求条目

| ID | 条目 | 优先级 | 可行性 | 复杂度 | 主导维度 |
|---|---|---|---|---|---|
| R-01 | 整包上传接口 `POST /api/atlas/package` | P0 | ⚠️ 有条件 | 中 | 结构面 |
| R-02 | 图集查看接口 `GET /api/atlas/view` | P0 | ✅ 可实施 | 低 | 结构面 |
| R-03 | 图集状态接口 `GET /api/atlas/status` | P1 | ✅ 可实施 | 低 | 结构面 |
| R-04 | `/atlas` 页面 + 侧栏入口 | P0 | ✅ 可实施 | 低 | 结构面 |
| R-05 | 图集卸载 `DELETE /api/atlas/package` | P1 | ✅ 可实施 | 低 | 结构面 |
| R-06 | 生成侧打包规范（skill 侧落实） | P0 | ✅ 可实施 | 中 | 结构面 |
| R-07 | CLI 上传命令 `ki atlas upload` | P2 | ✅ 可实施 | 低 | 结构面 |
| R-08 | MCP 工具 `ki_atlas_upload` | P2 | ⚠️ 有条件 | 高 | 依赖面 |
| R-09 | Markdown 导出（复用包内按钮） | P2 | ✅ 已具备 | 低 | — |

### R-01 整包上传 `POST /api/atlas/package`

- **描述**：接收部署包与元信息，校验通过后原子落盘。同 scope 重复上传即覆盖（幂等），旧包进 `archive/`。
- **请求**：复用现有 base64 分片范式（`POST /api/import/upload` 已是 `files:[{name,content}]` + `batchIndex/batchCount`，见 `src/lib/mcp-http-api.ts:2594-2601`），不新造 multipart。
- **权限**：`knowledge.write` + scope 白名单 + 只读库拒绝（`rejectIfScopeReadonly`）。**scope 必须从 body 取（不从 query），越权校验必须在读 body 之后**——验证原型第一版从 query 取 scope，导致只读库写入用错权限校验通过（验证报告 A1）。
- **验收**：
  1. 正常包上传后 `GET /api/atlas/status` 返回 `sha256/size/uploadedAt` 与包一致；
  2. 同一 scope 二次上传覆盖，`archive/` 出现上一版；
  3. 缺 `baked` / 含外链 / 超 10 MB → 400 或 413，错误码可辨识；
  4. 无写权限 → 403；只读 scope → 409（沿用既有错误码口径）；
  5. 分片中断后重传同 `uploadId` 可续传或整体重来，不出现半成品 `atlas.html`；
  6. 中断超过 24h 的 `.upload/<uploadId>/` 被清理，不无限堆积（验证报告 A2）。

### R-02 图集查看 `GET /api/atlas/view?scope=`

- **描述**：鉴权 + scope 校验后返回 `text/html`；未上传时返回 404 + JSON 错误码（不返回空白页）。
- **响应头**：`Content-Type: text/html; charset=utf-8`、`X-Frame-Options: SAMEORIGIN`、`Content-Security-Policy: frame-ancestors 'self'`、`Cache-Control: no-cache`。
- **失败态归属**：本接口的 401/403/404 是 **JSON**，iframe 直接加载会把裸 JSON 渲染成一屏文字。`/atlas` 页面必须**先查 status 再决定是否创建 iframe**，不得让 iframe 吃错误响应（验证报告 A3）。
- **验收**：
  1. 有权限且已上传 → 200，浏览器能渲染图、节点可点开代码；
  2. 越权访问其他 scope → 403，且响应不泄露该 scope 是否存在；
  3. 未上传 → 404 + `code: ATLAS_NOT_FOUND`；
  4. 包损坏（文件缺失/为空）→ 500 + `code: ATLAS_CORRUPTED`，页面给可读提示；
  5. 未登录 / 未上传 / 越权三种失败态在 `/atlas` 页面**都不出现裸 JSON**。

### R-03 图集状态 `GET /api/atlas/status?scope=`

- **描述**：返回 `{ exists, title, branch, baseline, generatedAt, viewCount, size, sha256, uploadedAt }`，供页面顶栏与空态使用。
- **验收**：未上传时 `exists: false` 且其余字段缺省；已上传时字段与 `meta.json` 一致。

### R-04 `/atlas` 页面 + 侧栏入口

- **描述**：新增页面，主区为 `iframe`（`src=/api/atlas/view?scope=<当前 scope>`），顶部一条状态栏（标题 / 分支 / 基线 commit / 生成时间 / 「生成时快照，不代表 HEAD」/ 重新上传入口）。
- **iframe 属性（已验证必需）**：`sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"`。少 `allow-scripts` 图不渲染、少 `allow-downloads` 导出被拦（验证报告 A4）。
- **空态**：未上传时不出 iframe，给三步指引（打什么命令、包放哪、点上传），不得白屏。
- **验收**：
  1. 侧栏出现「知识地图」，位置在「对话」之后，受 `canSeeNavItem` 权限过滤；
  2. 切换 scope 后 iframe 重新加载对应库的图集；
  3. 空态与错误态各有明确文案与操作入口；
  4. 顶栏 H1 随路由变为「知识地图」；
  5. iframe 内节点可点、抽屉可开、`导出 ↓` 能下载 zip（三条已在原型实测通过）。

### R-05 图集卸载 `DELETE /api/atlas/package?scope=`

- **描述**：删除当前包（旧版仍留在 `archive/`，便于回滚），不是软归档状态机——整包只有一个「当前版本」。
- **验收**：删除后 `status.exists=false`、`view` 返回 404；`archive/` 不受影响。

### R-06 生成侧打包规范

- **描述**：`project-atlas` skill 侧固化「部署包 = 单文件 + meta」，并在 `pack_atlas.py` 增加体积与自包含自检。
- **验收**：对 ksearch 自身跑一次，产出的包满足 §3.2 全部约定并通过 R-01 校验。

### R-07 / R-08 上传通道

- R-07 CLI：`ki atlas upload --scope <s> --file dist/atlas.html`，复用 HTTP 接口，先做这个。
- R-08 MCP：`ki_atlas_upload(scope, path)`，需同步 6 张登记表（`CHAT_MCP_TOOLS`、`MCP_TOOL_GROUPS`、`READ_ONLY_TOOL_NAMES`、`TOOL_CAPABILITIES`、`READ_MCP_TOOLS`、`mcp-server-factory` 只读块），漏一处即静默失效。一期不做。

### R-09 Markdown 导出

图集包顶栏已有「导出 ↓」（纯前端 `CompressionStream`，实测导出 9 个文件 / 4 图），iframe 内可直接用 → **产品侧零工作**，仅需在验收里确认可用。

## 5. 影响面

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 |
|---|---|---|---|---|
| 侧栏导航与权限过滤 | 展示 | 无感 | `web/src/layouts/AppShell.tsx:100-107`、`:293-297` | 加 1 个 NavItem + H1 标题表一行 |
| 路由权限覆盖率单测 | 流程 | **破坏**（未登记=404 且单测红） | `src/lib/auth/route-permissions.ts:9` | 登记 4 条路由 |
| scope 越权白名单 | 权限 | **破坏** | `src/lib/mcp-http-api.ts:1100-1108`（硬编码字面量） | `/atlas/status`、`/atlas/view` 加入该表 |
| 静态服务 | 权限 | **破坏**（若误放 webDir） | `src/lib/mcp-http.ts:901-908` vs `:911` | 明确禁止，走 `/api/*` |
| 组删除与统计 | 数据 | 无感 | 目录为 `<scope>/.atlas/`，不在 group 下 | 无需改；回归确认不误计 |
| 备份 / 移库 / 导出 | 数据 | 无感 | 整 scope 目录遍历自然覆盖 | 回归验证 |
| 检索 / 向量 | 数据 | 无感（本期不入索引） | — | 二期再议 |
| 暗色主题 | 展示 | 降级（iframe 内固定浅色） | `web/src/styles/ki.css:104` vs 框架零暗色支持 | 一期接受，空态与状态栏说明 |

## 6. 负向需求

| # | 场景 | 期望行为 |
|---|---|---|
| N1 | 未上传就打开 `/atlas` | 空态 + 三步指引，不白屏、不出空白 iframe |
| N2 | 上传非 HTML / 缺 `baked` / 含外链 | 400 拒绝并说明缺哪一项，不落盘 |
| N3 | 超体积（>10 MB） | 413 + 明确上限文案，不静默截断 |
| N4 | 分片上传中断 | 不产生半成品 `atlas.html`；重传可续或整体重来 |
| N5 | 越权访问他库图集 | 403，且不泄露存在性（与 404 同文案策略） |
| N6 | 只读库上传 | 拒绝（沿用 `rejectIfScopeReadonly`），提示库为只读 |
| N7 | 包文件被外部删除/损坏 | `ATLAS_CORRUPTED`，页面给「重新上传」入口 |
| N8 | 图集内容已过期（源码已改） | 顶栏恒显基线 commit + 「生成时快照」声明；不假装实时 |
| N9 | 暗色主题下打开 | 接受为已知限制；顶栏不承诺跟随主题 |
| N10 | iframe 内触发顶层跳转 | `frame-ancestors 'self'` + iframe `sandbox` 限制越权导航 |
| N11 | 反复中断上传留下暂存 | `.upload/<uploadId>/` 超 24h 自动清理（验证报告 A2） |
| N12 | 直接在浏览器打开 `view` 接口 | 失败态是 JSON 而非白屏，且 `/atlas` 页面不会因此显示裸 JSON（验证报告 A3） |

## 7. 缺口回扫

| 维度 | 结论 |
|---|---|
| 场景完整性 | 通过（本地生成→上传→浏览→重传→卸载全链闭环）；「在线 AI 生成」已显式排除并写明二期 |
| 验收标准可达性 | 通过（每条 R 条目均有可判定断言，含错误码与状态字段） |
| 需求一致性 | 通过（D8/D10 的作废已在修订说明与 §9 P1 显式标注，不与正文并存两套方案） |
| 角色-需求对齐 | 通过（读者只需 `knowledge.read`；上传需 `knowledge.write`；只读库拒绝写） |
| 边界/异常覆盖 | 通过（N1~N12 覆盖空、错、断、越权、损坏、过期、暂存残留、裸 JSON） |
| 术语一致性 | 通过（图集=知识地图；部署包=自包含单文件 HTML；图源=SVG；快照=生成时代码片段） |

## 8. 关键假设

> 编号 H1~H3，避免与验证报告的「调整项 A1~A5」混淆。

| ID | 假设 | 错了会怎样 | 验证方法 |
|---|---|---|---|
| H1 | 单库图集 ≤8 图、单包 ≤2 MB 是常态 | 上限要重定；但实测 249 KB 与 1266 KB 首屏无差异，加载不会成为问题 | 拿 2 个真实项目各跑一次打包 |
| H2 | 主要读者是「新人接手 / 交付前」的一次性浏览 | 若日常高频使用，深链、暗色、按页更新会从二期变必做 | 上线后看访问分布与重复访问 |
| H3 | 整库视角够用，不需要 group 级图集 | 要支持子目录图集，存储与选择器都要改 | 问 1~2 位真实使用者 |

## 9. 待拍板

| ID | 事项 | 推荐 | 影响 |
|---|---|---|---|
| **P1** | 是否正式作废 v3 的 D8 单条上传 + D10 抽屉 | 作废（与整包互斥，留着会分叉） | 决定文档是否还有两套形态 |
| **P2** | 图集归属：scope（推荐）/ group / 独立库 | scope（图集是整库视角） | 存储路径、越权口径、卸载语义 |
| **P3** | `archive/` 保留几版 | 1 版（可回滚一次） | 磁盘占用与回滚能力 |
| **P4** | 一期是否只做 HTTP 上传 + CLI，MCP 后置 | 是（MCP 要 6 张登记表） | 一期工作量 |
| **P5** | 暗色、深链、入检索是否确认放二期 | 是 | 一期范围边界 |

## 10. 变更记录

| 版本 | 日期 | 内容 |
|---|---|---|
| v1 | 2026-11-20 | 初始创建（由事件 #47 拆出） |
| v2 | 2026-11-20 | 整包 multipart 64 MiB 替换 → 被推翻（假设「全部画完再传」，与逐张生成不符） |
| v3 | 2026-11-20 | 单条上传 D8 / 软归档 D9 / 抽屉 D10 / 共用服务层 D11 / 快照随 JSON D12 |
| v4 | 2026-11-24 | **改为整包部署 + iframe 加载**；D8、D10 待作废；新增 R-01~R-09、负向 N1~N10、打包契约 §3.2；清理已丢失的 demo 登记 |
| v5 | 2026-11-24 | demo-verify 复验后修订（19/19 断言通过）：体积上限 20→10 MB；`.upload/` 暂存与 24h 清理；写接口 scope 取 body；失败态归外层（禁止裸 JSON）；iframe sandbox 四件套；负向补 N11/N12；关键假设改编号 H1~H3 |

## 11. 证据附录

- 外部 skill：`/root/skills/skills/project-atlas/`（框架 1038 行；脚本 6 个共 917 行；`pack_atlas.py` 一条命令完成 build + check + 内联）
- 实测 demo：`/root/skills/demo/verify/kisearch-atlas/`（4 页 / 3 分类 / 25 节点 / 19 有代码；单文件 252 KB；`file://` 双击可运行）
- 走查截图：`.debug/atlas-integration-20261124/`（23 张，含 1440 / 900 / 375 三档、抽屉、单文件态、示例态）
- **技术验证原型**：`demo/verify/atlas-iframe/`（19 条断言全通过，含 249 KB / 1266 KB 两档包、鉴权、坏包、断传、暗色）
- **验证报告**：`demo/verify/verify-report.md`
- 关联事件：**#47**「知识地图：按分类浏览的架构图集（含代码快照）」
- 集成口径记忆：`kisearch-memory` → `决策记录/知识地图图集与 project-atlas skill 的集成口径`
