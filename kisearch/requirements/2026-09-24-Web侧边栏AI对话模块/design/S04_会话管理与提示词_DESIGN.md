---
id: REQ-20260924-001
feature: Web侧边栏AI对话模块
status: 设计中
created: 2026-09-24
updated: 2026-09-24
version: 1
tags: [feat, ux]
depends_on: [S-02]
author: AI
document_type: design
---

# S-04 会话管理与每会话提示词 — 设计

## 1. 术语

| 术语 | 定义 |
|---|---|
| 会话列表 | 面板内的会话选择区，分「最近」与「已归档」两个视图 |
| 提示词作用域 | `systemPrompt` 仅作用于本会话**后续轮次**，不回写已产生的消息 |
| 归档视图 | `archived=true` 的会话集合，支持恢复；默认视图不显示 |

## 2. 现状（AS-IS）

- 无会话管理能力（全仓 0 命中）
- 可复用的交互范式：`ScopeSelect` 的 combobox（展开转搜索、当前项高亮 + ✓、Esc/外部点击收起）—— `web/src/components/ScopeSelect.tsx:88`
- `TagSelect` 的平铺选项与键盘交互可作为列表型选择器参考 —— `web/src/components/TagSelect.tsx`
- 浮层/抽屉基础件：`.ki-overlay`/`.ki-drawer`（`web/src/styles/ki.css:548-552,781-990`）
- 前端持久化约定：`ki-web:scope`（scope）、`ki-theme`（主题）—— `web/src/lib/scopeContext.tsx:12`、`web/src/layouts/AppShell.tsx:11`

## 3. 方案（TO-BE）

### 3.1 组件与布局

```
ChatPanel
├─ 头部：模型名（只读）｜「会话」按钮｜「新建」｜「收起」
├─ ConversationList（浮层抽屉，宽 = 面板宽）
│   ├─ 视图切换：最近 / 已归档
│   ├─ 列表项：标题 · 消息数 · 相对时间 · 末条预览
│   └─ 项内操作：重命名（inline）｜归档/恢复｜删除（二次确认）
├─ SystemPromptEditor（可折叠，默认收起）
└─ Composer／MessageList（见 S-03）
```

- 列表以**浮层抽屉**呈现（覆盖消息区，非挤压），避免在 380px 宽的面板内再分栏
- 新建会话后自动聚焦输入区；首条用户消息发送成功后以「前 24 字」回填 `title`（服务端在首条消息落盘时完成，避免空标题）
- 当前会话在列表内高亮；切换会话时若正在生成 → 先 `AbortController.abort()`（见 S-03 异常表）

### 3.2 交互细节

| 操作 | 触发 | 结果 |
|---|---|---|
| 切换会话 | 点击列表项 | 加载详情；更新 `ki-web:chat-conv:{scope}` |
| 重命名 | 项内「…」→ 重命名 | inline 输入框，Enter 提交 / Esc 取消 → `PATCH` |
| 归档 | 项内「…」→ 归档 | 从当前视图移除，可在「已归档」找回 |
| 恢复 | 已归档视图内「恢复」 | 回到「最近」视图顶部（按 `updatedAt`） |
| 删除 | 项内「…」→ 删除 | **二次确认**（会话标题 + 「不可恢复」措辞）→ `DELETE` |
| 编辑提示词 | 展开提示词区修改 | 失焦或「保存」触发 `PATCH`；未保存时区标题显示圆点 |
| 提示词生效范围 | 保存后 | 仅影响后续轮次；界面明示「不影响已有消息」 |

### 3.3 接口契约（复用 S-02）

| 方法 | 路径 | 本子需求用途 |
|---|---|---|
| GET | `/api/chat/conversations?scope=&archived=` | 列表（两种视图） |
| PATCH | `/api/chat/conversations/:id` | 重命名 / 改提示词 |
| POST | `/api/chat/conversations/:id/archive` | 归档与恢复 |
| DELETE | `/api/chat/conversations/:id` | 删除 |

Demo 返回示例（`PATCH /api/chat/conversations/c-mf3k1a-9x2p`）：

```json
{
  "conv": {
    "id": "c-mf3k1a-9x2p",
    "title": "向量检索是怎么回事",
    "systemPrompt": "你是 ki 知识库助手，回答控制在 3 句内。",
    "archived": false,
    "updatedAt": "2026-09-24T16:52:31.000Z"
  }
}
```

### 3.4 与 scope 的联动

- 会话列表按当前 `scope` 取数（queryKey 含 scope），切 scope 时列表自动重取（沿用 `['chat','convs',scope,archived]` 约定，与既有 `['docList', scope]` 一致）
- 当前会话 id 按 scope 分别记忆：`ki-web:chat-conv:{scope}`，切回原 scope 可恢复上次会话
- 若当前会话不属于新 scope → 面板清空到空态（显示「新建会话」）

## 4. 关键决策点

| 决策 | 采用 | 被否决方案与理由 | 重新评估触发条件 |
|---|---|---|---|
| 列表形态 | 浮层抽屉（覆盖消息区） | ① 面板内左右分栏：380px 宽下两栏均不可用；② 顶部下拉（ScopeSelect 式）：会话条目信息（预览/时间/操作）在窄下拉里放不下 | 面板宽度 > 520px 时可评估常驻分栏 |
| 删除确认 | 原生 `confirm()` + 会话标题 | 自定义 Modal：需新增浮层与焦点管理，收益仅样式一致；原生确认在二期可替换 | 需要统一视觉规范时 |
| 提示词保存时机 | 失焦/显式保存 | 逐字符自动保存：请求风暴且用户无法回退中间态 | 无 |
| 归档与删除分离 | 归档=软删可恢复，删除=物理不可恢复 | 只保留删除：误操作不可救；只保留归档：无法真正清理 | 无 |

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 列表为空 | 空态文案 + 「新建会话」主按钮 | 是 |
| 重命名提交空字符串 | 拒绝并保留原值（不发送请求） | 是（输入框红边提示） |
| 归档/删除的对象已被他处删除（404） | 刷新列表并提示「该会话已被删除」 | 是 |
| 生成中执行归档/删除 | 先 abort 当前生成，再执行操作 | 是（操作立即生效，已生成内容按中止落盘） |
| 提示词过长（>4000 字） | 前端拦截并提示上限（后端同为 4000 校验） | 是 |
| `PATCH` 写入失败 | 回滚输入框到原值 + 错误提示 | 是 |
| 已归档会话被打开 | 允许查看与继续对话；列表仍归在「已归档」 | 是（顶部提示「已归档」） |

## 6. 影响范围

| 文件 | 改动 | 回归点 |
|---|---|---|
| `web/src/components/chat/ConversationList.tsx` | 新增 | — |
| `web/src/components/chat/SystemPromptEditor.tsx` | 新增 | — |
| `web/src/api/chatApi.ts` | 新增 4 个方法（list/create/patch/archive/delete） | 复用 `req<T>`，错误语义与既有接口一致 |
| `web/src/styles/ki.css` | 新增列表/抽屉/编辑器样式 | 复用既有 `.ki-overlay`/`.ki-drawer` 变量，不改其规则 |

## 7. 待定问题

| 问题 | 影响 | 处理时机 |
|---|---|---|
| 是否需要「提示词模板库」（T3） | 跨会话复用便利性 | 用户确认后二期 |
| 列表是否需要搜索框（会话多时） | 查找效率 | 会话数 >50 时评估 |

## 8. 不在范围内

会话分组/标签、提示词变量插值、会话导出/分享、跨 scope 会话移动、批量操作（批量归档/删除）。
