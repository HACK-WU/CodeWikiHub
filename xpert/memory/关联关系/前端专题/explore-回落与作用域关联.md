---
groupPath: 关联关系/前端专题
relation: explore-回落与作用域关联
exportedAt: "2026-10-16T03:52:14.870Z"
---
**关联：探索广场的回落目标与实体同源**

- 方向：对话域 → 探索广场（回落）；Xpert 工作台 → 探索广场（实体同源）
- 内容：
  - 对话域 clawxpert 子树 canActivateChild: featureGate([FEATURE_XPERT, FEATURE_XPERT_CLAWXPERT], ['/explore']) —— 缺开关时回落 /explore
  - 广场中的 Agent/应用实体与 Xpert 工作台域同源（已发布形态；工作台展示草稿优先形态）
  - 广场按作用域过滤（ExploreScopeService.activeScope/key），与工作区 dual-scope 语义一致
- 改动风险：改 /explore 路由前缀会影响对话域守卫回落配置；改作用域机制会影响广场与工作区两侧内容过滤
- 证据：features/chat/routes.ts（canActivateChild）、features/explore/explore-scope.service.ts