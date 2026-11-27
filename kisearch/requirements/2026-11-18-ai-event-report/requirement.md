# AI 自主上报事件闭环（AI → 事件）

**需求 ID**：REQ-20261118-002
**状态**：实施中 —— 实现与单测已完成；真实任务下的自动触发待自然验证
**模式**：M1 需求定义（一次成型档）
**证据声明**：最高 `🟢`（代码直读 + 项目台账 + 用户上传截图）。未起服务实测，凡"体验顺不顺"类判断已标注降级。

---

## 1. 需求来源

用户原话：「让 AI 在开发或者设计、对话、或者其他任务中，如果额外发现了与当前任务不符的、或者不应该在当前任务中进行的事项；或者是某个任务结束，但是要进行上报，比如发现了一个 bug、新增了某个需求……要闭合 AI 自主上报事件的能力，不要让用户去提醒时才进行自主上报。」

一句话：**AI 发现了"不属于本次任务、但需要有人跟到收口"的事，要当场变成事件，不等用户开口。**

## 2. 执行摘要

1. **能力早有，纪律没有**：`ki_event_create` 早已可用且服务层写死 `by: 'ai'`（`src/lib/mcp-tools/event-create.ts:65`），但 `rules/ai-codekb-memory.md` 与 `AGENTS-template.md` 对「事件 / 上报 / 待办」检索命中 **0**——AI 不是不会建，是没有任何时刻被要求建。
2. **需求实为三段**：出（上报）、入（召回）、收（收口）。用户只提了"出"，但项目台账与真实数据证明"收"已经在漏：#36 / #37 在 AGENTS.md 记 ✅ 已修复，事件却停在「修复中」。
3. **最大风险不是建不出来，是噪音与副作用**：创建路径无去重（`event-service.ts:277-294`）；挂 `docs` 会把文档分类改成 `event`、可见性随阶段走，首阶段 `hidden` 则立刻检索不到（事件 #37 的事故本体）。
4. **落点不是"纯 skill"也不是"纯规则"**：判定在 AGENTS.md（每轮注入才有人看见），操作在 skill（流程装不进规则），收尾在既有 skill 出口（必然会经过的地方）。
5. **文档债会反向压制需求**：`skills/ki-upload/SKILL.md:90` / `:160` 原写"事件只能由人在 Web 创建，AI 不能创建"，与现状相反。

## 3. 现状取证（改动前）

| 层 | 现状 | 证据 |
|---|---|---|
| 事件模型 | 12 字段，无 source / createdBy / sessionId；`by: user\|ai` 只在阶段日志 | `src/lib/events/types.ts:46-63`、`:65-75` |
| 内置类型 | `et_1` bug 排查（hidden→fts-only→fts-only→full，keep）/ `et_2` 性能优化（trash）/ `et_3` 需求实现（keep） | `src/lib/events/builtin-types.ts:16`、`:24-73` |
| 写入工具 | 7 个 MCP 工具已实现；写工具在只读会话不注册 | `src/lib/mcp-server-factory.ts:66-77` |
| 去重 | 无（仅单次请求内 docs/refs 求交） | `event-service.ts:299-317` |
| 通知下游 | 无 webhook / 无 SSE / 无 `/open/v1/event*` | `event-create.ts:70` 仅触发索引队列 |
| 规则层 | 「主动沉淀」只覆盖 relation | `rules/ai-codekb-memory.md:22-32`、`:284-297` |
| 相近范式 | `frontend-walkthrough` 的「分拣越界发现」表，但终点是交接别的 skill，不落库 | `~/.codebuddy/skills/frontend-walkthrough/examples.md:154-168` |

## 4. 需求清单（含交付状态）

### A 上报纪律

| # | 需求 | 状态 | 落点 |
|---|---|---|---|
| A1 | 三档分流（结论→记忆 / 一件事→事件 / 本次就做→不建） | ✅ | `event-report` §1（判据 SSOT）+ AGENTS.md 第二原则 |
| A2 | 三道上报门（越界 / 需收口 / 建前查重） | ✅ | `event-report` §2 |
| A3 | 两个必然触发点（越界即报 + 收尾强扫） | ✅ | `event-report` §3、`rules` 收尾 checklist |
| A4 | 字段模板（title ≤40 字含锚点 / type 口诀 / stage 首阶段 / description 来源行） | ✅ | `event-report` §4 |
| A5 | 对话内回执一行（无回执 = 未上报） | ✅ | `event-report` §10 |

