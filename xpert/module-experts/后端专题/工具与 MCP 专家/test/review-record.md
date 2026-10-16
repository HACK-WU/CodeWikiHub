# 评审与修复记录 · 工具与 MCP 专家（2026-10-16）

## 一、方式
2 个独立评审 agent（不参与产出）：**A 事实与契约正确性**（各抽 ≥14 条可证伪断言回源码核实 + 专项检查）· **B 完备性与交叉引用**（共享文件闭环、父子互指、外部引用真实性、R1–R7 实质性、可用性、元文件与口径一致性）。

## 二、结论
- 评审 A：抽 20 条断言逐条核实，**绝大多数一致**；发现 **P1×2**（① 「`@Exclude`+`select:false`+守卫」三层作用于 `credentials` 的表述错——实际 `credentials` **无 `select:false`**；② 自有表计数 **13 → 14**，漏算 `mcp_runtime_instance` 且自算式 2+1+1+8+2=14 与结论矛盾）与 **P2×3**（前缀枚举不全 · C1 缺邻域端点行 · 邻域表计数口径不明）+ 1 项需复核（`@Exclude` 保护依赖控制器级拦截器）
- 评审 B：**无 P0**；P1×5（父→子零链接 · 子专家 agent.md 职责截断 · 覆盖目录路径 `provider*/` 写错 · C0「何时找」缺 3 项能力面 · known-failures env 失真与缺口不具体）+ P2×10
- 判定：**可交付（修正 P1 后定稿）**

## 三、已修复
| 编号 | 严重度 | 修复 |
|---|---|---|
| A-P1-1 | P1 | `C2`/`C5` 改为**按列分层**表述：`credentials`＝序列化层（`@Exclude` + `TransformInterceptor`）+ 端点守卫；`select:false` 只列 `mcp_api_key`/`mcp_oauth_policy`/`mcp_invocation_audit`/`mcp_task`；`C5` 标题与 TOC 同步改名 |
| A-P1-2 | P1 | 自有表统一 **14 张**（工具集与工具 4 · MCP 发布 8 · Agent 插件 2；4+8+2=14），邻域表口径改「**9 张**非本域 + 2 行本域交叉引用」 |
| A-P2 | P2 | `C2` 前缀枚举补齐（`/api/mcp-publications`、`/api/mcp/p/:slug`、`/api/mcp-api-keys`、`/api/mcp-capability-catalog`）；`C1` 加「邻域端点（mcp-consumer 5 条）」指路；邻域表计数口径明确 |
| B-P1 | P1 | 父级 `C0`/`01-架构`/`agent.md` 补齐子专家链接（**生成器新增「子专家」行**，对后续所有专家生效）；元文件截断与 `**` 标记规范化；`known-failures` env 改为真 env |
| B-P2 | P2 | `01-架构` 共享项标注「展开范围」（③ 侧经 `PortablePlugin` 承接）；错字与生成器路径修正 |

## 四、复验
- 结构自检：**R1–R7 / CR1–CR10 全部通过**
- 元文件：`agent.md` 已含「子专家」链接行（父→子链路补齐）；坑条目 `**` 标记与「…」截断已规范化
- `known-failures.md`：环境变量清单只保留真 env（排除 DI token 与权限枚举）
- ki：条目已写入（scope `xpert-memory` **370** 条，镜像同步）
