# 已知单元测试失败：事件治理专家

### `test/events（批量）`

- **执行方式**：`node scripts/run-tests.mjs test/events --serial`（单跑：`node scripts/run-tests.mjs test/events --serial`）
- **失败时间**：2026-11-25（既有基线记录，非本次引入）
- **失败原因**：批量 2 红，单跑证实为并发端口/daemon 污染
- **修复尝试**：已用 --serial 与单跑复验，未改产品代码
- **影响**：不影响单测结论，但全量结果不能直接当回归证据
- **来源**：AGENTS.md 近期工作 / 既有测试基线

