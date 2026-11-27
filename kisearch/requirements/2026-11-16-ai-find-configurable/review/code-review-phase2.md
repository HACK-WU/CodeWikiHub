# Code Review · AI 查找二期（深度通道）落地 + 一期收口

- 审查对象：工作区未提交改动（HEAD `0c56bde`，共 23 文件 +约 1900 行；其中本次会话新增 `find-runner.ts` / `find-service.ts` / `find-targets.ts` / `docs/ai-find.md` 与 4 个测试文件）
- 审查方式：code-review（深度模式，主 agent 串行）+ challenger 二次质疑 + 过滤评审
- 结论性质：**已验证**（以下命令实跑：`npx tsc -p tsconfig.json --noEmit`、`npx jiti test/...` 五个定向文件、`node scripts/run-tests.mjs test/events`、`cd web && npm test`、`npx tsc -p tsconfig.json --noEmit`、`npm run build`（EXIT=0））

## 一 · 审查过程

### 1.1 我对意图的理解

- **业务目标**：让「AI 查找」从确定性五步升级为可配置的双通道（快速 / 深度），并让设置页里的提示词、Skill、工具、预算对深度通道真实生效。
- **系统位置**：`FindRefModal`（前端） → `POST /governance/events/:id/refs/search {mode}` → `governance-http` 解析 targets →（fast）`refs-service.searchRefCandidates` /（deep）`find-service` → `find-runner`（LLM 工具循环） → `ki_*` 只读工具（scope 由 runner 注入） → 候选回填 → 前端勾选 → `addRefs` 写引用。
- **整体成功判据**：① 快速通道结果与一期完全一致；② 模型永远无法越过 `targets` 检索或读正文；③ 引用的去重 / 删除键仍按「源库 + group + name」，老 `refs.json` 无需迁移；④ 失败必须可见（不静默空成功）。

### 1.2 问题（本次引入，均已修复）

#### `Q1` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/events/find-runner.ts`（原 `resolveBudget(cfg, cfg.llm?.requestTimeoutMs)`）
- **问题**：把「单轮 HTTP 请求上限」当成「整次查找总预算」的上界去夹取。缺省 `requestTimeoutMs=300s` 时不显形，但一旦用户按单轮需求配成 20s，`find.timeoutMs=45s` 会被静默压到 20s，界面上的「默认 45 秒」与实际不符。
- **业务后果**：用户配了预算却不生效，且没有任何提示；排查时会去改错地方。
- **依据**：设计 S-03 §3.6 规定上限为 60s（`FIND_TIMEOUT_MAX_MS`），未提及受 `requestTimeoutMs` 约束。
- **链路**：
  ```text
  llm.requestTimeoutMs=20s · config.yaml
    ▼
  resolveBudget 用 min(60s, 20s) 作为 timeoutMs 上限 · find-runner
    ▼
  hardTimer=20s → abort → 无候选即 FIND_TIMEOUT（有候选则 partial）
    ▼
  用户看到「超时」，但配置页写的是 45 秒 ⇒ 配置语义失真
  ```
- **修复**：`resolveBudget(cfg)` 只按 `find` 自己的上下界夹取；单轮超时仍由 `streamChat(requestTimeoutMs)` 负责。回归锁：用例⑦ 断言 `understand.metrics.timeoutMs === 45000`（即使 `requestTimeoutMs=5000`）。

#### `Q2` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/events/find-runner.ts`（原 `rankCounters`）
- **问题**：`rankInScope` 用「该文档首次被检索到的时间顺序」当名次，而契约定义是「源库内**分数**名次（1 = 库内最高）」。多轮 `ki_search` 追加命中后，两者会不一致。
- **业务后果**：跨库比较时用户看到的「库内 #1」可能是错的，正是这个字段存在的意义被抵消。
- **依据**：`governance-contract.ts::RefCandidateDto.rankInScope` 注释「源库内分数名次」。
- **链路**：
  ```text
  第 1 轮 ki_search 命中 A(0.4)
    ▼
  第 2 轮 ki_search 命中 B(0.9)
    ▼
  A 先入表 ⇒ 旧实现给 A rank=1、B rank=2
    ▼
  面板显示「A 库内 #1」⇒ 与分数矛盾
  ```
