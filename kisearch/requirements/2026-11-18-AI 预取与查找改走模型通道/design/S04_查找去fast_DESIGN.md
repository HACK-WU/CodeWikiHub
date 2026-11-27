# S-04 AI 查找取消 fast 通道

## 1. 术语

| 术语 | 含义 |
|---|---|
| fast 通道 | `refs-service.ts::searchRefCandidates` 的确定性五步，不调模型 |
| deep 通道 | `find-runner` 的模型工具循环，本需求后成为**唯一**通道 |
| `origin` | 候选来源标记（`'fast' | 'deep'`），落进 refs 记录 |

## 2. 现状（AS-IS）

| 现状 | 位置 |
|---|---|
| 路由按 `mode` 分流，**默认 fast** | `src/lib/governance-http.ts:1043`（`const mode = str(b.mode) ?? 'fast'`）、`:1044`（校验）、`:1057`（deep 分支）、`:1098`（fast 分支调 `searchRefCandidates`） |
| fast 五步实现 | `src/lib/events/refs-service.ts:245`、`:254-331` |
| 候选来源枚举 | `refs-service.ts:81`（`origin: 'fast' | 'deep'`）、`:497`（写 `'fast'`） |
| 前端默认 fast + 模式切换 | `web/src/components/governance/FindRefPanel.tsx:81`、`:184-197` |
| 能力位恒 true | `src/lib/chat/chat-routes.ts:687` |
| 前端两处消费能力位 | `PromptConfigLayer.tsx:1779`（横幅）、`:1855`（徽标文案） |
| 文档：整节声称深度未生效 | `docs/ai-find.md:98-102`；`:77` 引导用户「往描述里补线索」（fast 不读描述） |

## 3. 方案（TO-BE）

```
POST /api/governance/events/:id/refs/search
 ├─ 删 mode 参数（传了也忽略；不再有 fast 分支）
 ├─ 恒走 find-runner（模型循环）
 └─ 无模型 / 外发未确认 / 不支持 tools
      → 明确错误码 + 出路（与 ki_recall 同一套语义）
```

**删改清单**：

| # | 删改 | 位置 |
|---|---|---|
| 1 | 删 `mode` 解析与校验 | `governance-http.ts:1043-1044` |
| 2 | 删 fast 分支（`searchRefCandidates` 调用） | `governance-http.ts:1098` |
| 3 | `searchRefCandidates` 保留实现但**无调用方** → 标 `@deprecated` 并注明"S-01 的种子召回已接管同职责" | `refs-service.ts:245` |
| 4 | 前端删切换控件，面板恒为「AI 查找」 | `FindRefPanel.tsx:184-197` |
| 5 | 删 `capabilities.findDeep` 与两处前端分支 | `chat-routes.ts:687`、`PromptConfigLayer.tsx:1779/1855` |
| 6 | `docs/ai-find.md` 重写为单通道 | 全文 |
| 7 | `origin` 枚举**保留** `'fast'`，只停止产生新值 | `refs-service.ts:81` |

## 4. 接口设计

### 4.1 请求

```ts
// 变更前
{ mode?: 'fast' | 'deep', cursor?, limit? }
// 变更后
{ cursor?, limit? }        // mode 传了忽略（不报错，避免旧前端 400）
```

### 4.2 响应（不变，除 `origin` 恒为 `'deep'`）

```json
{
  "ok": true,
  "candidates": [
    { "scope": "kisearch-memory", "group": "错误库", "name": "删除文档后向量残留…",
      "why": "…", "score": 0.87, "origin": "deep" }
  ],
  "steps": [ … ],
  "durationMs": 18400
}
```

### 4.3 新增错误码（复用 S-02 的三态语义）

| 码 | 触发 | 文案要点 |
|---|---|---|
| `FIND_MODEL_UNAVAILABLE` | 未配置模型 | 「本功能需要模型：请到 AI 设置配置；或改用 `ki_search` 自行检索」 |
| `FIND_DISCLOSURE_REQUIRED` | 外发未确认 | 同上 + 去设置页确认外发 |
| `FIND_TOOLS_UNSUPPORTED` | 模型无 tools 能力 | 同上 + 换支持 function calling 的模型 |

> 与 `ki_recall` 的区别只在工具名与入口，语义完全一致 —— 两者共用同一段判定函数（S-02 §3 ③）。

## 5. 迁移策略

