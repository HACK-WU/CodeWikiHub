# Code Review Report —— 批次 2：per-Group relation-cache 拆分（S0-5 正解）

- **审查对象**：工作区未提交改动（master，HEAD `ecf6edc`）。34 个已跟踪文件修改（+949/−341）+ 6 个新增文件（`src/lib/group-cache.ts`、`src/migrate-relation-cache.ts`、4 个测试）
- **关联需求**：REQ-20260930-002《单Scope大规模数据存储与导入可用性》S0-5（匹配依据：用户指定计划 `.plans/2026-10-08-stage0-batch2-relation-cache-split/plan.md` + 代码语义 ↔ S0-5 条目）
- **审查模式**：🔶 深度模式（七维度 + 对抗式二次质疑）
- **整体评分**：**C**（存在未修复 P0，按规则最高 C）
- **合入结论**：⚠️ **修复 P0 后可合入**（方向正确、影响面清晰、无不可逆数据损坏；不建议拒绝）

> ⚠️ **本报告已被第二轮复审推翻部分结论**：修复批次之后的复审（见文末「第二轮复审」）新增 1 个 **P0 静默数据丢失**（`项目根/` 前缀无条件剥离导致分片键与 group-index 树 / local-KB 路径分叉）。**当前合入结论应读作文末的第二轮结论**：❌ 不建议按现状合入。

---

## 🎯 功能意图推测（阶段 3）

**🌍 全局图景**：业务目标「把 scope 级单份 relations 元数据拆成 per-Group 分片，使读单篇文档只读写该组，同时对外契约零变化」｜系统位置「KB 原文/local-kb（已分片） → **relations 元数据（本次从单文件改为分片 + manifest）** → 19+ 个消费方（Browse/Search/export/restore/rebuild/编辑/备份）」｜整体成功判据「① 对外 API/CLI/MCP/Web 行为不变；② 跨 Group 全量操作结果与拆分前一致；③ 全部写路径过三步曲（bump→WAL→失效）；④ 迁移可回退且数据守恒」

| 代码位置 | 推测的功能意图 | 确认状态 | 置信度 |
|----------|---------------|----------|--------|
| `src/lib/group-cache.ts`（新） | 分片存储原语：路径/读/写/迁移/失效广播，业务无感 | ⏩ 免确认（计划即授权语义） | 🟢 |
| 19 处消费方（W1-W9/R1-R10） | 读改写由「整份 scope 文件」变为「该组分片或全量聚合」，行为等价 | ⏩ 免确认 | 🟢 |
| `src/migrate-relation-cache.ts`（新） | 显式批量迁移，幂等 + `.bak` 保留 + 写锁 | ⏩ 免确认 | 🟢 |

---

## 📊 维度评分概览

| 维度 | 评分 | 状态 | 一句话结论 |
|------|------|------|-----------|
| 🔑 语义一致性 | 4/10 | ❌ | 「19 处全覆盖/契约零变化」不成立：至少 3 处未迁移；失效广播台账不实 |
| ⚠️ 安全性 | 6/10 | ⚠️ | 穿越校验已加固；但备份门禁失效、组名撞根可毁全量元数据、scope delete 报错残留 |
| 🐛 Bug 风险 | 4/10 | ❌ | 2 个 P0 在真实导入后 100% 触发（已动态实证） |
| 📐 代码规范 | 6/10 | ⚠️ | 死变量/死导入/死参数/重复实现各 1 处 |
| 🏗️ 架构设计 | 8/10 | ✅ | 原语分层、三步曲、双读兼容、惰性迁移、rebuild 事务化设计清晰 |
| ⚡ 性能 | 7/10 | ⚠️ | 读单篇 I/O 5.5x（实测）；但每次读都 bump+写分片+失效，主动失效未接线 |
| 🧪 测试覆盖 | 5/10 | ⚠️ | 6 个新用例有价值；3 处未迁移点在新布局下无覆盖，无 backup 测试，3 个新测试文件不清理 |

---

## 🔴 严重问题（P0，必须修复）

### [P0-1] `readLiveRelation` 未迁移 → 新布局下「编辑 Relation」全链路不可用（已动态实证）

- 📍 `src/lib/relation-edit-live.ts:39`
  ```ts
  const cache = readJson<{ groups?: ... }>(getRelationsCachePath(scope));
  const record = cache?.groups?.[group]?.hot_relations?.find((item) => item.text === relation);
  if (!record) throw new Error(`Relation 不存在：${group}/${relation}；ki_edit_relation 只修改已有 Relation`);
  ```
- 💻 实际做：迁移后旧文件已改名 `.bak`，`readJson` 返回 `null` → 恒抛「Relation 不存在」。
- 🧪 动态证据（隔离 HOME + 真实 `handleDirectImport({vector:false})`，2 组 4 篇）：
  ```
  落盘布局：manifest=true，旧单文件=false，.bak=true
  [FAIL] 导入后 readLiveRelation -> Relation 不存在：wiki/部署运维/部署手册；只修改已有 Relation
  [OK]   对照：loadGroupCache（已迁移原语） -> 2
  ```
- 💥 影响面（4 个入口，均无布局守卫）：
  - `ki_edit_relation` MCP/CLI `edit` 首步（`src/edit-relation.ts:60`）
  - **Web 在线编辑保存** `/api/doc/edit`（`src/lib/document-editor.ts:245`，REQ-20260928-001 能力）
  - 草稿发布 `runFinish`（`src/lib/relation-edit-publish.ts:348/368/409`）与 `recognizePublishedDraft`（`:308`）——注意 `:310/:359` 按错误文案 `includes('Relation 不存在')` 做分支，修复时必须保留文案
- 🔍 根因：计划「19 处引用点」清单漏掉了 `relation-edit-live.ts`（它读的是 `relations-cache.json` + local-kb，不在 W/R 清单中），而 `document-editor`（W6）只迁移了 `loadDocument`/`sourcePath owner` 两处读，其内部调用的 `readLiveRelation` 未被覆盖。
- 🧪 为何 366 测试全绿：`test/edit-relation.test.ts:86-117` 的 `seed()` **直接写旧布局单文件**（`store.readJson(getRelationsCachePath)` + `writeJson`），全量用例都跑在旧布局 → 恒通过。
- 💡 修复：`readLiveRelation` 内部改双轨（`hasShardedLayout ? loadGroupCache(scope, group) : readJson(legacy)`），或统一走 `loadGroupCache`；并给 edit-relation 增补「迁移后/导入后」新布局用例。

### [P0-2] `executeBackup` 前置校验只看旧文件 → 新布局 scope 无法备份（已动态实证）

- 📍 `src/lib/backup.ts:42-43`
  ```ts
  const rcPath = path.join(scopeDataDir, 'relations-cache.json');
  if (!fs.existsSync(rcPath)) throw new Error(`scope "${scope}" 尚未初始化（缺少 relations-cache.json），请先执行 import`);
  ```
- 🧪 动态证据：同一真实导入后
  ```
  [FAIL] 导入后 executeBackup(ki backup) -> scope "e2e" 尚未初始化（缺少 relations-cache.json），请先执行 import
  ```
- 💥 影响面：`ki backup`、daemon RPC `backup`（`src/lib/daemon-dispatch.ts:87`）、Web 备份入口全部失败（`src/backup.ts:70-71` 两条路径均经此函数）。**每个新 scope 在首次写路径迁移后也一并失效**（`initScope` 仍从 `_template/relations-cache.json` 出生，见 P2-5）。
- ⚠️ 与护栏 #8 直接冲突：计划要求 backup/restore 交互回归，但仓库**没有任何 backup 测试文件**（`ls test | grep backup` 为空），`restore-layout-matrix` 只测 `backupScopeSnapshot` 直调（不经 `executeBackup` 门禁）。
- 💡 修复：门禁改布局感知（`relations-cache.json` 或 `relations/manifest.json` 任一存在），或复用 `listAllScopes` 同款判定；补 `test/backup.test.ts`（新旧布局各 1 例）。

