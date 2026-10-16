# 工作区子专家 · 已知失败与测试状态

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

## 1. 运行方式
```bash
node node_modules/jest/bin/jest.js --config apps/cloud/jest.config.ts --runTestsByPath <spec>
```

## 2. 覆盖概况
- 实测测试状态：93 spec = 36 PASS / 55 FAIL（53 环境级缺依赖 + 2 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）
- 需外部依赖/mock 的用例：见下
- 实现层提到的环境变量/开关（用于开启受限用例）：
  - `DIALOG_DATA`
- 实现层记录的失败线索（原文摘录）：
  - > 口径：**14 个 spec**（实测），全部为组件/纯函数级测试；无端到端文件授权测试。父级专题归档为 `92 spec = 36 PASS / 55 FAIL`（53 环境级缺依赖 + 2 真实断言，2026-10-15 基线），本子域未单独复跑。
  - > 运行前置：`node_modules` 必须已落盘（本机曾为缺失状态），否则任何 spec 在收集阶段失败。
  - | 9 | [knowledges.component.spec.ts](file://apps/cloud/src/app/features/xpert/workspace/knowledges/knowledges.component.spec.ts) | 2 | 设置面板**先拿全量详情再打开**（列表项不直接开）、详情失败不开半成品对话框并 toas
  - | **全部第三方与工作区包** | 本子域 14 个全部 | 缺 `node_modules` 时在**收集阶段**失败（`Cannot find module`），用例体不执行；执行 `corepack pnpm install`（`.npmrc` 为 `node-linker=hoisted`）后按上节命令复核 |
  - 4. **错误态无覆盖**：无 403/404 分支断言；`getErrorMessage` + toast 只在 `general`（保存失败）与 `knowledges*`（详情失败）两处被间接覆盖。
  - - **可执行性具备、前置是依赖落盘**：配置（contracts 源码直连、environment 替换、jsdom 垫片）齐备，14 个 spec 全部离线；唯一外部前置是 `corepack pnpm install`。父级归档的 53 个「环境级缺依赖」含本子域的 `prompt-workflows` 2 个（`@milkdown/crepe`）。

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
