# 知识库子专家 · 已知失败与测试状态

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

## 1. 运行方式
```bash
node node_modules/jest/bin/jest.js --config apps/cloud/jest.config.ts --runTestsByPath <spec>
```

## 2. 覆盖概况
- 实测测试状态：93 spec = 36 PASS / 55 FAIL（53 环境级缺依赖 + 2 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）
- 需外部依赖/mock 的用例：见下
- 实现层提到的环境变量/开关（用于开启受限用例）：
  - `ACTIVE_POLL_MS`
  - `FAQ_SECTION_KEYS`
  - `REFRESH_DEBOUNCE_TIME`
  - `SETTLED_POLL_MS`
- 实现层记录的失败线索（原文摘录）：
  - > 归档基线沿用父级口径：`92 spec = 36 PASS / 55 FAIL`（其中 **53 环境级缺依赖 + 2 真实断言**，2026-10-15 实测；本机 `node_modules` 缺失，**重建后未复跑**）
  - - 唯一前置是依赖落盘（`corepack pnpm install`，`.npmrc` 为 `node-linker=hoisted`）；本机 `node_modules` 缺失时全部 spec 在收集阶段即失败。
  - 5. **派生态轮询节奏无覆盖**：`timer` 周期（5000 / 2500 / 3000 / 2000ms）、`ACTIVE_POLL_MS` / `SETTLED_POLL_MS`、批次常量、可见性门只被间接触及；改变量不会触发任何失败用例。
  - 7. **文本断言脆弱**：`new.component.layout.spec.ts`、`new.component.faq-type.spec.ts`、`test.component.spec.ts` 等 `readFileSync` 断言与模板逐字耦合（父级已确证同风格的真实失败 1 例，位于 `xpert/` 而非本子域）；建议改语义断言或快照。

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