---

## 🟡 建议改进（P1，推荐修复）

### [P1-1] `purgeVectorMigrationArtifacts` 对分片备份**目录**做非递归删除 → `ki scope delete --yes` 报 EISDIR 并留残留（动态实证 + 代码链）

- 📍 `src/lib/scope-collection.ts:354-357`
  ```ts
  for (const entry of listMigrationEntries(getVectorMigrationBackupsRoot(config), scope)) {
    fs.rmSync(entry, { recursive: true, force: true });
    fs.rmSync(`${entry}.relations-cache.json`, { force: true });   // ← 分片布局下这是目录
  }
  ```
- 🔗 该路径由 `src/lib/rebuild-vector.ts:956` 写入：`fs.renameSync(getRelationsRootPath(scope), cacheBackupPath)`（整目录 rename），且**成功提交后不清理**（`:1070/:1078` 把它当保留备份）。
- 🧪 动态实证：`fs.rmSync(dir, { force: true })` → `ERR_FS_EISDIR`。
- 💥 触发链（`src/scope.ts:234-242`）：`vectorDeleteScope` → `closeEngine` → `removeKbDir`（**KB 已删**）→ `removeScopeFromConfigFile` → `removeScopeCollection` → purge 抛错 → 被 catch 成 `{ok:false}`：用户看到「删除失败」但 scope 实际已被销毁，且残留目录使得「同名 scope 重建被误判为迁移中断」（正是 purge 要防的事）。旧布局该路径是文件，无此问题 → **本次改动引入**。
- 💡 修复：`fs.rmSync(path, { recursive: true, force: true })`；同时考虑「成功后是否保留整份分片备份」的磁盘成本（每次 rebuild 保留一份全量 relations 副本）。

### [P1-2] `resolveGroupPath` 上下文用 `null` 占位 → Group 自动补全的「relations 键」分支被静默禁用（动态实证）

- 📍 生成点：`src/get-module-info.ts:106`、`src/manage-index.ts:98/215/353`
  ```ts
  const groupsData = Object.fromEntries(listGroupPaths(scope).map((k) => [k, null]));
  ```
- 📍 消费点按**真值**判断：`src/lib/group-resolve.ts:124` `if (groupsData[userInput])`、`:139` `if (groupsData[candidate] || pathExistsInTree(...))`
- 🧪 动态实证（`resolveGroupPath('wiki/部署运维', tree={wiki:{}}, ctx)`）：
  ```
  null 占位  -> matched=false
  对象值占位 -> matched=true
  补全（输入 '部署运维' → 'wiki/部署运维'）null -> matched=false；对象 -> matched=true
  ```
- 💥 旧代码传的是 `cache.groups`（值恒为对象，恒真）→ 行为等价性不成立：该分支存在的意义正是「relations 有、group-index 树无/不同步」的兜底，现在被禁用，表现为「父节点路径不存在」而非自动补全。当前树与 cache 通常同步，故实际触发面有限，但属**静默语义退化**。
- 💡 修复：占位改 `{ hot_relations: [] }`（保持真值语义），或把消费侧改为 `Object.prototype.hasOwnProperty.call(...)`。

### [P1-3] `fts-rebuild` 把「分片损坏」降级为「静默成功 0 条」——fail-loud → 假成功

- 📍 `src/lib/fts-rebuild.ts:50-59`
  ```ts
  try { cache = loadCacheShape(scope); }
  catch {
    if (!fs.existsSync(cachePath)) return { indexed: 0, relations: 0, errors: [] };  // ← 新布局分片损坏走这里
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }
  ```
- 💥 新布局下旧文件是 `.bak` → 任一 `relations/<g>/cache.json` 损坏（`readGroupCache` 抛错，`group-cache.ts:282-285`）→ 直接返回 0 条且 `errors` 为空。调用方 `restore-snapshot.ts:174` 在 restore 尾部无条件调用它 → **还原报告 ok，FTS-only 文档未重建且零告警**。旧实现（`JSON.parse` 再抛）= fail-loud，属明确降级。
- 💡 修复：catch 内区分「两布局均无数据」（返回 0）与「布局存在但读失败」（把原始错误放进 `errors` 并返回 `indexed:0` + 显式告警）。

### [P1-4] `onScopeRelationsInvalidated` 在生产代码**零注册** → 「写后主动失效」是台账幻觉

- 证据：全仓 `grep -rn onScopeRelationsInvalidated src/ bin/ web/` → 仅 `src/lib/group-cache.ts:116` 定义处；注册只出现在测试（`test/group-cache.test.ts:178/200/251`、`test/restore-layout-matrix.test.ts:90`）。
- 后果：`group-cache.ts:110` 注释宣称的 4 个消费方（docListCache / relation-map / scopeDocCountCache / hiddenEditIndexIds）**均未接线**；`restore-snapshot.ts:170` 的 `notifyScopeRelationsInvalidated` 是空广播（其注释声称「必须立即失效，不等身份戳兜底」）。
- 当前正确性靠 `getRelationsCacheIdentity` 三元组兜底（我在 P0 之后复核：doc/list、relation-map、计数、隐藏集四处均逐次核身份，未发现 stale 缺口），但**计划/AGENTS「写后主动失效已完成」的结论不成立**，且一旦出现「identity 不变而数据变」的写路径（如 P1-5 的旧文件直写）就无兜底。
- 💡 修复：要么在 4 个消费方模块加载期真正注册监听（并加测试断言「写后缓存立即失效」），要么删除广播机制与相关注释、把失效口径统一写成「身份戳兜底」，避免文档-实现漂移。

### [P1-5] `manage-index.ts` CLI 本地回退路径仍读旧文件（同文件 3 处已迁移，属遗漏）

- 📍 `src/manage-index.ts:610-611`
  ```ts
  const cachePath = getRelationsCachePath(resolvedScope);
  const groupsData = readJson<Record<string, unknown>>(cachePath)?.groups as Record<string, unknown> || {};
  ```
- 同文件 `:98`、`:215`、`:353` 已改用 `listGroupPaths(scope)`/双轨读 → 同一文件内不一致，确认为遗漏。
- 💥 新布局下 `groupsData` 恒空 → `--action create/delete` 的 `resolveGroupPath` 自动补全退化（用户看到「父节点路径不存在」+ 提示质量下降）。注意与 P1-2 叠加：即使改了这行，`null` 占位仍会削弱匹配。
- 💡 修复：与 `:98` 一致改 `listGroupPaths`；顺手把 P1-2 的占位语义一并修正。

### [P1-6] `restore` 二次确认预览丢失「现有数据规模」

- 📍 `src/restore.ts:99-116`（`summarizeScopeDir` 只 `path.join(scopeDataDir, 'relations-cache.json')`）
- 💥 新布局 scope 执行 `ki restore ... --from-snapshot`（不带 `--yes`）时，NEG-11 承诺的「现有数据：N 个 Group、M 条 Relation」一行静默消失，且与 `docs/backup-restore.md:169` 的文档承诺矛盾 —— 破坏性覆盖前的可见性下降。
- 💡 修复：改 `readAllGroupCaches(scope)`（或按目录统计）计数。

### [P1-7] 崩溃迁移遗留孤儿分片 → 已删除的组可能「复活」（静态推演，🧪 建议运行验证）

- 证据：迁移只写不清（`group-cache.ts:407-449` 从不清理已存在的 `relations/`）；读取收养一切含 `cache.json` 的目录（`readAllGroupCaches:351-384`）；旧布局删除**明确不清理分片**（`deleteGroupCache:496-499` 早退；`delete-relation.ts` 旧分支只改旧文件）。
- 触发序列：旧布局 → 写 A 分片后、写 manifest 前 `kill -9` → 此时仍是旧布局，用旧分支删组 A（只改旧文件）→ 下一次写触发二次迁移按旧文件重写分片 → **A 复活**（元数据在、KB/树已删 → Browse 出现「有元数据无原文」的幽灵条目；冲突检测/导出把它当既有组）。
- 💡 修复：迁移前若检测到「无 manifest 但有 `relations/`」的残留，先清理该目录再重建（或迁移后校验分片键集合 ⊆ 旧文件键集合并清理差集）；补一条 SIGKILL 序列测试。

