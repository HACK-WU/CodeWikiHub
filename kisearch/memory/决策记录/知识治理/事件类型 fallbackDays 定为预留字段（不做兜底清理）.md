---
groupPath: 决策记录/知识治理
relation: 事件类型 fallbackDays 定为预留字段（不做兜底清理）
exportedAt: "2026-11-25T09:12:02.105Z"
---
`EventTypeRecord.fallbackDays`（默认 90，null 关闭）定为**预留字段**：当前无任何消费点，也没有 UI 入口（`web/src` 只有 API 类型声明），配了不会让事件自动收口。2026-11-25 拍板不做实现，事件 #76 以「标为预留」收敛。

- 落地：`src/lib/events/types.ts` 注释写明「无清理任务消费」；`governance-contract.ts` 的 `EventTypeDto` 标注预留；`type-service.ts` 头注释把旧说法「末位停用只能靠 fallbackDays 兜底清理」改成「兜底任务从未实现，这条约束现在是硬的」；`ki_event_type_list` 输出新增 `fallbackDaysNote`，防 AI 把「90 天」当保障转述给用户。
- 备选（未采纳）：仿回收站 `purgeExpired` 做惰性 sweep，按最后一次阶段日志计时 —— 理由是无人在用该字段，且 `terminalAction=trash` 的类型到期自动收口会把成员文档丢进回收站，属破坏性动作。
- 真正的护栏在别处：末位阶段不可停用由 `TERMINAL_STAGE_CANNOT_DISABLE`(1108) 拦住，报错文案本身就是「停用后该类型的事件永远收不了口」。
- 恢复路径：日后要真做清理，重开 #76 走方案 A（含计时起点定义 + dryRun + trash 类型告知）。
- 注意：字段仍照旧透传（HTTP DTO / MCP），不删不加，避免破坏已有客户端。