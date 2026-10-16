# Xpert 工作台专家 · 已知失败与测试状态

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

## 1. 运行方式
```bash
node node_modules/jest/bin/jest.js --config apps/cloud/jest.config.ts --runTestsByPath <spec>
```

## 2. 覆盖概况
- 实测测试状态：93 spec = 36 PASS / 55 FAIL（53 环境级缺依赖 + 2 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）
- 需外部依赖/mock 的用例：见下
- 实现层提到的环境变量/开关（用于开启受限用例）：
  - `ENOENT`
  - `FAQ_SECTION_KEYS`
  - `XPERT_DRAFT_PRIMARY_AGENT_NODE_MISSING`
- 实现层记录的失败线索（原文摘录）：
  - > 归档基线：`92 spec = 36 PASS / 55 FAIL`（其中 **53 环境级缺依赖 + 2 真实断言**，2026-10-15 实测；原包基线 commit `c07bb83d`，现仓库 `80f5676fd`，**重建后未复跑**）
  - - [xpert.component.spec.ts](file://apps/cloud/src/app/features/xpert/xpert/xpert.component.spec.ts)（模板字符串断言，真实失败）
  - 5. 实测结论：92 = 36 PASS / 55 FAIL
  - - **`tools/`（2）**：`create`（校验/重复提交/失败回滚）；`authorization/dialog`（凭据对话框）。
  - ## 5. 实测结论：92 = 36 PASS / 55 FAIL
  - **口径**：归档记录 `92 spec = 36 PASS / 55 FAIL`，其中 **53 个环境级缺依赖**、**2 个真实断言失败**（2026-10-15 基线实测；本仓库重建后未复跑）。55 + 36 = 91，与 92 的差额 1 项（skipped/未收集）**待复跑确认**。
  - ### 5.1 环境级缺依赖（53）
  - - **同类机制（同一失败形态）**：`mermaid`、`@xterm/xterm` 在 `knowledge` 的 7 个 spec 中与 milkdown 成组 mock（同样无 `virtual: true`），任一未落盘即整组失败。

## 3. 已知失败

- **原包实测**：93 spec = 36 PASS / 55 FAIL（53 环境级缺依赖 + 2 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）
- **本次重建后未复跑 jest**（2026-10-16），因此不声明新的 PASS/FAIL；下表为「待复跑确认」：

| 项 | 状态 | 说明 |
|---|---|---|
| 全量 spec | ⏳ 待复跑 | 按 §1 命令先跑单文件、再跑目录 |
| 环境级失败 | ⏳ 待复跑 | 多为 `@xpert-ai/store`/`@milkdown/crepe` 等依赖缺失，装齐依赖后应消失 |
| 真实断言失败 | ⏳ 待复跑 | 逐条核对是否仍复现，再决定修码或改测试 |

## 4. 复跑后如何升级
- 回填 §3 表格（PASS/FAIL/SKIP 计数与失败用例名），并同步 `agent.md` 的「测试状态」行。
