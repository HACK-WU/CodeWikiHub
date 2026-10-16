# AI对话证据回放与工具预算可配 文件索引

> 需求：`REQ-20261015-001`（状态：设计中）· 更新：2026-10-15

## 目录结构

```
2026-10-15-AI对话证据回放与工具预算可配/
├── requirement.md                      # 需求报告（R1–R7 + 影响面 + 待拍板 D1–D7 + 假设 H-01–H-06）
├── index.md                            # 本索引
├── design/
│   ├── DESIGN.md                       # 父文档（4 章：背景目标 / 一览图 / 总体方案 / 全局风险与依赖）
│   ├── S01_工具预算可配_DESIGN.md       # 子需求 S-01（覆盖 R3+R4+R7）
│   ├── S02_历史证据回放_DESIGN.md       # 子需求 S-02（覆盖 R1+R2+R6）
│   ├── S03_提示词证据复用_DESIGN.md     # 子需求 S-03（覆盖 R5）
│   └── design-review.md                # 设计评审报告（含 challenger 修订验证轮）
├── review/
│   ├── challenge-report.md             # challenger 二次质疑报告（含处置记录）
│   ├── scenario-rehearsal.md           # 场景推演报告（7 场景 / 0🔴 1🟡 3🟢）
│   └── code-review.md                  # 代码审查记录（auto-review → code-review 自查，修复 4 项）
└── demo/
    ├── verify-report.md                # demo 验证报告（真实上游对照探测，含实测数据与结论）
    ├── probe.mjs                       # 探测原型（可丢弃；不改产品代码）
    └── result.json                     # 原始实测数据
```

## 文件说明

| 文件 | 说明 |
|---|---|
| `requirement.md` | 需求报告。现状取证 13 条（🟢 代码直读）、「现状 → 预期」数据流图 + 配置界面 ASCII 图、变更点表、需求清单 R1–R7（含验收标准）、影响面 11 行、负向需求 8 条、待确认 D1–D7、假设 H-01–H-06、复杂度评估（中偏高） |
| `design/DESIGN.md` | 总体设计。子需求节点图、落点总览、接口契约变化 5 行、全局风险 7 条、共享术语速查 7 条、**交付顺序（S-03 → 实测 → S-01 → S-02）** |
| `design/S01_工具预算可配_DESIGN.md` | 配置字段两级存储、硬上界常量、`ki_search.limit` 放开（maximum=50、去 default）、**预算注入在执行必经点**、`serializeToolResponse(limit)` + `ChatToolResponse.limit`、配置界面新分组、6 条决策点、3 条待定问题 |
| `design/S02_历史证据回放_DESIGN.md` | 新增 `replay.ts`、切轮与**两级去重**、双预算（5 轮 + 20000 字符，含推导与总量估算）、放置位置=本轮 user 末尾、压缩联动、构造异常降级、5 条决策点、**9 项验证标准**（含成本/延迟）、5 条待定问题 |
| `design/S03_提示词证据复用_DESIGN.md` | 三处文案改动 + 数字去写死（6 处）、数据模型（5 个文案载体与生效条件）、生效范围与漂移处理、N17 护栏、4 条决策点 |
| `design/design-review.md` | 设计评审：首轮 1🔴+5🟡+3🟢（已修复）+ 增量再审 + challenger 修订验证轮（0🔴/0🟡） |
| `review/challenge-report.md` | challenger 二次质疑：1🔴（预算注入点错位）+ 4🟡 + 2🟢 + 2 条补充场景；含逐条处置记录 |
| `review/scenario-rehearsal.md` | 场景推演：4 角色 / 7 场景 / 7 条全局判据回扣；发现 1🟡（两个旋钮的组合未防护）+ 3🟢；结论 ⚠️ 有条件通过（未实际执行） |

## 待补（后续阶段产出后回填）

| 预期文件 | 来源 | 说明 |
|---|---|---|
| `test/test-plan.md` | `test-planner` | 测试计划（可选） |
| `demo/verify-report.md` | `demo-verify` | S-02 的执行性证据（上游长消息容忍度 + 成本/延迟） |
| `api/INDEX.md` | `api-design` | API 设计（prompt-config 接口增量） |
| `report.md` | 实施完成后 | 实现总结报告 |
