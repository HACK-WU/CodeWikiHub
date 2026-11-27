# 实施计划：追问带工具再调查

设计基线：`design/DESIGN.md`（父 + S01~S05，challenger 复核通过） ｜ 骨架冻结 commit：`—`（未走并行链）
执行方式：**单窗口串行**

## 1. 前置层（不进批次，先于全部工作项）

| # | 前置项 | 内容摘要 | 完成判据 | 设计出处 |
|---|--------|---------|---------|---------|
| 1 | 轮次常量 | `ask-contract.ts` 新增 `ASK_TOOL_MAX_ROUNDS = 5` | 常量存在且被测引用 | S-03 |
| 2 | 限流工厂 API | `ask-limiter.ts` 抽 `createAskLimiter(cfg?)`，默认实例委托原 4 个导出 API（签名不变） | `ki_ask` 侧零改动、现有 limiter 测试全绿 | S-03 |
| 3 | 错误码 | `governance-errors.ts` + status 表新增 2 码：`ANALYSIS_FOLLOWUP_RATE_LIMITED` / `ANALYSIS_FOLLOWUP_BUSY` | 单表 + 两条 status 断言通过 | S-03 |
| 4 | 类型契约 | `AnalysisAskTurn.toolCalls?: Array<{name,at}>` + 前端 DTO 同步 | tsc 0 错 | S-04 |
| 5 | SSE 事件形状 | `tool` / `thinking` 两种追加事件（只追加、不改 delta/done/error） | 旧前端解析白名单静默忽略（代码已核 `governanceApi.ts:639-647`） | S-04/S-05 |
| 6 | 工具工厂边界 | `analysis-runner.ts` 导出 `buildKbReadToolEntries`；`resolveAnalysisTargetDir` 直接复用不改动 | export 后分析侧行为不变 | S-01 |

> 前置层的**契约**已设计定稿、之后只读；但其**代码实现**必须先行落地（第 0 批），不能只写在文档里。原稿把常量/限流/错误码的实现挂在「前置层」又在批次表第 3 批重复安排，属自相矛盾，已按下表修正：第 0 批负责实现前置层，后续批次只消费。

**根工作项**：第 0 批（前置层实现）→ S-01（工具循环内核）—— S-01 被 S-02/S-03 实现级依赖，且与它们同改 `analysis-ask-runner.ts`。

## 1.5 前端视觉基线（壳）

**无**（本次只改 `AskBlock.tsx` 文案 + 事件解析 + 弱色进度行，无新页面、无布局/结构变更、无 demo，属 `ui-to-ascii` 改值类豁免）。

## 2. 批次表

| 批 | 工作项 | 层级 | 承接验收项（需求侧） | 并行 | 串行原因 | 独占写 | 基线 commit |
|---|--------|------|---------------------|------|---------|--------|------------|
| 第 0 批 | 前置层实现（1~6 项） | 根 | "常量/工厂/错误码/类型/SSE 形状/export 边界就位，ki_ask 行为不变" | — | —（真正的首批） | `ask-contract.ts`、`ask-limiter.ts`、`governance-errors.ts`+status 表、`types.ts`+前端 DTO、`analysis-runner.ts`（仅加 export） | 当前 HEAD |
| 第 1 批 | S-01 工具循环内核 | 根 | "追问可调用 fs_*/ki_* 工具重新取证；轮次上限 5；达上限强制作答" | → | **文件互斥**：第 0 批碰 `analysis-runner.ts` 的 export、本批碰 `analysis-ask-runner.ts`（虽不同文件，但本批依赖前置 6 项就位） | `analysis-ask-runner.ts`（工具装配+循环主体） | 第 0 批合入后 |
| 第 2 批 | S-02 提示词与上下文 | 业务 | "上下文含已挂文档清单；system 允许核实；结论仍截 1200 字" | → | **文件互斥**：同改 `analysis-ask-runner.ts`（buildContext + system） | `analysis-ask-runner.ts`（buildContext/signature） | 第 1 批合入后 |
| 第 3 批 | S-03 限流预算与并发 | 业务 | "取消 45s 硬预算；追问 6 次/60s 独立配额；超限有明确错误码" | → | **文件互斥**：runner 接线仍碰 `analysis-ask-runner.ts`；且需 S-01 循环体就位 | `analysis-ask-runner.ts`（接线段）；常量/工厂/错误码已在第 0 批就位，本批只接线消费 | 第 2 批合入后 |
| 第 4 批 | S-04 展示记录 + S-05 契约回归 | 业务 | "SSE 出 tool/thinking 事件；turn 有 toolCalls；旧前端不破坏；测试全绿" | ∥（批内两项文件不互斥） | 依赖前 3 批后端先产出事件 | `governance-http.ts`、`types.ts`、`AskBlock.tsx`、`governanceApi.ts`、`chatContract.ts`、`test/analysis-ask-tools.test.ts` | 第 3 批合入后 |

**批次数告警**：5 批（第 0~4 批，≥3）。已查：无骨架缺口——共享面已在第 0 批实现定稿，单窗口串行无跨批接口桩需求，前批真实产出即后批输入。

**覆盖反向检查**（需求侧 3 条验收项 → 批次归属）：
- "追问可调工具" → 第 1 批 ✅
- "取消预算 + 独立限流" → 第 3 批 ✅
- "文档清单 + 流式不静止 + 旧前端兼容" → 第 2/4 批 ✅
- 孤儿 0 / 重叠 0

## 3. 每批检查点（批次边界）

1. 上批相关测试全绿（第 0 批：limiter 既有测试 + 错误码 status 断言；第 1 批：新建 `analysis-ask-tools.test.ts` 首组用例；第 2 批：context 断言；第 3 批：limiter 双实例隔离；第 4 批：前端 `web` 构建 + 全量回归）
2. 契约是否需修订：**仅此处可改**（SSE 事件形状、`toolCalls` 字段一旦进入第 4 批即冻结）
3. 主干可编译可运行（根 `tsconfig.json` tsc 0 错）

## 4. 执行方式

**单窗口串行**：按第 0→1→2→3→4 批连做。本可并行的相邻项：无（每批都碰 `analysis-ask-runner.ts` 或依赖其产出，构成实现级依赖；第 4 批内两项可同批完成）。

> 法规性说明：本计划是**呈现层**，砖头划分来自设计 S01~S05，依赖分级/互斥判定按上面文件清单；不建 `.plans/` 进度台账（那归 `plan-track`）。

## 5. 三问自查

- ① 谁必须先行 → 第 0 批（前置层 6 项实现）→ 根工作项 S-01 ✅
- ② 哪些能同批 + 为什么 → 仅第 4 批两项同批（文件不互斥 + 依赖同一后端产出）；其余串行原因为「文件互斥 / 实现级依赖」 ✅
- ③ 本次如何执行 → 单窗口串行（无用户并行诉求、改造现有逻辑占比 >1/2、共享面 6 处 >3，按 `design-craft` 阶段 5.5 判据不进并行链） ✅

## 6. 待拍板（不阻塞计划本身）

1. 是否补建 REQ 并 `req update` 注册本目录 6 篇文档（S05 §待定问题 3）——实施前定
2. 第 4 批 `thinking` 展示与"核查中"常驻提示二选一（S04 改动 2 留的实施期决策）
3. `targetDir` 未配置时卡头是否提示"仅可查知识库"（S05 §待定问题 1）
