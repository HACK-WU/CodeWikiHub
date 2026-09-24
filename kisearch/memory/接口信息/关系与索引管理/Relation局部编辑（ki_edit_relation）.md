---
groupPath: 接口信息/关系与索引管理
relation: Relation局部编辑（ki_edit_relation）
exportedAt: "2026-09-24T09:28:08.717Z"
---
【接口信息｜Relation 局部编辑】2026-09-24 实测新增。
- MCP: ki_edit_relation（src/lib/mcp-tools/edit-relation.ts）→ executeEditRelation @ src/edit-relation.ts（daemon client 优先，否则 executeEditRelationLocal）；草稿层 src/lib/relation-edit-draft.ts，发布层 src/lib/relation-edit-publish.ts，正本读取 src/lib/relation-edit-live.ts。
- 定位：局部修改**已有大 Relation**（行区间编辑）；小 Relation 直接 ki_sync_relation 全量提交更省事。
- 四 action：edit / view / finish / cancel。
  - 首次 edit：必须传 group + relation + expected_revision（= ki_get_module_info 返回的 revision，即 contentRevision = sha256(正文)）；返回 editId + 草稿 revision + totalLines + previews(before/after 前 400 字)。
  - 后续 edit：传 edit_id + expected_revision（用草稿返回的 revision）；支持多轮，每轮多区间（1-based、含 end_line、不重叠，按调用前草稿行号）。自动探测并归一 CRLF/LF；越界/重叠/空正文报错；删除文末会保留单个结尾换行（原文末尾无换行的文档无法逐字节还原，revision 会变）。
  - view：可选 start_line/end_line 局部查看；返回 status/revision/baseRevision/totalLines/content(+wikiSynced/wikiReason)。不带区间会返回全文，建议总带区间。
  - finish：需 edit_id + expected_revision + request_id（幂等，重试沿用；已 published 直接返回 published）。**异步**：返回 status=queued，需 view 轮询到 published/failed（实测本机 <1s 完成）。
  - cancel：仅允许未发布草稿；发布已开始（queued/running/published 或 failed 但已有 publishedRevision）会拒绝，需重试 finish 清理索引。
- 状态机 editing→queued→running→published；failed 带 retryable，确定性失败（正文/元数据被并发改动、chunk 超限等）retryable=false，需重建草稿。发布成功后草稿写入 kb/{scope}/.relation-edits/archive/，**published 草稿不能再 edit**，须基于新正文建新草稿。
- 并发保护：正式正文被其他入口（sync/import/edit）改动时，edit 比 expected_revision、finish 比 baseRevision+baseMetadataRevision，均报冲突拒绝覆盖。
- 实测结论（fts_test / bulk-test 测试 scope，均以权威正文 revision 还原）：fts 链路发布后 ftsIds 重建、editChunkCount 更新、旧 chunk 不再命中；dense 链路 memoryIds[i]/memoryId 指向新 docId、ftsIds 被清除；检索侧新标记立即命中、还原后不再命中。

【2026-09-24 修复后的行为契约（三方审查 P0/P1 全面修复，源码已合入工作区）】
- 草稿死胡同已消除：`failed + retryable=false + publishedRevision`（外部入口以同正文接管后 recognize 判定成立）时，finish 放行并只清理旧索引（复用 publish 的 publishedRevision 分支）；cancel 报「正文已经发布，不能取消；请沿用原 request_id 重试 finish 清理旧索引」。view 新增 `published`（正文已生效）与 `requestId`（超时后原样重试 finish）。
- retryable 语义收敛（与既有契约一致）：chunk 超限、无可索引内容 → NonRetryableEditError（retryable=false，需重建草稿）；清洗 hook 失败保持 retryable=true（外部命令可能瞬时失败）。
- 旧路径向量清理候选上界 = max(editChunkCount, memoryIds+ftsIds 数量)：editChunkCount 只由发布链路写入，Relation 被 import/sync 重写后会陈旧，单取它会漏枚举形成永久孤儿路径向量。
- 隐藏集缓存 key 现含 relations-cache 身份（mtime+size）：cache 被 import/sync 改写并合法引用被隐藏 docId 时立即解除隐藏，不再等草稿文件 mtime 变化。
- 删除卫兵（新增阻断）：delete-relation 与目录级 delete-group 在目标存在未结束草稿时拒绝，提示先 cancel/finish；损坏草稿不阻断删除（由 view/finish fail-loud）。
- 草稿归档保留上限 ARCHIVED_DRAFT_RETENTION=200（按 mtime 保留最新，清理时 stderr 告警）；超上限的历史 edit_id 查询会返回「编辑草稿不存在」。
- 快照与草稿：backupScopeSnapshot 打包时加 `--exclude <scope>/.relation-edits`；restoreSnapshotLocal 还原成功后清空草稿目录（覆盖历史快照，避免复活与还原后正文不匹配的草稿并触发中断恢复回滚正文）。
- FTS locator：已删除 original-locator.locateChunkRange 的「骨架包含」回退分支（原文空行/装饰行骨架为 '' 时 `候选.includes('')` 恒真 → 伪造行号；真实语料 1503 文档/7476 chunk 中 44 次伪造、0 次真阳性），无可复核锚点一律返回 undefined。
- 搜索兜底：锚点跨度 < chunk 行数且范围内无命中时，放开范围按 chunk 词项在整篇原文兜底，并置 matchCountComplete=false + matchesTruncated=true（显式降级）；全文聚合补齐 matches 后清除 per-chunk 的 originalHint（此前会「有行号 + 说无法复核」自相矛盾）。
- 附：`ki_delete_relation` 工具描述已注明草稿卫兵；README 工具数由 13 更正为 14。