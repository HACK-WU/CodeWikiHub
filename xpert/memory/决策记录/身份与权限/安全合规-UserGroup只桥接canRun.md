---
groupPath: 决策记录/身份与权限
relation: 安全合规-UserGroup只桥接canRun
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜UserGroup 只桥接 canRun，不提升读写管理能力】
- 分类：安全合规
- 动机：避坑：被授权的组内用户不是工作空间 owner/member，运行智能体时因复用创作态读校验而报 Access denied to workspace → 已通过智能体入口 ACL 的用户无法运行目标智能体；修复方向是只补运行能力，而不是把他变成工作空间成员
- 决策：用户组只为工作空间补 canRun，**绝不提升 canRead / canWrite / canManage**；不能替代已发布智能体的入口 ACL；运行态查询必须继续保留租户、组织、工作空间数据范围，编辑/保存/发布入口不得走运行态方法绕过创作态校验
- 背景约束：判定依赖智能体、用户组与组成员的关联表组合；托管组元数据只能由平台侧写入（HTTP 入口剥离），防止通过接口伪造组归属
- 被否决方案：把组内用户加入工作空间成员；用创作态通用查询承担运行态读取（文档明写会导致二次拒绝）
- 重新评估触发条件：用户组被要求授予编辑权，或文件级授权与工作空间能力需要统一（出现「组内用户需要改草稿」的需求单）
- 关联代码：UserGroupService.updateMembers / assertAccessibleOrganizationId @ packages/server/src/user-group/user-group.service.ts
- 证据来源：docs/plans/PLAN_xpert_user_groups_access.md（明写）；docs/zh-Hans/guides/permission.mdx（明写安全不变量）