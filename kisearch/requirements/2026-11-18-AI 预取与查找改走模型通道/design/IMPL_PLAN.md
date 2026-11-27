# 实施计划：AI 预取与查找改走模型通道

- 设计基线：`design/DESIGN.md` + S-01~S-04（725 行，REQ-20261118-004 v4）
- 骨架冻结 commit：—（不走并行链，无骨架）
- 执行方式：**单窗口串行**

## 0. 并行判定（为什么不切片并行）

| 代理指标 | 实测 | 阈值 | 倾向 |
|---|---|---|---|
| 可并行砖头数 | 4（S-01~S-04） | < 3 才串行 | 够 4 |
| 跨砖头接口数 | 5（`runRecall` / `RecallResult` / `RecallConfig` / `recallToolGroups` / 门禁判定函数） | > 砖头数 × 3 = 12 | — |
| **改造现有逻辑的砖头占比** | **3/4**（S-02 改工具层、S-03 改配置域与前端、S-04 删通道） | > 1/2 | **命中** |
| **共享面处数** | **6**（`config-schema` / `codes` / `tool-access` / `tool-permissions` / `prompt-config` / `PromptConfigLayer`） | > 3 | **命中** |
| 量级估不出 | 否 | — | — |

**结论：单窗口串行。** 主因是「3/4 是改造」+「6 处共享面」——本需求的多数动作是**删**（删 fast、删缓存、删切换、删 28 例测试），删除类改动的顺序错了会留下"半删状态"（代码已删、测试还在；前端已删、后端还在）。

## 1. 前置层（不进批次，先于全部砖头）

| # | 前置项 | 内容 | 完成判据 |
|---|---|---|---|
| P1 | `config.yaml → recall` 收缩 | 5 键 → `throttlePerMinute` / `hardTimeoutMs` 两键 | ✅ **已完成 2026-11-18**：`config.ts` 接口与白名单解析、`config-schema.ts` 校验器同步收缩；旧配置残留三键读取时忽略 |
| P2 | 错误码表定稿 | `codes.ts`：删 `MODE_UNAVAILABLE`/`BUSY`，加 `MODEL_UNAVAILABLE`/`DISCLOSURE_REQUIRED`/`TOOLS_UNSUPPORTED`；内核码同步加三态 | ✅ **已完成 2026-11-18**：12 个 `RECALL_*` + `TOKEN_MODEL_FORBIDDEN`（另处定义）；`toolCodeForKernel` 穷尽映射 |
| P3 | 准入与能力表 | `ki_recall` 移出 `MODEL_CONSUMING_TOOL_NAMES`；能力 `knowledge.ask` → `knowledge.read` | `mcp-token-readonly` 与 `capability-coverage` 全绿 |
| P4 | `prompt-config.recall` 域 | 域结构 + `DEFAULT_RECALL_PROMPT`（S-01 §4.3 全文）+ `RECALL_TOOL_GROUPS` / `RECALL_LOCKED_TOOL_NAMES` + 归一化（缺字段=默认，域内非法只软忽略） | ✅ **已完成 2026-11-18**：`tsc`/`build` 0；新增 `test/chat/recall-config.test.ts` **7/7**；回归 `find-config` 6/6、`context-limit-config` 25/25、`prompt-config-routes` 13 通过 / 3 失败（经基线对照确认为**既有**） |
| P5 | **测试盘点（C4 落地版，已实测修正计划）** | 实测 28 例（11 + 17）全部围绕 `refs` CRUD / `searchRefCandidates` / `searchDocsForAdd` / `createSearchAdapter`；`searchRefCandidates` 按 D-04-3 **保留**（标废弃）⇒ **28 例继续有效，无需迁移** | 已验：两文件当前 11/17 全绿；S-04 落地后需复跑确认仍全绿 |

**前置层门禁**：P5 未跑绿前不得进入第 1 批 —— 否则删掉旧测试后会出现"回归覆盖归零"的窗口。

## 1.5 前端视觉基线（壳）

无（本次不新增页面，只是 AI 设置左栏加一项 + 复用 AI 查找段的 JSX，属"沿现有风格小改"，壳分支不适用）。

## 2. 批次表

