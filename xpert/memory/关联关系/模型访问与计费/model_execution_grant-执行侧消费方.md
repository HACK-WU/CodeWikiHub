---
groupPath: 关联关系/模型访问与计费
relation: model_execution_grant-执行侧消费方
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] execution grant 契约 与 执行侧消费方（CLI / 沙箱 / Agent 执行链）
强度：必改——改 grant 的凭据形态（credentialHash 只存摘要）、models/limits/context 快照结构、或 `/api/model-execution/openai/v1` 的请求/响应与错误体 → 所有执行侧调用方与 Bridge 实现必改；改 grant 服务内部实现 → 调用方不用管
原因：grant 是「一次执行」的授权载体，快照字段直接被准入与计量消费，且凭据形态决定了调用方可否缓存/复用

grant 端：
- ModelExecutionGrant @ packages/server-ai/src/model-execution/execution.entity.ts
- ModelExecutionGrantService.issue / authenticate / revalidate @ packages/server-ai/src/model-execution/execution-grant.service.ts
- ModelExecutionOpenAIController（/api/model-execution/openai/v1）@ packages/server-ai/src/model-execution/

执行侧消费方：
- ModelExecutionAdmissionService.begin/dispatch @ packages/server-ai/src/model-execution/execution-admission.service.ts
- xpert-agent-execution / agent-invocation（执行与调用链）@ packages/server-ai/src/
- 沙箱与 CLI（shell 执行表 + grant 凭据）@ packages/server-ai/src/sandbox/ 与 packages/server-ai/src/model-execution/shell*.ts