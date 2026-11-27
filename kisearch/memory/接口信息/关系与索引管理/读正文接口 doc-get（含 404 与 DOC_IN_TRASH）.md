---
groupPath: 接口信息/关系与索引管理
relation: 读正文接口 doc-get（含 404 与 DOC_IN_TRASH）
exportedAt: "2026-11-25T10:55:52.062Z"
---
读单篇文档正文的 HTTP 接口；2026-11-25 起 404 会区分「已删除」与「路径/名称不对」。
- 符号: `GET /api/doc/get?scope&group&relation[&member]` → `{ok, scope, lifecycle, content}`；失败 404
- 200 走读通道，导入/向量化期间不被 MCP 写队列排队；200 响应体未变
- 404 两型：① 路径/名称不对 → 原文案「Group x 未匹配到有效路径」+ 可用清单 ② 命中回收站 → `code:"DOC_IN_TRASH"` + `trash{scope,kind(doc|group),group,name,reason,deletedAt,expiresAt,dirName}` + 文案「文档在回收站中（手动删除）」，`hint` 指回收站
- 判据: `src/lib/doc-trash-hint.ts::findDocInTrash` —— doc 条目精确匹配 group+name；组条目按路径前缀命中（整组被删，不逐篇读快照）。只在 404 路径调用，正常读零成本；空回收站是 catch 主路径，不得 warn
- 匹配键必须 trim：meta.json 的 group/name 是写入时归一的，URL 原值可能带空格（漏判坑）
- 视图模式：逐成员库查回收站且**命中即停**（不可用 `.map().find()`，它会扫完所有成员）；命中条目的 `scope` 即「原来在哪个库」；返回体另带 `view` / `searched`
- 前端: `getDocContent` 把 404 body 挂到抛出的 Error（`err.body.trash`）；`ModuleDrawer` 据此改标题「该文档已被删除」，渲染「库 · 组 · 到期日」+「前往回收站」（`setGlobalScope` 后 **SPA 跳转** `/governance/trash`，不可用 `location.assign`：硬编码绝对路径不吃 base 前缀，且 TrashPage 读 context 无需重载）
- MCP/CLI 侧文案不变（`executeGetModuleInfoLocal` 未动），区分只在 HTTP 边界
- 守卫: `test/doc-trash-hint.test.ts` 6 例 + `test/doc-trash-contract.test.ts` 3 例（静态比对前后端 DocTrashHit 字段集与 reason 值域，防事件 #99 式漂移）