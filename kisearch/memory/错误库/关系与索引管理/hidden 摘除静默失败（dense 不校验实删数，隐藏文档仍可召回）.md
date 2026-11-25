---
groupPath: 错误库/关系与索引管理
relation: hidden 摘除静默失败（dense 不校验实删数，隐藏文档仍可召回）
exportedAt: "2026-11-17T03:30:28.565Z"
---
hidden 文档仍能被语义召回：`applyVisibility` 摘除 dense 只看 `vectorDelete.errors`、不看 `deleted`，cache 的 memoryIds 失效时「删 0 条」仍记成功；读侧也没有 hidden 过滤兜底。

**现象与复现（2026-11-16，证据 `.debug/delete-vector-residual-20261116/` E-04）**：sync 写入后把 cache.memoryIds 改为不存在的 id → 事件绑定（et_1 / 排查中 = hidden）→ 返回 `visibilityFailed: []`、`mode: hidden`；`ki doc list` 仍剩该文档的 ki-search 向量；`ki search` **直接召回**（vectorScore 0.958）。同一次摘除里 ki-relation 被成功删除（docId 可重算），证明失败点只在按 ids 删除的 dense。

**根因**：`src/lib/visibility-index.ts` dense 分支 `if (res.errors.length > 0) throw` 之后直接 `removed.push(kind)`；对照 fts 分支检查 `failed > 0`，可见是遗漏而非有意。且摘除成功后**不清理 cache 的 memoryIds** —— 这批 id 成为永久的死指针，毒化 group-delete / rebuild-vector / fts-rebuild。

**已修复（2026-11-16，未提交）**：① dense 摘除核对实删数：`deleted < ids.length` 时先用正文重算 docId 补删，仍为 0 才付一次检索比对（先 `ensureVector()` fastFail），都删不掉记 `failed` + 写 `visibility-failures.json`；② 摘除成功后 `clearDenseIdsInCache` 清掉死指针（hidden → full 补写会回写）；③ ki-relation 摘除改用 `relation-path-vector` 共享实现，分块 `relation-NN` 也能摘掉。
★ 连带踩坑：`vectorDelete` 对不存在的 collection 会打开/创建空库并留常驻句柄（单测进程不退出），已用 `scopeCollectionExists` 前置短路。

- 位置: `src/lib/visibility-index.ts`、`src/lib/relation-path-vector.ts`
- 验证: `test/visibility-dense-delete.test.ts` 6/6 · `test/visibility-sr03.test.ts` 19/19 · 真机：hidden 后召回 0 条、摘除后 cache memoryIds 已清空
- 未修（既有）: 读侧无 hidden/删除态过滤，完全依赖写侧摘索引
- 状态: 已修复（代码未提交）