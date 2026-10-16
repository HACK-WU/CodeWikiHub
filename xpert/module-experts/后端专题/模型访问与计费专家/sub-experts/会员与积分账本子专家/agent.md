# 会员与积分账本子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（模型访问与计费专家）
- **资产路径**：`.module-experts/后端专题/模型访问与计费专家/sub-experts/会员与积分账本子专家/`
- **职责**：一句话：**上游决定「这笔消费是多少」，本子域决定「记在谁头上、以什么额度扣、什么时候换期」**。它是模型调用的唯一扣费出口，也是唯一持有积分账本写权限的地方。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/membership`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 账本唯一索引是「一次调用只计一次」的底线
  - 资格解析路径带隐式写（self-heal）
  - 锁的失败语义不显式（8 个 advisory 锁 + 1 个 Redis 调度锁）
  - 定时任务是进程内调度，多副本会并跑
  - `pointsDelta numeric(28,10)` 的精度与舍入
  - 定价态决定读侧返回 0 还是 `null`，与 `reconciled_no_usage` 不是同一件事
- **测试状态**：三个用例：`MembershipAssignDto.source` 只接受 `MembershipSourceEnum` 枚举值（任意字符串被 `isEnum` 拒绝）；`MembershipPointAdjustDto.pointDelta` 接受最多 3 位小数、拒绝 4 位小数。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
