# ImportRecordModule（`import-record`）

- **位置**：`packages/server/src/export-import/import-record/` · 归属文件 **10** 个 · 约 **177** 行
- **定义**：`packages/server/src/export-import/import-record/import-record.module.ts:8`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`ImportAllModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，0 出 / 2 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `ImportAllModule`（`ImportRecordFindOrFailCommand`）
- ← `OrganizationModule`（`ImportRecordUpdateOrCreateCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `import-record` | ImportRecord | 3 | @Module imports forFeature | `packages/server/src/export-import/import-record/import-record.service.ts:12` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`ImportRecordUpdateOrCreateCommand`、`ImportRecordFindOrFailCommand`

## 归属文件（10）

- `packages/server/src/export-import/import-record/import-record.service.ts`
- `packages/server/src/export-import/import-record/import-record.module.ts`
- `packages/server/src/export-import/import-record/index.ts`
- `packages/server/src/export-import/import-record/import-record.entity.ts`
- `packages/server/src/export-import/import-record/commands/import-record-find-or-fail.command.ts`
- `packages/server/src/export-import/import-record/commands/import-record-update-or-create.command.ts`
- `packages/server/src/export-import/import-record/commands/index.ts`
- `packages/server/src/export-import/import-record/commands/handlers/import-record-update-or-create.handler.ts`
- `packages/server/src/export-import/import-record/commands/handlers/index.ts`
- `packages/server/src/export-import/import-record/commands/handlers/import-record-find-or-fail.handler.ts`
