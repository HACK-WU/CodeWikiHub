# PasswordResetModule（`password-reset`）

- **位置**：`packages/server/src/password-reset/` · 归属文件 **12** 个 · 约 **212** 行
- **定义**：`packages/server/src/password-reset/password-reset.module.ts:7`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：无（顶层模块或被依赖方未在扫描范围）
- **被依赖**（动它会影响）：`AuthModule`
- **依赖的库/框架模块**：`TypeOrmModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `AuthModule`（`PasswordResetCreateCommand`、`PasswordResetGetCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `password_reset` | PasswordReset | 3 | @Module imports forFeature | `packages/server/src/password-reset/password-reset.service.ts:10` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`PasswordResetGetCommand`、`PasswordResetCreateCommand`

## 归属文件（12）

- `packages/server/src/password-reset/password-reset.entity.ts`
- `packages/server/src/password-reset/password-reset.service.ts`
- `packages/server/src/password-reset/password-reset.module.ts`
- `packages/server/src/password-reset/commands/password-reset.get.command.ts`
- `packages/server/src/password-reset/commands/password-reset.create.command.ts`
- `packages/server/src/password-reset/commands/index.ts`
- `packages/server/src/password-reset/commands/handlers/index.ts`
- `packages/server/src/password-reset/commands/handlers/password-reset.get.handler.ts`
- `packages/server/src/password-reset/commands/handlers/password-reset.create.handler.ts`
- `packages/server/src/password-reset/dto/change-password-request.dto.ts`
- `packages/server/src/password-reset/dto/index.ts`
- `packages/server/src/password-reset/dto/reset-password-request.dto.ts`
