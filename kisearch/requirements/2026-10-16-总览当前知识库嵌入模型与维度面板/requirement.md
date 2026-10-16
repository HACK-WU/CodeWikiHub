---
id: REQ-20261016-002
feature: 总览当前知识库嵌入模型与维度面板
status: 已确认
created: 2026-10-16
updated: 2026-10-16
version: 2
tags: [feat, ux]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：总览「当前知识库」增补嵌入模型与向量维度面板

- **来源**：用户 2026-10-16 原话「总览的当前知识库那里，增加两个小面板。一个是配置的嵌入的向量模型名称，另一个向量模型的维度值。」（附总览页截图）
- **分析口径**：product-manager M1（一次成型档 · 单点功能）
- **证据声明**：🟢 最高等级 = 代码/配置直读；**未运行界面实测**（本报告不涉及体验/视觉结论，视觉呈现项标注了需实测的边界）

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | **维度值已有一手数据源**：`GET /api/vector/status` 返回 `configured` 字段（活读 `config.embedding.dimension`），前端 AppShell 全站已在拉取并缓存 | 🟢 `src/lib/vector-dimension-snapshot.ts:94-132`、`AppShell.tsx:226-241` |
| 2 | **模型名前端完全拿不到**：`web/src/**` 中 `embedding` / `model` 关键词 0 命中；后端亦无任何接口返回 `config.embedding.model`（`ki_scope_list` / `/api/health` / `/api/import/config` 均无） | 🟢 全量 grep + `src/scope.ts:63-74`、`src/lib/health-check.ts:151-214` |
| 3 | 因此本需求**必须动一次后端**（新增 1 个响应字段），但**不需要新增接口、不需要新增前端请求**（复用 AppShell 同 key 缓存） | 🟢 `mcp-http-api.ts:490-494` + react-query 同 key |
| 4 | 用户实际配置与内置默认**不同**（模型 `qwen3.7-text-embedding-flash`、维度 **1024**，内置默认是 `Qwen/Qwen3-Embedding-8B` / 4096）⇒ 面板正是"配置不可见"这一缺口的直接补位，价值成立 | 🟢 `~/.ki/config.yaml:4-8` vs `src/lib/config.ts:240-247` |
| 5 | 有 1 个**语义陷阱必须先定**：这两个值都是**全局配置**（`config.yaml` 单一 `embedding` 段），**不随 scope 变化**；且系统**不持久化"索引时实际使用的模型"**（集合只存维度），所以面板只能表达"配置"，不能表达"索引实际所用" | 🟢 `src/lib/vector-client.ts:599-623`（create config 无 model 字段） |

**复杂度判定：低**（单点改动 + 无外部依赖 + 无状态机变更）→ 建议 `plan-track` 建档直接实施，无需 `design-craft`。

---

## 2. 现状取证（全部 🟢 代码/配置直读）

