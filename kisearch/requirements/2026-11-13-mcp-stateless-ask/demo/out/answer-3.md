# 如果我要新增一个通过 action_id 反查告警 ID 的能力，需要改动哪些地方？

**结论：知识库中未找到关于 `action_id` 的片段，因此无法给出「新增 action_id 反查告警 ID」的具体改动点。** 以 `action_id` 做全文精确检索命中 0 条（mode=fulltext，`total: 0`），`action` 同样 0 条。

当前知识库（scope: monitor-memory）只包含「告警屏蔽」相关内容，共 8 篇专题文档和 4 篇关联文档；其中没有提到任何 action_id 或快捷操作 ID 的存储和解析能力。为避免编造，下面只列出与「反查链路」最相关的**已有**结构，供你判断该落在哪一层（这些是现有文档事实，不是针对 action_id 的改动清单）：

- **通知链接侧的 token 解析是现有唯一“由外部链接参数定位告警”的入口**：`QuickAlertShield`（GET /event/alert/quick_shield/）`继承 QuickActionTokenResource，验证 token 并解析 alert_ids`，再对每个 alert_id 调 `resource.shield.add_shield(category=alert)`（来源：专题记忆/告警屏蔽/快捷屏蔽接口体系，lines 1-30）。
- **唯一存在的「ID → 告警」反向映射示例**：`ALERT_SHIELD_SNAPSHOT` 缓存，`Key: strategy_id + alert_id 组合`，Value 为「匹配到的屏蔽配置 ID 列表」，首次匹配后写入并带 TTL（来源：专题记忆/告警屏蔽/屏蔽缓存同步机制，lines 1-29）。方向与你要的相反（是告警→屏蔽配置），但同属“反查缓存”的现成范式。
- **一旦改动会级联的既有链路**（关联关系/告警屏蔽 文档明确标注“必改”）：
  - 数据层：`Shield` 模型（MySQL `alarm_shield`）、`AlertDocument`（ES，`is_shielded`/`shield_id`/`shield_left_time`）、Redis `shield.biz_{bk_biz_id}`（告警屏蔽架构总览 lines 1-22）。
  - HTTP 层：`ShieldViewSet` 声明端点并按 action 分配 IAM 权限（VIEW_DOWNTIME/MANAGE_DOWNTIME），`AddShieldResource` 按 `SHIELD_SERIALIZER` 分发表分发（AddShieldResource-serializers-Shield模型 lines 1-12）。

**缺口**：知识库中缺少两项必要信息：① `action_id` 由哪个模型或表产生、是否已有索引或缓存；② 需要反查的“告警 ID”是 `AlertDocument` 主键还是 `alert_id` 业务字段。补齐这两点后（或提供对应代码路径），我可以基于现有文档梳理出具体改动点。
