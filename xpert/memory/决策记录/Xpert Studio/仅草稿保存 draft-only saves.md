---
groupPath: 决策记录/Xpert Studio
relation: 仅草稿保存 draft-only saves
exportedAt: "2026-10-16T03:52:14.870Z"
---
**决策：编排与助手设置统一「仅草稿保存」（draft-only saves）**

- 分类：数据一致性
- 决策：编辑先入草稿（Xpert.draft），1s 去抖自动 POST /api/xpert/:id/draft；只有发布（publish）才把草稿固化为版本；resume() 可丢弃草稿回到已发布版本
- 背景约束：发布后的版本是运行时对象（对话/调用按版本运行），编辑态与运行态必须隔离；半成品编辑不应污染已发布版本
- 被否决方案：无可追溯记录
- 重新评估触发条件：需要实时协同编辑或逐次编辑生成审计版本的产品需求出现时
- 证据来源：commit 9c210afd9（feat(studio): unify assistant settings with draft-only saves）；代码佐证 XpertStudioApiService 的 saveDraft/resume/unsaved/pristineDraft
返回