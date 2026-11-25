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
- 模块根：`src/mcp-server.ts` + `src/lib/mcp-tools/*`（26 文件 / 23 个对外工具）+ `src/lib/{mcp-http,mcp-http-api,mcp-server-factory,mcp-runtime,mcp-stdio-lock,mcp-stop,mcp-token,net-addr,version-guard,daemon-rpc,daemon-dispatch,daemon-bridge,daemon-client,daemon-protocol,lock-holder,scope-write-lock,operation-coordinator}.ts`
- 生成日期：2026-08-06（合并补全 2026-11-25）  git commit：`0f1426b`（资产基线；工作区另含 20 个未提交改动）
- 匹配关键词：MCP, stdio, HTTP单例, daemon, restart, 工具注册, 23工具, tool-access, READ_ONLY_TOOL_NAMES, 锁, 多Token, scope授权, 403越权, 预检, healthz, /mcp, /open/v1, --web, /api, buildKiMcpServer
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 05-接口, 06-测试, 07-运维
- 测试状态：✅ `test/mcp-*.test.ts` 15 个 + daemon 相关 5 个；`npm run test:all` / `test:serial`；e2e ⚠️ 依赖网络

## 向量引擎专家 ✅
- 模块根：`src/zvec-engine/`（16 个 .ts，含 embedding/ filter/ schema/ search/ 四个子目录；独立子项目）
- 生成日期：2026-08-06（合并补全 2026-11-25）  git commit：`0f1426b`（资产基线；工作区另含 20 个未提交改动）
- 匹配关键词：向量引擎, ZvecEngine, hybridSearch, embedding, SiliconFlow, batch-scheduler, RRF, scoring.ts, routeSearch, worker, 19异常类, schema, filter, idle close, 进程锁
- 契约层：C0-使用总览, C1-能力契约, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 04-模型, 05-接口, 06-测试
- 测试状态：✅ `npm run test:zvec-engine`（9 个 node --test）；前置 `npm run build:zvec-engine`；⚠️ embedding 用例需 API Key

## 检索与向量客户端专家 ✅
- 模块根：`src/lib/{vector-client,relation-map}.ts` + `src/{search,store,doc,tag,bulk-store}.ts`
- 生成日期：2026-08-06（更新 2026-08-28）  git commit：`9841255` 基准
- 匹配关键词：混合检索, VectorAdapter, vector-client, memoryId, docId, tag, search, 原文定位, 召回, includeOriginal, TAG_PRIORITY, idle close, 撞锁重试, 独占锁, getRelationMap, 管理面
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 04-模型, 06-测试, 07-运维
- 测试状态：✅ 6 文件 / **83 例全绿**（2026-09-07 实测：vector-cli-functions 32 / scope-doc 14 / relation-map 9 / search-original 6 / vector-idle-race 1 / cli-aliases 21）。原登记的「1 例过期失败（`cli-aliases` 断言已删除的 `ki scan-kb diff`）」已于 2026-09-07 随 CLI 扁平化改造清理，详见 `test/known-failures.md`。⚠️ 早期记录的 79 例含计数漂移（vector-cli-functions 实为 32 非 28、relation-map 实为 9 非 8），与本次改造无关；运行需 `env -u NODE_OPTIONS -u BASH_ENV npx jiti test/<name>.test.ts`，真实召回需 embedding API Key

