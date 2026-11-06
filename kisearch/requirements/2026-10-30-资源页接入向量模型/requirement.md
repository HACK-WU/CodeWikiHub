---
id: REQ-20261030-001
feature: 资源页接入向量模型
status: 实施中
created: 2026-10-30
updated: 2026-10-30
version: 3
tags: [feat, ux]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：资源「接入」新增「向量模型」

- **来源**：用户 2026-10-30 三条连续输入
  1. 原话「资源的接入那里，再增加一个向量模型的接入」（附资源页截图，左栏选中「对话模型」）
  2. 追问「没有配置向量模型时，是怎么展示的」
  3. 追加「页面中加入获取 API 可以的链接。在 README 中应该有」（"可以" = API Key 笔误）
- **分析口径**：product-manager M1（一次成型档 · 判定为**中**复杂度）
- **证据声明**：🟢 最高等级 = 代码/配置直读 + 一次 `/api/health`、`/api/vector/status` 实机响应取证；**未做界面实测**（本机为「已配置且全绿」状态，未配置/降级态由代码路径推得，未实机复现）
- **✅ 用户裁决（2026-10-30）**
  - **Q1 = A 档：纯只读，没有修改操作**。⇒ 不做参数试算（R4 删除）、不写 `config.yaml`（R7 不做）、不提供一键重建入口。
  - **Q2 = 只针对当前 scope**。⇒ 不做全 scope 维度体检（R3 收敛为「当前 scope 一致性」），复用既有 `useVectorDimensionStatus(scope)`，**0 新增请求、0 新增聚合接口**。
  - 未答项按建议取值：Q3 插在「对话模型」之后 · Q4 左栏「向量模型」+ 页内注明「即 embedding / 嵌入模型」· Q5 本页不讲并发 · Q6 恒定显示密钥链接 + 限定语 · Q7 本期只在新页修 D-1/D-2，总览另开需求 · Q8 不做三页 hint 改造。
- **本稿口径**：A 档（只读展示 + 当前 scope 一致性 + 密钥获取入口），复杂度由「中」降为**低**。

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | 需求成立：「接入」组现有 3 项只覆盖 MCP / Skill / 对话模型，**向量模型作为全局唯一必需能力反而没有入口**；对话模型「不配置不影响其它功能」，向量模型不配置则导入/检索/写入全部降级 | 🟢 `resourcesPage.ts:189-201`、`vector-client.ts:580-602`（缺 apiKey 直接抛错） |
| 2 | **不能照抄「对话模型」页**：换维度会让所有已建 collection 直接不可用，只能 `ki restore <scope> --rebuild-vector`；换模型而维度不变则**完全不报错**、检索质量静默劣化 | 🟢 `engine.ts:795-801`、`vector-client.ts:1751-1781`、`vector-dimension-snapshot.ts:16-18` |
| 3 | 数据**已有一半**：`/api/vector/status` 已返回 `model / provider / baseURL / configured`（REQ-20261016-002 交付） | 🟢 `vector-dimension-snapshot.ts:20-22`、`tasksApi.ts:139-141` |
| 4 | 真正缺口：① 无接口返回「apiKey 是否配置 / queryTimeoutMs / scheduler / 配置路径」；② 维度一致性是 **per-scope**，**全产品没有任何地方能回答「改成 N 维后哪些库会失配」**；③ **前端 0 处提供密钥获取入口**（README / CLI / docs 都有，`web/src` 全仓 0 命中） | 🟢 `mcp-http-api.ts:953-956`、`health-check.ts:382-405`、`README.md:142` vs `web/src` grep |
| 5 | **两个既有展示缺陷**（本需求一并修）：① 总览页把「内置默认值」当「已配置」显示；② 维度角标与「能不能真正向量化」是两套不通气的口径 | 🟢 `DashboardPage.tsx:408-420`、`config.ts:661-671`、`vectorDimensionCopy.ts:80-108` |
| 6 | 只做「只读展示 + 配置示例」时增量价值主要是**信息架构完整性**，不是能力新增（模型名总览已有、配置说明 docs 已有）。真价值在 P1：全 scope 维度体检 + 参数试算 + 后果预告 | 🟢 `DashboardPage.tsx:404-421`、`docs/configuration.md:89-141` |

---

## 2. 现状取证（全部 🟢）