| # | 事实 | 位置 |
|---|------|------|
| S-1 | 「当前知识库」卡片内 4 个小面板为**手写 4 个 div**（非循环），容器 `.ki-stats.ki-stats--pair`（2 列） | `web/src/pages/DashboardPage.tsx:274-295` |
| S-2 | 小面板样式：`.ki-stat-card--soft`（标签 14px/600）+ `.ki-stat-value`（**22px**/650，`font-variant-numeric: tabular-nums`） | `web/src/styles/ki.css:467-493` |
| S-3 | 4 个面板的数据来源：文档数 = `/api/doc/list` 长度；分组数 = 前端 `Set(group)` 现算；KB 层 / 向量层 = `ki_scope_list` 的 `kb` / `vector` 布尔 | `DashboardPage.tsx:217-220`、`src/scope.ts:63-74` |
| S-4 | 维度接口：`GET /api/vector/status?scope=` → `readVectorDimensionSnapshot()`，返回 `{scope,state,configured,persisted?,indexCompleteness?,checkedAt,staleAfterMs}`；`configured` **每次从 config 活读**（不信快照文件内的值） | `src/lib/mcp-http-api.ts:490-494`、`src/lib/vector-dimension-snapshot.ts:119-128` |
| S-5 | 前端封装与类型：`getVectorDimensionStatus(scope)` + `VectorDimensionStatus` | `web/src/api/tasksApi.ts:56-64, 127-129` |
| S-6 | AppShell **全站常驻**该查询（queryKey `['vectorDimensionStatus', scope]`，含 unknown 自动 refresh、任务结束后 invalidate），而 DashboardPage 渲染在 AppShell 的 `<Outlet/>` 下 ⇒ **同 key 可直接命中缓存** | `AppShell.tsx:226-249, 566` |
| S-7 | `GET /api/vector/status` **不进协调器队列**（直接读快照文件）；只有 `POST /api/vector/status/refresh` 走 `submit()`。⇒ 导入/重建期间该面板不会被排队阻塞 | `mcp-http-api.ts:490-494`（无 submit） vs `:495-531`（有 submit） |
| S-8 | scope 越权校验已登记 `/vector/status`，无需额外处理 | `mcp-http-api.ts:461-462` |
| S-9 | `config.embedding.model` **恒为非空字符串**（合并逻辑兜底 `DEFAULT_EMBEDDING.model`）⇒ 面板不会出现空值，只需处理"请求失败/旧 daemon" | `src/lib/config.ts:629-639` |
| S-10 | 集合创建配置只落 `dimension`，**没有 model** ⇒ "索引时实际使用的模型"今日不可得 | `src/lib/vector-client.ts:599-623` |
| S-11 | 既有文案口径（可复用，勿造新词）：「当前 embedding 为 N 维，旧向量集合为 M 维」 | `AppShell.tsx:530`、`ImportPage.tsx:1786` |
| S-12 | 健康检查里已有一行「向量集合维度」，值由 **doctor 报告文本正则**抽取 `config=(\d+)` | `DashboardPage.tsx:56, 70-77` |
| S-13 | 本卡片在 demo v3 中为 `mini-grid` + 4 个 `mini-card`（静态档案，产品已演进为 2×2 双列） | `…/2026-09-30-知识库浏览工作台 Demo/demo/workbench-pages-v3/index.html:456-461` |

---

## 3. 需求清单

### 3.1 必做（P0）

| ID | 需求 | 预期效果 | 验收标准 |
|----|------|----------|----------|
| **R1** | 「当前知识库」卡片新增**「嵌入模型」面板**，展示 `config.embedding.model`（当前值 `qwen3.7-text-embedding-flash`） | 用户不翻配置文件即可确认"现在配的是哪个模型" | 面板存在于该卡片；值为 `config.embedding.model`；改配置重启 daemon 后值随更新 |
| **R2** | 同卡片新增**「向量维度」面板**，展示 `config.embedding.dimension`（当前值 `1024`） | 用户可直接读到维度值，无需依赖 `ki doctor` 文本 | 面板存在；值为 `config.embedding.dimension`；与健康检查「向量集合维度」中的 `config=N` **数值一致** |
| **R3** | **数据通路**：`GET /api/vector/status` 响应新增 `model` / `provider` / `baseURL`（**与 `configured` 同口径：读路径从 config 活读，快照文件里的同名值不参与判定**；不改 `ki_scope_list` / `/api/import/config` 契约）；前端抽出共用查询（`web/src/lib/hooks.ts` 的 `useVectorDimensionStatus(scope)`），AppShell 与 Dashboard 共用同一 queryKey | 首屏零新增请求、零新增接口；两处展示同源同值 | `GET /api/vector/status` 返回含三字段；首屏 status GET 恰好 1 次；AppShell 既有维度告警行为不回归 |

> **为何不改 `ki_scope_list`**：该工具是 MCP 对外契约，被 CLI / AI 对话工具 / 前端多处消费（`src/scope.ts:149-156`）；把**全局**配置塞进 per-scope 列表会污染契约且违背"一个 scope 一个条目"语义。拒绝方案。
> **为何不加新接口**：R1/R2 与 `configured` 同源（都是 `config.embedding`），拆两个接口会让"配置值"出现两处真相。