### [P1-8] 顶层组名 `relations` 与分片根目录同名 → 删组会连根删除该 scope 全部元数据

- 证据：分片根 = `<kbDir>/<scope>/relations`（`group-cache.ts:36-39`）；local-kb = `<kbDir>/<scope>/<groupPath>/index.json`（`lib/scope.ts:115-118`）→ 组名 `relations` 时两者同目录；`delete-relation.ts:360-368` 级联 `fs.rmSync(path.dirname(getLocalKbDir(scope, resolvedGroup)), { recursive: true })` → **manifest + 所有组分片一并删除**，随后 `hasShardedLayout=false` 且旧文件不存在 → 其余组元数据永久丢失（`listAllScopes` 立即判该 scope 非 KB）。
- 触发：导入源目录含顶层 `relations/`（或 `--group relations`），之后删除该组。
- 💡 修复：为分片根使用不可与组路径碰撞的保留名（如 `.relations/`）或在 `getGroupCachePath`/导入落点校验中拒绝保留段；至少加一条「组名 = 保留名」的测试。

---

## 🟢 P2（可选优化 / 一致性）

1. **空库被误判为「未导入」**：`src/export.ts:146-161`（`all.size===0` 且无旧文件 → `fail("relations-cache.json 不存在…请先 import")`）、`src/lib/wiki-sync.ts:227-233`（同样文案）。manifest 存在但 0 组（删空全部组、模板 scope 迁移后）时，命令从「正常输出 0」变为报错，且文案指向旧路径。
2. **`relation-map` 契约与实现矛盾**：`src/lib/relation-map.ts:18` 声明「数据缺失/损坏：返回空 Map，不抛错」，但 `:64` 的 `getRelationsCacheIdentity` 在 `buildRelationMap` 的 try 之外 → manifest 损坏时 `ki search`（`src/search.ts:347-349` 无 try/catch）整条失败。建议二选一并同步注释。
3. **`scope list` 对 manifest 损坏是非结构化失败**：`src/scope.ts:94` 未包 try/catch（`computeScopeDocCounts` 的 catch 在 `:116` 之外）→ CLI 本地路径无 catch（`:323-328`）冒泡为 unhandled rejection；而同一目录的分片损坏却走 `:133-135` 静默归 0。同一故障四种表现（崩/静默空/静默 0/明确 failed），诊断不收敛。
4. **`ki migrate-relation-cache` 输出语义错配**：`src/migrate-relation-cache.ts:119` `groups: stats?.groups ?? manifest?.revision` —— 用 revision 冒充组数。
5. **`initScope` 仍以旧布局出生**：`src/lib/store.ts:289-296` 复制 `_template/relations-cache.json`（模板确实存在）→ 每个新 scope 首写必做一次迁移并留下**空 `.bak`**；也与 `docs/architecture.md:64-70` 的「v3 默认布局」表述不符。
6. **死代码**：`src/lib/import.ts:856` `const relationsCachePath = getRelationsCachePath(scope);` 全文件未使用；`src/sync-relation.ts:21` `getRelationsCachePath` 死导入；`tsconfig.json` 无 `noUnusedLocals`（故 build/lint 不报，计划的「lint 零诊断」属实但残留仍在）。
7. **死参数**：`loadCacheShape(scope, onlyGroups)` 的 `onlyGroups` 生产/测试**零调用方**（注释却把它描述成 S0-5 语义）；且新布局与旧布局对该参数的键处理不一致（新布局经 `normalizeGroupPath` 归一化，旧布局精确匹配未清洗键）→ 未来启用必踩坑，建议删除或补齐语义。
8. **重复实现**：`src/sync-relation.ts:1118` 内联剥 `项目根/` 前缀，未复用 `normalizeGroupPath`，与 `group-cache.ts:50-51`「护栏 #7 单一来源」的注释不符（功能等价）。
9. **测试基础设施**：4 个新增测试中 3 个无 `after` 清理（`tmpdir` 残留）；`test/restore-layout-matrix.test.ts` 的 B2 走 FTS-only 写路径却未 `closeFtsEngine`（其余 FTS 测试均显式关闭，存在 worker 线程吊住进程的风险，🧪 未运行验证）；`test/import-interrupt-convergence.test.ts:144-147` 的 `if (sawWrite) { SIGKILL }` 未命中时测试仍通过（「中断」语义可空转）；`test/group-cache.test.ts:77` 自比较断言（no-op）、`:137` mtime 相等断言在粗粒度 FS 上失效。
10. **测试配置一致性**：`test/test-config.ts` 的 `hasTestEmbeddingKey`（仅看 env）与真实写入 embedding 段的条件（还需 `userEmb.baseURL`）不一致 → 环境只注入 `SILICONFLOW/GITNEXUS` 且用户配置无 `baseURL` 时，向量用例不会 skip 而会失败。本机复核：用户配置 `apiKey` 为明文（非 `${VAR}` 引用）→ 已注入 `DASHSCOPE_API_KEY` 内存传递、测试配置文件只写 `${DASHSCOPE_API_KEY}` 引用，**决策 #4 的「密钥不落盘」成立** ✅。
11. **文档漂移**（`docs/architecture.md:148-152` mermaid 仍画 `relations-cache.json`；`docs/backup-restore.md:118-122`「备份内容 = relations-cache.json」与 `:51-74` 自相矛盾；`docs/cli.md` 迁移章节后接的是 export 的目录树、`:1552-1555` 仍写 `relations-cache.json`；回滚说明未写顺序/停机要求与「回滚=丢弃迁移后写入」语义）。

---

## 🟢 亮点（值得肯定）

1. **原语分层干净**：`group-cache.ts` 把路径/读/写/迁移/失效收敛为单一入口，业务消费方经 `loadCacheShape`/`persistCacheShape` 桥接，内部逻辑零改动 —— 这是本次能在 W1-W9/R1-R10 大面积铺开的基础。
2. **写路径纪律**：三步曲（`bumpManifestRevision` → WAL 分片 → `invalidateScopeCaches`）无绕过（穷举 `getGroupCachePath`/`getRelationsManifestPath`/`walWrite` 调用点确认），批写共享一次 bump。
3. **穿越校验**：`getGroupCachePath` 双锚点 + 绝对路径/`..`/`.`/空段拒绝，4 形态测试锁定。
4. **惰性迁移的崩溃安全设计**：先写分片 → 写 manifest → 改名 `.bak`，崩溃在任一步都退回「旧布局完整可读」，再写时幂等重迁移 ✅。
5. **开发过程抓获 3 个产品级缺口**（`listGroupPaths` 恒空、`listAllScopes` 迁移后 scope 消失、`persistCacheShape` 键未规范化）并各自带测试锁定，`listAllScopes` 我在真实导入后复核 `kb:true/wikiCount:4` ✅。
6. **rebuild-vector 分片事务**：`marker.layout='sharded'` 让回退函数布局感知（`rebuild-vector.ts:184-190/217-227`），四窗口崩溃矩阵推演有收敛路径。
7. **迁移命令**：写锁串行 + 锁内复检 + 幂等/noData/`.bak` 回显，7 态冒烟。

---

## 🧪 测试验证建议（本次已实际执行的部分已标注）

