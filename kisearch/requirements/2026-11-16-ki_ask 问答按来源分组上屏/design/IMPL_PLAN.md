---
id: REQ-20261116-003
document_type: design
status: 设计中
version: 1
created: 2026-11-16
updated: 2026-11-16
---

# 实施计划 · ki_ask 问答按来源分组上屏

> 依据：`design/DESIGN.md` + S01~S04 + `design/design-review.md`。
> 排期原则（用户 2026-11-16 指定）：**第一步先把 demo 落到当前页面**（前端视觉先行，数据用 mock），「我的会话」保持现有真实逻辑，其余按 demo。

## 0. 执行状态（2026-11-16 收口）

| 批次 | 状态 | 验收 |
|---|---|---|
| B0 demo 落地 | ✅ | web test 1229/1229 · 真机分组/折叠/搜索/详情/按钮位置全通过 |
| B1 S-01 数据层 | ✅ | 真实 `ki_ask` 调用落盘 `version:2 / origin / background / sources`；新增 12 例测试 |
| B2 S-02 列表接口 | ✅ | `GET /api/chat/agent-asks` 实测返回分组与摘要；新增 8 例（含归属/分页/超期过滤） |
| B3 S-03 详情接口 | ✅ | 详情返回 `background` + `sources`；404 / 410 / 422 语义实测 |
| B4 接真数据 | ✅ | mock 已删；真机走查：1 组「本地连接」2 条真实问答，详情正文与 5 条来源正常 |

**收口验证**：前端 `npm test` **1233/1233**、`npm run build` ✓；后端 `tsc -p tsconfig.src.json` ✓、`npm run test:chat` 37 文件 35 通过（2 个既有失败与本需求无关）。

**本次夹带的非本需求改动（单独说明，便于拆分提交）**：
| 文件 | 改动 | 性质 |
|---|---|---|
| `src/lib/chat/ask/ask-store.ts` | 两处 `writeJson(…, file)` → `{ ...file }` | 修**既有的** tsc 错误（`Record<string, unknown>` 与 interface 不兼容），行为等价；与本需求无关，但同文件顺手改，回滚时需注意别连带回退 |

**已知边界（非缺陷）**：
1. 页面会话 scope 必须与被问的知识库一致才有 agent 分组（`default` 下看不到 `kisearch-memory` 的问答）—— 这是按 scope 隔离的既有语义；
2. 本机回环部署下 `origin` 恒为 `local`（D6），Token 分组需 daemon 对外监听。

## 1. 批次总览

| 批次 | 内容 | 触碰层 | 可独立发布 | 完成后页面表现 |
|---|---|---|---|---|
| **B0** | **demo 落地（视觉骨架）** | 纯前端 | ✅ | 左栏与 demo 一致；「我的会话」真实；agent 组为 mock |
| B1 | S-01 数据层 | 后端 | ✅（无外部可见变化） | 落盘含 `origin/sources/background`；保留期 7 天 |
| B2 | S-02 列表接口 | 后端 | ✅（前端未接） | 接口可用，页面不变 |
| B3 | S-03 详情接口 | 后端 | ✅（前端未接） | 接口可用，页面不变 |
| B4 | S-04b 接真数据 | 前后端 | ✅ | mock 下线，agent 组与详情走真实数据 |

```
B0 ──► B1 ──► B2 ──► B3 ──► B4
       （B2/B3 可并行）
```

> B0 先做的好处：视觉与交互提前暴露问题（分组层级、双层标题、窄屏抽屉），避免后端做完才发现布局要改。
> B0 的风险是**假数据**，用集中 mock 文件 + 一个开关常量控制，B4 整体删除。

---

## 2. B0 · demo 落地（第一步，本次执行范围）

> **状态：已完成（2026-11-16）**。交付 6 步全部落地：mock / 分组组件 / 左栏接入 / 头部按钮右移 / 只读详情 / 样式与 13 例新测试。
> 验收：tsc 0 · web test **1229/1229** · build ✓ · 真机走查（1440 与窄屏）通过。
> mock 已在 B4 删除，数据改由 `GET /api/chat/agent-asks` 提供。

