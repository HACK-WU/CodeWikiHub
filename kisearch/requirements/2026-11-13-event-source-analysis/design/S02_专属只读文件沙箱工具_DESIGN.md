---
id: REQ-20261113-003
feature: 事件源码分析（只读）· S-02 专属只读文件沙箱工具
status: 设计中
created: 2026-11-16
updated: 2026-11-16
version: 1
tags: [设计, S-02, 沙箱, 只读工具]
depends_on: [REQ-20261113-004]
author: AI
document_type: design
---

# S-02：专属只读文件沙箱工具设计

## 1. 术语

跨子需求共享术语见父文档 `DESIGN.md` §4.3（`AnalysisToolName`）。本子需求特有术语：

| 术语 | 含义 | 引用 |
|---|---|---|
| `FsSandboxRoot` | 经过 `fs.realpathSync` 解析并校验合法的宿主机目录根（目标代码目录或 Git 仓库根） | — |
| `OUT_OF_ROOT` | 路径沙箱拒绝错误码：绝对路径、`..` 穿越、含 `\0`、特殊系统路径或符号链接指向根外统一返回此码，不回传越界内容或存在性 | — |
| `AnalysisToolEntry` | 仅供 S-04 内部工具循环使用的工具定义与执行器条目（物理隔离于 `CHAT_MCP_TOOLS` 与 `/mcp`） | — |

---

## 2. 现状（AS-IS）

### 2.1 现状描述

- 全仓已有工具体系仅面向知识库读写：`src/lib/chat/mcp-tool-registry.ts` 登记了 14 个 KB 工具（`CHAT_MCP_TOOLS`），`src/lib/mcp-server-factory.ts` 注册了对外 `/mcp` 工具。
- `src/lib/datasource-clone.ts:170-173, 245-260` 已有一套目录与符号链接安全校验模式（`lstatSync` + `realpathSync` + `isInside`），但仅用于 Git clone 阶段子目录合法性检查，未封装成通用文件只读沙箱。

### 2.2 痛点

- 痛点 1：没有任何工具能在不把源码导入向量库的前提下，让分析流程安全地浏览目录、查找文件、搜索关键字并读取片段。
- 痛点 2：若直接将文件工具放进 `CHAT_MCP_TOOLS` 或 `/mcp`，会突破「不做通用代码问答」边界，并绕过 `/mcp` 的 scope 越权校验模型。

---

## 3. 方案（TO-BE）

### 3.1 方案概述

> 默认假设：本子需求默认目标目录在本地文件系统且单仓库文件数 ≤ 1 万、每次扫描耗时 < 1s（如超过可在后续阶段引入外置 `rg`）。

在 `src/lib/events/analysis-fs-tools.ts`（新模块）中实现面向任意指定本地目录 `rootDir` 的 4 个只读工具（`fs_read / fs_grep / fs_find / fs_ls`）及 `resolveSafePath` 沙箱守卫；所有执行器只接受已解析的 `realRoot` 上下文，绝不暴露给 `CHAT_MCP_TOOLS` 或 `/mcp` server。

### 3.2 关键决策点

