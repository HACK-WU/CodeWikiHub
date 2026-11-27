---
id: REQ-20261123-006
feature: AI对话图片输入
status: 草案
created: 2026-11-23
updated: 2026-11-23
version: 1
tags: [feat, ux]
depends_on: []
author: AI
document_type: demo
---

# 技术验证报告：上游多模态能力（图片 content part）实测

**需求**：AI 对话支持图片输入（R1~R4）／MCP 图片可读（R5，独立立项）
**验证目标**：Q3 —— 「图片如何进入上游 messages」这件事到底哪条路可行
**取证方式**：真实上游调用（非 mock），2026-11-23
**上游环境**：`https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1` · 模型 `deepseek-v4.1-flash-1017`（取自 `~/.ki/config.yaml`，未硬编码密钥）
**脚本**：`probe-image-multimodal.mjs`（4 组探测）· `probe-image-multimodal-2.mjs`（tool 图读取 + 尺寸/成本）

---

## 1. 结论（先看这四条）

| # | 结论 | 影响 |
|---|---|---|
| **C1** | **当前上游模型支持视觉输入**：`content` 传 `[{type:'text'},{type:'image_url',image_url:{url:'data:image/png;base64,…'}}]` 返回 200，模型准确读出图内三段色带 | 无需换模型；`llm.supportsImages` 可按此模型置 `true` |
| **C2** | **`role:'tool'` 消息可以直接承载 `image_url` part，且模型真的会读** —— 回答里主动说明「以下颜色名来自结果中附带的图片」 | **推翻了原报告的"tool 消息不接受 image parts"假设**：R5 不必把图片挪进 user 消息，也**不必触碰**「上游 messages 末条恒为本轮 user」这条不变量 |
| **C3** | **`image_tokens` 只与像素尺寸相关，与文件体积无关**：1024×1024 的 6KB 图与 71KB 噪声图同为 **652** tokens | 「压缩画质/体积」不省成本，**只有缩小像素尺寸才省**。Q5 的产品口径应据此改 |
| **C4** | **图片 token 量级可接受**：小图 202、512² 184、1024² 652、1568² 994；单条 2 张 = 404（线性累加） | 一张图远小于一段长文成本；真正的风险是 base64 撑爆**字符**预算（口径问题），不是 token 成本 |
| **C5** | **上游直接拒收 SVG**：`data:image/svg+xml` → `HTTP 400 · The image format is illegal and cannot be opened: UnidentifiedImageError` | mime 白名单排除 SVG（Q-B / R2）；也说明"前端栅格化再传"是唯一可行路径，但它与 Q-C「不预处理」冲突，故不做 |

---

## 2. 探测明细

| 探测 | 形状 | 结果 |
|---|---|---|
| A user parts | 单条 user，`content` = text + image（240×120 三色带） | `200` · 回答「红色,绿色,蓝色」· `image_tokens=202` · 1985ms |
| B1 触发工具 | user 文本 + `tools`，`tool_choice:auto` | `200` · 返回真实 `tool_calls`（id `call_55cd…`） |
| **B2 tool 后追加带图 user** | user → assistant(tool_calls) → tool → **user(带图)** | `200` · 回答「红,绿,蓝」· `image_tokens=202` |
| C tool 消息承载 parts | tool 消息 `content` = `[{type:'text'},{type:'image_url'}]` | `200`（未报错，图被计费 202） |
| **① tool 图是否真被读到** | 同上形状，但明确追问"你从工具结果里看到的颜色" | `200` · 回答「红, 绿, 蓝（注：工具返回的结构化字段 `colors` 为 `null`，以下颜色名来自结果中附带的图片：上红、中绿、下蓝三条色带）」→ **确实读到了** |
| D 多轮后 user parts | user → assistant(文本) → user(带图) | `200` · 回答「红,绿,蓝」· 202 tokens |
| ② 尺寸 vs token | 512² / 1024²(6KB) / 1024²(71KB) / 1568²(103KB) | 184 / 652 / 652 / 994 tokens；1.9~2.9s |
| ③ 单条 2 张 | text + 2×image | `200` · `image_tokens=404`（累加） |
| ④ SVG | `data:image/svg+xml;base64,…`（三色带矢量图） | **`400`** · `invalid_parameter_error`：「The image format is illegal and cannot be opened: UnidentifiedImageError」 |

---

## 3. 对原判定要改的地方

| 原判定（PM 报告 v1） | 实测后 | 变化 |
|---|---|---|
| 「`role:'tool'` 通常不接受 image parts ⇒ 必须挂 user 消息」 | 实际接受，模型还读到了 | R5 的**结构面**从「跨消息重构 + 触碰不变量」降为「工具结果序列化抽图 + 注入 tool 消息」 |
| 「R5 可行性 🧪 待验证、复杂度 高」 | 关键不确定性已被实测消除 | 改判 **⚠️ 有条件**（剩余前置条件只剩图源编码与预算口径） |
| 「Q5 是否自动压缩（怕影响识别细节）」 | token 只跟尺寸走，压缩体积毫无收益 | 处理策略改为「超限时降分辨率到长边 1568（约 994 tokens）」，不必二选一 |
| 「一张图能撞穿 10000 字符工具预算」 | 成立，但性质变了 | 不是"图贵"，是"base64 按字符计"的口径错误 ⇒ 图片**不进**字符预算 |

---

## 4. 未覆盖 / 仍需验证

1. **中文小字 OCR**：本次测试图是纯色块，未验证界面截图里的小字（这是知识库文档附图的主要形态）。需真实截图补一轮。
2. **大请求体**：4MB 单图 → 约 5.3MB base64，上游与中间网关的上限未验证；对话侧 `readJsonBody` 目前无字节上限。
3. **其他上游/模型**：结论仅对 `deepseek-v4.1-flash-1017` 成立；换模型时 `supportsImages` 必须重新确认（这也是 D11「手填开关、不自动探测」的理由）。
4. **reasoning + 图片**：本次未开 `reasoning_effort`，二者组合未测。
5. **图与长上下文的交互**：未测图片 + 大体量工具结果的混合请求。

---

## 5. 复现

```bash
node demo/verify/probe-image-multimodal.mjs      # A/B/C/D 四组形状接受度
node demo/verify/probe-image-multimodal-2.mjs    # tool 图读取 + 尺寸/token 对照
node demo/verify/probe-svg.mjs                   # SVG 是否被上游接受
```

脚本自带 PNG 生成（无第三方依赖），apiKey 从 `~/.ki/config.yaml` 读取。
