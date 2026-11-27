# 需求：向量删除不得为不存在的 collection 创建空库

- 需求 ID：REQ-20261117-001
- 提出日期：2026-11-17
- 状态：**已完成**（2026-11-17 按 A 方案实施并验证；代码未提交）
- 来源：事件 #36 / #37 修复过程中的复核（`.debug/delete-vector-residual-20261116/` E-15）
- 证据声明：🟢 代码直读（`src/lib/vector-client.ts`、`src/zvec-engine/engine.ts`）+ 本地实测（2026-11-17 复现脚本，见 §6）

## 1. 用户诉求（原话）

> `vectorDelete` 走 `withEngine`，对不存在的 collection 会打开/创建一个空库并留下常驻句柄 —— 表现是单测跑完全部用例却不退出（`visibility-sr03` 因此从 19/19 变成 300s 超时）。已在 `relation-path-vector` 前置 `scopeCollectionExists` 短路（并导出该函数），sr03 恢复 19/19 正常退出。
>
> 这是一个 bug 么？

结论：**是 bug**，但属「副作用类」而非「数据安全类」；且是**既有缺陷**（非本次修复引入），本次修复只是增加了 `vectorDelete` 的调用次数从而更容易暴露。

## 2. 现状（🟢 代码直读 + 本地实测）

### 2.1 调用链：删除会顺带建库

```text
删除一个「从未初始化」的 scope 的向量，会凭空造出一个空库
├─ vectorDelete({ scope, ids })                          vector-client.ts:1523
│  └─ withEngine(scope, engine => engine.delete(ids))     vector-client.ts:876
│     └─ getEngine(scope)                                 vector-client.ts:681
│        ├─ probeWithRetry(dbPath) → { exists: false }    vector-client.ts:721
│        ├─ rmdirSync(dbPath)（清掉可能存在的空目录）      vector-client.ts:728
│        └─ ZvecEngine.create(createCfg)  ← 建库 + 常驻句柄 vector-client.ts:733
├─ 没有任何前置判断「库不存在就直接 no-op」
└─ 同文件的 vectorDeleteScope 却有守卫（一有一无）        vector-client.ts:1920-1925
   └─ if (!scopeCollectionExists(scope)) return { deleted: 0 };
```

`scopeCollectionExists` 的判据是「目录存在且非空」（`vector-client.ts:1577`）。

### 2.2 实测（2026-11-17，临时 scope 已清理）

```text
[1] 删除前 exists = false | 目录 = 不存在
[2] vectorDelete({ids:['000…']}) = {deleted:0, failed:0, notFoundIds:['000…'], errors:[]}
[3] 删除后 exists = true  | 目录 = 存在(5 项)          ← 空库被创建
加守卫后：[守卫] 库不存在 → 返回 missing，不调 vectorDelete → 目录 = 未创建
```

### 2.3 为什么判定为「bug」而不是「设计如此」

| 层 | 判断 | 依据 |
|---|---|---|
| `getEngine` 在集合不存在时 `create` | **有意设计**（自愈） | 源码注释明确「放任 getEngine 会在原址创建空库」，并为此专门用 `assertNoPendingVectorMigration` 拦住迁移中断场景（`vector-client.ts:1590-1596`） |
| 删除路径复用同一入口 | **遗漏** | 删除的语义是「库里没有 ⇒ 没有可删的向量 ⇒ no-op」，`vectorDeleteScope` 已按此实现；同类 API 口径不一致是缺口 |

### 2.5 已实施（2026-11-17，A 方案）

`vectorDelete` 内部前置 `if (!scopeCollectionExists(scope)) return normalizeVectorDeleteResult(ids, { ok: 0, failed: 0, errors: ids.map(...NOT_FOUND) })`，
与 `vectorDeleteScope` 同口径；返回语义仍是「这些 id 不存在」（`notFoundIds` 有值、`errors` 为空、`failed` 为 0）。
`relation-path-vector` 的调用方守卫**保留**，但目的改为「省掉随后那次检索兜底 + 保持 `missing` 不带 reason」（见 §7 D1）。
用例：`test/vector-delete-no-create.test.ts`（真实文件系统断言「删除后目录不存在」）。

### 2.4 对上一轮表述的更正

