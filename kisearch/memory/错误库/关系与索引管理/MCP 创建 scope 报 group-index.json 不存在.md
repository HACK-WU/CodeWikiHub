---
groupPath: 错误库/关系与索引管理
relation: MCP 创建 scope 报 group-index.json 不存在
exportedAt: "2026-10-14T09:29:06.932Z"
---
【错误库｜MCP 创建 scope 报 group-index.json 不存在】

- 报错原文片段：{"ok": false, "error": "group-index.json 不存在"} —— MCP 工具 ki_manage_index_create 传 {"scope":"<全新scope>","name":"<节点名>"} 时返回；CLI ki manage-index --scope <全新scope> --action create 同样报此错。
- 现象：对尚未初始化的 scope 调 ki_manage_index_create（或 CLI create）必现失败且不创建任何目录；而工具描述承诺「scope 不存在则自动创建」，同族工具 sync-relation / bulk-sync-relation / import / edit-relation / query-group / get-module-info 都能自动初始化 —— 属实现遗漏导致的口径不一致（scopeMode: default 下任意 scope 本应可自动创建）。
- 根因：src/manage-index.ts 的 executeManageCreateLocal 在 validateScope + assertNoPendingVectorMigration 之后直接 readGroupIndex(scope)，读到 null 即返回错误，缺少 ensureScopeDir 这一步；CLI 非 daemon 分支同样缺。测试全部先用 initScope 预建 scope，故长期未暴露。
- 解法：① executeManageCreateLocal 在 readGroupIndex 之前加 ensureScopeDir(scope)（该函数幂等：scope 已初始化时零写操作；strict 模式下未注册 scope 会 fail-loud 并给注册指引）；② CLI 非 daemon 分支仅在 action === 'create' 时补 ensureScopeDir，delete 不补（保持「无对象可删」语义与原有报错）；③ 返回体加 createdScope: true 标注本次新建 scope，便于发现 scope 名笔误；④ 参数校验前置 —— 缺 name / name 含 '/ ' 的无效调用必须先于 ensureScopeDir 返回，否则无效调用也会把 scope 建出来（MCP 路径与 CLI 本地分支都要前置）。⚠️ daemon 进程内模块不热更，必须重启 ki daemon 才生效。
- 验证方式：隔离 HTTP MCP（createMcpHttpServer + buildKiMcpServer，临时 config 与 dataDir，不碰 7423）调 ki_manage_index_create 于全新 scope → ok:true + createdScope:true 且 group-index.json 落盘；反例 ki_manage_index_delete 于全新 scope 仍 ok:false 且不建目录；缺 name / name 非法同样不建目录。回归：npx jiti test/manage-index.test.ts（15 例）、test/error-handling.test.ts（15 例）、test/integration.test.ts（10 例）、test/chat/mcp-tool-registry.test.ts（16 例）、npm run build（tsc）0 错；验证脚本 temp/verify-mcp-manage-create-scope.ts（13/13）。
- 关联方案：无（修复为两处 ensureScopeDir + 参数校验前置 + 测试转正到 test/manage-index.test.ts，未单独沉淀 .solutions）