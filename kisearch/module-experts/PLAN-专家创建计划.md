# kisearch 模块专家团创建计划

> 状态：✅ 已确认（2026-08-06）
> 创建方式：expert-team skill 流程
> 模块根：`/root/knowledge-indexer/src`

## 1. 背景与目标

为提高开发效率，对 kisearch（knowledge-indexer）核心代码建立持久、可复用的"业务专家"资产包。每个专家含契约层（黑盒使用文档）+ 实现层（白盒导航文档），供后续设计 / 排查 / 重构 / 直接使用时取用，避免每次重摸代码。

## 2. 项目概览与架构分层

**项目**：kisearch（`ki` CLI 工具）— AI 知识索引整理工具，对外部知识进行结构化索引和导航。

- CLI 命令：22 个（scan-kb / manage-index / query-group / sync-relation / search / store / mcp / backup / restore / export 等）
- 技术栈：TypeScript（ESM）+ Node.js ≥18 + commander + jiti + @zvec/zvec + @modelcontextprotocol/sdk + zod
- 入口：`bin/ki.mjs` → `npx jiti src/<command>.ts`
- 测试：`test/*.test.ts`（jiti 跑）+ `test/*.test.mjs`（node --test）+ `test/e2e/`（网络）

### 架构分层

```
bin/ki.mjs（命令分发）
   │
   ├─ src/<command>.ts（CLI 命令入口，多为 lib 薄壳）
   │        │
   │        ├─ src/lib/         核心逻辑层（29 文件）
   │        │     ├─ import 链路（import/incremental/batch-vectorize/rebuild-vector...）
   │        │     ├─ 存储与基础（store/wal/scope/config/constants...）
   │        │     ├─ 检索客户端（vector-client/relation-map）
   │        │     ├─ 关系与索引（scoring/group-resolve/wiki-sync/path-search）
   │        │     └─ MCP 服务（mcp-tools/* 11 个 + mcp-http/lock/token/health-check）
   │        │
   │        └─ src/zvec-engine/  向量引擎基座（独立子项目，14 文件）
   │              └─ tsconfig.src.json 独立构建 → dist/zvec-engine（worker 代理架构）
   │
   └─ 数据落地
        ├─ kb/{scope}/（JSON：group-index / relations-cache / local KB，WAL 原子写）
        └─ 向量库 config.vectorDir（zvec 集合，doc id = sha256(text+scope) 截 32）
```

### 强依赖关系

| 依赖 | 判定 | 处理 |
|------|------|------|
| `lib/vector-client` → `dist/zvec-engine` | 独立子项目（独立构建 + 完整 API + 独立测试 7 个） | 独立专家（专家 1） |
| 各模块 → `lib/{store,wal,scope,config}` | 领域专属共享数据层（KB JSON 格式 / WAL 并发协议 / scope 隔离语义），非通用工具库 | 独立专家（专家 2） |

## 3. 专家划分（已确认：6 个独立专家）

> 75 源文件 < 500，不建专题；各专家内功能内聚，不拆子专家。

| # | 专家名 | 模块范围 | 文件数 | 核心职责 |
|---|--------|----------|--------|----------|
| 1 | **向量引擎专家** | `src/zvec-engine/` | 14 | ZvecEngine 基座：worker 代理、embedding（SiliconFlow）、schema/filter/搜索路由、RRF 混合检索、11 种类型化异常 |
| 2 | **存储与配置基础专家** | `lib/{store,wal,scope,config,constants,cli-args,backup,markdown-gen,diff,preflight}.ts` + `src/{backup,restore,export,config,scope,doctor,setup,migrate-keywords}.ts` | 20 | JSON 落盘（WAL 原子写+跨进程锁）、scope 隔离、配置加载、备份/还原/导出、诊断 |
| 3 | **知识索引导入专家** | `lib/{import,incremental,batch-vectorize,path-vectorize,rebuild-vector,ai-results,progress}.ts` + `src/{scan-kb,import-kb}.ts` | 9 | 5-Phase 导入链路、增量 diff、批量向量化、断点续跑、向量重建 |
| 4 | **检索与向量客户端专家** | `lib/{vector-client,relation-map}.ts` + `src/{search,store,doc,tag,bulk-store}.ts` | 7 | Vector Adapter（async 封装引擎）、hybridSearch、tag 优先级、isFullText、原文定位、doc/tag 管理 |
| 5 | **关系与索引管理专家** | `lib/{scoring,group-resolve,wiki-sync,path-search}.ts` + `src/{sync-relation,query-group,manage-index,get-module-info,delete-relation}.ts` | 9 | 关系回写、评分冷热分区、Group 树 CRUD、Wiki 写回、模块信息查询 |
| 6 | **MCP 服务专家** | `src/mcp-server.ts` + `lib/mcp-tools/*`(11) + `lib/{mcp-http,mcp-stdio-lock,mcp-stop,mcp-token,health-check,version-guard}.ts` | 16 | MCP Server（stdio/HTTP 单例）、10 工具注册、锁管理、Token 鉴权、预检 |