### 2.1 页面与导航现状

| # | 事实 | 位置 |
|---|------|------|
| S-1 | 左栏目录 SSOT = `RESOURCE_TOPICS`，`access` 组 3 项：`mcp` / `skill` / `llm` | `web/src/lib/resourcesPage.ts:189-201` |
| S-2 | 新增项只需改 3 处：`ResourceTopicId` 联合类型、`RESOURCE_TOPICS`、`ResourcesPage.tsx` 渲染分派；**`routes.tsx` / `AppShell.tsx` 无需改**（`/resources/:topic` 已通配） | `resourcesPage.ts:139-145`、`ResourcesPage.tsx:823`、`routes.tsx:31-33` |
| S-3 | 「对话模型」= `LlmSection`，**纯只读**：状态条 / 配置位置 / 未配置时给片段 / 已配置时给当前值 / 完整示例 / 文档外链 | `ResourcesPage.tsx:474-585` |
| S-4 | 已生效裁决：**「界面改的值不写 config.yaml」**（LLM 侧 `PUT /api/chat/config` 因此被撤销） | `chat-routes.ts:500-505` |
| S-5 | 外部链接受治理：`resourcesPage.ts` 头注释「页面内**唯一**允许的 GitHub 链接」；范式 = `className="res-link"` + `target="_blank" rel="noopener noreferrer"` + 「↗」 | `resourcesPage.ts:53-69`、`ResourcesPage.tsx:581` |

### 2.2 向量模型（embedding）现状

| # | 事实 | 位置 |
|---|------|------|
| S-6 | 只有**一份全局配置**（`config.yaml` 的 `embedding:` 段），无多模型注册表、无 scope 级覆盖；数据源层完全没有 embedding 字段 | `config.ts:224-235,241`、`datasource-types.ts`（grep 0 命中） |
| S-7 | 缺省时**全字段回落内置默认**：`dashscope` / `https://maas.qianwenaiapi.com/compatible-mode/v1` / `qwen3.7-text-embedding-flash` / `1024` / `3000ms` | `config.ts:265-272,661-671` |
| S-8 | 维度校验共 4 道：配置层 `positiveInt` / provider 构造 / 响应长度 / 集合 schema 比对 | `config-schema.ts:211-235`、`siliconflow.ts:70-75,200-205`、`engine.ts:795-801` |
| S-9 | 向量化唯一 provider 构造点，所有调用都经 `getEmbeddingConfig(config)` | `vector-client.ts:580-602` |
| S-10 | `ki doctor` 有 4 个 embedding 探针项：`apiKey` / `URL 连通性` / `密钥有效性` / `维度匹配`；`/api/health` 用 `embeddingFailure:'warn'` 且关闭批大小与 collection 维度检查 | `health-check.ts:382-405`、`mcp-http-api.ts:846` |
| S-11 | 前端 `VECTOR_HEALTH_CHECK_NAMES` 与上述 **4 个项名硬绑定**，改名会让前端退化成「整体故障」 | `healthSummary.ts:55-60` + `health-check.ts:158-160` 注释 |
| S-12 | 维度一致性快照：`GET /api/vector/status?scope=` 只读快照；`POST …/refresh` 真实探测 zvec；TTL 5 分钟 | `mcp-http-api.ts:953-964`、`vector-dimension-snapshot.ts:42-43,117-157` |

### 2.3 「没有配置」时的实际展示（用户第 2 问的取证）

「没配置」在本项目是**三种状态**，展示不同：

| 状态 | 判定 | 顶栏徽标 | doctor 4 项 |
|---|---|---|---|
| **A 整段 `embedding` 缺失** | 全走 `DEFAULT_EMBEDDING` | 黄点「向量不可用」 | 4 项**全 warn** |
| **B 写了段但无 apiKey** | apiKey = `undefined` | 黄点「向量不可用」（同 A） | 4 项全 warn |
| **C key 在但不可用** | `degradable=false` 保持 fail | 黄点「向量不可用 · URL 连通性」 | 1 pass + 3 fail |

