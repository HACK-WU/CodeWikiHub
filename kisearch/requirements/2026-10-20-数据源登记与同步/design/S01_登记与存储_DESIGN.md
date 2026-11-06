# S-01 登记与持久化（`add` / `list` / `remove` + `datasource.json`）

> 父文档：[`DESIGN.md`](DESIGN.md) ｜ 需求：R1 / R10 / R11 / R12 / R15、N2 / N6 / N8 / N11

## 1. 术语

| 术语 | 定义 |
|---|---|
| **数据源** | 一个 scope 唯一的外部目录登记（`dir` + `group` + 导入参数），唯一键 = `scope` |
| **独立存储** | 数据源的全部状态只落 `datasource.json`；**不写** `group-index.json.source`（Q-C 裁决，2026-10-21） |
| **提示式迁移** | 检测到 `source` 块但无 `datasource.json` 时，**只提示 + 预填命令**，不自动写入 |

> **2026-10-21 Q-C 反转了本文件初稿**：初稿是"镜像写"（同时更新 `datasource.json` 与 `group-index.json.source`）。用户拍板改为**只写 `datasource.json`**，理由是 `source.dir` 是 `wiki-sync` 的写回优先级 1（`lib/wiki-sync.ts:45-59`）——数据源把该目录从"一次性"变成"长期"，会让 `sync_relation` 持续把 KB 内容写进用户的源文档目录。代价（7 处消费方看不到数据源）见父文档 §4 风险表。

## 2. 现状（AS-IS）

```
ki import --source <dir> --group <g> ...
  └─ handleDirectImport
       └─ setSource(scope, { dir, chunkSize, chunkOverlap })      ← lib/import.ts:1902-1910
            └─ 覆写 <kbDir>/group-index.json 的 source 块           ← lib/scope.ts:266-297
```

- `source` 块只有 3 个字段，**无 `group` / `conflictMode`**（`lib/scope.ts:135-141`）⇒ 无法还原完整参数
- `handleDirectImport` 目前**无条件**写 `source` 块（同一 `runMetadataCommit` 窗口内），没有开关
- 无任何"数据源清单"，`getSource` 仅被 7 处功能用于"找源目录/切分参数"
- CLI 命令注册是扁平映射（`bin/ki.mjs:30-51`），帮助文本手写在 `:77-136`

## 3. 方案（TO-BE）

### 3.1 新增文件

```
src/
├── datasource.ts                    # [新增] CLI 外壳（commander 子命令）
├── lib/
│   ├── datasource.ts                # [新增] 持久化读写 + 校验 + 迁移检测
│   ├── datasource-prune.ts          # [新增] 候选重算 + token + 交集（S-03）
│   └── datasource-types.ts          # [新增] DataSourceRecord 等类型（供 lib/datasource、mcp-http-api、datasource-prune 共用）
src/lib/import.ts                    # [修改] HandleDirectImportArgs 新增 `writeSourceBlock?: boolean`（默认 true）；数据源同步传 false
bin/ki.mjs                           # [修改] COMMANDS + 帮助文本
```

### 3.2 CLI 契约

```
ki datasource add --scope <s> --source <dir> [--group <g>]
                  [--conflict-mode incremental|overwrite|skip|suffix]
                  [--conflict-suffix "_{n}"] [--no-vector] [--force]
ki datasource list [--json]
ki datasource remove --scope <s> [--yes]
```

**`add` 校验顺序（任一失败即退出码 1、零写入）**

| # | 校验 | 失败文案要点 |
|---|---|---|
| 1 | `--scope` 非空且在 config 白名单内（strict 模式） | 列出可用 scope |
| 2 | `--source` 展开 `~` 后 `path.resolve` 为绝对路径 | — |
| 3 | 路径存在且是目录（`lstat` 非 symlink 或解析后仍为目录） | 给出传入路径与解析后路径 |
| 4 | `fs.access(R_OK)` 可读 | 权限问题提示 `chmod` |
| 5 | `collectMarkdownFiles(dir, extensions).files.length ≥ 1`，`extensions` 取 **`resolveImportExtensions(config, scope)`**（与导入、候选重算三处同源，见 S-03 D7） | 列出当前扩展名白名单 |
| 6 | 路径不在 `<dataDir>` / `<kbDir>` 内 | 防止把索引文件当日志导入 |
| 7 | 已存在同 scope 数据源时：参数等价 → 幂等更新；`dir` 或 `group` 变化 → 必须 `--force` | 说明后果（见异常表 E4/E5） |
| 8 | `--chunk-size` 为正整数、`--chunk-overlap` 为非负整数且 `< chunkSize` | 与 `handleDirectImport` 的切分语义一致 |

> **写入前的目录初始化**：`add` 在写 `datasource.json` 之前必须调用 `ensureScopeDir(scope)`（`src/lib/store.ts:239`，幂等；scope 已初始化时零写操作）——`getKbDir(scope)` 不存在时无处落盘，而"登记了但从未同步"的 scope 正是没有 KB 数据的那一类（见 S-04 §3.4 的枚举口径）。

