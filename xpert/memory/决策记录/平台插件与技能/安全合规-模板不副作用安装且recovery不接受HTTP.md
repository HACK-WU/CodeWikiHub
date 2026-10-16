---
groupPath: 决策记录/平台插件与技能
relation: 安全合规-模板不副作用安装且recovery不接受HTTP
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜模板不得把插件导出的全部资源当副作用安装；recovery 标识不接受 HTTP 输入】
- 分类：安全合规
- 动机：避坑：把 dependencies.plugins 当成「安装该插件全部组件」的清单，或允许前端传入 resumeXpertId/onImported → 装一个模板就顺带装上整包 Skill/MCP/Hook/App（越权且不可回滚），或把服务端恢复流程的检查点暴露给任意调用方（可指向他人 Xpert、可绕过串行化重试）
- 决策：dependencies.plugins **只声明运行时前置条件**（函数体根本不读取它）；portable 资源（skills/mcpServers/hooks/apps）必须来自模板上**显式保存的选择器**，跨插件依赖按 pluginName 分组解析以保持 portable namespace 与安装根正确；PluginTemplateInstallCommand.bootstrap（resumeXpertId + onImported）明确为「服务端拥有的恢复流程」，**绝不接受 HTTP body**，唯一带 bootstrap 的调用点是服务端 bootstrap 服务
- 背景约束：模板与资源的选择边界只由注释约束，契约层没有类型级强制；组件安装会改写当前 draft 的 Agent middleware 绑定，因此补跑路径必须在执行时才加载导入图
- 被否决方案：①「装模板 = 安装插件全部导出」②「recovery 标识/回调由 HTTP 传入」——两者均被源码注释直接否定
- 重新评估触发条件：需支持「模板显式声明整包安装」时必须新增独立选项并同时设计回滚；或需把恢复流程开放给外部编排器（须先定义签名与幂等令牌）
- 关联代码：template-runtime-dependencies.ts、install-template.command.ts、install-template.handler.ts、sync-template-dependencies.handler.ts @ packages/server-ai/src/plugin-resource/commands/
- 证据来源：template-runtime-dependencies.ts:59-61 与 install-template.command.ts:22-26 注释（明写，含 never accepted from an HTTP body）