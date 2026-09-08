# 已知单元测试失败：检索与向量客户端专家

**当前状态（2026-09-07 实测）：0 例已知失败。** `cli-aliases` 21/21 全绿。

> 本文件保留一条**已解决**的历史记录，用于解释 `test/cli-aliases.test.ts` 中那段
> 「已删：{ cmd: 'scan-kb', helpArgs: ['diff'] ... }」注释的由来。勿据此认为仍有失败用例。

---

## 【已解决 2026-09-07】test/cli-aliases.test.ts:REQ-11 短别名帮助输出

- **原失败用例**：`ki scan-kb diff -h 帮助应含 "-o, --output"`
- **执行方式**：`env -u NODE_OPTIONS -u BASH_ENV npx jiti test/cli-aliases.test.ts`
- **首次登记**：2026-08-28（expert-team 增量更新时实测发现），当时 21/22 通过
- **原失败原因**：断言错误——`expected: true, actual: false`。测试用例表声明
  `{ cmd: 'scan-kb', helpArgs: ['diff'], short: '-o', long: '--output' }`，但 `scan-kb diff`
  子命令已于 2026-08-14（commit `fce0b57`「移除 rootName 概念，统一 group 语义，新增目录级删除与
  回收站」）随增量导入模式一并移除，故 `-h` 帮助输出中不存在 `-o, --output`。
- **为何长期未修**：该用例属跨模块 CLI 规范测试，删除/替换需确认是否有意保留
  （可能作为「移除功能回归提醒」），故仅登记不改。
- **解决方式（2026-09-07）**：随 `ki scan-kb import` → `ki import` 扁平化改造一并清理。
  本轮必然触碰该文件（`scan-kb` 用例需改名），是清理的最佳时机；经确认 `diff` 与 `--output`
  均无对应现存断言目标，**删除该条用例**而非替换，并在原位留注释说明删除理由。
  同轮 `scan-kb` 用例改为 `{ cmd: 'import', helpArgs: [], short: '-s', long: '--scope' }`。
- **验证**：`cli-aliases` 21/21 通过、退出码 0（原 21/22 + 非 0 退出）。
- **连带影响**：本条解决后，以下三处「已知失败」表述同步失效并已更新——
  `INDEX.md`（测试状态 78 通过 + 1 过期失败 → 全绿）、`agent.md`（「唯一失败」段）、
  `implementation/06-测试.md` 与 `implementation/07-运维.md` 的对应条目。
- **来源**：expert-team 增量更新（2026-08-28）登记；2026-09-07 CLI 扁平化改造时解决
