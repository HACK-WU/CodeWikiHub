---
id: REQ-20261127-001
feature: AI对话源码只读查看
status: 设计中
created: 2026-11-27
updated: 2026-11-27
version: 1
tags: [feat, ai, chat, security, web]
author: AI
document_type: design
---

# 实施计划：AI 对话源码只读查看

**设计基线**：[DESIGN.md](DESIGN.md) ｜ **骨架冻结 commit**：—（单窗口，无骨架）
**执行方式**：单窗口串行（S-01 → S-02 → S-03；S-02 与 S-03 本可同批）
**批次权威**：本次不走 `delivery-slicing`，本文件即定稿；执行进度另走 `plan-track`，不在此重复建台账。

## 1. 前置层（不进批次，先于全部砖头）

| # | 前置项 | 内容摘要 | 完成判据 |
|---|---|---|---|
| 1 | 契约与类型冻结 | `code-tools.ts` 的 `ChatCodeRoot` / `ChatCodeRootsResult` / `CodeRootSkipReason`；`ToolLoopInput.toolFace`；`CodeRootsDto` 与前端契约副本 | 前后端签名一致；`npm run build` 与 `web typecheck` 均 0 |
| 2 | 全局登记清单 | `TOOL_CAPABILITIES` / `INTERNAL_ONLY_TOOL_NAMES` / `CHAT_MCP_TOOLS` / `MCP_TOOL_GROUPS` / `READ_MCP_TOOLS` 五处；测试断言 14→18 | 清单定稿并标注「之后只读」；`capability-coverage` 与 `mcp-tool-registry` 通过 |
| 3 | 横切约定与非功能预算 | 通道位语义、执行查表改 `Map`、KB-first 块注入顺序、10s 工具超时、`fs_read` 预算公式、200 行 / 64KB 上限 | 常量集中在 `code-tools.ts`；公式单测可引用 |
| 4 | 权限模型 | 复用 `knowledge.read`；viewer 可读其可访问库映射的目录；MCP `ki_ask` / `/mcp` 不开放 | 能力矩阵与越权用例进验收；`ask` 工具面无 `fs_*` |
| 5 | 目录口径 | 单库 `byScope → defaultDir`；视图成员仅 `byScope`；`defaultDir` 不作用于视图；同 `realRoot` 去重 | `resolveByScopeOnly` 三态用例（有映射 / 仅默认 / 都无）定稿 |

> 前置层只冻结**契约与口径**，不产出可用功能；工具面在 S-01 之前保持 14 个，避免中间态暴露半成品。

## 1.5 前端视觉基线（壳）

**无**（无新页面、无 demo；复用现有 `ki-chat-cfg__*` 组件与 `--ki-*` token，属沿现有风格小改，壳分支不适用）。

## 2. 批次表

| 批 | 砖头 / 工作项 | 层级 | 承接验收项 | 并行 | 串行原因 | 基线 commit |
|---|---|---|---|---|---|---|
| 第 1 批 | S-01 工具面与通道隔离 | 根 | R1 对话可调 `fs_*`；R2 KB 足够时 0 次 `fs_*`；R4 `ki_ask` / 构造调用不可达；R5 工具自报 `truncated` | ∥ | — | — |
| 第 2 批 | S-02 多根目录与视图选根 | 业务 | R3 单库 A/B 各取各；视图两成员各读各；全未映射不暴露 | ∥ | — | 第 1 批合入后 |
| 第 2 批 | S-03 界面与可观测 | 业务 | R6 面板无矛盾文案、视图清单只读；R7 `fs_*` 动作标签正确 | ∥ | — | 第 1 批合入后（视图清单用冻结 DTO 桩） |

**为什么 S-01 必须先行**：S-02 要在 `code-tools.ts` 上加视图分支，与 S-01 的适配层是**同一文件**（文件互斥）；S-03 要改 `prompt-config.ts` 的分析组 label，也与 S-01 同文件。故 S-01 独占第 1 批。

