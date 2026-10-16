---
groupPath: 决策记录/工具与MCP专家
relation: 性能取舍-ToolsetGuard五分钟缓存
exportedAt: "2026-10-16T07:28:46.847Z"
---
【决策记录｜性能取舍：ToolsetGuard 只缓存允许结果、TTL 5 分钟】
- 分类：性能取舍
- 动机（避坑）：**现象** `GET /:id/credentials` 每个请求都要做 `createdById` 判定 + `workspaceService.canAccess` 查询（凭据读端点成为高频 DB 放大点）；反向若把拒绝结果也缓存或做永久缓存，则会出现「授权后被拒」与「撤权后仍可读凭据」两类错误
- 决策：只缓存**允许**结果——`cacheKey = userToolset_${tenantId}_${user.id}_${toolsetId}`，命中即直接返回；未命中才走 `createdById === user.id || workspaceService.canAccess(toolset.workspaceId, user.id)`，仅当 `isAuthorized` 时 `cacheManager.set(..., 5 * 60 * 1000)`；**拒绝路径不写缓存**（每次穿透，每次抛 403 `Access denied`）
- 背景约束：**没有任何主动清除调用点**——5 分钟内被移出工作区 / 被转交的工具集仍可继续读凭据（撤权存在最长 5 分钟窗口）；与「凭据本身库内明文」叠加构成主要风险面
- 被否决方案：无（未见对「缓存拒绝结果」或「完全不缓存」的显式否决记录）
- 重新评估触发条件：出现「权限回收必须立即生效」的合规要求，或需要给缓存加显式失效通道（成员移除 / 工作区变更事件）时——应改为「允许缓存 + 主动失效」或降为极短 TTL
- 失败面：403 `ForbiddenException('Access denied')` 是唯一拒绝信号；缓存键含 tenant 与 userId，但被转交后的旧键仍有效
- 关联代码：file://packages/server-ai/src/xpert-toolset/guards/toolset.guard.ts、file://packages/server-ai/src/xpert-toolset/xpert-toolset.controller.ts
- 证据来源：C5-关键决策.md §D3；implementation/01-架构.md「关键不变量」1 与「技术债与 hack」2；implementation/05-接口.md「鉴权与准入矩阵」`ToolsetGuard` 行
- 详细资产：.module-experts/后端专题/工具与 MCP 专家/C0-使用总览.md 已知坑 1