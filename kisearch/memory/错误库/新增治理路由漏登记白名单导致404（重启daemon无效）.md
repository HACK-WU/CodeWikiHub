---
groupPath: 错误库
relation: 新增治理路由漏登记白名单导致404（重启daemon无效）
exportedAt: "2026-11-19T02:32:30.563Z"
---
新增治理端点只写了 handler、漏登记路由白名单时，请求在路由层就被判「接口不存在」，重启 daemon 完全无效——因为缺的是代码里的登记项，不是进程里的旧代码。典型现象：AI 查找确认后提示「总结未能固定：Not Found: /api/governance/events/<id>/refs/find-summary」。
- 5 秒判据: 看 404 响应体**有没有 code 字段**。`{"error":"Not Found: /api..."}` 无 code ＝ matchRoute 判 unknown 被拦在路由层；同一前缀已登记端点会返回 `EVENT_NOT_FOUND` 等业务码（已进 handler）。对照两个端点即可区分「路由不存在」与「资源不存在」。
- 登记位置: `src/lib/auth/route-permissions.ts` 的 RULES（GET 用 knowledge.read / POST 用 knowledge.write），并同步 `test/governance-routes.test.ts` 的 ROUTES 契约表与条数断言（漏登记不会编译报错，只会静默 404）。
- 验证: 空 body POST → 期望 400 业务码（如 REF_UPLOAD_BAD_REQUEST），而非 404 无 code。
- 易误判: 前端读接口失败常被 catch 静默（如 EventsPage 的 getFindSummary），只有写（固定总结）才显示报错，别据此断定「只有 POST 坏了」。
- 复发记录: refs/upload 先踩过一次（当时补了单独 matchRoute 断言），refs/find-summary 第二次踩。