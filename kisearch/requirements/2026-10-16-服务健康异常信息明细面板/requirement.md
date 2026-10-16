---
id: REQ-20261016-003
feature: 服务健康异常信息明细面板
status: 实施中
created: 2026-10-16
updated: 2026-10-16
version: 2
tags: [feat, ux]
depends_on: []
author: AI
document_type: requirement
---

# 需求分析：服务健康异常信息明细面板（顶栏徽标 + 总览健康卡）

- **来源**：用户 2026-10-16 原话「看一下当前前端页面的 mcp http 的检测逻辑。当前好像是有问题会进行显示，但是根本不显示具体信息是啥，希望错误信息可以更具体一点。」（附顶栏徽标截图，显示 `MCP HTTP 已就绪`）
- **分析口径**：product-manager（M2 体验走查 + M4 界面走查 + M1 需求定义 · 一次成型档）
- **证据声明**：🟢 最高等级 = **代码直读 + 真实页面实测量化**（7423 实例 + 路由 stub 五态走查，19/19 断言全绿），**无降级**
- **确认点**：关键假设 H-01/H-02 已由用户确认成立；D1/D2/D5 已裁决（见 §7）

---

## 1. 结论速览

| # | 结论 | 证据 |
|---|------|------|
| 1 | **异常时用户只能看到一个检查项名**（如 `有告警 · 批大小探测`），原因 / 影响 / 修复办法全部不可见 | 🟢 实测 B；`web/src/layouts/AppShell.tsx:98-107` |
| 2 | **唯一详情通道是原生 hover tooltip**（`title={s.detail \|\| s.label}`）⇒ 键盘不可达、触屏不可见 | 🟢 实测 A2/F2；`AppShell.tsx:102` |
| 3 | **两处口径直接打架**：顶栏 `有告警 · 批大小探测` 时，总览健康卡角标仍显示 `5 通过`（角标数的是运行概览 5 行，不是 doctor 12 项） | 🟢 实测 B + 截图 `health-B-warn.png`；`DashboardPage.tsx:139-150` |
| 4 | **详情数据其实已经存在且很具体**（后端 `detail` 已含原因 + 修复命令），被藏在**默认折叠**的 `配置自检（ki doctor · 12 项）` 里，折叠标题不提示"含告警" | 🟢 实测 B6；`src/lib/health-check.ts:30-41,515-527`；`DashboardPage.tsx:168-169` |
| 5 | **warn 级没有任何横幅**：`HealthBanner` 对 warn 直接 `return null`，只有 fail / 不可达才有可见详情 | 🟢 实测 B3；`web/src/components/HealthBanner.tsx:14` |
| 6 | **只报第一条**：1 项 fail + 2 项 warn 时，徽标只显示 fail 那条，另 2 项 warn 在任何可见位置都不出现 | 🟢 实测 C1/C2；`web/src/lib/hooks.ts:69-85`（`items.find`） |
| 7 | 长项名被徽标宽度截断成 `有告警 · Collection …`，且无任何入口查看全名 | 🟢 实测 F1（scrollWidth=481 / clientWidth=134） |
| 8 | 徽标文案 `MCP HTTP …` 的判据实为 **doctor 全绿**（含 embedding / 目录 / 配置字段），**并非服务存活**；前端从不探活 `/healthz` | 🟢 `web/src/**` grep `healthz` **0 命中**；判据全在 `hooks.ts:43-87` |

**核心判断：这不是后端数据缺口，是前端展示层缺口** —— 后端已给全量结构化明细（`HealthItem { name, status, detail }`，`detail` 必填且含修复命令），前端只挑了第一条的 `name` 展示。故改造成本低、收益直接。

**复杂度判定：低**（单点改动 + 无外部依赖 + 无状态机变更 + 后端零改动）；但含新弹层交互，建议先走一次 `interaction-design`。

---

## 2. 现状取证

### 2.1 代码直读（🟢）

