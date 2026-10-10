---
id: REQ-20261009-001
feature: 导入部分成功可用、失败重试与导入页交互修复
status: 已完成
created: 2026-10-09 12:00:00
updated: 2026-10-09 12:00:00
version: 1
tags: [feat, ux, import]
depends_on: []
author: AI
document_type: report
---

# 实现报告：导入部分成功可用、失败重试与导入页交互修复

## 实现摘要

系统性向量故障下，导入不再"整批回滚 + 物理删除已完成的工作"：**提交粒度改为文件级**——已成功的文件照常提交并立即可检索，失败/未处理文件进入 scope 级未完成清单；随后可用 **CLI `--retry-incomplete` / HTTP `onlyRelPaths` / Web「重试未完成 N 篇」** 只重试未完成部分（已完成文件不重传、不重算 embedding、不产生 `_1` 副本）。导入页另修两处交互（切页可见性、新建 Scope 免回车、操作区常驻可见）。

## 关联提交

| 提交 Hash | 提交信息 | 关联子需求 |
|-----------|----------|-----------|
| （无） | 全部改动仍在**工作区未提交**（49 文件 `+1265/−424` 量级之上叠加本批），故无 commit hash 可关联 | R1–R5 |

## 落地清单（按需求条目）

| 需求 | 状态 | 主要落点 |
|------|------|----------|
| R1 部分成功可用 | ✅ | `src/lib/import.ts`：文件级失败判定取代全批连坐、系统停止/取消改提交、`ImportStats.files`/`partial`/`incomplete`/`stopReason`/`cancelled`；`src/import.ts`：CLI 部分成功 = 退出码 0 + stderr 警告；`src/lib/mcp-http-api.ts`：任务终态 `partial` + 清单随 result 下发 |
| R2 只重试未完成 | ✅ | 新增 `src/lib/import-retry.ts`（`<scope>/.ki-import-incomplete.json`：源目录 + 原批次参数 + 未完成项 + 停止原因；部分成功写、全量成功删）+ 核心 `HandleDirectImportArgs.onlyRelPaths`（名单外文件不读原文/不复制附件/不写 KB/不向量化）+ `result.retryFilter{requested,matched,missing}`；CLI `ki import --retry-incomplete`；HTTP `/api/import/run` 可选 `onlyRelPaths`；Web 结果区面板 + 按钮（复用同一 `uploadId`） |
| R3 切页可见性 | ✅ | `web/src/pages/ImportPage.tsx`：无在途任务才清空（选择/统计/错误/进度） |
| R4 新建 Scope 免回车 | ✅ | `web/src/components/ScopePathSelect.tsx` + `ki.css`：失焦/点按钮即生效，非法名仍拦截 |
| R5 操作区常驻可见（单删） | ✅ | `web/src/styles/ki.css` |

## 偏差记录

| 编号 | 偏差类型 | 需求/设计描述 | 实际实现 | 原因 |
|------|----------|---------------|----------|------|
| D-01 | 额外实现 | D3 只要求"CLI 有只重试失败的开关" | `--source` 由 `requiredOption` 改为可选：重试时沿用清单记录的源目录与参数（切分/向量化/标签/冲突策略），命令行显式传参优先 | 否则重试必须让用户复述原参数，漏传即改变口径 |
| D-02 | 额外实现 | 需求未指定未完成清单的持久化载体 | 新增 scope 级文件 `<scope>/.ki-import-incomplete.json`（点号前缀，不进组名空间） | 清单必须跨进程/跨会话存活，否则关掉终端/刷新页面即无法重试 |
| D-03 | 范围偏差 | 需求只写"Web 复用同一 uploadId 只传未完成子集" | 新增服务端可选字段 `onlyRelPaths`（白名单校验：string/长度/非绝对路径/无 `..`），且子集重试**不复用**已终态 job（同 uploadId 开新 job） | 服务端原本会复用 `session.jobId`（返回旧 jobId），不放开则重试永远不启动 |
| D-04 | 方案偏差 | 未定义同 scope 多源的待重试语义 | 未完成清单为**单槽**：同一 scope 另一次部分成功会覆盖上一个源的待重试项 | 清单是"当前待重试项"而非历史台账；已在文档中说明 |
| D-05 | 方案偏差（延续既有） | R1 目标"停止即提交已完成部分" | **辅助向量阶段**（tags/路径等）自身停止仍回滚全批（决策 #9，未纳入本批） | 涉及辅助向量自身的事务边界，建议独立需求排期 |
| D-06 | 方案偏差（既有语义） | 未完成判定覆盖全部失败面 | FTS-only 模式下**全文索引部分写入失败**的文件不进入 `incomplete[]`（仅记 `errors`） | 属既有 FTS 错误处理轴，本批未改动；已登记为遗留 |
| D-07 | 额外实现 | R3 只规定切页清空 | 部分成功时**保留 localStorage 凭据**（轮询 done 分支 + 恢复流程两处），刷新/重进页面仍可点「重试未完成」 | 否则刷新后重试入口失效（uploadId 找不到） |
| D-08 | 方案偏差（既有，现更可见） | —— | 失败文件的**附件不回滚**（附件在扫描期复制、回滚只处理 KB 与向量） | 既有行为；部分成功后孤儿附件更易被注意到。已登记为遗留 |
| D-09 | 方案偏差（复审修正） | 进度/中断标记分母 | 子集重试时进度分母与中断标记改为**子集总量**（原为全量，显示 done 3/100 永不达 100%） | code review 复审 P2 |
| D-10 | 方案偏差（复审修正） | 重试参数来源 | HTTP 子集重试时，请求未显式给出的参数**回落到清单记录**（原为前端表单默认值 → 刷新后可能改变 group/切分/标签口径）；`onlyRelPaths` 全非法改 400（原静默落回复用旧 job 分支） | code review 复审 P1/P2。⚠️ **已改未验**：HTTP 层无自动化用例（核心层参数记录有断言） |
| D-11 | 方案偏差（复审修正） | Web 重试防重入 | `startRetry` 增 `retryRef`（state 判定挡不住同帧双击 → 两个 job 争同 scope 写锁） | code review 复审 P2 |

