---
groupPath: 错误库/关系与索引管理
relation: vectorDelete 为不存在的 collection 创建空库
exportedAt: "2026-11-17T04:32:40.138Z"
---
对从未初始化过 dense 的 scope 调 `vectorDelete` / `optimizeVectorIndex`，会凭空建出一个空库并占一份常驻句柄（副作用类，不污染数据）。

**实测（2026-11-17，REQ-20261117-001）**：删除前 `collections/<scope>` 不存在；调用后目录出现（5 项：0/LOCK/del.N/idmap.0/manifest.N）且 `scopeCollectionExists` 变 true。空库由 `ZvecEngine.create` 立即落盘，不等 close/flush。

**根因**：两者都经 `withEngine` → `getEngine` 的 create 自愈。该自愈服务写/检索是对的，但删除/整理语义应是「库里没有 ⇒ 无事可做 ⇒ no-op」；同文件 `vectorDeleteScope` 早有守卫，一有一无是遗漏。

**已修（未提交）**：
- 判据抽成导出的 `isCollectionAbsent(scope) = !_enginePromises.has(scope) && !scopeCollectionExists(scope)`，`vectorDelete` / `optimizeVectorIndex` / `vectorDeleteScope` / `relation-path-vector` 共用。★ 第二个条件不能省：有已打开句柄说明库曾经存在（典型是 daemon 配置路径漂移），只判磁盘会把 `DAEMON_IDENTITY_DRIFT` 静默吞掉。
- `scopeCollectionExists` 判据从「目录非空」改为「目录内含 zvec 布局文件（`manifest*` / `idmap*`）」：目录里只有一个无关文件时旧判据会当成集合 ⇒ 进引擎 ⇒ probe 3s 超时被判 locked ⇒ 报「被其他进程占用」（真机 20s）。
- `vectorDelete` 返回合成 NOT_FOUND（`notFoundIds` 有值、`errors` 空）——只传 `{ok:0, failed:0}` 会得到空 `notFoundIds`，`src/doc.ts` 靠它回显「doc 不存在」。
- `optimizeVectorIndex` 守卫放在 try 内（维持「不抛错」契约），返回 `ok:true + skipped:'collection-missing'`；迁移未完成 / scope 非法仍归一为 `degraded`。

**验证**：`vector-delete-no-create` 4/4（含垃圾目录、`vectorDeleteScope` 同源）、`vector-optimize-no-create` 5/5（含真实集合照常整理、活句柄+路径漂移不得短路）；sr03 19/19；真机（daemon 重启）三链路 + hidden 绑定 + 垃圾目录均不建库、不报锁占用；`ki index-optimize` 与 `POST /api/vector/optimize` 返回 `skipped`。★ 注意 `ki doc delete` 走 daemon 时若 daemon 未重启会跑旧代码（改判据后必须 `ki mcp restart` 复验）。

**判据边界 / 既有**：`vectorFetchDocs` 对未知 docid 会扫遍全部 scope 逐个开引擎（本机 136 collection 约 19s，与本次无关）；`test/vector-cli-functions` 8 例失败与判据变更无关（toggle 旧判据复跑同样 8 例）。

- 位置: `src/lib/vector-client.ts`、`src/lib/relation-path-vector.ts`、`test/vector-delete-no-create.test.ts`、`test/vector-optimize-no-create.test.ts`
- 需求: `CodeWikiHub/kisearch/requirements/2026-11-17-vector-delete-no-create/requirement.md`（§8 实施记录 / §8.4 复核追加）
- 证据: `.debug/vector-delete-creates-collection-20261117/`（E-01~E-16）