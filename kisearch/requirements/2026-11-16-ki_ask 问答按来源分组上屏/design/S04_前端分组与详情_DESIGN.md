---
id: REQ-20261116-003
document_type: design
status: 设计中
version: 1
created: 2026-11-16
updated: 2026-11-16
---

# S-04 · 前端：分组列表、只读详情与头部按钮

> 界面基线：`demo/ki-ask-grouping/index.html`（2026-11-16 用户确认）。**本节布局以实现该 demo 为准**，下列 ASCII 图即已确认稿，落地时不得偏离结构与顺序。

## 1. 术语

| 术语 | 定义 |
|---|---|
| **人工分组** | 「我的会话」——现有 `ConversationList`（最近 / 已归档） |
| **Agent 分组** | 「本地连接」+ 各 Token，由新组件 `AgentAskGroups` 渲染 |
| **受控搜索** | 搜索框提到左栏父级，两个分组共用同一 keyword |

## 2. 现状（AS-IS）

| 事实 | 位置 |
|---|---|
| 会话列表组件（含内部搜索 state） | `web/src/chat/ConversationList.tsx:114-135`、搜索框 `:267-287` |
| 对话页左栏挂载点 | `web/src/chat/ChatPanel.tsx:2363-2365`（`sideList` → `.ki-chatpage__side`） |
| 头部上下文条顺序 | `ChatPanel.tsx:1648-1725`（convbtn → model → status → spacer → 居中/铺满 → 配置） |
| 会话深链 | `/chat/:convId`，`urlConvId` 驱动（`ChatPanel.tsx:920-935`） |
| 主列表数据获取 | `web/src/api/chatApi.ts:130-151` |
| 左栏窄屏抽屉 | `ki.css:5415-5431`（`data-open` + mask） |

## 3. 界面（已确认）

### 3.1 左栏分组

```
┌───────────────────────────────┐
│ [搜索会话___________]    [＋]  │  ← 受控搜索，跨两组过滤
├───────────────────────────────┤
│ ⌄ 我的会话                  2  │  ← 人工分组（现有 ConversationList 内容）
│    K8s 部署流程梳理   3 分钟前 12 条
│    向量重建失败排查     昨天    28 条
│                               │
│ ⌄ ⌂ 本地连接  本机          3  │  ← Agent 分组：本地
│ ▌  ki 导入流程分几阶…  2 分钟前 4 条
│ ▌  daemon 启动报 worker… 25 分钟前 2 条
│ ▌  MCP 客户端调用超时？   昨天  仅剩 1 天 2 条
│                               │
│ ⌄ 🔑 codex     Token        4  │  ← Agent 分组：Token「codex」
│ ▌  ki 导入流程分几阶…  12 分钟前 4 条
│ ▌  …
│    还有 8 条…                  │  ← 单组默认 5 条
│                               │
│ › 🔑 cursor    Token        2  │  ← 折叠态（箭头右转，子项不渲染）
├───────────────────────────────┤
│ [＋ 新建会话]                  │
└───────────────────────────────┘
```

| 元素 | 规格 |
|---|---|
| 分组头 | 高 24px；`padding: 8px 12px 4px`；字号 `--ki-font-size-xs`；`:not(:first-child)` 加 `border-top: 1px solid var(--ki-color-border)` |
| 折叠箭头 | 9×9 SVG，`[aria-expanded=false]` 时 `rotate(-90deg)`，过渡 140ms |
| 类型图标 | 本地 `⌂` 用 `--ki-color-primary`；Token 钥匙用 `--ki-color-info`；人工分组无图标（占位保持对齐） |
| 类型徽标 | `本机` / `Token`，10px，圆角 4px，背景 `--ki-color-surface-muted` |
| 会话行 | `padding-left: 41px`（与分组名对齐）；agent 行左侧 2px 类型色竖条（`left:31px`） |
| 临期行 | `retainDaysLeft <= 1` 时条数左侧显示「仅剩 1 天」；≤0 不出现（S-02 已过滤） |
| 单组上限 | 5 条 + 「还有 N 条…」（点击等于把该组 `limit` 提到 50） |

### 3.2 详情（只读）

```
┌──────────────────────────────────────────────────────────────┐
│ ⌐ codex  通过 MCP 调用 · scope kisearch-memory      只读     │
├──────────────────────────────────────────────────────────────┤
│                                        代问 · codex   12:31  │
│                        ╭────────────────────────────────╮    │
│                        │ ▌ ⓘ 提问前提 · 62 字            │    │
│                        │ ▌ 项目 kisearch 0.1.0，正在把…  │    │
│                        │                                │    │
│                        │ ki 导入流程分几个阶段？          │    │
│                        ╰────────────────────────────────╯    │
│                                                              │
│ k  kisearch   12:31                                          │
│ 分三个阶段：① 预检 ② 解析与切分 ③ 建索引                     │
│ 来源 2  ①构建知识库 行12-40  ②数据流 行8-22                  │
├──────────────────────────────────────────────────────────────┤
│ 🔒 该问答由 codex 通过 MCP 调用产生，仅供回看                 │
│    如需继续追问，可基于这段问答新建一个会话                    │
│                              [以该问答新建会话]（本期不渲染）  │
└──────────────────────────────────────────────────────────────┘
```

