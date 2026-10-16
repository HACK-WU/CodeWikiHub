# ClawXpert子专家 · 已知失败与测试状态

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
  - `CHATKIT_TASK_SUMMARY_OPEN_RESOURCE_EFFECT`
  - `NODE_OPTIONS`
- 实现层记录的失败线索（原文摘录）：
  - | `ngx-monaco-editor` + `monaco-editor` | `file-change-diff.component.spec.ts`、`file-change-review.component.spec.ts` | 重型编辑器依赖，jsdom 下常在校验/渲染阶段失败（父级列为环境级候选） |
  - - **父级口径的已知失败项**：本子域两个巨型 spec（conversation-detail 110 行、facade 53 行）是父级失败清单的首选候选（环境级 + 基线漂移），失败清单**待复跑确认**。
  - - **推荐动作**：`corepack pnpm install` → 按「运行命令」第 2 条跑本子域全量 → 把父级失败清单中属于 `clawxpert/**` 的行替换为实测 `●` 块；随后补三类用例（作用域切换 × 布局恢复、群组 scope × 固定视图标签回收、文件审查分批 × 过期批次丢弃），并为事件翻译层加「键名漂移」的显式失败用例。

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
