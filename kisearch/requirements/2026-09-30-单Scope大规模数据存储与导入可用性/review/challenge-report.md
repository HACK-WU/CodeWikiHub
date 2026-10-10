# 质疑报告（challenger）—— 批次 2：per-Group relation-cache 拆分

- **质疑对象**：工作区批次 2 改动（`src/lib/group-cache.ts` 原语 + W1-W9/R1-R10 迁移 + 迁移命令 + 测试/文档）
- **质疑方式**：独立子代理对抗式审查（假设「19 处全迁移、契约零变化、366 测试全绿」的结论是错的）+ 主审逐条复核（含 5 项动态实证）
- **被质疑的核心主张**：计划 `plan.md` 的「19 处引用点全部迁移」「对外 API/CLI/MCP 契约零变化」「行为与拆分前完全一致」「缓存失效双机制（写后主动 + revision 兜底）」
- **结论**：**主张不成立**。除主审已确认的 2 个 P0（`relation-edit-live`、`backup`）外，另发现 7 条成立质疑（含 3 条高风险），并复核出 1 项台账不实。

---

## 🔴 高风险质疑（成立，已复核）

### H1: `purgeVectorMigrationArtifacts` 对目录做非递归删除 → `scope delete` 报错残留
- 证据：`src/lib/scope-collection.ts:354-357`（`rmSync(`${entry}.relations-cache.json`, { force: true })`） vs `src/lib/rebuild-vector.ts:956`（`renameSync(relationsRoot, cacheBackupPath)` 把整目录搬到该路径，且提交后保留）
- 复核：node 实跑 `fs.rmSync(dir, { force: true })` → `ERR_FS_EISDIR`；调用链 `src/scope.ts:234-242`（先删 KB/配置/向量，最后 purge 抛错被 catch 成 `ok:false`）
- 风险：🔴 破坏性命令在「做过 rebuild 的新布局 scope」上误导性失败并留残留（残留又会让同名 scope 重建被误判为迁移中断）
- 建议：`recursive: true`；并复核「每次 rebuild 保留整份 relations 目录副本」的磁盘成本

### H2: `fts-rebuild` 把分片损坏降级为「静默成功 0 条」
- 证据：`src/lib/fts-rebuild.ts:50-59` catch 内 `!fs.existsSync(legacyPath)` → `return { indexed: 0, ... }`；新布局旧文件恒为 `.bak` → 恒走此分支
- 复核：消费方 `src/lib/restore-snapshot.ts:174`（restore 尾部无条件调用）→ 还原报告 ok、FTS-only 文档未重建、零告警；旧实现同故障 fail-loud（`JSON.parse` 再抛）
- 风险：🔴 fail-loud → 假成功降级（用户偏好 fail-loud）
- 建议：区分「两布局均无数据」与「存在但读失败」，后者把原始错误透出到 `errors`

### H3: 崩溃迁移遗留孤儿分片 → 已删组复活
- 证据：`group-cache.ts:407-449` 迁移只写不清；`readAllGroupCaches:351-384` 收养一切含 `cache.json` 的目录；`deleteGroupCache:496-499` 在旧布局早退（不清理分片）
- 触发序列：迁移写 A 分片后未写 manifest 时 `kill -9` → 仍是旧布局，用旧分支删组 A → 下次写二次迁移按旧文件重建 → **A 复活**（元数据在、KB/树已删）
- 风险：🔴 删除不收敛 + 幽灵条目污染后续导入/导出（最坏无法自行发现）
- 建议：迁移前清理「无 manifest 的 `relations/` 残留」，或迁移后校验分片键集合 ⊆ 旧文件键集合并清理差集；补 SIGKILL 序列测试
- 状态：🧪 静态推演成立，未获运行证据（建议按上表序列补做）

---

## 🟡 中风险质疑（成立）