**为什么 S-02 与 S-03 可同批**：S-02 改 `code-tools.ts` / `tool-loop.ts`；S-03 改 `prompt-config.ts` / `chat-routes.ts` / `web/**`，文件不互斥；S-03 的视图清单只依赖前置层冻结的 `CodeRootsDto`，S-02 未完成时可用桩。**本次选择串行执行**，不是代码上不能并行。

## 3. 每批检查点（批次边界）

| 边界 | 必跑 | 通过判据 |
|---|---|---|
| 第 1 批后 | `npm run build`；`npm run test:chat`；真机一次对话 | tsc 0；`capability-coverage` / `mcp-tool-registry` 18 个通过；SSE 出现 `fs_*`，答案带 `label:file:line`；`ki_ask` 工具面 14 个 |
| 第 2 批后 | `npm run build`；`npm run test:chat`；`cd web && npm run typecheck`；视图真机 | 视图两成员各读各；多根缺 `root` 返回 `ROOT_REQUIRED`；设置页 `codeRoots` 正确；面板文案无「仅限 AI 分析」 |
| 收尾 | `npm run test:all`；`cd web && npm test`；三组问题集抽样 | 无新增红；KB 足够 / 不足 / 冲突三组各 10 次，记录 `fs_*` 触发率与来源标注 |

> 既有基线：`test/chat/prompt-config-routes.test.ts` 的 3 例失败属基线遗留，按存在性对照，不计本次回归。

## 4. 执行方式

**单窗口串行**：按 S-01 → S-02 → S-03 连做，每批结束跑上表检查点并记录合入 commit。

**本可并行但本次串行**：S-02 与 S-03 文件不互斥、DTO 已冻结，可两窗口并行；本次单窗口串行，预计多一次批次切换成本。若后续要并行，S-03 先用 `codeRoots` 桩，S-02 合入后只需替换数据源。

**不做排期承诺**：批次只表示开工先后与互斥结论，不是工期。

## 5. 三问自查

| # | 问题 | 答案 |
|---|---|---|
| ① | 谁必须先行？ | 前置层 5 项 → S-01（根，文件互斥）；S-02/S-03 不得早于 S-01 |
| ② | 哪些能同批？不能的为什么？ | S-02 ∥ S-03（文件不互斥、DTO 已冻结）；S-01 不能与二者同批（`code-tools.ts` / `prompt-config.ts` 文件互斥） |
| ③ | 本次如何执行？ | 单窗口串行，S-01 → S-02 → S-03；检查点见 §3 |

## 6. 验收对照（R → 批次）

| 需求 | 承接批次 | 验证方式 |
|---|---|---|
| R1 工具面 | S-01 | 设置页 4 个开关；SSE `fs_*`；开关关闭后不出现 |
| R2 知识库优先 | S-01 | 三组问题集抽样；KB 足够组 0 次 `fs_*` |
| R3 目录解析 | S-02 | 单库 A/B；视图两成员；全未映射 |
| R4 通道隔离 | S-01 | `ki_ask` 工具面 14 个；构造式调用返回「未知工具」 |
| R5 返回体积 | S-01 | 默认 `limit≈97`；`truncated` 自报；序列化层不二次截断 |
| R6 面板与文案 | S-03 | 面板无「仅限 AI 分析」；视图清单只读 |
| R7 时间线 | S-03 | `fs_read` 卡片显示「读取文件」 |

## 7. 回滚

- **功能级**：在「AI 设置 → AI 对话 → 工具与权限」关闭 4 个 `fs_*` 开关，下一次提问即生效；或清空 `analysis.targetDirs` 使工具面自动不装配。
- **代码级**：所有改动为新增（组、工具、适配层）与查表收敛；回滚按批次 revert，无数据迁移、无 schema 变更。
- **无副作用面**：不写知识库、不写代码目录、不改会话文件格式（仅 `tool_start` 的展示字段复用既有 `args`）。
