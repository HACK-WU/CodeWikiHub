# 模块专家包索引
> 由 expert-team 自动维护

## 项目全局（共享资产）
- 资产：PROJECT.md（项目信息/技术栈/核心服务清单/配套服务关系/架构图/数据流向图/运行环境）
- 说明：所有专家共享的项目全局上下文，创建/使用专家前建议先读
- 维护：expert-team 首次创建/发现全局信息时更新；expert-lookup 使用中发现变化时受限更新

## 存储与配置基础专家 ✅
- 模块根：`src/lib/{store,wal,scope,config,config-schema,constants,cli-args,backup,markdown-gen,preflight,health-check}.ts` + `src/{backup,restore,export,config,scope,doctor}.ts`
- 生成日期：2026-08-06（合并补全 2026-08-28）  git commit：9841255（资产基线）
- 匹配关键词：WAL, JSON存储, scope, 配置, 配置字段校验, CONFIG_FIELD_INVALID, config-schema, 原子写入, 备份还原, 数据落盘, 跨进程锁, doctor, export, 默认目录, ~/.ki, restore, 快照, scope清理
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 04-模型, 06-测试, 07-运维
- 测试状态：✅ 可跑（`npx jiti test/<name>.test.ts`；⚠️ embedding 与文件系统场景依赖外部环境；⚠️ 本机需 `env -u NODE_OPTIONS -u BASH_ENV`）

## MCP 服务专家 ✅
- 模块根：`src/mcp-server.ts` + `src/lib/mcp-tools/*`（12 文件）+ `src/lib/{mcp-http,mcp-http-api,mcp-stdio-lock,mcp-stop,mcp-token,net-addr,version-guard}.ts`（`health-check.ts` 实现归存储与配置基础专家，本专家为消费方）
- 生成日期：2026-08-06（合并补全 2026-08-28）  git commit：9841255（资产基线）
- 匹配关键词：MCP, stdio, HTTP单例, daemon, restart, 工具注册, ki_bulk_sync_relation, lock, 多Token, scope授权, RBAC, SCOPE_LESS_TOOLS, 403越权, 预检, healthz, 鉴权, --web, /api
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 05-接口, 06-测试, 07-运维
- 测试状态：✅ 可跑（`npx jiti test/<name>.test.ts`；⚠️ stop 依赖 /proc、daemon 依赖进程 spawn、e2e 依赖网络；⚠️ 本机需 `env -u NODE_OPTIONS -u BASH_ENV`）

## 向量引擎专家 ✅
- 模块根：`src/zvec-engine/`（14 文件，独立子项目）
- 生成日期：2026-08-06（更新 2026-08-28）  git commit：8adc487
- 匹配关键词：向量引擎, ZvecEngine, hybridSearch, embedding, SiliconFlow, RRF, worker, 向量库, schema, filter, WorkerUnavailableError, idle close, 在途打断, 异常体系
- 契约层：C0-使用总览, C1-能力契约, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 04-模型, 05-接口, 06-测试
- 测试状态：✅ 可跑（`npm run test:zvec-engine`；⚠️ embedding 用例需 API Key；前置需 `npm run build:zvec-engine`）

## 检索与向量客户端专家 ✅
- 模块根：`src/lib/{vector-client,relation-map}.ts` + `src/{search,store,doc,tag,bulk-store}.ts`
- 生成日期：2026-08-06（更新 2026-08-28）  git commit：`9841255` 基准
- 匹配关键词：混合检索, VectorAdapter, vector-client, memoryId, docId, tag, search, 原文定位, 召回, includeOriginal, TAG_PRIORITY, idle close, 撞锁重试, 独占锁, getRelationMap, 管理面
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 04-模型, 06-测试, 07-运维
- 测试状态：⚠️ 6 文件 / 79 例，实测 78 通过 + 1 过期失败（`cli-aliases` 断言已删除的 `ki scan-kb diff`，与本模块无关，详见 `test/known-failures.md`）；运行需 `env -u NODE_OPTIONS -u BASH_ENV npx jiti test/<name>.test.ts`，真实召回需 embedding API Key

## 知识索引导入专家 ✅
- 模块根：`src/lib/{import,interrupt,batch-vectorize,path-vectorize,rebuild-vector,ai-results,progress}.ts` + `src/scan-kb.ts` + `src/lib/mcp-http-api.ts`（/api/import/* 部分）
- 生成日期：2026-08-06（更新 2026-08-28）  git commit：54b035b 基准
- 匹配关键词：导入, import, 幂等追加, 直导, chunk 切分, group 落点, tags 标签, 中断标记, 导入锁, interrupt, rebuild, 向量重建, HTTP导入, import upload, 单文件导入, memoryIds
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 06-测试
- 测试状态：✅ 可跑（`npx jiti test/<name>.test.ts`；⚠️ import-vector-rebuild 需 embedding 环境未纳入常规回归）

## 关系与索引管理专家 ✅
- 模块根：`src/lib/{scoring,group-resolve,wiki-sync,path-search}.ts` + `src/{sync-relation,query-group,manage-index,get-module-info,delete-relation,wiki-backfill}.ts`
- 生成日期：2026-08-06（更新 2026-08-28）  git commit：`9841255` 基准
- 匹配关键词：关系回写, 批量回写, 评分, 冷热分区, emerging, manage-index, wiki写回, wiki-backfill, autoBackfill, hot_relations, Group树, 查询, 目录级删除, 级联删除, 回收站, .ki/trash, 非向量化, 自定义tags, memoryIds, 路径解析, 语义兜底
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 04-模型, 06-测试, 07-运维
- 测试状态：✅ 7 文件 / 77 例全绿（`npx jiti test/<name>.test.ts`，需 `env -u NODE_OPTIONS -u BASH_ENV`；⚠️ 向量兜底场景需 embedding API Key）

## 可视化前端专家 ✅
- 模块根：`web/`（独立 Vite 工程 ki-web，22 源文件，React 18 + TS + Vite 5）
- 生成日期：2026-08-28  git commit：8adc487
- 匹配关键词：可视化前端, ki-web, React, Vite, Dashboard, SearchPage, ImportPage, WritePage, BrowsePage, mcpClient, httpApi, react-query, scope切换, MarkdownPreview, mermaid, AppShell, HealthBanner, GroupPathSelect
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 05-接口, 06-测试, 07-运维
- 测试状态：⚠️ web 内无单元测试（`npm run typecheck` + 后端 mcp-http-api/mcp-http 测试间接覆盖 + 手动回归清单）

---
全部 7 个专家 + PROJECT.md 已完成创建。待办：expert-audit 使用者视角验收（P0 问题当场处理）。
