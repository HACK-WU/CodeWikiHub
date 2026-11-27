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

# S-03 `GET /open/v1/doc` 文档正文与附图清单端点

**父文档**：[DESIGN.md](DESIGN.md) ｜ **需求**：[requirement.md](../requirement.md) R2

## 1. 术语

| 术语 | 定义 |
|---|---|
| `displayedContent` 同源 | 端点返回的 `content` 与 Web 阅读器「复制 / 下载 .md」取的正文是同一份，不出现「两套事实」 |
| 不裁剪 | 端点**原样透出** `executeGetModuleInfoLocal` 的返回形状，不做字段白名单投影 |

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/lib/mcp-http-api.ts:2276, 2356-2359` | `/api/doc/get` 调 `executeGetModuleInfoLocal({scope, group, relation}, {noVectorFallback:true})`，`ok ? 200 : 404` **原样 sendJson** |
| `src/lib/mcp-http-api.ts:2325-2327` | 视图场景会遍历多个 member 逐个取（`member` 参数） |
| `src/get-module-info.ts` | `executeGetModuleInfoLocal`：正文 + `images[]` 清单的唯一来源 |
| 决策记录 `文档下载入口（.md）` | Web 已能下载正文（取 `displayedContent`，纯前端）→ 本端点不是新增人类入口，只服务程序化/批量 |

## 3. 方案（TO-BE）

1. **新增文件** `src/lib/open-api/routes/doc.ts`：`handleOpenApiDoc()` 校验参数 → 调 `executeGetModuleInfoLocal` → 原样 `sendJson` → 留痕 + 计数。
   **两处实现期补充**（写代码时发现，设计原文未覆盖）：
   - **内核必须动态 `import`**：`get-module-info.js` 会把 CLI/向量内核拖进模块图（`ping.ts` 与 `/api/*` 的 `getApiHandler()` 同一策略），静态 import 会拖慢 daemon 启动。
   - **失败体必须裁剪**：内核失败时的 `hint` 可能含**候选 Group 路径**（`get-module-info.ts` 的 `resolved.hint`），原样透出等于对外提供库结构探测 → 统一回 `{ok:false, code:'OPEN_API_NOT_FOUND', error:'文档不存在…'}`，不带 hint、不带候选。
2. **不裁剪形状**：返回体与 `/api/doc/get`、MCP `ki_get_module_info` 保持同形，客户端与 AI 侧不必为三个通道各写一层映射（这是「同源」的实现保障）。
3. **不支持 `member`（视图）**：视图聚合属 Web 语义，对外契约不稳定，且视图名与库名的混淆会让取件结果不可预测。
4. **不做可见性拦截，且不为此裁剪形状**：与 MCP 按名读一致——阶段 `hidden` 的文档仍可按名取到。需求 N6 的「提示」**已定案**（实读 `src/get-module-info.ts:453-477`）：

   - 返回体**已含** `lifecycle`（wiki/temp/event）、`eventId`、`expiresAt`、`remainDays`、`lifecycleWarning`、`revision` → 原样透出，客户端据此提示「临时文档 / 绑定事件 / 正文修订号」；
   - 返回体**不含**事件**阶段可见性**（hidden 是阶段属性，不在文档元数据里）→ 端点**不追加阶段查询**（避免一次额外扫描），由客户端固定提示「按名读取不受阶段可见性限制」。
5. **计数与留痕**：成功调 `recordScopeUsage(scope,'download')` + `logDownload({endpoint:'doc', …})`。

```
src/lib/open-api/
├── index.ts        # [修改] ROUTES 注册 GET /open/v1/doc
└── routes/
    └── doc.ts      # [新增] handleOpenApiDoc
```

## 4. 接口设计

| 项 | 内容 |
|---|---|
| 方法/路径 | `GET /open/v1/doc` |
| 鉴权 | `Authorization: Bearer <token>`；只读 token 可用 |
| 入参 | `scope`（必填）、`group`（必填）、`relation`（必填） |
| 返回 | 200 JSON（形状同 `executeGetModuleInfoLocal`：`content` + `images[]` + 生命周期等既有字段） |
| 异常 | 见 §6 |

```bash
curl -H "Authorization: Bearer $KI_TOKEN" \
  "http://127.0.0.1:7423/open/v1/doc?scope=img-demo&group=demo&relation=composer"
```

```json
// Demo 返回示例（仅示意格式，字段以 executeGetModuleInfoLocal 实际返回为准）
{
  "ok": true,
  "scope": "img-demo",
  "group": "demo",
  "relation": "composer",
  "content": "# 截图取证\n\n![composer](shots/composer.png)\n",
  "images": [
    { "ref": "shots/composer.png", "mime": "image/png", "bytes": 95372, "supported": true }
  ]
}
```

> 客户端取附件的链路：`images[].ref` **原样**作为 S-02 的 `path`，不需要任何转换（父文档 §4 的跨子需求对齐要求）。

## 5. 数据模型

无新增数据模型。读取对象为 `{kb}/{scope}/{group}/{relation}.md`（经 `executeGetModuleInfoLocal` 的既有解析）。

## 6. 异常处理

| 场景 | 状态码 / 错误码 | 对外文案 | 说明 |
|---|---|---|---|
| 缺任一必填参数 | 400 `OPEN_API_BAD_REQUEST` | 缺参数：`<name>` | — |
| 文档不存在 | 404 `OPEN_API_NOT_FOUND` | 文档不存在 | **不返回候选清单**（避免泄露全库结构）；候选由 MCP `ki_get_module_info` / `ki_search` 提供 |
| scope 未授权 | 403 `OPEN_API_SCOPE_FORBIDDEN` | 未授权该库 | 库名脱敏 |
| `scope` 是视图名 | 400 `OPEN_API_VIEW_UNSUPPORTED` | 视图不支持取件，请改用成员库名 | 复用 `isViewName`（`src/lib/scope-view.ts`）；与 S-02 同码同文案 |
| `member` 传入 | 400 `OPEN_API_BAD_REQUEST` | 不支持 member（视图）参数 | 显式拒绝而非忽略，避免调用方以为生效 |
| `downloadApi=false` | 404 `OPEN_API_NOT_FOUND` | Not Found | S-01 开关 |
| 非 GET | 405 `OPEN_API_METHOD_NOT_ALLOWED` | 该路径只接受 GET | 带 `Allow` |
| 正文读取内部异常 | 500 `OPEN_API_INTERNAL` | 服务内部错误，请查看服务端日志 | 不泄露本地路径 |

## 7. 关键决策点

| 决策 | 选择 | 被否决方案 | 否决理由 | 重评触发 |
|---|---|---|---|---|
| 返回形状 | 原样透出 `executeGetModuleInfoLocal` | 定义对外 DTO 白名单 | 白名单会与 MCP / `/api/doc/get` 形成三套形状，正文与 `images[]` 一改就漂移；同形是「同源」的唯一保障 | 若返回体泄露内部字段（如本地绝对路径）→ 再收一层裁剪 |
| 视图聚合 | 不支持 `member` | 支持 | 视图是 Web 聚合概念，成员变更频繁，取件结果不可预测 | 客户端明确需要「跨库一次取」时另立需求 |
| hidden 阶段文档 | 按名可取、不拦截 | 404 拒绝 | 与 MCP 按名读口径一致；拦截会让「事件收口后取不到材料」 | 出现按名取隐藏文档的合规要求 |
| 候选清单 | 不返回 | 返回「你是想取这几篇吗」 | 404 带候选等于对外提供目录探测能力 | 无 |

## 8. 影响范围

| 文件 | 改动 | 风险 |
|---|---|---|
| `src/lib/open-api/routes/doc.ts` | 新增 | 低 |
| `src/lib/open-api/index.ts` | 注册 1 条路由 | 低 |
| `src/get-module-info.ts` | 不改（只被调用） | 无 |

**依赖 S-01**：开关判定、留痕函数、`download` 计量维度。**依赖形状**：`images[].ref` 必须可直接作为 S-02 的 `path`（已对齐）。
