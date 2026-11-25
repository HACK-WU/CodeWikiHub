---
groupPath: 决策记录/知识治理
relation: AI 事件上报的三层分工（AGENTS 触发 · skill 执行 · 判据 SSOT）
exportedAt: "2026-11-18T04:55:49.032Z"
---
AI 事件上报采用三层分工，解决「规则装不下流程、skill 又触发不到」的两难。
- 触发层：AGENTS.md「第二原则」写 6~8 行（分流 / use_skill("event-report") / 对话回执 / refs 禁令），由 skills/agents-md-init 的 §2.1 ⑩ 与 AGENTS-template.md 写入。init 由用户手动触发，老项目拿不到触发行，故 event-report 内置「首次使用自检 AGENTS.md 有无触发行」兜底。
- 执行层：skills/event-report（SKILL.md 262 行 + reference.md）。判据 SSOT 在此，AGENTS.md 与 agents-md-init §2.5 只留指针，禁忌 🔴 29 禁止重写分流表。
- 兜底层：code-review 阶段 9、debug Step 6、design-craft 后续行动、auto-review 输出末尾各加 1~3 行 use_skill 指针。
两条硬约束（均来自真实事故）：① 默认只挂 refs 不挂 docs —— docs 会把文档分类改成 event、可见性随阶段走，首阶段 hidden 会立刻搜不到（事件 #37）；② 推终态前必看 terminalAction，trash 类型（性能优化）会把关联文档送进回收站，须先告知用户。类型不可改（无改类型工具），MCP 也不能建类型（元配置只能页面改）。
【force 清理能力】ki_event_delete 新增 force + confirm_title（错误码 1120/1121/1122），**只对无关联文档的事件生效**；有成员时拒绝并给出路：先 ki_event_docs remove 解绑或先收口。三条理由：未收口事件成员多处于 hidden/fts-only，删除要恢复可见性即改索引；moveToTrash 只写回收站条目不摘索引；可见性与索引不同步就是「hidden 仍可召回」那类静默故障。实测 37 条未收口多为测试数据（用户确认），故不做存量清账。验证：mcp-event-tools 10/10、events-sr02 19/19、governance-routes 14/14、token-readonly 28/28；tsc 7 条既有错误均在 import-budget/mcp-http/mcp-http-api/multipart，与改动文件无交集。