# 关系与索引管理专家 Agent

## 简介

kisearch 的**关系（Relation）与索引管理**：关系回写（四层联动）、批量回写、评分冷热分区、Group 树 CRUD、目录级级联删除、Wiki 写回与历史补齐、模块信息查询与关系四层删除。

**模块根**：`src/lib/{scoring,group-resolve,wiki-sync,path-search}.ts` + `src/{sync-relation,query-group,manage-index,get-module-info,delete-relation,wiki-backfill}.ts`

## 能力清单

| 能力 | 说明 | 入口 |
|------|------|------|
| 关系回写 | 四层写入（relations-cache + local KB + 向量 + Wiki）；支持自定义 tags、非向量化模式 | `sync-relation.ts` |
| 批量关系回写 | 一次 embedding + 一次 upsert，含同批去重与逐条容错 | `executeBulkSyncRelation` |
| 评分引擎 | 使用密度评分 + 5 分钟防刷 + 新兴识别 + 冷热分区 + 边界衰减 | `scoring.ts` |
| Group 树 CRUD | create / delete（空节点 + `--force` 级联）/ list-scopes | `manage-index.ts` |
| Group 查询 | 词云已移除；hot/warm/cold/emerging 分区 + 树渲染（**纯文本输出**） | `query-group.ts` |
| 模块信息查询 | 读 local KB 原文 + 记一次使用（有评分副作用）+ 语义兜底 | `get-module-info.ts` |
| 关系删除 | 四层联动，wiki 文件移入回收站（非物理删除） | `delete-relation.ts` |
| **目录级删除** | 删除整个 Group 子树四层数据 + 树节点 | `executeDeleteGroup` |
| **Wiki 历史补齐** | 幂等全量写回（`/ --force` 覆盖） | `wiki-backfill.ts` + `wiki-sync.ts` |
| Path 搜索 | `ki-path` / `ki-relation` 语义模糊匹配（向量兜底） | `path-search.ts` |

**边界**：不提供批量导入（知识索引导入专家）、不提供语义检索（检索与向量客户端专家）、不提供备份还原（存储与配置基础专家）；**MCP 不暴露级联删除**（NEG-15，仅 CLI）。

## 关键符号（源码导航）

| 符号 | 文件 | 说明 |
|------|------|------|
| `executeSyncRelation` | `src/sync-relation.ts` | 单条关系回写（四层） |
| `executeBulkSyncRelation` | `src/sync-relation.ts` | 批量回写（一次 embed + 一次 upsert，五阶段） |
| `syncSingleRelation` | `src/sync-relation.ts` | 单条与批量共用的写内核（覆盖/淘汰/建 id） |
| `vectorWriteBack` | `src/sync-relation.ts` | 向量写入 + 数据守恒 + stale 清理 |
| `parseContentTags` | `src/sync-relation.ts`（定义于 `lib/constants.ts`） | 自定义标签解析 |
| `executeQueryGroup` | `src/query-group.ts` | Group 查询（返回渲染后的纯文本） |
| `executeManageCreate` / `executeManageDeleteEmpty` / `executeListScopes` | `src/manage-index.ts` | Group 树 CRUD 纯函数 |
| `cascadeDeleteGroupData` | `src/manage-index.ts` | `--force` 级联清理（**不动 wiki**） |
| `executeGetModuleInfo` | `src/get-module-info.ts` | 读原文 + `recordUse` 更新评分 |
| `executeDeleteRelation` | `src/delete-relation.ts` | 文档级四层删除 |
| `executeDeleteGroup` | `src/delete-relation.ts` | 目录级级联删除（前缀匹配 + 回收站） |
| `deleteMemMemory` / `deleteBySearch` | `src/delete-relation.ts` | 向量删除三级降级 / 严格匹配兜底 |
| `moveToTrash` / `moveDirToTrash` / `removeGroupNode` | `src/delete-relation.ts` | 回收站迁移 / 树节点清理 |
| `backfillWiki` / `writeBackToWiki` / `writeBackToWikiInner` | `src/lib/wiki-sync.ts` | 历史补齐 / 单条写回 / 含 autoBackfill 的内层实现 |
| `resolveGroupPath` / `pathExistsInTree` / `findLongestExistingPrefix` | `src/lib/group-resolve.ts` | 路径解析四级降级与工具函数 |
| `searchPath` / `extractPathFromContent` | `src/lib/path-search.ts` | 语义兜底与路径提取 |
| `calculateScore` / `recordUse` / `partitionByScore` / `hybridPartition` / `boundaryDecay` | `src/lib/scoring.ts` | 评分引擎（全为纯函数） |

