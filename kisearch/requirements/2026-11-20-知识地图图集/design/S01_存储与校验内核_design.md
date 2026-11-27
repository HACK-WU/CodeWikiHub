---
id: REQ-20261120-003
feature: 知识地图图集
document_type: design
created: 2026-11-24
updated: 2026-11-24
version: 1
author: AI
---

# S-01 存储与校验内核

## 1. 术语

| 术语 | 定义 |
|---|---|
| entry | 包内根目录下**唯一**的 `.html` 文件，实际下发内容 |
| 条目 | zip 内的一个文件记录（中央目录项） |
| 原子替换 | 先写 `.tmp` 再 `rename`，任何时刻磁盘上要么旧包要么新包 |

## 2. 现状（AS-IS）

- 项目**零 zip 依赖**（`package.json` dependencies/devDependencies 均无 zip 库），代码中无任何 zip 解析。
- KB 物理布局（`src/lib/scope.ts:90-108`）：`<kb>/<groupPath>/index.json` + `assets/`；scope 级点号前缀保留目录已有先例（`.relations`、`.trash`）。
- 写入统一 `walWrite`（`src/lib/store.ts:12`）。

## 3. 方案（TO-BE）

### 3.1 目录结构（新增）

```
src/lib/atlas/
├── types.ts      # AtlasMeta / AtlasStatus / AtlasPackage 类型
├── errors.ts     # AtlasError + 错误码 14xx（不进 governance-errors，避免治理域混入）
├── paths.ts      # atlasDir(scope) / packageZipPath / entryPath / archiveDir / uploadDir
├── zip-read.ts   # 零依赖 zip 读取（EOCD → 中央目录 → inflateRaw）
├── package.ts    # 校验链 + 原子替换 + archive + 暂存清理
└── index.ts      # 对外门面：installPackage / readStatus / readEntry / removePackage
```

### 3.2 磁盘布局

```
<kbDir>/<scope>/.atlas/
├── atlas.html           # 解包后的 entry（下发用）
├── package.zip          # 原始压缩包（留档/审计/回滚）
├── meta.json            # AtlasMeta
├── archive/<ts>.zip     # 上一版压缩包（保留 1 版）
└── .upload/<uploadId>/  # CLI 分片暂存（一期 CLI 直传可不用，预留）
```

### 3.3 校验链（顺序固定，任一步失败即终止且不落盘）

| # | 步骤 | 失败码 |
|---|---|---|
| 1 | 文件存在且 ≤ **20 MB** | `ATLAS_TOO_LARGE`(1403) |
| 2 | zip 魔数 `50 4B 03 04` | `ATLAS_PACKAGE_INVALID`(1401) |
| 3 | 定位 EOCD，条目数 ≤ **50**，非 zip64，**非加密** | `ATLAS_UNSUPPORTED_ZIP`(1407) |
| 4 | 逐条目路径安全：无 `..`、非绝对、无 `\0`、非符号链接、UTF-8 flag 优先 | `ATLAS_UNSAFE_ENTRY`(1404) |
| 5 | 解压过程中累计总量 ≤ **50 MB**（边解边累计，防 bomb） | `ATLAS_TOO_LARGE`(1403) |
| 6 | 根目录唯一 `.html`（大小写不敏感） | `ATLAS_ENTRY_NOT_FOUND`(1402) |
| 7 | entry 体积 ≤ **10 MB** | `ATLAS_TOO_LARGE`(1403) |
| 8 | 内容含 `<!DOCTYPE html`、含 `"baked": true`、**无外链**（`src|href="http` 或 `url(http`） | `ATLAS_PACKAGE_INVALID`(1401) |
| 9 | meta：优先取包内 `meta.json`（≤8 KB 且可 JSON.parse），否则用调用方传入的 meta | 用传入值 |

### 3.4 写路径

```
installPackage(scope, zipBuf, fallbackMeta?)
  → 校验链（纯内存，不碰磁盘）
  → mkdir .atlas/{,archive}
  → 若已有 atlas.html：copy 当前 package.zip → archive/<ts>.zip
  → 写 .atlas/.tmp-<ts>.html  → rename → atlas.html
  → 写 .atlas/.tmp-<ts>.zip   → rename → package.zip
  → 写 meta.json（走 walWrite）
```

失败回滚：任一步写失败时删除 `.tmp-*`；已完成的 `archive` 保留（不破坏旧状态）。

### 3.5 读路径

- `readStatus(scope)`：读 `meta.json`，缺失 → `{ exists: false }`（**不建目录**，用 `scopeDirExists` 判断，避免查不存在的库时凭空建库）。
- `readEntry(scope)`：读 `atlas.html`，为 0 字节 → `ATLAS_CORRUPTED`(1406)。

### 3.6 暂存清理

`.upload/<uploadId>/` 超过 **24h** 未完成即删（二期页面上传才用得到，一期预埋）。复用 `~/.ki/import-uploads` 的清理范式（`src/lib/mcp-http-api.ts:280` 附近 `cleanupUploads`），不另造一套。

### 3.7 数据模型

```ts
interface AtlasMeta {
  title: string;            // 图集标题（取自 atlas.config.json）
  branch: string;           // 生成基线分支
  baseline: string;         // 生成基线 commit（8 位短 hash 即可）
  generatedAt: string;      // ISO 时间，生成侧给出
  viewCount?: number;       // 图数
  entries?: { name: string; size: number }[]; // 包内条目（上传时回显）
  size: number;             // entry html 字节数
  packageSize: number;      // zip 字节数
  sha256: string;           // entry html 的 sha256
  uploadedAt: string;       // 服务端写入时间
  uploadedBy?: string;      // CLI/用户标识
}

interface AtlasStatus {
  exists: boolean;
  meta?: AtlasMeta;
}
```

### 3.8 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| zip 结构损坏 | 抛 `AtlasError(1401)`，文案指出「第几个条目/哪一步失败」 | 是（HTTP/CLI 都回文案） |
| 条目路径含 `..` | `AtlasError(1404)`，**不写任何文件** | 是 |
| 解压总量超限 | 边解边判断，超限立即中止并释放 | 是 |
| 磁盘写失败 | 删 `.tmp-*`，抛 `AtlasError(1406)` 并附 errno | 是（不含绝对路径） |
| 并发两次上传同 scope | 后写覆盖先写（`rename` 原子），`archive` 可能出现两版 | 否（一期单机 CLI，概率极低） |
| `meta.json` 损坏 | `readStatus` 返回 `exists:false` + 记日志，不抛给页面 | 否 |

## 4. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/atlas/*`（6 个新文件） | 新增 |
| `src/lib/scope.ts` | 无需改（复用 `getKbDir`/`scopeDirExists`） |
| `src/lib/group-delete.ts:282` `countFiles` | 无影响（`.atlas/` 在 scope 根，不在 group 下）；回归确认 |

## 5. 待定问题

| # | 问题 | 暂定 |
|---|---|---|
| 1 | `archive` 保留几版 | 1 版（随需求 §9 P3） |
| 2 | `uploadedBy` 取值 | CLI 记 `cli:<os.userInfo().username>`；二期 HTTP 记登录用户 |