- A/B 与 C 的差别在**是否带项名**：`vectorOnlyFailureLabel` 要求 `level==='fail'`（🟢 `healthSummary.ts:72-77`），缺 key 时 4 项为 warn ⇒ 只出「向量不可用」；C 走 fail 路径才带项名（🟢 `vectorAvailability.ts:146-153`）。
- 检索页降级为全文并改页头（🟢 `SearchPage.tsx:150,447`）；导入/写入页禁用向量选项并提示「向量服务不可用，已自动降级为全文检索：未配置 embedding.apiKey…」（🟢 `vectorAvailability.ts:124-125`）。

**两个真实缺陷**：

| 缺陷 | 表现 | 根因 |
|---|---|---|
| **D-1 默认值被当作已配置显示** | 从没配过 apiKey 的机器，总览「嵌入模型」照常显示 `qwen3.7-text-embedding-flash`、「向量维度」显示 `1024`，与已配置时几乎无差别 | `configuredIdentity()` 活读 `config.embedding.model`（🟢 `vector-dimension-snapshot.ts:32-40`），而 config 缺省即回落默认值（🟢 `config.ts:661-671`）；前端 `model || '—'` 永远走不到 `—` 分支（🟢 `DashboardPage.tsx:408`） |
| **D-2 维度角标与可用性两套口径** | 没配 apiKey 但库里有旧集合 → 角标仍显示绿色「集合一致」，实际一次向量化都跑不了；从没建过索引 → 显示「未确认」，用户永远看不到「你还没建向量索引」 | `dimensionBadge` 只看「配置维 vs 集合维」（🟢 `vectorDimensionCopy.ts:80-108`）；`readVectorDimensionSnapshot` 在 `persisted===undefined` 时直接判 `compatible`（🟢 `vector-dimension-snapshot.ts:140-142`）；`state` 枚举**没有表达「没配 key」的通道** |

> 实测补充：本机 `/api/vector/status?scope=verify-compare2` 返回 `state:"unknown"`、无 `checkedAt`、无 `error`，属**快照缺失**而非配置问题；本机 `/api/health` 11 项全 pass、密钥有效、维度 1024 匹配。

---

## 3. 关联功能与影响面

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需用户拍板 |
|---|---|---|---|---|---|
| 资源页左栏目录 | 展示 | 无感 | `resourcesPage.ts:189-201` | 加 1 项（`group:'access'`） | 否 |
| 现有 kicker `01/02/03` | 展示 | 无感 | 同上 | 新增项编号重排 | **是（Q3）** |
| 总览「嵌入模型 / 向量维度」卡 | 展示 | 降级（信息重复） | `DashboardPage.tsx:404-421` | 本需求**顺带修 D-1**（加「内置默认」角标口径）；不合并页面 | **是（是否本期修 D-1）** |
| 总览「向量维度」角标 | 展示 | 降级 | `vectorDimensionCopy.ts:80-108` | 本页不复用该判据；`dimensionBadge` 是否一并修 D-2 待定 | **是** |
| 「配置 / 并发与资源」页已含 `embedding.scheduler` 片段 | 展示 | 降级（重叠） | `resourcesPage.ts:717-725` | 新页不讲并发，只外链 | **是（Q5）** |
| `ki doctor` / `/api/health` embedding 探针 | 流程 | 无感 | `health-check.ts:147-405` | 「测试连接」复用 `checkEmbedding`，**不新建探针** | 否 |
| 前端 `VECTOR_HEALTH_CHECK_NAMES` | 流程 | **破坏**（若改项名） | `healthSummary.ts:55-60` | 硬约束：4 个项名禁止改 | 否 |
| `/api/vector/status` 现有消费方（AppShell / 总览 / 导入页） | 展示 | 无感 | `hooks.ts:177-187` | 本页如需复用它须按 scope 调；推荐走新聚合接口，不改既有接口 | 否 |
| 全 scope 维度体检 = N 次请求 | 性能 | 降级 | `mcp-http-api.ts:953-956` | 后端聚合一次返回（读快照不 refresh，unknown 只标 unknown） | **是（Q2）** |
| `config.yaml` 写入 | 外部契约 | **破坏**（若做可编辑） | `chat-routes.ts:500-505` 既有裁决 | 本稿不做；R4 只做「试算不落盘」 | **是（Q1）** |
| 已建索引的所有 scope | 数据 | **破坏**（若改维度） | `engine.ts:795-801` | 页面必须前置「改维度 → 全部需重建」预告 | 否 |
| 术语「向量模型 / 嵌入模型 / embedding」 | 展示 | 降级 | 总览卡 label =「嵌入模型」 | 统一口径 | **是（Q4）** |
| 三页降级 hint（导入 / 检索 / 写入） | 展示 | 降级（缺出路） | `vectorAvailability.ts:124-125` | R9-可选：补获取指引 | **是** |

