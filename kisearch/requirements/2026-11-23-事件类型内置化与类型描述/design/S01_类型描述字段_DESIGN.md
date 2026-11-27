# S-01 类型描述字段

父文档：[DESIGN.md](DESIGN.md) ｜ 需求：[../requirement.md](../requirement.md)

一句话：给事件类型加一个 ≤200 字的 `description`，贯通「数据模型 → 契约 → HTTP → MCP → 前端表单与展示」。

---

## 1. 术语

| 术语 | 含义 | 引用 |
|---|---|---|
| 类型描述 | `EventTypeRecord.description`，说明「这类事件装什么」 | 父文档 §4.3 |
| 内置默认描述 | `builtin-types.ts` 中内置类型自带的描述文案 | 父文档 §4.3 |
| 就地编辑 | 点击描述行行尾 ✎，该行变输入态，保存后回显 | — |

---

## 2. 现状（AS-IS）

### 2.1 现状描述

`EventTypeRecord`（`src/lib/events/types.ts:27-42`）有 `id / scope / name / builtin / stages / terminalAction / fallbackDays / revision / createdAt / updatedAt`，**无 `description`**。同一个缺失贯穿五处镜像：

- 契约 `EventTypeDto`（`src/lib/governance-contract.ts:172-180`）
- HTTP `POST` / `PATCH`（`src/lib/governance-http.ts:792-813`）入参无该字段
- MCP `ki_event_type_list`（`src/lib/mcp-tools/event-type-list.ts:36-51`）返回体无该字段
- 前端 `EventTypeView`（`web/src/api/governanceApi.ts:142-154`）无该字段
- 新建弹窗 `NewTypeModal`（`web/src/pages/EventsPage.tsx:2187-2195`）只有「类型名称」一个文本框

类型 tab 条下方仅一行 `自定义类型` / `内置类型，不可删除`（`EventsPage.tsx:1099-1101`），无任何用途说明。

### 2.2 痛点

- **AI 选型靠猜**：`event-report/reference.md:105` 现把「技术债、重构、依赖升级」硬塞进「需求实现」+ 一句 `分类：技术债`，因为类型名不承载语义。
- **人看不懂自定义类型**：自建「技术债」「线上事故」这类名字离开创建者就没有上下文，页面也没有地方写。
- **事件描述不是替代品**：`EventRecord.description`（`types.ts:52`，上限 4000）是单条事件的描述，粒度不同。

---

## 3. 方案（TO-BE）

### 3.1 方案概述

在数据模型、DTO、HTTP、MCP、前端五处同步新增**可选**字段 `description`；后端统一按 `EVENT_TYPE_DESCRIPTION_MAX_CHARS = 200` 归一化（超长报错、空串等价清除）；前端在新建弹窗加输入框、在类型页 tab 条下方加描述行 + ✎ 就地编辑。

### 3.2 关键决策点

| 决策 | 选择 | 理由 | 备选方案 | 否决原因 | 重新评估触发条件 |
|---|---|---|---|---|---|
| 上限字数 | 200 | 类型描述是「一句话说清装什么」，tab 下方一行可容纳 2 行折行；事件级 4000 是文档粒度 | 沿用 4000 / 500 | 4000 会让人把它当文档写，且 tab 下方无法呈现；500 无实测依据，200 已足够覆盖现有 4 类 | 实测出现 >200 字仍无法表达的类型（≥3 例） |
| 空串语义 | 空串 = 清除，落盘不写该字段 | `_types.json` 保持干净；读取侧 `undefined` 与 `''` 表现一致，无需额外分支 | 保留空串 / 存 null | 保留空串会让「有描述但空」与「未描述」在 UI 上无法区分；`null` 与项目其余可选字段口径不一致 | 无 |
| 字段是否必填 | 可选 | 存量 `_types.json` 无需迁移；内置类型有默认文案，自定义类型允许留空 | 必填 | 会让所有已有自定义类型在下次 PATCH 时被强制补写，属无谓破坏 | 无 |
| 编辑入口形态 | 行尾 ✎ 就近编辑 | 与页面既有「点一下即生效」风格一致（`patchType` 无保存按钮），不新增弹窗 | 独立「编辑类型」弹窗 / 复用新建弹窗 | 弹窗成本高、且与现有行内编辑风格割裂 | 描述需要多字段一起编辑时 |
| 描述归属 | 类型级，不挂阶段 | 阶段已有 `visibility` 承载语义；描述是「整个类型装什么」 | 每阶段一句描述 | 阶段表已有 4 列，再加列会挤压；且 4 个内置类型的阶段名已自解释 | 用户提出某些阶段的语义需单独说明（≥2 例） |