| 决策 | 选择 | 理由 | 备选方案 | 否决原因 | 重新评估触发条件 |
|---|---|---|---|---|---|
| **工具注册隔离方式** | 独立模块 `analysis-fs-tools.ts` 构造分析专用 `AnalysisToolEntry[]`，不入 `CHAT_MCP_TOOLS` | 编译期与结构上彻底隔离，普通对话与 `/mcp` 绝无可能触达文件工具 | 注册进 `CHAT_MCP_TOOLS` 再靠开关默认关闭 | 一旦用户或测试开启开关即暴露全局代码读取面，违背 Q2 拍板 | 未来单独立项支持「全局代码问答」且补充 `/mcp` scope 路径鉴权时 |
| **`fs_grep` 检索实现方式** | 纯 Node.js **异步 IO（`fs.promises`）** 目录遍历 + 逐行流式正则/字面匹配（跳过 `.git`/`node_modules` 与二进制，每遍历一批让出事件循环） | 零外部进程依赖（不要求宿主机装 `rg`）、**不阻塞 Node 主线程 HTTP/MCP 服务**、完全受控于 `AbortSignal` | 同步 `readdirSync` 遍历或直接 `execFile('rg', ...)` | 同步遍历会卡死 daemon 并发请求；部分精简容器无 `rg` 二进制 | 实测 1 万文件目录异步 JS 遍历均值 > 2s 且确认环境内置 `rg` |
| **符号链接处理策略** | 默认不跟随指向 `realRoot` 外的 symlink；目录遍历不主动跟踪 symlink 防环 | 与 `datasource-clone.ts:253` 同口径，防止仓内恶意 symlink 逃逸到 `/etc` 或宿主机任意文件 | 全部跟随 symlink 再过滤输出 | `fs.readdir` 跟随 symlink 递归会导致循环目录死循环与外部目录遍历 | 明确需要支持仓内 monorepo workspace 软链时（仅放行目标在 `realRoot` 内的软链） |

---

## 4. 接口设计

### 4.1 沙箱校验与对外工厂接口（`src/lib/events/analysis-fs-tools.ts`）

```typescript
export interface FsSandboxContext {
  /** 用户配置的原始目录 */
  rawRoot: string;
  /** 启动前经 realpath 解析的安全根 */
  realRoot: string;
  /** 每次分析最多允许打开读取的文件去重计数 */
  maxFiles: number;
  /** 累计读取的去重相对路径集合（供统计与预算截断） */
  filesRead: Set<string>;
  signal?: AbortSignal;
}

export interface FsToolResult {
  ok: true;
  data: Record<string, unknown>;
} | {
  ok: false;
  code: 'OUT_OF_ROOT' | 'NOT_FOUND' | 'NOT_A_FILE' | 'NOT_A_DIR' | 'INVALID_ARG' | 'FILE_BUDGET_EXCEEDED' | 'ABORTED';
  error: string;
}

export function validateTargetRootDir(rawDir: string): { ok: true; realRoot: string } | { ok: false; code: string; error: string };
export function resolveSafePath(realRoot: string, relInput: string): { ok: true; realPath: string; relPath: string } | { ok: false; code: 'OUT_OF_ROOT' | 'NOT_FOUND'; error: string };
export function createFsToolEntries(ctx: FsSandboxContext): readonly AnalysisToolEntry[];
```

### 4.2 四个工具契约（Schema 与硬上限）

| 工具名 | 入参 Schema（无 `scope`，无 `root`） | 硬上限与返回形态 | 异常行为 |
|---|---|---|---|
| `fs_ls` | `{ path?: string }`（缺省为 `.`） | 返回 `entries: [{ name, type: 'file'\|'dir'\|'other', size? }]`，最多 200 项，附 `truncated: boolean` | 越界 → `OUT_OF_ROOT`；不存在 → `NOT_FOUND` |
| `fs_find` | `{ name: string, path?: string }`（glob/子串匹配相对路径） | 跳过 `.git`/`node_modules`/`dist`/`.next` 等默认忽略目录；最多返回 80 条 `paths: string[]` + `truncated` | 空 pattern → `INVALID_ARG`；越界 → `OUT_OF_ROOT` |
| `fs_grep` | `{ pattern: string, path?: string, glob?: string }` | 最多返回 60 条 `{ file, line, text }`（`text` ≤ 200 字符）；单文件 > 2MB 跳过并计数；读前 8KB 含 `\0` 判二进制跳过并计 `skippedBinary`；总扫描耗时受 `ctx.signal` 约束 | 非法正则回退按字面串或报 `INVALID_ARG`；越界 → `OUT_OF_ROOT` |
| `fs_read` | `{ path: string, offset?: number, limit?: number }` | `offset` 1-based（默认 1）；`limit` 默认 120、硬上限 200 行；单次正文硬上限 64 KB；返回 `{ path, startLine, endLine, totalLines, truncated, content }`；计入 `ctx.filesRead`（超 `ctx.maxFiles` 时拒绝读新文件，允许重读已读文件） | 越界 → `OUT_OF_ROOT`；超预算 → `FILE_BUDGET_EXCEEDED`；二进制文件 → 拒绝并返回提示 |