---

## 4. 需求清单

### 4.1 主需求

| ID | 需求 | 优先级 | Kano | 验收标准（可判定） |
|----|------|--------|------|--------------------|
| **R1** | 资源页「接入」组新增「向量模型」项，路由 `/resources/embedding` | P0 | 必备 | ① 左栏出现该项且 `aria-current="page"` 生效；② 点击后 URL 变为 `/resources/embedding`；③ 直接刷新该 URL 可复原；④ 未知 topic 仍回退 `mcp`（不回归） |
| **R2** | 当前生效配置只读展示：provider / baseURL / model / dimension / queryTimeoutMs / apiKey 状态 / 配置文件路径 | P0 | 必备 | ① 七项均有值或 `—`，不渲染 `undefined`；② 页面 DOM 与 network 响应中**均不含密钥明文**；③ 旧 daemon 缺字段时降级为 `—` 不报错 |
| **R2a** | 后端聚合接口显式返回 `apiKeyConfigured: boolean` | P0 | 必备 | ① 未配 key → `false`，配了 → `true`；② **只出布尔**，不含值/长度/前缀/尾部字符（防侧信道） |
| **R2b** | 各字段带来源标记 `configured` / `builtin-default` | P0 | 必备 | 从未配置过的字段在页面渲染「内置默认」角标；写入过配置的字段不渲染该角标（修 D-1） |
| **R2c** | 未配置态（`apiKeyConfigured=false`）下「维度一致性」区块**不显示绿色「一致」** | P0 | 必备 | 未配 key 时该区块只显示「未配置，暂不校验」，DOM 中不出现 `集合一致` 文案 |
| **R3** | **当前 scope** 维度一致性：配置维 / 已建维 / 状态；失配时给 `ki restore <scope> --rebuild-vector --yes` | P1 | 期望 | ① 复用 `useVectorDimensionStatus(currentScope)`，**不新增请求**（AppShell 同 key 常驻缓存）；② 失配时重建命令可复制；③ 未知态不冒充「一致」；④ 未配置时不判 |
| ~~R4~~ | ~~候选参数试算~~ | — | — | **已删除**：Q1 = 纯只读，无修改 / 试算操作 |
| **R5** | 完整 `embedding` 配置示例 + 一键复制 | P0 | 必备 | ① 片段含 6 个字段；② 复制成功反馈可见；③ 纯函数可单测（断言内容逐行匹配） |
| **R6** | 「改模型 / 维度的后果」预告区 | P0 | 必备 | ① 含「维度变 → 全部已建库失配需重建」；② 含「换模型但维度不变 → 不报错但检索质量劣化，同样必须重建」（现状产品完全没讲第 2 条） |
| **R9** | Embedding 密钥获取外链，地址取自 `README.md:142` | P0（与 R2/R5 同批） | 必备 | ① `href === 'https://platform.qianwenai.com/home/api-keys'`；② 落点仅 2 处（apiKey 行 + 示例注释），不重复；③ 文案含「默认 DashScope 兼容端点」限定语；④ `target="_blank" rel="noopener noreferrer"` |
| ~~R7 / R8 / R9-可选~~ | ~~可编辑 / 多模型 / 三页 hint 改造~~ | — | — | **本期不做**（Q1=A、Q7、Q8） |

### 4.2 接口草案（仅 R2a / R2b 需要，只读、不发网络请求）

```http
GET /api/embedding/summary
```
```json
{
  "ok": true,
  "configPath": "/root/.ki/config.yaml",
  "provider":       { "value": "dashscope", "source": "builtin-default" },
  "baseURL":        { "value": "https://maas.qianwenaiapi.com/compatible-mode/v1", "source": "builtin-default" },
  "model":          { "value": "qwen3.7-text-embedding-flash", "source": "builtin-default" },
  "dimension":      { "value": 1024, "source": "builtin-default" },
  "queryTimeoutMs": { "value": 3000, "source": "builtin-default" },
  "apiKeyConfigured": false
}
```

