---
groupPath: 专题记忆/检索与向量客户端专家
relation: docId含tag的breaking契约
exportedAt: "2026-09-08T02:26:39.717Z"
---
generateDocId(text, scope, tag) = sha256(text + scope + tag) 截 32（src/lib/vector-client.ts）。
- tag 参与 hash 是多标签能力的前提：tag 是单值字段，「一个内容多 tag」必须各写一 doc，故 tag 必须参与 id 才能各自独立且幂等（同 text+scope+tag → 同 docId → upsert 覆盖）。
- **breaking 迁移影响**：此 scheme 改变了所有调 vectorStore/vectorBulkStore 的链路（sync-relation、ki import、bulk-store、path-vectorize、batch-vectorize）产出的 docId。存量 cache 的 memoryId/memoryIds 指向的 docId 失效 → 原文召回、按 docId 精确删除、幂等重导在迁移前不可靠。部署含存量向量数据时需全量 re-import 或 ki restore <scope> --rebuild-vector 迁移。
- 上层（导入/关系管理）负责把 docId 回填到 relations-cache 的 memoryId（主条）与 memoryIds（全部内容 doc，多 tag 各一）；删除以 memoryIds 为准。
- ki store / ki bulk_store 写入的数据只存在于向量层（不写 KB），检索时 group/relation 缺失、原文召回必然降级。
- **更新记忆不会产生孤儿向量**：executeSyncRelation 的 vectorWriteBack 有数据守恒设计——一次 vectorBulkStore 写新集合，全部失败则不删任何旧向量，成功后才按 generateDocId 算新集合并删 stale（实测：改写记忆正文后旧文本立即不可检索）。

（命令名注：原文记载的 `scan-kb import` 已于 2026-09-07 扁平化为 `ki import`。）