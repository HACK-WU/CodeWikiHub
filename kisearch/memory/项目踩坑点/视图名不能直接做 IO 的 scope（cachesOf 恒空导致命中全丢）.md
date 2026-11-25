---
groupPath: 项目踩坑点
relation: 视图名不能直接做 IO 的 scope（cachesOf 恒空导致命中全丢）
exportedAt: "2026-11-18T08:16:21.548Z"
---
用视图名（如 kisearch-docs）做检索范围的**回显**可以，但拿它去做 IO 会把结果全丢，而且不报错。

- 现象：recall 内核（2026-11-18 实现期）按 targets 逐个 `search(scope)` + `cachesOf(scope)` 判定可见性；视图不是物理库，`readAllGroupCaches(视图名)` 恒为空 ⇒ 每篇命中都走到「索引里已不存在」分支被丢弃，候选恒 0，日志无异常。
- 根因：`targets` 是「调用方点了什么」的语义集合，`cachesOf` 与可见性判定要的是**物理库**；两者不是同一维度。
- 修法：范围解析结果拆两个字段 —— `targets`（回显，可能含视图）+ `physicalTargets`（视图展开为成员库、去重、≤12）；**检索、cachesOf、可见性全部只用 physicalTargets**，候选条目的 `scope` 也必须是物理库（否则 nextActions 调 `ki_get_module_info` 读不到正文）。
- 规模口径：检索次数 = 2 × physicalTargets，所以 `MAX_TARGETS`（点几个，6）与 `MAX_PHYSICAL`（查几个库，12）必须分开限。
- 位置：`src/lib/recall/targets.ts`、`src/lib/recall/fast-recall.ts`；回归 `test/recall-kernel.test.ts`「scope 传视图时检索落到成员库」。同类坑：任何「按 scope 读分片缓存」的地方都要先展开视图。