| # | 事实 | 位置 |
|---|------|------|
| S-1 | 健康状态唯一判据 `summarizeHealth(data, error, pending)`，3 处消费点共用 | `web/src/lib/hooks.ts:43-87` |
| S-2 | 判据优先级：checking → error(无 status=unreachable / 有 status=slow) → **第一个 fail** → **第一个 warn** → ok | `hooks.ts:49-86` |
| S-3 | `HealthSummary` 只有 `{ level, label, detail }`；`label` 受"必须短"约束（注释写明供 220px 徽标用） | `hooks.ts:30-36` |
| S-4 | 徽标渲染：`<span title={s.detail \|\| s.label}>` + 圆点 + `label`；**非交互元素**（无 onClick / tabindex / aria） | `AppShell.tsx:98-107` |
| S-5 | 徽标宽度链：基础 `width:220px`（`ki.css:382`）→ 顶栏作用域覆盖为 **170px**（`ki.css:285`）→ ≤1100px 媒体查询 `140px`（`ki.css:2492`，**实测未生效**，见 S-6 与 §6 顺带发现） | `web/src/styles/ki.css:380-390,285,2489-2494` |
| S-6 | 徽标文本容器 `.ki-service-badge__text { min-width:0; overflow:hidden; text-overflow:ellipsis }` ⇒ 超长静默省略号 | `ki.css:390` |
| S-7 | 后端 `HealthItem = { name, status: pass\|warn\|fail, detail }`，**`detail` 必填 string**；`HealthReport` 另带 `pass/warn/fail` 计数 | `src/lib/health-check.ts:28-41` |
| S-8 | `detail` 文案已含原因 + 修复指引（样例：批大小探测 = `batchSize=32 超过服务商单请求上限 25（…）；修复：把 embedding.scheduler.batchSize 下调到 ≤ 25…`；Collection 维度 = `配置 1024 维，集合 4096 维；请执行 ki restore <scope> --rebuild-vector --yes`） | `src/lib/health-check.ts:280-329,445-458` |
| S-9 | CLI 侧有完整渲染 `renderHealthReport()`（逐项 `statusIcon + name + detail`）⇒ **同一份数据，CLI 全量可见、Web 残缺** | `src/lib/health-check.ts:515-527` |
| S-10 | 总览健康卡：头部角标 `{pass} 通过 · {alerts} 告警` 的 `pass/alerts` 由**运行概览 5 行**算出，**不从 `report.pass/warn/fail` 取** ⇒ 与 doctor 口径脱钩 | `DashboardPage.tsx:137-150` |
| S-11 | 运行概览仅固定 5 行（数据目录可写 / MCP HTTP 服务 / 嵌入服务维度 / FTS 索引 / 后台任务队列），doctor 其余项**在概览区不可见** | `DashboardPage.tsx:45-106,163-167` |
| S-12 | doctor 全量清单在 `<details className="ki-health-config">` 内，**默认折叠**，标题 `配置自检（ki doctor · N 项）` 不含异常信息 | `DashboardPage.tsx:168-169` |
| S-13 | `HealthBanner` 在 `level ∈ {checking, ok, warn}` 时 `return null` ⇒ **warn 无横幅**；横幅文案为 `{label}：{detail}` | `HealthBanner.tsx:14,26-30` |
| S-14 | 不可达时 `detail = e.message`，浏览器给出的是 `Failed to fetch`（技术黑话） | `hooks.ts:55-60` |
| S-15 | `useHealth`：`queryKey ['health']`、`staleTime 60s`、`retry:false`；`HealthBanner` 有 `refetch()` 重试按钮 | `hooks.ts:19-26`；`HealthBanner.tsx:34-36` |
| S-16 | 前端 `web/src/**` 中 `healthz` **0 命中**（前端从不探活存活端点，徽标判据 100% 来自 `/api/health`） | 全量 grep |
| S-17 | `web/test/` 24 个测试文件中**无任何健康相关测试**（`summarizeHealth` 作为 3 处消费的唯一 SSOT，零覆盖） | `web/test/*.mjs` grep `健康\|health` 0 命中 |

### 2.2 真实页面实测（🟢）

- 脚本：`temp/verify-health-diagnostics.cjs`（只读：仅加载页面 + 读 DOM + 路由 stub `/api/health`），**19 通过 / 0 失败**
- 跑法：`NODE_PATH=/root/.bg-agent/node/node_modules node temp/verify-health-diagnostics.cjs`
- 截图：`temp/shots/health-{A-ok,B-warn,C-fail,C-open,D-http400,E-unreachable,F-longname-1440,F-longname-900}.png`

