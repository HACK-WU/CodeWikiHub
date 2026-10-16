---
groupPath: 决策记录/模型访问与计费
relation: 架构设计-grant只服务一次执行且快照只会更严
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜execution grant 只服务一次执行，快照只会更严】
- 分类：架构设计
- 动机：避坑：把 grant 当通用模型 key 使用 → 凭据长期有效、作用域漂移，且无法审计「这次调用代表谁」
- 决策：model execution grant 绑定一次执行：issue 时快照 models/limits/context 并只存 credentialHash（明文仅返回一次）；authenticate → validate → revalidate 逐层收紧；客户端不能用请求体/请求头换付款人或放宽作用域
- 背景约束：CLI 与沙箱需要无登录态的短时授权；宿主与具体执行实现解耦（授权层只经能力接口校验，不依赖 Computer/Docker 实现）
- 被否决方案：无（文档未记录候选；明确的是 legacy 字段 accepted then discarded）
- 重新评估触发条件：出现「一个凭据服务多次独立执行」的产品需求时
- 关联代码：ModelExecutionGrantService.issue/authenticate/revalidate @ packages/server-ai/src/model-execution/execution-grant.service.ts
- 证据来源：docs/model-execution.md（明写：grant 只服务一次执行、不是通用模型 key；凭据只存 hash）