---
groupPath: 错误库/关系与索引管理
relation: 冷热分区上限为负数抛 RangeError
exportedAt: "2026-10-30T03:06:19.717Z"
---
【错误库｜冷热分区上限为负数抛 RangeError】2026-10-30
- 报错原文片段：`RangeError: Invalid array length`，栈落在 partitionByScore 的 hot.length = maxHotCount。
- 现象：任何展示分区的命令（ki group list、ki group list --mode hot）直接崩溃，报错不含 scope 或 Group，看不出是哪个 scope 的 partition_config 坏了。
- 根因：src/lib/scoring.ts:200-201 用 hot.length = maxHotCount 做截断，负数赋数组长度在 V8 抛 RangeError；partition_config 读取只做整体回退（src/lib/group-cache.ts:182/296/463 的 ?? DEFAULT_PARTITION_CONFIG），没有字段级校验——缺 hotPercent / warmPercent 时 NaN 传播会让冷热分层退化（大量 Group 全进热区），负数则直接抛错。
- 解法：① 应急：把该 scope .relations/manifest.json 里的负数改成非负整数（0 表示该区不展示）；若想回到默认值，删掉整个 partition_config 对象（整体回退，不做字段级合并）后重跑；② 根治（待拍板）：partitionByScore 对 maxHotCount / maxWarmCount / maxColdCount 取 Math.max(0, …)，读路径补字段级校验，不合法时报结构化错误而非 RangeError。
- 验证方式：ki group list --scope <scope> --mode full --hot-count 50 正常渲染，热 + 常温 + 冷三区之和等于 Relation 总数；test/lib.test.ts 分区用例全绿。
- 关联方案：无