上一轮说「表现是单测跑完全部用例却不退出」——**因果不完整**。实测单次调用进程可正常退出（exit=0）；`visibility-sr03` 的超时是「多个 scope 的常驻 worker + test runner 等待句柄」的组合结果。准确表述：**会创建空库并占用一份常驻句柄（LRU 会淘汰，但进程退出前不主动释放）**。

## 3. 影响面

| 维度 | 影响 |
|---|---|
| **触发条件** | 对从未写过 dense 的 scope 调 `vectorDelete`：FTS-only 文档删除、hidden 摘除（`applyVisibility` dense 分支）、路径向量清理、`ki doc delete` |
| 数据 | **不污染**：返回 `deleted:0 + notFoundIds` 语义正确，删不到任何东西 |
| 磁盘 | 多一个空 collection 目录（约 5 项文件），只有 `ki scope delete` 才会清 |
| 状态一致性 | `scopeCollectionExists` 从此返回 `true` ⇒ 掩盖「该 scope 从未初始化」的事实，后续 doctor / 清理逻辑可能被误导 |
| 进程资源 | 每个被误建的 scope 占一份常驻 worker 句柄；daemon 内有 LRU 上限（功能不受影响），CLI 脚本与测试隔离变差 |
| 可发现性 | `ki scope list` 只列 config，不列目录 ⇒ 无人察觉（静默副作用） |

## 4. 方案对比

| 方案 | 做法 | 评价 |
|---|---|---|
| **A（推荐）** | 在 `vectorDelete` 内部前置 `if (!scopeCollectionExists(scope))` 短路，返回 `normalizeVectorDeleteResult(ids, { ok: 0, failed: 0, errors: ids.map(id => ({ id, code: 'NOT_FOUND', reason: 'collection not found' })) })`，与 `vectorDeleteScope` 口径一致 | 一处生效所有调用方；与既有先例一致；成本是每次删除多一次 `loadConfig + stat + readdir`（删除非热路径）。**注意必须合成 NOT_FOUND**：只传 `{ ok: 0, failed: 0 }` 实测得到 `notFoundIds: []`，与 §5.1 冲突，且 `src/doc.ts` 靠 `notFoundIds` 回显「doc 不存在」（2026-11-17 实测，见 §8 E-3） |
| B（当前已做，局部） | 调用方守卫：`relation-path-vector` 里先判 `scopeCollectionExists` | 覆盖不全：`visibility-index` 的 dense 主路径、`deleteContentVectorsBySearch`、`ki doc delete` 仍会建库；每个新调用方都要记得加 |
| C | 给 `withEngine` 加 `noCreate` 选项，区分只读/删除类操作 | 更通用，但动到引擎生命周期主入口，风险与回归面明显大于 A |

采纳建议：**A 为根治，B 作为落地过渡**。切换到 A 后，B 中那处守卫变冗余可收回，但 `relation-path-vector` 返回的 `missing: true` 语义要保留（调用方据此区分「本来就没有」与「删失败」）。

## 5. 验收标准

1. 对**无 collection 的 scope** 调 `vectorDelete` → 返回 `deleted: 0`、`notFoundIds` 含入参 id，且 `collections/<scope>` 目录**不被创建**
2. 对**已有 collection 的 scope** 删除行为不变（`deleted` / `failedIds` / `errors` 语义与现状一致）
3. 三条真实链路对未初始化 scope 均不建库：`ki doc delete`、`delete-relation`（含 hidden 摘除）、路径向量清理
4. 新增 1 例单测：mock 掉 `scopeCollectionExists → false`，断言 `vectorDelete` 未触达引擎且不建目录
5. `test/visibility-sr03.test.ts` 仍 19/19 且进程**正常退出**（不靠超时判失败）
6. `delete-relation-*` / `visibility-*` / `doc-delete` / `delete-group` 全绿；`tsc -p tsconfig.json` 零错误
7. 不自动清理**历史遗留的空库目录**（可能是正常但暂无数据的库），只保证「不再新增」
8. （复核补充，同源）`optimizeVectorIndex` 对不存在的 scope **不建库**：返回 `ok: true` + `skipped: 'collection-missing'`、`wallMs ≈ 0`；迁移未完成 / scope 非法仍归一为 `degraded`（不吞真实错误、不抛错）

