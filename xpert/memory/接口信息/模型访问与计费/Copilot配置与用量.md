---
groupPath: 接口信息/模型访问与计费
relation: Copilot配置与用量
exportedAt: "2026-10-16T03:52:14.870Z"
---
【接口信息｜Copilot 配置与用量】
- 子功能：角色化模型入口、provider 凭据与模型发现、用量聚合与统计、checkpoint 与向量库
- 所属模块：模型访问与计费
- 接口列表：
  - /api/copilot/*：findAllCopilots、availables(-/:role)、model-select-options、create/updateCopilot、enable|disable/:role、primary/verify、providers/models/membership-models/management-models、generate-prompt、8 个 statistics/*（读多无权限点；provider 新增/更新与角色启停需 COPILOT_EDIT）
  - /api/copilot-provider/*（provider CRUD 走 CopilotProviderUpsertCommand、getProviderModels、provider-model 增删改、model-parameter-rules；ModelDiscoveryController 同前缀）；**自定义模型 CRUD 与 :id 读仅登录态**
  - /api/copilot-model/*、/api/copilot-user/*（getAll/getSummary/summary/details/summary/renew/:id/renew）、/api/copilot-organization/*、/api/copilot-store/*
  - /api/copilot-usage/*（类级 MODEL_USAGE_MONITOR）：ledger*（accounts/models/providers/totals/page）、summary、totals、overview、details、quota/adjust、quota/renew、repair-organization-usage
  - /api/copilot-checkpoint/*（getTuple/create/createWrites，先过 AssertChatConversationAccessQuery）、/api/copilot-knowledge/*、/api/ai-model/*（provider/model 元数据，上游）
  - 运行时唯一入口：GetChatModelQuery / GetEmbeddingsQuery / GetRerankQuery（创建 LangChain 客户端）
- 已知坑：getSettings/getOrCreateSettings **GET 有副作用**（惰性建行）；copilot_store_vectors 的 @Entity 被注释（表未注册）；checkpoint 清理 @Cron('0 0 3 * * *')