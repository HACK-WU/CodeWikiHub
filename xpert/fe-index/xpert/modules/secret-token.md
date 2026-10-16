# SecretTokenModule（`secret-token`）

- **位置**：`packages/server/src/secret-token/` · 归属文件 **11** 个 · 约 **519** 行
- **定义**：`packages/server/src/secret-token/secret-token.module.ts:10`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`ApiKeyModule`、`UserModule`
- **被依赖**（动它会影响）：`AIModule`、`EnterpriseChatkitModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `secret_token` | SecretToken | 3 | @Module imports forFeature | `packages/server/src/secret-token/secret-token.service.ts:12` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`SecretTokenCreateCommand`、`SecretTokenGetCommand`

## 归属文件（11）

- `packages/server/src/secret-token/secret-token.entity.ts`
- `packages/server/src/secret-token/index.ts`
- `packages/server/src/secret-token/secret-token.module.ts`
- `packages/server/src/secret-token/secret-token.strategy.ts`
- `packages/server/src/secret-token/secret-token.service.ts`
- `packages/server/src/secret-token/commands/secret-token.get.command.ts`
- `packages/server/src/secret-token/commands/index.ts`
- `packages/server/src/secret-token/commands/secret-token.create.command.ts`
- `packages/server/src/secret-token/commands/handlers/index.ts`
- `packages/server/src/secret-token/commands/handlers/secret-token.create.handler.ts`
- `packages/server/src/secret-token/commands/handlers/secret-token.get.handler.ts`
