# 会话工作台子专家 · 已知失败与测试状态

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

## 1. 运行方式
```bash
node node_modules/jest/bin/jest.js --config apps/cloud/jest.config.ts --runTestsByPath <spec>
```

## 2. 覆盖概况
- 实测测试状态：66 spec = 52 PASS / 10 FAIL（4 环境级缺依赖 + 1 contracts 产物 + 5 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）
- 需外部依赖/mock 的用例：见下
- 实现层提到的环境变量/开关（用于开启受限用例）：
  - `BASH_ENV`
  - `NODE_OPTIONS`
  - `WORKBENCH_CHAT_FACADE`
- 实现层记录的失败线索（原文摘录）：
  - - **前置**：`corepack pnpm install`（`node-linker=hoisted`）；否则全部 spec 在收集阶段即失败。
  - | 7 | **i18n 键无守护** | 各 spec 用 `TranslateModule.forRoot()` 与 `Default` 文案；键改名不会失败（`XP.Chat.XpertWorkbench.*` 与 `XP.Chat.ClawXpert.FrameMissing` 混用更易漏） | 若要守护，需引入键清单断言（仓库内暂无先例） |
  - - **未能核实**：本会话仅只读检索，未实际执行 jest，因而**未能给出本子域 5 个 spec 的 PASS/FAIL 实测结果**；父级文档记录的失败清单（4 环境级 + 1 contracts + 5 真实断言候选）未点名本子域任何 spec，故本子域基线按「可跑、待复跑确认」对待。

## 3. 已知失败

- **原包实测**：66 spec = 52 PASS / 10 FAIL（4 环境级缺依赖 + 1 contracts 产物 + 5 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）
- **本次重建后未复跑 jest**（2026-10-16），因此不声明新的 PASS/FAIL；下表为「待复跑确认」：

| 项 | 状态 | 说明 |
|---|---|---|
| 全量 spec | ⏳ 待复跑 | 按 §1 命令先跑单文件、再跑目录 |
| 环境级失败 | ⏳ 待复跑 | 多为 `@xpert-ai/store`/`@milkdown/crepe` 等依赖缺失，装齐依赖后应消失 |
| 真实断言失败 | ⏳ 待复跑 | 逐条核对是否仍复现，再决定修码或改测试 |

## 4. 复跑后如何升级
- 回填 §3 表格（PASS/FAIL/SKIP 计数与失败用例名），并同步 `agent.md` 的「测试状态」行。