### 2.0 范围与边界

| 项 | 做法 |
|---|---|
| **「我的会话」** | **完全沿用现有真实逻辑**：数据来自 `GET /api/chat/conversations`、`recent/archived` 分组、重命名 / 归档 / 删除、键盘遍历、删除二次确认，**全部不改** |
| 「我的会话」外层分组头 | 新增（demo 形态），包住现有 `ConversationList`；内部「最近 / 已归档」小标题保留 |
| Agent 分组（本地连接 / 各 Token） | 按 demo 渲染，数据来自 **mock 文件** |
| Agent 只读详情 | 按 demo 渲染，消息来自 **mock 文件**；不接后端 |
| 头部按钮右移 | 真实改动（`≪` 移到「居中/铺满」右侧） |
| 搜索 | 受控提到左栏父级，跨「我的会话 + agent 组」过滤；`ConversationList` 的搜索改为可选受控（缺省保持内部 state，dock 浮窗零改动） |
| 后端 | **一行不改** |

### 2.1 分组层级：**不引入「我的会话」外层分组头**（用户 2026-11-16 拍板方案②）

现有 `ConversationList` 的「最近 / 已归档」就是**顶层分组**，agent 组并列追加在其后：

```
最近                          2        ← 现有，真实逻辑
  K8s 部署流程梳理  3 分钟前  12 条
  向量重建失败排查   昨天     28 条
已归档                        1        ← 现有，仅有归档数据时出现
  老会话            上周
───────────────（现有分组自带的分隔线）
⌄ ⌂ 本地连接  本机            3        ← 新增
  ▌ ki 导入流程分几个阶段？  2 分钟前  4 条
⌄ 🔑 codex     Token          4        ← 新增
  ▌ …
 还有 8 条…
› 🔑 cursor    Token          2
```

| 影响 | 说明 |
|---|---|
| 「我的会话」四个字不出现 | 顶层就是「最近 / 已归档」，与改造前完全一致 |
| `ConversationList` 零改动（除搜索受控） | 最贴近"保留当前真实逻辑" |
| agent 分组与「最近」视觉同级 | 靠图标（`⌂` / 钥匙）与类型徽标区分来源，不靠字号层级 |

### 2.2 步骤（每步独立提交、独立可回滚）

| # | 步骤 | 文件 | 验收 |
|---|---|---|---|
| **0.1** | mock 数据集中化 | `web/src/chat/agentAskMock.ts`【新增】 | 文件顶部 `export const USE_MOCK = true` + 3 组示例（本地 3 / codex 4 / cursor 2）+ 一份详情（2 轮、含 background 与 sources） |
| **0.2** | Agent 分组组件 | `web/src/chat/AgentAskGroups.tsx`【新增】 | 渲染 3 个分组；折叠/展开；「还有 N 条…」；`retainDaysLeft<=1` 显示「仅剩 1 天」；空态不渲染该区 |
| **0.3** | 左栏结构改造 | `ChatPanel.tsx`【改】 | 左栏 = 搜索（受控）+ `ConversationList`（**原样**）+ `AgentAskGroups`；**我的会话区所有既有交互逐项复测通过** |
| **0.4** | 头部按钮右移 | `ChatPanel.tsx`【改】、`ki.css`【改】 | 1440：`模型 · 状态 · 居中/铺满 · ≪ · 配置`；768：`居中/铺满` 隐藏、`≪` 变汉堡、点击拉抽屉 + mask |
| **0.5** | 只读详情页 | `web/src/chat/AgentAskDetail.tsx`【新增】、`ChatPanel.tsx`【改】、`ki.css`【改】 | 点击 agent 行 → 详情（来源条 + 背景块 + 消息 + 只读底栏）；无任何写操作入口；路由 `/chat/ask/:id` |
| **0.6** | 样式补齐与回归 | `ki.css`【改】、`web/test/*.mjs`【新增】 | 与 demo 逐屏对照；新增 3 个测试（分组渲染 / 头部顺序源码守卫 / 背景块不被 `pre-wrap` 撑高） |