### 3.2 展示与一致性（P1）

| ID | 需求 | 说明 |
|----|------|------|
| **R4** | **模型名需要"文本型数值"样式**：`qwen3.7-text-embedding-flash`（27 字符）放进 22px 大字号面板会溢出——需 mono 小字号 + 单行省略 + `title` 全文；维度值保留 22px 数字口径 | 复用 `ki-stat-card--soft` 容器，新增一个值样式变体（如 `.ki-stat-value--text`）；**呈现效果必须真实页面截图复核** |
| **R5**（已采纳 D3②） | 维度面板附 **scope 一致性角标**：同一响应已含 `state`（compatible / mismatch / unknown）与 `persisted` → 显示「集合一致 / 集合 {persisted} 维 / 未确认」 | 与健康项分工见 §7 D3 事实纠正 |

### 3.3 可选（P2/P3，默认不做）

| ID | 需求 | 成本 | 说明 |
|----|------|------|------|
| R6（已采纳 D4②） | 面板 `title` 附 `provider` / `baseURL`（如 `dashscope · https://maas.qianwenaiapi.com/compatible-mode/v1`） | 低 | 同时兼作模型名省略后的全文入口 |
| R7（已采纳 D7①） | 订正 `src/lib/config.ts:214` 过期注释（"kisearch 固定 4096"，实际随配置，用户当前为 1024） | 极低 | 本次一并改 |
| R8（**D1 已排除，本次不做**） | 展示"**索引时实际使用的模型**"并可检测"模型换了但没重建" | **中高** | 需 `buildCreateConfig` 写入集合元数据 + 快照扩展 + UI，且只对新建/重建集合生效，存量数据需迁移 |

---

## 4. 负向需求

| ID | 场景 | 期望行为 |
|----|------|----------|
| N-1 | 模型名超长 / 含 `/`、`.`、连字符（`Qwen/Qwen3-Embedding-8B`） | 单行省略不破版；`title` 可看全文；不换行撑高破坏 2×2 网格对齐 |
| N-2 | **配置改了模型名但维度不变**（系统检测不到，`state` 仍 compatible） | **已接受风险**（D2 拍板：不加"配置"字样）：缓解仅剩**中性命名**（「嵌入模型」/「向量维度」，不使用"索引模型"之类暗示性措辞），本次不引入额外说明文案 |
| N-3 | 请求失败 / 快照缺失 / R8 超时降级 | 显示 `—` 兜底，不显示 `undefined`、不显示 0，不阻塞卡片其它面板 |
| N-4 | **旧 daemon 未升级**（响应无 `model` 字段） | 前端类型 `model?: string`，缺省显示 `—`（对齐项目既有"旧 daemon 回退"实践） |
| N-5 | 后端已改但 **daemon 未重启** | 面板出现/取值需明确告知用户"需重启 daemon"，不静默旧值（本项目已知约束） |
| N-6 | 该 scope **无向量层**（`state:'unknown'`） | 面板仍显示配置值属预期（口径是"配置"），但不得让人以为该 scope 可向量检索；建议 `title` 说明 |
| N-7 | 窄屏 <960px（`ki-dash-grid` 纵排，`ki.css:495-498`） | 6 个面板仍 2 列自适应，不溢出、不出现横向滚动 |

---

