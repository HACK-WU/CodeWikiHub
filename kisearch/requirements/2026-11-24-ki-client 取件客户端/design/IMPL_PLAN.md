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

# 实施计划：ki 只读取件契约（`/open/v1`）

**设计基线**：[DESIGN.md](DESIGN.md) + S01~S04 ｜ **骨架冻结 commit**：— ｜ **执行方式**：**单窗口串行**

**并行判定（保守）**：砖头 4 片；跨砖头接口 6 个；**改造现有逻辑的砖头占比 3/4**（`open-api/index.ts`、`scope-usage.ts`、`mcp-http-api.ts` 都是改现有文件）；共享面 4 处；工作总量估不出 → 按 `design-craft` 5.5「估不准即倾向串行」。**不走** `delivery-slicing` 并行链。

## 1. 前置层（不进批次，先于全部砖头）

| # | 前置项 | 内容摘要 | 完成判据 |
|---|---|---|---|
| 1 | `ASSET_MIME` 单一来源 | **新增无依赖的 `src/lib/asset-mime.ts`** 作为唯一来源；`asset-image.ts` 改为 import + re-export（既有调用方零改动）；`mcp-http-api.ts` 删本地定义改 import 它。（**实现期修正**：不直接 import `asset-image.js`——它带 `import.js` 与 `svg-raster.js`，会把导入内核与 worker 拉进 HTTP 模块图） | `/api/asset`（含 `trash` 分支）与 `ki_get_image` 回归全绿；白名单只剩一处定义。**已核对**：两份原为同样的 9 项且值一致，收敛不改行为 |
| 2 | 错误码表补齐 | 核对 `src/lib/open-api/respond.ts` 现有码表，缺 `OPEN_API_BAD_REQUEST` / `OPEN_API_PATH_FORBIDDEN` / **`OPEN_API_VIEW_UNSUPPORTED`** 则新增，与既有 `OPEN_API_*` 命名一致 | 文档 §错误码 与 `respond.ts` 一一对应；视图名探针返回 400 而非 404 |
| 3 | 路由挂载位 + 桩 | 在 `src/lib/open-api/index.ts:58-68` 注册两条读路由，指向 `handleOpenApiAsset` / `handleOpenApiDoc`；同时创建两个桩文件（返回 501），**导出名与签名定死** | 主干可编译；两桩被调用时返回 501；`downloadApi` 开关可拦到它们 |
| 4 | 横切约定 | 留痕日志字段（S-01 §4）、`encodeURIComponent` 编码 `path`（含 `/`）、错误信封沿用 `sendOpenApiError` | 无第二条日志格式/编码口径 |
| 5 | **`asset-path.ts` 抽取**（实现期新增） | 把 `normalizeImageRef` / `resolveAssetPath` / `shorten` 从 `asset-image.ts` 抽到无重依赖的 `asset-path.ts`，避免 HTTP 层 import 时把导入内核与 SVG worker 拉进模块图 | `asset-image.ts` 仅 re-export；`asset-image` 7 例与 `import-assets` 26 例回归全绿 |

> 前置层 3 是本次「文件互斥」的关键：把 `open-api/index.ts` 的改动**一次性收在 S-01 批**，S-02/S-03 才只新增各自 handler 文件、互不碰同一文件。

## 1.5 前端视觉基线（壳）

无（本次不涉及前端页面）。

## 2. 批次表

| 批 | 工作项 | 层级 | 承接验收项（需求 §8） | 并行 | 串行原因 | 基线 commit |
|---|---|---|---|---|---|---|
| 前置 | 前置层 1~4 | 前置 | —（不承接功能验收） | — | 先于全部砖头 | — |
| 第 1 批 | **S-01** 只读通道基础 | 根 | ②「`ping` 返回 `contractVersion` 与 `capabilities.downloadApi`；旧客户端行为不变」；①的开关部分「`downloadApi=false` 两端点 404」 | ∥（唯一） | — | — |
| 第 2 批 | **S-02** `GET /open/v1/asset` | 业务 | ①「只读 token curl 取到 image/png，字节数与 sha256 与本地一致；401 / 403 / 404 / 405 四态」 | **∥ S-03** | 依赖第 1 批（开关 / 留痕 / 计量） | 第 1 批完成后 |
| 第 2 批 | **S-03** `GET /open/v1/doc` | 业务 | ⑤的正文部分「`content` 与 Web 下载同源；`images[].ref` 可直接作为 S-02 的 `path`」 | **∥ S-02** | 同上 | 第 1 批完成后 |
| 第 3 批 | **S-04** `ki_get_image` 降级 | 业务 | ⑥「降级后返回 text + URL；chat 面板读图不退化」 | → | 依赖 S-02 的 URL 形态 + `mcp.http.publicUrl` | 第 2 批完成后 |

