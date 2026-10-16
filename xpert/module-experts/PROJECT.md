# PROJECT.md · 项目级共享资产（xpert 模块专家团）

> ⚠️ **重建说明**：本文件为 2026-10-16 环境事故后的**重建版**（原版随工作区重置丢失）。事实以当前仓库（commit `80f5676fd`）与 ki 记忆（scope `xpert-memory`，298 条）为准。

## 1. 项目坐标

| 项 | 值 |
|---|---|
| 仓库根 | `/root/xpert`（pnpm + Nx monorepo） |
| 后端 | `packages/server`（NestJS）· `packages/server-ai`（NestJS + LangGraph/CQRS/Bull） |
| 前端 | `apps/cloud`（Angular 17 standalone + signal + elf store）· `apps/desktop`（Electron + React 对话框） |
| 当前 commit | `80f5676fd`（资产**原**基线为 `c07bb83d`，存在漂移，见 §5） |
| 后端索引 | `.fe-index/xpert/`（145 模块 / 226 表 / 562 边；`--check` 闸门 EXIT=0） |
| 前端索引 | `.fe-index/xpert-cloud/` —— **待建**（用 `frontend-index` skill） |
| 记忆 scope | `xpert-memory`（ki 服务）· 镜像 `CodeWikiHub/xpert/memory/`（298 篇，`ki export` 可重导） |

## 2. 专家资产组织

```
.module-experts/
├── PROJECT.md                 # 本文件（项目级共享）
├── INDEX.md                   # 专家索引（专题 → 专家 → 状态）
├── 后端专题/                  # 专题层：topic.md + T0-专题总览.md
│   ├── 租户与平台设置专家/ … Agent 执行链专家/   # 8 个专家
│   └── <专家>/{agent.md, C0~C5, implementation/01~07, test/known-failures.md, sub-experts/*}
└── 前端专题/                  # 专题层：topic.md + T0-专题总览.md
    └── Agent 编排 Studio 专家/ …                 # 7 个专家（当前 1 个部分恢复）
```

**每专家构成**：`agent.md`（名片）· `C0 使用总览`/`C1 能力契约`/`C2 使用流程`/`C4 数据流向与消费`/`C5 关键决策`（契约层，C3 按需不产出）· `implementation/01~07`（架构/实现/数据流转/模型/接口/测试/运维）· `test/known-failures.md` · 子专家仅一级（`sub-experts/<子专家>/{C0,C1,implementation/,agent.md,test/}`）

## 3. 文档规范（R1–R7）

- **R1** 正文前 `**本文引用的文件**` cite 块（`file://` 相对仓库根）
- **R2** `## 目录` 与 `##` 章节一一对应（中文锚点）
- **R3** 每个 `##`/`###` 末尾 `章节来源：[文件](file://路径)（关键符号：类名.方法名 / 表名）`
- **R4** Mermaid 图后跟 `图表来源`
- **R5** 所有引用用 `file://`（不接受裸路径与行号）
- **R6** **不写行号**
- **R7** 符号必须真实存在；查不到就写「该模块无此项」；**不编造**
- 契约层（CR）：CR1 定位/何时找/能力清单/边界/已知坑 · CR2 接口 · CR4 Recipe · CR5 契约来源 · CR7 代码示例 · CR8/9 数据实体（生产方+消费方）· CR10 决策（分类/动机/决策/约束/被否决方案/重评条件/证据）
- **已知例外**：`前端专题/Agent 编排 Studio 专家/implementation/02~07` 为**原样恢复件**，保留了前端包早期的 `file.ts:行号` 引用风格（与 R6 冲突），**重建的 `01-架构` 与契约层已按 R6 执行**。
- **已知例外（前端包，2026-10-16 记录）**：① 部分前端实现层用 `file.ts:行号` 引用（与 R6 冲突，仅 Studio 的 `02~07` 为原产出风格）；② 前端实现层的 `## 目录` 条目多用**纯文本编号**（`1. 标题`，非 `- [x](#锚点)` 链接），与 R2 校验器的匹配口径不同——内容与 `##` 章节一一对应，结构自检脚本（`.check-fe.py` / `.check-studio.py`）会把这类判为「R2 目录 0 vs N」，属**口径差异而非缺陷**。

## 4. 查询与写入入口

| 意图 | 用什么 |
|---|---|
| 找专家资产 | `expert-lookup`（先读 `INDEX.md` / 专家 `agent.md`） |
| 查记忆 | `ki-search`（scope `xpert-memory`；专题/接口/数据流/决策/关联五类 Group） |
| 查强关联（改 A 连带改 B） | `relation-lookup` / `ki_search` 命中 `tags=relation` |
| 查代码索引 | `index-lookup`（后端 `.fe-index/xpert`；前端待建） |
| 写记忆 | `ki-memory-write`（**先建子组再写 relation**） |
| 写强关联 | `strong-relation`（expert-team Step 8.5） |

## 5. 测试口径与基线

- 后端单测：`node node_modules/jest/bin/jest.js --config packages/server-ai/jest.config.ts --runTestsByPath <spec>`
- 前端单测：`node node_modules/jest/bin/jest.js --config apps/cloud/jest.config.ts --runTestsByPath <spec>`（**绕 Nx 最快**；Nx 方式 `corepack pnpm nx test cloud --testPathPattern="…" --skip-nx-cache`）
- 项目级实测记录（截至 2026-10-14）：`apps/cloud` **✅ 实测可跑（442 spec；1 个 spec 因缺依赖 `@milkdown/crepe` 失败）**——该根因波及 18 个 spec，详见 `前端专题/Agent 编排 Studio 专家/test/known-failures.md`
- **基线漂移**：所有专家资产的断言基线是 `c07bb83d`（2026-10-14 前后），仓库现为 `80f5676fd`；逐专家回源码校订后再升基线
- **复跑状态**：后端 8 专家在重建后**未复跑 jest**，`known-failures.md` 均为「待复跑确认」表；前端 Studio 专家的失败清单保留原始实测记录

## 6. 2026-10-16 事故与重建记录

| 项 | 结果 |
|---|---|
| 事故 | 工作区在 10-16 11:05 被重置：源码、`.fe-index/`、`.module-experts/` 全部丢失 |
| 恢复（后端） | 由 CodeBuddy 持久化产出重放 **227 篇** + 重合成元文件 **62 份** + 补 `租户与平台设置专家` 契约 **5 篇** + 重做批次 4 子专家契约 **14 篇** → **294 篇 / 39648 行** |
| 恢复（前端） | Studio 专家从兄弟会话持久化产出**提取 7 篇**（`implementation/02~07` + `known-failures`）+ **重建 6 篇**（`01-架构` + `C0/C1/C2/C4/C5`）→ **13 篇 / 2575 行** |
| ki | 批次 4 首写 **54 条** + 强关联 **12 条**；镜像重导 298 篇（`ki export xpert-memory`） |
| 索引 | 后端索引重扫 + 模块级专家指认 **73 行** + 业务域分组（最小重建） |
| 仍缺 | 后端专题 `T0/topic`（本次已补）· 前端 6 个专家的全部资产 · 前端索引 `xpert-cloud` · 索引逐卡「职责（AI 语义层）」行 |
