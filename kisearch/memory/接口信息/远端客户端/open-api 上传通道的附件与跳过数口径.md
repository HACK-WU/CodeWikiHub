---
groupPath: 接口信息/远端客户端
relation: open-api 上传通道的附件与跳过数口径
exportedAt: "2026-11-26T07:13:25.225Z"
---
`/open/v1/import/upload` 的两条通道（multipart 与 tar.gz）对「附件」与「跳过数」的口径在 2026-11-26 统一为文档 / 附件 / 真跳过三分类。
- 修复前: multipart 的 onFileStart 只认文档扩展名 → 图片一律 reject，这才是「multipart 不落附件」的真正根因（客户端因此改成带图走 tar 规避）；tar 分支把所有条目都解包落地，却把图片算进 `skipped` 并写原因「扩展名不支持」→ 调用方（尤其 AI agent）看到 skipped>0 以为图没传上去
- 修复后: multipart 按 `assetExtensions` 收附件、上限用 `maxAssetSize`（沿用文档那 1MB 会把截图拦掉）；`scanContent` 产出三分类；`ReceivedUpload.assets` 新增；响应 `files = {saved(文档数), assets(附件数), skipped(真丢弃), skippedSample}`。`saved` 语义因此**收窄**（原为「收下的文件数」）
- 只传图时: 仍返 400 `OPEN_API_NO_VALID_FILE`，但 `files.assets` 回真实识别数（不是 0）且文案写明「其中 N 个是附件/图片，需与引用它的 md 同批上传」；tar 分支的 saved===0 也不再把它归 0
- multipart 落点陷阱: 文件名即落点相对路径。`curl -F "files=@a/b.png"` 只发 `b.png`，正文里的 `./a/b.png` 对不上；要带目录必须 `;filename=a/b.png`（真机验证：落 `{group}/assets/images/arch.png`）。tar.gz 天然保留路径，不用管
- 真机验证（2026-11-26）: multipart 同目录图、multipart 子目录图（`;filename=`）、tar 均 `saved:1 assets:1 skipped:0` 且图落预期路径；只传图 → 400 + assets:1
- 位置: src/lib/open-api/upload-stream.ts（receiveMultipart / receiveTar / scanContent）、src/lib/open-api/routes/import.ts；测试 test/open-api-upload-scan.test.ts