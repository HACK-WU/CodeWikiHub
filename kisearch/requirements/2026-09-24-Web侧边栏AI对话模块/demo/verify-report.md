---
id: REQ-20260924-001
feature: Web侧边栏AI对话模块
status: 已确认
created: 2026-09-24
updated: 2026-09-24
version: 2
tags: [feat, ux, integration]
depends_on: []
author: AI
document_type: demo
---

# 验证报告：Web 侧边栏 AI 对话模块（最小原型 / demo-verify）

> 分支：`feat/sidebar-ai-chat` ｜ 日期：2026-09-24 ｜ 关联需求：REQ-20260924-001
> 验证方式：真实调用第三方模型服务 + Chromium 实测截图（**🟢 实证**），非静态推演。
> **v2 修订**：经 `review/challenge-report.md` 二次质疑后修正定量表述（单次采样标注、token 量口径、抽测范围、等价性表述），并补入 3 次采样分布与挑战者补测数据。

## 1. 结论摘要

| 编号 | 风险点 | 结论 | 一句话依据 |
|:---:|---|:---:|---|
| R-01 | chat/completions 第三方集成 | ✅ 通过 | `/models` 200（0.36s，15 个模型）；`/chat/completions` 200（1.92s），system prompt 生效 |
| R-02 | SSE 流式链路（daemon → 浏览器） | ✅ 通过（原型层） | 上游 chunk 解析 → 自定义事件转发 → 前端 `fetch + ReadableStream` 逐块消费，全链路跑通；**框架层未覆盖，见 §5** |
| R-03 | reasoning 模型输出形态 | ⚠️ **有条件通过** | 首答 0.5s~12s（**单次采样**）；思考 token 占 completion 的 24%~99%；模型间 completion token 量差约 20 倍 |
| R-04 | 右侧面板与既有布局共存 | ⚠️ **有条件通过** | 构造三栏布局下 1280px 时主内容区仅 **342px**；**真实页面基线未测** |
| R-05 | 会话 JSON 落盘 + 读取 | ✅ 通过 | 每会话独立 JSON；另一进程可直接读盘取回全部会话与消息（**daemon 重启流程未验证**） |

**整体决策**：✅ 方向可行，**带 4 项强制调整**（见 §4）与 3 项遗留验证（见 §5）后可进入设计与开发。方案无需回退。

## 2. 验证坐标

| 项 | 值 |
|---|---|
| 端点 | `https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1`（OpenAI 兼容） |
| 模型 | 主验证 `qwen3.8-flash`；对比 `qwen3.6-flash` / `glm-5.3` / `deepseek-v4.1-flash`；质疑补测 `qwen3.7-max` / `auto` / `deepseek-v4-pro` |
| 可用模型（15） | qwen3.7-max、qwen3.7-plus、qwen3.6-flash、qwen3.8-max、qwen3.8-flash、glm-5.2、glm-5.3、deepseek-v4-pro、deepseek-v4-flash-0731、deepseek-v4.1-flash、qwen-audio-3.0-*、wan2.7-image*、auto |
| 原型 | `demo/server.mjs`（原生 http，无依赖）+ `demo/panel.html`（三栏布局 + 对话面板） |
| 数据目录 | `/tmp/ki-chat-demo/conversations/`（密钥仅经环境变量注入，未落盘、未入库） |
| 样本规模 | 每模型每题 **单次采样**（n=1）；`qwen3.8-flash` 另做 **n=3** 方差采样（见 R-03） |

## 3. 逐项证据

### R-01 ✅ chat 集成

```text
GET  /models           → 200  0.36s
POST /chat/completions → 200  1.92s  {"model":"qwen3.8-flash","choices":[{"message":{"content":"好"}}],"usage":{"prompt_tokens":59,"completion_tokens":47,"completion_tokens_details":{"reasoning_tokens":44}}}
```

system prompt「只回答一个字」被正确遵守（返回单字「好」），说明 system 角色可用。

### R-02 ✅ SSE 流式链路（原型层）

上游为标准 OpenAI SSE（`chat.completion.chunk`，支持 `stream_options.include_usage`）；后端逐块解析后以自定义事件转发：

```text
data: {"type":"meta","model":"qwen3.8-flash","ttfbMs":659}
data: {"type":"delta","channel":"reasoning","text":"用户"}
data: {"type":"meta","firstContentMs":1630}
data: {"type":"delta","channel":"content","text":"小明，"}
data: {"type":"done","timing":{...},"usage":{...},"finish":"stop"}
```

前端 `fetch` + `body.getReader()` 消费成功并实时渲染（见 R-04 截图）。项目此前 **0 处** SSE 实现，本原型证明该链路在本技术栈可行、无需引入依赖。
**边界**：原型是独立进程，未经过 daemon 框架层（鉴权 / 配置快照 / 越权白名单 / 协调器），见 §5-①。