### M1: 「写后主动失效」是台账幻觉
- 证据：`grep -rn onScopeRelationsInvalidated src/ bin/ web/` → 仅定义处（`group-cache.ts:116`）；4 个「消费方」零注册；`restore-snapshot.ts:170` 空广播
- 复核：正确性目前靠 identity 三元组兜底，**未发现 stale 缺口**；但 plan/AGENTS 的「写后主动失效（全部写路径必须走）」完成证据不成立
- 建议：真正接线（含测试）或删除该机制并统一口径为「身份戳兜底」

### M2: 顶层组名 `relations` 与分片根同路径 → 删组毁全量元数据
- 证据：分片根 `<kbDir>/<scope>/relations`（`group-cache.ts:36-39`）与 local-kb `<kbDir>/<scope>/<groupPath>/index.json`（`lib/scope.ts:115-118`）同路径；`delete-relation.ts:360-368` 递归删该目录
- 风险：🟡 低概率、不可逆（manifest + 全部分片被删）
- 建议：分片根改保留名（如 `.relations/`）或拒绝保留段组名 + 加测试

### M3: 空库被误判为「未导入」
- 证据：`src/export.ts:146-161`、`src/lib/wiki-sync.ts:227-233` 在 `readAllGroupCaches().size===0` 且旧文件不存在时直接报错；manifest 存在但 0 组（删空全部组）时命令由「正常输出 0」变报错
- 建议：以 `hasShardedLayout` 优先判定「已初始化」

### M4: 半回滚态与 `.bak` 不重试
- 证据：改名失败仅 stderr 警告（`group-cache.ts:444-446`），`migrate-relation-cache.ts:91-98` 已迁移即 return 不补偿；顺序为「先写 manifest（:437）后改名（:440）」 ⇒「有 manifest + 旧文件仍在」是可达常态
- 后果：① 文档承诺的回滚材料 `.bak` 可能不存在；② 旧文件被 `store.ts:131-189`（`migrateRelationsCacheKeys`，不区分布局）当活文件改写 ⇒ 双源分叉
- 建议：迁移后校验 `.bak` 存在、失败要 up-level 告警；`migrateRelationsCacheKeys` 加 `hasShardedLayout` 早退

### M5: 同一损坏四种表现，诊断不收敛
- 证据：manifest 损坏 → `scope list` 非结构化失败（`src/scope.ts:94` 无 catch）、`search` 整体失败（`relation-map.ts:64` 抛错，违反其 `:18` 的「损坏返回空 Map 不抛错」声明）；分片损坏 → 计数/列表静默归 0/空（`scope.ts:133-135`、`mcp-http-api.ts:321`）；`query-group.ts:137-145` 又 catch 成空并给出指向旧文件的 `CACHE_SHAPE_INVALID` 文案
- 建议：统一损坏策略（推荐 fail-loud + 明确错误码），并同步修正注释/文案

---

## 🟢 认可点（质疑后仍然成立）

1. 迁移三步顺序（分片 → manifest → 改名）的崩溃安全设计成立：任一步崩溃都退回旧布局完整可读，重写幂等。
2. 写路径纪律成立：穷举 `getGroupCachePath`/`getRelationsManifestPath`/`walWrite` 无绕过；批写共享一次 bump。
3. 穿越校验（双锚点 + 段校验）成立。
4. `rebuild-vector` 分片事务的 marker/回退设计（`layout:'sharded'`）成立，与旧文件事务同构。
5. 迁移命令的锁/幂等/noData/`.bak` 回显成立。
6. 全仓 `web/` 无文件系统直读（仅 HTTP/MCP 消费）→ 前端无布局耦合。

---

## 风险评估与替代方案（针对本次架构取舍）

