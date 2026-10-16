---
groupPath: 数据流/Agent 执行链专家
relation: agent_runtime_binding
exportedAt: "2026-10-16T03:54:17.313Z"
---
【数据流｜agent_runtime_binding】\n- 实体类型：provider 绑定与授权（`AgentRuntimeBindingEntity`）\n- 结构：表 `agent_runtime_binding`；关键列 `title`、`workspaceIds`(jsonb，无 FK)、`target`(jsonb = `{bindingId, provider, reference, revision(config 固定), configuration}`)、`enabled`(default true)；无自定义索引\n- 生产方：`AgentRuntimeBindingsController`（admin-only，`requireResourceAdmin()`；**拒绝 `provider ∈ {xpert, xpert-task}`**）\n- 主要消费方：agent-invocation、xpert-project、xpert-project-access、handoff-queue、model-execution（5 个，归纳为「调用/授权/传输/模型出口」）`[基于引用扫描，未深入验证]`\n- 业务用途：把插件 runtime provider 授权给本组织 workspace，并为每次调用提供**不可变 `target.revision`**（建时 `randomUUID()`）；换配置/版本必须新建绑定\n- 详细流向：见 .module-experts/后端专题/Agent 执行链专家/C4-数据流向与消费.md §2 与其《03 数据流转》provider pin 快照