### R-03 ⚠️ reasoning 模型行为（本次最重要的发现）

同一问题「用一句话解释什么是向量检索」的横向对比（**每模型单次采样 n=1**）：

| 模型 | 首字 | **首答** | 总耗时 | 思考字数 | 答案字数 | token（prompt+completion，括号为思考） |
|---|---:|---:|---:|---:|---:|---|
| `qwen3.8-flash` | 783ms | **1209ms** | 1678ms | 49 | 42 | 67+48（24） |
| `deepseek-v4.1-flash` | 814ms | 1739ms | 2014ms | 124 | 49 | 36+95（66） |
| `qwen3.6-flash` | 336ms | **4729ms** | 4983ms | 2984 | 64 | 16+944（**902**） |
| `glm-5.3` | 781ms | **5308ms** | 6018ms | 1203 | 65 | 18+325（284） |
| `qwen3.7-max`（补测） | 1026ms | 7302ms | 7634ms | 796 | 65 | 16+482（442） |
| `auto`（补测） | 728ms | 1525ms | 1975ms | 73 | 46 | 67+69（41） |
| `deepseek-v4-pro`（补测） | 738ms | 5810ms | 6465ms | 392 | 55 | 10+241（208） |

**方差采样（`qwen3.8-flash` 同题 n=3，质疑后补测）**：

| 采样 | 首字 | 首答 | 思考 token | completion token |
|---|---:|---:|---:|---:|
| 1 | 871ms | 2187ms | 61 | 92 |
| 2 | 894ms | 2004ms | 46 | 72 |
| 3 | 647ms | 1139ms | 25 | 53 |

→ 首答波动近 2 倍、思考 token 波动 2.4 倍：**上表所有数字均为单次采样，不可作为承诺指标**，只可用于判断量级与方向。

多轮场景实测最坏值（第 2 轮「刚才你回答了什么？」，`qwen3.8-flash`，单次）：

```text
首字 469ms · 首答 11991ms · 总 12084ms
思考 2635 字 · 答案 12 字
token 88+1080，其中 reasoning_tokens 1070（占 completion 的 99%）
```

**三条硬结论**：

1. **抽测的 7 个模型全部表现出 reasoning 行为**（思考 token 占比 24%~99%）；15 个可用模型中其余 8 个未测（含多模态，不适用于本场景）——表述限定为"抽测 7/7"，不外推为"全部"。
2. **流式不是体验优化，而是可用性前提**：不做流式，用户将面对 1.2~12s 的完全空白。
3. **模型间 completion token 量差约 20 倍**（同题 `qwen3.8-flash` 48 vs `qwen3.6-flash` 944）；**未计入各模型单价差异，成本差需按价目表另算**。默认模型选择错误会直接放大等待与消耗。

### R-04 ⚠️ 布局共存（构造场景实测）

Chromium 实测（视口 1280px），构造三栏布局（`232 左导航 + 300 Browse 文档栏 + 360 对话面板`，数值为对真实布局的近似）：

```text
主内容区宽度：342px（窗口 1280px）
```

证据截图：`demo/layout-1280px.png`（可见面板、思考折叠区、逐轮计时与 token 显示）。
按同一占位推算：`1440px → 约 502px`、`1600px → 约 662px`。
**边界**：342px 是**构造布局**下的测量值，**真实 `/browse` 页在 1280px 下的基线未测**（当时 daemon 未运行），因此该数据用于说明"挤压趋势显著"，不用于确定降级阈值——阈值须在真实页面补测后确定（见 §5-②）。

### R-05 ✅ 会话落盘

```text
cmuf9ima0.json | 落盘验证 | prompt: 回答不超过 15 字 | msgs: 4 [user,assistant,user,assistant] | archived: false
```

每条 assistant 消息同时落盘 `content`、`reasoning`、`timing`（首字/首答/总耗时）、`usage`。**另一个新进程**直接读盘取回全部会话。
**边界**：只证明"文件无内存态依赖、可被其他进程读取"；daemon 的 RPC/配置重载/启动自检流程未验证（见 §5-③）。

**顺带验证的负向场景**：

- **N6 中途放弃** ✅：客户端中断（读端提前关闭）时，用户消息已落盘、助手半截回答**不落盘**，前端追加「[已中止]」标记 —— 行为符合预期
- **N5 上下文超窗**：未验证（未构造超长会话），留待实现期
- **N8 隐私**：密钥仅经环境变量注入，未写入任何文件；会话内容为本地明文 JSON

## 4. 对需求的强制调整项