## 5. 影响面评估

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需用户拍板 |
|--------------|----------|----------|------|----------|:---:|
| 健康检查「向量集合维度」行 | 展示 | 无感（信息重复） | `DashboardPage.tsx:70-77` | 保留不动；若采纳 R5，改为"面板给值、健康项给结论"的分工 | 是（D3） |
| AppShell 向量维度告警 banner | 流程/展示 | 无感（若抽 hook 有回归风险） | `AppShell.tsx:226-249, 300-349` | 抽 `useVectorDimensionStatus` 必须**行为等价**（unknown 自动 refresh、refresh 写回 cache、任务结束 invalidate 全保留），并跑既有维度相关脚本 | 否 |
| `/api/vector/status` 响应契约 | 接口 | 无感（**新增字段**，不改不删既有字段） | `tasksApi.ts:56-64` 为唯一前端消费方 | 前端类型加可选 `model` | 否 |
| `.vector-status/*.json` 快照文件 schema | 数据 | 无感（**不写入**该字段，读路径从 config 活读） | `vector-dimension-snapshot.ts:104-128` | 保持文件 schema 不变，避免新旧 daemon 互读歧义 | 否 |
| `/api/import/config`（`vectorDimension` 子集） | 接口 | 无影响（只取 configured/persisted） | `mcp-http-api.ts:710-724` | 无需处理 | 否 |
| MCP `ki_scope_list` 对外契约 | 外部契约 | 无影响（本方案明确不动） | `src/scope.ts:149-156` | — | 否 |
| 全局配置 vs per-scope 展示语义 | 展示 | **降级**（切 scope 时两值不变，可能被误读为 scope 级） | `~/.ki/config.yaml` 单一 `embedding` 段 | 文案写明"配置"；`title` 补口径说明 | 是（D2） |
| 导入/重建期间的可用性 | 性能/展示 | 无感（GET 不进队列） | `mcp-http-api.ts:490-494` 无 `submit` | 无需处理 | 否 |
| `/api/vector/status` 越权校验 | 权限 | 无影响（已登记） | `mcp-http-api.ts:461-462` | 无需处理 | 否 |
| demo v3 静态档案 | 档案一致性 | 无感 | `workbench-pages-v3/index.html:456-461` | 可不同步（demo 是冻结的设计档案） | 是（D6） |

**未发现（需确认）**：本仓库内未发现模型名/维度被写入报表、通知、导出或对外 SDK 的其它消费路径（`⚪ 未发现`；查证方式：`web/src` 全量 grep + `src/` 内 `embedding.model` 消费点 = `vector-client.buildEmbedding` / `health-check.checkEmbedding` / `scope-collection` 指纹（只存 sha256 前 24 位，不存明文））。

---

## 6. 优先级排序

| 优先级 | 条目 | 来源 | Kano | 价值 | 成本 | 证据 | 建议方向 |
|:---:|------|:---:|:---:|:---:|:---:|:---:|------|
| **P0** | R1 嵌入模型面板 + R2 维度面板 | M1 | 期望 | 中高 | 低 | 🟢 S-1/S-4/S-9 | 与 R3 一起实施 |
| **P0** | R3 数据通路（响应加 `model` + 抽共用 hook） | M1 | 期望 | 中高 | 低 | 🟢 S-4/S-6 | 同批实施 |
| **P1** | R4 文本型数值样式与省略 | M1（负向 N-1 派生） | 必备（不处理即破版） | 中 | 低 | 🟢 S-2 | 实施时一并做，附真实页面验证 |
| **P1** | R5 维度面板带一致性角标 | M1 | 期望 | 中 | 低 | 🟢 S-4 | **待拍板 D3** |
| **P2** | R6 provider / baseURL | M1 | 无差异→期望 | 低 | 低 | 🟢 | 建议只进 `title` |
| **P2** | R7 订正过期注释（4096） | 顺带发现 | 期望（防误导） | 低 | 极低 | 🟢 `config.ts:214` | 顺手改 |
| **P3** | R8 "索引实际模型"与变更检测 | 顺带推演 | 兴奋 | 中高 | 中高 | 🟢 S-10 | **待拍板 D1**，默认不做 |

> **P0 理由**：用户显式要求 + 价值中高且成本低；R1/R2/R4 属"不处理即不可用/破版"。

---

## 7. 决策定稿（2026-10-16 用户拍板）

