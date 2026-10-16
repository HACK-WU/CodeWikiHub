---
groupPath: 决策记录/运行时沙箱产物专家
relation: 安全合规-Public面与隔离边界
exportedAt: "2026-10-16T08:16:32.867Z"
---
【决策记录｜安全合规-`@Public()` 面与隔离边界（跳过 JWT ≠ 放行）】
- 分类：安全合规
- 动机（避坑）：**现象** 同源 iframe 无法携带 `Authorization` 头、沙箱内页面也需要直取卷资源；**后果** 若把「跳过 JWT」当成「公开」，私有数据会随公共前缀一起暴露；若一律要求 JWT，预览与卷投递功能做不出来
- 决策：本域只开两类 `@Public()` —— ① **3 条 proxy 通配路由**（`@All` 匹配 `proxy`/`proxy/`/`proxy/*path`）一律挂 `SandboxPreviewAuthGuard`：cookie `xpert_sandbox_preview` 的 JWT（`aud='sandbox-preview'`、`sub='sandbox-preview-session'`）票面 `conversationId`/`serviceId` **必须与路径参数一致**，不符/过期/签名错 → 401 且**无 302 回退**；② `GET volume/*path` 匿名，但配四类路径黑名单（`project/`、`user/*/xpert/*`、`xpert/*/user/*`、`runtime-jobs` 及符号链接落点）＋ `assertPublicWorkspacePath` ＋ `openFileSnapshot` 后按实际卷内相对路径复检 `rejectProtectedPaths`
- 背景约束：`@Public()` **只跳过全局 `AuthGuard` ＋ `PluginScopeGuard`，不提供任何租户隔离** —— volume 的 `tenant` 仅用于定位卷根（可来自 query 参数）；该面**无审计、无速率限制**，安全性完全依赖「公共前缀不含敏感数据」这一部署假设；预览签名密钥取 `JWT_SECRET`，缺失时建会话直接 **500（不降级放行）**；proxy 转发前清洗请求头并丢弃 `set-cookie`/`service-worker-allowed`，平台凭证与预览 cookie 不得进入 provider 后端；**不支持 WebSocket 升级**（Vite HMR 源码中显式标注为后续工作）
- 被否决方案：无（未见对「给 volume 通配补身份校验」或「以 Authorization 取代 cookie」的显式否决记录）
- 重评条件：公共卷前缀出现业务数据、需要按租户限流/审计、或需要支持 WebSocket 升级（Vite HMR）时
- 关联代码：file://packages/server-ai/src/sandbox/sandbox.controller.ts、file://packages/server-ai/src/sandbox/sandbox-preview-auth.guard.ts、file://packages/server-ai/src/sandbox/sandbox-preview-session.service.ts、file://packages/server/src/bootstrap/index.ts
- 证据来源：C0-使用总览.md「已知问题与常见坑」1~2、C5-关键决策.md §D3；implementation/{01-架构.md 关键不变量 4~5, 02-实现.md volume 通配路由/预览 proxy 两节, 05-接口.md 十三}
- 详细资产：.module-experts/后端专题/运行时·沙箱·产物专家/ C5-关键决策.md §D3 · implementation/05-接口.md §十三