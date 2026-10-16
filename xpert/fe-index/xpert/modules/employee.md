# EmployeeModule（`employee`）

- **位置**：`packages/server/src/employee/` · 归属文件 **19** 个 · 约 **1172** 行
- **定义**：`packages/server/src/employee/employee.module.ts:14`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `user` · 视图/接口入口 **1** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/employee/employee.controller.ts`（EmployeeController） | `-` | 1 | `:13` |

## 依赖关系

- **依赖**（改它要连带看）：`AuthModule`、`EmailModule`、`TenantModule`、`UserModule`、`UserOrganizationModule`
- **被依赖**（动它会影响）：`ServerAppModule`、`ValidatorModule`
- **依赖的库/框架模块**：`CqrsModule`、`TypeOrmModule`、`RouterModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `employee` | Employee | 4 | @Module imports forFeature | `packages/server/src/employee/employee.seed.ts:130` |

## 非 HTTP 入口

- **CQRS Handler**（4）：`EmployeeCreateCommand`、`EmployeeBulkCreateCommand`、`EmployeeUpdateCommand`、`EmployeeGetCommand`

## 守卫/权限

`TenantPermissionGuard`

## 归属文件（19）

- `packages/server/src/employee/employee.seed.ts`
- `packages/server/src/employee/employee.subscriber.ts`
- `packages/server/src/employee/employee.service.ts`
- `packages/server/src/employee/index.ts`
- `packages/server/src/employee/default-employees.ts`
- `packages/server/src/employee/employee.controller.ts`
- `packages/server/src/employee/employee.entity.ts`
- `packages/server/src/employee/employee.module.ts`
- `packages/server/src/employee/commands/employee.update.command.ts`
- `packages/server/src/employee/commands/index.ts`
- `packages/server/src/employee/commands/employee.bulk.create.command.ts`
- `packages/server/src/employee/commands/employee.create.command.ts`
- `packages/server/src/employee/commands/employee.get.command.ts`
- `packages/server/src/employee/commands/handlers/employee.create.handler.ts`
- `packages/server/src/employee/commands/handlers/employee.bulk.create.handler.ts`
- `packages/server/src/employee/commands/handlers/index.ts`
- `packages/server/src/employee/commands/handlers/employee.update.handler.ts`
- `packages/server/src/employee/commands/handlers/employee.get.handler.ts`
- `packages/server/src/employee/dto/public.dto.ts`