| 态 | 顶栏徽标可见文案 | 详情在哪 | 横幅 | 健康卡角标 | 折叠态 |
|---|---|---|---|---|---|
| 全绿（真实实例） | `MCP HTTP 已就绪` | —（`title` 同文案） | 无 | `5 通过` | 折叠 |
| **1 warn** | `有告警 · 批大小探测` | **仅 hover title** | **无** | **`5 通过`（不体现告警）** | 折叠（标题不含告警） |
| 1 fail + 2 warn | `健康异常 · 维度匹配` | 横幅 + hover | 有（仅第一条） | `5 通过`（不体现） | 折叠 |
| HTTP 400 | `健康检查未完成` | 横幅 + hover | 有（带后端 error） | — | — |
| 不可达 | `MCP HTTP 不可达` | 横幅（含启动指引） | 有 | — | — |
| 长项名 warn | `有告警 · Collection …`（**截断**） | 仅 hover | 无 | `5 通过` | 折叠 |

---

## 3. 需求清单

### 3.1 P0（必备）

| ID | 需求 | 预期效果 | 验收标准 |
|----|------|----------|----------|
| **R1** | **徽标异常态可点击展开「服务健康明细」popover 面板**（D1 裁决 = 就地弹层）：列出**全部** fail / warn 项（项名 + 状态图标 + `detail` 全文），含修复命令**一键复制** + 「重新检查」按钮 | 异常时不必 hover、不必翻 CLI，一眼看到"哪一项、什么原因、怎么修" | ① 徽标异常态为可聚焦元素（`button` 或 `role=button` + `tabindex`），点击/Enter 均展开；② 面板列出 `report.items` 中**全部** status≠pass 项（与 `ki doctor` 项名一致）；③ 有 `ki …` 命令的 detail 提供复制按钮；④ ESC 关闭且焦点返回徽标；⑤ 面板内「重新检查」触发 `refetch()` |
| **R2** | **健康卡角标口径对齐 doctor**：改用 `report.pass / warn / fail` 计数（`{pass} 通过 · {warn} 告警 · {fail} 失败`），有异常时高亮 | 消除"顶栏说告警、卡片说全绿"的自相矛盾 | ① doctor 有 warn 时角标显示 `… · N 告警`；② 数值与 `report.warn/fail` 逐项一致；③ 全绿时角标仍为 `N 通过`（无回归） |

### 3.2 P1（期望）

| ID | 需求 | 说明 |
|----|------|------|
| **R3** | **折叠区异常可见性**：折叠标题带异常计数并高亮（`配置自检（12 项 · 1 项告警）`）；存在 fail 时**默认展开** | 现状 `配置自检（ki doctor · 12 项）` 既无异常提示也无展开诱因 |
| **R4** | **概览区补异常摘要行**：运行概览 5 行未覆盖的异常项，在概览顶部插入"另有 N 项异常（点此查看）"并可打开 R1 面板 | 解决 S-11（概览与 doctor 项集合不重合） |

### 3.3 P2（增益）

| ID | 需求 | 说明 |
|----|------|------|
| **R5** | **不可达文案人话化**：`Failed to fetch` → 「无法连接服务（服务未启动或网络异常）」+ 排查命令进面板 | `hooks.ts:55-60` |
| **R6** | **语义层订正**（D2 裁决 = **只订正文案**）：`MCP HTTP 已就绪 / 不可达` 改为「服务健康」类表述，不引入 `/healthz` 双层探活、不改判据 | 消除"embedding 挂了却像本地服务有问题"的误导 |
| **R7** | **补测试**：`summarizeHealth` 五态单测 + 徽标/面板 DOM 断言（含键盘可达、长项名换行、多异常项全列） | 现状零覆盖（S-17） |

---

## 4. 负向需求（negative）

| # | 场景 | 期望行为 |
|---|------|----------|
| N1 | **异常项过多**（多 scope 维度 warn 可 >10 项） | 面板限高 + 滚动 + "共 N 项"汇总；不得撑破视口 |
| N2 | **超长项名 / scope 名** | 面板内 `overflow-wrap:anywhere` 换行，不得横向滚动 |
| N3 | **detail 含命令** | 复制按钮；剪贴板 API 失败须降级（项目已有 `execCommand` 回退先例） |
| N4 | **键盘操作** | 徽标可聚焦；Enter/Space 展开；ESC 关闭；关闭后焦点返回徽标 |
| N5 | **窄屏 / 触屏** | ≤1100px 徽标仅 134px 文本宽、无 hover ⇒ 面板是触屏**唯一**详情途径；面板需贴边不溢出 |
| N6 | **旧 daemon 无 `report.items`** | 面板显示"后端未返回健康明细"，不得空白或崩溃 |
| N7 | **面板打开期间 health 被 invalidate** | 内容随更新，不残留已消失的异常项 |
| N8 | **深色主题** | 状态色（ok/warn/fail）在 `[data-theme=dark]` 下保持可辨识对比度 |

