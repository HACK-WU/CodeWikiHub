---
groupPath: 接口信息/知识库专家
relation: FAQ与标签
exportedAt: "2026-10-16T03:53:30.127Z"
---
【接口信息｜FAQ 与标签】\n- 子功能：FAQ 导入导出与预检、KB 级标签选中、文档手工标注、标签引用分页\n- 所属模块：知识库专家\n- 接口列表（均**无声明式守卫**，靠 service 断言）：\n  - `/api/knowledgebase/:knowledgebaseId/faqs`：`GET`（列表：`search`/`enabled`/分页校验）・`POST`・`GET export`（csv/json）・`POST import`（`mode=append|replace`，**文件上限 10 MiB**）・`GET import-template`・`POST import/preview`・`GET :id`・`PUT :id`・`DELETE :id`\n  - `/api/knowledgebase/:knowledgebaseId/tags`：`GET list`・`POST select`・`POST unselect`・`GET documentTags`・`POST addManual`・`DELETE removeManual`\n  - `/api/knowledgebase/tag-usage/:tagId`（`KnowledgeTagUsageController.usage`：标签引用分页，`skip` 经解析器校验）\n- 关键约束：标签定义归组织目录（`tag` 表），KB 选中记 `knowledgebase_tag`（唯一 `(knowledgebaseId,tagId)`），文档标注记 `knowledge_document_tag`（唯一 `(documentId,tagId)`，含 `source=manual|automatic` + `confidence`）\n- 易错处：`tag-usage` 不是单段端点——同层单段请求会被 `:id` 通配兜住并按 UUID 校验拒绝