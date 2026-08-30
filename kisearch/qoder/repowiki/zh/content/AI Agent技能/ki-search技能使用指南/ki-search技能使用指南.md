# ki-search技能使用指南

<cite>
**本文引用的文件**
- [skills/ki-search/SKILL.md](file://skills/ki-search/SKILL.md)
- [src/lib/mcp-tools/search.ts](file://src/lib/mcp-tools/search.ts)
- [src/lib/mcp-tools/query-group.ts](file://src/lib/mcp-tools/query-group.ts)
- [src/lib/mcp-tools/get-module-info.ts](file://src/lib/mcp-tools/get-module-info.ts)
- [src/search.ts](file://src/search.ts)
- [src/mcp-server.ts](file://src/mcp-server.ts)
- [src/lib/scope.ts](file://src/lib/scope.ts)
- [memories/ki-search-usage.md](file://memories/ki-search-usage.md)
- [docs/error-handling.md](file://docs/error-handling.md)
- [README.md](file://README.md)
- [src/lib/mcp-tools/util.ts](file://src/lib/mcp-tools/util.ts)
- [test/search-multiscope.test.ts](file://test/search-multiscope.test.ts)
- [docs/cli.md](file://docs/cli.md)
</cite>

## 更新摘要
**变更内容**
- 新增多scope聚合检索功能说明：支持逗号分隔的多scope查询，单次embedding优化
- 更新了executeSearch函数的多scope处理逻辑和性能优化细节
- 补充了parseScopes函数的参数解析规则和错误处理机制
- 增强了结果排序和来源标注的说明
- 完善了strict模式下的scope白名单校验逻辑
- 更新了实际使用案例和多scope查询示例

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考量](#性能考量)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录：MCP工具调用示例与参数说明](#附录mcp工具调用示例与参数说明)

## 简介
本指南面向需要基于代码知识库进行"理解级"查询的AI Agent或使用者，重点说明ki-search技能的"四步走查询策略"：语义检索优先、索引原位兜底、宏观兜底、回问用户。**新增多scope支持**：现在支持通过逗号分隔指定多个scope进行聚合检索，实现跨项目的统一知识查询，同时保持单次embedding的性能优化。

## 项目结构
ki-search技能由"行为规则文档 + MCP工具注册 + 搜索实现 + 范围与权限控制"共同构成：
- 行为规则：skills/ki-search/SKILL.md 定义四步走流程、scope约定、标签与阈值等约束。
- MCP工具：src/lib/mcp-tools/* 将能力暴露给上层Agent（ki_search、ki_query_group、ki_get_module_info等）。
- 搜索实现：src/search.ts 提供executeSearch，串联向量检索、原文召回、多标签去重等逻辑。
- 服务入口：src/mcp-server.ts 统一注册工具、启动stdio/HTTP模式、鉴权与预检。
- 范围与路径：src/lib/scope.ts 负责scope校验与KB路径构造，新增parseScopes函数支持多scope解析。
- 记忆提示：memories/ki-search-usage.md 强调"遇事不决先查"。

```mermaid
graph TB
Agent["AI Agent"] --> MCP["ki mcp 服务<br/>stdio/HTTP"]
MCP --> Tools["MCP工具注册层<br/>search/query-group/get-module-info"]
Tools --> SearchCore["executeSearch<br/>src/search.ts"]
SearchCore --> Vector["向量引擎/内存库"]
SearchCore --> KB["本地KB<br/>group-index / relations-cache"]
MCP --> Scope["scope校验与路径<br/>src/lib/scope.ts<br/>parseScopes多scope解析"]
MCP --> Timeout["超时保护<br/>withTimeout"]
```

**图表来源**
- [src/mcp-server.ts:54-70](file://src/mcp-server.ts#L54-L70)
- [src/lib/mcp-tools/search.ts:6-49](file://src/lib/mcp-tools/search.ts#L6-L49)
- [src/search.ts:70-199](file://src/search.ts#L70-L199)
- [src/lib/scope.ts:45-69](file://src/lib/scope.ts#L45-L69)
- [src/lib/mcp-tools/util.ts:24-42](file://src/lib/mcp-tools/util.ts#L24-L42)

**章节来源**
- [skills/ki-search/SKILL.md:1-198](file://skills/ki-search/SKILL.md#L1-L198)
- [src/mcp-server.ts:54-70](file://src/mcp-server.ts#L54-L70)
- [src/search.ts:70-199](file://src/search.ts#L70-L199)
- [src/lib/scope.ts:45-69](file://src/lib/scope.ts#L45-L69)

## 核心组件
- ki_search：语义检索知识库内容，支持scope、query、limit、threshold、tags、include_original等参数；**新增多scope支持**：可传入逗号分隔的多个scope，如"scope-a,scope-b"，结果统一排序并标注来源。返回results[]含memoryId、content、score，并可附带group/relation及原文。
- ki_query_group：查询Group树与Relations，支持hot/warm/cold/emerging/full模式与向量语义兜底，用于步骤②的Group/Relation定位。
- ki_get_module_info：读取指定Group下Relation的本地KB Markdown内容，用于索引原位兜底。
- executeSearch：核心搜索函数，负责向量检索、多标签优先级合并、按memoryId反查relations-cache、可选原文召回与多chunk去重。**新增多scope处理逻辑**：支持parseScopes解析逗号分隔的scope列表，执行单次查询+scope OR过滤，embedding仅做1次。
- parseScopes：**新增函数**：解析逗号分隔的多scope参数，支持去空格、去重、保序，逐个字符集校验（安全类快速失败）。
- scope校验：确保scope仅包含字母、数字、连字符、下划线，防止路径穿越与跨scope污染。
- withTimeout：为所有MCP工具调用提供超时保护，避免长驻进程阻塞。

**章节来源**
- [src/lib/mcp-tools/search.ts:6-49](file://src/lib/mcp-tools/search.ts#L6-L49)
- [src/lib/mcp-tools/query-group.ts:6-53](file://src/lib/mcp-tools/query-group.ts#L6-L53)
- [src/lib/mcp-tools/get-module-info.ts:6-37](file://src/lib/mcp-tools/get-module-info.ts#L6-L37)
- [src/search.ts:70-199](file://src/search.ts#L70-L199)
- [src/lib/scope.ts:45-69](file://src/lib/scope.ts#L45-L69)
- [src/lib/mcp-tools/util.ts:24-42](file://src/lib/mcp-tools/util.ts#L24-L42)

## 架构总览
ki-search在Agent侧以"行为规则驱动"，通过MCP工具调用完成检索与定位，底层由向量引擎与本地KB协同支撑。**新增多scope聚合检索架构**：支持单次查询跨多个scope进行语义检索，结果统一排序并按来源标注。

```mermaid
sequenceDiagram
participant A as "AI Agent"
participant M as "ki mcp 服务"
participant T as "MCP工具层"
participant S as "executeSearch"
participant V as "向量引擎"
participant K as "本地KB"
A->>M : 调用 ki_search(scope : "scope-a,scope-b", query, limit=4, threshold=0.02, tags="ki-search")
M->>T : 注册并转发请求 (withTimeout保护)
T->>S : 执行语义检索
S->>V : 单次向量检索(带scopes数组过滤)
V-->>S : results[] (memoryId, content, score, scope)
S->>K : 按memoryId反查(group/relation)
K-->>S : 命中则附加group/relation
S-->>T : 返回结果(多scope结果统一排序，每条命中标注来源scope)
T-->>M : 封装响应
M-->>A : JSON结果
```

**图表来源**
- [src/mcp-server.ts:54-70](file://src/mcp-server.ts#L54-L70)
- [src/lib/mcp-tools/search.ts:6-49](file://src/lib/mcp-tools/search.ts#L6-L49)
- [src/search.ts:98-127](file://src/search.ts#L98-L127)
- [src/search.ts:139-191](file://src/search.ts#L139-L191)
- [src/lib/mcp-tools/util.ts:24-42](file://src/lib/mcp-tools/util.ts#L24-L42)

## 详细组件分析

### 四步走查询策略（理解级）
- 步骤① 语义检索优先：调用ki_search(scope: "${scope}-memory", limit: 4, threshold: 0.02, tags: "ki-search")，从向量空间召回最相关片段，基于content提炼回答。**新增多scope支持**：可传入逗号分隔的多个scope，如"${scope-a}-memory,${scope-b}-memory"，实现跨项目语义检索。
- 步骤② 索引原位兜底：若未命中，先用ki_query_group(scope: "${scope}-memory", mode: "full")拉取全景，再按Group/Relation定位，调用ki_get_module_info获取原文，Agent需提炼后回答。
- 步骤③ 宏观兜底：仍无命中时，调用ki_search(scope: "${scope}", limit: 4, threshold: 0.02, tags: "ki-search")作为宏观兜底。**新增多scope支持**：可传入逗号分隔的多个scope进行宏观检索。
- 步骤④ 回问用户：全部未命中时，向用户询问模块名称/文件路径/功能描述，不自动写回KB。

```mermaid
flowchart TD
Start(["开始"]) --> Type{"是否理解级查询?"}
Type -- 否 --> EndNoKB["不走KB，直接定位级处理"]
Type -- 是 --> Step1["① ki_search('${scope}-memory', limit=4, threshold=0.02, tags='ki-search')<br/>支持多scope: 'scope-a-memory,scope-b-memory'"]
Step1 --> Hit1{"有命中?"}
Hit1 -- 是 --> Answer1["基于content提炼回答"]
Hit1 -- 否 --> Step2["② 拉取全景 ki_query_group('${scope}-memory', mode='full')<br/>按Group/Relation定位 → ki_get_module_info"]
Step2 --> Hit2{"有命中?"}
Hit2 -- 是 --> Answer2["提炼原文后回答"]
Hit2 -- 否 --> Step3["③ ki_search('${scope}', limit=4, threshold=0.02, tags='ki-search')<br/>支持多scope: 'scope-a,scope-b'"]
Step3 --> Hit3{"有命中?"}
Hit3 -- 是 --> Answer3["基于content提炼回答"]
Hit3 -- 否 --> Ask["④ 回问用户"]
Answer1 --> End(["结束"])
Answer2 --> End
Answer3 --> End
Ask --> End
```

**图表来源**
- [skills/ki-search/SKILL.md:13-113](file://skills/ki-search/SKILL.md#L13-L113)
- [src/lib/mcp-tools/query-group.ts:6-53](file://src/lib/mcp-tools/query-group.ts#L6-L53)
- [src/lib/mcp-tools/get-module-info.ts:6-37](file://src/lib/mcp-tools/get-module-info.ts#L6-L37)
- [src/lib/mcp-tools/search.ts:6-49](file://src/lib/mcp-tools/search.ts#L6-L49)

**章节来源**
- [skills/ki-search/SKILL.md:13-113](file://skills/ki-search/SKILL.md#L13-L113)

### 代码相关性判定与查询类型
- 触发条件：涉及文件路径、函数/类名、bug排查、重构、架构、代码审查、测试、性能优化等。
- 不触发：闲聊、产品方向讨论、会议纪要、纯文档写作。
- 查询类型：
  - 定位级：目标明确，找位置，使用SearchSymbol/grep/Read，不走KB。
  - 理解级：需要架构/流程/设计意图，走KB四步走。
- 判断口诀：能用一个grep回答→定位级；需要读完文件才能回答→理解级。

**章节来源**
- [skills/ki-search/SKILL.md:45-59](file://skills/ki-search/SKILL.md#L45-L59)

### 语义检索实现要点（executeSearch）
- 向量可用性检测：不可用时返回降级错误信息。
- 标签优先级：默认全搜时按ki-search > ki-relation > ki-path顺序合并，避免低质量结果干扰。
- 原文召回：显式开启时按memoryId反查local KB，失败则降级为向量content并给出提示。
- 多标签去重：同一(group, relation)多tag写入导致重复命中时，保留score最高的一条。
- 同文件多chunk去重：同一文件多个chunk命中时，仅首次返回original，后续标记deduplicated避免重复。
- **多scope支持**：支持逗号分隔的多scope聚合检索，结果统一排序并标注来源。通过parseScopes函数解析scope参数，执行单次查询+scope OR过滤，embedding仅做1次，显著提升性能。

**章节来源**
- [src/search.ts:70-199](file://src/search.ts#L70-L199)

### 多scope解析与处理（parseScopes）
- **新增parseScopes函数**：专门处理逗号分隔的多scope参数
- 语义：去空格、去重、保序；空段忽略；逐个字符集校验（安全类快速失败）
- 不做模式策略（注册/授权）校验——由调用方按 strict/授权上下文处理
- 支持场景：`parseScopes('team-a, team-b ,team-a')` → `['team-a', 'team-b']`
- 错误处理：纯分隔符输入（如`, ,`）快速失败，非法字符（路径遍历）快速失败

**章节来源**
- [src/lib/scope.ts:45-69](file://src/lib/scope.ts#L45-L69)

### 范围隔离与路径安全（scope）
- 合法字符：仅允许字母、数字、连字符(-)、下划线(_)，拒绝路径穿越。
- 路径构造：getKbDir、getLocalKbDir等函数保证KB目录安全访问。
- 列表与迁移：支持列出已初始化scope、迁移旧格式group-index.json。
- strict模式：在strict模式下必须显式注册scope，否则拒绝访问。**多scope支持**：在strict模式下，未注册的scope会被跳过并在skipped中提示，不影响其他有效scope的检索。

**章节来源**
- [src/lib/scope.ts:30-77](file://src/lib/scope.ts#L30-L77)
- [src/lib/scope.ts:174-198](file://src/lib/scope.ts#L174-L198)
- [src/lib/scope.ts:117-146](file://src/lib/scope.ts#L117-L146)

## 依赖关系分析
- MCP服务注册：buildKiMcpServer集中注册所有工具，包括search、query-group、get-module-info等。
- 工具到实现：每个工具文件通过withTimeout包装对应execute*函数，统一超时与错误处理。
- 搜索链路：ki_search → executeSearch → vectorSearch → relations-cache → local KB。**新增多scope链路**：executeSearch → parseScopes → vectorSearch(scopes数组)。
- 范围控制：所有工具均依赖scope校验，确保跨scope数据隔离。
- 超时保护：所有工具调用都通过withTimeout包装，防止长驻进程阻塞。

```mermaid
graph LR
Server["mcp-server.ts<br/>buildKiMcpServer"] --> ToolSearch["lib/mcp-tools/search.ts"]
Server --> ToolQuery["lib/mcp-tools/query-group.ts"]
Server --> ToolModule["lib/mcp-tools/get-module-info.ts"]
ToolSearch --> CoreSearch["search.ts<br/>executeSearch"]
ToolQuery --> QueryImpl["query-group.ts"]
ToolModule --> ModuleImpl["get-module-info.ts"]
CoreSearch --> Scope["lib/scope.ts<br/>parseScopes多scope解析"]
ToolSearch --> Timeout["util.ts<br/>withTimeout"]
ToolQuery --> Timeout
ToolModule --> Timeout
```

**图表来源**
- [src/mcp-server.ts:54-70](file://src/mcp-server.ts#L54-L70)
- [src/lib/mcp-tools/search.ts:6-49](file://src/lib/mcp-tools/search.ts#L6-L49)
- [src/lib/mcp-tools/query-group.ts:6-53](file://src/lib/mcp-tools/query-group.ts#L6-L53)
- [src/lib/mcp-tools/get-module-info.ts:6-37](file://src/lib/mcp-tools/get-module-info.ts#L6-L37)
- [src/search.ts:70-199](file://src/search.ts#L70-L199)
- [src/lib/scope.ts:45-69](file://src/lib/scope.ts#L45-L69)
- [src/lib/mcp-tools/util.ts:24-42](file://src/lib/mcp-tools/util.ts#L24-L42)

**章节来源**
- [src/mcp-server.ts:54-70](file://src/mcp-server.ts#L54-L70)

## 性能考量
- 固定limit=4与threshold=0.02：减少无关结果，提高命中率与可读性。
- 多标签优先级合并：避免低质量tag污染结果，提升整体相关性。
- 原文召回按需启用：默认关闭，仅在需要时打开，降低IO开销。
- 批量写入建议分批≤5条：组织成本低、单批失败重试代价小，服务端总耗时几乎不变。
- 向量引擎空闲释放锁：常驻模式下空闲超时自动释放LOCK，允许多实例错开共享。
- 超时保护：READ操作30秒、WRITE操作60秒、BULK操作300秒，避免长驻进程阻塞。
- **多scope性能优化**：单次查询+scope OR过滤，embedding仅做1次，显著提升多scope检索效率。通过传递scopes数组而非多次单独查询，减少embedding计算开销。

**章节来源**
- [skills/ki-search/SKILL.md:74-160](file://skills/ki-search/SKILL.md#L74-L160)
- [src/search.ts:94-199](file://src/search.ts#L94-L199)
- [src/mcp-server.ts:680-685](file://src/mcp-server.ts#L680-L685)
- [src/lib/mcp-tools/util.ts:35-42](file://src/lib/mcp-tools/util.ts#L35-L42)

## 故障排查指南
- 向量检索暂不可用：检查向量服务可用性与配置，必要时降级或修复embedding Key。
- scope非法：仅允许字母、数字、连字符、下划线；避免路径穿越字符。
- Group/Relation不存在：使用ki_query_group --mode full确认实际路径与名称。
- 原文不可用：本地KB缺失relation或读取异常，可尝试sync-relation或rebuild-vector。
- 常见恢复口诀：参数先补齐、路径先确认、scope先注册、索引先生成、再做下一步。
- 超时问题：检查向量服务状态，适当调整超时时间或重试机制。
- **多scope问题**：确认所有scope已在配置中注册（strict模式），检查parseScopes解析结果，查看skipped字段了解被跳过的scope及原因。
- **多scope解析错误**：检查逗号分隔格式，确保没有非法字符，注意空段会被自动忽略。

**章节来源**
- [src/search.ts:84-92](file://src/search.ts#L84-L92)
- [src/lib/scope.ts:30-43](file://src/lib/scope.ts#L30-L43)
- [docs/error-handling.md:13-60](file://docs/error-handling.md#L13-L60)
- [docs/error-handling.md:130-146](file://docs/error-handling.md#L130-L146)
- [src/lib/mcp-tools/util.ts:12-18](file://src/lib/mcp-tools/util.ts#L12-L18)

## 结论
ki-search技能通过"语义检索优先、索引原位兜底、宏观兜底、回问用户"的四步走策略，在保证检索精度的同时兼顾鲁棒性。**新增的多scope支持功能**进一步提升了系统的灵活性和实用性，允许用户一次性跨多个项目进行搜索，同时保持了优秀的性能表现。配合严格的scope约定、标签与阈值约束、以及白名单/黑名单写入规则，能够在复杂工程环境中稳定地为Agent提供高质量的知识检索与定位能力。新增的超时保护机制和多scope支持进一步提升了系统的稳定性和扩展性。

## 附录：MCP工具调用示例与参数说明

### ki_search
- 用途：语义检索知识库内容，优先在${scope}-memory中检索。**新增多scope支持**。
- 关键参数：
  - scope：项目隔离标识（省略默认default；strict模式必填且须白名单内）**支持逗号分隔多scope，如"scope-a,scope-b"**
  - query：自然语言查询文本
  - limit：返回条数上限（推荐4）
  - threshold：相似度阈值（推荐0.02）
  - tags：过滤标签（推荐ki-search；也可组合ki-relation/ki-path）
  - include_original：是否返回local KB文件级原文（默认false）
- 返回：ok/scope/results[]，每项含memoryId、content、score，可能附加group/relation/original等字段。**多scope时额外返回scopes[]和skipped[]字段**。
- 超时：WRITE操作60秒超时保护。

**章节来源**
- [src/lib/mcp-tools/search.ts:6-49](file://src/lib/mcp-tools/search.ts#L6-L49)
- [src/search.ts:70-199](file://src/search.ts#L70-L199)
- [src/lib/mcp-tools/util.ts:35-42](file://src/lib/mcp-tools/util.ts#L35-L42)

### ki_query_group
- 用途：查询Group树与Relations，支持多种模式与向量语义兜底，用于步骤②的定位。
- 关键参数：
  - scope：项目隔离标识
  - groups/group：逗号分隔的Group路径（支持模糊匹配）
  - hot_count：热门展示个数
  - depth：索引层级深度
  - mode：展示分区（hot/warm/cold/emerging/full，支持逗号分隔）
  - auto_fallback：是否启用语义兜底（默认true）
- 超时：READ操作30秒超时保护。

**章节来源**
- [src/lib/mcp-tools/query-group.ts:6-53](file://src/lib/mcp-tools/query-group.ts#L6-L53)
- [src/lib/mcp-tools/util.ts:35-42](file://src/lib/mcp-tools/util.ts#L35-L42)

### ki_get_module_info
- 用途：读取指定Group下某个Relation的本地KB Markdown内容，用于索引原位兜底。
- 关键参数：
  - scope：项目隔离标识
  - group：Group路径（支持向量语义兜底）
  - relation：Relation名称（精确匹配）
- 超时：READ操作30秒超时保护。

**章节来源**
- [src/lib/mcp-tools/get-module-info.ts:6-37](file://src/lib/mcp-tools/get-module-info.ts#L6-L37)
- [src/lib/mcp-tools/util.ts:35-42](file://src/lib/mcp-tools/util.ts#L35-L42)

### 写入KB与授权机制
- 默认只读：正常检索不写入；发现知识库与实际代码不符需修正时，必须先说明差异并获得用户明确授权。
- 白名单（8类）：模块职责、API接口、架构约束、项目通用约定、bug模式与排查、重构策略、依赖版本约束、测试策略。
- 黑名单（6类）：用户喜好、项目记忆/进度、用户个人信息、一次性诊断、临时偏好、会话短期上下文。
- 写入方式：
  - 1~2条：ki_sync_relation逐条写
  - ≥3条：ki_bulk_sync_relation批量写（一次embed+一次向量写入），推荐每批≤5条
- 批量格式：items数组，每项含group、relation、module_info、tags（可选）、vector（可选，默认true）
- 返回值：results[].vectorStored表示该条向量是否写入；顶层vectorStored在所有条目全部成功时为true；hints可选，含Group路径解析提示

**章节来源**
- [skills/ki-search/SKILL.md:116-166](file://skills/ki-search/SKILL.md#L116-L166)

### 实际使用案例
- 了解模块职责/架构决策：先ki_query_group(scope: "${scope}-memory", mode: "full")拉取全景，再按Group/Relation定位，必要时ki_get_module_info获取原文。
- 查API接口/设计约束：优先ki_search(scope: "${scope}-memory", query: "接口名/约束关键词", limit: 4, threshold: 0.02, tags: "ki-search")。
- 排查bug：结合ki_search与ki_get_module_info，定位相关模块与实现细节。
- 代码审查：理解级问题一律走KB四步走；定位级问题直接用SearchSymbol/grep/Read。
- **多scope检索**：支持逗号分隔多个scope，如"scope-a,scope-b"，结果统一排序并标注来源。例如：`ki_search(scope: "monitor,alerting", query: "告警配置", limit: 4, threshold: 0.02, tags: "ki-search")`
- **严格模式多scope**：在strict模式下，未注册的scope会被跳过并在skipped字段中提示原因，不影响其他有效scope的检索。

**章节来源**
- [memories/ki-search-usage.md:1-12](file://memories/ki-search-usage.md#L1-L12)
- [skills/ki-search/SKILL.md:62-113](file://skills/ki-search/SKILL.md#L62-L113)
- [README.md:276-294](file://README.md#L276-L294)
- [test/search-multiscope.test.ts:80-137](file://test/search-multiscope.test.ts#L80-L137)
- [docs/cli.md:490-495](file://docs/cli.md#L490-L495)