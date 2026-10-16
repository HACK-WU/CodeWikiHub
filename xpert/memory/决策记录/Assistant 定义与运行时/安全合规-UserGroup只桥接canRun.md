---
groupPath: 决策记录/Assistant 定义与运行时
relation: 安全合规-UserGroup只桥接canRun
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜工作区能力与文件权限解耦：UserGroup 只桥接 canRun】
- 分类：安全合规
- 动机：避坑——被授权的组内用户不是工作区 owner/member，运行智能体时复用创作态读校验会报 Access denied to workspace，导致「已通过入口 ACL 的用户无法运行目标智能体」；修复方向是只补运行能力
- 决策：用户组只为工作空间补 canRun，**绝不提升 canRead/canWrite/canManage**；不能替代已发布智能体的入口 ACL；运行态查询必须保留租户/组织/工作空间数据范围；编辑/保存/发布入口不得走运行态方法绕过创作态校验
- 背景约束：判定依赖 xpert_to_user_group / user_group / user_group_to_user 的原生 SQL join（别名必须小写）；托管组元数据只能由平台侧写入（HTTP 入口剥离）
- 被否决方案：① 把组内用户加入工作空间成员 ② 用创作态通用查询承担运行态读取（文档明写会导致二次拒绝）
- 重新评估触发条件：用户组被要求授予编辑权，或文件级授权与工作空间能力需统一
- 关联代码：workspace-access.service.ts（getCapabilities 的 canRun 分支 / hasPublishedXpertRunAccess）、workspace.service.ts
- 证据来源：docs/plans/PLAN_xpert_user_groups_access.md + 本域源码注释（A published Xpert grant unlocks execution only；明写）