| 质疑面 | 现状 | 替代方案（供决策） |
|--------|------|--------------------|
| 分片根 `relations/` 与组路径同域 | 需靠「组名不得撞保留名」的隐式约定（无校验） | A) 改保留名根目录（最小改动、消除整类风险）；B) 导入/写路径拒绝保留段（需覆盖所有入口） |
| 失效机制双轨（广播 + 身份） | 广播未接线，实际单轨（身份） | A) 接线广播（写后立即失效，省一次 stat+read）；B) 删除广播，声明单轨（减少假台账） |
| 分片损坏策略 | 四种表现（崩/静默空/静默 0/明确错） | 统一为「fail-loud + 错误码/告警」，与用户既有 fail-loud 偏好一致 |
| 空库语义 | 「manifest 在但 0 组」被当作未初始化 | 以 `hasShardedLayout` 判定初始化状态，区分「空库」与「无库」 |

## 结论

- 本次改动**架构方向成立**（分片原语 + 双读兼容 + 惰性迁移 + 事务化 rebuild 设计合理），但**「全迁移、契约零变化」的完成声明不成立**：主审确认 2 个 P0、本次质疑新增 3 条高风险与 5 条中风险。
- 建议：**修复 P0 + H1/H2/H3 后再合入**（均属小改，不含架构返工）；M1-M5 与主审 P2 清单可紧随其后同批清理。

---

# 第二轮质疑（2026-10-09，修复批次之后）

> 对象：第二轮 code-review 报告（`code-review.md` 文末「第二轮复审」）与其结论 P0。姿态：假设该结论仍不完整/不成立，双向施压（既挑战「P0 是否成立」，也挑战「P0 的定性、影响面与修复方向是否准确」）。

## 一、对 P0 结论的加压：成立，且**影响面比报告写的更大**（🔴 高）

| 质疑 | 证据 | 判定 |
|------|------|------|
| P0 是否只是复现脚本的构造产物（真实流程永不进入该状态）？ | 触发只需「升级后任一写路径首写」：`import`（升级后用户第一件事）、`sync-relation`、`delete-relation`、显式 `ki migrate-relation-cache`。工程内测试自身已处于该状态：`test/sync-relation.test.ts:116` 以 `项目根/监控/告警中心` 断 KB、`:135` 以 `监控/告警中心` 断元数据。本机 `bulk-test` 是真实导入产物（非测试构造） | **质疑不成立 → P0 坐实** |
| 「项目根 只是脏前缀」是否成立？ | `src/lib/constants.ts:52` `DEFAULT_ROOT_NAME='项目根'`：rootName 时代**导入器默认**产出的就是这个形状；`_template` 至今以旧布局出生（决策 #12）；且修复批次决策 #13 明确「**不**迁移本地 KB 目录（`项目根/...` 保留）」。既然后者被接受为常态，则「元数据侧单方面剥前缀」在构造上必然制造分叉 | **质疑不成立 → 是逻辑矛盾，不是脏数据** |
| 影响面是否只有报告列的 4 个消费方？ | 第二轮追加实测：`executeDeleteRelation`（单条）在同一状态下 `{"ok":true,...,"deleted":false,"cacheRemoved":false,"kbRemoved":true}`，删除后分片热区仍 `[["测试模块",["DocA"]]]` —— **KB 已删、元数据留档**，条目变幽灵 | **P0 影响面 +1（第 5 个消费方）** |

**P0 定级维持 🔴 阻断**：静默数据丢失（export 0 条）+ 静默空查询 + 幽灵数据（元数据/向量残留），且对外表现是 `ok:true`，无任何告警——与用户「fail-loud、反感静默失败」的偏好直接冲突。

## 二、对「修复方向 A（恢复原样键，不再剥前缀）」的质疑：方向成立，但要连带处理 3 处测试与 1 处旧问题溯源（🟡 中）

