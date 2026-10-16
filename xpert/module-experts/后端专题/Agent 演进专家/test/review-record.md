# 评审与修复记录 · Agent 演进专家（2026-10-16）

## 一、方式
2 个独立评审 agent（不参与产出）：**A 事实与契约正确性**（各抽 ≥14 条可证伪断言回源码核实 + 专项检查）· **B 完备性与交叉引用**（共享文件闭环、父子互指、外部引用真实性、R1–R7 实质性、可用性、元文件与口径一致性）。

## 二、结论
- 评审 A：抽 20 条断言，**绝大多数一致**；发现 **P1×1**（`04-模型` 自证覆盖面表述自相矛盾——「缺 learning_event 之外的 6 张」字面读作 learning_event 也缺）与 **P2×1**（`05-接口` 权限表计数 9 与标题 8 冲突）+ 1 项需复核
- 评审 B：**无 P0**；P1×3（父→子零链接 · `agent.md` 覆盖目录路径写错 · C0「何时找」缺 6 项能力面）+ P2×8；**跨端一致性**为质量亮点（后端多 5 条端点、`pending` 差异、45/44 差额三项均已显式澄清并给出回写建议）
- 判定：**可交付（修正 P1 后定稿）**

## 三、已修复
| 编号 | 严重度 | 修复 |
|---|---|---|
| A-P1-1 | P1 | `04-模型` 自证句改写为「只核对 13 张，缺 `diagnosis`/`event_cluster`/`experience`/`canary_test_override`/`runtime_observation`/`job` 共 6 张（`learning_event` 已覆盖）」 |
| A-P2-1 | P2 | `05-接口` 权限计数改「读 3 + 写 5 = 8」 |
| B-P1 | P1 | 父级补子专家链接（同生成器修复）；`agent.md` 覆盖目录路径按 SCOPE 修正；`C0`「何时找」按能力清单补齐缺口项 |
| B-P2 | P2 | 错字 `ACtiveKey`→`activeKey`；`C1` 示例加「占位需替换」标注；`known-failures` 补真 env（`AGENT_EVOLUTION_PERSISTENCE_E2E`、`AGENT_EVOLUTION_ENABLE_CONFORMANCE`、`DB_SCHEMA_SYNC_MODE`） |
| 跨端 | — | 后端资产已记录前端未列的 5 条端点与 `pending` 契约差异，并**在本轮回写前端资产**（见下） |

## 四、复验
- 结构自检：**R1–R7 / CR1–CR10 全部通过**
- 元文件：`agent.md` 已含「子专家」链接行（父→子链路补齐）；坑条目 `**` 标记与「…」截断已规范化
- `known-failures.md`：环境变量清单只保留真 env（排除 DI token 与权限枚举）
- ki：条目已写入（scope `xpert-memory` **370** 条，镜像同步）