口径约束：

- **无 `scopes[]`**：Q2 = 当前 scope，一致性由前端复用 `useVectorDimensionStatus(scope)`，接口不碰 zvec。
- `source` 判定依据「**原始配置文件里该字段是否存在**」，**不是**「值是否等于默认值」（用户显式写 `1024` 应为 `configured`）。
- 不发任何 embedding / zvec 请求，纯读文件，可被高频调用。
- **不返回** `apiKey` 值、长度、前缀、尾部字符（只出布尔）。

### 4.3 技术落点

| 层 | 文件 | 改动 |
|---|---|---|
| 前端常量/文案 | `web/src/lib/resourcesPage.ts` | `ResourceTopicId` 加 `'embedding'`；`RESOURCE_TOPICS` 加项；新增 `EMBEDDING_API_KEY_URL`（注释标权威源 `README.md:142`）、`buildEmbeddingConfigSnippet()`、`describeEmbeddingStatus()`、`EMBEDDING_FIELD_NOTES`、`EMBEDDING_CONSEQUENCE_NOTES` |
| 前端页面 | `web/src/pages/ResourcesPage.tsx` | 新增 `EmbeddingSection()` + 渲染分派加一行 |
| 前端 API | `web/src/api/`（新文件或并入 `tasksApi.ts`） | `getEmbeddingSummary()` |
| 后端路由 | `src/lib/mcp-http-api.ts` | `GET /api/embedding/summary` 分支 |
| 后端 handler | `src/lib/embedding-summary.ts`（新建） | 读 config + 读原始 YAML 判 `source`（**不碰 zvec、不发网络请求**） |
| 样式 | `web/src/styles/ki.css` | 仅在需要「内置默认」角标 / 一致性行时新增，复用 `--ki-*` 令牌 |
| 测试 | `test/embedding-summary.test.ts`（新）、`web/test/resource-embedding.test.mjs`（新） | 覆盖 source 判定（含「显式写默认值仍算 configured」）、apiKey 布尔、片段内容、URL 常量、未配置态文案 |

---

## 5. 负向需求

1. **维度改错**（声明 1024、上游实际 4096）：保存后不立即报错，等首次向量化才炸 → 本页不提供试算，因此必须在示例区显式写「**改前先跑 `ki doctor` 确认上游实际维度**」。
2. **换模型但维度不变**：系统完全不报错（集合不持久化模型名，🟢 `vector-dimension-snapshot.ts:16-18`），检索质量静默劣化 → R6 必须显式告知「同样必须重建」。
3. **状态条误报绿**：不能只看「字段有值」就报绿（值可能来自内置默认）→ 三态由 `apiKeyConfigured` + `builtin-default` 角标共同决定（R2a/R2b）。
4. **旧 daemon 缺字段**：`model/provider/baseURL` 在 `VectorDimensionStatus` 中是可选（🟢 `tasksApi.ts:136-141`）→ 必须显示 `—`，不渲染 `undefined`。
5. **快照过期**（TTL 5 分钟）：可能展示陈旧失配 → 需「重新检查」按钮（`POST /api/vector/status/refresh`）。
6. **当前 scope 尚未建向量索引**：`persisted === undefined` 时后端仍返回 `state:"compatible"`（🟢 `vector-dimension-snapshot.ts:140-142`）⇒ **不得显示「一致」**，必须显示「该 scope 尚未建向量索引」。
7. **当前 scope 不存在 / 不可读**：显示「无法确认」，不整页报错。
8. **误触重建**：本页**只读**，不提供一键重建入口（重建走 CLI 或恢复页，避免误操作炸全库）。
9. **密钥侧信道**：apiKey 状态只允许布尔，禁止返回长度/前缀/尾部字符（R2a）。
10. **「内置默认」被当真**：用户以为默认值就是自己的配置 → R2b 角标必须显式，且未配置态状态条要写「当前显示的是内置默认值，不是你的配置」。

---

## 6. 需求缺口回扫（六维）

