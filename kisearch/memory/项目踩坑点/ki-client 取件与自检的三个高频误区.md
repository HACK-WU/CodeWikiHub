---
groupPath: 项目踩坑点
relation: ki-client 取件与自检的三个高频误区
exportedAt: "2026-11-25T10:45:39.676Z"
---
ki-client 跨机取件时最容易误判的三处，均已在 2026-11-25 实机踩到并写进文档与错误码表：把「没指明库」当成「token 失效」、把文档标题当 relation、把附件失败当整体失败。

- **ping 不带 --scope → 403**：服务端缺省按 `default` 库判权（`DEFAULT_SCOPE`），Token 未授权 default 就返回 403 `OPEN_API_SCOPE_FORBIDDEN`，看起来像 token 无效，实际只是没指明库；补 `--scope <已授权库>` 即通过。403 响应刻意不回显授权清单（防跨租户枚举库名）→ 要看清单只能靠 ping 成功时的「授权库」行，或去 ki 所在机器 `ki mcp token list`
- **relation 是落库文件名不是标题**：`doc get` / `asset get` 的 `--relation` = 导入时 basename 去 `.md`（`deriveRelationText`），不是正文 H1/文档标题；服务端 `noVectorFallback` 精确匹配，不一致一律 404 `OPEN_API_NOT_FOUND`。撞名走后缀策略时 relation 会带后缀，以导入结果回显或 `ki_get_module_info` 为准
- **doc get 退出码 1 ≠ 整体失败**：正文先落盘、附件逐个取，退出码 1 只表示有附件没取到；外链图片（服务端标 `supported=false`，或 ref 自带 scheme）必然失败属正常现象；只要正文加 `--no-assets`（退出码即 0）；脚本判定看 `--json` 的 `markdown.file` 与 `failed`
- 位置：`skills/ki-client/SKILL.md`（错误码表 + 取件口径）、`docs/ki-client.md`（ping 段 / doc get 段 / 排障表）、`docs/open-api.md`（ping 的 scope 缺省行为）、`ki-client/src/cli.ts`（--help 补 ping [--scope]）