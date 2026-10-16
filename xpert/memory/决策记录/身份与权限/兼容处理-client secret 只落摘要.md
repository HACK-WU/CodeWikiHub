---
groupPath: 决策记录/身份与权限
relation: 兼容处理-client secret 只落摘要
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜client secret 只落摘要但兼容历史明文】
- 分类：兼容处理
- 动机：避坑：已签发的 secret_token 是明文存储，若立即改为只存摘要 → 存量密钥同时失效、已上线的嵌入/集成调用集体中断；故用「新写入摘要化 + 旧明文在既有有效期内继续可兑付」过渡
- 决策：新写入一律为单向摘要（sha256:<hex>），读取侧同时接受摘要与历史明文，并显式拒绝把库内摘要当 bearer 提交
- 背景约束：迁移需零停机；摘要与明文同列共存，无法用列约束区分形态
- 被否决方案：无（未见「一次性切换为只存摘要」的评估记载）
- 重新评估触发条件：存量非摘要行占比归零（token NOT LIKE 'sha256:%' 统计为 0），或发生一次明文导出导致的密钥泄露事件
- 关联代码：SecretTokenService.createHashed / findBySecret @ packages/server/src/secret-token/secret-token.service.ts
- 证据来源：secret-token.service.ts docstring（明写单向表示、签发端点唯一返回原文、兼容期读取）；secret-token.model.ts（明写 never send a digest as a bearer secret）