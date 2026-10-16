---
groupPath: 决策记录/租户与平台设置
relation: 兼容处理-feature定义墓碑码
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜feature 定义墓碑码】
- 分类：兼容处理
- 动机：避坑：已从代码删除的 feature 定义仍残留在老库 → 读接口返回脏数据
- 决策：开关定义以数据库为真源（DEFAULT_FEATURES 同步）；代码侧保留 RETIRED_FEATURE_CODES 兼容墓碑——读侧过滤 + 启动时 purgeRetiredFeatures 在同一事务内先删 FeatureOrganization 再删 Feature
- 背景约束：老库升级后仍可能存有已删除定义的行，且 seed 清理可能尚未执行
- 被否决方案：无
- 重新评估触发条件：无（墓碑码集合清空后机制自然退出）
- 关联代码：FeatureService.RETIRED_FEATURE_CODES / purgeRetiredFeatures / getParentFeatures @ packages/server/src/feature/feature.service.ts
- 证据来源：packages/server/src/feature/feature.service.ts 注释（明写 Compatibility tombstones）