| # | 验证内容 | 方式 | 结果 |
|---|----------|------|------|
| 1 | 真实 `handleDirectImport` 后新布局落盘 | 隔离 HOME + jiti | ✅ manifest=true / legacy 不存在 / `.bak` 存在 / 2 组分片 |
| 2 | `readLiveRelation` / `executeBackup` 在新布局 | 同上 | ❌ 两者均失败（P0-1/P0-2） |
| 3 | 旧布局迁移后上述入口 | 同上 | ❌ `.bak` 生成后同样失败 |
| 4 | `resolveGroupPath` 的 `null` 占位语义 | 直接调用对比 | ❌ matched true→false |
| 5 | 非递归 `rmSync(目录)` 行为 | node 实跑 | ❌ `ERR_FS_EISDIR`（P1-1 成立） |
| 6 | 孤儿分片复活序列（P1-7） | 临时 scope + SIGKILL | ⏳ 建议补做（静态推演已成立，无运行证据） |
| 7 | 分片损坏时 restore 的 FTS 重建（P1-3） | 临时 scope 写坏分片 → restore | ⏳ 建议补做 |
| 8 | 组名 `relations` 撞根（P1-8） | 临时 scope + 导入 `relations/` 目录 | ⏳ 建议补做 |

> 本次未运行项目正式测试套件（静态 + 定向动态验证为主）；计划台账所述「20 套件 366 用例全绿」未复跑，仅以下两处被证伪：`edit-relation`（种子全为旧布局）与 backup（无测试文件）。

---

## 💥 缺陷 → 功能影响翻译

| 缺陷 | 预期功能行为 | 实际功能行为 | 功能影响 |
|------|--------------|--------------|----------|
| `P0-1` | 迁移后仍可编辑/发布任意已有 Relation（MCP/CLI/Web 在线编辑） | 一律报「Relation 不存在」；Web 在线编辑保存失败 | 🔴 文档编辑能力对已迁移 scope 整体不可用 |
| `P0-2` | 用户可对任何有数据的 scope 执行 `ki backup` | 报「尚未初始化（缺少 relations-cache.json）」 | 🔴 备份能力对新布局 scope 失效（数据保护缺口） |
| `P1-1` | `ki scope delete --yes` 干净删除并清理迁移产物 | KB/配置/向量已删后报 EISDIR；残留备份目录 | 🟡 删除命令误导性失败 + 残留污染后续重建 |
| `P1-2`/`P1-5` | Group 路径自动补全在树/cache 不同步时兜底生效 | 报「父节点路径不存在」 | 🟡 命令易用性退化（有明文提示，无数据损失） |
| `P1-3` | 分片损坏时 restore 明确告警 | 静默返回 0 条，报告成功 | 🟡 还原后 FTS-only 文档不可检索且无感知 |
| `P1-7` | 删除的组不再出现 | 崩溃窗口后已删组复活为幽灵条目 | 🟡 元数据-原文不一致，污染后续导入/导出 |
| `P1-8` | 任意合法组名可安全增删 | 组名 `relations` 时删除将毁掉该 scope 全部元数据 | 🟡 低概率、不可逆 |

**🚧 合入前必须完成（P0）**：修 `P0-1`（`readLiveRelation` 双轨化，保留错误文案）+ 补新布局用例；修 `P0-2`（备份门禁布局感知）+ 补 backup 测试。

**📌 合入后跟进（P1/P2）**：P1-1 ~ P1-8 逐条（建议 P1-1/P1-3/P1-4/P1-6/P1-7 与 P0 同批修，均为小改）；P2 一致性清理可另开一批。

---

## 🧨 阶段 7：二次质疑（challenger）

- **触发说明**：按 code-review 阶段 7，合入结论非 ✅ 时应静默跳过 challenger；但按用户 always-apply 规则（auto-review → 复杂场景自动接力 challenger）本次**已执行**，且本次发现恰好证明静态/测试网存在盲区。
- **执行方式**：独立子代理对抗式审查（假设改动仍是坏的）+ 主审逐条复核。产出并登记：`review/challenge-report.md`（摘要见下）。
- **成立且已复核为高风险的质疑**：P1-1、P1-3、P1-7、P1-8、P1-4（详见两份报告，结论已回写到本报告）。
- **未采纳/降级的质疑**：`readAllGroupCaches` 的 `readdir catch`（P2-3 归入「同故障多种表现」，因旧实现同故障同样非 fail-loud，未升级为本批回归）；「并发惰性迁移无写锁」（daemon 协调器已按 scope 串行化，标 🧪 疑似）。

---

# 修复记录与复验（2026-10-09）

> 本节记录对上方 P0/P1/P2 的修复实现、回归测试与证据。修复范围＝工作区未提交改动（仍在 `master`，未提交）。

## 1. P0 修复（阻塞项）

| # | 修复 | 位置 | 复验证据 |
|---|------|------|----------|
| P0-1 | `readLiveRelation` 改布局感知（`loadGroupCache`：新布局读该组分片 / 旧布局读旧文件），错误文案保持不变（`relation-edit-publish` 按文案分支）；新增「新布局（分片）scope 可编辑 + 可发布」用例 | `src/lib/relation-edit-live.ts`、`test/edit-relation.test.ts` | `edit-relation` **29/29**（新增 1 例：迁移后 edit → finish → published，KB 与分片双写校验） |
| P0-2 | 备份门禁改双布局判定（`relations-cache.json` 或 `.relations/manifest.json` 任一存在），错误文案同时给出两条路径 | `src/lib/backup.ts` | 新增 `test/backup-layout.test.ts` **4/4**：新布局可备份且 **tar 内容含 `.relations/manifest.json` 与组 分片**、迁移后（`.bak`）可备份、旧布局兼容、两布局皆无 fail-loud |

## 2. P1 修复

| # | 修复 | 位置 | 复验证据 |
|---|------|------|----------|
| P1-1 | 迁移产物清理改 `recursive: true`（分片备份是目录） | `src/lib/scope-collection.ts` | 新增 `test/purge-migration-artifacts.test.ts` **3/3**；**回退验证**：改回非递归即复现 `ERR_FS_EISDIR`（与审查结论一致） |
| P1-2 | 新增 `buildGroupMatchContext()`：`resolveGroupPath` 上下文占位值改**真值对象**；`get-module-info`(×2) 与 `manage-index`(×4) 全部改用 | `src/lib/group-cache.ts`、`src/get-module-info.ts`、`src/manage-index.ts` | `group-cache` **20/20**（含 helper 真值语义例）；`get-module-info` **12/12**（新增「树外组可解析」端到端例）；**回退验证**：占位改回 `null` 时该端到端例复现 `Group "deploy" 未匹配到有效路径` |
| P1-3 | `rebuildFtsOnlyScope` 区分「两布局皆无（空 scope）」与「存在但读失败」，后者返回结构化 `errors`（不再静默 0） | `src/lib/fts-rebuild.ts` | 新增 `test/fts-rebuild-layout.test.ts` **4/4**（含旧布局损坏同样可见） |
| P1-4 | 失效广播真正接线：`relation-map` / `docListCache` / `scopeDocCountCache` / `hiddenEditIndexIds` 四个消费方在模块加载期注册 `onScopeRelationsInvalidated`（身份三元组仍为跨进程兜底） | `src/lib/relation-map.ts`、`src/lib/mcp-http-api.ts`、`src/scope.ts`、`src/lib/relation-edit-draft.ts` | `relation-map` 12/12、`mcp-http-api` 38/38、`scope-doc` 18/18；`group-cache` 的失效广播用例覆盖注册表语义 |
| P1-5 | CLI 本地回退路径改双轨键枚举（与同文件其余 3 处一致） | `src/manage-index.ts` | `manage-index` **10/10** |
| P1-6 | `summarizeScopeDir` 改布局感知计数（恢复"现有数据：N 组 / M 条"） | `src/restore.ts` | `restore` **17/17** |
| P1-7 | 迁移时清理孤儿分片：仅当**旧文件存在**（以旧文件为唯一真相）时，清掉不在旧键集合内的分片；无旧文件但分片存在（manifest 丢失）**绝不清理** | `src/lib/group-cache.ts` | `group-cache` +2 例：孤儿分片不复活 / 仅存分片受保护 |
| P1-8 | 分片根改**保留名** `.relations/`（点号前缀，导入扫描本就跳过点号目录）：消除「名为 `relations` 的顶层组删除时连根删除全部分片」；另加 `isRelationsRootPath()` 守卫，`delete-relation` 递归删 KB 前判定，命中则只删该组 `index.json` | `src/lib/group-cache.ts`、`src/delete-relation.ts`、`src/lib/scope.ts`（`listAllScopes` 判定同步） | `group-cache` 新增保留名/护栏用例；`delete-group` 7/7、`scope-doc` 18/18、`scope-isolation` 5/5；布局名相关文档 16 处已同步（architecture / backup-restore / cli / error-handling / manage-index / query-kb / codekb-agent-guide / build-kb / test/e2e-guide） |