## 6. 验证方式（实施后）

```bash
# 1) 建库副作用：应为「未创建」。复现脚本（临时文件，跑完删除）：
cat > /tmp/probe-nocoll.ts <<'EOF'
import fs from 'fs';
import { vectorDelete, scopeCollectionExists } from '/root/knowledge-indexer/src/lib/vector-client.js';
const scope = 'tmp-probe-nocoll';
const dbPath = `/root/.ki/vector/collections/${scope}`;
console.log('[1] 删除前 exists =', scopeCollectionExists(scope));
console.log('[2] vectorDelete =', JSON.stringify(await vectorDelete({ scope, ids: ['00000000000000000000000000000000'] })));
console.log('[3] 删除后 exists =', scopeCollectionExists(scope), '| 目录 =',
  fs.existsSync(dbPath) ? `存在(${fs.readdirSync(dbPath).length} 项)` : '不存在');
EOF
env -u NODE_OPTIONS -u BASH_ENV npx jiti /tmp/probe-nocoll.ts
# 期望（实施后）：[1] false → [3] 仍 false / 目录 = 不存在；当前（未实施）：[3] true / 存在(5 项)

# 2) 语义不变：已有库的删除仍返回实际删除数
cd /root/knowledge-indexer
npx jiti test/delete-relation-relation-vector.test.ts
npx jiti test/visibility-dense-delete.test.ts && npx jiti test/visibility-sr03.test.ts

# 3) 类型与全量定向回归
npx tsc -p tsconfig.json --noEmit
```

> 清理：`rm -rf /root/.ki/vector/collections/tmp-probe-nocoll /tmp/probe-nocoll.ts`（实测时该目录会被当前版本创建出来，实施后应不再出现）。

## 7. 待决 / 风险

- **D1（已定）**：A 落地后 `visibility-index` dense 主路径与 `deleteContentVectorsBySearch` 被自然覆盖，无需单独改；
  `relation-path-vector` 那处守卫**保留**——它省掉随后一次检索兜底，并让「本来就没有」不带 reason（与「删失败」区分）。
- **风险 R1**：`scopeCollectionExists` 内含 `assertNoPendingVectorMigration`（迁移中抛错）。A 落地后 `vectorDelete` 在迁移中会**先抛迁移错误**，与现状行为一致（现状也是在 `getEngine` 里抛），不构成回归。
- **风险 R2**：多一次 `loadConfig` 的 IO；删除路径不是热路径，暂不接受缓存优化（缓存会让「刚建库」判断失真）。
- **D2（已定并已修）**：`optimizeVectorIndex` 是同一根因的旁路（实测对不存在的 scope 建 5 项空库且返回 `ok:true`）。已在同一函数内前置 `scopeCollectionExists` 守卫，返回 `ok:true + skipped:'collection-missing'`；守卫放在 try 内，保证「本函数不抛错」契约不变（`scopeCollectionExists` 自己会抛的两种情形——scope 非法 / 迁移未完成——仍归一为 `degraded`）。
- **风险 R3**：`optimize` 的 `skipped` 字段是新增可选字段。`ki index-optimize` 与 `POST /api/vector/optimize` 以 `...outcome` 展开输出（新增字段可见）；`index-maintenance` 只读 `ok/wallMs`，导入收尾文案不变（A11 的「未检测到 dense 索引实体」提示仍会兜住全 FTS 导入）。
- **不在本需求范围**：删除链路的实删校验与残留上报（已由事件 #36 / #37 修复覆盖）、`ki group delete` 复用同一判据（另见 `.debug/delete-vector-residual-20261116` E-15 未修清单）。

## 8. 实施与复核记录（2026-11-17）

### 8.1 改动

| 文件 | 改动 |
|---|---|
| `src/lib/vector-client.ts` | `scopeCollectionExists` 导出；`vectorDelete` 前置守卫 + 合成 NOT_FOUND；`optimizeVectorIndex` 前置守卫 + `skipped: 'collection-missing'`（D2） |
| `src/lib/relation-path-vector.ts` | 复用 `scopeCollectionExists` 短路（方案 B 过渡，保留 `missing` 语义） |
| `test/vector-delete-no-create.test.ts` | 新增 2 例（真实文件系统断言不建库 + 空 ids 短路） |
| `test/vector-optimize-no-create.test.ts` | 新增 3 例（不建库 / 迁移中断仍 degraded / scope 非法不抛错） |

