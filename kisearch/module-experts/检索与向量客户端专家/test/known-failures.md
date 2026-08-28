# 已知单元测试失败：检索与向量客户端专家

## test/cli-aliases.test.ts:REQ-11 短别名帮助输出

- **失败用例**：`ki scan-kb diff -h 帮助应含 "-o, --output"`
- **执行方式**：`env -u NODE_OPTIONS -u BASH_ENV npx jiti test/cli-aliases.test.ts`
- **失败时间**：2026-08-28（专家更新时实测发现）
- **失败原因**：断言错误——`expected: true, actual: false`。测试用例表第 50 行声明 `{ cmd: 'scan-kb', helpArgs: ['diff'], short: '-o', long: '--output' }`，但 `ki scan-kb diff` 子命令已于 2026-08-14（commit `fce0b57`「移除 rootName 概念，统一 group 语义，新增目录级删除与回收站」）随增量导入模式一并移除。`src/scan-kb.ts` 当前只剩 `import` 一个子命令，故 `-h` 帮助输出中不存在 `-o, --output`。
- **修复尝试**：未修复——该用例属跨模块 CLI 规范测试，删除/替换需确认是否有意保留（可能作为"移除功能回归提醒"）。已在此登记并同步到 `implementation/06-测试.md`。
- **影响**：`npx jiti test/cli-aliases.test.ts` 退出码非 0（21/22 通过）。**不影响本专家任何功能**——失败点是已删除的 `scan-kb diff` 子命令，与本模块（检索与向量客户端）无关。但会污染 CI 与本模块回归结论，容易被误读为"检索链路有故障"。
- **建议**：删除该条断言，或替换为现存子命令（如 `scan-kb import`）的短别名断言。
- **来源**：expert-team 增量更新（2026-08-28）实测全模块回归时扫描发现