## 设计决策

1. **纯函数层 + 双入口**：CLI 与 MCP 都转调同名 `execute*` 纯函数，`mcp-tools/*` 只做 zod 校验 + 超时包装 + scope 过滤。
2. **批量取代并发单条**（2026-08-13）：一次 embedding HTTP + 一次 worker upsert，实测 2.45s vs 20s（此前并发 N 条）。
3. **数据守恒（M1/M2）**：先写新向量、成功后再清旧；部分失败保留旧向量并给 `vectorReason`，避免"删旧丢新"。
4. **同批去重**：同 `(group, relation)` 后一条覆盖前一条，前一条剔除 entries 并标 `vectorStored:false`（区别于失败）。
5. **`rootName` 已移除**（2026-08-14）：group 即完整相对路径；wiki 落盘路径不再剥离前缀，路径解析改为"顶层 Group 下整段补全"。
6. **级联靠平铺键前缀**：relations-cache 的 `groups` 是平铺完整路径键，`key === group || key.startsWith(group + '/')`；空路径卫兵防删整个 scope。
7. **删除不物理销毁**：wiki 文件/目录移入 `{sourceDir}/.ki/trash/{group}/`（保留结构、重名加时间戳）。
8. **残留显式反馈**：`vectorRemoved: false` 让"索引已删但仍能搜到"暴露；`NOT_FOUND` 视为已清理（幂等不误报）。
9. **wikiSync 门禁统一**（2026-08-27）：`enabled: false` 同时禁用单条写回与 `backfillWiki`（此前 source.dir 存在时会绕过）。
10. **autoBackfill 防递归**：`writeBackToWikiInner` 以参数 `allowAutoBackfill` 控制，`backfillWiki` 内部逐条写回传 `false`。
11. **补齐缺省幂等**：跳过已存在文件，避免 `exportedAt` 刷新给 git 造成全量脏 diff；`--force` 才覆盖。
12. **MCP 删除能力受限**（NEG-15）：只开放"空节点删除"这一非破坏性子集，非空拒绝并引导 CLI。
13. **向量兜底阈值默认 0**：RRF 分量级远小于 1（不可沿用余弦 0.75），质量由调用方存在性/严格匹配校验保证。

## 已知坑