---

## 4a. 接口设计

### 4a.1 数据模型

```typescript
// src/lib/events/types.ts
export const EVENT_TYPE_DESCRIPTION_MAX_CHARS = 200;

export interface EventTypeRecord {
  id: string;
  scope: string;
  name: string;
  /** 类型用途说明（≤200 字）；缺省 = 未描述 */
  description?: string;
  builtin: boolean;
  stages: EventStage[];
  terminalAction: 'keep' | 'trash';
  fallbackDays: number | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
}
```

```typescript
// src/lib/governance-contract.ts  EventTypeDto
// web/src/api/governanceApi.ts    EventTypeView
// web/src/api/governanceContract.ts  镜像
description?: string;
```

### 4a.2 归一化与校验

```typescript
// src/lib/events/type-service.ts
function normalizeTypeDescription(input: unknown): string | undefined {
  if (input === undefined) return undefined;          // 不改（PATCH）/ 无值（POST）
  const text = String(input ?? '').trim();
  if (!text) return undefined;                        // 空串 = 清除
  if (text.length > EVENT_TYPE_DESCRIPTION_MAX_CHARS) {
    throw new GovernanceError(
      'TYPE_DESCRIPTION_TOO_LONG',
      `类型描述 ${text.length} 字，超过上限 ${EVENT_TYPE_DESCRIPTION_MAX_CHARS} 字`,
    );
  }
  return text;
}
```

`CreateTypeInput` / `UpdateTypePatch` 各加 `description?: string | null`；`null` 与空串同义（清除）。

写入：`...(desc ? { description: desc } : {})` —— 清除时不写字段，不留空串。

### 4a.3 HTTP 契约

| 接口 | 变更 | 说明 |
|---|---|---|
| `GET /governance/event-types` | 返回体 `types[]` 每项含 `description?` | 视图模式下同样透传 |
| `POST /governance/event-types` | 入参新增 `description?` | 201 |
| `PATCH /governance/event-types/:id` | 入参新增 `description?` | 200，沿用 `revision` 乐观锁 |

```jsonc
// PATCH /api/governance/event-types/et_4  请求
{ "scope": "kisearch-memory", "revision": 3, "description": "长期不还、越滚越大的实现欠账" }

// 200 响应（Demo，非最终数据）
{
  "ok": true,
  "scope": "kisearch-memory",
  "type": {
    "id": "et_4",
    "name": "技术债",
    "description": "长期不还、越滚越大的实现欠账",
    "builtin": true,
    "terminalAction": "keep",
    "fallbackDays": 90,
    "revision": 4,
    "stages": [
      { "key": "st_1", "name": "待处理", "visibility": "hidden" },
      { "key": "st_2", "name": "已收敛", "visibility": "full" }
    ]
  }
}
```

### 4a.4 MCP 出口

`src/lib/mcp-tools/event-type-list.ts` 的 `types[]` 每项加：

```typescript
...(type.description ? { description: type.description } : {}),
```

`hint` 文案补一句：`类型描述说明该类事件装什么，选型时优先依据它而非类型名`。

### 4a.5 前端

**新建弹窗**（`EventsPage.tsx:2187` 之后、阶段字段之前）：

```
类型名称    [______________________]
类型描述（可选）
[________________________________]
一句话说明这类事件装什么。0/200
会显示在类型 tab 下方，也提供给 ki_event_type_list 供 AI 选型
```

- `<textarea className="gov-input" rows={2} maxLength={200}>` + 实时 `<span className="gov-hint">{len}/200</span>`
- 提交体加 `description`（仅非空时带上）

**类型卡片下方，独立一张卡**（`.gov-card` 关闭之后、`.gov-notice` 之前）。2026-11-23 用户两次纠正：放在 tab 条与阶段表之间属于「卡里面」，不是「列表下面」。

```
[bug 排查][性能优化][需求实现][技术债]      内置类型，不可删除  ＋新建类型  删除类型

技术债：长期不还、越滚越大的实现欠账；从登记、排期到偿还的过程        ✎ 编辑描述
```