| 维度 | 结论 |
|---|---|
| 场景完整性 | ⚠️ 原始诉求只到「加一个入口」；**未配置态**由 R2c 补；**配置前试算**经 Q1 明确**不做**（改由示例区提示 `ki doctor` 先验维度） |
| 验收标准可达性 | ✅ 每条均给了可断言项（DOM / 响应体 / 常量等值） |
| 需求一致性 | ✅ Q5 已定：本页不讲并发，`embedding.scheduler` 归「配置 / 并发与资源」页 |
| 角色-需求对齐 | ✅ 单一角色（本机用户） |
| 边界 / 异常覆盖 | ✅ 见 §5 共 10 条 |
| 术语一致性 | ⚠️ Q4 已定（左栏「向量模型」+ 页内注明「即 embedding / 嵌入模型」，本期不改总览卡），但「密钥 / API Key / apiKey」三种写法仍需在文案里统一为「API Key（`apiKey`）」 |

**已收敛达标**（术语一项按 Q4 裁决 + 文案统一执行）。

---

## 7. 直观视图（结构图，非视觉定稿）

```
┌──────────────────┬───────────────────────────────────────────────────────┐
│ 资源             │  配置向量模型                         [ 04 · EMBED ]  │
│ ──────           │  ───────────────────────────────────────────────────  │
│ 接入             │  ● 已配置 · qwen…-embedding-flash · 1024 维           │
│  MCP 接入        │                                                       │
│  Agent Skill     │  配置位置  /root/.ki/config.yaml          [复制]      │
│  对话模型        │                                                       │
│ ▸向量模型   ←新  │  ── 当前生效配置（只读） ───────────────────────────    │
│                  │   provider   dashscope（仅显示名）                    │
│ 功能             │   上游       https://maas…/compatible-mode/v1         │
│  检索 / 导入 …   │   模型       qwen3.7-text-embedding-flash [内置默认]  │
│                  │   维度       1024                        [内置默认]    │
│ 配置             │   查询超时   3000ms                                   │
│  scope / token   │   API Key    已设置（不展示明文）                     │
│  doctor / 并发   │              ↳ 获取 DashScope 密钥 ↗                 │
│                  │                                                       │
│                  │  ── 当前知识库的向量一致性 ─────────────  [重新检查] ─   │
│                  │   verify-compare2 · 配置 1024 维 · 集合 1024 维 ✓     │
│                  │   （失配时）集合 768 维 ✗ 语义检索不可用               │
│                  │             ki restore verify-compare2 --rebuild-vector│
│                  │                                                       │
│                  │  ── 完整配置示例 ────────────────────────────────      │
│                  │   embedding:  provider/baseURL/model/dimension …      │
│                  │   apiKey: ${DASHSCOPE_API_KEY}  # ↳ 获取地址 ↗        │
│                  │                                                       │
│                  │  ⚠ 换维度 → 所有已建库检索不可用，需 ki restore        │
│                  │     --rebuild-vector；换模型但维度不变 → 不报错但      │
│                  │     检索质量劣化，同样必须重建                        │
└──────────────────┴───────────────────────────────────────────────────────┘
```

> 「向量一致性」只针对**当前 scope**（Q2 裁决），复用顶栏/总览同一份 `useVectorDimensionStatus` 缓存，不产生新请求。

未配置态（`apiKeyConfigured=false`）差异：

```
│ ⚠ 尚未配置（导入/检索/写入会降级为纯全文）              │
│   当前显示的是内置默认值，不是你的配置                  │
│ ...                                                    │
│   API Key   未配置  ↳ 获取 DashScope 密钥 ↗            │
│ ── 当前知识库的向量一致性 ──                           │
│   （未配置 API Key，暂不校验 —— 填入后再看）           │
```

---

## 8. 待确认清单（已全部闭环）

| # | 事项 | 结论 | 决策人 |
|---|---|---|---|
| **Q1** | 页面深度 | **A：纯只读，没有修改操作**（不做试算、不写 config.yaml） | 用户 2026-10-30 |
| **Q2** | 维度体检口径 | **只针对当前 scope**（复用既有 hook，0 新增请求） | 用户 2026-10-30 |
| Q3 | 左栏顺序与编号 | 插在「对话模型」之后，`04 · EMBED`，不动已有 03 | AI 按建议取 |
| Q4 | 术语 | 左栏「向量模型」+ 页内首句注明「即 embedding / 嵌入模型」；本期不改总览卡 | AI 按建议取 |
| Q5 | 与「并发与资源」页边界 | 本页不讲 scheduler，一句话外链 | AI 按建议取 |
| Q6 | 自定义 `baseURL` 时密钥链接 | 恒定显示 + 限定语「默认 DashScope 兼容端点；已换其它厂商请向该厂商索取」 | AI 按建议取 |
| Q7 | 是否顺带修 D-1 / D-2 | 本期只在新页修（`source` 标记 + 一致性判据）；总览另开需求 | AI 按建议取 |
| Q8 | 三页降级 hint 补指引 | 本期不做 | AI 按建议取 |