| 质疑 | 证据 | 处置 |
|------|------|------|
| A 会不会重新引入上一轮修掉的「同组双份」（`项目根/X` 与 `X` 并存）？ | 上一轮双写源于**迁移侧剥、persist 侧不剥**的自我不一致（两侧都属本次实现的内部约定）。A 让两侧都不剥 → 不一致消失；且 `readGroupIndex` 的 `roots→groups` 迁移时机本就成对处理树与键，不会分叉 | **质疑不成立**：A 不回归旧问题 |
| A 会不会破坏现有测试？ | 会：`test/sync-relation.test.ts:135/476-480`、`test/group-cache.test.ts:140-150`、`test/restore-layout-matrix.test.ts:150-153/201` 目前**把「剥前缀」断成期望值**（即把缺陷写入基线）。A 需同步改这些断言，并补一条「分片键 ∈ group-index 可解析路径」的不变量用例 | **须一并执行**，否则修复后套件变红会被误判为回归 |
| 是否还有第三种更正确的方向？ | **C：把树与 KB 目录也按同一规则迁移**（真正消除 `项目根` 虚拟根，三处键一起改名）。它语义最干净，但要移动**用户原文目录 + 附件 + wiki 目标**，且旧版本代码读新目录的兼容性未知 | 建议：C 作为**独立需求**（正是决策 #13 已登记的缺口），本批先用 A 恢复契约一致性；不要在同一批里做「改键 + 搬目录」 |
| B（树感知剥离）是否更优？ | 语义正确，但要求存储层读 group-index 树做判定（分层倒置），且迁移/读取/写入三处都要判定 | 不推荐作为本批修复；如选 B 需在 design.md 补判定点清单 |

## 三、全局回扣质疑（对象=第二轮 review 报告本身）

| 回扣 | 质疑 | 判定 |
|------|------|------|
| 目标回扣 | 批次 2 的业务目标「读单篇文档 O(组级) 且对外契约零变化」达成否？ | ❌ 未达成：「契约零变化」被 P0 打破（export/query-group/delete-relation/delete-group 四类对外行为在特定数据形态下静默失真）。S0-5 性能收益本身成立 |
| 位置回扣 | 改动点在「存储键」这一层，是否被放大？ | 🔴 放大：键是树/KB/元数据/向量/编辑草稿的共同坐标系，单侧改写会同时污染读、写、删、导出、重建五条链路（已在 5 个消费方实测） |
| 判据回扣 | 计划「完成判据」第 2 条（全量操作结果与拆分前一致）与第 5 条（迁移守恒）是否成立？ | ❌ 前者被实测推翻（`export` 前后 total 1→0）；后者成立（数据本身守恒，键不一致导致的是**寻址失败**而非丢失，`.bak` 与分片都在）。计划台账应回修该条判据的适用范围（「仅对无 `项目根/` 字面组的 scope 成立」） |
| 报告自证 | 第二轮报告是否给了全局图景并逐条回扣？ | ✅ 已给（业务目标/系统位置/成功判据 + 4+1 消费方实测） |

## 四、认可点

- 三步曲写原语、双锚点穿越校验、保留名分片根 + `isRelationsRootPath` 守卫、`writeGroupCacheBatch` 共享一次 bump、迁移前的旧文件 `.bak` 保留 —— 这些在第二轮实测与复读中均未发现回退，**修复批次的其余 19 项修复经复核有效**（含备份门禁、purge 递归、fts fail-loud、失效广播真实接线）。
- 第二轮复现脚本可用于修复后的**回退验证**（改回旧写法即应复现 `total:0`）。

## 五、结论更新

- 第二轮 review 的 P0 **成立、定级维持 🔴 阻断**，影响面由 4 个消费方扩至 **5 个**（追加 `delete-relation` 单条）。
- 合入结论不变：**❌ 不建议按现状合入**；修复方向推荐 **A（恢复「键 = 树路径 = KB 相对目录」不变量）+ 同步修正 3 处把缺陷写成期望的测试断言**，并把方向 C（树/KB 一起迁移）留在独立需求中。
- 本批 P1（`persistTouchedGroups` 未归一、`null` 占位上下文、relation-map 吞损坏）与 P2 清单不改变合入结论，可与 P0 同批修复。