### B 副作用与噪音治理

| # | 需求 | 状态 | 说明 |
|---|---|---|---|
| B1 | 默认只挂 `refs` 不挂 `docs`（终态例外） | ✅ | 事故 #37 的直接对策 |
| B2 | 建前 `ki_event_list(q, status=open)` 查重，命中则挂证据不新建 | ✅ | `event-report` §6 |
| B3 | 不建清单（风格 / 本次就做 / 已知在跟踪 / 需先拍板） | ✅ | `event-report` §11 |

### C 收口与召回

| # | 需求 | 状态 | 说明 |
|---|---|---|---|
| C1 | 任务完成即 `set_stage` 推到真实阶段 | ✅ | `event-report` §7；`rules` 收尾 checklist |
| C2 | 接手模块先 `ki_event_list(q)` 召回 | ✅ | `event-report` §8，含「结果可能不可信」过滤 |

### D 落点与文档债

| # | 需求 | 状态 | 落点 |
|---|---|---|---|
| D1 | AGENTS.md 第二原则写触发行 | ✅ | `AGENTS.md` 新增「📝 第二原则：主动沉淀 + 主动上报」 |
| D2 | 模板同步 | ✅ | `skills/agents-md-init/AGENTS-template.md:32-37` |
| D3 | 规则层「事件上报」节 + 禁忌 | ✅ | `rules/ai-codekb-memory.md` §事件上报、🔴 18/19、收尾 checklist 2 项 |
| D4 | 4 个收尾出口加指针 | ✅ | `code-review:854`、`debug:177`、`design-craft:1008`、`auto-review:255` |
| D5 | 修正 `ki-upload` 陈旧断言 | ✅ | `ki-upload/SKILL.md:90`、`:160` |

### E 本期不做 / 待定

| 项 | 结论 |
|---|---|
| 服务端 `source` / `createdBy` 字段 + 按来源筛选视角 | P2 待定（用 description 首行"来源：AI 自主上报"替代） |
| 服务端软去重 | 不做（易误杀不同事件），靠建前查重协议 |
| 新增内置类型（技术债 / 文档治理） | 不做；用最接近类型 + description 首行 `分类：…` |
| 存量清账（37 条未收口） | **不做**（2026-11-18 用户确认：多为测试数据） |
| 事件页来源 chip / 批量删除 UI | P2 待定 |

### F 追加需求（本会话新增）

| # | 需求 | 状态 | 说明 |
|---|---|---|---|
| F1 | 清理测试 / 废弃事件的直删能力 | ✅ | `ki_event_delete` 增 `force` + `confirm_title`，**只对无关联文档的事件生效** |

## 5. 影响面

| 受影响功能/方 | 影响类型 | 程度 | 处理 |
|---|---|---|---|
| 文档检索可见性 | 数据 / 流程 | 破坏（若不设防） | 默认 `refs`，禁用 `docs`；终态例外 |
| 事件页列表 | 展示 | 降级 | 三道门 + 查重 + title 规范 |
| 事件 AI 分析 | 展示 / 成本 | 降级 | description 固定三段模板（来源 / 现象 / 为何不做） |
| 事件类型体系 | 数据 | 降级 | 用最接近类型 + 分类标注，不新增类型 |
| AGENTS.md 上下文预算 | 性能 | 降级 | 第二原则净增 17 行，细节全在 skill |
| `ki-upload --event` | 外部契约 | 降级 | 陈旧断言已修正 |
| 其它 MCP 消费方 | 外部契约 | 无感 | 无来源字段，用 description 首行替代 |
| 权限 / 只读会话 | 权限 | 降级 | 写工具不注册 → 列出应上报项，不静默丢 |

## 6. 负向需求