### 4.3 契约变更声明

| 变更类型 | 接口 | 变更内容 | 影响的子需求 |
|---|---|---|---|
| 新增 | `createFsToolEntries` & `validateTargetRootDir` | 新增专属只读文件沙箱模块 | S-04 |

---

## 6. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| 入参含 `\0`、以 `/` 开头、含 `..` 段、或经 `realpath` 后落在 `realRoot` 外 | 立即返回 `{ ok: false, code: 'OUT_OF_ROOT', error: '路径越出允许目录范围' }`，不透露目标是否存在 | 是（回传给 LLM；不透宿主机信息） |
| `validateTargetRootDir` 收到 `/proc`、`/sys`、`/dev` 或不存在/不可读路径 | 拒绝启动分析，返回 `TARGET_DIR_UNREADABLE` | 是 |
| `fs_read` 命中二进制文件（前 8KB 含 `\0`） | 返回 `{ ok: false, code: 'INVALID_ARG', error: '目标为二进制文件，跳过读取' }`，不把乱码塞进 LLM 上下文 | 是（给 LLM） |
| 超过 `ctx.maxFiles`（如默认 8 个）读取新文件 | 返回 `FILE_BUDGET_EXCEEDED` 并提示用已有内容总结，已读过的文件继续允许分页续读 | 是（给 LLM） |

---

## 7. 性能 & 安全

### 性能

- **预期量级**：单仓库 ≤ 1 万文件、单次 `fs_grep` 期望 < 1s、单次分析最多读 8 个文件（每段 ≤ 64 KB）。
- **关键控制**：`fs_grep` / `fs_find` / `fs_read` 全链路使用异步 `fs.promises`（绝不用 `Sync` 阻塞 daemon 事件循环）；默认忽略 `.git`、`node_modules`、`vendor`、`dist`、`build` 等构建/依赖目录；`fs_grep` 命中满 60 条立即提前结束遍历；单个 > 2MB 文件直接跳过。
- **不做的优化**：一期不自建持久化 trigram/倒排代码索引（按需实时读，不维护增量失效状态）。

### 安全

- **输入校验**：绝对禁止把用户输入拼进 shell；`fs_grep` 正则表达式限定 ≤ 200 字符且若包含易引发 ReDoS 的嵌套量词或编译失败，自动降级为纯字面子串匹配；所有路径经 `path.resolve` + `fs.promises.realpath` 解析后校验落在 `realRoot` 内。
- **权限边界**：进程内 `fs_*` 工具清单物理独立于 `CHAT_MCP_TOOLS` 与 `/mcp`；且单测直接断言全仓全局注册表不含 `fs_*`。

---

## 8. 测试方案

| 类型 | 范围 | 工具 |
|---|---|---|
| 单元测试 | `test/events/analysis-fs-tools.test.ts`：覆盖 `fs_ls`/`fs_find`/`fs_grep`/`fs_read` 正常路径、`/etc/passwd`、`../../etc/passwd`、`\0` 注入、根外 symlink 逃逸返回 `OUT_OF_ROOT`、>64KB 截断、二进制跳过计数、`maxFiles` 限额、以及断言 `CHAT_MCP_TOOLS` 和 `mcp-server-factory` 不含 `fs_*` | `npx jiti` |

不在测试范围内：10 万文件极限压测在集成验证期以独立基准脚本手工验证。

---

## 10. 影响范围

| 影响对象 | 影响类型 | 影响描述 | 是否破坏性变更 |
|---|---|---| :---: |
| `src/lib/events/analysis-fs-tools.ts` | 新增 | 专属只读沙箱工具集实现 | 否 |
| `src/lib/chat/mcp-tool-registry.ts` | 无变更 | 守卫验证其不引入 `fs_*` | 否 |