## 4. 各专家详情

### 专家 1：向量引擎专家

- **模块根**：`src/zvec-engine/`（14 文件，独立子项目）
- **核心职责**：ZvecEngine 门面（create/open 静态工厂、write/search/lifecycle）；worker proxy 架构（engine → proxy → worker，多进程隔离）；embedding 提供商抽象（EmbeddingProvider + SiliconFlowProvider）；schema 构建/校验（白名单 scalarFields）；Filter 编译器；语义/FTS/Hybrid 搜索路由 + 结果归一化（RRF）；11 种类型化异常。
- **实现层切面**：01-架构（必出）、02-实现（必出）、04-模型（zvec schema/FtsConfig/PersistedSchema）、05-接口（公开导出契约）、06-测试（必出）
- **契约层**：C0、C1、C4
- **测试状态**：`test/zvec-engine*.test.mjs`（7 个）可独立跑：`npm run test:zvec-engine`（node --test，✅ 可跑）；embedding 相关 ⚠️ 依赖外部 API Key
- **匹配关键词**：向量引擎, ZvecEngine, hybridSearch, embedding, SiliconFlow, RRF, worker, 向量库, schema, filter

### 专家 2：存储与配置基础专家

- **模块根**：`src/lib/{store,wal,scope,config,constants,cli-args,backup,markdown-gen,diff,preflight}.ts` + `src/{backup,restore,export,config,scope,doctor,setup,migrate-keywords}.ts`
- **核心职责**：JSON 存储层（readJson + version 检查 / writeJson + WAL 原子写）；WAL 写入机制（跨进程文件锁、.tmp 原子 rename、陈旧锁抢占）；scope 校验与路径构造（拒绝路径遍历）；配置加载（YAML/JSON + 环境变量 + scope 解析）；备份快照（tar.gz）/ 还原（snapshot / ai-results 重放）/ 导出 Markdown；doctor 诊断；setup 下载 Skills；migrate-keywords 数据迁移。
- **实现层切面**：01-架构（必出）、02-实现（必出）、03-数据流转（备份/还原/导出链路）、04-模型（JSON schema + WAL 锁协议）、06-测试（必出）、07-运维（配置/备份策略）
- **契约层**：C0、C1、C2（备份→还原→导出流程）、C4
- **测试状态**：`test/{config-doctor,restore,scope-mode,scope-source,migrate-keywords,lib}.test.*` 等（jiti 跑，✅ 可跑）
- **匹配关键词**：WAL, JSON存储, scope, 配置, 原子写入, 备份还原, 数据落盘, 跨进程锁, doctor, export

### 专家 3：知识索引导入专家

- **模块根**：`src/lib/{import,incremental,batch-vectorize,path-vectorize,rebuild-vector,ai-results,progress}.ts` + `src/{scan-kb,import-kb}.ts`
- **核心职责**：统一导入核心实现（5-Phase：validateAndNormalize → bulkVectorize → ensureGroups → writeRelations → recordSource）；增量模式（diff 关联 memoryId）；批量向量化（断点续跑 + 进度文件）；路径向量化（group/relation/path 内容构建 + isFullText 契约）；向量重建（collectContentEntries）；AI 结果规范化（ai-results.json 校验补全）；进度日志。
- **实现层切面**：01-架构（必出）、02-实现（必出）、03-数据流转（5-Phase 生命周期）、06-测试（必出）
- **契约层**：C0、C1、C2（导入完整流程）、C4
- **测试状态**：`test/{scan-kb,import-kb,rebuild-vector,ai-results}.test.*`（jiti 跑，✅ 可跑）
- **匹配关键词**：扫描, 导入, ai-results, Group树, 增量, 向量重建, 断点续跑, 5Phase, import, incremental

### 专家 4：检索与向量客户端专家

- **模块根**：`src/lib/{vector-client,relation-map}.ts` + `src/{search,store,doc,tag,bulk-store}.ts`
- **核心职责**：Vector Adapter（封装 ZvecEngine 的 async 检索/存储接口，单一 collection + scope/tag 标量字段隔离）；hybridSearch 检索（queryText 语义 + fts 关键词 + RRF）；tag 优先级排序（ki-search > ki-relation > ki-path）；isFullText 判定契约（`[摘要]` 前缀）；原文定位（memoryId 反查 relation-map，TTL + mtime/size 双失效）；doc list/delete、tag list、store/bulk-store 写入。
- **实现层切面**：01-架构（必出）、02-实现（必出）、03-数据流转（检索召回 → 反查原文链路）、06-测试（必出）
- **契约层**：C0、C1、C2（检索使用流程）、C4
- **测试状态**：`test/{vector-cli-functions,relation-map,search-is-full-text,scope-doc,error-handling}.test.*`（jiti 跑，✅ 可跑）；⚠️ 检索真实召回需 embedding API Key
- **匹配关键词**：混合检索, VectorAdapter, memoryId, isFullText, tag, search, 原文定位, 召回

### 专家 5：关系与索引管理专家

