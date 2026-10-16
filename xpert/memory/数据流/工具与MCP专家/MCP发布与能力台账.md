---
groupPath: 数据流/工具与MCP专家
relation: MCP发布与能力台账
exportedAt: "2026-10-16T07:28:46.847Z"
---
【数据流｜MCP发布与能力台账】
- 实体类型：表（`mcp_publication` 聚合 + 能力双表 + 组织准入表，均属 mcp-publication 八表）
- 结构 `mcp_publication`：`name`(191)、`slug`(191)、`status ∈ draft|active|disabled`（默认 draft）、`authMethods`(json，create 落 `['api_key']`)、`runtime`(json)、`protocolVersion`(默认 `MCP_PROTOCOL_VERSION`)、`reviewStatus ∈ current|required`/`reviewReason`/`reviewedAt`/`reviewedById`；**唯一 `IDX_mcp_publication_slug(slug)`** + `IDX_mcp_publication_scope_status(tenantId,organizationId,status)`
- 结构 `mcp_publication_capability`（对外承诺）：`publicationId`(`CASCADE`)、`toolsetId`(uuid，**故意无外键**)、`capabilityType`(40)、`capabilityKey`(191)、`publicName`(191)、`enabled`、`policy`(json)、**`descriptorHash`(char 64)**、**`descriptorSnapshot`(json 非空，二者成对固化不可只写哈希)**；**唯一 `(publicationId,publicName)`** + **唯一 `(publicationId,toolsetId,capabilityType,capabilityKey)`**
- 结构 `mcp_capability_catalog`（当前声明）：`toolsetId`(uuid，注释 `intentionally not a FK`)、`capabilityType`、`capabilityKey`、`descriptorHash`(char 64)、`descriptor`(json)、`enabled`；**唯一 `(toolsetId,capabilityType,capabilityKey)`**
- 结构 `mcp_publication_access`：`publicationId`(`CASCADE`, not null)、`enabled`、`enabledById`、`disabledAt`/`disabledById`；**唯一 `(publicationId,organizationId)`**；**无 HTTP 端点**，仅服务层调用
- 生产方：`McpPublicationService.create/replaceCapabilities/replaceCapabilitiesWithCatalog`（事务内 delete + save 整体替换）、`McpCapabilityCatalogService.replacePreparedToolsetCapabilities`（≤1000 条、`hashMcpCapabilityDescriptor`）、`PluginResourceInstallerService.replaceToolsetCapabilities`、`McpPublicationAccessService.enable/disable`（唯一冲突竞态重取）
- 主要消费方：`McpPublicationRuntimeService.resolveRuntimeCapabilities`（逐条比 `descriptorHash`，不同则 `compareMcpCapabilityDescriptors` 分类，**仅 breaking** 置 `reviewStatus='required'`）、运行时能力注册器、`ToolRuntimeService.describeCapabilities`、`availableCapabilities`/`assertCanEnable`
- 用途：把「工具集当前声明了什么」与「已发布承诺了什么」做成两级投影，让 schema 变化可分级审核而不是静默改契约
- 口径：唯一索引即幂等键（重复 discover / 重复绑定在同一键上收敛为同一行）
- 边界：漂移审核发生在**读路径**（不读就不审核）；catalog 无 `@VersionColumn`，并发 discover 与绑定变更后写覆盖前写；`toolsetId` 无外键 ⇒ 工具集删除后绑定仍在、执行期才失败
- 详细流向：见 .module-experts/后端专题/工具与 MCP 专家/implementation/{03-数据流转.md,04-模型.md}；决策见 C5-关键决策.md §D6