| 元素 | 规格 |
|---|---|
| 来源条 | 高 28px，chip 复用 `.ki-chatpage` 的 pill 风格；本地绿 / Token 蓝；右侧「只读」灰 pill |
| 背景块 | `.ki-ask-bg`：左 2px 主色竖线（45% 透明度）、无底色、字号 `--ki-font-size-xs`、`max-height: 200px` 可滚动、`white-space: normal`（**必须**，父级 `.ki-chat-msg__body` 是 `pre-wrap`） |
| 消息 | 复用 `.ki-chat-msg` / `.ki-chat-msg__body` / `.ki-markdown` / `.ki-chat-srcs` 既有类 |
| 底栏 | 替代 `.ki-chat-composer`：`border:1px solid border-strong` + `background: bg-muted` + 圆角 8px |

### 3.3 头部（R8：按钮右移）

```
deepseek-flash  ● 工具检索就绪            [居中│铺满]   ≪   ⚙ 配置
```

| 视口 | 行为 |
|---|---|
| ≥1024 | 顺序如上；`≪` 折叠左栏，图标在 `≪ / »` 间翻转 |
| <1024 | 「居中/铺满」由 CSS 隐藏（`ki.css:5976-5978`）；`≪` 变汉堡，`aria-label` = 「打开会话列表」，点击拉出抽屉 + mask |

## 4. 方案（TO-BE）

### 4.1 组件拆分

```
web/src/chat/
├── ChatPanel.tsx          [修改] 状态/路由/视图切换/头部顺序
├── ConversationList.tsx   [修改] 搜索改「可选受控」（向后兼容）
├── AgentAskGroups.tsx     [新增] Agent 分组列表（分组头 + 行 + 折叠 + 更多）
└── AgentAskDetail.tsx     [新增] 只读详情（来源条 + 消息 + 底栏）
```

**为什么不把 agent 组塞进 `ConversationList`**：该组件已有 `recent/archived` 二分组语义、`onRename/onArchive/onDelete` 回调与本地实现；混入只读分组会让「哪些行有写操作」变成运行期判断，且它的 200 行私有逻辑（键盘遍历、重命名态、删除确认）对 agent 行全是死代码。

### 4.2 搜索受控（向后兼容）

```ts
// ConversationList.tsx 新增可选 props
interface ConversationListProps {
  /* …既有… */
  /** 受控关键词；缺省时组件内部维持自己的 state（dock 浮层路径零改动） */
  keyword?: string;
  onKeywordChange?: (kw: string) => void;
}

// 实现：内部仍是 useState，但「传了受控值」时以 props 为准
const [innerKw, setInnerKw] = useState('');
const kwControlled = props.keyword !== undefined;
const keyword = kwControlled ? props.keyword! : innerKw;
const setKeyword = (v: string) => (kwControlled ? props.onKeywordChange?.(v) : setInnerKw(v));
```

左栏父级（ChatPanel）持有一个 `sideKeyword`，同时传给 `ConversationList` 与 `AgentAskGroups` ⇒ 搜索跨组生效，与 demo 一致。

### 4.3 路由与状态

| 路由 | 视图 |
|---|---|
| `/chat` | 空态 / 未选中 |
| `/chat/:convId`（`c-*`） | 人工会话（现状） |
| `/chat/ask/:askId`（`ka-*`） | **新增**：Agent 问答只读详情 |

```ts
// ChatPanel 新增状态
const [agentAsk, setAgentAsk] = useState<AgentAskDetail | null>(null);
const urlAskId = useMatch('/chat/ask/:id')?.params.id;   // 与现有 urlConvId 并列
```

> 不复用 `/chat/:convId`：该路径会触发 `GET /conversations/:id`，`ka-*` 必然 404，会在控制台留下噪声并误触发"会话已被删除"的兜底逻辑。

### 4.4 数据获取

| 时机 | 动作 |
|---|---|
| 打开对话页 / 切 scope | `listAgentAsks({ scope })`，与 `listConversations` **并行**（互不阻塞） |
| 点击「还有 N 条…」 | `listAgentAsks({ scope, group: 'token:xx', limit: 50 })` 局部替换该组 |
| 点击某条 | `getAgentAsk(id, scope)` → 渲染详情并 `navigate('/chat/ask/:id')` |
| 切 scope | 清空 `agentAsk` 与分组数据，重新拉取 |

失败态：分组区显示「Agent 问答加载失败 · 重试」（不阻塞人工会话列表）。

### 4.5 折叠与「更多」的状态

- 折叠态存 `sessionStorage`（键 `ki.chat.agentGroups.collapsed`），**不落用户配置**（与 `chatLayoutPrefs` 区分：那是长期偏好，这是临时浏览态）
- 「还有 N 条」展开后不回写；刷新回到 5 条（避免列表无限增长）