| ID | 决策 | 落地要点 |
|----|------|----------|
| **D1** | **①** 仅配置值 | 不做 R8；不写集合元数据、不涉存量迁移 |
| **D2** | **①** 放「当前知识库」卡片；**且 UI 上不加"配置"字样** | 面板标签用中性词「嵌入模型」「向量维度」；原计划中"用'配置'口径缓解 N-2 误导"的手段**作废**，N-2 转为**已接受风险**（见 §4 N-2 备注） |
| **D3** | **②** 面板带一致性角标；健康项只报结论/告警 | ⚠️ 实施前核实纠正：健康项实际检查对象**不是集合**（见下「D3 事实纠正」），故"只报结论"＝ 正名 + 去掉重复的配置数字 + **修正错误建议** |
| **D4** | **②** provider / baseURL 放 `title` | 模型面板 `title` = 完整模型名 + `provider` + `baseURL`（兼作 N-1 省略后的全文入口） |
| **D5** | **①** 单行省略 + `title` | 新增文本型数值样式；维度值保持 22px 数字口径 |
| **D6** | **①** 不同步 demo v3 | demo 为冻结设计档案 |
| **D7** | **①** 本次一并订正 `config.ts:214` 过期注释 | — |

### D3 事实纠正（实施前新取证，🟢 代码直读，2026-10-16）

原报告把该行描述为"与面板重复"，**不准确**，实施前已纠正：

| 观察 | 事实 |
|------|------|
| 该行取值来源 | `DashboardPage.tsx:54` `pick('维度匹配')` —— 即 `ki doctor` 的**三合一 probe**：`config=${emb.dimension}, 实际=${actualDim}`，`actualDim` 是**上游 embedding API 返回向量的长度**（`src/lib/health-check.ts:196-214`）。它**从不打开集合**。 |
| `/api/health` 是否含集合维度项 | **不含**：`runHealthCheck(..., { checkCollectionDimensions: false })`（`src/lib/mcp-http-api.ts:748`），即 `Collection 维度 (<scope>)` 项（`health-check.ts:432-476`）根本不在该响应里。 |
| 后果 1（措辞过度声称） | 行名「向量集合维度」+ pass 文案「集合维度一致」**建立了该数据源无法建立的事实**（probe 不碰集合）。 |
| 后果 2（建议张冠李戴） | fail 分支建议 `ki restore <scope> --rebuild-vector --yes`；而该分支的真实成因是**上游返回维度 ≠ 配置维度**（换模型/换端点），rebuild 修不了（反而会用错误维度写集合）。 |

⇒ D3 的落地口径修正为：**面板负责"配置维度值 + 配置↔集合一致性"**；健康项**正名为「嵌入服务维度」**、pass 文案改为结论式（不再重复打印配置数字）、fail 分支保留上游实际值但把建议改为「核对 `embedding.model` / `embedding.dimension` 是否匹配」，删除 rebuild 建议。

---

## 8. 关键假设

| 假设 ID | 内容 | 错了会怎样 | 验证方法 |
|---------|------|------------|----------|
| H-01 | 用户要的"模型名称"= 配置文件里的 `embedding.model` | 若用户其实想要"索引时实际使用的模型"，需 R8（改集合元数据 + 存量重建），成本上台阶 | 用户回复 D1 |
| H-02 | 两个值都按**全局配置**展示，位置沿用「当前知识库」卡片 | 若期望"每个 scope 各自的模型"，则今日无数据源（模型名不落 scope），需先做 R8 | 用户回复 D2 |
| H-03 | 维度值为**配置值**（1024），非集合实际维度 | 若用户想看"实际维度"，改为 `persisted`（R5 角标即覆盖此诉求） | 用户回复 D3 |
| H-04 | 可复用 AppShell 已缓存的查询，无需新增请求 | 若抽 hook 破坏 AppShell 行为，维度告警 banner 回归 | 抽 hook 后跑既有维度相关验证脚本 + 单测 |

---