| 批 | 工作项 | 层级 | 承接验收项 | 并行 | 串行原因 | 基线 |
|---|---|---|---|---|---|---|
| 第 0 批 | P1~P5 | 前置 | —（P5 供 S-01 回归） | — | — | HEAD |
| 第 1 批 | **S-01 召回内核**（`run-recall.ts` 新增 = 模型循环；`fast-recall.ts` **保留**作种子召回） | 根 | R1 单通道 / R2 summary+uncertainties / R3 硬规则 / R4 exclude 多轮 | — | — | ✅ **已完成 2026-11-18**：`run-recall.ts` 实现「种子 → 工具循环 ≤maxRounds → JSON 解析 → **候选必须本次读过正文**（evidence full/snippet）→ 装配」；`recall-kernel` 16/16 仍绿 |
| 第 2 批 | **S-02 工具接线**（`mcp-tools/recall.ts` 重写成单通道、`limits.ts` 删缓存与并发、注册与审计） | 业务 | R6 门禁三态 / R9 删缓存并发 | — | **实现级依赖 S-01** | ✅ **已完成 2026-11-18**：门禁三态（模型/外发/tools）+ 频控 + 45s 硬超时 + 生产工具执行器 + 只读 Token 可用；`recall-tool` **11/11** |
| 第 3 批 | **S-03 设置页与配置**（`prompt-config.recall` 消费侧、`chat-routes` limits、前端第四段） | 业务 | R7 设置页 / R8 锁定工具 | — | **文件互斥**：与 S-04 都要改 `PromptConfigLayer.tsx` 与 `chat-routes.ts` | 第 2 批合入后 |
| 第 4 批 | **S-04 AI 查找去 fast**（删 mode 分流、删 `findDeep` 与前端三处、面板去切换、文档重写） | 业务 | R5 去 fast / R10 #38 | — | **文件互斥**：与 S-03 争 `PromptConfigLayer` / `chat-routes` | ✅ **已完成 2026-11-18**：`governance-http` 取消分流（`mode` 入参忽略、旧前端不 400）；`findDeep` 能力位删除；面板固定 deep 并删两个切换按钮与「改用快速查找」兜底；`docs/ai-find.md` 改写。回归 `governance-refs-route` 3、`refs-sr05` 11、`refs-sr05-search` 17、`governance-routes` 14 全绿；前端 `tsc` 0 错 |

**批次说明**：

- 4 批 = 4 子需求 1:1，没有合并也没有拆分 —— 因为每个子需求都独占一组文件（前置层已把共享面清空）。
- **`findDeep` 删除归属 S-04，S-03 不碰**（设计里两处都写了这条，实施时以本表为准；S-03 只做"加 recall 段"）。
- 第 3、4 批之间**不可调换**：S-03 要往 `PromptConfigLayer` 里加第四段，S-04 要删两处 `findDeep` 分支；先删后加会让中间态的 diff 更难读，但两者在同一文件，必须分批。

## 3. 每批检查点

① 上批契约测试全绿 ② 契约是否需修订（**仅此处可改**，改则回填设计文档） ③ `tsc --noEmit` + `npm run build` 通过

## 4. 执行方式

**单窗口串行**，按 P1~P5 → S-01 → S-02 → S-03 → S-04 连做。

**本可并行但本次串行**：S-03（前端配置）与 S-04（删 AI 查找 fast）在**职责上独立**，若拆成两个窗口、把 `PromptConfigLayer.tsx` 的改动集中在 S-03 一次做完（新增段 + 删 findDeep 分支），理论上可并行。本次不这样做，因为：① 该文件改动点相距不足 100 行，两个窗口改同一文件的冲突概率高于收益；② 全需求预计 2~3 天，协调成本抵不过。

## 5. 三问自查

① **谁必须先行** → 前置层 P1~P5，尤其 **P5 测试迁移必须先跑绿**（否则后续删除无回归网）✅
② **哪些能同批、不能的为什么** → 无同批；串行原因只有两类：**实现级依赖**（S-02 依赖 S-01 真实实现）、**文件互斥**（S-03 与 S-04 争 `PromptConfigLayer.tsx` / `chat-routes.ts`）✅
③ **本次并行还是串行** → 单窗口串行，主因「改造占比 3/4」+「共享面 6 处」+「删除型改动顺序敏感」✅

## 6. 完成判据

| 判据 | 方式 |
|---|---|
| 12 个错误码各一例 | `test/recall-tool.test.ts` 重写 |
| 门禁三态文案均含 `ki_search` 指引 | 三条断言 |
| `grep -rn "findDeep" src web` = 0 | 命令断言 |
| `grep -rn "mode.*'fast'" src/lib/governance-http.ts` = 0 | 命令断言 |
| `refs-sr05*` 迁移后新文件覆盖原 60% 以上用例 | 用例计数对照 |
| 提示词硬规则生效（无只凭标题的候选） | 抽查 10 个真实任务，`evidence` 全为 `full` 或已标 `snippet` |
| 设置页六块可改且即时生效 | 改 `maxRounds` → 下一次调用 `rounds` 上限变化 |

## 7. 风险与回滚

| 风险 | 触发信号 | 处置 |
|---|---|---|
| 删旧测试后回归归零 | 第 1 批后 `recall-seed` 覆盖 < 原 60% | 立刻从 git 恢复旧文件、补迁移用例，再继续 |
| 无模型环境功能不可用 | 用户反馈"AI 查找点了报错" | 属预期（决策 A）；只补文案与上线说明，不恢复 fast |
| 45s 内跑不完 | 试点 P95 > 40s | 降 `toolResponseChars` 到 6000 或轮次降到 4（配置项，不改代码） |
| 模型只凭标题猜 | 抽查出现 `evidence:'snippet'` 却未标 `partial` | 说明校验漏了 → 修 S-01 §3 ⑤ 校验，不改提示词 |
| 旧前端仍传 `mode:'fast'` | 发版瞬间 400 | 已设计为"忽略不报错"，回归时专门断言 |
