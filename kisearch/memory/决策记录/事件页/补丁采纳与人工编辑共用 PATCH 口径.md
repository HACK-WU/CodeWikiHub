---
groupPath: 决策记录/事件页
relation: 补丁采纳与人工编辑共用 PATCH 口径
exportedAt: "2026-11-24T03:27:32.701Z"
---
结论/链路这类「AI 产物」既**不允许人工手改**、又**必须能被追问补丁覆盖**，两条需求共用同一个 `PATCH /analysis` 入口。口径（沿用 H13）：**接口接受该字段，编辑态 UI 不提供输入**。

- 追问补丁的采纳动作就是前端调 `PATCH /analysis`（带 `acceptedProposalTurnId` 仅做审计标记），所以补丁能带的字段，PATCH 必须能收。
- 若按「结论不可人工编辑」把字段从 PATCH 白名单里摘掉，补丁就**永远带不上该字段** —— 需求 U8 初版就是这个错（写成「PATCH 不加该字段」），2026-11-24 设计阶段更正。
- 实现位置：`src/lib/governance-http.ts` 的 PATCH 白名单（`has('dataFlow') ? ... : {}`）+ `saveDraftEdits`；人工编辑页 `AnalysisEditor` 不渲染对应输入框。
- 判定口径：**该字段能不能手改 = 只看 UI 有没有输入框，不看 PATCH 白名单**。
- 关联：REQ-20261124-001 设计 S-03 §3.2。