## 9. 实施计划（2026-10-16 已启动 —— 用户过确认点 D1–D7、D2 已修正）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `src/lib/vector-dimension-snapshot.ts` | `VectorDimensionSnapshot` 增 `model` / `provider` / `baseURL`：三个产出口（读成功 / 读兜底 / 刷新成功 / 刷新兜底）**一律从 `config.embedding` 活读**，与 `configured` 同口径；快照文件多写这三个字段，但读路径恒覆盖 ⇒ 不会出现陈旧值，旧读端忽略未知字段 |
| 2 | `src/lib/config.ts:214` | 订正过期注释（"kisearch 固定 4096" → 维度随配置，须与集合一致） |
| 3 | `web/src/api/tasksApi.ts` | `VectorDimensionStatus` 增**可选** `model?` / `provider?` / `baseURL?`（旧 daemon 回退） |
| 4 | `web/src/lib/hooks.ts` + `web/src/layouts/AppShell.tsx` | 抽 `useVectorDimensionStatus(scope)`（行为等价：unknown+过期自动 refresh、refresh 写回 cache、任务结束 invalidate 全保留），AppShell 改用 hook |
| 5 | `web/src/pages/DashboardPage.tsx` + `web/src/styles/ki.css` | +2 面板（嵌入模型 / 向量维度 + 角标）；文本型数值样式（mono 小字号 + 单行省略 + title）；健康项按 §7 D3 正名与改文案 |
| 6 | `web/src/lib/vectorDimensionCopy.ts` | 角标映射**纯函数**（可单测）：`dimensionBadge(status, hasError)` → `{text, tone}` |

**验证**：① `tsc`（src + web）；② web 单测（新增角标映射用例）；③ **隔离实例** API 断言（不碰 7423）：临时 config/dataDir 起 HTTP API，断言 `/api/vector/status` 含三个新字段且值等于配置；④ 真实页面截图复核（模型名省略不破版 / 6 面板网格 / 窄屏 / 角标三态）；⑤ 后端生效需**重启 daemon**（模块不热更）。

不推荐 `design-craft`：无新页面、无状态机、无外部依赖、接口仅加字段。

## 10. 顺带发现（非本需求，🟢 代码直读，建议另开或顺手处理）

1. **同一维度值存在两条独立通路**：面板走 `/api/vector/status`（结构化字段），健康检查那行走 **doctor 报告文本正则** `config=(\d+)`（`DashboardPage.tsx:56`）——doctor 文案一改即静默失效。**本次按 D3 已把该行正名并去掉重复数字**，但正则解析仍在（未纳入本次范围；建议后续统一到结构化字段）。
2. **`config.ts:214` 注释过期**：写"kisearch 固定 4096"，但 `buildCreateConfig` 用的是 `config.embedding.dimension`，用户当前配置为 1024（`~/.ki/config.yaml:8`）。该注释会误导"维度不可改"的判断（本次调研中已先被误导一次）。
3. 项目记忆 `kisearch-memory`（错误库/项目踩坑点）「导入期间读被队列阻塞」中，`/api/vector/status`(GET) 被记为"走 write 通道、导入期间排队"的残留项 —— **已于 2026-10-16 订正（用户授权）**：该路由无 `coordinator submit`（`mcp-http-api.ts:490-494`，直接读快照文件）；隔离探针 `temp/verify-vector-status-lane.ts` **4/4**（write 车道占用期 `activeWorkers=1`，同车道第二个写任务 `queuedMs=3697ms` 作业对照，该端点 **1ms** 返回）⇒ `/api/tags` 保持"仍是 write"的记载不变。
4. **集合维度诊断在 Web 侧缺位**：`Collection 维度 (<scope>)` 项只在 CLI doctor 里跑（`/api/health` 传 `checkCollectionDimensions:false`，`mcp-http-api.ts:748`）⇒ 本次的角标（数据源 `/api/vector/status` 快照）实际是**总览页首次具备"配置 ↔ 集合"一致性展示**。
