---
groupPath: 决策记录/事件页
relation: 事件文档归属三分法（产物 docs 与证据 refs）
exportedAt: "2026-11-19T07:08:47.264Z"
---
事件与文档的关系分三类，取代旧的「AI 上报一律挂 refs、不挂 docs」禁令。
- 判据：这件事收口之后，这份文档还有独立存在的意义吗？没有 → 产物，挂 docs（改分类为 event、可见性随阶段）；有 → 证据，挂 refs（零改动）；都无关 → 不挂
- 被推翻的旧判断：「默认只挂 refs，不挂 docs」—— 它把事件 #37 事故的可见性副作用当成了禁令，同时又与 ki-upload 的 `--lifecycle event --event` 通道直接矛盾（两个 skill 给 AI 互斥指令）
- 顺序铁律：**先挂 docs，再推终态**。`bindMembers` 对已收口事件直接抛 EVENT_CLOSED，所以旧 skill 里的「终态例外」在实现上不可能成立
- keep 类型的终态动作会把产物文档转回 wiki 并解绑（继续可检索）；trash 类型（性能优化）会送进回收站，挂前必须跟用户确认
- 数据源文档（isImported=true）改分类被拒（DATASOURCE_LIFECYCLE_LOCKED），只能走 refs
- 同一篇不能既 docs 又 refs（REF_ALREADY_ASSOCIATED）；升级要先 refs remove 再 docs add
- 落点：skills/event-report §5/§6/§7/禁忌 3+14、reference 案例 1、AGENTS.md 第二原则、agents-md-init 模板与 SKILL