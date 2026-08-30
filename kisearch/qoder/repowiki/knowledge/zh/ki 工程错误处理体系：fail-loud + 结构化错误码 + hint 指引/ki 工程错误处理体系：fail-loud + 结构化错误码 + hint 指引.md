---
kind: error_handling
name: ki 工程错误处理体系：fail-loud + 结构化错误码 + hint 指引
category: error_handling
scope:
    - '**'
source_files:
    - docs/error-handling.md
    - src/lib/config-schema.ts
    - src/lib/config.ts
    - src/lib/preflight.ts
    - src/lib/import.ts
    - src/lib/mcp-http-api.ts
    - src/get-module-info.ts
    - test/error-handling.test.ts
---

## 1. 整体策略与原则

项目采用「**fail-loud + 给出路**」的错误处理哲学，在 `docs/error-handling.md` 中明确三条原则：
- 输入非法时快速失败（参数校验、scope 白名单、配置字段校验）
- 可恢复场景尽量给出 `hint` / `next_step`
- 能够兜底时优先退化，而不是直接崩溃

该策略贯穿 CLI 子命令、MCP HTTP API、导入/扫描流程与配置文件解析。

## 2. 核心组件与文件

| 组件 | 文件 | 职责 |
|---|---|---|
| 配置字段校验器 | `src/lib/config-schema.ts` | 基于声明式 Schema 对 YAML/JSON 配置做字段名、类型、取值三级校验，收集 errors/warns |
| 配置加载器 | `src/lib/config.ts` | 调用 `validateConfigFields`，将 errors 聚合成 `CONFIG_FIELD_INVALID` 错误一次性抛出 |
| 写操作预检 | `src/lib/preflight.ts` | 定义 `PreflightError`（code: `DIR_NOT_WRITABLE` / `DISK_INSUFFICIENT`），在备份/导出前探测目录可写性与磁盘空间 |
| MCP HTTP 统一错误出口 | `src/lib/mcp-http-api.ts` | 所有 `/api/*` handler 的 try/catch 统一返回 `{ ok, error, code }` JSON |
| 业务函数结构化返回 | `src/get-module-info.ts` | 返回 `{ ok, scope, content?, error?, hint? }` 联合类型，把提示性信息放在 `hint` 字段 |
| 导入流程异常点 | `src/lib/import.ts` | 集中抛出 sourceDir 不存在、import.lock 冲突、格式白名单不匹配、无 md 文件、无可导入文件等错误 |
| 用户文档 | `docs/error-handling.md` | 按五类错误（参数/数据缺失/scan-kb/增量导入/展示参数）列出典型现象、原因与恢复步骤 |
| 专项测试 | `test/error-handling.test.ts` | 覆盖非法 scope、损坏 group-index.json、relations-cache 缺失、无效 mode、scan-kb 异常等矩阵 |

## 3. 架构与约定

### 3.1 配置层 fail-loud
`config-schema.ts` 用 `ConfigNode` 声明每个字段的 type/literal values/fields/value/nullHandling/deprecated/validate，通过 `walkObject` 递归遍历。未知字段报错并附 Levenshtein 相近字段建议；废弃字段仅告警；null 的 scope 条目走 `nullHandling` 降级为 warn。`parseAndExpand` 收集全部问题后一次性抛出 `CONFIG_FIELD_INVALID`，最多显示 10 条，避免“挤牙膏”式修改。

### 3.2 预检查错误码化
`preflight.ts` 定义 `PreflightError extends Error`，带 `code: PreflightCode` 枚举（`DIR_NOT_WRITABLE`、`DISK_INSUFFICIENT`）。调用方根据 code 区分权限不足与磁盘不足，给出不同恢复指引。

### 3.3 业务函数返回结构化结果
非 CLI 入口的业务函数（如 `get-module-info.ts`）返回联合类型 `{ ok: true; ... } | { ok: false; error: string; hint?: string }`，把“下一步怎么做”的提示放入 `hint` 字段，由上层统一输出到 stderr 或 JSON。

### 3.4 HTTP 层统一 catch
`mcp-http-api.ts` 的 `handleApiRequest` 对所有路由包裹 try/catch，捕获 `Error & { code?: string }`，统一以 `sendJson(res, 400, { ok: false, error: e.message, code: e.code ?? 'API_ERROR' })` 响应。路径穿越、扩展名限制、文件大小上限等安全校验直接 throw `new Error(...)`，被同一 catch 收敛。

### 3.5 导入流程的中断与自愈
`import.ts` 在开始阶段注册 SIGINT/SIGTERM 处理器，写入中断标记（含已处理/总文件数），清理 import.lock，退出码 130。并发导入通过 `import.lock` 互斥；SIGKILL 残留锁由 probe 机制自动清理。清洗 hook 失败会回滚已写的 local KB，保证一致性。

### 3.6 增量导入的降级策略
增量删除失败、`relations-cache` 未找到 sourcePath 等情况记录 warning 继续执行，不阻塞主流程，旧记录可能残留但不影响新记录写入——体现“能退化则退化”的原则。

## 4. 约束与规范

- **配置字段必须显式合法**：拼错字段名、类型不符、非法枚举值一律阻断加载（fail-loud），不做隐式回退（见 `config.ts` 注释“不做任何隐式 env 回退”）。
- **strict 模式下 scope 必须注册**：`resolveScope` 在 `scopeMode=strict` 时若未传或未在白名单内，抛错并列出已注册 scope。
- **CLI 子命令统一 JSON 输出**：测试通过 `execFileSync('npx', ['jiti', script, ...args])` 捕获 stdout JSON，期望 `{ ok: boolean, error?: string, hint?: string }` 结构，用于断言错误分支。
- **错误消息需包含可操作的 hint**：如 `relations-cache.json 不存在` → hint 为“请先使用 sync-relation.ts 写入关系”；Group 未匹配 → hint 提供近似 Relation 及 score。
- **安全相关错误直接抛错**：路径穿越、非法扩展名、超大文件等在 `mcp-http-api.ts` 中直接 `throw new Error(...)`，由顶层 catch 转为 HTTP 400。
- **磁盘/权限预检先于写操作**：备份/导出等写盘操作前调用 `checkWritable` / `checkDiskSpace`，失败即抛 `PreflightError`，避免产生半截产物。

## 5. 关键文件清单

- `docs/error-handling.md` — 面向用户的错误分类与恢复指南
- `src/lib/config-schema.ts` — 配置字段级校验 Schema 与 walk 引擎
- `src/lib/config.ts` — 配置加载、字段校验聚合、scope 模式解析
- `src/lib/preflight.ts` — 写操作前置预检（目录可写、磁盘空间）
- `src/lib/import.ts` — 导入流程中的参数校验、锁、中断、回滚
- `src/lib/mcp-http-api.ts` — HTTP API 路由与统一错误收敛
- `src/get-module-info.ts` — 业务函数结构化返回（ok/error/hint）
- `test/error-handling.test.ts` — 错误矩阵覆盖的端到端测试
- `src/lib/scope.ts`、`src/lib/store.ts` — scope 初始化、group-index 读写（配合错误场景）