---
id: REQ-20261016-002
feature: 总览当前知识库嵌入模型与维度面板
document_type: review
status: 已确认
created: 2026-10-16
updated: 2026-10-16
version: 1
tags: [feat, ux]
author: AI
---

# 📋 Code Review Report：总览「嵌入模型 / 向量维度」面板

**Commit**：`[未提交工作区变更]`（无 commit message，阶段 0.1/0.2 跳过；阶段 0.3 敏感扫描已执行）
**变更文件**：`src/lib/config.ts`、`src/lib/vector-dimension-snapshot.ts`、`web/src/api/tasksApi.ts`、`web/src/lib/hooks.ts`、`web/src/layouts/AppShell.tsx`、`web/src/lib/vectorDimensionCopy.ts`、`web/src/pages/DashboardPage.tsx`、`web/src/styles/ki.css`、`web/test/vector-dimension-copy.test.mjs`、**新增** `test/vector-dimension-snapshot.test.ts`
**关联需求**：`REQ-20261016-002《总览当前知识库嵌入模型与维度面板》`（用户指定 ✅ 权威语义 = 用户拍板 D1–D7 + `requirement.md`）
**整体评分**：**A**（七维均值 9.3；无未修复 P0）

## 🎯 功能意图推测（阶段 3）

**🌍 全局图景**：业务目标 = **不打开配置文件即可确认当前 embedding 配置，并知道它与该 scope 集合是否一致**｜系统位置 = `总览面板/顶栏 banner → useVectorDimensionStatus → GET /api/vector/status（POST refresh）→ readVectorDimensionSnapshot/refreshVectorDimensionSnapshot → config.embedding + zvec collection info`｜整体成功判据 = ① 顶栏维度告警行为不变 ② `/api/import/config` 契约不变 ③ 快照 TTL / unknown 语义不变 ④ 不新增接口、不引入自动轮询 ⑤ 旧 daemon 可降级。

| 代码位置 | 推测的功能意图 | 确认状态 | 置信度 |
|----------|---------------|----------|--------|
| `vector-dimension-snapshot.ts::configuredIdentity()` | 让"当前配置的 embedding 标识"与 `configured` 同口径随读路径活读，避免快照文件成为陈旧值来源 | ✅ 已确认（用户 D1/D2 + 需求 R1–R3） | 🟢 |
| `hooks.ts::useVectorDimensionStatus()` | 把 AppShell 的维度查询抽成两处消费共用，且**不改变**既有取数时机 | ✅ 已确认（需求 R3 + 用户要求"总览复用"） | 🟢 |
| `DashboardPage` 两个面板 + 健康项改文案 | 面板给值、角标给一致性结论；健康项只报上游维度的结论 | ✅ 已确认（D3） | 🟢 |

## 📊 维度评分概览

| 维度 | 评分 | 状态 | 说明 |
|------|:---:|:---:|------|
| 🔑 语义一致性 | 9.5/10 | ✅ | 面板只表达"当前配置"，未越界声称"索引所用模型"（N-2 已按用户 D2 记为接受风险） |
| ⚠️ 安全性 | 10/10 | ✅ | 响应/落盘均无 apiKey（curl 实测响应字段白名单 + 测试 ⑥ 锁文件不含密钥）；无注入/越权面变化（`/vector/status` 越权校验已登记） |
| 🐛 Bug 风险 | 9/10 | ✅ | 角标诚实性由纯函数 + 单测锁定；`dimensionReady` 门控避免加载态误报「未确认」 |
| 📐 代码规范 | 9/10 | ✅ | 注释解释"为什么"（含 challenger 结论回写）；命名与既有 `configured`/`state` 口径一致 |
| 🏗️ 架构设计 | 9/10 | ✅ | 单一数据源（快照函数 4 产出口）+ 单一查询（同 queryKey）；未污染 `ki_scope_list`/`/api/import/config` 契约 |
| ⚡ 性能 | 9.5/10 | ✅ | 首屏 GET=1、站内切回 0、全程 POST=0（G 段实测）；GET 路径为本地文件读，不进 coordinator |
| 🧪 测试覆盖 | 9/10 | ✅ | web 单测 +9 例（316/316）；新增后端正式测试 7/7；页面走查 35/35（原缺"后端不变量无正式回归锁"，见 P1-1 已修） |

## 🛤️ 数据流守恒与搭车变更（阶段 5，维度 0.9 / 0.10）

**新增数据元素贯通（0.9 贯通两问）**

| 新增数据元素 | 正向贯通（沿链路 → 最终落点） | 反向消费 | 结论 |
|--------------|------------------------------|----------|------|
| `model` / `provider` / `baseURL`（快照与 API 响应） | ✅ 4 个产出口生产 → HTTP GET/POST 与同源 daemon RPC 均返回 → `tasksApi` 类型 → hook → 面板文本 + `title` + 角标 | ✅ 有生产有消费（面板；`title` 承载全文） | ✅ |

**搭车变更审计（0.10）**