| # | 场景 | 要求 |
|---|---|---|
| N1 | 只读会话 / 无 `knowledge.write` | 明确告知无法写入，列出应上报项，不重试 |
| N2 | scope 未初始化 / 无事件类型 | 降级为 AGENTS.md「近期工作」一行，不阻塞 |
| N3 | 用户说"不用记 / 别建" | 本次及同类不再上报，也不再回执 |
| N4 | 同一发现反复出现 | 走查重，第二次起只挂 `refs` |
| N5 | 含敏感信息 | 脱敏（description 会进 AI 分析上下文） |
| N6 | 类型重名 / 不存在 | 改传 id（`et_1`），不猜名称 |
| N7 | 类型选错不可改 | 宁可晚建：不确定先问；阶段一律首阶段（可回退） |
| N8 | 上报把当前任务带偏 | 上报后继续原任务，不在事件里展开调研 |
| N9 | force 删除带成员文档的事件 | 拒绝并给路（先解绑 / 先收口），不静默处理文档 |

## 7. 关键假设与拍板

| ID | 内容 | 结论 |
|---|---|---|
| Q1 | 落点形态：合并进第二原则 vs 独立第三原则 | 合并（判据同源，分开必成两套账） |
| Q2 | 自主 vs 审批 | 自主直写 + 回执显形（不做审批态） |
| Q3 | 是否本期做收口 | 做（`#36/#37` 已证明在漏） |
| Q4 | 类型不够用 | 用最接近类型 + description 分类标注；MCP 本就不能建类型 |
| Q5 | 服务端来源字段 | P2 待定 |
| Q6 | 测试事件是否清账 | 不清（用户拍板）；改提供 `force` 能力备用 |

## 8. 实施记录

| 文件 | 改动 |
|---|---|
| `skills/event-report/SKILL.md`（新，265 行） | 判据 SSOT：速览树 / 分流表 / 三道门 / 两触发点 / 操作序列与字段模板 / refs-vs-docs 红线 / 去重 / 收口 / 召回 / 降级表 / 回执 / 反模式 / 自检 / 协同 / 13 条禁忌 |
| `skills/event-report/reference.md`（新，119 行） | 类型与阶段链 / 工具速查 / 异常对照 / 2 则事故案例 / 清账清单 / 类型口诀 / 三载体对照 |
| `skills/agents-md-init/AGENTS-template.md` | 第二原则增分流 + 上报触发行（6 行）；description 同步 |
| `skills/agents-md-init/SKILL.md` | 概述 / §2.1 ⑩ / §2.2 ⑦ / §2.5 落点表 / §7 协同 / 禁忌 🔴 28·29 |
| `skills/ki-upload/SKILL.md` | 修正 2 处"AI 不能创建事件"的陈旧断言 |
| `AGENTS.md` | 新增「第二原则：主动沉淀 + 主动上报」；近期工作与更新日志各一条 |
| `rules/ai-codekb-memory.md` | 触发条件表加「越界发现 / 待办」；新增「事件上报」节；收尾 checklist 加 2 项；禁忌 🔴 18·19 |
| `src/lib/governance-errors.ts` | 新增 1120 / 1121 / 1122 + status 映射 |
| `src/lib/events/event-service.ts` | `DeleteEventInput` 加 `force` / `confirmTitle`；未收口四道校验；`DeleteEventOutcome` 加 `forced` |
| `src/lib/mcp-tools/event-delete.ts` | 参数、描述、payload、hint 同步 |
| `test/mcp-event-tools.test.ts` | 新增 4 例（缺确认 / 标题不符 / 空事件成功 / 带成员被拒） |
| `docs/mcp-tools.md` | 工具表 + 「MCP 不提供 force」段的例外说明 |
| `~/.codebuddy/skills/{code-review,debug,design-craft,auto-review}` | 各加 1~3 行收尾指针 |
| `.codebuddy/skills/event-report`（新软链） | `-> ../../skills/event-report`；项目 `skills/` 不自动加载，必须软链才可 `use_skill` |
| `~/.codebuddy/skills/agents-md-init/*` | 用户级真实副本（才是实际加载的那份），已 cp 同步 SKILL.md + AGENTS-template.md |
| `~/.codebuddy/skills/ki-upload/SKILL.md` | 用户级为 179 行旧版、缺分类上传整段；已用项目版（203 行）覆盖，两处一致 |