- **无描述时渲染「＋ 添加描述」入口，不整行消失**（2026-11-23 真机走查修正）：原设计「无描述整行不渲染」会让「新建时没写描述」与「清空描述」之后再无入口补回 —— 实测清空后页面上没有任何描述相关按钮。现为三态：有描述 → 文本 + ✎；无描述 → 透明底 `＋ 添加描述` ghost 按钮（`gov-typedesc--empty`）；编辑态 → 输入框 + 计数 + 保存 / 取消。
- 行内 13px 次级文字，单行 `text-overflow: ellipsis`，`title` 给全文
- ✎ 点击进入编辑态：同位置换成 `<input maxLength={200}>` + 「保存 / 取消」；`Esc` = 取消，`Enter` = 保存
- **保存必须扩展 `patchType`**：现签名（`EventsPage.tsx:699-720`）为 `(mutate: (stages, type) => { stages?, terminalAction? })`，不接受描述。扩展为 `{ stages?, terminalAction?, description? }`，并在 `updateEventType` 的 PATCH body 按「字段是否存在」显式带上。
- **清空与不改必须可区分**：PATCH 语义是「省略 = 不改」，因此清空描述要显式传 `description: ''`（服务端归一为清除并删字段），不能靠省略字段。
- 只读账号：✎ `disabled` + `title="需要写权限"`（沿用 `libWriteBlocked`）

---

## 5. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 描述超 200 字 | 抛 `TYPE_DESCRIPTION_TOO_LONG`（400） | 是，文案带实际字数与上限 |
| 描述为纯空白 | 归一为清除，不报错 | 否 |
| PATCH 缺 `revision` | 沿用现有 `num(b.revision) ?? -1` → 409 `REVISION_CONFLICT` | 是 |
| 类型不存在 | `TYPE_NOT_FOUND` + `available` 列表 | 是 |
| 前端在只读账号下点 ✎ | 按钮 `disabled`，不发请求 | 否 |
| MCP 侧类型无描述 | 响应体省略该字段（不返回 `undefined`） | 否 |

---

## 6. 影响范围

| 影响对象 | 影响类型 | 影响描述 | 破坏性 |
|---|---|---|:--:|
| `src/lib/events/types.ts` | 数据变更 | 新增 `description?` 与字数常量 | 否 |
| `src/lib/events/type-service.ts` | 接口变更 | `CreateTypeInput` / `UpdateTypePatch` 加字段；新增 `normalizeTypeDescription` | 否 |
| `src/lib/governance-contract.ts` | 接口变更 | `EventTypeDto` 加字段 | 否 |
| `src/lib/governance-http.ts` | 接口变更 | POST / PATCH 透传 `description` | 否 |
| `src/lib/mcp-tools/event-type-list.ts` | 接口变更 | 返回体加 `description?`，`hint` 补说明 | 否（只增） |
| `src/lib/events/builtin-types.ts` | 数据变更 | 4 条内置补默认描述 | 否 |
| `web/src/api/governanceApi.ts` | 接口变更 | `EventTypeView` 加字段、`updateEventType` patch 加字段 | 否 |
| `web/src/api/governanceContract.ts` | 接口变更 | 契约镜像同步 | 否 |
| `web/src/pages/EventsPage.tsx` | 行为变更 | 新建弹窗加输入、类型页加描述行与就地编辑 | 否 |

### 内置默认描述文案

| 类型 | 文案 |
|---|---|
| bug 排查 | 功能不符合预期、报错、数据不对；查清根因并修复的过程。 |
| 性能优化 | 慢、占内存、CPU 高、容量或索引膨胀；有量化目标与验证的优化过程。 |
| 需求实现 | 缺功能、要改造、要新增入口；从动手到上线的实现过程。 |
| 技术债 | 长期不还、越滚越大的实现欠账（兜底未实现、声明未消费、依赖过期）；从登记、排期到偿还的过程。 |

---

## 7. 测试方案

| 类型 | 范围 | 文件 |
|---|---|---|
| 单元 | `normalizeTypeDescription`：超长报错 / 空串清除 / 前后空白裁剪 / `undefined` 不改 | `test/events-sr02.test.ts` |
| 单元 | `createType` / `updateType` 写入与清除描述、`revision` 递增 | 同上 |
| 契约 | `EventTypeDto` 三处镜像一致（`src` / `web api` / `web contract`） | `test/governance-contract.test.ts` |
| 路由 | POST / PATCH 接受并回显 `description`；超长回 400 | `test/governance-routes.test.ts` |
| MCP | `ki_event_type_list` 返回 `description`；无描述时字段缺失 | `test/mcp-event-tools.test.ts` |
| 前端 | 无描述不渲染该行；✎ 进入编辑、`Esc` 取消、保存后回显；只读账号禁用 | `web/src/pages/__tests__`（沿用现有页面测试目录） |

不在测试范围：Markdown 渲染（本期按纯文本处理，见 T-02）。

---

## 8. 待定问题

| 编号 | 问题 | 影响 | 决策时间 | 负责人 |
|---|---|---|---|---|
| T-02 | 描述是否支持 Markdown（加粗 / 行内代码） | 若支持则 tab 下方需引入渲染器，且 MCP 返回需说明语法 | 实施前 | 用户 |