### 8.2 验收对照

| # | 结论 |
|---|---|
| 1 | ✅ 实测 `{deleted:0, failed:0, notFoundIds:[id], errors:[]}`，目录未创建 |
| 2 | ✅ `delete-relation-relation-vector` 8 / `delete-relation-content-vector` 10 / `visibility-dense-delete` 6 全绿 |
| 3 | ✅ 真机三链路 + hidden 绑定均不建库；**但链路① `ki doc delete` 天然到不了 `vectorDelete`**（`vectorFetchDocs` 在 collection 缺失时返回空 ⇒ `inScopeIds` 为空提前返回），该项只能证明「没有别的路径建库」 |
| 4 | ✅ 未用 mock（判据是模块私有行为）：直接断言真实路径未创建 |
| 5 | ✅ sr03 19/19、37ms 正常退出 |
| 6 | ⚠️ 定向用例全绿；`tsc` 仍有 **7 处既有错误**（`import-budget` / `mcp-http-api`×3 / `mcp-http` / `open-api/multipart`×2），与本改动无关，vector 相关文件 0 错误 |
| 7 | ✅ 未清理任何历史目录（collection 总数 135 → 135） |
| 8 | ✅ `optimizeVectorIndex` 实测 `{ok:true, wallMs≈0, skipped:'collection-missing'}` 且不建库；`ki index-optimize -s <未初始化 scope>` 退出码 0 |

### 8.3 真机验证（daemon 11:52 重启后）

- 链路② `ki delete-relation`（FTS-only 关系）：`deleted:true`、`groupPathVectorRemoved:true`、`relationVectorDeleted:0` → 无 dense 目录
- 链路③ `ki group delete`（FTS-only 组）：`vectors:{deleted:0,failed:0}`、`fts.deleted:1` → 无 dense 目录
- hidden 摘除：构造「cache 有 memoryIds / 磁盘无 collection」的漂移场景后 `ki_event_create(type=et_1, st_1=hidden)` → `visibilityFailed:[]`，且 cache 的 `memoryIds` 被清空（证明 dense 分支**确实执行**，不是被 `no-dense-ids` 跳过）→ 无 dense 目录
- 临时 scope（`dbg-chain-aa` / `dbg-opt-aa` / `dbg-nocoll*`）与测试数据已全部清理

### 8.4 复核追加（D1 补测 + D2 修 Q5/Q6）

| 项 | 结论 |
|---|---|
| **Q6 判据** | `scopeCollectionExists` 改判「目录内含 zvec 布局文件（`manifest*` / `idmap*`）」。原因：目录里只有一个无关文件时，旧的非空判据会把它当成集合 ⇒ 进引擎 ⇒ probe 3s 超时被判 locked ⇒ 报「被其他进程占用」（真机复现 20s）。真机复验：垃圾目录下 `ki doc delete` 从 `ok:false + 锁占用报错` 变为 `ok:true, deleted:0, errors:[]` |
| **Q5 统一** | 判据抽成导出的 `isCollectionAbsent(scope)`（无活句柄 **且** 磁盘无集合），`vectorDelete` / `optimizeVectorIndex` / `vectorDeleteScope` / `relation-path-vector` 共用；读路径维持 `scopeCollectionExists`（不建库） |
| **D1 补测** | `vector-optimize-no-create` 3→**5** 例（真实集合照常整理、活句柄+路径漂移不得短路）、`vector-delete-no-create` 2→**4** 例（垃圾目录、`vectorDeleteScope` 同源），全绿 |
| **依赖守护** | 新用例断言「真集合判为 true」——zvec 若改掉 `manifest*`/`idmap*` 命名，这条会红，避免判据静默退化成 always-false |
| **既有发现（未修）** | `vectorFetchDocs` 对未知 docid 会扫遍全部 scope 逐个开引擎（本机 136 collection 约 19s，与本次无关）；`test/vector-cli-functions` 8 例与 `test/vector-idle-race`（embedding 402 余额不足）为既有失败 |

### 8.5 证据台账

`.debug/vector-delete-creates-collection-20261117/`（E-01~E-16）。