## 9. 验证

| 项 | 结果 |
|---|---|
| `test/mcp-event-tools.test.ts` | **11/11** 通过（含 5 新例；第 5 例为 challenger 追出的 trim 死锁） |
| `test/events-sr02.test.ts` | 19/19 |
| `test/governance-routes.test.ts` | 14/14 |
| `test/mcp-token-readonly.test.ts` | 28/28 |
| `tsc -p tsconfig.json --noEmit` | 7 条**既有**错误（`import-budget.ts` / `mcp-http.ts` / `mcp-http-api.ts` / `open-api/multipart.ts`），与本次改动文件零交集 |
| skill 自检 | `SKILL.md` 265 行（≤500）；description 80 字符 / 1-2 句 / `触发：` 起头；跨 skill 引用全为 `use_skill()`，无相对路径 |

## 10. 偏差与遗留

1. **force 收窄**：原计划"允许删除任意未收口事件"，实现时收窄为**只允许无关联文档的事件**。理由：未收口成员多在 `hidden`/`fts-only`，删除要恢复可见性即改索引；`moveToTrash` 只写回收站条目不摘索引；两者不同步就是 #37 那类静默故障。
2. **真实触发未验证**：本需求的核心是行为纪律，"AI 是否真的会在下次任务里主动上报"只能由真实任务验证，单测覆盖不到。→ 下次开发 / 排查任务作为自然验收。
3. **存量 #36 / #37 未收口**：两条真实事件仍停在「修复中」（终止动作 `keep`，推终态不丢文档）。属"收口"而非"清账"，用户尚未拍板执行。
4. **加载路径差点让整份交付失效**：项目 `skills/` 不是 CodeBuddy 的加载路径——`agents-md-init` 实际读的是 `~/.codebuddy/skills/` 下的真实副本（改项目文件不生效），`event-report` 建好后在 `available_skills` 里根本不出现。已补项目级软链并同步用户级副本，详见 ki「项目踩坑点」。
5. **`knowledge-atlas` 仍未注册**：项目 `skills/` 与 `~/.codebuddy/skills/` 都没有它的注册项，当前 `use_skill("knowledge-atlas")` 调不到。属既有遗留，未在本需求处理。
6. **AGENTS.md 第二原则为项目定制精简版**：模板是 6 条 bullet 全量，本项目按"要点 + 指针"压缩到 17 行。若日后跑 `agents-md-init` 增量更新，注意不要按模板重新膨胀。
7. **规则层一度完全没生效（已修）**：项目根 `rules/ai-codekb-memory.md` **不在 CodeBuddy 的规则加载路径**（本机 `.codebuddy/rules/` 为空目录），实际 alwaysApply 的是 `~/.codebuddy/rules/Agents_Memory.mdc`。因此本需求前几轮加進 `rules/` 的「事件上报」节、收尾 checklist 两项、禁忌 18/19 全部没有进入上下文。已按方案 A 同步进用户级 `Agents_Memory.mdc`（新增「第五步：越界发现 → 上报为事件」+ 记录类别表一行 + 例外第 6 条）。踩坑已沉淀到 ki「项目踩坑点」。
8. **`agents-md-init` 改动需 cp 到用户级**：它实际加载的是 `~/.codebuddy/skills/agents-md-init/` 的真实副本（不是软链），每次改项目 `skills/agents-md-init/` 后必须 cp，否则白改。

---

## 11. 追加需求：单事件详情读取（`ki_event_get`）

> 来源：读事件时发现 `ki_event_list` 只给 `conclusionPreview`（120 字截断）、无参考文档、无阶段日志、无未确认点，AI 判断不了"这条事件现在还缺什么"。
> 契约：**list 用来找，get 用来读**。不动 HTTP 详情接口（避免前端回归），只新增 MCP 读工具。

### 需求与交付

