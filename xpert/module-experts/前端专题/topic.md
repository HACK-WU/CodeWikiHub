# 前端专题 · topic

> ⚠️ **重建版**（原版随 2026-10-16 工作区事故丢失；原计划文件为 `.module-experts/PLAN.md`，其内容以 `当前状态/前端专家创建计划（未实施）` 形式存于 ki）。

## 职责

前端专题承载 `apps/cloud`（Angular 17 standalone + signal + elf store）的**页面/交互域知识资产**：每个专家回答「这个页面域长什么样、数据从哪来、交互怎么走、改哪里会连带改哪、有哪些坑」。与后端专题的分工：前端负责**交互与呈现**，后端负责**契约与数据**；跨端事实由两份资产互相引用（后端接口以 `C1-能力契约` 为准，前端调用面以本专题专家的 `C1` 为准）。

## 专家清单与就绪状态

| # | 专家 | 状态 | 覆盖 | 非 spec .ts | 优先级 |
|---|---|---|---|---|---|
| 1 | Agent 编排 Studio 专家 | ⚠️ **部分恢复**（`implementation/02~07` + 失败清单为原产出提取；`01-架构` 与契约层 `C0/C1/C2/C4/C5` 为 2026-10-16 重建） | `features/xpert/studio/**` | 168 | P0 |
| 2 | 对话前端专家 | ❌ 待建（子专家：ClawXpert / 会话工作台） | `features/chat` + `features/assistant` | 159 | P0 |
| 3 | Xpert 工作台专家 | ❌ 待建（子专家：知识库 / 工作区） | `features/xpert` 扣 studio | 194 | P1 |
| 4 | 认证与引导专家 | ❌ 待建 | `auth` + `onboarding` + `@core/auth` | 51 | P1 |
| 5 | 项目协作专家 | ❌ 待建 | `features/project` | 25 | P2 |
| 6 | Agent 演进专家 | ❌ 待建 | `features/agent-evolution` | 18 | P2 |
| 7 | 探索广场专家 | ❌ 待建 | `features/explore` | 31 | P3（可选） |

**进度：1/7 部分恢复**（Studio 专家 13 篇 / 2575 行）

## 明确排除（不建专家）

- `@shared`（387 文件，公共 UI 组件库）· `@core`（182，基础设施）→ 转项目记忆
- `features/setting`（148，设置页聚合薄壳，非单一业务域）
- 零星小域（operations / organization / miscellaneous / artifacts / plugin-marketplace 等，1–8 文件）

## 构建与查询约定

- 建站顺序：`topic.md` → `T0-专题总览.md` → 各专家逐个创建（一次一个；每完成一个回写 T0 的专家导航与 `INDEX.md`）
- 单测：`node node_modules/jest/bin/jest.js --config apps/cloud/jest.config.ts --runTestsByPath <spec>`（绕 Nx 最快）
- 前端索引 `apps/cloud` 的页面 ↔ 接口双向索引：`.fe-index/xpert-cloud/`（**待建**，用 `frontend-index` skill）
- 记忆：ki scope `xpert-memory` 下 `专题记忆/前端专题/*`（7 份路标）+ `接口信息|数据流|决策记录/{Xpert Studio, Xpert 工作台, 对话域, 认证与引导, 项目协作, Agent 演进}` + `关联关系/前端专题/*`

## 入口

- 专题总览（能力清单 / 边界 / 跨域架构图 / 待建顺序）：[T0-专题总览.md](file://.module-experts/前端专题/T0-专题总览.md)
- 专家索引：[../INDEX.md](file://.module-experts/INDEX.md) · 项目级共享：[../PROJECT.md](file://.module-experts/PROJECT.md)

## 重建完成记录（2026-10-16）

7 个专家全部就位（1 个部分恢复自原产出 + 6 个本次重建）：

| 专家 | 状态 | 篇数 / 行数 | 子专家 |
|---|---|---|---|
| Agent 编排 Studio 专家 | ✅ 已建（`02~07`+失败清单为原产出提取；`01`+契约层为重建） | 14 / 2606 | 0 |
| 对话前端专家 | ✅ 已建（2026-10-16 重建，含 2 子专家） | 30 / 5088 | 2 |
| Xpert 工作台专家 | ✅ 已建（2026-10-16 重建，含 2 子专家） | 30 / 4577 | 2 |
| 认证与引导专家 | ✅ 已建（2026-10-16 重建） | 14 / 2795 | 0 |
| 项目协作专家 | ✅ 已建（2026-10-16 重建） | 5 / 588 | 0 |
| Agent 演进专家 | ✅ 已建（2026-10-16 重建） | 5 / 648 | 0 |
| 探索广场专家 | ✅ 已建（2026-10-16 重建） | 5 / 608 | 0 |

### ki 条目补写（2026-10-16）

6 个新专家的记忆条目已写入 `xpert-memory`（共 **27 条**，全部 `vectorStored + wikiSynced`）：

| 域（Group 子组） | 接口信息 | 数据流 | 决策记录 |
|---|---|---|---|
| 对话域（对话前端专家） | 3 | 4 | 4 |
| Xpert 工作台（含 2 子专家） | 2 | 3 | 5 |
| 认证与引导 | 2 | 3 | 3 |
| 项目协作 | 2 | 1 | 2 |
| Agent 演进 | 2 | 1 | 1 |
| 探索广场 | 1 | 1 | 2 |

scope 计数 298 → **325**；镜像 `CodeWikiHub/xpert/memory/` 同步（可用 `ki export` 重导）。
写入方式：`node /root/knowledge-indexer/bin/ki.mjs sync-relation -s xpert-memory -i <batch.json>`（批量）。