## 3. P2 修复

- `loadCacheShape` 的 `onlyGroups` 死参数删除（注释同时说明"单组读请直接用 `loadGroupCache`"，避免新旧布局语义分叉）
- `src/lib/import.ts` 死变量、`src/sync-relation.ts` 死导入清理
- `ki migrate-relation-cache` 输出改**实际落盘统计**（不再用 `revision` 冒充组数）+ 去掉重复 `ok` 字段；帮助文案补「停机 + 先改名后删目录 + 回滚即丢弃迁移后写入」
- `export` / `wiki-backfill` 对「已初始化但 0 组」的空库不再误报"未导入/不存在"
- `query-group` 读取异常不再一律吞成空树：仅"两布局皆无"返回 null，其余 fail-loud；`CACHE_SHAPE_INVALID` 文案指向真实存在的文件（新布局 manifest）
- `ki scope list` CLI 加结构化错误处理（损坏 manifest 不再冒泡成 unhandled rejection）
- `relation-map` 契约注释与实现对齐（缺失→空 Map；损坏→fail-loud）
- `sync-relation` 三处内联 `项目根/` 剥离统一走 `normalizeGroupPath`（护栏 #7 单一来源）

## 4. 修复过程中新发现并修复的问题（原审查未覆盖）

1. **`sync-relation` 写入侧前缀归一破坏旧布局配对**（🔴 语义破坏）：上一轮「三入口统一剥 `项目根/` 前缀」在**旧布局** scope 上会让"更新已有 Relation"找不到带前缀的原键 → 新建同 text 条目、旧条目与旧索引 ID 永久残留（同组双份）。改为**布局感知**：新布局剥（对齐迁移后的分片键）、旧布局保持原样（对齐旧文件键），且**布局在函数入口一次性判定**（预失效阶段会触发惰性迁移，中途重判会让同一条 item 前后落到不同键）。证据：`sync-relation-bulk-vector` 由 1/9 恢复为 7/3（3 例在 HEAD 基线同样失败，属既有/环境）。
2. **`test/integration.test.ts` / `test/fts-only-client.test.ts` / `test/sync-relation-bulk-vector.test.ts` 的旧布局直读**：导入/同步/重建会惰性迁移，测试仍直读 `relations-cache.json` → 新布局下恒 ENOENT/null（`fts-only-client` 因断言异常未走到 `closeFtsEngine` 而**挂死**）。全部改为布局感知读取：`integration` 10/10、`fts-only-client` 2/2（且正常退出）、`bulk-vector` 恢复至基线水平。
3. **既有类型缺陷 2 处**（本批引入，非 HEAD）：`migrate-relation-cache` 重复 `ok` 字段、`rebuild-vector` 的 `CacheGroup.hot_relations` 宽松结构体与 `GroupCacheDoc` 契约不符 → 改用 `Relation[]`。

## 5. 回归与验证汇总

- **新增测试文件 3 个**：`backup-layout`(4)、`purge-migration-artifacts`(3)、`fts-rebuild-layout`(4)
- **扩展测试 4 个**：`group-cache`(+4→20)、`edit-relation`(+1→29)、`get-module-info`(+1→12)、`query-group`(+1→38)
- **修复测试布局假设 4 个**：`integration`、`sync-relation`、`sync-relation-bulk-vector`、`fts-only-client`
- **全量回归**：仓库全部 TS 套件逐一独立进程运行 —— 除下述两项外全部 PASS（含 chat 侧 17 套件、向量侧 12 套件）
  - `test/memory-id-map.test.ts`：**既有失效**（import 已被删除的 `src/lib/diff.js`，与批次 2 无关）→ 建议删除或改写
  - `test/sync-relation-bulk-vector.test.ts`：3 例在 **HEAD 基线同样失败**（向量不可用/hints/env），已复原至基线水平
- **类型检查**：`npm run build`（`tsconfig.src.json`）通过；`tsc -p tsconfig.json --noEmit` 相对 HEAD 基线**新增 0 条**（余 3 条为既有：`delete-relation` 的 `BatchDeleteResult.error`、`import-budget` 的 `DISABLED` 类型、`mcp-http` 的 `getActiveResourcesCount`）
- **回退验证 2 项**：purge 非递归 → 复现 EISDIR；占位改回 `null` → 复现"未匹配到有效路径"
- 环境说明：测试期间曾观察到**套件连跑时的偶发失败**（同一套件单独运行即全绿），根因是连跑时的资源竞争（子进程 CLI/向量引擎），与本次改动无关

## 6. 未修项与理由（留待决策）

| 项 | 现状 | 未修理由 |
|----|------|----------|
| `initScope` 仍以旧布局出生（`_template/relations-cache.json`） | 每个新 scope 首写会做一次惰性迁移并留下空 `.bak` | 改成新布局出生会推翻十余个测试的种子方式（它们靠"旧文件存在"预置数据），并影响旧版本对新数据目录的兼容读取；收益仅为少一次迁移与一个空 `.bak`。已在文档标注 |
| `store.ts migrateRelationsCacheKeys` 不区分布局 | 仅当旧文件残留且在位时才写它 | 与"旧文件不自动删除、可回滚"的过渡期折中；当前无生产触发路径（新布局下读旧文件为 null → 早退） |
| 本地 KB 目录不随键重命名迁移（`项目根/...` → 去前缀） | 既有缺口（tree/relations 键会被迁移，KB 目录不会） | 属 rootName 时代遗留；本轮已避免放大（写入侧不再制造同组双份）。若要修需独立需求：迁移 KB 目录 + 附件 + wiki 目标同步改名 |
| 3 处既有类型错误 | 与批次 2 无关 | 修改会触及公共类型（如 `BatchDeleteResult`）与 `@types/node` 版本，建议独立小批处理 |

---

# 第二轮复审（2026-10-09，修复批次之后）

- **审查对象**：同一工作区未提交改动的**最新状态**（master，HEAD `ecf6edc`；49 个已跟踪文件 `+1265/−424` + 12 个新增文件）
- **审查模式**：🔶 深度模式（3 个并行子审查：写路径 / 读路径 / 测试覆盖 + 主 agent 语义一致性与架构串行评估）
- **动态验证**：隔离环境（临时 `KI_CONFIG_PATH` + `PROJECT_ROOT/kb` 临时 scope）实跑复现脚本 2 个（`temp/repro-prefix-divergence.ts`、`temp/repro-prefix-divergence-2.ts`）；`npm run build` 通过；`npx jiti test/group-cache.test.ts` 20/20
- **整体评分**：**C**（存在未修复 P0，按规则最高 C）
- **合入结论**：❌ **不建议按现状合入** —— 修复批次把「旧 key 不进分片路径」实现为**无条件剥离**，反而制造了「分片键 ↔ group-index 树 ↔ local-KB 目录」三者的键分叉，引入一条**静默数据丢失**通路（已完成端到端复现）。旧报告的「同 Scope 全量操作结果与拆分前一致」「对外契约零变化」两条完成判据**不成立**。

## 1. 🔴 P0｜`项目根/` 前缀无条件剥离 → 分片键与树 / KB 路径分叉（export 丢组、query-group 空、delete-group 幽灵数据）

**根因**：新布局把「历史虚拟根前缀」当作脏数据一律剥掉，但**树与 KB 目录并不总是被迁移**。