- **修复**：先收集全部 `(key → score)`，verify 前按库分组、按分数降序统一计算名次（同分用 key 兜底稳定）。回归锁：用例⑦ 断言 `rankInScope === 1` 属于高分那条。

#### `Q3` · 🟥 本次引入 · 🟡

- **位置**：`src/lib/events/find-service.ts`（原 `excluded.associated/added`）
- **问题**：深度通道把 `excluded` 填成 `group/name`，快速通道填的是**文档名**（`split('\0')[2]`）。同一字段两种口径。
- **业务后果**：前端若按文档名渲染「已排除：X、Y」，深度通道会显示成路径；两通道切换时观感不一致。
- **依据**：`RefSearchResult.excluded` 在快速通道的实现与面板文案（`exclude` 步骤只列名称）。
- **修复**：统一为文档名，并在代码里注明「与快速通道同口径」。回归锁：用例⑦ 断言 `excluded.associated === [ART_A]`。

#### `Q4` · 🟥 本次引入 · 🟢

- **位置**：`src/lib/events/find-service.ts`
- **问题**：① 事件查不到时抛的是普通 `Error`，HTTP 层会落成 500 且无 `code`；② 末尾 `export { refKey }` 是无消费方的冗余再导出。
- **修复**：改抛 `GovernanceError('EVENT_NOT_FOUND')`；删除冗余导出。（静态检查 + tsc 验证）

#### `Q5` · 🟥 本次引入 · 🟢

- **位置**：`src/lib/governance-errors.ts`（`FIND_DEEP_NOT_READY`）
- **问题**：二期上线后该码不再被返回，注释仍写「一期只有 fast」，会误导后来者以为深度通道没接。
- **修复**：标 `@deprecated`，说明保留码位是为老前端 / 老日志识别。

#### `Q6` · 🟥 本次引入 · 🟡

- **位置**：`web/src/components/governance/FindRefModal.tsx`
- **问题**：深度查找是长请求，用户点「停止」后界面提示「已停止」，但同模式无法重跑（只能切模式或关弹窗重开）。
- **业务后果**：误点停止后要重新走一遍关闭 / 打开，且深度通道本来就慢。
- **修复**：停止态加「重新查找」按钮。

### 1.3 challenger 二次质疑（追加，均成立，已修复）

#### `Q7` · 🟧 本次激活 · 🟡（数据守恒 · 数量）

- **位置**：`src/lib/events/find-runner.ts`（候选上限处理）
- **问题**：为修 `Q1`~`Q6` 时一度改成无上限遍历，随即恢复上限时又直接 `break` —— 两种写法都让「模型给了 20 条、实际只列出 12 条」这件事无法从响应里看出来。属**数量静默减少**。
- **业务后果**：用户以为模型只找到 12 条，不会意识到是配置上限卡住；调 `maxCandidates` 的因果关系被掩盖。
- **依据**：数据守恒「数量」问 + 项目 fail-loud 哲学（用户规则「反感静默失败」）。
- **链路**：
  ```text
  模型输出 20 条候选 · verify 循环
    ▼
  candidates.length >= maxCandidates ⇒ break
    ▼
  剩余 8 条既不入 candidates 也不入 unconfirmed
    ▼
  前端「已校验 N 条」无法解释差额 ⇒ 数据静默减少
  ```
- **修复**：超额项记入 `unconfirmed(reason: 'truncated')`，`unconfirmedCount` 如实反映。回归锁：候选上限用例追加 `reason === 'truncated'` 与 `unconfirmedCount === 1` 断言。

#### `Q8` · 🟥 本次引入 · 🟡（负向体验）

- **位置**：`web/src/components/governance/FindRefModal.tsx`（error 分支）
- **问题**：深度通道失败（模型不可用 / 无工具 / 超时）时只给「重试」与「改用手动添加」，没有「改用快速查找」——而设计 §4 明确要求文案引导「换模型或改用快速查找」。
- **业务后果**：模型侧配置有问题时，用户唯一能点的「重试」必然再失败一次。
- **修复**：error 分支在 `mode === 'deep'` 时加「改用快速查找」（`setMode('fast')` 触发重跑）。