**输出契约**：stdout = `JSON.stringify(result, null, 2)`；人类可读信息走 stderr（与 `ki group` 一致）。

```json
{
  "ok": true,
  "scope": "default",
  "source": {
    "dir": "/Users/me/docs/wiki",
    "group": "wiki",
    "conflictMode": "incremental",
    "vector": true
  },
  "created": true,
  "next": "ki datasource sync --scope default"
}
```

> **`add` 不写 `group-index.json.source`**。若该 scope 存在**历史一次性导入**留下的 `source` 块，`add` 只在输出里提示一句「检测到历史导入目录 X（数据源不会接管它，wiki 写回仍可能指向该目录）」，不修改、不清空。

### 3.3 数据模型：`<kbDir>/datasource.json`

```jsonc
{
  "version": 1,
  "scope": "default",                 // 冗余存一份，便于跨 scope 汇总与自校验
  "dir": "/Users/me/docs/wiki",       // 绝对路径（~ 已展开）
  "group": "wiki",                    // null = 按顶层子目录自动决定落点
  "conflictMode": "incremental",      // incremental | overwrite | skip | suffix
  "conflictSuffix": "_{n}",           // 仅 conflictMode='suffix' 时有意义
  "vector": true,                     // false = 仅 FTS（--no-vector）
  "chunkSize": null,                  // null = 用默认 1000；显式传过才落数字
  "chunkOverlap": null,               // null = 用默认 150
  "createdAt": 1760900000000,
  "updatedAt": 1760900000000,
  "lastSync": null                    // 见 S-02
}
```

**写入方式**：`tmp + rename` 原子写（仿 `lib/scope.ts:294-296`），目录不存在时创建，权限 0600。

> **`chunkSize` / `chunkOverlap` 是数据源自己的唯一来源**（Q-C 后不再写进 `source` 块）。同步时**显式**传给 `handleDirectImport`（`lib/import.ts:629-630` 只认 `args.chunkSize ?? 1000`，不会自己去读 `getSource`），因此数据源的切分行为与登记值严格一致；但 `rebuild-vector` / `fts-rebuild` 读不到它们（见父文档 §4 风险表、§7 Q3）。

### 3.4 `remove` 的语义

```
ki datasource remove --scope <s> --yes
  ├─ 预览：列出将删除的登记 + 「库内 N 篇文档保留」+ 若存在历史 source 块则列出它（不修改）
  ├─ 执行：删除 datasource.json
  └─ **不触碰 group-index.json.source**
```

**为什么不再清空 `source` 块**（2026-10-21 Q-C 反转初稿）：`source` 块现在只由**一次性 `ki import`** 写入，数据源从未拥有它；`remove` 去清空别的东西会误伤"该 scope 确实做过一次性导入"的状态。副作用是：`remove` 后 R15 的迁移提示可能**重新出现**——这是**正确**的（历史导入目录仍在，用户确实可以选择把它登记成数据源），不是"删了又活"（登记本身没有复活）。

### 3.5 提示式迁移（R15）

```
ki datasource list / 页面加载
  └─ 若 getSource(scope)?.dir 存在 且 无 datasource.json
       └─ 输出提示 + 预填命令（不自动写文件）
            ki datasource add --scope <s> --source "<dir>" [--chunk-size N --chunk-overlap N]
            ⚠ --group 无法从 source 块还原，请按实际落点补充
```

**准入过滤（2026-10-21 走查后补）**：只提示「仍可用的历史目录」，否则会产生大量噪音（实测一台机器 20+ 条，其中大量是 Web 上传暂存目录与失效路径）：

| 条件 | 处理 |
|---|---|
| 目录不存在 / 不可读 / 不是目录 | 不提示 |
| `dir` 位于 `~/.ki/import-uploads/`（Web 上传暂存，24h 后必被清理） | 不提示（登记了也没用） |
| `dir` 位于 `<dataDir>` 内（自己导入自己） | 不提示 |
| 其余 | 提示；页面收进**一个可折叠块**（默认收起，摘要带数量），CLI 打印数量 + 前 5 条 |

`--chunk-size/--chunk-overlap` 为 `add` 的可选参数：迁移场景用它把历史切分参数带过来（否则数据源按默认 1000/150 切分，与既有分片不一致）。

