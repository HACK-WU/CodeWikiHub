---
id: REQ-20261123-007
feature: 事件类型内置化与类型描述
status: 设计中
created: 2026-11-23
updated: 2026-11-23
version: 1
tags: [feat, events, governance, web, mcp]
depends_on: []
author: AI
document_type: requirement
---

# PM 报告：事件类型「技术债」内置化 + 类型描述能力

模式：M1 需求定义 + M3 缺失功能推演 + M4 界面视觉走查（组合）

证据声明：最高 **🟢 实证**（代码直读 + MCP `ki_event_type_list` 实测 `kisearch-memory` 类型配置 + 用户上传截图）。**未运行实测**交互；界面结论基于截图 + 源码，非渲染实测。

**拍板结论（2026-11-23 用户确认）**

| 编号 | 结论 |
|---|---|
| D1 | 内置补齐按 **name 认领**同名条目，保留原有 id，不重新分配 |
| D2 | 内置技术债 id 用 `et_4`；**设计阶段修正**：删除守卫改由 `builtin` 字段承载，`BUILTIN_EVENT_TYPE_IDS` 不再参与删除判定 |
| D3 | 内置技术债定 4 阶段 `待处理(hidden) → 已排期(fts-only) → 偿还中(fts-only) → 已收敛(full)`；存量 scope 做一次性中间插入 |
| D4 | 内置类型名不锁；描述可恢复默认 |
| D5 | 类型描述上限 **200 字** |
| D6 | 「认账不修」独立终态本期不做，用末位命名 + 描述兜住 |
| D7 | 界面：描述行置于类型 tab 条正下方、行尾 ✎ 就地编辑、无描述不渲染、新建弹窗描述在名称之后阶段之前 |

## 1. 执行摘要

- **技术债该内置且零语义成本**：实测其 `id` 恰为 `et_4`、`builtin: false`、阶段 `[待处理 hidden, 已收敛 full]`、`terminalAction: keep`，与三条内置同构。🟢
- **直接加常量等于没做**：内置定义只在 `_types.json` 缺失时生效，`kisearch-memory` 已落盘 → 新增内置对该 scope 不可见。必须先补「内存并集 + 按 name 认领」。🟢
- **阶段该扩展**：2 阶段区分不了「已认账未排期」与「正在还」，而这是技术债管理唯一真正关心的事。🟢
- **类型描述是最高性价比项**：`EventTypeRecord` 从数据到 UI 六处均无 `description`，而 `ki_event_type_list` 是 AI 选类型的唯一依据 → 现只能靠名字猜，`event-report` 的 reference 甚至把技术债硬塞进「需求实现」再补 `分类：技术债`。🟢
- **可行性 / 复杂度**：3 子需求中 2 条可实施、1 条有条件；整体复杂度 **高**（主导：数据与状态 —— 内置并集语义 + 存量迁移）。

## 2. 现状与范围

实测 `ki_event_type_list`（scope = `kisearch-memory`）：

| id | 类型 | builtin | 阶段链（可见性） | 终态动作 |
|---|---|---|---|---|
| `et_1` | bug 排查 | ✅ | 排查中(hidden) → 已定位(fts) → 修复中(fts) → 已关闭(full) | keep |
| `et_2` | 性能优化 | ✅ | 分析中(hidden) → 优化中(fts) → 已验证(fts) → 已完成(full) | trash |
| `et_3` | 需求实现 | ✅ | 实施中(hidden) → 联调中(fts) → 已上线(full) | keep |
| `et_4` | 技术债 | ❌ | 待处理(hidden) → 已收敛(full) | keep |

**范围**：`src/lib/events/{types,builtin-types,type-service,store}.ts`、`src/lib/governance-contract.ts`、`src/lib/governance-http.ts`、`src/lib/mcp-tools/event-type-list.ts`、`web/src/api/{governanceApi,governanceContract}.ts`、`web/src/pages/EventsPage.tsx`。