---

## 9. 关键假设

| ID | 假设 | 状态 | 错了会怎样 |
|---|---|---|---|
| A1 | 「向量模型」= embedding（文本向量化），**不是** zvec 这类向量库引擎 | 用户 Q1 选 A 后默认成立 | 若指 zvec 引擎配置，页面内容整体换（变成 `vector.maxOpenCollections` / `optimize`） |
| A2 | 要的是「模型接入（接哪家、什么维度）」，不是「多模型并存切换」 | 同上 | 多模型需新增数据模型，工作量完全不同 |
| A3 | 页面只读，不写 `config.yaml` | ✅ 用户明确「没有修改操作」 | 若必须可编辑，需推翻既有裁决 + 加写盘保护 |
| A4 | 「接入」分组本身是全局视角（不跟 scope 跳转），但页内「向量一致性」区块看**当前 scope** | ✅ 用户 Q2 裁决 | 若整页跟 scope 走，左栏项需变成 scope 相关入口，信息架构要重做 |

---

## 10. 结论与下一步

**形态已定为 A 档 + 当前 scope**，复杂度低（新增 1 个只读接口 + 1 个只读页面 section，零既有行为变更），按 M1 出口走「低复杂度 → 直接实施」：

| 步骤 | 内容 |
|---|---|
| 1 | 后端 `src/lib/embedding-summary.ts` + `GET /api/embedding/summary` 路由 + 单测 |
| 2 | 前端 `resourcesPage.ts` 常量/文案 + `ResourcesPage.tsx` 的 `EmbeddingSection` + API 封装 |
| 3 | 校验：后端 `npm run build` / 相关 `test/*.ts` · web `tsc` / `npm test` / `npm run build` |
| 4 | 真机走查：已配置态 / 未配置态 / 失配态 / 窄屏 + 链接可点 |

**不启动** `ui-designer`（完全对齐既有 `LlmSection` 范式，无新视觉方案）、**不启动** `design-craft`（接口为纯读、无契约歧义）。

---

## 11. 实施记录（2026-10-30）

### 11.1 落点

| 层 | 文件 | 改动 |
|---|---|---|
| 后端 | `src/lib/embedding-summary.ts`（**新增**） | `buildEmbeddingSummary()`：读原始 YAML 判 `source`，只出 `apiKeyConfigured` 布尔，读失败降级 + `warning` |
| 后端 | `src/lib/mcp-http-api.ts` | 新增 `GET /api/embedding/summary` 分支（`/vector/status` 之后；不带 scope ⇒ 不进越权白名单） |
| 前端 | `web/src/api/embeddingApi.ts`（**新增**） | `getEmbeddingSummary()`；404 显式归类为「旧 daemon」 |
| 前端 | `web/src/lib/resourcesPage.ts` | `ResourceTopicId` + `'embedding'`；`RESOURCE_TOPICS` 加项（`04 · EMBED`）；`EMBEDDING_API_KEY_URL` 等 12 个常量/纯函数 |
| 前端 | `web/src/pages/ResourcesPage.tsx` | `EmbeddingSection()` + `SourceTag()` + 渲染分派一行 |
| 文档 | `README.md` | 页面能力行补「向量模型」 |
| 测试 | `test/embedding-summary.test.ts`（新增 8 项）、`web/test/resource-embedding.test.mjs`（新增 14 项）、`web/test/resources-page.test.mjs`（接入 3→4 / 总数 16→17） | — |

### 11.2 验证

| 项 | 结果 |
|---|---|
| 后端 `npm run build` | exit 0 |
| `test/embedding-summary.test.ts` | **8/8** |
| `test/mcp-http-api.test.ts`（受影响模块回归） | **65/65** |
| `test/config-doctor.test.ts` | **59/59** |
| web `tsc --noEmit` | 0 错误 |
| web `npm test` | **720/720**（基线 694 + 本需求 26） |
| web `npm run build` | ✓ |
| 真机走查 `temp/verify-embedding-page.cjs` | **32/32**（隔离 daemon 7499 已配置态 + 7498 未配置态 + 375 视口无溢出 + 无 JS 错误） |

