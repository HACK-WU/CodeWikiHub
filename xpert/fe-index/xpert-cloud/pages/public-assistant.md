# 公共助手页与 ChatKit（/x/**、/x-chatkit/**） · 页面 → 接口（xpert-cloud）

| 路由 | 页面文件 | 用到的接口 | 直接依赖（深度1） | 证据 |
|---|---|---|---|---|
| `/x-chatkit/h5/:platform/:name/c/:id、x-chatkit/h5/:platform/:name 等 4 条` | `apps/cloud/src/app/xpert/chatkit/public-chatkit.component.ts` | POST ⟨base⟩/v1/chatkit/sessions | — | `apps/cloud/src/app/features/assistant/assistant-chatkit.runtime.ts:541` 🟡 |
| `/x/agents` | `apps/cloud/src/app/features/xpert/studio/studio.component.ts` | POST ⟨base⟩/v1/chatkit/sessions | — | `apps/cloud/src/app/features/assistant/assistant-chatkit.runtime.ts:541` 🔵 |
| `/x/monitor` | `apps/cloud/src/app/features/xpert/xpert/monitor/monitor.component.ts` | GET ⟨xpert⟩/⟨xpert⟩/statistics/usage-overview | — | `apps/cloud/src/app/features/xpert/xpert/monitor/statistics/statistics.component.ts:53` 🟡 |
