# S02 回收站类型扩展与组快照存储

## 术语

| 术语 | 定义 |
|---|---|
| `kind` | 条目类型：`doc`（存量默认）/ `group`（组快照） |
| 组快照 | 一次组删除产生的目录：`docs/0001..N` 下 N 篇文档原文与元数据 + 组树统计 |
| 组条目 | 回收站中 `kind='group'` 的一条记录 |
| 定位坐标 | `(group, dirName)` —— 现有 list / restore / purge 的唯一寻址方式 |
| 文档子目录 | 组快照内 `docs/NNNN/`，纯序号命名，身份信息在 `doc.json` |

## 现状（AS-IS）

**存储布局**（`src/lib/trash-store.ts:1-16` 头注释）：`{dataDir}/{scope}/.trash/{group}/{dirName}/`，内含 `meta.json` + `content.md` + `assets/`。

| 事实 | 证据 |
|---|---|
| `TrashItem` 只有文档语义（`group` + `name`=relation），无类型字段 | `trash-store.ts:30-51` |
| `listTrash` 遍历 `.trash/`，**遇到含 `meta.json` 的目录即视为条目**，否则当组段递归 | `trash-store.ts:215-240` |
| 条目寻址恒为 `trashItemDir(scope, group, dirName)` | `trash-store.ts:91-93` |
| `writeTrashItem` 只写单篇：`content.md` + `assets/`，`dirName = relation`（撞名加时间戳） | `trash-store.ts:96-103, 149-200` |
| 契约 `TrashItemDto` / `TrashReasonDto` 无类型字段 | `governance-contract.ts:205-220` |
| 计数口径 `trash.total = listTrash().total` | `governance-http.ts:2033, 2069` |

**关键结论**：`listTrash` 的 walk 语义天然能容纳组条目——只要组条目目录自己带 `meta.json`（它会在该层停下，不再递归进 `docs/`）。因此**不需要新根目录**，也不需要改寻址方式。

## 方案（TO-BE）

### 1. 目录布局

```text
{kbDir}/.trash/
├─ _settings.json
└─ 部署运维/                              ← group 段（= 被删组路径）
   ├─ Redis 主从切换/                     ← 既有 doc 条目
   │  ├─ meta.json        (kind 缺省 = doc)
   │  ├─ content.md
   │  └─ assets/
   └─ __group__20261123153000/            ← ★新增 group 条目
      ├─ meta.json        (kind='group', groupSnapshot)
      ├─ assets.json      [{"group":"部署运维","dir":"0001"},{"group":"部署运维/网络","dir":"0002"}]
      ├─ assets/
      │  ├─ 0001/…        ← 部署运维 的附件（★整组一份，绝不按篇复制）
      │  └─ 0002/…        ← 部署运维/网络 的附件
      └─ docs/
         ├─ 0001/{doc.json, content.md}
         └─ 0002/{doc.json, content.md}
```

- 组条目 `dirName` 强制 `__group__` 前缀 + 毫秒时间戳，与文档条目、历史组条目互不覆盖；
- 组内每篇文档进 `docs/NNNN/`，**纯序号**，身份（group / name）写在 `doc.json` —— 避免 `<子组>__<文档名>` 这类拼接带来的路径转义与跨子组同名问题；
- **附件按 group 存一份，不按文档存**：`getAssetsDir(scope, group)` 返回的是 `{kbDir}/{group}/assets`（`scope.ts:128-131`），整个 group 共用一份附件目录，"某篇文档的附件"这个概念不存在。逐篇复制会让占用放大到 N 倍（8 篇 × 100 MB = 800 MB），而回收站写盘失败是 fail-closed —— 写满盘后**所有删除都删不掉**；
- 组条目内部**不走** `trashItemDir()` 寻址文档，直接遍历 `docs/*/doc.json`；附件走 `assets.json` 清单。

### 2. 数据模型

