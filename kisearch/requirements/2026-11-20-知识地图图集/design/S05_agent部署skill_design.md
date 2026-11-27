---
id: REQ-20261120-003
feature: 知识地图图集
document_type: design
created: 2026-11-24
updated: 2026-11-24
version: 1
author: AI
---

# S-05 agent 部署指引 skill（`atlas-deploy`）

> 本次新增的 skill：告诉任何 agent「怎么把 project-atlas 的产物部署进 kisearch」。

## 1. 术语

| 术语 | 定义 |
|---|---|
| 部署 | 把图集包装进某个 scope 的 `.atlas/`，使其在 `/atlas` 页可见 |
| 生成侧 skill | `project-atlas`（画什么、怎么讲），不属于本仓 |
| 部署侧 skill | 本 skill（怎么装、怎么验、怎么排障），属本仓 `skills/` |

## 2. 现状（AS-IS）

- 本仓 `skills/` 已有 5 个：`agents-md-init` / `event-report` / `ki-search` / `ki-upload` / `task-recall`，均为「agent 行为指引」型（frontmatter `name` + `description` 带触发词，正文分节 + 表格 + 红线）。
- **没有**任何关于图集/atlas 的指引；`ki-upload` 管的是「文档上传」，与图集部署是两件事。

## 3. 方案（TO-BE）

### 3.1 定位与边界

```
project-atlas（生成：画什么/怎么讲） ──产物 zip──▶ atlas-deploy（部署：装哪/怎么验/为什么失败）
ki-upload（文档 → KB）                               ≠ 本 skill（图集 → .atlas/）
```

**只管三件事**：打包形状对不对、装进哪个库、装完怎么验。
**不管**：怎么策划视图、怎么画图、图集内容是否正确（那是 `project-atlas` 的职责）。

### 3.2 触发词

`部署图集` / `上传知识地图` / `atlas deploy` / `把图集装进 kisearch` / `ki atlas upload`

### 3.3 文件结构

```
skills/atlas-deploy/
└── SKILL.md        # 单文件足够（约 150 行），不拆 reference
```

### 3.4 正文骨架（6 节）

| 节 | 内容 |
|---|---|
| 0 速览 | `有 zip? → 校验 → 上传 → 验证` 的四步流程图（文字树） |
| 1 前置检查 | `ki` 可用 / scope 存在且非只读 / project-atlas 可用；缺项怎么办 |
| 2 生成与打包 | 指回 `project-atlas`，只强调 `pack_atlas.py --zip` 与「包内根目录唯一 html」 |
| 3 上传 | `ki atlas upload --scope <s> --file <zip>`，`--json` 给 agent 判定 |
| 4 验证 | `ki atlas status --json` → 打开 `/atlas` → 点一个节点确认抽屉有代码 |
| 5 排障表 | 错误码 1401~1407 × 症状 × 下一步；附「常见的不是错误的错误」 |
| 6 红线 | 不手改 `.atlas/`、不绕过 CLI、不重复上传未变包（先比 sha）、图集不进 group |

### 3.5 排障表（设计要点）

| 错误码 | 症状 | 下一步 |
|---|---|---|
| 1402 `ATLAS_ENTRY_NOT_FOUND` | 包内根目录没有 html | 用 `pack_atlas.py … --zip` 重打；别手工 zip 一个目录 |
| 1401 `ATLAS_PACKAGE_INVALID` | 缺 `baked:true` / 含外链 | 打包前跑 `check_atlas.py`；`baked:true` 缺失说明用了 build 而非 pack |
| 1403 `ATLAS_TOO_LARGE` | >20 MB / 解压 >50 MB | 先减视图（skill 的视图预算是 6~8 页） |
| 1404 `ATLAS_UNSAFE_ENTRY` | 条目含 `../` 或符号链接 | 不要手工改包；重新打包 |
| 1407 `ATLAS_UNSUPPORTED_ZIP` | zip64 / 加密 | `pack_atlas.py` 默认产出兼容格式，出现即说明包被外部工具改过 |
| 退出码 2 | scope 不存在或只读 | 先建库 / 换可写库；不要试图改配置绕过 |

### 3.6 与产品/代码的关系

| 依赖 | 说明 |
|---|---|
| S-03 命令形状 | 一期唯一写入口；命令变更必须同步本 skill |
| S-02 `status` 字段 | 验证节的判定依据（`exists` / `baseline` / `sha256`） |
| 无代码依赖 | 纯 Markdown，可与 S-01~S-04 并行编写 |

## 4. 影响范围

| 文件 | 改动 |
|---|---|
| `skills/atlas-deploy/SKILL.md` | 新增 |
| `AGENTS.md`（可选） | 「项目记忆索引」附近补一行指向本 skill（不进 ki） |
| `~/.codebuddy/skills/` 副本 | 若其他项目也要用，按既有做法同步安装（本仓 `skills/` 是版本库真源） |

## 5. 待定问题

| # | 问题 | 暂定 |
|---|---|---|
| 1 | 是否给 skill 附一个 `scripts/verify.sh` | 一期不附；命令只有 3 条，写进正文更易读 |
| 2 | 是否同时提供 MCP 版指引 | 二期（等 `ki_atlas_upload` 落地） |