| 对象 | 处理 |
|---|---|
| 历史 refs 记录里的 `origin:'fast'` | 枚举保留、渲染兼容；不做数据迁移（`ALTER` 类操作没有收益） |
| 旧前端（缓存里的旧 JS）仍传 `mode:'fast'` | 后端**忽略不报错**，避免发版瞬间 400 |
| `searchRefCandidates` | 保留代码（种子召回可能复用其归一化逻辑），标 `@deprecated`；下个版本确认无引用后删除 |
| `docs/ai-find.md` | 整段重写，不留"快速/深度"字样 |

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 无模型 | `FIND_MODEL_UNAVAILABLE` + `ki_search` 引导 | 是 |
| 45s 超时 | 返回 `partial` + 已得候选（沿用现有） | 是 |
| 旧前端传 `mode` | 忽略该字段，正常执行 | 否 |
| 模型输出非 JSON | 沿用 find 现有解析容错 | 是（`degraded` 或空候选 + 说明） |

## 7. 影响范围

| 文件 | 改动 | 回归 |
|---|---|---|
| `src/lib/governance-http.ts` | 删 mode 分流与 fast 分支 | `test/governance-refs-route.test.ts`、`governance-routes.test.ts` |
| `src/lib/events/refs-service.ts` | `searchRefCandidates` 标废弃；`origin` 只写 `'deep'` | `test/refs-sr05*.test.ts`（**需改**：这些测试直接测 fast 五步） |
| `src/lib/chat/chat-routes.ts` | 删 `capabilities.findDeep` | `test/chat/prompt-config-routes.test.ts` |
| `web/src/components/governance/FindRefPanel.tsx` | 删切换 | `web/test/governance-*.mjs` |
| `web/src/chat/PromptConfigLayer.tsx` | 删两处 `findDeep` 分支 | 同上 |
| `web/src/api/chatContract.ts` | 删 `capabilities.findDeep` | — |
| `docs/ai-find.md` | 重写 | — |
| `test/refs-sr05.test.ts` / `refs-sr05-search.test.ts` | **按 §7.1 迁移，不是整份删除** | 必须与代码同批改，否则主干预红 |

### 7.1 测试迁移清单（C4 质疑的定稿）

**实施期实测修正（2026-11-18）**：两个文件 28 例（11 + 17）**全部保留，无需迁移**。理由：它们测的是 `refs` CRUD（加入/移除/悬空/上限）、`searchDocsForAdd`（手动添加搜索）、`createSearchAdapter`（错误翻译，find 深度通道也用它）、以及 `searchRefCandidates` —— 而最后这个函数按 D-04-3 **保留**（标 `@deprecated`，只是不再有路由入口），所以它的 8 例仍然有效。

| 用例类别 | 去留 | 依据 |
|---|---|---|
| 引用 CRUD / 悬空引用 / 50 条上限 | 保留 | 未改动 |
| `searchDocsForAdd` 事件级排除 | 保留 | 未改动（添加参考文档仍用它） |
| `createSearchAdapter` 错误翻译与窄化 | 保留 | find 深度通道仍用 |
| `searchRefCandidates` 聚合/归一化/0 候选原因 | **保留** | D-04-3：函数保留标废弃，只是路由不再调 |
| 候选 `origin` 标记 | 保留 | 断言的是 `refs-service` 写值，S-04 后仍写 `'deep'`；**新增**一条断言：路由层不再产生 `'fast'` |

**执行要求**：S-04 落地后复跑这两个文件，确认仍全绿；仅在"路由层不再产生 `'fast'`"处补一条断言。

**事件 #38 收敛（需求 R10）**：该事件原有三条 —— ①文档声称深度未生效（`docs/ai-find.md:98-102`）②快速通道不读事件描述（`refs-service.ts:324`）③中文长句切词失效（`refs-service.ts:173-180`）。本需求落地后 **②③ 随 fast 通道删除而自动消失**，只剩 ① 由 §3 表格第 6 行「文档重写」闭环。落地时把 #38 更新为"随 REQ-20261118-004 关闭"，不另开新事件。

## 8. 关键决策点

| # | 决策 | 被否决 | 理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D-04-1 | `mode` 参数忽略而非报错 | 传了就 400 | 发版瞬间旧前端会全部失败；多一个宽容分支成本为零 | 无 |
| D-04-2 | `origin:'fast'` 枚举保留 | 直接删枚举值 | 历史数据会渲染不出来（TypeScript 还能编过，坏在运行时） | 确认库内无 `origin:'fast'` 记录 |
| D-04-3 | `searchRefCandidates` 标废弃而非删除 | 立即删除 | 其归一化逻辑可能被种子召回复用；先观察一个版本 | 下个版本确认无引用后删除 |
| D-04-4 | `refs-sr05*` **按类迁移**（范围解析/关键词/归一化搬走，tier/alsoIn/端到端删掉） | 整份删除 / 整份 skip | 整份删会丢掉 28 例里仍有效的回归覆盖；整份 skip 是永久红灯（负资产） | 迁移后新文件覆盖率低于原 60% |
| D-04-5 | 不在本需求统一两条通道的内核 | 抽公共 core 一次做完 | find-runner 与 recall 循环差异大（事件上下文 vs 任务画像），硬抽会让两边都变复杂 | 两处循环第 3 次同步修改时 |
