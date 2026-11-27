# 实施计划：MCP 上传事件结论 + 事件编辑工具合并

- 设计基线：`DESIGN.md` + `S01` / `S02` / `S03`（评审通过 2026-11-23）
- 代码基线：`2eeb73e`（工作区另有 27 处未提交改动，见 §5 风险）
- **执行方式：单窗口串行**（依赖链明确 + 单人；无并行收益）

## 1. 前置层（不进批次，先于全部工作项）

| # | 前置项 | 内容 | 完成判据 |
|---|---|---|---|
| 1 | 数据模型定稿 | `AnalysisDraft` 增 `source?` / `importedAt?` / `sourceClient?`；`AnalysisDraftDto` 两处镜像；**之后只读** | 三处字段逐字一致 |
| 2 | 错误码定稿 | 新增 2 个：`ANALYSIS_TARGET_OUT_OF_ROOT`、`ANALYSIS_CANDIDATE_ALL_DROPPED`；复用：`ANALYSIS_ALREADY_RUNNING` / `ANALYSIS_DRAFT_EXISTS` / `ANALYSIS_EDIT_INVALID` / `ANALYSIS_LOCATION_VERIFY_FAILED` / `REVISION_CONFLICT` / `EVENT_DESCRIPTION_TOO_LONG` | 写进 `governance-errors.ts` 并登记文档 |
| 3 | 写操作登记 | `analysis-import` 加入 `scope-policy.ts::BLOCKED_OPS` | `test/scope-readonly.test.ts` 绿（该测扫描全部 op 字面量） |
| 4 | 横切约定 | 时间单位 = ms 时间戳（沿用）；ID 前缀 `ext_` / `cand_` / `loc_`；错误码按语义命名不分号段（沿用项目现状）；不新增日志通道 | 写进 S01 §3.1/§3.3（已完成） |
| 5 | 权限模型 | 只读 Token 不可见 `ki_event_edit`（写块注册）；scope 只读库被 `assertOperationWritable` 拦；视图名写操作被 `assertNotScopeView` 拦；**无 per-action 授权**（合并工具的既定取舍） | 写进 S02 §3.5（已完成） |
| 6 | 契约门禁 | 三处 DTO 的机械比对测试先跑通一次（改前基线） | `test/governance-contract.test.ts` 绿 |

> 前置层 1/2/3 是**代码改动**，由 S-01 的第一组改动一并完成（串行路径无骨架产出，不做桩）。

## 1.5 前端视觉基线（壳）

**无**（本次不新增页面，只改既有分析卡的卡头与过程区；无 demo，按现有 `ki.css` token 实现）。

## 2. 批次表

| 批 | 工作项 | 层级 | 承接验收项 | 并行 | 串行原因 | 基线 |
|---|---|---|---|---|---|---|
| 第 1 批 | **S-01 写入内核** | 根 | R2 / R3 / R4 / R8（服务端默认值）/ R9（校验侧）/ R14（校验侧）/ R15（服务端闸门） | ∥（单工作项） | — | `2eeb73e` |
| 第 2 批 | **S-02 MCP 合并工具** | 业务 | R1 / R9（参数侧）/ R10 / R11 / R13 / R14（参数侧） | ∥ | — | 第 1 批合入后 |
| 第 2 批 | **S-03 前端来源与确认** | 业务 | R5 / R6 / R7 / R8（前端兜底）/ R12 / R15（前端文案）/ R16 | ∥ | — | 第 1 批合入后 |

**依赖说明**：S-02 对 S-01 是**实现级依赖**（要真实调用 `saveExternalAnalysis`，不是接口级 mock 可解），故必须排在第 2 批；S-03 对 S-01 是**数据级依赖**（要读 `source` / `importedAt` 字段），同样第 2 批。S-02 与 S-03 独占写无交集 → 可并行，但本次按串行执行（顺序：S-02 → S-03，因 S-02 的行为会影响前端联调数据）。

**独占写边界（防越界）**：

