---
groupPath: 错误库/数据源管理
relation: kbDir外挂scope的数据源在列表与调度器中不可见
exportedAt: "2026-11-16T02:55:42.675Z"
---
命令登记数据源成功但 Web 数据源页与定时调度器都看不到它，根因是枚举只扫 dataDir 目录，漏掉配置了 scopes.<scope>.kbDir 的 scope。

- 现象: ki datasource add -s kisearch-memory 返回 ok/created:true，页面条数不变；GET /api/datasource/list?scope=<scope> 返回 total:0，且 missing、corrupt 都为空（说明该 scope 没进扫描集合，不是源目录不可读）
- 关键判据: getScopeDataDir 为 kbDir ? kbDir/kb/<scope> : dataDir/<scope>，配了 kbDir 的 scope 其 datasource.json 落在 dataDir 之外
- 根因: datasource.ts 的 scanDataSources 与 listRegisteredDataSourceRecords 都只用 readdirSync(config.dataDir) 枚举 scope
- 波及: 列表页、定时同步调度器、共享 clone 复用与引用计数、成员元数据的数据源失败标记
- 解法: 抽出 enumerateScopeNames(config) = config.scopes 键 ∪ dataDir 目录（字符集过滤 + validateScope 过滤保留字 __global__，否则会记成损坏），两个枚举函数共用；与 scope.ts 的 listAllScopes 枚举口径对齐
- 验证方式: 复现脚本对比 readDataSource(scope) 返回 OK 与两个枚举函数是否包含该 scope；新增 test/datasource-scan-kbdir.test.ts 4 例；daemon 重启后 GET /api/datasource/list 返回 8 条含 kisearch-memory
- 位置: src/lib/datasource.ts
- 排查记录: .debug/datasource-list-missing-kbdir-scope-20261116/
- 未采纳: 把 datasource.json 迁回 dataDir（违背元数据随 kbDir 走）