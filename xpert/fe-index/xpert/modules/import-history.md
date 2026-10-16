# ImportHistoryModule（`import-history`）

- **位置**：`packages/server/src/export-import/import-history/` · 归属文件 **8** 个 · 约 **102** 行
- **定义**：`packages/server/src/export-import/import-history/import-history.module.ts:8`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`ImportAllModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `ImportAllModule`（`ImportHistoryCreateCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `import-history` | ImportHistory | 3 | @Module imports forFeature | `packages/server/src/export-import/import-history/import-history.service.ts:12` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`ImportHistoryCreateCommand`

## 归属文件（8）

- `packages/server/src/export-import/import-history/import-history.service.ts`
- `packages/server/src/export-import/import-history/index.ts`
- `packages/server/src/export-import/import-history/import-history.module.ts`
- `packages/server/src/export-import/import-history/import-history.entity.ts`
- `packages/server/src/export-import/import-history/commands/index.ts`
- `packages/server/src/export-import/import-history/commands/import-history-create.command.ts`
- `packages/server/src/export-import/import-history/commands/handlers/index.ts`
- `packages/server/src/export-import/import-history/commands/handlers/import-history-create.handler.ts`
