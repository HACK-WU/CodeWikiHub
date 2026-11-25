---
groupPath: 决策记录/知识治理
relation: 记忆行为口径归口 agents-md-init（rules 目录下线）
exportedAt: "2026-11-19T03:26:03.517Z"
---
把记忆行为规则（原 `rules/ai-codekb-memory.md`，343 行）的有价值内容并入 `skills/agents-md-init/SKILL.md`，规则文件下线，避免"规则文件 + skill + AGENTS.md"三处各写一份口径。
- 背景: 项目根 `rules/` 不在 CodeBuddy 加载路径（实测，见项目踩坑点「项目 skills 与 rules 目录不会被加载」），真正常驻的是用户级 `~/.codebuddy/rules/Agents_Memory.mdc`；旧规则不生效却仍被 6 处引用为"执行层真源"
- 并入: §2.5 七（平台记忆 / ki / AGENTS.md 三系统分工 + 记忆失实处理 + 禁用平台记忆 MCP 读写 ki）、§2.6（代码片段记忆：Group 树 / 分类原则 / 片段格式铁律 / 从代码构建 / 与知识库边界）、§2.7（会话收尾自查 7 项）、§5「其他数据的归档口径」、§8 禁忌 31~35
- 丢弃（skill 已有且更完整）: 速览、加载流程、缓存机制六项、归档机制全文、禁忌中已被覆盖的条目
- 引用改到: `AGENTS.md`、`AGENTS-template.md`、`skills/event-report`、`docs/agent-integration.md`（安装指引改为装 skill，不再分发 rules 文件）、`memories/memory-storage-strategy.md`、用户级 `Agents_Memory.mdc`
- 边界: skill 不常驻，常驻强制力仍由用户级 alwaysApply 规则 + AGENTS.md 置顶三原则提供（skill §7）
- 代价: 详细口径只在加载 skill 时可见；若将来需要常驻版，应同步进用户级规则而非复活 `rules/`