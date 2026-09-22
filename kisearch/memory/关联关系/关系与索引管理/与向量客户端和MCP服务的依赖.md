---
groupPath: 关联关系/关系与索引管理
relation: 与向量客户端和MCP服务的依赖
exportedAt: "2026-09-22T07:37:57.134Z"
---
关系写入与检索服务共享 scope 隔离的 Collection 生命周期。sync-relation 的 vector=false/fullTextWriteBack 写 FTS-only Collection；search 的 fulltext 模式通过 vector-client 同时读取 hybrid FTS 与 FTS-only。FTS engine 与 dense engine 分开缓存、分开关闭，但都受 daemon owner 与 scope 调度约束。