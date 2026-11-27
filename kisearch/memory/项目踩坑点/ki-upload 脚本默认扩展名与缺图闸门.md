---
groupPath: 项目踩坑点
relation: ki-upload 脚本默认扩展名与缺图闸门
exportedAt: "2026-11-26T07:45:21.640Z"
---
`skills/ki-upload/scripts/ki_upload.py` 曾有同一个丢图坑（#103）：`upload-dir` 默认扩展名只有 `.md/.mdx`，图片进不了包，且脚本无缺图检测 → 服务端 md 成功、图全丢、命令看起来成功。2026-11-26 已修（未提交，离线 15 项验证）。
- 修复: `DEFAULT_EXTENSIONS = DOC_EXTENSIONS + ASSET_EXTENSIONS`（与服务端 `import.ts` 对齐）；新增 `find_missing_assets`（md+HTML 引用、剥 `./` 与查询串、剔外链/绝对路径/盘符/代码围栏内示例）；`_apply_missing_policy` 默认 `ok:false` + `stage/error` + `_exit=2`、`--allow-missing-assets` 降级；`main` 消费 `out['_exit']`，stdout 仍保留完整 taskId/import
- ★ 最大的坑: **Python 的 `posixpath.join` 不归一化 `..`**（`join("sub","../shared/s.png")` → `sub/../shared/s.png`），拿去和包内路径集合比会永远对不上、把正常引用全报成缺图；必须再 `posixpath.normpath`。Node 的 `path.posix.join` 会归一化，所以 ki-client 那边不需要这步 —— 两语言移植时最容易漏
- 测试坑: 本机没装 httpflex（未发布 PyPI），脚本顶层 import 会 `SystemExit(2)` → 必须先 stub `sys.modules['httpflex']` 再 exec 加载，才能验纯函数
- 另: 只传图时服务端 400 `OPEN_API_NO_VALID_FILE`，脚本现在上传前就拦；跨行 `<img` 属性与 4 空格缩进代码块未处理（前者漏报、后者会误报，与 ki-client 一致）
- 位置: skills/ki-upload/scripts/ki_upload.py、SKILL.md；用户级副本 `~/.codebuddy/skills/ki-upload/` 已同步