| 工作项 | 独占写 | 只读 / 禁碰 |
|---|---|---|
| S-01 | `src/lib/events/{types,analysis-edit,analysis-store,event-detail,analysis-runner}.ts`、`src/lib/governance-contract.ts`、`web/src/api/governanceContract.ts`、`src/lib/scope-policy.ts`、`src/lib/governance-errors.ts`、`test/analysis-store-external.test.ts` | `web/src/components/**`（S-03）、`src/lib/mcp-tools/**`（S-02） |
| S-02 | `src/lib/mcp-tools/event-edit.ts`（新增）、`src/lib/mcp-server-factory.ts`、3 个待删旧工具、`docs/mcp-tools.md`、用户级 skills 4 文件、`test/mcp-event-edit.test.ts` | `src/lib/events/**`（S-01）、`web/**`（S-03） |
| S-03 | `web/src/components/governance/event-detail/EventAnalysisCard.tsx`、`web/src/components/governance/AiAnalyzePanel.tsx`、`web/src/styles/ki.css`（或治理页样式）、`web/test/event-analysis-source.test.mjs` | `web/src/api/governanceContract.ts`（**只读**，字段由 S-01 改）、`src/**`（S-01 / S-02） |

## 3. 每批检查点（批次边界）

| 批次边界 | 必须通过 |
|---|---|
| 第 1 批完成 | ① `test/governance-contract.test.ts` 绿（三处 DTO 一致）② `test/scope-readonly.test.ts` 绿（`analysis-import` 已登记）③ 新增 `test/analysis-store-external.test.ts` 绿（running 409 / 覆盖闸门 / 默认值补齐 / 验真 / 不设 `editedAt`）④ 两端 `tsc --noEmit` 无新增错 ⑤ `git diff` 自查未越界到 `web/src/components/**` |
| 第 2 批完成 | ① 新增 `test/mcp-event-edit.test.ts` 绿（5 action 正例 + 6 类互斥反例 + 旧工具名不存在）② web 新增测试绿（外部来源渲染 / 缺字段不崩 / 追问挂载 / 跨版本位置提示）③ `web` build 通过 ④ `grep -rn "ki_event_set_stage\|ki_event_docs\|ki_event_refs" ~/.codebuddy/skills` 为 0 ⑤ 真机走查：MCP 上传 → 页面来源行 → 确认位置 → 追问 → 重新分析弹框文案 |

## 4. 执行顺序（单窗口）

```text
前置层 1/2/3（并入 S-01 第一批改动）
  → S-01 后端写入内核 + 契约 + 测试
  → 第 1 批检查点
  → S-02 合并工具 + 旧工具下线 + skills/docs 同步 + 测试
  → S-03 前端来源展示 + 兜底 + 文案 + 测试
  → 第 2 批检查点（含真机走查）
```

## 5. 风险与待验证

| # | 风险 | 处理 |
|---|---|---|
| 1 | 工作区已有 27 处未提交改动（`src/get-module-info.ts`、`src/lib/chat/llm-client.ts` 等） | **开工前先与你确认**：这些是否先提交/暂存，避免本次改动与既有改动混在同一份 diff 里无法分辨 |
| 2 | C-4：单次 50 条 `docRefs` 是否逼近 60s 超时 | S-02 实施时用 50 条实测；超时则降到 20 或 `members.add` 改批量 |
| 3 | C-5：事件删除后 `.analysis.json` 是否残留 | 实施期顺手验证；未清理则本次不修，按规则上报事件 |
| 4 | `skills` 改名后用户级副本需重装 | S-02 交付项含重装 + grep 0 残留校验 |
| 5 | 契约三处漂移 | 每批检查点固定跑契约测试 |

## 6. 三问自查

| 问 | 答 |
|---|---|
| 谁必须先先行？ | 前置层 6 项（数据模型 / 错误码 / op 登记 / 横切约定 / 权限模型 / 契约门禁）；根砖头 = S-01 |
| 哪些能同批开工？不能的为什么？ | S-02 ∥ S-03 可同批（独占写无交集）；二者都在第 2 批，因对 S-01 分别是实现级 / 数据级依赖 |
| 本次是并行还是串行？ | **单窗口串行**（单人 + 依赖链），顺序 S-01 → S-02 → S-03 |
