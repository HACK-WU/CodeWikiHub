---
groupPath: 项目踩坑点
relation: ki-client 附件目录白名单与服务端口径不一致
exportedAt: "2026-11-26T07:36:08.432Z"
---
ki-client `upload-dir` 曾只收路径里含 `assets/` 的图片（服务端根本不按目录判附件），导致 `images/` 下的图静默丢包 —— 事件 #101，2026-11-26 已修复并提交（`ed48aff` 客户端去目录判定、`1c3ebf3` 服务端跳过数分离，94 例）。
- 服务端口径: 按「md 所在目录 + 正文相对引用」找附件，落 `{group}/assets/<ref 原文>`；上传校验按扩展名判，不看目录
- 修复要点: `isWanted` 去目录判定（任意目录白名单图都收）；`groupDocs` 用 `refCandidates`（`join(dirname(docRel), ref)` + ref 原样兜底）；`extractImageRefs` 补绝对路径/协议相对过滤；缺图默认退出码 1 + `--allow-missing-assets`（新 flag 必须登记 `args.ts::BOOL_FLAGS`，否则报未知参数）；单文件模式 `uploadedRelFor` 用 cwd 相对
- 两个易漏的坑: **空跑分支**也要复算缺图（否则「报过缺图 → 原样重跑」会静默返回 0）；**单文件 rel 语义变了**（`upload x/a.md` 落 `x/a.md`，原为 `a.md`）
- 验证坑: 上传根下的子目录会被拼进 group（`--group 验证/101` + `01-总览/a.md` → `验证/101/01-总览`），取图时 group 要对齐完整路径
- 同类出口: `skills/ki-upload/scripts/ki_upload.py` 默认扩展名只含 `.md/.mdx`（已上报 #103）
- 位置: ki-client/src/commands/upload.ts、test/upload-group.test.mjs