| 现象 | 触发条件 | 正确做法 |
|------|----------|----------|
| `query-group` 拿不到结构化数据 | 期望返回 JSON 对象 | 返回的 `output` 是**已渲染纯文本**；要结构化数据直读 `relations-cache.json` |
| relation 含 `/`、`\`、`..` 被拒 | wiki 文件名直接用 relation | 改用扁平命名；写入前即拒绝，无半成品 |
| Wiki 未写回 | 无 source 块且无 `wikiSync`，或 `enabled:false` | 配置 `wikiSync.sourceDir` 或先 `scan-kb import --source`；再 `ki wiki-backfill` |
| 开启 wikiSync 后历史关系没落盘 | wikiSync 事件驱动，只写新增 | `ki wiki-backfill <scope>`；或依赖 autoBackfill（目录为空自动触发） |
| backfill 产生全量 git 脏 diff | 用了 `--force` | 缺省执行即可（跳过已存在文件） |
| 模糊路径兜底"没生效" | 调 `resolveGroupPath` 未传 `scope` | 向量兜底**仅传 scope 时启用**（`manage-index` 内部即未启用） |
| 删除后仍能搜到 | 向量删除失败（`vectorRemoved:false`） | 残留为孤儿向量，看 `reason`；可用 `rebuild-vector` 恢复一致 |
| MCP 删节点被拒（非空） | 有子节点 / relation / KB 内容 | MCP 仅限空节点；改 `ki delete-relation -g <group>` 或 `--force` |
| 非向量化模式写入后搜不到 | `vector:false` / `--no-vector` | 该模式不产生 memoryId，属预期 |
| 评分不涨 | 5 分钟内重复读取 | 防刷间隔 5 分钟；`useCount` 上限 10 |
| 批量顶层 `vectorStored:false` 但逐条有成功 | 存在部分失败 | 顶层语义为"全部完全成功"，看逐条 `vectorReason` |
| rootName 相关行为消失 | 沿用旧文档/脚本 | 概念已移除，group 即完整相对路径；分隔符仅 `/` |
| 测试跑起来挂起 | IDE 注入 `NODE_OPTIONS` fs shim | `env -u NODE_OPTIONS -u BASH_ENV npx jiti test/xxx.test.ts` |

## 相关专家

- **知识索引导入专家** — 共用 `relations-cache.json` / `group-index.json` / local KB 格式；导入是这些数据结构的生产方，改动连带（已记入 ki 强关联）
- **检索与向量客户端专家** — 本专家经 `vector-client` 做向量写入/删除/语义兜底
- **存储与配置基础专家** — 提供 `store` / `scope` / `config`（含 `wikiSync` 读取）
- **MCP 服务专家** — 本专家 8 个 MCP 工具的注册与 scope 授权所在

## 测试状态

7 个测试文件 / **77 例全绿、0 失败**（2026-08-28 实测，commit `9841255`）。

| 文件 | 用例数 | 状态 |
|------|--------|------|
| `test/sync-relation.test.ts` | 23 | ✅ |
| `test/sync-relation-bulk-vector.test.ts` | 6 | ✅ |
| `test/query-group.test.ts` | 12 | ✅ |
| `test/manage-index.test.ts` | 10 | ✅ |
| `test/wiki-backfill.test.ts` | 12 | ✅ |
| `test/get-module-info.test.ts` | 7 | ✅ |
| `test/delete-group.test.ts` | 7 | ✅ |

**覆盖缺口**：文档级删除、`boundaryDecay` / `partitionByScore` 上限截断、`resolveGroupPath` 四级降级、`--no-vector` 单条路径、`manage-index --force`、MCP 工具层。详见 `implementation/06-测试.md`。

## Root Cause 记录

### [Root Cause] wiki 写回漏配/漏同步

- **现象**：`wikiSync.enabled: false` 时仍在写文件（2026-08-27 前）；开启 wikiSync 后历史关系不落盘。
- **根因**：① `enabled` 门禁只对 fallback 路径生效，source.dir 存在时绕过；② Wiki 写回是事件驱动（只写新增），不回溯历史。
- **修复**：`writeBackToWiki` 统一 `enabled` 门禁；新增 `ki wiki-backfill` + 写回时目录为空自动补齐（autoBackfill，内部传 `allowAutoBackfill=false` 防递归）。

### [Root Cause] 批量写入慢 + 孤儿向量

- **现象**：MCP 并发调 `ki_sync_relation` 慢；多 tag 场景下删除后仍有残留向量。
- **根因**：① 每条独立 embedding + 独立 worker upsert；② 只回写单个 `memoryId`，多 tag 各有一条 doc 无法精确清理。
- **修复**：`executeBulkSyncRelation` 一次 embed + 一次 upsert；回写 `memoryIds`（全量 docId），删除以 `memoryIds` 为准；同批去重避免孤儿。

### [Root Cause] 目录级删除留下幽灵数据

- **现象**：Group 树节点已删，但数据仍能查到 / 删不掉。
- **根因**：relations-cache 的 `groups` 是平铺完整路径键，只删精确键会漏掉 `group/sub` 子 Group。
- **修复**：`executeDeleteGroup` 用前缀匹配收集级联范围；向量失败时以 `vectorRemoved:false` 显式暴露残留而非静默。

## 最近更新

- **2026-08-28**（git `9841255`）：全量合并补全更新。修正 C1 中 12 处过期签名（`calculateScore` / `recordUse` / `hybridPartition` / `partitionByScore` / `boundaryDecay` / `resolveGroupPath` / `executeQueryGroup` / `executeGetModuleInfo` 等）；新增目录级删除、批量回写、Wiki 补齐与 autoBackfill、回收站、多标签、非向量化模式；新增 `implementation/07-运维.md`；实测 77 例全绿。

## 更新日志（最近 10 条）

| 日期 | git | 更新内容 |
|------|-----|----------|
| 2026-08-28 | `9841255` | 全量合并补全：C0/C1/C2/C4 + 实现层 01-07 重写；12 处过期签名修正；新增 07-运维；测试状态实测更新为 77 例全绿 |
| 2026-08-06 | 未提交 | 初版创建：契约层 C0/C1/C2/C4 + 实现层 01-06 |

---

> **下一步建议**：补 `test/delete-relation.test.ts`（文档级删除 + `deleteBySearch` 中文边界）与 `test/scoring.test.ts`（`boundaryDecay` / 上限截断），补齐当前最大的两处覆盖缺口。