```ts
export type TrashKind = 'doc' | 'group';

export interface TrashItem {
  /** 缺省 'doc'（存量条目无该字段，读侧补全；不写回） */
  kind?: TrashKind;
  scope: string;
  /** group 条目：被删组自身的规范路径 */
  group: string;
  /** doc：relation 名；group：组路径最后一段 */
  name: string;
  reason: TrashReason;          // 不新增枚举值，类型由 kind 表达
  deletedAt: number;
  expiresAt: number;
  ttlDays: number;
  ttlAssumed: boolean;
  restoreCount: number;
  dirName: string;
  hasAssets: boolean;
  sizeBytes: number;
  /** 仅 doc */
  relationSnapshot?: Omit<Relation, SnapshotOmit>;
  /** 仅 group：只有统计，明细在 docs/ */
  groupSnapshot?: GroupSnapshot;
}

export interface GroupSnapshot {
  version: 1;
  path: string;        // 被删组规范路径
  groups: string[];    // 自身 + 全部子组（含空组，恢复要重建树节点）
  docCount: number;    // = docs/ 子目录数
  /**
   * 附件清单：每个**有附件的 group** 一条，dir 是 assets/ 下的序号目录。
   * 附件是 group 级共享目录，绝不按文档复制（否则 N 倍膨胀）。
   */
  assets: Array<{ group: string; dir: string }>;
}

/** docs/NNNN/doc.json */
export interface GroupSnapshotDoc {
  group: string;       // 该文档所属（可能是被删组的子组）
  name: string;
  /**
   * 快照来源（决定恢复行为）：
   *   both       —— 分片与 KB 都有，完整恢复
   *   shard-only —— 只有元数据、读不到正文（残壳），恢复后无正文
   *   kb-only    —— 只有正文、分片里没有 relation（元数据不一致），恢复为最小元数据
   */
  source: 'both' | 'shard-only' | 'kb-only';
  sizeBytes: number;   // 正文字节数（无正文为 0）
  relationSnapshot?: Omit<Relation, SnapshotOmit>;
}
```

### 3. 存储层新增函数（`src/lib/trash-store.ts`）

| 函数 | 签名要点 | 行为 |
|---|---|---|
| `writeGroupTrashItem` | `{ scope, group, reason, now, docs: Array<{group,name,content?,source,relationSnapshot?}>, groups, assets: Array<{group,assetsDir}>, keepDays }` | 建 `__group__<stamp>/` → **先写 `meta.json` 骨架**（保证条目可见）→ 逐篇写 `docs/NNNN/` → 逐 group 把 `assetsDir` 整目录复制到 `assets/<序号>/` 并写 `assets.json` → 回填 `docCount` / `sizeBytes`，返回 `TrashItem` |
| `readGroupSnapshotDocs` | `(scope, group, dirName)` → `Array<{ doc: GroupSnapshotDoc; content: string; dir: string }>` | 遍历 `docs/*`，`doc.json` 缺失的条目计入 `broken` 而非抛错 |
| `readGroupSnapshotAssets` | `(scope, group, dirName)` → `Array<{ group: string; dir: string }>` | 读 `assets.json`；缺失时返回空数组（老/异常条目降级，不抛错） |
| `listTrash` | 现有实现**不改** | 组条目因自带 `meta.json` 天然被识别；读出时把 `kind` 缺省补 `'doc'` |

- `hasAssets` = 该组快照的 `assets.json` 非空；
- `sizeBytes` = **写入时累加**（Σ 正文字节 + Σ 源附件目录大小），**不做复制后递归统计**——组快照文件数是单篇的几十上百倍，递归 `dirSizeBytes` 在 scope 写锁内执行会显著拉长锁持有时间，期间该库所有写操作排队。

### 4. 契约扩展（`src/lib/governance-contract.ts`）

```ts
export type TrashKindDto = 'doc' | 'group';

export interface TrashItemDto {
  kind: TrashKindDto;       // ★新增（后端下发恒有值，缺省 doc）
  group: string;
  name: string;
  reason: TrashReasonDto;
  deletedAt: number;
  expiresAt: number;
  ttlDays: number;
  ttlAssumed: boolean;
  restoreCount: number;
  sizeBytes: number;
  hasAssets: boolean;
  dirName: string;
  /** ★新增：仅 kind='group' */
  docCount?: number;
  groupCount?: number;
}
```

向后兼容：新增字段可选；存量条目读侧补 `kind='doc'`，不写回磁盘。

### 5. 计数口径（`governance-http.ts`）

`counts.trash`、`/diagnostics` 的 `trash.total`、侧栏角标**保持"条目数"**：一个组条目算 **1**，不展开为 N 篇。理由：角标语义是"有几件事待处理"，一个组就是一个待处理项；展开会让角标与列表行数不一致。

`/diagnostics` 的 `emptyContent` 过滤 `sizeBytes === 0` 必须**排除 `kind='group'`**（空组快照本来就是 0 字节，否则每次诊断都报假告警）。

### 6. 到期清理的类型感知

```ts
export interface PurgeOutcome {
  purged: Array<{ group: string; name: string; dirName: string; kind: TrashKind; docCount?: number }>;
  notified: Array<{ group: string; name: string; dirName: string; kind: TrashKind; docCount?: number }>;
  mode: 'purge' | 'notify';
}
```