| 位置 | 行为 |
|------|------|
| `src/lib/group-cache.ts:74-78` `normalizeGroupPath` | 无条件剥 `项目根/` |
| `src/lib/group-cache.ts:81-97` `getGroupCachePath` | 所有分片读写路径都经它归一 |
| `src/lib/group-cache.ts:246-268` `sanitizeLegacyGroups`、`:456-502` 迁移 | 落分片时同样剥前缀 |
| `src/lib/group-cache.ts:626-654` `persistCacheShape` | Map 键再归一（`:640`） |
| `src/sync-relation.ts:133-135` `normalizeGroupKeyForWrite` | 新布局入口剥前缀 |
| `src/lib/store.ts:103-122` `migrateGroupIndex` | **只在 group-index 还是 `roots` 旧格式时**才把 `项目根` 子节点提升为顶层；已是 `groups` 格式（含字面顶层组 `项目根`）时**不迁移** |

于是当某 scope 存在**字面顶层组 `项目根`**（rootName 时代导入的真实结构：KB 目录 `<scope>/项目根/X/`、树节点 `项目根`→`X`、旧 cache 键 `项目根/X` 三者配套）时，首次写路径触发惰性迁移后：
树 = `项目根/X`、KB = `<scope>/项目根/X/`，而分片 = `.relations/X/cache.json` → **三键分叉**。

**端到端复现（隔离环境实跑，非静态推演）**：

```text
[迁移前] stats = {"total":1,"exported":1,...} | 产物 = [".../项目根/测试模块/DocA.md"]
[迁移]   组数 = 1
[迁移后] 分片键 = ["测试模块"]   树键 = ["项目根"]   KB 目录 = "项目根/测试模块"
[迁移后] stats = {"total":0,"exported":0,...} | 产物 = []
→ 结论：迁移前导出 = 有产物 ｜迁移后导出 = 无产物
```

| 消费方 | 实际行为（复现实测） | 影响 |
|--------|---------------------|------|
| `src/export.ts:300-302` | `relationsCache.groups[treeKey]` 未命中 → `continue`，**不记 skipped** | `ki export` 静默导出 0 条（total=0），产物缺失——用户以为导出成功 |
| `src/query-group.ts:918`（树路径查 `groupsData[resolvedPath]`） | `--group 项目根/测试模块` → 「该 Group 路径存在但暂无 Relations」；同一数据用 `--group 测试模块` 才看得到 | 查询按合法路径返回空，用户丢失可见性 |
| `src/delete-relation.ts:290-301` 级联键取自 `listGroupPaths`（已剥）与 `resolvedGroup`（树路径）比较 | 级联键集为空 → `relationCount: 0` | 向量/FTS 的 `memoryIds`/`ftsIds` 未收集 → **向量与全文索引残留**（搜索仍命中已删文档） |
| `src/delete-relation.ts:396` `if (cascadeKeys.length > 0) deleteGroupCache(...)` | 守卫为假 → **分片不删**（复现：删组后 `listGroupPaths` 仍返回 `测试模块`） | 元数据复活为幽灵组；`readAllGroupCaches`/relation-map/rebuild-vector 继续收养它 |
| `src/lib/fts-rebuild.ts:77`、`src/lib/rebuild-vector.ts` | 以分片键拼 `getLocalKbDir(scope, key)` 读原文 | 同类的**反向**分叉：新布局下读到 KB 缺路径 → 记录错误 / 重建为 0 |
| `src/delete-relation.ts:108-118`（单条删除） | `resolveGroupPath` 返回树路径 → `cache.groups['项目根/测试模块']` 未命中 → `relIdx=-1` | 复现：`{"ok":true,...,"deleted":false,"cacheRemoved":false,"kbRemoved":true}`，删除后分片热区仍为 `[["测试模块",["DocA"]]]` —— **KB 已删而元数据留档**，条目成为幽灵（rebuild/relation-map 仍会收养） |

**真实数据佐证**（本机 `/root/.ki-data`）：`bulk-test` 同时具备三者配套的 `项目根/测试模块` 形态（树 `{"项目根":{"测试模块":{}}}`、cache 键 `项目根/测试模块`、KB `bulk-test/项目根/测试模块/index.json`）。仓库自身测试亦处于分叉态：`test/sync-relation.test.ts:116` 用 `getLocalKbDir(scope, '项目根/监控/告警中心')` 断言 KB，而 `:135` 断言 `cache1.groups['监控/告警中心']`——**同一用例的两侧键不同**，即分叉已被写入测试基线（这也是缺陷未被任何用例拦下的原因）。

### 1.1 补充实测：**与历史兼容无关**（2026-10-09 追加，回答「若不考虑历史兼容，P0 还是问题么」）

剥离是**无条件的字符串变换、且只作用于元数据侧**（树与 KB 由 `ensureGroupPathInTree` / `getLocalKbDir` 用原路径拼），因此该缺陷不依赖旧数据：

| 实验（`temp/repro-prefix-fresh-scope.ts`） | 结果 |
|---|---|
| 全新 scope：删除模板 `relations-cache.json` → `writeGroupCache('bootstrap')` 建 manifest → 删引导分片 → **从未有过 legacy 布局数据** → 导入到组 `项目根/测试模块` | 分片键 `["测试模块"]`、树键 `["项目根"]`、KB `项目根/`、`export stats = {total:0,exported:0}`、分片键对应 KB 路径不存在 → **P0 全量复现，零历史** |

更根本的问题是**映射非单射**：`项目根/X` 与 `X` 是两个合法且互相独立的组名，却指向同一分片 `.relations/X/cache.json`。

| 实验（`temp/repro-prefix-collision.ts`，同样零历史） | 结果 |
|---|---|
| 先导入组 `测试模块`（DocA），再导入组 `项目根/测试模块`（DocB） | ① 分片只有 1 个：`["测试模块"]`，热区只剩 `["DocB"]` → **DocA 的元数据被静默覆盖**；② 树键 `["测试模块","项目根"]`（树仍视为两个组）；③ KB 两个目录都在（`测试模块/`、`项目根/`）；④ `export stats = {total:1,exported:0,empty:1}`，产物路径 `测试模块/DocB.md` → **在 A 组的位置导出 B 组条目，且正文为空（串组）** |

**结论**：「不考虑历史兼容」并不能消解 P0——只有**同时**满足两个前提才会消失：① 剥离必须一致作用于全部存储（元数据 + 树 + KB + 附件/wiki/草稿），即真正一次性全量改名（方向 C）；② 必须把 `项目根` 段声明为**保留名**并在所有入口 fail-loud 拒绝（否则「用户就是要一个叫 `项目根` 的顶层组」仍会撞车/被静默改名，且该限制本身是对外契约变化）。两者成本与影响面均大于方向 A，而 A 不引入任何保留名限制。

**修复方向（二选一，建议 A）**：
- **A（推荐，契约最小）**：恢复不变量「**键 = group-index 树路径 = local-KB 相对目录**」——新布局键**原样**写入（对齐设计 D1「布局镜像 local-kb」），剥离只保留在 `store.ts` 的 `roots→groups` 迁移时机（那里树与键成对迁移，不会分叉）。同时删掉 `sync-relation` 的布局感知归一与 `persistCacheShape` 的 Map 键归一，回归单一语义。可见性最好、与 HEAD 行为逐字一致；代价是 `项目根/X` 与 `X` 在**同一 scope 内**可能并存（这正是 HEAD 的既有行为）。
- **B（精确但更重）**：剥前缀改为**树感知**——仅当该 scope 的 group-index 树**不存在顶层 `项目根` 节点**时才剥。语义正确，但存储层需读树（分层倒置），且迁移/读取两侧都要判定。

> 未直接改动的理由：该行为是修复批次「决策 #9」的**显式拍板**，方向反转属设计决策变更，按项目习惯由用户拍板后执行。

## 2. 🟡 P1（建议修复）

