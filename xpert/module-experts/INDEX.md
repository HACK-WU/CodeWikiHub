# .module-experts · 专家索引

> **查询入口**：`expert-lookup`（本索引 → 专家 `agent.md` → 契约层 `C0/C1` → 实现层）。记忆查 `ki-search`（scope `xpert-memory`），强关联查 `relation-lookup`，代码索引查 `index-lookup`。
> 项目级共享资产（技术栈 / 规范 / 测试口径 / 事故重建记录）见 [PROJECT.md](file://.module-experts/PROJECT.md)。

## 1. 专题 → 专家 → 状态

### 后端专题（**14/14 完成**，共 507 篇 / 74267 行）

| 专家 | 子专家 | 篇数 / 行数 | 覆盖模块 | 专题层 |
|---|---|---|---|---|
| [租户与平台设置专家](file://.module-experts/后端专题/租户与平台设置专家/agent.md) | — | 14 / 2258 | `tenant` `tenant-setting` `feature` `referral` `custom-smtp` `email` `email-template` | [T0](file://.module-experts/后端专题/T0-专题总览.md) |
| [身份与权限专家](file://.module-experts/后端专题/身份与权限专家/agent.md) | 认证与凭据 / 组织与成员 / 角色与权限 | 36 / 4733 | `auth` `user*` `role*` `organization*` `invite` `api-key` `secret-token` `account-binding` `actor-token` | 同上 |
| [模型访问与计费专家](file://.module-experts/后端专题/模型访问与计费专家/agent.md) | 模型访问与执行 / 会员与积分账本 / Copilot | 38 / 5057 | `model-access` `model-execution` `model-gateway` `membership` `copilot*` | 同上 |
| [平台插件与技能专家](file://.module-experts/后端专题/平台插件与技能专家/agent.md) | 插件安装与运行时 / 插件资源与模板安装 / 技能包与技能仓库 | 38 / 4635 | `plugin` `plugin-resource` `skill-package` `skill-repository*` | 同上 |
| [Assistant 定义与运行时专家](file://.module-experts/后端专题/Assistant 定义与运行时专家/agent.md) | 助手定义与发布 / 运行时API与准入 / 工作区与文件授权 / 模板市场绑定与环境 | 46 / 6340 | `xpert` `ai` `xpert-template` `xpert-workspace` `assistant-binding` `xpert-marketplace` `environment` | 同上 |
| [对话与会话专家](file://.module-experts/后端专题/对话与会话专家/agent.md) | 会话消息与分支地图 / 群聊协作 / 投递队列与运行时消息 | 38 / 4848 | `chat-conversation` `chat-message*` `chat` `chat-group` `handoff` | 同上 |
| [知识库专家](file://.module-experts/后端专题/知识库专家/agent.md) | 检索与向量存储 / 文档摄取与流水线 / GraphRAG与知识身份 / 知识Wiki与知识组织 | 46 / 6584 | `knowledgebase` `knowledge-document` `graphrag` `rag-vstore` `rag-web` | 同上 |
| [Agent 执行链专家](file://.module-experts/后端专题/Agent 执行链专家/agent.md) | Agent定义与图编译 / Agent调用与执行账本 / 中间件工作流与协作 | 38 / 5193 | `xpert-agent` `agent-invocation` `xpert-agent-execution` `prompt-workflow` `collaboration` `shared/agent/middleware-runtime` `shared/execution` | 同上 |
| [工具与 MCP 专家](file://.module-experts/后端专题/工具与 MCP 专家/agent.md) | 工具集与工具 / MCP协议与发布 / Agent插件 | 39 / 6570 | `xpert-toolset` `xpert-tool` `mcp` `mcp-publication` `agent-plugin` | 同上 |
| [运行时·沙箱·产物专家](file://.module-experts/后端专题/运行时·沙箱·产物专家/agent.md) | 沙箱执行 / 运行时控制与健康 / 产物与文件访问 | 39 / 5990 | `sandbox` `runtime-control` `artifacts` `workspace-file-access` `health` | 同上 |
| [文件理解与记忆专家](file://.module-experts/后端专题/文件理解与记忆专家/agent.md) | 文件理解 / 文件记忆与存储 | 31 / 4689 | `file-understanding` `file-memory` `storage-file` | 同上 |
| [平台底座与集成专家](file://.module-experts/后端专题/平台底座与集成专家/agent.md) | 集成与扩展点 / 数据源与表格 / 基础字典与客户端壳 | 39 / 6587 | `data-source` `integration` `view-extension` `xpert-table` `desktop-shell` `mobile` `initialization` `ai-model` 字典族 `tags` `export-import` | 同上 |
| [Agent 演进专家](file://.module-experts/后端专题/Agent 演进专家/agent.md) | 变更与生命周期 / 评估与发布 | 31 / 5011 | `agent-evolution` | 同上 |
| [项目与任务协作专家](file://.module-experts/后端专题/项目与任务协作专家/agent.md) | 项目本体与资源 / 任务计划与调度 | 31 / 5285 | `xpert-project` `xpert-task` `business-area` | 同上 |

### 前端专题（7/7 已建）

| 专家 | 状态 | 篇数 / 行数 | 子专家 |
|---|---|---|---|
| Agent 编排 Studio 专家 | ✅ 已建（`02~07`+失败清单为原产出提取；`01`+契约层为重建） | 14 / 2606 | 0 |
| 对话前端专家 | ✅ 已建（2026-10-16 重建，含 2 子专家） | 30 / 5088 | 2 |
| Xpert 工作台专家 | ✅ 已建（2026-10-16 重建，含 2 子专家） | 30 / 4577 | 2 |
| 认证与引导专家 | ✅ 已建（2026-10-16 重建） | 14 / 2795 | 0 |
| 项目协作专家 | ✅ 已建（2026-10-16 重建） | 5 / 588 | 0 |
| Agent 演进专家 | ✅ 已建（2026-10-16 重建） | 5 / 648 | 0 |
| 探索广场专家 | ✅ 已建（2026-10-16 重建） | 5 / 608 | 0 |

> 前端专题层与建站顺序见 [前端专题 T0](file://.module-experts/前端专题/T0-专题总览.md) 与 [topic](file://.module-experts/前端专题/topic.md)。

## 2. 专题层文件

| 专题 | 名片 | 总览 | 边界 |
|---|---|---|---|
| 后端专题 | [topic.md](file://.module-experts/后端专题/topic.md) | [T0-专题总览.md](file://.module-experts/后端专题/T0-专题总览.md) · [创建计划.md](file://.module-experts/后端专题/创建计划.md) | **14 个专家中已完成 8 个**；批次 5 六专家划分已定案（见创建计划 §5.3，≈853 非 spec） |
| 前端专题 | [topic.md](file://.module-experts/前端专题/topic.md) | [T0-专题总览.md](file://.module-experts/前端专题/T0-专题总览.md) | 7 个专家；排除 `@shared`/`@core`/`features/setting` |

## 3. 记忆与索引

- ki 记忆：scope `xpert-memory`（**325 条**；五类 Group = 专题记忆 / 接口信息 / 数据流 / 决策记录 / 关联关系，各按专家名建子组）+ `当前状态` / `项目架构` / `项目踩坑点` / `背景与目标`
- 前端 6 个新专家的条目已于 2026-10-16 补写：**27 条**（接口 6 / 数据流 9 / 决策 12），分布在 `接口信息|数据流|决策记录/{对话域, Xpert 工作台, 认证与引导, 项目协作, Agent 演进, 探索广场}`
- 镜像：`CodeWikiHub/xpert/memory/`（由 ki 写入自动同步；重导 `node /root/knowledge-indexer/bin/ki.mjs export xpert-memory --output /root/xpert/CodeWikiHub/xpert/memory --yes`）
- 后端索引：`.fe-index/xpert/`（含模块级专家指认 + 业务域分组）；前端索引 `xpert-cloud` **待建**
