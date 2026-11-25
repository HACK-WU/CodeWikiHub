---
groupPath: 错误库
relation: 视图 scope 下前端用裸 id 做选中键会撞车
exportedAt: "2026-11-23T10:03:28.326Z"
---
视图 scope 聚合多个成员库时，内置实体在每个库都有一份且 id 相同（如 `et_1`），前端若用裸 id 当 React key 与选中判断，会同名项重复渲染并同时高亮。2026-11-23 事件类型 tab 实测：`kisearch-docs`（两成员库）下 4 个类型渲染成 7 个 tab，两个「性能优化」`aria-pressed` 都为 true。

- 后端已给出解药: 视图分支为每条补 `typeKey = \`${scope}:${id}\`` 并在注释写明「裸 id 必撞车」（`src/lib/governance-http.ts` 的 event-types GET）；单库分支不补。
- 前端正确形状: 选中键统一 `typeKey ?? id`（key / aria-pressed / setSelected 三处一致）；同名项还要按 name 去重，否则即便 key 不撞，用户看到的仍是重复 tab。
- 去重取舍: 同名类型保留首个成员库那份，`title` 标「来自 X」，不丢失来源信息。
- 判定口径: 页面是否被视图 scope 覆盖，看 `isViewScope`；带筛选/选择态的下拉与 tab 都要过一遍这句。
- 位置: `web/src/pages/EventsPage.tsx`（`typeTabs` 去重 / `selectedType` 查找 / tab 渲染）
- 验证: 必须在**视图 scope**下走查，单库不曝光此问题。