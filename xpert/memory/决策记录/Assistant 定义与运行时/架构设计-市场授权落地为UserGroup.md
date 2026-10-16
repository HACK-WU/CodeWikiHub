---
groupPath: 决策记录/Assistant 定义与运行时
relation: 架构设计-市场授权落地为UserGroup
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜市场授权落地为 UserGroup 成员关系】
- 分类：架构设计
- 动机：[推测] 让审批结果立即可被既有准入查询消费，避免为本域新增一套权限子系统与新的 join 路径
- 决策：approveRequest 不维护独立授权表，而是 ensureAccessGroup(xpert) 建/复用 UserGroup（managedBy=XPERT_MARKETPLACE、managedEntityType=XPERT、managedEntityId=xpert.id，名字 Xpert access - {label} 截断 100）→ 申请人入 group.members → 该组入 xpert.userGroups → 回写 xpert_access_request.accessGroupId；运行时由 hasRuntimeAccess 与准入查询的 userGroups join 判定
- 背景约束：accessGroupId 外键为 SET NULL，且与 xpert_to_user_group 无反向同步——删组/改名后已审批记录仍显示 approved，而 hasRuntimeAccess 已为 false
- 被否决方案：无（只对比过「独立 ACL 表」方向，未记为已否决）
- 重新评估触发条件：出现「UserGroup 删除/改名导致已审批访问与实际权限不一致」的投诉或审计项
- 关联代码：xpert-marketplace.service.ts（requestAccess/approveRequest/ensureAccessGroup/hasRuntimeAccess）、xpert-access-request.entity.ts、xpert.entity.ts（xpert_to_user_group）
- 证据来源：implementation/03-数据流转.md（§7）+ 子专家④ implementation/02-实现.md（明写）