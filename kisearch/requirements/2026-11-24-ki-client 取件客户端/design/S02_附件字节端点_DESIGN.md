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

# S-02 `GET /open/v1/asset` 附件字节端点

**父文档**：[DESIGN.md](DESIGN.md) ｜ **需求**：[requirement.md](../requirement.md) R1

## 1. 术语

| 术语 | 定义 |
|---|---|
| `ref` | 文档正文里图片引用的相对路径（如 `shots/composer.png`），同时是 S-03 `images[].ref` 与本端点的 `path` 入参 |
| 双锚点校验 | ① assetsDir 必须落在该 scope 的 KB 根内 ② 解析结果必须落在 assetsDir 内 |
| mime 白名单 | `.png/.jpg/.jpeg/.gif/.webp/.svg/.ico/.bmp/.avif`（`ASSET_MIME` 单一来源） |

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/lib/mcp-http-api.ts:2201-2217` | `/api/asset` 路由与参数（`scope` / `group` / `path` / `trash`） |
| `src/lib/mcp-http-api.ts:2184-2199` | `resolveAssetDir()`：group 段级校验（拒 `..` / `.` / 空段 / 绝对路径） |
| `src/lib/mcp-http-api.ts:2144-2154` | **ASSET_MIME 的第二份定义**（第一份在 `asset-image.ts:36`） |
| `src/lib/mcp-http-api.ts:2237-2262` | SVG 加 `Content-Security-Policy: sandbox`；`Cache-Control: no-cache` |
| `src/lib/asset-image.ts:182` | `resolveAssetPath()`：与 `/api/asset` 同口径，返回结构化原因而非 HTTP 状态码 |
| `src/lib/open-api/index.ts:12-13` | 分发器注释：`/open/v1` 与 `/api/*` **各自独立、互不调用** |

## 3. 方案（TO-BE）

1. **新增文件** `src/lib/open-api/routes/asset.ts`：`handleOpenApiAsset()`，只做「参数校验 → `resolveAssetPath` → 读文件 → 写响应 + 留痕」。
2. **复用而非搬运（含两处实现期修正）**：

   - **路径解析**走 `src/lib/asset-path.ts::resolveAssetPath`。修正原因：原设计写「走 `asset-image.ts::resolveAssetPath`」，但该文件依赖 `import.js`（导入内核）与 `svg-raster.js`（SVG worker），从 HTTP 层 import 会把两者拉进模块图（`ping.ts` 的动态 import 就为躲同一件事）。做法：**把 `normalizeImageRef` / `resolveAssetPath` / `shorten` 抽到无重依赖的 `asset-path.ts`**（只依赖 `node:path` 与 `scope.js`），`asset-image.ts` 改为 import + re-export，既有调用方零改动。
   - **MIME 白名单**走 `src/lib/asset-mime.ts`（同理抽出，`mcp-http-api.ts` 删本地那份改 import）。
   - 两处的等价性由既有测试锁定（`test/asset-image.test.ts`、`test/import-assets.test.ts` 的 `/api/asset` 用例）。
3. **不支持的参数**：`trash`（回收站快照属 Web 治理能力，不对外）。
4. **响应头**：`Content-Type`（白名单）/ `Content-Length` / `Cache-Control: no-cache`（幂等重导会覆盖同名附件）/ `X-Content-Type-Options: nosniff`；SVG 追加 `Content-Security-Policy: sandbox`。
5. **计数与留痕**：成功 200 后调 `recordScopeUsage(scope,'download')` + `logDownload({endpoint:'asset', …})`（S-01）。

```
src/lib/open-api/
├── index.ts            # [修改] ROUTES 注册 GET /open/v1/asset
└── routes/
    └── asset.ts        # [新增] handleOpenApiAsset
src/lib/asset-mime.ts   # [新增] 附件白名单单一来源（无依赖）
src/lib/asset-path.ts   # [新增] 引用归一化 + 双锚点解析（无导入内核/worker 依赖）
src/lib/asset-image.ts  # [修改] 改为 import + re-export（两处）
src/lib/mcp-http-api.ts # [修改] 删本地 ASSET_MIME 定义，改 import asset-mime（仅此一处）
```

## 4. 接口设计

| 项 | 内容 |
|---|---|
| 方法/路径 | `GET /open/v1/asset` |
| 鉴权 | `Authorization: Bearer <token>`；只读 token 可用（GET） |
| 入参 | `scope`（必填）、`group`（必填，干净相对路径）、`path`（必填，assets 内相对路径 = `images[].ref`） |
| 返回 | 200 二进制流；`Content-Type` 取白名单 |
| 异常 | 见 §6 |

```bash
curl -H "Authorization: Bearer $KI_TOKEN" \
  "http://127.0.0.1:7423/open/v1/asset?scope=img-demo&group=demo&path=shots/composer.png" \
  -o /tmp/composer.png
# → HTTP 200, Content-Type: image/png, 字节数与 sha256 与库内文件一致
```

```json
// Demo 错误返回示例（仅示意格式）
{ "ok": false, "code": "OPEN_API_NOT_FOUND", "error": "Not Found: 附件不存在或类型不受支持" }
```

## 5. 数据模型

无新增数据模型。读取对象为 `{kb}/{scope}/{group}/assets/{path}`，权限依据为 token 的 `scopes` 授权。

## 6. 异常处理

| 场景 | 状态码 / 错误码 | 对外文案 | 说明 |
|---|---|---|---|
| 缺 `scope` / `group` / `path` | 400 `OPEN_API_BAD_REQUEST` | 缺参数：`<name>` | 与既有 `/open/v1` 错误信封一致 |
| `group` 含 `..` / `.` / 空段 / 绝对路径 | 403 `OPEN_API_PATH_FORBIDDEN` | 路径非法 | 走 `resolveAssetPath` 锚点一 |
| `path` 解析越出 assetsDir | 403 `OPEN_API_PATH_FORBIDDEN` | 路径非法 | 锚点二 |
| token 无该 scope 授权 | 403 `OPEN_API_SCOPE_FORBIDDEN` | 未授权该库 | 响应对库名脱敏，与既有口径一致 |
| 文件不存在 | 404 `OPEN_API_NOT_FOUND` | 附件不存在或类型不受支持 | 不带候选清单（清单由 S-03 提供） |
| `stat` 通过后文件被删除 / 正在被覆盖 | 404 `OPEN_API_NOT_FOUND` | 同上 | 读取阶段的 `ENOENT` 必须 catch 并映射 404，不能落 500 |
| 读到半写文件 | 不出现 | — | 导入侧附件复制已原子化（tmp + rename，`src/lib/import.ts::collectAndCopyAssets`），读侧只会看到「完整或不存在」两态 |
| 后缀不在白名单 | 404 `OPEN_API_NOT_FOUND` | 同上 | 与 `/api/asset` 同语义 |
| `scope` 是视图名 | 400 `OPEN_API_VIEW_UNSUPPORTED` | 视图不支持取件，请改用成员库名 | 复用 `isViewName`（`src/lib/scope-view.ts`）；MCP 侧视图可用，此处必须给出区分性文案，否则用户会误判文档丢失（推演 P3） |
| `ref` 是 `http(s)://` 外链 | 404 `OPEN_API_NOT_FOUND` | 同上，附「ref 应为 assets 内相对路径」提示 | 不发起外网请求 |
| `downloadApi=false` | 404 `OPEN_API_NOT_FOUND` | Not Found | S-01 开关，不泄露存在性 |
| 非 GET | 405 `OPEN_API_METHOD_NOT_ALLOWED` | 该路径只接受 GET | 带 `Allow` |

## 7. 关键决策点

| 决策 | 选择 | 被否决方案 | 否决理由 | 重评触发 |
|---|---|---|---|---|
| 传输方式 | 一次性读全量后写出（与 `/api/asset` 同实现） | 流式 `createReadStream` | 单附件默认 ≤ 5MB，全量读的内存峰值可接受；流式会让「读失败 → 已写响应头」的收尾变复杂 | 若 `maxAssetSize` 放开到 ≥ 50MB → 改流式 |
| `Range` 断点续传 | **不支持** | 支持 | 单文件 ≤ 5MB，客户端一次落地；`/api/asset` 也无 Range，支持会出现两套行为 | 若出现 > 20MB 附件或移动端弱网反馈 |
| `ETag` / `Last-Modified` | 不做 | 按内容 hash 出 ETag | 幂等重导会覆盖同名附件，hash 计算每次多一次全量读；客户端本来就每次全量拉 | 客户端出现「重复下载浪费带宽」的实际抱怨 |
| `trash` 参数 | 不支持 | 透传回收站 | 回收站是治理页能力，对外暴露扩大攻击面（`dirName` 曾出过穿越事件 #80） | 无 |
| ASSET_MIME | 前置层收敛到 `asset-image.ts` 单一来源 | 端点内复制一份 | 已有两份，再加就是三份，白名单漂移是必然 | 无 |

## 8. 影响范围

| 文件 | 改动 | 风险 |
|---|---|---|
| `src/lib/open-api/routes/asset.ts` | 新增 | 低（新文件） |
| `src/lib/open-api/index.ts` | 注册 1 条路由 | 低 |
| `src/lib/mcp-http-api.ts:2144-2154` | 删本地 `ASSET_MIME`，改 import | **中**：`/api/asset` 与回收站两条路径都读它，必须回归两者 |
| `/api/asset` 既有消费方（Web 预览、回收站、chat KB 图） | 行为不变 | 由前置层的回归测试兜住 |

**已知边界**：symlink 跟随行为与 `/api/asset` 保持同口径（不额外解析真实路径），本次不扩大也不收紧——若判定为漏洞，应两个端点一起修，不在本需求单独处理。

**已知边界（读取侧无上限）**：`maxAssetSize` 是**导入收集侧**的上限，读取侧不另设上限。历史遗留的超大附件（配置被调大过、或手工放进 assets）会被一次性读进内存——5MB 量级可接受，但不可宣称「内存有界」。若后续放开 `maxAssetSize` 到 ≥ 50MB，必须同时改流式（与 §7「传输方式」的重评触发绑定）。
