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

# S-04 `ki_get_image` MCP 通道降级（阶段一）

**父文档**：[DESIGN.md](DESIGN.md) ｜ **需求**：[requirement.md](../requirement.md) R6 阶段一

## 1. 术语

| 术语 | 定义 |
|---|---|
| 协议适配层 | `src/lib/mcp-tools/get-image.ts` —— 只负责把执行结果转成 MCP `content` 数组并声明 tool description |
| 执行层 | `src/lib/asset-image.ts::executeGetImage` —— 真正的取图逻辑（解析 ref、读字节、栅格化 SVG） |
| 降级 | 协议适配层不再返回 `{type:'image'}`，改为 text + 可点击 URL + 本地取件命令 |

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/lib/mcp-tools/get-image.ts:23-82` | 返回 `[{type:'text'}, …{type:'image', data, mimeType}]` |
| `src/lib/asset-image.ts::executeGetImage` | 执行层，返回结构化结果（含 buffer） |
| `src/lib/mcp-server-factory.ts:67` | MCP 通道注册 `ki_get_image` |
| `src/lib/chat/mcp-tool-registry.ts` | **chat 通道独立注册**，走执行层 `executeGetImage`，不经过协议适配层 |
| 实测（事件 #90） | 协议层正确（真 HTTP 断言 `result.content` 含标准 image part，199KB base64），断在 IDE 客户端：转 `image_url` 后不解码，把 base64 当文本注入并截断 |
| 实测（REQ-20261123-008 B2） | 自家对话面板**可以**看图（模型说出了 README 里没有的像素级信息） |

## 3. 方案（TO-BE）

1. **只改协议适配层**：`get-image.ts` 返回改为 text-only，`content` 单元素。
2. **能力零损失**：chat 面板走执行层，不经本文件 → 降级只影响外部 MCP 客户端，**chat 读图不受影响**（两套注册表本就分离，无需拆表）。
3. **返回体**：

```json
{
  "ok": true,
  "count": 1,
  "images": [
    {
      "ref": "shots/composer.png",
      "mime": "image/png",
      "bytes": 95372,
      "apiUrl": "http://127.0.0.1:7423/open/v1/asset?scope=img-demo&group=demo&path=shots%2Fcomposer.png",
      "humanUrl": "http://127.0.0.1:7423/api/asset?scope=img-demo&group=demo&path=shots%2Fcomposer.png"
    }
  ],
  "hint": "本通道不返回图片内容（客户端不渲染 image content）。取件三条路：\n  ① 程序：GET apiUrl，需 Authorization: Bearer <token>；\n  ② 人看一眼：本机浏览器打开 humanUrl（回环免登录；跨机 / 反代场景不可用）；\n  ③ 落盘后交给读图能力：ki-client asset get --remote <name> --scope <scope> --group <group> --refs <ref> --out <dir>（打印绝对路径）。\n  单次 1~3 张，更多请分次调用。"
}
```

4. **URL 来源是两条，不是一条**（推演 P1 修正）：复用既有 `mcp.http.publicUrl` + `src/lib/doc-link.ts` 的绝对地址拼装逻辑（REQ-20261123-003 已建），**不新造一套**；`publicUrl` 未配置时回落为相对路径并在 hint 里说明「相对当前服务地址」。

   - `apiUrl` = `/open/v1/asset?…`：属**对外契约面**，Bearer-only，给程序/客户端用；
   - `humanUrl` = `/api/asset?…`：走浏览器语义（本机回环 local-admin 免登录），**仅作人类兜底链接，不构成对外契约面**。这不违反父文档「不复用 `/api/*`」的约束——那条约束针对的是**客户端程序的依赖面**，不是给人点开的链接；
   - **为什么不只给 `apiUrl`**：`/open/v1` 明确不读 Cookie、回环也必须带 Token（`open-api/auth.ts:31`），浏览器无法附加 `Authorization` 头 → 人点开必 401（推演 S2 实证）。

   **实现落点（实现期补充）**：新增 `mcp-tools/doc-link.ts::assetUrls()`，复用既有 `resolveBase()` 的取址逻辑，但传 `{ requireWeb: false }`——`resolveBase` 原本以「有没有前端产物」为前提（那是页面链接的门槛），而 API 端点只看主机就能拼，与 `--web` 无关。`ki_get_image` 侧只改协议适配层（`mcp-tools/get-image.ts`），执行层 `executeGetImage` 一行未动，故 chat 面板仍拿到真图片（`test/chat/tool-image.test.ts` 14 例、`tool-image-budget` 1 例回归全绿）。
5. **tool description 同步**：`mcp-tools/get-image.ts` 的 description 改为「返回图片清单与 HTTP 取件地址（本通道不返回图片内容）」。chat 侧 description 在 `chat/mcp-tool-registry.ts` 独立维护，**保持原样**（仍宣称能取图）。
6. **阶段二不在本设计内**：物理移除（从 `mcp-server-factory.ts` 与 5 张登记表摘除）另起需求，前置是至少一个版本的观察期。

```
src/lib/mcp-tools/get-image.ts   # [修改] 返回 text-only + URL + hint；description 改写
docs/mcp-tools.md                # [修改] ki_get_image 小节改写 + 迁移指引
```

## 4. 接口设计

| 项 | 内容 |
|---|---|
| 工具名 | `ki_get_image`（不变，避免客户端配置重建） |
| 入参 | `scope?`（默认 default）/ `group`（必填）/ `refs[]`（1~3 张，不变） |
| 返回 | `content: [{ type: 'text', text: <上述 JSON 字符串> }]`；无 image part |
| 失败 | 零命中仍 `isError: true`，text 里给「可用 refs 从 `ki_get_module_info` 的 `images[]` 取」 |

## 5. 数据模型

无新增。URL 由 `scope/group/path` 三参拼装，`path` 需 `encodeURIComponent`（含子目录 `/` 也必须编码，避免被当作路径分隔误解析）。

## 6. 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| `downloadApi=false` | `apiUrl` 照常生成；hint 换为该态专用文案：「清单仍可从 `ki_get_module_info` 的 `images[]` 取；取件需运维开启下载接口」。`humanUrl` 不受该开关影响（走 `/api/asset`），仍可点开 | 是（给出替代路径，不让工具退化为纯噪声——推演 P4） |
| `publicUrl` 未配置 | 返回相对路径 + hint 说明 | 是 |
| ref 不存在 | `isError: true`，text 列出「该 ref 不在清单内，请先用 ki_get_module_info 取清单」 | 是 |
| `executeGetImage` 抛错 | 沿用现有 catch → `isError: true` + 原始原因 | 是 |
| chat 通道调用 | **不受影响**（走执行层） | — |

## 7. 关键决策点

| 决策 | 选择 | 被否决方案 | 否决理由 | 重评触发 |
|---|---|---|---|---|
| 降级范围 | 只改协议适配层，chat 保留 | ① 直接物理移除工具 ② 全通道降级 | ① 外部客户端还在调用，硬删是破坏性且不可逆，且观测期未到 ② chat 面板实测能看图，全降级等于砍掉自家可用能力 | 外部 IDE 客户端支持 image content（则整体回滚降级） |
| URL 形态 | **双 URL**：`apiUrl`（`/open/v1`，Bearer，给程序）+ `humanUrl`（`/api/asset`，浏览器可直开，给人） | ① 只给 `/open/v1` 一条 ② 只给 `/api/asset` 一条 ③ 只给相对路径 | ① 人点开必 401（`/open/v1` 不读 Cookie，推演 S2 实证）② 让 AI 侧依赖无稳定性承诺的浏览器语义通道 ③ IDE 侧无法直接打开 | 若 `downloadApi` 长期关闭成为常态，则 `humanUrl` 变成主路径，需重新评估是否把 `/api/asset` 的读取语义正式化 |
| 工具名 | 不变 | 改名（如 `ki_get_image_meta`） | 改名会让既有 MCP 配置与会话工具白名单失效，属不必要破坏 | 阶段二移除时一并处理 |
| 工具描述 | 改为「不返回图片内容」 | 保持原描述 | 描述不实会让模型反复调用并误判失败原因（这正是事件 #90 的现象） | 无 |

## 8. 影响范围

| 受影响方 | 影响 | 处理 |
|---|---|---|
| 外部 MCP 客户端 | 拿到 text 而非 image（本来也渲染不出来） | 文案给替代路径；阶段二再移除 |
| chat 面板读图 | 无影响 | 由「执行层/适配层分离」保证；需一条回归测试断言 chat 仍拿到 image part |
| `READ_ONLY_TOOL_NAMES` 等 5 张登记表 | 不需要改（工具仍存在且仍只读） | 阶段二才摘除 |
| `docs/mcp-tools.md` | 需改写 | 随实现更新 |

**待实现确认（不阻塞设计）**：chat 侧的 tool description 是否与 `mcp-tools/get-image.ts` 共用同一常量。若共用，需先抽出一个 chat 专用描述再改 MCP 侧，否则会连带改掉 chat 的宣称。
