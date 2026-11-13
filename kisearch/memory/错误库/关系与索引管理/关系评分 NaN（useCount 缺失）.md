---
groupPath: 错误库/关系与索引管理
relation: 关系评分 NaN（useCount 缺失）
exportedAt: "2026-10-30T03:06:19.166Z"
---
【错误库｜关系评分 NaN（useCount 缺失）】2026-10-30
- 报错原文片段：无异常抛出，但 CLI 渲染出 `(score: NaN)`；或该 Group 聚合分为 0 且排序垫底（组内 Relation 明明有使用记录）。元素为 null 时报 `TypeError: Cannot read properties of null (reading 'useCount')`。
- 现象：单条评分显示 NaN；Group 聚合分恒为 0、排名永远靠后；元素为 null 时整条命令裸抛 TypeError，错误信息不含 scope 与 Group。
- 根因：calculateScore 只挡 useCount === 0（src/lib/scoring.ts:86），undefined 会走到 undefined/(1+小时数/半衰期) 得 NaN；Group 聚合在 src/query-group.ts:223 累加后为 NaN，而 query-group.ts:261 用 groupScores.get(p) || 0 兜底 —— NaN 是 falsy，被静默吞成 0 分；渲染侧 fmtScore（query-group.ts:287）对 NaN 直接 toFixed，输出 "NaN"。缓存校验只判断 hot_relations 是数组，不校验元素形态。
- 解法：① 应急：手工给该 Relation 补 useCount（整数，无使用记录填 0）与 lastUsedTime（null 或毫秒时间戳），或删除后用 ki sync-relation 重写；② 根治（待拍板）：calculateScore 对 useCount / lastUsedTime 做数值兜底，聚合侧改用 Number.isFinite 判定而非 || 0，并把缓存校验扩到元素层。
- 验证方式：ki group list <group> --mode full --hot-count 50 不再出现 score: NaN，Group 聚合分与组内 Relation 评分同序；test/lib.test.ts 全绿。
- 关联方案：无