---

## 5. 影响面评估

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需用户拍板 |
|---|---|---|---|---|---|
| 顶栏徽标（全站常驻） | 展示 | 无感（改造自身） | `AppShell.tsx:98-107` | 新增 popover 面板 | 否 |
| 总览健康卡头部角标 | 展示 | **降级**（数字口径变化） | `DashboardPage.tsx:139-150` | R2 对齐 doctor | D4（见图，默认采纳推荐） |
| HealthBanner | 展示 | **降级**（warn 也可能开始出现） | `HealthBanner.tsx:14` | 由 R1 面板承担，横幅维持现有范围 | D3（默认采纳推荐） |
| 后端 `/api/health` 契约 | 外部契约 | 无感（**不改**） | `health-check.ts:30-41` | 保持现状 | 否 |
| 顶栏宽度约束 | 布局 | 降级风险 | `ki.css:285,2492`（曾为防抖动固定宽度，2026-09-17 记录） | 面板须贴边定位、不撑破顶栏 | 否 |
| 前端健康测试 | 质量 | 补强 | `web/test` 0 命中 | R7 随 R1/R2 一起补 | 否 |
| 专家资产契约 | 文档 | 降级（契约需补） | `.module-experts/可视化前端专家/C1:72-76` 仅写"徽标区分展示" | 改造后回刷专家包与 `ki.css` 注释 | 否 |

> 未发现其它关联方：`⚪` 无 —— 本轮已穷举 `summarizeHealth` 的 3 个消费点 + 后端契约 + 顶栏布局约束。

---

## 6. 关键假设

| ID | 假设 | 状态 | 错了会怎样 | 验证方法 |
|---|---|---|---|---|
| H-01 | 用户看到的"有问题会显示"= 顶栏徽标变色 + 项名 | **用户已确认成立** | 报告方向偏 | 已确认 |
| H-02 | "更具体" = 哪一项 + 什么原因 + 怎么办 | **用户已确认成立** | R1 面板信息结构要重排 | 已确认 |
| H-03 | 前端可独立完成（后端数据已够） | 🟢 已证 | 需改后端 | `detail` 已含原因 + 修复命令（S-8） |
| H-04 | 异常项通常 1–3 项，极端可 >10 | ⚪ 待观察 | N1 的限高/折叠策略需调整 | 多 scope 部署观察 |
| H-05 | 顶栏可容纳一个可点击徽标（宽度约束不变） | 🟡 结构可证 | 需重排顶栏 | 交互设计阶段按 170/134px 实际宽度推演 |

### 顺带发现（未修，非本需求范围）

| # | 发现 | 证据 | 建议 |
|---|------|------|------|
| I-1 | `ki search` 语义检索报错 `topk exceeds max 1000, got: 1350`（`kisearch` 与 `kisearch-memory` 双 scope 均失败），**全文模式可用** | 本轮实测 | 单独排查记忆库检索链路 |
| I-2 | 媒体查询 `ki.css:2492` 的窄屏 `140px` **未生效**（实测 1440px 与 900px 下文本宽均 134px = 170px 规则生效），因 `ki.css:285` 的 `.ki-workspace-header__actions .ki-service-badge` 特异性更高 | 实测 F1/F3 | 随 R1 一并修正（窄屏规则需带同等特异性或 `!important` 之外的重构） |
| I-3 | `HealthList` 的 `failure: HealthSummary` 参数仅在 `doctorItems.length === 0` 时使用（有数据时最具体的 `detail` 被丢弃） | `DashboardPage.tsx:126,132,156-157` | 随 R1/R4 一并处理（该参数可直接供面板复用） |

---

## 7. 拍板记录（2026-10-16）

| # | 议题 | 裁决 |
|---|------|------|
| **D1** | 徽标点击后形态 | **就地 popover 明细面板**（不离开当前页，列全部异常项 + 修复命令可复制） |
| **D2** | 「MCP HTTP」措辞 | **只订正文案**（改「服务健康」类表述，**不改判据、零后端改动**、不引入 `/healthz` 双层） |
| **D3** | warn 是否要横幅 | 未单独提出 → **默认采纳推荐：不加**，由 R1 面板承担（横幅维持 fail/unreachable） |
| **D4** | 健康卡角标数字口径 | 未单独提出 → **默认采纳推荐：改用 doctor 计数**（`report.pass/warn/fail`） |
| **D5** | 是否落盘需求文档 | **落盘到本仓**（本文件，`REQ-20261016-003`） |

