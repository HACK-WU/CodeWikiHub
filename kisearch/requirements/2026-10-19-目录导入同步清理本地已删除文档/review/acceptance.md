---
id: REQ-20261019-001
feature: 目录导入同步清理本地已删除文档
status: 设计中
created: 2026-10-20
updated: 2026-10-20
version: 1
tags: [feat]
depends_on: []
author: AI
document_type: test
---

# 验收：目录导入同步清理（数据/逻辑层）

- **验收时间**：2026-10-20
- **验收口径**：需求 §4 R1–R11 的验收标准逐条核验
- **证据分层**：① 单测（`test/import-prune.test.ts` 23 例）② 端到端真实链路（`test/import-prune-e2e.test.ts` 5 例）③ 代码事实（`file:line`）
- **未覆盖层**：HTTP 接口真实请求、浏览器 UI 实测（见 §3）

## 1 · 逐条核验

| 需求 | 验收标准 | 结论 | 证据 |
|---|---|:---:|---|
| R1 `pickMode` 门控 + 混合禁止 | 文件/混合模式收到 `pruneStale=true` → 400 | ✅ | `resolvePrunePrecheck` 单测 4 例（NOT_DIR_MODE / mixed 文案）；`mcp-http-api.ts` run 分支返回 `PRUNE_NOT_DIR_MODE` |
| R2 `ImportResult.prune` | 结构向后兼容、开关关闭时无该字段 | ✅ | 三个 return 点 `...(prune ? { prune } : {})`；e2e ① 断言 `result.prune` 存在 |
| R3 `/api/import/prune` 重算 + token + 批量删除 | token 不一致 409；已删不算错 | ⚠️ | handler 代码审查通过（`PRUNE_TOKEN_STALE` / `allDone` / `skipped`），**未做真实 HTTP 请求** |
| R4.1 闸门 A ≥80% | 场景 2/3/5 关闭 | ✅ | 单测「层级变化 / 同名 group 撞车 / 首次对 1000 篇库」均 `GATE_COORD` |
| R4.2 闸门 B ≤80% | 场景 6/7 关闭 | ✅ | 单测「只传 3 个文件」「130 删 110」均 `GATE_SCALE` |
| R4.3 >20% 强警告 | 告警含百分比且不关闭 | ✅ | 单测 `warn` 字段；前端渲染 `deleteRatio` 百分比 |
| R4.4 闸门触发给出原因 + CLI 出口 | 文案不得只说"已关闭" | ✅ | 前端渲染 `skipDetail` + `ki delete-relation -g -r` 示例 |
| R4.5 阈值常量化 | 改常量文案同步 | ✅ | `PRUNE_COORD_THRESHOLD` 等 5 个常量，文案引用同一值 |
| R4.6 未触及 group 默认不勾 | 全选不含该组 | ✅ | 单测 `untouchedGroups` 断言；前端默认勾选过滤 `!untouched` |
| R5 `sourcePath` 空永不进候选 | 单列提示 | ✅ | 单测场景 8：`unableCount=30`、候选只来自可判定项 |
| R6 空源 fail-loud | 明确 `EMPTY_SOURCE` | ✅ | 单测「空源 → EMPTY_SOURCE」 |
| R7 子集重试不产候选 | 无候选 | ✅ | 单测 `SUBSET_RETRY`；run 侧 `pruneStale && !isSubsetRetry` |
| R8 单次上限 500 | 超限只给计数 + CLI 指引 | ✅ | 单测场景 9（501 篇 → `overLimit` 且无 token） |
| R9 结果卡展示 | 取消不删除、失败项有原因 | ⚠️ | 代码审查通过；**浏览器未实测** |
| R10 CLI `--prune` | P2 | ➖ | 分期未做（父文档已声明不在范围） |
| R11 上传完整性硬门槛 | 不完整 → `UPLOAD_INCOMPLETE` | ✅ | 单测 `UPLOAD_INCOMPLETE`；`preserveRels` 并集 e2e ④ 验证 token 语义 |

## 2 · 端到端真实链路（`test/import-prune-e2e.test.ts`，FTS-only）