现有 brief 只有 `{group, name, dirName}`（`trash-service.ts:339`），组条目到期时用户只看到"清理了 部署运维"，实际少了 N 篇文档 + 附件。加 `kind` / `docCount` 后，`/trash/sweep` 与设置弹窗才能说清"其中 M 个分组、共 K 篇"。

## 关键决策点

| 决策 | 采纳 | 被否决方案 | 否决理由 |
|---|---|---|---|
| 组快照落点 | 复用 `.trash/{group}/{__group__…}/` | 新建 `.trash/_groups/` 独立根 | `listTrash` 的 walk 会把 `_groups` 当组段递归下去；`trashItemDir()` 是按 group 拼路径的，restore / purge 全部要分叉 |
| 组内文档子目录命名 | 纯序号 `0001` + `doc.json` 存身份 | `<子组>__<文档名>` 拼接 | 跨子组同名会撞；文档名含 `/`、空格、`.` 时要转义，转义错就写出目录逃逸 |
| 组条目如何区分类型 | 新增 `kind` 字段 | 新增 `reason='group-deleted'` | `reason` 表达"为什么进站"（temp-expired / event-closed / manual），不是"是什么"；复用会让前端筛选段语义重复 |
| 组条目元数据放哪 | meta 只放统计（`docCount`），明细在 `docs/*/doc.json` | N 篇元数据全塞进 meta.json | list 每次都要读 meta，N 大时列表接口跟着变慢；且单文件损坏会丢整组 |
| 角标计数 | 组算 1 条 | 组展开为 N 篇 | 角标与列表行数不一致，用户会认为"数字对不上" |
| **附件存储粒度** | 按 group 存一份（`assets/<序号>/` + `assets.json`） | 按文档存一份（`docs/NNNN/assets/`） | `getAssetsDir()` 返回的是 group 级共享目录（`scope.ts:128-131`），按篇复制 = N 倍膨胀；100 MB 附件的 8 篇组会写出 800 MB，写满盘后 fail-closed 让**所有删除都失效** |
| **组条目 `sizeBytes` 计算** | 写入时累加（正文 + 源附件目录大小） | 复制后 `dirSizeBytes` 递归统计 | 组快照文件数是单篇的几十上百倍，递归扫描在 scope 写锁内执行会拖住该库全部写操作 |

## 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 组条目 `meta.json` 损坏 | `listTrash` 跳过该条并 `console.warn`（沿用现有行为 `trash-store.ts:231-233`） | 否（列表少了这一条，诊断里有日志） |
| `docs/NNNN/doc.json` 缺失 | 该篇记为 `broken`，恢复时跳过并计入 `failed` | 是（恢复回执的 failed 明细） |
| 同名组条目已存在 | `dirName` 加毫秒时间戳，两份都保留（沿用 `resolveDirName` 策略） | 否 |
| 组快照写入中途失败 | 整个组删除中止（见 S03），半成品目录由 S03 回滚 | 是（`TRASH_WRITE_FAILED`） |
| 组路径含 `.trash` 段 | **在 `planGroupDelete` 阶段就拒绝**，不能等到入站才拒 —— 否则 `fs.rmSync(kbDir/.trash)` 会把整个回收站一起删掉 | 是 |
| 回滚失败残留的无 `meta.json` 目录 | 写入顺序保证不出现：**先写 `meta.json` 骨架**（kind / group / name / 时间戳）→ 再逐篇写 `docs/` → 最后回填 `docCount` / `sizeBytes`。任何中途失败都留下「可见但不完整」的条目，用户能彻底删除，不会变成不可见磁盘垃圾 | 是（`ki doctor` 类巡检可暴露） |

## 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/trash-store.ts` | `TrashKind` / `GroupSnapshot` / `GroupSnapshotDoc`；`writeGroupTrashItem` / `readGroupSnapshotDocs` / `readGroupSnapshotAssets`；`listTrash` 补 `kind` |
| `src/lib/trash-service.ts` | `PurgeOutcome` brief 加 `kind` / `docCount`（到期清理的类型感知） |
| `src/lib/governance-contract.ts` | `TrashKindDto`；`TrashItemDto` 加 `kind` / `docCount` / `groupCount` |
| `src/lib/governance-http.ts` | `emptyContent` 过滤排除 group；`items` 下发补 `kind` |
| `web/src/api/governanceApi.ts` | `TrashItemView` 加字段（S05 消费） |

## 待定问题

| # | 问题 | 状态 |
|---|---|---|
| 1 | 组快照是否需要独立容量上限（如单组 ≤ 500 MB 拒删） | 待定：先用实测数据判断（需求 §6 A2） |
| 2 | 是否给组条目单独设置保留天数 | 已定：不做，沿用全局 `keepDays`（避免两套保留策略） |
