---
groupPath: 决策记录/平台插件与技能
relation: 安全合规-package scope是授权边界runtime policy独立
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜package scope 是授权边界，runtime policy 是独立能力】
- 分类：安全合规
- 动机：避坑：用「包声明的 level」推断「能否热装」→ 把授权结论当能力结论：tenant 级包被误判为必须重启（能力误判）或反之被热装（进程内状态与授权面不一致）
- 决策：PluginLevel（包归属与可见性）与 runtimePolicy（install/update/uninstall 各自 hot 或 restart）是两个**正交**维度：requiresPluginRestart 在插件声明了 policy 时**只用 policy**，未声明时才回退到历史契约（system/tenant 需重启、organization 热加载）；读取侧由 effectiveLoadedPlugins 按「当前组织 → 本租户全局 → 系统全局」收敛可见插件集合
- 背景约束：runtimePolicy 必须三键齐全且取值合法，否则 parsePluginRuntimePolicy 抛 PluginRuntimePolicyInvalid；运行期 policy 变化抛 PluginRuntimePolicyChanged
- 被否决方案：无（注释只声明二者独立）
- 重新评估触发条件：需要为已安装插件做在线策略迁移（restart → hot）时的迁移语义定义；或出现同一包在不同 scope 需不同 policy 的需求
- 关联代码：plugin-runtime-policy.ts、plugin-uninstall.service.ts @ packages/server/src/plugin/；effective-loaded-plugins.ts @ packages/server-ai/src/plugin-resource/
- 证据来源：plugin-runtime-policy.ts:4 首行注释（Package scope is an authorization boundary; runtime policy is a separate, explicit capability.）