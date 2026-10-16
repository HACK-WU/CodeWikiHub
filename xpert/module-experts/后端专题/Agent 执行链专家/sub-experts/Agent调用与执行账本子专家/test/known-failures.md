# Agent调用与执行账本子专家 · 已知失败与测试状态

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

## 1. 运行方式
```bash
node node_modules/jest/bin/jest.js --config packages/server-ai/jest.config.ts --runTestsByPath <spec>
# 单用例过滤（先定位、再跑全量）
node node_modules/jest/bin/jest.js --config packages/server-ai/jest.config.ts \
  --runTestsByPath <spec> -t "<用例名片段>"
# server 包的 spec（如 business-area）：
node node_modules/jest/bin/jest.js --config packages/server/jest.config.ts --runTestsByPath <spec>
# 需真库的用例：沿用同前缀库（`/xpert_execution_test_` 安装信息）后按 §2 的 env 开启
```

## 2. 覆盖概况
- 实现层记录：见 `implementation/06-测试.md`
- 需真实 PostgreSQL/Redis/MQ 的用例：实现层未见明确要求
- 实现层提到的环境变量（用于开启受限用例）：
  - `HOST_TASK_WAIT_POLICY`
  - `XPERT_EXECUTION_TEST_DATABASE_URL`

## 3. 已知失败

- **本次未复跑 jest**（环境事故后按持久化产出重建，重建时间 2026-10-16），因此不声明 PASS/FAIL；下表为「待复跑确认」清单：

| 项 | 状态 | 说明 |
|---|---|---|
| 全量 spec | ⏳ 待复跑 | 按 §1 命令先跑单文件、再跑目录 |
| 需外部依赖用例 | ⏳ 待复跑 | 无依赖时按 skip 处理（见 §2 的 env） |
| 已知失败条目 | ⏳ 未知 | 原版 `known-failures.md` 随环境事故丢失，未保留 FAIL 清单 |

## 4. 复跑后如何升级
- 把实际结果（PASS/FAIL/SKIP 计数与失败用例名）回填 §3 表格，并同步 `agent.md` 的「测试状态」行。
