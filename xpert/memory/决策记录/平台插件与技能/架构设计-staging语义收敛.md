---
groupPath: 决策记录/平台插件与技能
relation: 架构设计-staging语义收敛
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜启动恢复与运行期安装收敛同一 staging 路径语义】
- 分类：架构设计
- 动机：避坑：code 源插件在重启后沿用磁盘旧拷贝 → 工作区源已变而进程加载过期代码、失败现场无法复现；且 `packageDir` 是瞬态字段，落库前被剔除，DB 里根本不存在可用目录
- 决策：启动恢复与运行期安装必须收敛到**同一套**目录结构与 manifest 语义；带持久化 workspacePath 的本地 code 插件加载前必须**重新 stage**（stageWorkspacePlugin / stagePackageDirectoryPlugin：realpath + 白名单 + 包名匹配 + 必须含 dist/ 或编译入口）；非 code 插件统一走组织插件 store 与 manifest
- 背景约束：packageDir 只允许服务端归档上传路径传入（allowPackageDir），HTTP 不可携带；重启时不得依赖磁盘残留
- 被否决方案：让重启沿用上一次 staging 的磁盘结果（注释明确否定：so restarts do not depend on stale copies）
- 重新评估触发条件：引入内容寻址的插件缓存（指纹可验证）从而允许跨重启复用；或插件运行时不落在文件系统上
- 关联代码：plugin.helper.ts、organization-plugin.store.ts、source-config.ts、plugin-instance.loader.ts @ packages/server/src/plugin/
- 证据来源：plugin.helper.ts:1-6 Invariants（Startup restore and runtime install must converge on the same staged plugin path semantics.）