## 4. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 |
|---|---|---|---|
| D1 | 清单落 `<kbDir>/datasource.json` | ① 写 `~/.ki/config.yaml` | 全局单文件、每次写回要重建 YAML、含 `apiKey` 明文、多 daemon 并发写有覆盖风险 |
| | | ② 存 zvec collection | 那是向量库，打开需进 coordinator 队列（贵且与写任务互斥）；配置/状态不属于它 |
| | | ③ 扩展 `group-index.json` 的 `source` 块 | 该文件同时被 group 树 CRUD 以整文件读写（`lib/group-create.ts` / `group-delete.ts`），写入放大且易被旧快照覆盖；且 `lastSync` 会让文件频繁变大 |
| D2 | 一 scope 一数据源 | 一 scope 多源（带 primary） | `source.dir` 是单值，7 处消费方需全部改读数据源；用户 2026-10-20 已定单源 |
| D3 | `remove` **只删登记、不碰 `source` 块**（2026-10-21 反转） | 清空 `group-index.json.source` | `source` 块由一次性 `ki import` 写、数据源从未写它（Q-C）⇒ 清空属于越界修改别人的状态；且 `remove` 的目标是"不再自动同步"，而不是"抹掉这个 scope 做过一次性导入的历史" |
| D4 | 迁移只提示不自动登记 | 自动把 `source` 块登记成数据源 | `source` 块无 `group` 字段（`lib/scope.ts:135-141`），自动登记会让页面"落点=自动"而文档实际在别的 group（推演 P4） |
| D5 | 数据源**不写** `group-index.json.source` | 镜像写（初稿） | 用户拍板（Q-C）：`source.dir` 是 wiki 写回的优先级 1（`lib/wiki-sync.ts:45-59`），长期数据源会让 KB 内容持续写进用户源目录。接受 7 处消费方看不到数据源的代价 |

**重新评估触发条件**：若未来引入"一 scope 多源"或"远程源（git/url）"，D1（加 `type` 字段）与 D2 需重开；若 `wiki-sync` 改成"写回目标必须显式配置、不再读 `source.dir`"，D5 可重新评估。

## 5. 异常处理

| # | 场景 | 行为 | 对外暴露 |
|---|---|---|---|
| E1 | 目录不存在 | 退出码 1，`{ok:false, code:'SOURCE_MISSING'}`，零写入 | 是 |
| E2 | 不可读（权限） | 同上 `SOURCE_UNREADABLE`，附 `errno` 文案 | 是 |
| E3 | 目录内无白名单文件 | `SOURCE_EMPTY`，提示当前扩展名白名单与配置路径 | 是 |
| E4 | 改 `--source` 未加 `--force` | `NEEDS_FORCE`，说明"旧路径下 N 篇将全部进入待删候选（本次不会自动删）" | 是 |
| E5 | 改 `--group` 未加 `--force` | `NEEDS_FORCE`，说明"旧 group 下 N 篇会保留并产生重复，需手动清理" | 是 |
| E6 | 路径落在 `<kbDir>` 内 | `SOURCE_IN_KB_DIR`，拒绝 | 是 |
| E7 | `remove` 时 `group-index.json` 不存在 | 幂等成功（只删 datasource.json） | 是（`ok:true`） |
| E8 | `datasource.json` 损坏（JSON 解析失败） | `CORRUPT`，**不自动覆盖**，提示用户手工修复或 `remove --force` | 是 |
| E9 | 并发写（两个 CLI 同时 `add`） | 走 `withScopeWriteLock`，冲突返回 `SCOPE_OPERATION_BUSY` | 是 |

## 6. 影响范围

| 文件 | 改动 |
|---|---|
| `bin/ki.mjs` | `COMMANDS` 加 `'datasource': 'src/datasource.ts'`；帮助文本加 `datasource` 段 |
| `src/lib/import.ts` | [修改] `HandleDirectImportArgs` 新增 `writeSourceBlock?: boolean`（默认 `true`，既有 CLI/Web 行为不变）；置 `false` 时跳过 `runMetadataCommit` 内的 `setSource(...)`（`lib/import.ts:1902-1913`） |
| `src/lib/scope.ts` | **不改**（不再需要 `clearSource`） |
| `package.json` | 可选：`scripts.datasource`（既有惯例） |

## 7. 待定问题

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| Q1 | `add` 是否暴露 `--chunk-size/--chunk-overlap` | 迁移场景需要还原切分参数；不暴露则数据源一律 1000/150，与历史分片不一致 | **暴露**，默认 `null`（传 null 时按 1000/150 并原样记入 datasource.json） |
| Q2 | `datasource.json` 的写入时机 | `lastSync` 由编排层在 import 返回后写，不在 `runMetadataCommit` 窗口内 | 已定：**单文件原子写 + 可接受的最终一致窗口**（父文档 §4 风险表）。初稿"与 `source` 块同窗口双写"的说法随 Q-C 一并作废 |
| Q3 | 重建类命令读不到数据源切分参数（跟进项） | 数据源用非默认切分参数时，`rebuild-vector`/`fts-rebuild` 会按 1000/150 重建，与导入分片不一致 | 本期**不做**，在 `add --chunk-size` 的帮助文本与详情页明示；后续让这两个命令优先读 `datasource.json`（改动面 2 文件） |