| # | 需求 | 状态 | 验收 |
|---|---|---|---|
| G1 | 新增只读工具 `ki_event_get(scope, event)`，读单事件全量 | ✅ | 返回 7 块（event / type / stage / members / refs / analysis / logs）+ hint |
| G2 | 默认裁剪：members 20 / refs 20 / logs 20 / locations 20 / snippet 200 | ✅ | 每块带 `total`，截断给 `note`；任意 limit 传 0 即不返回该块 |
| G3 | 结论 / 未确认点 / 已确认位置**必返** | ✅ | `steps_limit=0` 时 `unconfirmed` 与 `conclusion` 仍在 |
| G4 | 登记 5 处（漏一处就静默失效） | ✅ | `READ_ONLY_TOOL_NAMES`、`READ_MCP_TOOLS`、`mcp-server-factory`、`auth/tool-permissions.ts`、`web/src/lib/resourcesPage.ts` |
| G5 | 可见性提示 | ✅ | `stage.legend` 区分 hidden / fts-only / full |
| G6 | HTTP 详情与 MCP 共用读取逻辑（展示各按自己的契约） | ✅ 2026-11-18 补做 | `loadEventDetail` 成为单一读取真源；HTTP 响应字段**未变**（旧 DTO 保留完整 `draft`（含 candidates/steps）与 `logs.eventId`），前端零改动 |
| G7 | 日志取最近 N 条 | ✅ | 文件按写入正序，`slice(-N)` |
| G8 | 收敛 `mustFindEvent` | ✅ 2026-11-18 | 收到 `store.ts` 一处（带 `available` 前 5 条未收口事件），四个入口口径统一；`ki_event_get` 的 `EVENT_NOT_FOUND` 也带可用事件列表；`refs-service` 顺带省掉一次重复扫盘 |

### 两条硬约束（实测驱动）

1. **文档引用必须带 `scope` + 完整 `group` + `name` 三元组**（跨库用 `sourceScope` 解析后的实际库），否则调用方只有文档名、`ki_get_module_info` 取不到正文；代码位置同理，`file` 相对 `analysis.targetDir`。
2. **不返回分析过程与候选正文**（`steps` 整块 / `candidates` 正文 / `liveThinking`）：与 `unconfirmed` / `confirmed` 重叠，且单条工具响应就可能几 KB；只留 `candidateTotal`，并在候选数 ≠ 已确认数时给 `candidateNote`（否则 `12 = 12` 会被读成"还有 12 个待处理"）。

### 验证

新增 `test/mcp-event-get.test.ts` 6/6；回归 `mcp-event-tools` 11/11、`mcp-token-readonly` 28/28、`governance-routes` 14/14、`capability-coverage` 4/4、`mcp-tool-view` 9/9、web `resources-page` 系列 134/134；根 `tsc` 7 条既有错误与新文件零交集，web `tsc` 0 错误。真机 #36（8≠4 出 `candidateNote`）/ #37（12=12 不出）、hint 含 refs.visibility 说明、多级 group 原样返回。

### 读取收敛后（2026-11-18 补做）

| 项 | 结果 |
|---|---|
| 私有实现计数 | `grep "function mustFindEvent\|function mustEvent" src/lib/events/` → **仅 `store.ts:188` 一处** |
| 循环依赖 | `members.ts` / `refs-service.ts` 均未 import `event-service.ts`（`event-service` 反而 import `members`，故读取层必须落 store） |
| HTTP 详情响应键 | `ok / scope / event / members[{group,name}] / logs / analysis{draft,confirmed}` —— 与改前逐键一致 |
| MCP 裁剪纪律 | `steps` / `candidates` 正文 / `liveThinking` 仍不返回（用例断言 `'steps' in analysis === false`） |
| 回归 | `mcp-event-get` 6/6、`mcp-event-tools` 11/11、`governance-routes` 14/14、`event-members` 9/9、`governance-refs-route` 3/3；根 `tsc` 仍 7 条既有错误、无新增 |
| 计划台账 | `.plans/2026-11-18-event-detail-unify/`（plan.md + checklist.md） |
