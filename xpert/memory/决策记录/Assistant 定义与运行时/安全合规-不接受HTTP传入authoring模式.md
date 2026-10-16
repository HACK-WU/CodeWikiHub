---
groupPath: 决策记录/Assistant 定义与运行时
relation: 安全合规-不接受HTTP传入authoring模式
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜绝不接受 HTTP 传入 authoring 模式】
- 分类：安全合规
- 动机：避坑——文件入口若可由请求数据选择，任何客户端都能把「运行时被拒」改写成「走 Studio 权限」，等价于提权
- 决策：entry（runtime / authoring）只能由服务端代码在 AssistantFilesService.forRuntime()/forAuthoring() 里硬编码选定；ResolveAssistantFileAccessCommand 注释把约束写进源码：entry is chosen by trusted server code, never request data
- 背景约束：assistant-file-access.service.ts 文件头不变量之一：authoring access is explicit and never a fallback after runtime denial；AGENTS.md 追加 never accept an authoring mode from HTTP data or fall back to authoring after runtime denial
- 被否决方案：把 entry 做成查询参数或请求体字段；或运行时分支 403 后静默改走 authoring（均被源码注释与 AGENTS.md 明文禁止）
- 重新评估触发条件：无（不可协商的安全不变量）
- 关联代码：resolve-assistant-file-access.command.ts、assistant-file-access.service.ts
- 证据来源：AGENTS.md + 上述两文件的源码不变量注释（明写）