| 搭车变更位置 | 改动性质 | 围栏检查（原写法是否故意） | 正确性（0.6/0.9） | 结论 |
|--------------|----------|---------------------------|-------------------|------|
| `DashboardPage.tsx:70-78` 健康项正名 + 删 rebuild 建议 | 顺手纠错（用户只批了"只报结论"） | ✅ 已证非故意：旧名与 pass 文案声称了数据源无法建立的事实（`/api/health` 传 `checkCollectionDimensions:false`） | ✅ 正确（新文案与数据源一致） | ⚠️ 已证正确 → **须向用户明示**（已在质疑报告 #2 与交付说明列出，待其否决）；建议拆分独立提交单独评审 |
| `src/lib/config.ts:214` 注释订正 | 文档纠错（用户 D7 明确批准） | ✅ 有授权 | ✅ 正确（与 `buildCreateConfig` 实际行为一致） | ✅ 放行 |
| `hooks.ts` 内联查询抽为 hook | 重构（需求 R3 明确要求） | ✅ 有授权 + 行为等价性由 G1/G4/G5 实测锁定 | ✅ 正确 | ✅ 放行 |

## 🧪 条件路径与执行场景（0.7 / 0.8）

| 参数/条件组合 | 执行路径 | 修改后是否受影响 |
|--------------|----------|------------------|
| 快照缺失 / 过期 | `readVectorDimensionSnapshot` → unknown + 标识齐备 | ✅ 不变（测试 ①④） |
| `persisted === configured` | compatible → 角标「集合一致」 | ✅ 新增展示（测试 ②，页面走查 B） |
| `persisted ≠ configured` | mismatch → 角标「集合 N 维」+ 重建指引 | ✅ 新增展示（测试 ③，页面走查 C） |
| 请求失败 / 旧 daemon 无字段 | 面板「—」+ 角标「未确认」 | ✅ 不渲染 undefined（页面走查 A3/A4/D） |
| 首挂（无数据） / 站内切回（有数据） | 取数 1 次 / 不取数 | ✅ 与改动前等价（G1=1、G4=0） |

**测试验证建议**：无 —— 审查中的不确定项均已由实际执行获得确定性证据（见「验证证据」）。

## 🔴 严重问题（必须修复）

无。

## 🟡 建议改进（推荐修复）

| # | 位置 | 问题 | 处理 |
|---|------|------|------|
| P1-1 | 后端两条不变量（读路径恒覆盖 / 无密钥落盘） | **此前只在 `temp/` 脚本里验证，而 `temp/` 未纳入版本库 ⇒ 无正式回归锁** | ✅ 已修：新增 `test/vector-dimension-snapshot.test.ts`（7/7；已被 `npm run test:all` 的 `test/*.test.ts` glob 自动纳入） |
| P2-1 | 本次工作区 | 三类变更混在一起（功能 + 健康项文案纠错 + 注释订正），提交粒度不单一 | 建议按 3 个 commit 提交（纠错项单独提交并在 message 说明理由） |
| P2-2 | `web/src/lib/hooks.ts` | `refetchOnMount:false` 的语义锁只存在于 `temp/` 页面脚本（项目既有模式，脚本未入版本库） | 已在代码注释中写明理由与失效后果；如需强锁可后续抽可测纯函数 |
| P2-3 | 顺带发现（未修，见需求 §10） | 维度值两条通路（面板结构化字段 vs health 走 doctor 文本正则 `config=(\d+)`）；`Collection 维度 (<scope>)` 诊断仍只在 CLI doctor | 后续统一（不阻塞本需求） |

## 🟢 亮点

1. **零契约扩散**：只扩了 1 个响应的 3 个可选字段，未碰 `ki_scope_list` / `/api/import/config` / MCP 工具契约；前端不新增请求（首屏 GET=1 实测）。
2. **诚实性内建**：`dimensionBadge` 把"没有 persisted 就不许断言一致/不符"写成纯函数并被单测锁定 3 例（与顶栏 banner 同口径）。
3. **读路径活读设计**：把"配置值"统一为读路径从 config 取（连同文件内的同名值也被覆盖），从根上消除"改了配置但界面显示旧值"这一类缺陷。

## 📝 总结与行动项

**🎯 合入结论**：✅ **可直接合入**（无 🔴；P1-1 已在本次审查中修复并验证）

**💥 缺陷 → 功能影响翻译**：无 P0/P1 未修项 —— 唯一 P1（缺正式回归锁）在合入前已补测（7/7），故不产生用户可见影响。

**🚧 合入前必须完成（P0）**：无。

**📌 合入后跟进（P1/P2）**

| 优先级 | 行动项 | 关联 |
|--------|--------|------|
| P1 | 向用户明示健康项正名/删建议（搭车变更），可一键回退 | 0.10 搭车审计 / 质疑 #2 |
| P2 | 按 3 个 commit 拆分提交 | P2-1 |
| P2 | 角标补就地恢复入口；统一维度值两条通路 | 质疑 #8 / 需求 §10 |

**验证证据（已实际执行）**：`tsc`（src + web）0 错 · web 单测 **316/316** · 后端新测 **7/7** · 隔离实例 API **23/23** · 真实页面走查 **35/35** · `vite build` exit 0 · 真实 daemon 重启后 `curl` 三字段实测。

---

### 🧨 阶段 7：无阻塞项自动质疑

合入结论为 ✅ 且标准模式以上 ⇒ 应触发 challenger。**本会话已对当前变更执行 challenger（首轮 8 项）**，且首轮结论落地后对 **diff 增量做了第二轮质疑**（4 项，1 项成立已修）——见 `review/challenge-report.md`「🔁 第二轮质疑」。质疑结果无新增阻塞项，**合入结论维持 ✅**（按约定两报告结论一致）。
