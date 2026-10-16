---
groupPath: 关联关系/前端专题
relation: auth-准入边界-全站
exportedAt: "2026-10-16T03:52:14.870Z"
---
**强关联：认证域定义全站准入边界（authGuard 矩阵 + 令牌供给）**

- 方向：认证域 → 全站（单向供给）
- 内容：
  - authGuard 挂载于全站路由（features/features-routing 等与 app-routing 部分路由）
  - 令牌经 @core/auth 存储 + http-context 注入全站请求；ChatWebsocketServer.refreshToken 复用 AuthStrategy.refreshToken（对话域 socket 重连同源）
  - onboard.guard 链 @xpert-ai/store（organization-status）
- 免登录例外（显式白名单）：/x-chatkit/*、/x/*、sign-in/success、plugins/marketplace
- 改动风险：改令牌结构/刷新语义 = 全站回归（含对话 socket）；改守卫矩阵需逐路由核对；新增公共页必须显式评估
- 证据：app-routing.module.ts、features-routing.module.ts、@core/auth、@core/guards、chat.service.socket.ts