### 2.3 关键实现约束（来自评审与踩坑）

| # | 约束 | 原因 |
|---|---|---|
| C0 | **详情页消息正文 import `MarkdownPreview`**（`components/MarkdownPreview.tsx`），**不抽 `Message` 组件** | 后者要外提 10+ 个交互 props，详情页全用不上 |
| C1 | **`.ki-ask-grp` 禁用 `<p>`，必须是 `<button>`** | 折叠需要键盘可达（Enter/Space）与 `aria-expanded` |
| C2 | **agent 行缩进 41px**（`12 padding + 9 caret + 4 + 12 icon + 4`） | 与分组名左对齐；`ki.css:7245` 的 `padding: 9px 10px 9px 12px` 优先级更高，需同级覆盖 |
| C3 | **背景块 `white-space: normal` + 标签与段落写成无缩进单行** | 父级 `.ki-chat-msg__body` 是 `pre-wrap`，否则 HTML 缩进被渲染成空行（demo 第一版就是被撑到 200px） |
| C4 | **`≪` 的显示覆盖要同级**：`.ki-chat-ctx .ki-chatpage__convbtn` | `ki.css:5403` 的 `.ki-chatpage__convbtn { display:none }` 优先级更高 |
| C5 | **detail 路由用 `/chat/ask/:id`**，不复用 `/chat/:convId` | 复用会触发 `GET /conversations/:id` 的 404 噪声与"会话已删除"兜底 |
| C6 | **mock 只允许出现在 `agentAskMock.ts`** | B4 删文件即下线；禁散落到组件内 |
| C7 | **搜索受控必须向后兼容** | `ConversationList` 在 dock 浮窗路径仍用内部 state，不能改签名破坏调用方 |

### 2.4 B0 验收清单（逐条现场确认）

```
左栏
☐ 「最近 / 已归档」分组与改造前完全一致（无新增外层分组头）
☐ 会话行 hover / 选中 / 键盘上下切换 与改造前一致
☐ 重命名、归档、恢复、删除（含二次确认）全部可用
☐ 「已归档」子分组在存在归档数据时正确出现
☐ Agent 三个分组顺序：本地连接 → codex → cursor（按组内最新时间）
☐ 分组折叠箭头方向正确，折叠态不渲染子项
☐ agent 行左侧类型色竖条（本地绿 / Token 蓝）
☐ 「还有 N 条…」可点，点击后该组展开到 50 条
☐ 搜索框输入关键词：人工会话与 agent 组同时过滤
☐ 没有任何 agent 行出现改名/归档/删除按钮

详情
☐ 顶部来源 chip：本地绿 / Token 蓝，右侧「只读」
☐ 提问前提块：左竖线 + 「提问前提 · N 字」+ 全文；第二轮无背景则不渲染
☐ 答案 markdown 渲染、来源 chip 可点
☐ 底部只读条替代输入框，无 textarea
☐ 无「以该问答新建会话」按钮（R11 本期不做）

头部 / 响应式
☐ 1440：按钮顺序 模型 · 状态 · 居中/铺满 · ≪ · 配置
☐ 点击 ≪ 折叠左栏，图标翻转为 »，再点恢复
☐ 768：居中/铺满 隐藏；≪ 为汉堡；点击拉出抽屉；点遮罩收起

回归
☐ npm test 全绿（含新增 3 例）
☐ npm run build 通过
☐ tsc --noEmit 0 error
☐ dock 浮窗（非 /chat 页）的会话列表弹层行为不变
```

### 2.5 回滚

B0 每步独立提交，回滚粒度为单步；`0.3`（左栏结构）是结构变更点，若验收不通过，`git revert` 该提交即回到现状列表（`AgentAskGroups` 不挂载即可，不删文件）。

---

## 3. B1 · S-01 数据层

