---
kind: logging_system
name: 基于 console + stderr 的轻量日志输出（无结构化日志框架）
category: logging_system
scope:
    - '**'
source_files:
    - src/lib/progress.ts
    - src/lib/import.ts
    - src/lib/batch-vectorize.ts
    - src/mcp-server.ts
    - src/search.ts
    - src/store.ts
    - src/sync-relation.ts
    - src/query-group.ts
    - src/manage-index.ts
    - src/get-module-info.ts
---

## 1. 使用的系统/方案

本仓库**没有引入任何第三方日志框架**（如 pino、winston、bunyan、debug 等），也没有统一的 logger 模块。所有运行期输出均通过 Node.js 原生 `console` API 与直接写入 `process.stderr` 实现：
- `console.error(...)` 用于错误/帮助信息，默认输出到 stderr。
- `console.warn(...)` 用于参数校验警告、降级提示。
- `src/lib/progress.ts` 提供一组 `logPhaseStart / logProgress / logInfo / logWarn / logSummary` 函数，统一通过 `process.stderr.write` 输出导入/向量化进度条与阶段信息。
- 进度输出刻意走 **stderr**，注释明确约束“不污染 stdout 的 JSON 结果”，以便 CLI 命令在管道中把 JSON 结果重定向到文件时不被进度条混入。

因此，该项目的“日志系统”本质上是：**分散的 console 调用 + 一个集中化的进度输出工具模块**，没有级别过滤、没有结构化字段、没有 sink 路由。

## 2. 关键文件

- `src/lib/progress.ts`：唯一集中封装的日志/进度输出模块，定义进度条宽度、phase 标记、TTY/非 TTY 分支输出策略。
- `src/lib/import.ts`、`src/lib/batch-vectorize.ts`：主要消费者，调用 `logProgress`、`logPhaseStart`、`logPhaseDone` 展示导入/向量化进度。
- `src/mcp-server.ts`、`src/search.ts`、`src/store.ts`、`src/sync-relation.ts`、`src/query-group.ts`、`src/manage-index.ts`、`src/get-module-info.ts`：直接使用 `console.error` / `console.warn` 输出错误、用法提示与运行时警告。
- `web/src/lib/query-client.ts`：前端仅有一处注释提到“error logging”作为默认行为说明，未引入额外日志库。

## 3. 架构与约定

- **输出通道约定**：用户可见的进度、提示、警告一律写 `stderr`；JSON 结果（如搜索返回）写 `stdout`。这是通过 `progress.ts` 的显式 `process.stderr.write` 以及 `console.error/warn` 的默认 stderr 行为实现的。
- **TTY 自适应**：`logProgress` 在 `process.stderr.isTTY` 为真时使用回车覆盖单行显示进度条；否则逐行输出，保证被管道/文件捕获时仍可读。
- **无全局配置**：不存在 `LOG_LEVEL`、`logLevel`、`logger` 等配置项或环境变量；无法在运行时调整日志级别或切换输出目标。
- **无结构化字段**：日志消息均为拼接字符串，不包含 timestamp、level、module、traceId 等结构化字段，也不输出 JSON 格式日志。
- **MCP/HTTP 服务**：`src/mcp-server.ts` 启动失败时直接 `console.error` 打印原因，没有通过中间件或统一错误处理器收集日志。

## 4. 约定与约束

可观察到的约定（来自代码注释与实现模式）：

1. **进度输出必须走 stderr**：`progress.ts` 顶部注释明确“控制台进度走 stderr，不污染 stdout 的 JSON 结果”，所有进度函数均使用 `process.stderr.write`。
2. **非 TTY 下退化为逐行输出**：`logProgress` 在非 TTY 环境不再尝试覆盖行，而是每步输出一行，确保管道场景可读（注释标注对应需求 REQ-05 O-05）。
3. **CLI 参数非法值统一用 `console.warn` 告警并回退默认值**：`cli-args.ts`、`query-group.ts`、`sync-relation.ts` 中对无效 flag 值采用相同模式——warn 提示 + 使用默认值继续执行。
4. **错误/用法提示统一用 `console.error`**：缺少必要参数、MCP 启动失败、restore 帮助信息等均以 `console.error` 输出。
5. **向量写入失败降级为 warn**：`sync-relation.ts` 在向量服务不可用或写入失败时仅 `console.warn` 跳过，不中断主流程，体现“向量写入是可选增强”的设计约束。

当前仓库**不存在**以下能力：日志级别开关、结构化日志对象、多 sink（文件/远程）、日志采样或异步缓冲。若需扩展，需在现有 `progress.ts` 风格基础上新增统一 logger 模块，或引入第三方框架替换分散的 `console` 调用。