---
groupPath: 错误库
relation: 治理视图部分成功被静默（buckets.error 无人消费 + hasMore 无人读）
exportedAt: "2026-11-20T07:16:38.595Z"
---
治理页在知识视图（多库聚合）与单库两种模式下，后端都会把「某个库读失败」「还有更多没加载」写进响应字段（`buckets[].error`、`hasMore`），整体仍返回 200 + ok:true，而前端原先从不读这些字段 —— 页面表现为「某库数据凭空少了」或「100 条之后凭空没了」。

- 现象: 分类/回收站/事件三页与侧栏 badge、事件页页头计数都不出声，数字静默偏小。
- 影响面（四处）: `docs` / `trash` / `events`(列表) / `counts`（侧栏 badge + 事件页页头共用）。前期只修了前三处的列表通道，**counts 通道被复审抓出漏修**。
- 根本原因: 视图聚合按「完全成功」的契约交付「部分成功」的结果 —— `GovernanceViewMeta.buckets` 声明了却零消费者。
- 附带坑（实测）: 读取层把「成员库目录不存在 / 是普通文件 / group-index.json 损坏」吞成空结果，这类失败**连 buckets[].error 都不产生**。
- 修复: `web/src/lib/governanceView.ts` 新增 `govFailedMembers`/`govFailedNotice`/`govFailedTitle`/`govLoadedNotice`/`govMergeFailed`；三页提示条、`EventsPage` 视图提示（只留状态）、单库截断提示、`AppShell` 侧栏 `*` + title 全部接入。事件页 `viewMeta.failed` 取列表与 counts **两路并集**（两路各自 try/catch，集合不保证相同）。
- 验证: `test/governance-view-partial.test.ts` 15/15；浏览器实测（`.debug/governance-view-partial-20261120/`）——视图/单库截断句、无异常时 0 行、counts 注入后侧栏 `303*`/`44*`/`6*` + title、事件页读失败句。
- 残留: `buckets[].error` 的产出面需后端补「成员库可读性」判定（返回语义变更，待拍板）；`buckets[].total` 未展示（只用于提示判断）。