| 步骤 | 文件 | 验收 |
|---|---|---|
| 1.1 类型扩展 | `ask-store.ts`（`AskOrigin` / 字段）、`ask-contract.ts`（保留期常量） | 单测：写入含新字段；`version:2` |
| 1.2 `origin` 构造下传 | `mcp-tools/ask.ts`、`ask-contract.ts`（`AskInput.origin`） | 落盘 `origin.kind/label` 正确；`local` 无 token 字段 |
| 1.3 保留期解耦 | `ask-store.ts`（`isAskSessionPastRetention`）、`ask-gc.ts`、`config-schema.ts` | 11 分钟后：续接报 `ASK_CONTEXT_EXPIRED`，文件**仍在**；7 天后被删 |
| 1.4 回放排除守测 | `test/ask-replay-excludes-background.test.ts` | 带背景的会话回放后，上游 messages 不含背景且字节等于无背景版 |
| 1.5 旧文件归一 + 测试迁移 | `ask-store.ts`、既有 ask 测试 | `version:1` 文件可读、分组推导正确；既有用例按 S-01 §3.5 表迁移后全绿 |

## 4. B2 · S-02 列表接口

| 步骤 | 文件 | 验收 |
|---|---|---|
| 2.1 聚合模块 | `src/lib/chat/agent-asks.ts`【新增】 | 分桶/排序/分页/缓存单测 10 例 |
| 2.2 路由注册 | `chat-routes.ts` | `GET /api/chat/agent-asks` 返回契约结构 |
| 2.3 归属与过滤 | `agent-asks.ts` | 非 admin 只见自己 Token 组；local 仅 admin；超保留期不出现 |
| 2.4 性能验证 | — | 构造 500 个 `ka-*`：首屏 ≤200ms，二次请求命中缓存 |

## 5. B3 · S-03 详情接口

| 步骤 | 文件 | 验收 |
|---|---|---|
| 3.1 详情聚合 | `agent-asks.ts` | 返回含 `background` / `sources` 的逐轮消息 |
| 3.2 权限与异常 | 同上 | 越权 404 / 过保留期 410 / 损坏 422，三码与 S-03 §4 一致 |
| 3.3 只读边界 | 同上 | 不存在任何写方法；`canViewGroup` 与列表共用同一函数（源码守卫测试） |

## 6. B4 · 接真数据

| 步骤 | 文件 | 验收 |
|---|---|---|
| 4.1 前端 API | `chatApi.ts`、`chatContract.ts` | 类型与后端响应逐字段对齐 |
| 4.2 替换 mock | `AgentAskGroups.tsx`、`AgentAskDetail.tsx`、删 `agentAskMock.ts` | 页面数据来自真实接口；`USE_MOCK` 常量删除 |
| 4.3 加载/错误/空态 | 同上 | 分组失败独立错误条 + 重试；详情 404/410/422 分别有文案 |
| 4.4 端到端 | — | `ki_ask` 真调一次 → 页面 10s 内出现在对应分组 → 点开可见背景与来源 |

## 7. 全局风险

| 风险 | 批次 | 缓解 |
|---|---|---|
| 「最近 / 已归档」被结构改造搞坏（最核心的既有功能） | B0.3 | `ConversationList` 内部零改动，只在其后追加 `AgentAskGroups`；验收清单逐项复测 |
| mock 数据误上线 | B0 | 集中在单文件 + `USE_MOCK` 常量；B4 删文件 |
| GC 判据变更打破既有测试 | B1.5 | 按 S-01 §3.5 迁移表逐条改 |
| 背景泄漏进模型回放 | B1.4 | 单测守 + 禁止对象展开写法 |
| 主列表被 `ka-*` 拖慢 | B2 | 独立接口（S-02 §3.4） |

## 8. 提交与验收规范

- 每步一个提交，提交信息带批次号（`feat(chat): B0.3 agent 问答分组组件`）
- B0 结束后需一次完整走查（§2.4 清单），**不通过不进 B1**
- B1~B3 纯后端，前端行为不变；每批结束跑 `npm test` + `npm run build`
- B4 结束后删除 mock 文件，跑一次真实链路端到端
