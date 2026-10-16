---
groupPath: 决策记录/模型访问与计费
relation: 安全合规-网关独立且客户端header不选租户组织
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜网关独立于执行，客户端 scope header 不选择租户/组织】
- 分类：安全合规
- 动机：避坑：让客户端通过请求头/请求体声明租户、组织或付款人 → 可跨租户冒用额度、凭据作用域与执行作用域错位、事后无法判定付款主体
- 决策：/api/openai/v1（API key）与 /api/model-execution/*（execution credential）是两套独立入口与两套凭据；API key scope 只用于解析访问，执行发生在 publication scope；grant 的 scope 只来自平台身份与自有会话；assistant-default 只存在于执行侧；平台侧查询/会话/管理端点显式拒绝 API principal 并要求 tenant/organization/user 三重相等
- 背景约束：两套入口均为 @Public()（无 @Permissions），安全性完全依赖各自 authenticate 与 scope 校验；错误体与模型别名也随之分化
- 被否决方案：无（文档强调不得复用登录态或 ChatKit client secret）
- 重新评估触发条件：出现「合并两套 OpenAI 兼容入口」的提案（当前列为技术债，合并需同时改两套错误映射与 scope 解析）；任何新增 @Public() 入口时
- 关联代码：openai.controller.ts（首行 Invariants）、execution-openai.controller.ts、execution-query.controller.ts @ packages/server-ai/src/
- 证据来源：model-gateway/openai.controller.ts 注释（client scope headers do not select the gateway's tenant or organization）+ docs/model-execution.md（API and Identity Boundaries）