### 4.5.1 消息渲染的复用方式（复用 MarkdownPreview，不抽 Message 组件）

`ChatPanel.tsx:2499` 的消息渲染是文件内私有函数，且承载大量**交互态**（编辑/重发/复制/反馈/推理折叠/工具行）。详情页是只读回放，这些交互一个都用不上。

| 方案 | 选择 | 说明 |
|---|---|---|
| **复用 `MarkdownPreview`**（`web/src/components/MarkdownPreview.tsx:1123`） | ✅ **采用** | 接口仅 `{ text, assetBase?, onLocalLink?, renderedHtml?, deferMermaid? }`，markdown / 代码块 / mermaid / echarts 全部覆盖；详情页自写 4 行气泡结构（复用 `.ki-chat-msg` 类名）+ 来源卡 |
| 抽出 `MessageView` 组件 | ❌ 否决 | 需要把编辑/重发/反馈/推理折叠等 10+ 个交互 props 全部外提，详情页只能传一堆 `undefined`；重构面大且回归风险高，收益仅省 4 个 div |
| 详情页自己实现 markdown 渲染 | ❌ 否决 | 两份渲染器必然漂移（code-group / 图表增强每次都要改两处） |
| 复用 `AnswerFlow` | ❌ 否决 | 依赖 `progress`（检索步骤），`ka-*` 不存该字段 |

> 结论：**B0 不含任何前置重构**，详情页直接 import `MarkdownPreview`。

### 4.6 代码改动清单

```
web/src/chat/AgentAskGroups.tsx      [新增] 约 180 行
web/src/chat/AgentAskDetail.tsx      [新增] 约 160 行（消息正文 import `MarkdownPreview`）
web/src/chat/ConversationList.tsx    [修改] 受控搜索（+12 行，不改既有行为）
web/src/chat/ChatPanel.tsx           [修改] agentAsk 状态 / ask 路由 / 视图分支 / 头部顺序（约 +80 行）
web/src/api/chatApi.ts               [修改] listAgentAsks / getAgentAsk
web/src/api/chatContract.ts          [修改] 类型（与后端响应逐字段对齐）
web/src/styles/ki.css                [修改] 追加分组与只读详情段（约 150 行，纯追加不改既有规则）
web/test/agent-ask-groups.test.mjs   [新增] 分组渲染/折叠/更多/空态（6 例）
web/test/chat-header-order.test.mjs  [新增] 源码守卫：`≪` 必须位于「居中/铺满」之后、配置之前（1 例）
```

## 5. 异常处理

| 场景 | 呈现 |
|---|---|
| 分组请求失败 | 分组区独立错误条 + 重试按钮；人工会话可用 |
| 某个组为空 | 不渲染该组（不显示「本地连接 0」） |
| 全部组为空 | 不渲染 Agent 区，左栏只有「我的会话」 |
| 详情 404（已被 GC / 越权） | 详情区显示「该问答已不存在」+「返回列表」；列表刷新一次 |
| 详情 410（超保留期） | 「该问答已超过 7 天保留期」；列表刷新一次（该条已应被过滤） |
| 详情 422（损坏） | 「该问答文件已损坏」 |
| 详情加载中 | 骨架（复用 `.ki-chat-convpop__skel`） |
| 窄屏打开详情 | 左栏抽屉自动收起（点击行后 `data-open=false`） |

## 6. 关键决策点

| 决策 | 选择 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 搜索框归属 | 提到左栏父级，`ConversationList` 支持可选受控 | 两个独立搜索框 | 用户要在两个区里一起搜；两个框会让「搜不到」归因不清 | 两侧数据源合并为一个接口时 |
| agent 分组组件 | 新建独立组件 | 扩展 `ConversationList` | 该组件的重命名/归档/删除/键盘遍历对 agent 行全是死代码，运行期分支会让只读语义变模糊 | 两类会话需要统一操作（如统一删除）时 |
| 详情路由 | `/chat/ask/:id` | 复用 `/chat/:convId` | 会触发 `/conversations/:id` 的 404 噪声与"会话已删除"兜底 | 后端把两类会话合并成一个详情接口 |
| 折叠态存储 | `sessionStorage` | `localStorage` / 用户配置 | 折叠是浏览态，不该变成长期偏好；`chatLayoutPrefs` 已有"改窗口不写偏好"的同类约定 | 用户抱怨每次刷新都要重新折叠 |
| 单组上限 | 5 条 | 全量渲染 | 存在 200 条的实测风险（N4）；左栏 260px 滚动成本高 | 后端提供虚拟列表友好的分页 |

## 7. 待定问题

| # | 问题 | 影响 | 临时处理 |
|---|---|---|---|
| T-1 | 「我的会话」是否也加「还有 N 条」 | 一致性 | 本期不动（沿用现有分页），避免同时改两套分页 |
| T-2 | 详情页是否需要「复制答案」按钮 | 体验 | 复用现有消息级操作条（若 `AgentAskDetail` 使用同一 `Message` 组件则自动获得） |