> D3/D4 采用推荐默认，若与预期不符可在交互设计阶段推翻（改动均为文案/取值级）。

---

## 8. 验证计划（实施后）

| 层 | 手段 | 覆盖 |
|---|------|------|
| 单测 | `web/test/*.mjs`（R7） | `summarizeHealth` 五态；面板列出全部异常项；空 items 回退 |
| 页面走查 | 扩展 `temp/verify-health-diagnostics.cjs`（现 19/19）+ 新增面板断言 | 点击/键盘展开、ESC 关闭、复制、限高滚动、长项名换行、窄屏（900/1100/1440）、深色主题；角标口径与 doctor 计数一致 |
| 回归 | 现有走查 + `npm run build` + `tsc` | 徽标全绿态与既有维度告警、任务徽标、ScopeSelect 布局不抖动 |

---

## 9. 下一步

1. 本需求状态：**已确认** → 转 `interaction-design`（异常信息架构：面板内容结构、键盘/触屏/窄屏路径、R3/R4 的呈现位置），产出 `design/interaction-design.md`
2. 视觉细节（面板样式、状态色、层级）由 `interaction-design` 按需转 `ui-designer`
3. 实施：`request-guard` → 编码 → `code-review`（后端零改动，预计仅 `web/src` 5 文件 + `ki.css`）

**未做**：本阶段未修改任何产品代码；取证脚本落在 `temp/`（项目惯例，非产品代码）。

---

## 10. 实施记录（2026-10-16）

台账：`.plans/2026-10-16-health-detail-panel/`（8 工作项 / 6 条执行护栏）。

### 10.1 交付（7 个文件，**后端零改动**）

| 文件 | 改动 |
|------|------|
| `web/src/lib/healthSummary.ts` **（新增）** | 健康判据纯逻辑抽出：`summarizeHealth` 增补 `issues`（全部非 pass 项，fail 在前）/ `counts`（doctor 计数）/ `hasReport`；文案订正（`服务健康`、`N 项异常 · 首项名`、`无法连接服务`）；新增 `toHealthIssues` / `healthIssueCopyText` / `humanizeHealthError` |
| `web/src/lib/hooks.ts` | 改为只做 re-export（既有 `from '@/lib/hooks'` 导入路径不变），恢复"只放 query 封装"的职责 |
| `web/src/lib/clipboard.ts` **（新增）** | Clipboard API → `execCommand` 回退 → 抛错（失败必须可见） |
| `web/src/components/HealthDetailPanel.tsx` **（新增）** | 明细面板：标题计数、全部异常项（fail 在前）+ `detail` 全文 + 「复制处理建议」+「重新检查」+「查看完整自检 →」；`role="dialog"`、非模态 |
| `web/src/layouts/AppShell.tsx` | `ServiceBadge`：`<span title>` → `<button aria-haspopup="dialog" aria-expanded>`；document 级点外关闭 / ESC 关闭 + 焦点归还 |
| `web/src/styles/ki.css` | `.ki-service-badge-wrap` + 面板样式（复用 `--ki-shadow-2` / `--ki-radius-sm` / `.ki-health-item__detail` 换行口径）+ `.ki-badge--fail`；**修正 I-2**（窄屏 `140px` 规则因特异性低于顶栏作用域规则而从未生效） |
| `web/src/pages/DashboardPage.tsx` | R2 角标改用 `report.pass/warn/fail`（旧 daemon 回退既有口径）；R3 折叠标题带异常计数 + 有 fail 时默认展开；R4 概览区新增「另有 N 项配置自检异常」摘要行 |
| `web/src/api/httpApi.ts` | 顺带订正 `HealthReport.pass` 类型 `boolean` → `number`（后端实为计数；改前前端零消费点） |
| `web/test/health-summary.test.mjs` **（新增）** | 16 例：五态判据、fail 优先、计数不编造、旧 daemon 回退、detail/message 降级、人话文案、复制载荷 |

### 10.2 验证（全绿）