## 验收结果

- [x] 故障注入后：已完成文件可检索（元数据/KB/`query-group`/relation-map），未完成文件不出现在文档列表与检索映射 —— `test/import-partial-success.test.ts` 用例 1
- [x] 未完成清单结构化可见（`path`/`group`/`relation`/原因 + 「完成 N / 未完成 M」）—— 用例 1 + CLI 实跑 JSON + Web 浏览器实测
- [x] `ki import` 部分成功 = 退出码 0（`ok:true` 路径）+ 明确警告 —— 代码路径 + CLI 子集重试实跑退出码 0；⚠️ 警告块文本未做真实 embedding 故障注入实测
- [x] 取消路径与系统停止同一条通路（已完成提交 + 未完成入清单）—— 用例 3
- [x] 未完成文件的**部分 chunk 已写入向量被回滚删除**、无孤儿向量 —— 新增用例「部分 chunk 已写入的向量被回滚删除」
- [x] Web 部分成功态出现「重试未完成 M 篇」；重试后未完成数递减、已完成 `memoryId` 不变、无 `_1` 副本、已完成 chunk 不重算 —— 浏览器实测 6/6 + `test/import-retry.test.ts` 2/2
- [x] CLI 重试命令实跑通过（清单 → 只处理 1 篇 → 清单删除 → 分片只含该 relation）—— 隔离 config + FTS-only 实跑；另 3 条 fail-loud 路径实跑
- [x] 回归：涉及面逐套件独立运行全绿（`import-*` 全套、`mcp-http-api` 38、`integration` 10 等）；`tsc -p tsconfig.json` 相对基线新增 0；Web `build` + 58/58 —— 口径与 sweep 无效性说明见 `.plans/2026-10-09-import-partial-success/plan.md`「回归证据」
- [x] 文档与台账同步：`docs/import.md`（新增「部分成功可用与只重试未完成」）、`docs/cli.md`（参数/示例/退出码语义）、`docs/error-handling.md`（3 条重试类错误）、`requirement.md` §11、`AGENTS.md`

## 遗留（不阻塞本需求，建议独立排期）

1. **#9 辅助向量阶段自身停止仍回滚全批**（D-05）。
2. **#11 CLI stderr 警告块与 HTTP 任务终态映射未进自动化测试**（现为手工实跑冒烟）。
3. **D-10 HTTP 子集重试参数回落**：已改未验（缺 HTTP 层用例）。
4. **D-08 失败文件附件残留**：建议附件复制延后到"文件确定提交"之后，或在文件级回滚时删除。
5. **D-06 FTS-only 全文索引部分失败不进 `incomplete[]`**：既有错误处理轴，建议与 FTS 侧一并排期。
6. **D-04 未完成清单单槽**：文档已说明；如需多源并存需改为按源目录分键。

## 对外契约变化（已在 `requirement.md` §11.4 与 `docs/` 声明）

- `ki import` 结果新增 `partial`、`stats.files{total,completed,incomplete}`、`incomplete[]`、`stopReason`、`cancelled`、`retryFilter`（仅子集重试时）；系统性故障下**退出码由 1 改为 0**。
- `POST /api/import/run` 新增可选 `onlyRelPaths`；job 终态可为 `partial`（任务台账 `state='partial'`）。
- 新增 scope 级文件 `<scope>/.ki-import-incomplete.json`。