- **模块根**：`src/lib/{scoring,group-resolve,wiki-sync,path-search}.ts` + `src/{sync-relation,query-group,manage-index,get-module-info,delete-relation}.ts`
- **核心职责**：关系回写（relation + module-info + keywords 校验后写 cache + local KB + 向量 + Wiki）；评分引擎（使用密度评分、防刷分、冷热分区、边界衰减）；Group 树 CRUD（create/delete + 向量级联）；模块信息查询（读 local KB 原文）；关系删除（cache + KB + wiki + 向量四层联动）；Wiki 写回（source 块 / config 兜底）；路径搜索。
- **实现层切面**：01-架构（必出）、02-实现（必出）、03-数据流转（关系四层联动）、04-模型（Relation/GroupData/RelationsCache）、06-测试（必出）
- **契约层**：C0、C1、C2（关系写入→查询→删除流程）、C4
- **测试状态**：`test/{sync-relation,query-group,manage-index,get-module-info}.test.ts`（jiti 跑，✅ 可跑）
- **匹配关键词**：关系回写, 评分, 冷热分区, manage-index, wiki写回, hot_relations, Group树, 查询

### 专家 6：MCP 服务专家

- **模块根**：`src/mcp-server.ts` + `src/lib/mcp-tools/*`(11 文件) + `src/lib/{mcp-http,mcp-stdio-lock,mcp-stop,mcp-token,health-check,version-guard}.ts`
- **核心职责**：MCP Server 搭建（buildKiMcpServer 注册 10 工具）；stdio 模式（默认，单客户端单进程 + stdio lock）；HTTP 共享单例模式（回环免鉴权 / 非回环 Bearer Token + allowed-hosts 白名单）；托管 Token（generate/show/reset，0600 文件）；启动守卫（幂等复用 / 多实例冲突检测 / 预检失败拒绝启动）；健康检查（doctor 复用）；版本自检 banner。
- **实现层切面**：01-架构（必出）、02-实现（必出）、03-数据流转（MCP 请求生命周期）、05-接口（10 工具契约）、06-测试（必出）、07-运维（HTTP 部署/Token 轮换/锁清理）
- **契约层**：C0、C1、C2（stdio/HTTP 接入流程 + token 管理）、C4
- **测试状态**：`test/{mcp-http,mcp-stdio-lock,mcp-stop,mcp-token}.test.ts`（jiti 跑，✅ 可跑）；e2e 需网络 ⚠️
- **匹配关键词**：MCP, stdio, HTTP单例, 工具注册, lock, token, 预检, health-check, 鉴权

## 5. 实施步骤

1. **创建 PROJECT.md**（项目级共享资产：项目信息/技术栈/架构形态/核心服务清单（含测试可执行性）/配套服务关系/架构图/数据流向图/运行环境）
2. **分批创建专家**（每批 2 个，批内并行 task-dispatch）：
   - 批次 1：专家 2（存储与配置基础）+ 专家 6（MCP 服务）— 基础层与服务层先行
   - 批次 2：专家 1（向量引擎）+ 专家 4（检索与向量客户端）— 向量层
   - 批次 3：专家 3（知识索引导入）+ 专家 5（关系与索引管理）— 业务链路
3. **每批完成后**：更新 `.module-experts/INDEX.md`（增量合并，标注批次进度）
4. **全部完成后**：INDEX.md 更新为正常格式；调用 expert-audit 做使用者视角验收（P0 问题当场处理）

## 6. 文档结构约定

```
.module-experts/
├── INDEX.md                        # 专家包索引（匹配关键词，expert-lookup 用）
├── PROJECT.md                      # 项目全局共享资产
├── PLAN-专家创建计划.md            # 本文件（创建计划）
└── {专家名}/
    ├── agent.md                    # 专家名片
    ├── C0-使用总览.md              # 必出：能力清单 + 边界 + 已知坑
    ├── C1-能力契约.md              # 必出：公开类/方法契约 + 真实代码示例
    ├── C2-使用流程.md              # 按需：业务目标调用路径
    ├── C4-数据流向与消费.md        # 有数据落地时必出
    ├── implementation/             # 实现层（白盒导航）
    │   ├── 01-架构.md              # 必出
    │   ├── 02-实现.md              # 必出
    │   ├── 03-数据流转.md          # 按需
    │   ├── 04-模型.md              # 按需
    │   ├── 05-接口.md              # 按需
    │   ├── 06-测试.md              # 必出（含可执行性）
    │   └── 07-运维.md              # 按需
    └── test/
        └── known-failures.md       # 已知失败测试清单（有测试时必出）
```

## 7. 变更记录

- 2026-08-06：用户确认 6 专家划分 + 3 批创建方案，计划文档化落盘
- 2026-08-28：本文件转为**历史快照**（不再随代码更新，以 INDEX.md 与各专家 agent.md 为准）。基线后已下线的模块：`lib/diff.ts`、`lib/incremental.ts`、`src/setup.ts`、`src/migrate-keywords.ts`、`backupAiResults` / `--from-results`；新增 `lib/config-schema.ts`