| 层 | 证据 |
|---|---|
| 类型 | `npx tsc --noEmit` → exit 0 |
| 单测 | `npm test` → **341 pass / 0 fail**（新增 `health-summary.test.mjs` 16 例，含"有 HTTP 应答不得判 unreachable"专项回归锁） |
| 构建 | `npm run build` → exit 0 |
| 页面走查 | `temp/verify-health-diagnostics.cjs` → **46 pass / 0 fail**（A 真实全 pass 基线 / B 1 warn 口径一致 / C 1 fail + 2 warn 全列 / D HTTP 400 与旧 daemon / E 不可达 / F 长项名 / G 键盘 + 点外 + 复制 + 三档视口 + 深色主题） |
| 裁剪风险预验证 | `temp/probe-health-panel-clip.cjs`：`.ki-content` 的 `overflow-y:auto` **不裁剪**顶栏下方 320px 浮层（四场景 `elementFromPoint` 全命中 ⇒ 可用 absolute 而非 fixed/portal） |
| 截图 | `temp/shots/health-{A-ok,B-warn,C-fail,D-noreport,F-longname,G-narrow,G-dark}-*panel*.png` |

### 10.3 与需求/交互草案的偏差

| # | 偏差 | 原因 |
|---|------|------|
| 1 | 新增 `web/src/lib/clipboard.ts`（需求未提） | 面板"复制处理建议"需要带降级的剪贴板写入；项目三处同款私有实现未合并（记为遗留），故新建共用工具 |
| 2 | 判据抽出为 `lib/healthSummary.ts`（原计划改 `hooks.ts` 内部） | 与项目既有分工一致（`vectorDimensionCopy.ts` / `vectorDimensionNotice.ts` / `toolBudget.ts`），使纯逻辑可零依赖单测 |
| 3 | 角标在无 `counts`（旧 daemon）时回退既有"运行概览"口径 | 不编造数字；有计数时严格以 doctor 为准（D4 推荐值） |
| 4 | `?selfcheck=1` 由 `HealthDetailPanel` 的链接带入、`DashboardPage` 读取 | 交互草案 §3「跳总览并展开」的落地方式；避免引入跨页全局状态 |

### 10.4 未做 / 遗留

- **I-1**（`ki search` 语义检索 `topk exceeds max 1000, got: 1350`，全文模式可用）—— 与本需求无关，待单独排查；
- 三处剪贴板私有实现未合并（`MarkdownPreview.tsx:670` / `ModuleDrawer.tsx:877` / `TasksPage.tsx:278`）；
- `acceptance-verify` / `implementation-report` 未执行（可选流程）。

### 10.5 审查与质疑闭环（2026-10-16）

| 阶段 | 结论 | 产物 | 关键发现 |
|---|---|---|---|
| `code-review` | 整体 **A**，修复 P0 后可合入 | `review/code-review.md` | **P0/M1**：明细面板空态文案在 `checking` / `unreachable` / `slow` 三态误报「后端未返回健康明细（可能是旧版 daemon），请升级后重试」，且 `checking` 态标题渲染为空串 ⇒ 会引导用户去升级/重启一个正常的 daemon（与 `hooks.ts` 记载的历史踩坑同型）。**根因是实施期自评审的走查断言太弱**（原 `E4` 只断言"面板可打开且有说明"，未校验文案正确性） |
| `challenger` | 8 条：成立 2（均已修复）/ 待确认 2 / 不成立 4 | `review/challenge-report.md` | **#3** 二次点「查看完整自检」为死链（跳转意图只用 URL **值**承载，值未变 ⇒ 展开 effect 不重跑；**首次点击正常、第二次才失效** ⇒ 常规验收测不出）→ 依赖加 `location.key`；**#9** 把窄屏徽标宽度规则"修正"为生效属**未授权搭车变更**，且方向与"让异常信息更可见"**相反** → 回退并在原位注明 |

**修复后最终验证**：`npx tsc --noEmit` exit 0 · `npm test` **341/341** · `npm run build` exit 0 · 页面走查 `temp/verify-health-diagnostics.cjs` **59/59**（新增 `C8–C10` 跳转回归锁、`D3/D3b`、`E4/E5`、`I1–I4` 加载中态）· 边界补验 `temp/verify-health-panel-edge.cjs` 6/6。

**两条成立质疑均为自审与 code-review 漏检** —— 记录以供同类任务参照：① 断言必须校验**语义**（文案正确性），不能只校验**存在性**（"有说明"≠"说明对"）；② 搭车变更"正确"≠"该做"，须评估其与需求**目标方向**的关系，而不仅是技术正确性。