### 11.3 实施中修正的 3 个自查缺陷

1. **`embeddingConsistencyView` 判定顺序错**：原本先判 `persisted === undefined`，导致「探测失败」被说成「尚未建向量索引」—— 把故障伪装成正常。已把 `hasError / statusError` 提到该分支之前。
2. **provider 行漏了来源角标**：真机走查发现未配置态只出 3 个「内置默认」而非 4 个（`provider` 漏渲染），已补。
3. **`state:'compatible'` + 无 `persisted` 的语义**：后端在「无集合」分支确实返回 compatible，前端必须按「尚未建向量索引」而不是「一致」呈现（缺陷 D-2 的直接修法），已用测试锁住。

### 11.4 遗留

- **7423 主服务仍是旧后端**：`/api/embedding/summary` 需重启 daemon 才生效（重启前页面会显示「daemon 版本较旧」的提示，不白屏）。
- 总览页 D-1 / D-2（`DashboardPage` / `vectorDimensionCopy`）按 Q7 **未动**，另开需求。
- 三页降级 hint 补获取指引按 Q8 **未做**。

### 11.5 auto-review + code-review + challenger 复审修正（2026-10-30 第二轮）

| # | 缺陷 | 性质 | 修法 |
|---|------|------|------|
| C1 | `buildEmbeddingConfigSnippet()` **硬编码 `dimension: 1024`** | 🟥 本次引入 · 🔴 | 改为接受当前生效值（页面传 `summary` 各字段），**复制片段即现状**。原本用户 768 维的库照抄示例会写成 1024 ⇒ 所有已建库检索立即失效 |
| C2 | `source` 判定用「字段是否存在」，与 `config.ts` 的**真值（truthy）合并**不同口径 | 🟥 本次引入 · 🟡 | 新增 `isConfiguredField()`：字符串字段（provider/baseURL/model）按 truthy、数字字段按存在 —— 与 `config.ts:661-671` 逐字段对齐。否则 `provider: ''`（schema 允许）会「值来自内置默认却标成你的配置」，正是 D-1 的反向 |
| C3 | 状态条在 `apiKeyConfigured` 为真时宣称「向量化可用」 | 🟥 本次引入 · 🟡 | 本页**不发任何 embedding 请求**，断言「可用」越界。改为「已配置」+ 指路 `ki doctor` / 顶栏 |
| C4 | **同屏矛盾**：页面绿「已配置」，顶栏黄「向量不可用」（key 无效 / 上游挂） | 🟥 本次引入 · 🔴（challenger 质疑 #1） | 接入既有 `useVectorAvailability()`（与顶栏同源、0 新增请求），`describeEmbeddingStatus` 增 `availability` 入参：`unavailable` → warn + 透出原因，`unknown` → warn「无法确认」 |
| C5 | 「查询超时」写成配置值，未说明可被请求级 `timeout` 覆盖；超长 baseURL 无断行 | 🟥 本次引入 · 🟢 | 文案改「查询超时（默认）」+ 补「检索页可按请求单独指定」；`<code>` 补 `overflowWrap: anywhere` |

修正后验证：后端 `npm run build` exit 0 · `test/embedding-summary` **9/9**（+1 空串用例）· web `npm test` **723/723**（+3）· `npx vite build` ✓ · 真机 **34/34**（+2 片段跟随当前值）· **降级专项**：用 `page.route` 伪造 `/api/health` 的 `密钥有效性: fail`，确认状态条转 warn、透出「401 Unauthorized…」且顶栏为「向量不可用 · 密钥有效性」（两处一致）。

### 11.6 已知未覆盖

- `web/src/api/embeddingApi.ts` 的 404 分支（旧 daemon）无单测：需 mock `fetch`，当前仅靠代码审读 + 页面文案兜底。
- `readRawEmbedding` 与 `loadConfig()` 是两次独立读文件，理论上存在「值来自旧配置、source 来自新配置」的一帧不一致（概率极低、后果仅一帧展示错），已知不修。