## 知识索引导入专家 ✅
- 模块根：`src/lib/{import,interrupt,batch-vectorize,path-vectorize,rebuild-vector,ai-results,progress}.ts` + `src/import.ts` + `src/lib/mcp-http-api.ts`（/api/import/* 部分）
- 生成日期：2026-08-06（更新 2026-08-28）  git commit：54b035b 基准
- 匹配关键词：导入, import, 幂等追加, 直导, chunk 切分, group 落点, tags 标签, 中断标记, 导入锁, interrupt, rebuild, 向量重建, HTTP导入, import upload, 单文件导入, memoryIds
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 06-测试
- 测试状态：✅ 可跑（`npx jiti test/<name>.test.ts`；⚠️ import-vector-rebuild 需 embedding 环境未纳入常规回归）

## 关系与索引管理专家 ✅
- 模块根：`src/lib/{scoring,group-create,group-delete,group-resolve,group-cache,wiki-sync,path-search,trash-service,trash-store,relation-edit-draft,relation-edit-live,relation-edit-publish,relation-lifecycle,relation-map}.ts` + `src/{sync-relation,get-module-info,delete-relation,wiki-backfill,group,index-optimize}.ts`（`manage-index.ts` 已删除；`query-group.ts` 仅作内部库）
- 生成日期：2026-08-06（合并补全 2026-11-25）  git commit：`0f1426b`（资产基线；工作区另含 20 个未提交改动）
- 匹配关键词：关系回写, 评分, 冷热分区, ki group, group-create, group-delete, group-cache, wiki写回, wikiSync.sourceDir, 回收站, 关系编辑草稿, 发布租约, 级联删除, memoryIds
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 04-模型, 06-测试, 07-运维
- 测试状态：✅ `test/*group*` 10 / `*relation*` 11 / `*trash*` 7 / `*scoring*` 3；`npm run test:all`；后端 tsc 9 个既有基线错

## 可视化前端专家 ✅
- 模块根：`web/`（独立 Vite 工程 ki-web；`web/src/` 185 个 .ts/.tsx，`web/src/pages/` 18 页，`web/test/` 111 个用例）
- 生成日期：2026-08-28（合并补全 2026-11-25）  git commit：`0f1426b`（资产基线；工作区另含 20 个未提交改动）
- 匹配关键词：可视化前端, ki-web, React, Vite, 18页, AppShell, 三段侧栏, router/routes.tsx, BrowsePage, EventsPage, AtlasPage, DataSourcePage, mcpClient, httpApi, chatContract, scope切换, npm test web
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费
- 实现层：implementation/01-架构, 02-实现, 03-数据流转, 05-接口, 06-测试, 07-运维
- 测试状态：✅ `cd web && npm test`（111 个 node --test）+ `npm run typecheck` / `npm run build`；11 红为既有基线，见 test/known-failures.md

## 本轮补齐（2026-11-25，已完成）

- 资产基线：`0f1426b`（工作区另含 20 个未提交改动；按当前工作区建）
- 双仓可见：`.module-experts/` 与 `CodeWikiHub/kisearch/module-experts/` 同 inode 双路径；新文件在 CodeWikiHub 独立仓库为未跟踪，**未提交**
- Web 归属：新专家一律只收后端 + CLI + MCP 工具 + 测试；`web/src/**` 归「可视化前端专家」
- `.fe-index/` 不存在 → Step 7.5 索引回写跳过
- 进度：批次 0 ✅ / 批次 1 ✅ / 批次 2 ✅ / 批次 3 ✅ / 批次 4 ✅
- 校验：`check_docs.py` 对 220 篇文档做 R1–R7 / CR1–CR10 机械自检，**0 问题**

### 事件治理专家 ✅
- 模块根：src/lib/governance-*.ts + src/lib/events/ + src/event-types.ts + src/lib/mcp-tools/event-*.ts
- 生成日期：2026-11-25  git commit：`0f1426b`（资产基线，含未提交改动）
- 匹配关键词：事件治理, ki_event_edit, 阶段流, AI 分析, 追问, 参考文档, governance, 回收站, REVISION_CONFLICT, FIND_TIMEOUT, ANALYSIS_ASK_CANCELED
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- 实现层：implementation/01-架构, implementation/02-实现, implementation/03-数据流转, implementation/04-模型, implementation/05-接口, implementation/06-测试, implementation/07-运维
- 测试状态：✅ 可跑；⚠️ test/events 不在 npm run test:all 默认扫描范围，必须显式带目录参数；运行 `node scripts/run-tests.mjs test/events --serial`；详见 `test/known-failures.md`
- 子专家：
  - 事件与阶段子专家（事件主体 CRUD、阶段流转、详情聚合与事件类型。），契约层 C0 + C1 + C4，实现层 01/02/06
  - AI 分析链路子专家（事件 AI 分析的启动、取消、工具循环、结论链与数据链路产物。），契约层 C0 + C1 + C4，实现层 01/02/06
  - 参考文档与结论子专家（事件参考文档的增删查、AI 候选定位与追问结论补丁。），契约层 C0 + C1 + C4，实现层 01/02/06

### AI 对话与追问专家 ✅
- 模块根：src/lib/chat/ + src/lib/mcp-tools/ask.ts + test/chat/
- 生成日期：2026-11-25  git commit：`0f1426b`（资产基线，含未提交改动）
- 匹配关键词：AI 对话, SSE, ki_ask, 追问, 停止, 续接, prompt-config, tool-loop, ASK_BUSY, ASK_MAX_ROUNDS
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- 实现层：implementation/01-架构, implementation/02-实现, implementation/03-数据流转, implementation/04-模型, implementation/05-接口, implementation/06-测试, implementation/07-运维
- 测试状态：✅ 可跑（npm run test:all 亦含 test/chat）；运行 `npm run test:chat`；详见 `test/known-failures.md`
- 子专家：
  - 会话与追问子专家（会话 CRUD、SSE 流、归档压缩与追问停止/接续。），契约层 C0 + C1 + C4，实现层 01/02/06
  - 工具循环与技能子专家（对话侧工具集注册、工具循环、内置 skill 与响应投影。），契约层 C0 + C1 + C4，实现层 01/02/06

### 回想内核专家 ✅
- 模块根：src/lib/recall/ + src/lib/mcp-tools/recall.ts + src/lib/mcp-tools/recall-kernel 相关测试
- 生成日期：2026-11-25  git commit：`0f1426b`（资产基线，含未提交改动）
- 匹配关键词：ki_recall, grounded, 多轮回想, 模型自选 scope, 视图展开, rounds, RECALL_SCOPE_REQUIRED, RECALL_TIMEOUT, 候选须真读过
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- 实现层：implementation/01-架构, implementation/02-实现, implementation/03-数据流转, implementation/04-模型, implementation/05-接口, implementation/06-测试, implementation/07-运维
- 测试状态：✅ 可跑（test:all 覆盖根级 test 目录）；运行 `npx jiti test/recall-tool.test.ts`；详见 `test/known-failures.md`

### 数据源同步专家 ✅
- 模块根：src/lib/datasource*.ts + src/datasource.ts
- 生成日期：2026-11-25  git commit：`0f1426b`（资产基线，含未提交改动）
- 匹配关键词：数据源, datasource, git clone, 定时同步, 裁剪候选, mappings, 调度器, DATASOURCE_LIFECYCLE_LOCKED, staleWarning
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- 实现层：implementation/01-架构, implementation/02-实现, implementation/03-数据流转, implementation/04-模型, implementation/05-接口, implementation/06-测试, implementation/07-运维
- 测试状态：✅ 可跑（test 根级被默认扫描）；运行 `npm run test:all`；详见 `test/known-failures.md`

### 开放接口与鉴权专家 ✅
- 模块根：src/lib/open-api/ + src/lib/auth/ + src/lib/web-*.ts + src/user.ts
- 生成日期：2026-11-25  git commit：`0f1426b`（资产基线，含未提交改动）
- 匹配关键词：/open/v1, Bearer, ping, contractVersion, capabilities, OPEN_API_TOKEN_REQUIRED, uploadMaxBytes, ki-client 对接, DAEMON_DRIFT
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- 实现层：implementation/01-架构, implementation/02-实现, implementation/03-数据流转, implementation/04-模型, implementation/05-接口, implementation/06-测试, implementation/07-运维
- 测试状态：✅ 可跑（test 根级）；运行 `npm run test:all`；详见 `test/known-failures.md`

### 知识资产治理专家 ✅
- 模块根：src/lib/trash-*.ts + src/lib/*view*.ts + src/lib/atlas/ + src/{view,atlas}.ts
- 生成日期：2026-11-25  git commit：`0f1426b`（资产基线，含未提交改动）
- 匹配关键词：回收站, trash, restoreFromTrash, 知识视图, views.json, ki_view_list, 图集包, atlas upload, AtlasError, TRASH_CORRUPTED
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- 实现层：implementation/01-架构, implementation/02-实现, implementation/03-数据流转, implementation/04-模型, implementation/05-接口, implementation/06-测试, implementation/07-运维
- 测试状态：✅ 可跑（test 根级）；运行 `npm run test:all`；详见 `test/known-failures.md`

### 远端客户端专家 ✅
- 模块根：ki-client/src/ + ki-client/test/ + ki-client/package.json
- 生成日期：2026-11-25  git commit：`0f1426b`（资产基线，含未提交改动）
- 匹配关键词：ki-client, pingRemote, capabilities, 分片上传, tar.gz, 文件级增量, sha256, KI_CLIENT_CONFIG, CONTRACT_TOO_OLD
- 契约层：C0-使用总览, C1-能力契约, C2-使用流程, C4-数据流向与消费, C5-关键决策
- 实现层：implementation/01-架构, implementation/02-实现, implementation/03-数据流转, implementation/04-模型, implementation/05-接口, implementation/06-测试, implementation/07-运维
- 测试状态：✅ 可跑（npm test = npm run build && node --test test/*.test.mjs；主仓 test:all 不覆盖）；运行 `cd ki-client && npm test`；详见 `test/known-failures.md`

### 批次 5：4 个既有专家合并补全（2026-11-25，✅ 已完成）

- 修复对象：MCP 服务专家 / 关系与索引管理专家 / 可视化前端专家 / 向量引擎专家
- 口径修正：`mcp-tools` 12→26 文件、13→23 个对外工具（只读 11 / 写 12）；`manage-index.ts` 已删、`query-group` CLI 已移除；Web 22 文件 / 5 页→185 个 .ts/.tsx / 18 页且**有 111 个单测**（推翻旧「无单测」）；zvec-engine 14→16 个 .ts、7→9 个测试、异常 19 类（导出 13）
- 落地：4 家的 agent.md / C0 / C1 / C4 / implementation 01–07 / known-failures 均追加带日期的「合并补全」增量章节；可视化前端专家补建 `test/known-failures.md`；PROJECT.md 服务清单与测试可执行性同步刷新
- 资产基线统一刷为 `0f1426b`（工作区另含 20 个未提交改动）；**既有 7 专家的过期清单已清空**
- 对应事件：📮 #95「既有 7 个专家包 4 处模块根过期，需合并补全」→ 已收敛

---
合计 14 个专家（既有 7 + 新增 7）+ 5 个子专家 + PROJECT.md。
