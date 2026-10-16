---
groupPath: 数据流/Agent 执行链专家
relation: xpert_agent
exportedAt: "2026-10-16T03:54:17.313Z"
---
【数据流｜xpert_agent】\n- 实体类型：定义面（`XpertAgent extends TenantOrganizationBaseEntity`）\n- 结构：表 `xpert_agent`；关键列 `key`、`name`、`leaderKey`、`collaboratorNames`(json)、`knowledgebaseIds`(json)、`toolsetIds`(json)；**无自定义索引**（仅靠关系生成 FK；两列 json **不是真外键**，不保证引用完整性）\n- 生产方：`xpert-agent` 域 CRUD（`XpertAgentController extends CrudController`）\n- 主要消费方：xpert-agent、chat-conversation、graphrag（3 个）`[基于引用扫描，未深入验证]`\n- 业务用途：承载 Agent 定义与多智能体成员声明，是图编译的唯一输入\n- 详细流向：见 .module-experts/后端专题/Agent 执行链专家/C4-数据流向与消费.md §1 与其《03 数据流转》图编译链