**文件互斥校验**：

| 砖头 | 独占写 | 只读 / 禁碰 |
|---|---|---|
| 前置 | `src/lib/mcp-http-api.ts`（仅 ASSET_MIME 定义段）、`src/lib/open-api/respond.ts` | 其他文件 |
| S-01 | `src/lib/open-api/index.ts`、`open-api/constants.ts`、`open-api/audit.ts`、`open-api/routes/ping.ts`、`src/lib/scope-usage.ts`、`src/lib/config-schema.ts`、两个桩文件 | `routes/asset.ts` / `routes/doc.ts` 的实现体、`mcp-http-api.ts` 其余段 |
| S-02 | `src/lib/open-api/routes/asset.ts`（填桩） | `open-api/index.ts`（只读）、`asset-image.ts`（只读） |
| S-03 | `src/lib/open-api/routes/doc.ts`（填桩） | `open-api/index.ts`（只读）、`get-module-info.ts`（只读） |
| S-04 | `src/lib/mcp-tools/get-image.ts`、`docs/mcp-tools.md` | chat 注册表（**禁碰**） |

**覆盖反向检查**：需求 §8 六条验收标准 → ①→S-02、②→S-01、③④→`ki-client` 子包（不在本仓）、⑤→S-03、⑥→S-04。需求 R5（契约文档 + 契约测试）**不单列子文档**，由每批随实现交付（见 §3 检查点 1）——**这是有意的归属决定，不是遗漏**。除 ③④ 外**无孤儿、无重叠**。

## 3. 每批检查点（批次边界）

1. 上批契约测试全绿（`test/open-api-*.test.ts`），且本批涉及的端点已在 `docs/open-api.md` 补齐（承载需求 R5，**不单列子文档、随批交付**）。契约测试必须含两条 ref 形态断言：`shots/a.png` 与 `./assets/a.svg`（后者验证端点侧 `normalizeImageRef` 归一化后仍与双层目录自洽，见 S02 §6 / 推演 P7）；
2. 契约是否需修订——**仅此处可改**：`ping` 字段、错误码、URL 形态；
3. 主干可编译、可运行（`npm run build` + 起 daemon 手测一次）。

## 4. 执行方式

**单窗口串行**，按 前置 → 第 1 批 → 第 2 批（S-02 与 S-03 可交替进行，因文件互斥）→ 第 3 批。

本可并行但本次串行的相邻项：`S-02` 与 `S-03` 技术上可并行（仅两处文件交集，已用桩消除），本次选择串行是因为两者共享 S-01 的留痕/计时代码，串行便于一次把开关与计量的测试补齐后再分支；若后续想并行，前置层 3 完成后即可直接切 `delivery-slicing`。

**非功能预算**：本需求无显式性能指标；约束为 S-02 单次响应 ≤ `maxAssetSize`（默认 5MB）、S-03 单篇正文量与 `/api/doc/get` 持平（实测最大约 29 万字符）。留痕与计数的额外开销为 O(1) 内存自增 + 一行 stderr。

## 5. 未纳入本计划（明确不做）

| 项 | 原因 |
|---|---|
| `ki-client` 客户端实现（B4~B7） | 子包，按契约对齐，不在本仓批次 |
| `ki_get_image` 物理移除（阶段二） | 需先有一个版本观察期，另立需求 |
| `Range` / `ETag` | 已在 S-02 §7 否决，附重评触发条件 |
| `/api/*` 任何改动 | 冻结，本需求不碰 |
| 客户端 CI 载体（容器 / mock 服务） | 属`ki-client` 子包基建，需求 §10 Q3 待定 |
