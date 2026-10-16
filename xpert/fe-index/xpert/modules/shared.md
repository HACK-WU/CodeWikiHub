# SharedModule（`shared`）

- **位置**：`packages/server/src/shared/` · 归属文件 **41** 个 · 约 **1268** 行
- **定义**：`packages/server/src/shared/shared.module.ts:4`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`ValidatorModule`
- **被依赖**（动它会影响）：`AssistantBindingModule`、`ChatConversationModule`、`ChatMessageFeedbackModule`、`ChatMessageModule`、`DataSourceModule`、`DataSourceTypeModule`、`InviteModule`

## 事件/命令耦合（不经 imports，1 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `RolePermissionModule`（CQRS：`CheckRolePermissionCommand`）

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `employee` | Employee | 2 | @InjectRepository | `packages/server/src/shared/guards/organization-permission.guard.ts:15` |
| `role` | Role | 1 | getRepository | `packages/server/src/shared/decorators/validations/is-role-already-exist.decorator.ts:35` |

## 归属文件（41）

- `packages/server/src/shared/index.ts`
- `packages/server/src/shared/shared.module.ts`
- `packages/server/src/shared/decorators/allowed-client-secret-bindings.decorator.ts`
- `packages/server/src/shared/decorators/public.decorator.ts`
- `packages/server/src/shared/decorators/index.ts`
- `packages/server/src/shared/decorators/roles.ts`
- `packages/server/src/shared/decorators/permissions.ts`
- `packages/server/src/shared/decorators/user.ts`
- `packages/server/src/shared/decorators/language.decorator.ts`
- `packages/server/src/shared/decorators/time-zone.decorator.ts`
- `packages/server/src/shared/decorators/apiKey.decorator.ts`
- `packages/server/src/shared/decorators/validations/index.ts`
- `packages/server/src/shared/decorators/validations/match.decorator.ts`
- `packages/server/src/shared/decorators/validations/is-between-activity.decorator.ts`
- `packages/server/src/shared/decorators/validations/is-role-already-exist.decorator.ts`
- `packages/server/src/shared/decorators/validations/is-before-date.decorator.ts`
- `packages/server/src/shared/dto/index.ts`
- `packages/server/src/shared/dto/relations-query.dto.ts`
- `packages/server/src/shared/guards/tenant-permission.guard.ts`
- `packages/server/src/shared/guards/permission.guard.ts`
- `packages/server/src/shared/guards/tenant-base.guard.ts`
- `packages/server/src/shared/guards/api-key-auth.guard.ts`
- `packages/server/src/shared/guards/core-auth.guard.ts`
- `packages/server/src/shared/guards/plugin-scope.guard.ts`
- `packages/server/src/shared/guards/index.ts`
- `packages/server/src/shared/guards/api-key-or-client-secret.guard.ts`
- `packages/server/src/shared/guards/role.guard.ts`
- `packages/server/src/shared/guards/ws-auth.guard.ts`
- `packages/server/src/shared/guards/organization-permission.guard.ts`
- `packages/server/src/shared/guards/auth.guard.ts`
- `packages/server/src/shared/handlers/index.ts`
- `packages/server/src/shared/handlers/update-entity.by-member.handler.ts`
- `packages/server/src/shared/http/http-like-exception.filter.ts`
- `packages/server/src/shared/http/index.ts`
- `packages/server/src/shared/http/http-like-exception.ts`
- `packages/server/src/shared/pipes/abstract-validation.pipe.ts`
- `packages/server/src/shared/pipes/parse-json.pipe.ts`
- `packages/server/src/shared/pipes/index.ts`
- `packages/server/src/shared/pipes/use-validation.pipe.ts`
- `packages/server/src/shared/pipes/uuid-validation.pipe.ts`
- ……其余 1 个见 JSON 输出（完整清单）