### 1.4 既有缺陷（非本次范围，不阻塞）

- `test/chat/prompt-config-routes.test.ts` 3 例、`test/chat/e2e-sr02-sources.test.ts` 2 例失败：已用 HEAD 版两文件对照确认与本次无关（同名同因）。
- `src/lib/import-budget.ts` / `mcp-http-api.ts` / `open-api/multipart.ts` 的 `tsc` 存量错误：项目无全量类型门禁，本次未触及这些文件。

### 1.5 待验证项（需真机，静态无法收敛）

- `T1`：同步 60s 请求是否会被部署侧网关掐断（设计 B6）——**决定了 `find.timeoutMs` 的实际可用上限**。
- `T2`：`ki_search` 多库一次调用在真实数据量下的耗时（2 库 × 大库）是否超过单轮 `requestTimeoutMs`。
- `T3`：前端深度通道端到端三态（成功 / 中途停止 / 超时）——需 daemon 重启后实测。

## 二 · 结论

### 2.1 合入结论

**✅ 修复后已可合入**：`Q1`~`Q8` 全部修复并补回归锁；无剩余阻塞项（`Q1`~`Q3`、`Q7`、`Q8` 为 🟡，`Q4`/`Q5` 为 🟢；无 🔴）。

### 2.2 质量评分

| 维度 | 评分 | 状态 | 依据 |
|------|------|------|------|
| 语义一致性 | 8.5 | ⚠️ | 修了 3 处语义失真（预算夹取 / 名次定义 / excluded 口径），均已加断言 |
| 安全性 | 9 | ✅ | 工具作用域注入有专门用例（越界 scope 回给模型、`ki_search` 强制覆盖） |
| Bug 风险 | 8.5 | ⚠️ | 截断静默已修；工具执行抛错回填仍无用例（代码有处理） |
| 代码规范 | 8.5 | ⚠️ | `find-runner.ts` 640 行偏大；`FIND_MAX_TARGETS` 定义位置与其它上限常量不在一处 |
| 架构设计 | 9 | ✅ | 执行与归一分层清晰，无循环依赖；额度与 AI 分析共用一处实现 |
| 性能 | 9 | ✅ | 分片按库缓存、工具走 read 车道、无 N×M 重复读 |
| 测试覆盖 | 8.5 | ⚠️ | 9 例覆盖门禁 5 路 / 预算 2 路 / 校验 3 类 / 超时 / 服务层 / 修复锁；缺「工具抛错」用例 |

整体：**A**（均值 ≈ 8.71）

### 2.3 需要你拍板

- `D1`：`FIND_BUSY` 采用「直接拒绝、不复用」的口径（设计 §3.6 已定）。若你希望同一事件两个人并发时后者等待而不是报错，需要改成排队 —— 会引入等待时长与取消语义，本期未做。
- `D2`：深度通道的 `mode` 字段返回 `hybrid`（占位），真实降级情况在步骤 metrics 里。是否需要为深度通道新增 `mode: 'deep'` 枚举值（会改契约枚举，需同步前端）？
- `D3`：本次 diff 仍混有上一需求（REQ-20261116-004）的遗留改动（`route-permissions.ts` 两条 members 规则、`sync-relation.ts` 的 `event` 描述），提交时是否拆分。

### 2.4 亮点

- 工具作用域注入做成**单点**（`resolveToolScope` + `ki_search` 强制覆盖），并用「越界 scope 回给模型而非抛用户」把安全边界与体验分开。
- 允许「未收口事件锁住的文档可加入、已收口拒绝」，把不可逆与可逆两种情况区分开，而不是一刀切禁止。

## 三 · auto-review 影响面提示

本次触及契约面：新增错误码 1420–1427、`RefSearchResultDto.parsed?`、`RefSearchStep.name` 联合类型扩宽、`consumeDailyQuota` 新增可选参数。已确认的消费方：`analysis-runner`（同文件内 1 处调用已同步）、前端 `errorText`（直接显示 code + message，无映射表需补）。其余跨模块消费方未做穷举取证 —— 建议转 `code-change-impact` 补齐调用方与回归风险清单（确认调用方已同步可忽略）。