| # | 调整 | 依据 | 影响的需求条目 |
|:---:|---|---|---|
| A1 | **流式输出由 P1 升为 P0** | R-03：首答延迟最高 12s | R8 |
| A2 | **必须有"生成中状态"**（拆分后为 R11a） | R-03：无状态 = 12s 空窗，用户误判卡死 | R11a |
| A3 | **需要模型选择能力**（下拉 + 默认 `qwen3.8-flash`） | R-03：completion token 量差约 20 倍 | R12 |
| A4 | **窄屏降级为硬性验收标准** | R-04：构造布局下 1280px 主内容区 342px | R3 |
| A5 | reasoning 内容是否展示/落盘需拍板（R11b、T5） | 质疑意见 3：属范围扩张，须用户拍板 | R11b / T5 |

## 5. 遗留验证项（未覆盖，不得视为已验证）

| # | 遗留项 | 风险 | 建议时机 |
|:---:|---|---|---|
| ① | **daemon 框架层 SSE 可用性**（鉴权 / 配置快照 / 越权白名单 / 长连接下的关闭语义） | 实现期返工 | 设计阶段前置门：真实 daemon 上加最小流式端点，一次 `curl -N` 即验 |
| ② | **真实页面布局基线**（`/browse` 在 1280/1440/1600 下的主内容区宽度） | 降级阈值偏早/偏晚 | daemon 启动后补测，写入设计文档 |
| ③ | **daemon 重启后会话可见性**（读盘路径已证等价，重启流程未验） | 验收标准未闭环 | 实现后随 R5 验收 |
| ④ | **并发写入一致性**：`src/lib/wal.ts` 已提供跨进程写锁，但「读-改-写」序列未受保护，并发发消息可能 Last-Write-Wins | 消息静默丢失 | 设计阶段补会话级串行化/乐观锁（见 `review/challenge-report.md` 意见 2） |
| ⑤ | **模型不可用/限流（429/5xx）时的会话与 UI 表现** | 负向 N4 仅列条目 | 实现期 |

## 6. 原型说明与清理

- 原型代码：`demo/server.mjs`（原生 http + 无第三方依赖）、`demo/panel.html`（三栏布局 + 对话面板）
- 运行方式（密钥经环境变量，勿写文件）：
  ```bash
  KI_CHAT_BASE_URL=<base> KI_CHAT_API_KEY=<key> KI_CHAT_MODEL=qwen3.8-flash PORT=7799 node demo/server.mjs
  ```
- 原型用途：**验证风险点，非生产代码**（无鉴权、无 WAL、无错误重试、无 scope 隔离、无 RMW 保护），开发期作为参考，完成后删除
- 临时目录 `.demo-verify/R-03_sidebar-ai-chat/` 已清理；验证用临时文件在 `/tmp` 下，不在仓库内

## 7. 下一步

1. 按 §4 A1~A5 落实调整项（已回写 `requirement.md` v3）
2. 拍板 T5（reasoning 是否展示/落盘）、T6（默认模型）
3. 清掉 §5 的 ①②④ 三项遗留（设计阶段门）
4. 进入 `design-craft`：会话数据模型 + API 契约（含 SSE 事件协议）+ 写入一致性方案 + 布局降级规则 + 思考展示交互

> 二次质疑结论见 `review/challenge-report.md`（裁决：⚠️ 修改 🟡 意见后进入开发；无 🔴 高风险项）。

## 8. 补充验证：视觉（图片）输入能力（2026-09-24，需求追加时）

**结论：✅ 端点与 `qwen3.8-flash` 支持图片输入**，OpenAI 多模态格式（`content` 数组 + `type:"image_url"` + data URI base64）可直接使用。

| 用例 | 原图 | base64 请求体 | prompt_tokens（图像/文本） | completion | 延迟 | 结果 |
|---|---|---|---|---|---|---|
| 小图 11KB PNG | 11KB | 14.7KB | 147（**86** / 61） | 101（思考 88） | 2.33s | ✅ 准确识别内容 |
| 大图 93KB PNG | 93KB | 124KB | 1625（**1570** / 55） | 263（思考 205） | 4.39s | ✅ 准确描述内容 |

**关键数据与影响**：

1. 上游返回 `usage.prompt_tokens_details.image_tokens`，可用于前端展示图片消耗
2. **image_tokens 远超文本**：1570 vs 55（约 28 倍）；小图 86 image tokens
3. **成本随轮次重复**：L1 为全量历史回传，历史图片每轮重发 → 一张 1570 token 的图聊 10 轮约 15700 input token。**这是"长会话成本失控"在图片场景下的放大版**（参见 `场景解法库/场景-01-长会话成本失控.md`）
4. 延迟增加：纯文本首答约 1.2~2s，含图后 2.3~4.4s（另有 reasoning token 波动）
5. 请求体按 base64 膨胀约 1.33 倍（93KB → 124KB；受既有 `MAX_BODY` 16MB 约束，单图上限需另行设定）
6. 图片**必须内联为 data URI**（上游无法访问本机文件；公网 URL 仅适用于已发布资源）

**尚未验证**：图片格式白名单（png/jpeg/webp/gif）、单图上限、多图同消息、非视觉模型的行为（如误发图片给不支持视觉的模型时的报错形态）。
