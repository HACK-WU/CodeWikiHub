---
id: REQ-20261123-008
feature: MCP图片可读
status: 设计中
created: 2026-11-23
updated: 2026-11-23
version: 1
tags: [feat, integration]
depends_on: []
author: AI
document_type: requirement
---

# 需求：MCP 工具返回图片与文档附图可被 AI 读取

**关联**：事件 `#78`（收口跟踪）；与 `REQ-20261123-006`（用户上传图片）共享同一套图片口径
**设计**：[design/DESIGN.md](design/DESIGN.md)

---

## 1. 问题

知识库文档里的截图（页面上正常显示，如「附图 (11-23)」），在 AI 侧完全不可见：

- 24 个 MCP 工具统一返回 `content:[{type:'text'}]`，没有 image content；
- 对话链路把工具结果 `JSON.stringify` 后按 10000 字符截断，图只剩 `![](assets/x.png)` 字符串；
- AI 分析链路同理（`analysis-runner.ts` 再截 2000 字），无任何读图分支。

结果：**用户看到的和 AI 看到的不一样** —— 文档截图承载的关键信息（报错界面、监控面板、数据样本）模型完全拿不到。

---

## 2. 需求条目

| ID | 需求 | 验收标准 |
|---|---|---|
| **R1** | 读文档类工具返回结构化图片清单 | `ki_get_module_info` 与 `ki_event_get` 返回体带 `images[]`（index / ref / mime / bytes / supported / reason），正文原样不动；两处共用同一函数，形状一致 |
| **R2** | 提供按需取图能力 | `ki_get_image(group, refs[])`（`refs` 1~3 张，**scope 由运行时注入、不在参数里**）取回图片，模型能基于图片内容回答（用可核验图验证） |
| **R3** | 对话链路支持工具图片 | tool 消息可携带图片 part；模型回答体现图内信息 |
| **R4** | 分析链路同步 | 事件 AI 分析读文档时同样能看到附图 |
| **R5** | 预算与计量口径 | 图片不进字符预算；`computeContextChars` 兼容数组 content（不把 `array.length` 当字符数） |
| **R6** | 格式与失效降级 | PNG/JPEG/WebP 直传；**SVG 服务端栅格化为 PNG**（实测中文渲染正确、704 tokens，见设计 §3.2）；GIF/BMP/ICO/AVIF 不支持；引用缺失/渲染失败给可读错误 |

---

## 3. 已定口径

| 项 | 结论 |
|---|---|
| 预处理 | **不做**（与 REQ-006 一致：原图直传） |
| 图片字节如何送达 | **base64 data URI**（内网 `/api/asset` 上游取不到，URL 方案不可行） |
| 上下文成本 | 按像素尺寸计 token（1024²=652、1568²=994），**与 base64 长度无关**；但每轮请求需重传，故历史只带最近 1 次带图结果 |
| 单次取图上限 | ≤3 张、单张 ≤4MB |
| SVG | **服务端栅格化**（`@resvg/resvg-js`，最大宽 1568，worker 串行；实测 1568×743 / 150KB / 704 tokens、中文正确） |
| 清单获取方式 | 只给元数据，图片按需取（不自动附带） |

---

## 4. 现状证据

- `src/lib/mcp-tools/*`：全部 `content:[{type:'text'}]`
- `src/lib/chat/retrieval/tool-response.ts:32-48`：`JSON.stringify` + 10000 字符二分截断
- `src/lib/chat/retrieval/tool-loop.ts:954-956`：`role:'tool'` 纯文本入上下文
- `src/lib/chat/retrieval/tool-loop.ts:544-560`：`m.content.length` 按字符计数（数组化后会少算）
- `src/lib/events/analysis-runner.ts:1602-1607`：再截 2000 字，无读图分支
- 可复用：`extractImageRefs`（`src/lib/import.ts:576`）、`getAssetsDir`（`src/lib/scope.ts:128`）、`/api/asset` 双锚点校验（`src/lib/mcp-http-api.ts:2184-2200`）

实测依据：`../2026-11-23-AI对话图片输入/demo/verify/verify-report.md`

---

## 5. 待定

1. 取图用独立工具（当前设计）还是给读文档工具加参数 —— 设计取前者，待评审。
2. ~~首批覆盖工具范围~~ —— **已拍板（2026-11-23）**：`ki_get_module_info` + `ki_event_get`；`ki_search` 不做（片段可能截在图片引用中间，解析价值低）。
3. 分析链路多篇文档各带图时的裁剪策略。
4. 外部 MCP 客户端是否渲染 `{type:'image'}`（未实测）。