1. **`src/lib/import.ts:1691-1710` `persistTouchedGroups` 是 `persistCacheShape` 的手抄副本且未做键归一**（`group-cache.ts:638-641` 注释明确要求归一）。当前状态下 `cache.groups[groupPath]` 用**原始键**取值 → 新布局下带前缀的触达组 `if (!data) continue` **静默跳过落盘**：import 的 FTS 预标记 / 失败回滚 / 路径向量回滚三个中断安全点对该组失效。修复：删除该函数，调用 `persistCacheShape(scope, cache, touchedGroups)`（5 处调用点语义等价）。
2. **`src/delete-relation.ts:260-262` 用 `null` 做 resolve 上下文**，违反 `group-cache.ts:356-366` 的不变量（值必须是真值对象，`group-resolve.ts:124/139/188` 用真值判断）。传 `null` 使「relations 有该组、树里缺该组」的兜底静默失效 → 报「未匹配到任何节点」。修复：改用 `buildGroupMatchContext(allKeys)`（`manage-index.ts:215` 已是正确写法）。
3. **`src/lib/relation-map.ts:135-137` catch-all 把「分片/manifest 读失败」降级为空 Map 并被身份三元组"认证"缓存 10 分钟**（该 scope 的检索结果将全量丢失 group/relation/tags/ftsLocator 标注）。与本文件头 `:19-21`「损坏 → fail-loud」以及其它消费方（query-group/fts-rebuild/export）的口径分叉。修复：仅「两布局皆无数据」返回空，其余上抛。

## 3. 🟢 P2（可选 / 一致性）

| # | 位置 | 问题 |
|---|------|------|
| 1 | `group-cache.ts:167-176 / 212-221 / 439-446` | manifest 结构损坏 → `readRelationsManifest` 返回 null → `loadPartitionConfig` 静默回落默认 `halfLifeHours`（评分全变）、`ensureManifest` 静默把 `revision` 归零并丢弃 `partition_config`；与 `getRelationsCacheIdentity:196-199` 的 fail-loud 口径不一致 |
| 2 | `group-cache.ts:548-552` | `deleteGroupCache` 在 manifest 缺失时静默 no-op → 中断迁移窗口内的删除不生效，孤儿分片可复活已删组 |
| 3 | `group-cache.ts:326-331` | `collectShardGroupPaths` 吞 `readdir` 异常 → EACCES/EMFILE 时全库静默显示为空（与「已初始化 0 组」不可区分） |
| 4 | `get-module-info.ts:102-118` → `:207-213` | 布局判定跨 `await`（TOCTOU）：窗口内跨进程迁移完成 → 评分回写落到 `.bak`，此后无人读 |
| 5 | `delete-relation.ts:102/107/273` | `catch { return 'relations-cache.json 不存在' }` 吞掉分片/manifest 损坏的 fail-loud；用 `getRelationsCachePath().replace('relations-cache.json','group-index.json')` 反推路径（应用 `getGroupIndexPath`） |
| 6 | `manage-index.ts:305-313` | 级联逐键调 `deleteGroupCache` → N 次 bump + N 次失效（违反「批内共享一次 bump」）；删空后 `.relations/` 空根残留 |
| 7 | `src/restore.ts:246-279` | 破坏性覆盖 scope 目录后未调 `notifyScopeRelationsInvalidated`（广播只接在 `lib/restore-snapshot.ts:170` 的 daemon 路径）；正确性靠身份三元组兜底，属一致性延迟 |
| 8 | `group-cache.ts:92-95` | `resolved !== target && !resolved.startsWith(...)` 中 `path.join` 已归一 → 第二条件恒假，属死判定（真正的守卫是上面的段校验，勿删段校验） |

## 4. 🧪 测试缺口（本 P0 未被拦下的结构原因）

- **无一条用例跨「树键 ↔ 分片键 ↔ KB 路径」做全量等价校验**：所有 `项目根/` 用例都「同一把刀切两边」（读写同经 `normalizeGroupPath`），因此分叉落在断言视野之外；`test/sync-relation.test.ts:116 vs :135` 反而把分叉固化为期望。
- `test/group-cache.test.ts:77`：`assert.deepEqual(gc.loadPartitionConfig(scope), gc.loadPartitionConfig(scope))` 自比恒真（无信息量）。
- `test/import-interrupt-convergence.test.ts:144-152`：`sawWrite` 为假时**不 kill 子进程**，用例退化为「连跑两次完整导入」仍通过；`kill 命中=${sawWrite}` 只写在断言消息里，不 skip 不失败。
- 缺：import 后「每个分片键都能被 group-index 解析」的不变量断言、export/delete-group 在分叉态下的回归、`getRelationsCacheIdentity` 对损坏 manifest 的 fail-loud、docListCache/scopeDocCountCache 的跨进程失效。

## 5. 修复批次复核（✅ 通过项，未回退）

- ✅ 三步曲原语与 `writeGroupCacheBatch` 共享一次 bump（`group-cache.ts:510-542`）；`test/group-cache.test.ts` 20/20 实跑通过。
- ✅ 分片根改保留名 `.relations/` + `delete-relation.ts:364-369` `isRelationsRootPath` 守卫（消除「名为 `relations` 的组毁全量元数据」）。
- ✅ P0-2 备份门禁改双布局判定（`backup.ts:43-49`，`test/backup-layout.test.ts` 含 `tar -tzf` 内容断言）。
- ✅ `purgeVectorMigrationArtifacts` 递归删除（`scope-collection.ts:359`，回退即复现 EISDIR）。
- ✅ `fts-rebuild` 区分「空库」与「损坏」并返回结构化错误（`:44-62`），不再静默 0。
- ✅ `buildGroupMatchContext` 真值占位 + `manage-index.ts:215` 正确接线；失效广播 4 个消费方真实注册（`scope.ts:93-95` 等）。
- ✅ 安全面：分片路径双锚点穿越校验、绝对路径/`..`/`.`/空段拒绝；破坏性路径有空路径守卫。
- ✅ 构建：`npm run build`（`tsc -p tsconfig.src.json`）通过。

## 6. 动态验证说明

- 复现脚本（保留为审查证据，不进正式套件）：`temp/repro-prefix-divergence.ts`（export 前后对照）、`temp/repro-prefix-divergence-2.ts`（query-group / delete-group）。
- 环境：临时 `KI_CONFIG_PATH`（`test-config.ts`）→ `dataDir = <repo>/kb/<临时 scope>`，**未触碰** `/root/.ki-data` 与 7423 常驻 daemon。
- 断言口径：脚本输出为**实跑观察值**（非静态推演）；`npm run build` 退出码 0；`group-cache` 套件 20/20。

---

# 第二轮修复与复验（2026-10-09，用户拍板「全面修复」）

**修复方向**：采用报告建议的**方向 A** —— 恢复「分片键 = group-index 树路径 = local-kb 目录」不变量；前缀剥离只保留在 `store.ts` 的 `roots → groups` 迁移时机，并把该迁移扩展到新布局（分片键一起改名）。

## 1. 代码改动