| # | 用例 | 结果 |
|---|---|:---:|
| ① | 首次导入（库空）→ `EMPTY_LIBRARY`、total 0 | ✅ |
| ② | 删源文件后重导 → 候选恰好 1 篇且指向 `b.md`、`coordRatio=1` | ✅ |
| ③ | 同一输入重算 → **token 与 run 完全一致**（同源契约） | ✅ |
| ④ | `preserveRels` 改变候选与 token（漏传即恒 409） | ✅ |
| ⑤ | `executeBatchDelete` 后 cache 仅剩 `a`/`c` | ✅ |

> 运行：`timeout 120 env -u NODE_OPTIONS -u BASH_ENV npx jiti test/import-prune-e2e.test.ts` → `# pass 5 / # fail 0`，进程正常退出。

## 3 · 未覆盖项（不阻断数据层交付）

| 项 | 状态 | 说明 |
|---|---|---|
| `POST /api/import/prune` 真实请求 | ✅ 已补（12/12） | `temp/verify-prune-http.mjs`：重启 daemon 后跑通 upload → run → prune 全链路（详见 §5） |
| 浏览器 UI 实测 | ⏳ 待手测 | 目录选择走 `showDirectoryPicker`（浏览器原生目录选择器），**Playwright 无法驱动**；本机亦无 playwright 包。已给出手测清单（§6） |
| 后端全量单测 `test:all` | ⏳ 未跑 | 含依赖 embedding 密钥的用例，本机未注入密钥 |

## 5 · 接口层实测（`temp/verify-prune-http.mjs`，12/12 PASS）

前置：`ki mcp restart`（**新路由不会热加载**，旧 daemon 下 `/import/prune` 返回 404）

| # | 用例 | 结果 |
|---|---|:---:|
| 1 | 上传第 1 批 3 篇 | ✅ |
| 2 | `run` 返回 `prune` 字段 | ✅ |
| 3 | 首次导入（库空）→ `EMPTY_LIBRARY`、候选 0 | ✅ |
| 4 | 上传第 2 批 2 篇（源目录已删 b.md） | ✅ |
| 5 | 重导后候选恰好 1 篇且指向 `b.md` | ✅ |
| 6 | 候选带 token | ✅ |
| 7 | 缺 `selected` → 400 `PRUNE_MISSING_PARAM` | ✅ |
| 8 | 错误 token → 409 `PRUNE_TOKEN_STALE` | ✅ |
| 9 | `dryRun` → 200 + plan 且不删除 | ✅ |
| 10 | 删除候选 → `deleted=1`、`failed=[]` | ✅ |
| 11 | 重复删除 → 200 `allDone`（幂等不报错） | ✅ |
| 12 | 暂存目录不存在 → 400 `PRUNE_SOURCE_UNAVAILABLE` | ✅ |

> 全部操作落在临时 scope `prune-http-<ts>`，验完已清理，未触碰任何既有知识库。

## 6 · UI 手测清单（约 3 分钟）

1. 打开 `http://127.0.0.1:7423` → 导入页：确认「目录同步清理」区块存在，**复选框默认未勾且禁用**，提示「仅「选择目录」上传时可用」
2. 点「选择目录」选一个含 `.md` 的目录 → 复选框变为**可用**，提示改为「开启后导入完成才给出候选清单」
3. 关闭选择器后改点「选择文件」多选 2 个 md → 复选框**重新变灰**
4. 勾选开关 → 导入 → 结果卡出现「库中另有 N 篇文档，本次上传的目录里没有」，逐条勾选可用，底部按钮「删除所选 N 篇」
5. 文案核对：必须显示 **「删除后即刻从列表与检索消失，不可恢复（原文、向量与全文索引一并物理删除）」**

## 4 · 验收结论

**数据层与判定逻辑：通过**（R1/R2/R4–R8、R11 共 10 项全绿，R3/R9 代码审查通过但未实测）。
**接口层与 UI 层：待实测补证**。

唯一需注意的既有约束：删除**不可逆**（无回收站），UI 已明示「不可恢复」，N15 已登记。
