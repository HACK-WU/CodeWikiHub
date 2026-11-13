---
groupPath: 决策记录
relation: 上传即回写（Web 上传与对外上传接口）
exportedAt: "2026-11-13T03:08:43.739Z"
---
把「导入完成即写回 wiki」从 CLI 独有扩到上传通道：Web 上传页与对外上传接口都写回，数据源同步与「重试未完成」不写回（2026-11-13 用户拍板）。

- 背景: 对外上传接口 `/open/v1/import/upload` 导入成功但 `wikiSync.sourceDir` 无文件；根因是 HTTP 三条链路共用的 `runImportJob` 从未把 `wikiWriteback` 传给 `handleDirectImport`，只有 CLI `ki import` 传 true
- 落点: `src/lib/mcp-http-api.ts`（`RunImportArgs` 增 `wikiWriteback` 并透传；`/api/import/run` 与分步 finalize 传 true）、`src/lib/open-api/routes/import.ts`（传 true；status 的 `result` 增 `wikiWriteback {written,skipped,failed}`，**不含** targetDir 与失败 reason）
- 语义: 仍只补缺不覆盖；未配 `wikiSync.sourceDir` 零副作用；写回失败不阻塞导入
- 边界: 重试未完成不写回；daemon 重启后 status 回台账快照，无 wikiWriteback
- 验证: 新增 `test/open-api-upload-wiki-writeback.test.ts` 5/5（真实 multipart 端到端）、`wiki-import-sync` 9/9、`tsc` 0；daemon 重启后真机 curl 上传 → `result.wikiWriteback {written:1,skipped:0,failed:0}` 且 wiki 文件生成（验证数据已清理）