| 类别 | 位置 | 改动 |
|------|------|------|
| **P0** | `src/lib/group-cache.ts` | 删除 `normalizeGroupPath`（无条件剥前缀）；`getGroupCachePath` 键原样 + 保留段校验与 join 越界复核（去掉恒假判定）；`sanitizeLegacyGroups` 改为**只补字段不改键**（去掉同名合并——该分支只可能由剥离本身制造）；`pruneStaleShards` 期望集用原样键 + 新增**祖先保护**（`a` 不在旧文件而 `a/b` 在时不误删）；`persistCacheShape` Map 键不再归一 |
| **P0 配对** | `src/lib/group-cache.ts` | 新增 `renameGroupCacheShards(scope, renames)`：键改名原语（目标存在按 text 合并、批内共享一次 bump+失效） |
| **P0 配对** | `src/lib/store.ts` | `migrateRelationsCacheKeys` 拆为 ①旧单文件改名（原有逻辑）②新增 `migrateShardedKeys`：分片键 `项目根/X → X`（覆盖「先被写路径惰性迁移、后读树触发 roots→groups 提升」的顺序，原实现因旧文件已 `.bak` 而漏迁移） |
| **P0** | `src/sync-relation.ts` | `normalizeGroupKeyForWrite` 改为恒等（保留单点说明），3 处调用点语义随之回归 HEAD；移除 `normalizeGroupPath` 导入 |
| **P1-1** | `src/lib/import.ts` | `persistTouchedGroups` 改为委托 `persistCacheShape`（删除手抄副本，消除键归一缺口与静默跳过落盘）；`loadCurrentLayoutCache` 删除，统一用 `loadCacheShape`（`hasNoRelationsData` 区分「未初始化」与「损坏」） |
| **P1-2** | `src/delete-relation.ts` | resolve 上下文改用 `buildGroupMatchContext`（真值占位）；`deleteGroupCache` 去掉 `cascadeKeys` 守卫（改为无条件调用，内部按目录存在性 no-op）；KB 递归删除前新增「仍在 `kb/<scope>/` 之下」纵深护栏 |
| **P1-3** | `src/lib/relation-map.ts` | 去掉整体 catch：分片/manifest 读失败 fail-loud（与文件头契约一致；「两布局皆无数据」仍返回空 Map） |
| **P2** | `src/lib/group-cache.ts` | `readRelationsManifest` 结构不可用 → 抛错（原静默 null → 评分参数回落默认/revision 归零）；新增 `hasNoRelationsData`；`collectShardGroupPaths` 只容忍 ENOENT/ENOTDIR，其余抛错（原静默空列表）；`deleteGroupCache` 去掉 manifest 缺失时的 no-op + 新增 `deleteGroupCacheBatch` |
| **P2** | `src/get-module-info.ts` | 评分回写按**写入时刻**重判布局（原用 `await resolveGroupPath` 前的快照 → 并发迁移时写进 `.bak`，静默丢失） |
| **P2** | `src/manage-index.ts` | 级联删除改 `deleteGroupCacheBatch`（N 次 bump → 1 次） |
| **P2** | `src/restore.ts`、`src/scope.ts` | CLI restore 覆盖后补 `notifyScopeRelationsInvalidated`；`computeScopeDocCounts` 不再吞异常，`executeScopeListLocal` 逐 scope 兜底 + 可见告警（`ScopeEntry` 契约不加字段） |
| **P2** | `src/delete-relation.ts`、`src/sync-relation.ts` | 5 处 `catch { … 'relations-cache.json 不存在' }` 改为「仅两布局皆无数据才报未初始化，损坏原样透出」；路径反推改 `getGroupIndexPath` |
| **文档** | `docs/architecture.md` | 布局 v3 注记补「键不变量」小节（列出分叉后果与非单射风险、唯一合法剥离时机） |

## 2. 测试改动

- **新增** `test/group-key-invariant.test.ts`（5 例，P0 回归）：三键一致 + export 不丢组；零历史新布局 scope 同样一致；`项目根/X` 与 `X` 各自独立分片（单射）；`query-group`/`delete-group` 按原键工作且无分片残留；roots→groups 迁移时树与分片键一起改名。
- **修正「把缺陷写成期望」的断言**：`test/group-cache.test.ts`（同名合并 → 键原样/单射 + 去掉自比恒真断言）、`test/restore-layout-matrix.test.ts`（B2/B2b 期望键集）、`test/sync-relation.test.ts`（12 处键断言回归 HEAD 原样键，含修掉 `updatedCache.groups['测试'] ?? updatedCache.groups['测试']` 的笔误）、`test/relation-map.test.ts`（损坏 → 空 Map 改为 fail-loud，并新增分片损坏用例）。

## 3. 复验证据（实跑）

**三个原复现脚本全部由失败翻转为通过**（同一脚本、同一断言）：

| 复现脚本 | 修复前 | 修复后 |
|----------|--------|--------|
| `temp/repro-prefix-divergence.ts` | 迁移后 `分片键=["测试模块"]`、`export total:0`、产物为空 | `分片键=["项目根/测试模块"]`、`export {total:1,exported:1}`、产物 `项目根/测试模块/DocA.md` |
| `temp/repro-prefix-divergence-2.ts` | `query-group` 报「该 Group 路径存在但暂无 Relations」；`delete-group` `relationCount:0` 且分片残留 `["测试模块"]` | `query-group` 返回 `DocA`；`delete-group` `relationCount:1`、分片残留 `[]`、树键 `[]` |
| `temp/repro-prefix-divergence-3.ts` | 单条删除 `{deleted:false, cacheRemoved:false}`，删除后分片仍含 `DocA` | `{deleted:true, cacheRemoved:true}`，删除后热区 `[]` |

**回归**（均单独进程实跑）：

| 套件 | 结果 |
|------|------|
| `group-key-invariant`（新） / `group-cache` | 5/5 / 20/20 |
| `mcp-http-api` / `query-group` / `manage-index` / `get-module-info` / `delete-group` / `scope-doc` / `scope-mode` / `scope-isolation` | 38/38 / 38/38 / 10/10 / 12/12 / 7/7 / 18/18 / 6/6 / 5/5 |
| `relation-map`（+1 例） / `rebuild-vector` / `fts-rebuild-layout` / `backup-layout` / `restore` / `restore-layout-matrix` | 13/13 / 40/40 / 4/4 / 4/4 / 17/17 / 3/3 |
| `import-scheme-d` / `import-assets` / `import-export` / `import-conflict` / `import-budget` / `import-vector-rebuild` / `import-interrupt-convergence` | 19/19 / 26/26 / 1/1 / 4/4 / 13/13 / 15/15 / 2/2 |
| `edit-relation` / `document-editor` / `wiki-backfill` / `integration` / `fts-only-client` / `sync-relation` | 29/29 / 4/4 / 12/12 / 10/10 / 2/2 / 0 失败（套件退出挂死＝既有 MessagePort 泄漏环境问题） |
| `search-original` / `search-multiscope` / `search-fulltext-locator` / `search-fanout` / `search-embed-degrade` / `mcp-daemon` / `mcp-http` / `cli-aliases` / `cli-help` / `error-handling` / `lib` / `interrupt` / `clean` / `chunker` / `config-doctor` / `original-locator` / `query-vector-precompute` / `resolve-default-paths` / `safe-tar` / `task-registry` / `cross-process-invalidation` / `purge-migration-artifacts` | 全绿（59/59、45/45、37/37 等） |

**类型检查（重要发现）**：`npm run build` 只覆盖 `src/zvec-engine/**/*.ts`（`tsconfig.src.json` 的 `include`），**并不检查 CLI/Web 源码**——此前各轮的「build 通过」对本批改动几乎无约束力。本次改以 `npx tsc -p tsconfig.json --noEmit` 为准：相对 HEAD 基线新增 **0** 条（余 3 条既有：`delete-relation` 的 `BatchDeleteResult.error`、`import-budget` 的 `DISABLED`、`mcp-http` 的 `getActiveResourcesCount`）。

## 4. 未修项（超出本次审查范围，登记）

| 项 | 现状 | 建议 |
|----|------|------|
| `test/memory-id-map.test.ts` | `import { buildMemoryIdMap } from '../src/lib/diff.js'` 死引用（`diff.ts` 已于 `a373606` 删除，全库无 `buildMemoryIdMap`）→ 该套件在 **HEAD 基线即无法加载** | 删除或按现实现改写（需求侧独立小批） |
| `test/sync-relation-bulk-vector.test.ts` 3 例 | 向量可用性/环境相关，**HEAD 基线同款失败** | 保持 |
| `sync-relation` 套件退出挂死 | zvec worker MessagePort 泄漏（实测 0 失败，仅不退出） | 既有环境 issue，建议测试 `after` 全量 closeEngine |
| `initScope` 仍以旧布局出生；本地 KB 目录不随键重命名迁移 | 决策 #12/#13 保留 | 独立需求（搬目录 + 附件 + wiki 目标改名） |
