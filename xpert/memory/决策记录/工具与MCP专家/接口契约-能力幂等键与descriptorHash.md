---
groupPath: 决策记录/工具与MCP专家
relation: 接口契约-能力幂等键与descriptorHash
exportedAt: "2026-10-16T07:28:46.847Z"
---
【决策记录｜接口契约：能力台账幂等键 + descriptorHash 分类（不把所有哈希变化当破坏性变更）】
- 分类：接口契约
- 动机（避坑）：**现象** 只存一份能力表，把「工具集当前声明了什么」与「已发布承诺了什么」混为一体；**后果** 工具集改一个 schema 就静默改掉对外契约（无审核环节），或反过来一改就全量判为破坏性变更、需人工逐个复核
- 决策：两级投影 + 指纹分类——`mcp_capability_catalog` 存「当前声明」（唯一 `(toolsetId, capabilityType, capabilityKey)`，事务内 delete + save 整体替换）；`mcp_publication_capability` 存「对外承诺」（唯一 `(publicationId, publicName)` 与 `(publicationId, toolsetId, capabilityType, capabilityKey)`，**`descriptorSnapshot` + `descriptorHash char(64)` 成对固化，不可只写哈希**）；运行时读路径 `resolveRuntimeCapabilities` 逐条比对哈希，不同则 `compareMcpCapabilityDescriptors(binding.descriptorSnapshot, item.descriptor)` 分类，**只有 breaking 变更**才置 `reviewStatus='required'` + `reviewReason`，并由 `assertCanEnable` 阻止上架
- 背景约束：唯一索引即幂等键（重复 discover / 绑定在同一键上收敛为同一行）；`toolsetId` 两侧**故意不建外键**（注释 `intentionally not a FK so broken bindings stay diagnosable`）⇒ 工具集删除后绑定仍在、执行期才失败；漂移审核发生在**读路径**（不读就不审核）；`catalog` 无 `@VersionColumn`，并发 discover 与绑定变更后写覆盖前写
- 被否决方案：把任何哈希变化一律当破坏性变更——被注释逐字否决：「Required to classify descriptor changes instead of treating every hash change as breaking.」
- 重新评估触发条件：给 catalog 增加版本列、或把漂移审核移出读路径时；以及需要「先审核后自动冻结对外契约」时——须同步改 `assertCanEnable` 与发布通知（`publishCatalogChanged`）
- 同族幂等口径：`mcp_task` 双唯一键（唯一 `taskId` ＋ 唯一 `(publicationId, idempotencyKey)`）＋ `inputHash = hashJson(arguments)`，同键异指纹按协议错误 `-32602` 拒（`assertIdempotentReplay`）；`revision` 只用于状态推进标识，**不是乐观锁**
- 关联代码：file://packages/server-ai/src/mcp-publication/entities/mcp-capability-catalog.entity.ts、file://packages/server-ai/src/mcp-publication/entities/mcp-publication-capability.entity.ts、file://packages/server-ai/src/tool-runtime/capability-descriptor.ts、file://packages/server-ai/src/mcp-publication/mcp-publication.service.ts
- 证据来源：C5-关键决策.md §D6（＋§D8 长任务幂等）；implementation/04-模型.md「建模边界：快照、台账与密钥材料」与「校验规则」；implementation/02-实现.md「MCP 发布链」第 2~3 步
- 详细资产：.module-experts/后端专题/工具与 MCP 专家/C0-使用总览.md 已知坑 4/5