**不在范围**：AI 分析视角表（`analysis-view.ts`，`et_4` 落 `generic` 与自建类型现状一致，不加映射）；`fallbackDays` 兜底清理实现（已报事件 #76）；`updateType` 的 builtin 守卫与重名校验（已报事件 #77）；「认账不修」独立终态；`event-report` skill 文案（设计交付后另行同步）。

## 3. 需求清单

| ID | 需求 | 优先级 | Kano | 证据 |
|----|------|--------|------|------|
| N1 | 类型描述字段：数据模型 → 契约 → HTTP → MCP → 前端表单与展示 | P0 | 必备 | 🟢 |
| N2 | 内置类型补齐与认领机制（读时并集、写时落盘、按 name 认领、id 冲突改分配、删除守卫改口径） | P0 | 期望 | 🟢 |
| N3 | 技术债内置定义（4 阶段 + 内置描述文案）与存量 scope 一次性迁移 | P0 | 期望 | 🟢 |

## 4. 影响面

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 |
|---|---|---|---|---|
| 已有 scope 的类型列表 | 数据 | 破坏（新内置不生效） | `type-service.ts:31-35` | 由 N2 补齐机制解决 |
| 自建类型的 id 空间 | 数据 | 降级（`et_4` 可能被占） | `type-service.ts:58-64` | 冲突时改分配 |
| AI 分析视角 | 展示 | 无感 | `analysis-view.ts:76-80` | 不改 |
| MCP `ki_event_type_list` | 外部契约 | 降级（多一条类型 + 新字段） | `event-type-list.ts:36-51` | 只增不删 |
| 事件列表「类型」筛选 tab | 展示 | 无感 | `EventsPage.tsx:1091-1096` | 自动多一个 tab |
| 契约一致性门禁 | 外部契约 | 降级 | `governance-contract.ts:164-180` | 两端 DTO 同步 |
| 引用文档可见性判定 | 行为 | 降级（修复既有双源） | `refs-service.ts:737-747` | 改走 `listTypes` |

## 5. 负向需求

| 场景 | 期望行为 |
|---|---|
| 描述超 200 字 | 后端 `TYPE_DESCRIPTION_TOO_LONG` 400，前端输入框实时计数并禁用保存 |
| 描述传空串 | 等价于清除（不写空串进文件） |
| 并发改同一类型 | 沿用 `revision` 乐观锁，409 `REVISION_CONFLICT` |
| 补齐时 id 被占且名不同 | 不认领，改分配 `et_${max+1}`，记 warning，不阻断 |
| 迁移重复执行 | 幂等：目标阶段已存在则跳过并提示「无需迁移」 |
| 迁移中途失败 | `updateType` 原子写，失败不落盘；类型保持原样可重试 |
| 只读账号 | 描述编辑入口 `disabled` + title（沿用现有 `knowledge.write` 门禁） |

## 6. 需求缺口回扫

| 维度 | 结论 |
|---|---|
| 场景完整性 | ✅ 三场景齐（新建类型写描述 / 改内置描述 / AI 读描述选型） |
| 验收标准可达性 | ✅ 均为可判定断言（字数上限、MCP 字段、迁移前后 key 不变） |
| 需求一致性 | ✅ N2 的认领判据与 N3 的 `et_4` 定义一致 |
| 角色-需求对齐 | ✅ 维护者维护、AI 消费，无第三角色 |
| 边界/异常覆盖 | ✅ 见 §5 |
| 术语一致性 | ✅ 「内置 / 认领 / 补齐」在父文档 §4.3 定义，子文档只引用 |

## 7. 关联文档

- `design/DESIGN.md`（父）
- `design/S01_类型描述字段_DESIGN.md`
- `design/S02_内置类型补齐与认领_DESIGN.md`
- `design/S03_技术债内置定义与迁移_DESIGN.md`

## 8. 已上报事件

- #76 事件类型 `fallbackDays` 兜底清理未实现（字段只声明与透传，全仓无消费点）
- #77 `updateType` 缺 builtin 守卫与重名校验（内置类型可改名、可产生同名类型）
