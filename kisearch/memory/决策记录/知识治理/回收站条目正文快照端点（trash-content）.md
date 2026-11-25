---
groupPath: 决策记录/知识治理
relation: 回收站条目正文快照端点（trash-content）
exportedAt: "2026-11-23T09:57:41.948Z"
---
回收站条目可点开看删除时的正文快照（`content.md`），图片附件也能显示；**不能复用 `/api/doc/get`** —— 文档进站时已从 KB 摘除，doc/get 必然 404。
- 符号: `GET /governance/trash/content?scope&group&dirName` → `{ ok, content, empty, sizeBytes, hasAssets, reason, deletedAt, expiresAt, ttlDays }`
- 位置: `src/lib/governance-http.ts`（trash 分支）、`src/lib/trash-store.ts`（`readTrashItem` / `isSafeTrashDirName`）、`web/src/api/governanceApi.ts`（`getTrashContent`）、`web/src/pages/TrashPage.tsx`
- 状态语义: 组条目 400 `TRASH_GROUP_NO_CONTENT`（没有单篇正文）；条目不存在 404 `TRASH_NOT_FOUND`；meta 损坏 409 `TRASH_CORRUPTED`；**正文缺失 200 + `empty:true`**（历史坏条目是既定事实，页面解释而不是报错）
- 安全: `dirName` 是单段目录名，必须过 `isSafeTrashDirName`（禁 `/` `\` `.` `..` `\0`）—— `path.join` 会把 `../` 归一化掉，未校验时 content 变任意读取、purge 可变 `rmSync(recursive)` 删宿主机任意目录（事件 #80，2026-11-23 已修并收口）
- 附件寻址（2026-11-23 打通）: `/api/asset?...&trash=<dirName>` 改为从 `.trash/{group}/{dirName}/assets` 读 —— `writeTrashItem` 入站时把 group 级 assets 整目录复制进条目，原位置在整组被删后已不存在。解析收口在 `resolveAssetDir(scope, group, trashDir)`（`src/lib/mcp-http-api.ts`）：group 必须是干净相对段序列、trash 必须单段、结果必须落在 KB 根内；不带 `trash` = 原行为，既有调用方零影响
- 前端链路: `TrashPage` 传 `assetTrashDir={dirName}` → `ModuleDrawer` 转成 `AssetBase.trashDir` → `MarkdownPreview.rewriteAssetSrc` 拼 `trash` query（`useMemo` 依赖含 `trashDir`）
- 前端三处实现约束: ① fetcher 必须 `useCallback` 固定引用（`ModuleDrawer` 把它列进取数 effect 依赖，内联箭头函数在失败态会无限重试）；② `key` 必须含 `dirName`（同 group+name 可能有多份回收条目）；③ 抽屉 `scope` 用条目所属库（视图下顶栏是视图名），并传 `notice` 常驻提示「回收站快照」，不传 editable/onDeleted/onMoved
- 验证: `test/trash-content-route.test.ts` 8 例 + `test/asset-trash-dir.test.ts` 7 例；真机（原 assets 已删场景）不带 trash → 404、带 trash → 200 image/png，UI 抽屉内 `img.naturalWidth=1440`、src 带 `trash=`