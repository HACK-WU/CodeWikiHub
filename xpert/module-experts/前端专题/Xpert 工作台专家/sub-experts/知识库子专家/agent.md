# 知识库子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：子专家（Xpert 工作台专家）
- **资产路径**：`.module-experts/前端专题/Xpert 工作台专家/sub-experts/知识库子专家/`
- **入口路由**：`/xpert/knowledges/**`（列表 / connect / create-from-pipeline / :id/{documents,faq,configuration,test,graph,wiki,...}）
- **职责**：本子域是「**一个详情壳 + 一族页面 + 一组注入式轮询**」：`KnowledgebaseComponent` 以 `getDetail` 为唯一数据源并向子页面开放 `refresh()`；页面族各自经 `@core` 知识库服务族读写；派生态进度（标签 / Wiki / GraphRAG）封装为 `inject*` 函数返回 `computed<Map>`，只是**新鲜度补偿**，不构成一致性保证。
- **覆盖目录**：
  - `apps/cloud/src/app/features/xpert/knowledge/**（87 非 spec / 62 spec）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 改知识库列表**（scope 侧栏 all/favorites/recents/personal/team、收藏置顶、最近访问、卡片统计）→ `home.component.ts`、`home.utils.ts`。
  - 改新建 / 配置对话框**（basic / models / vector-storage / retrieval / faq / parser / chunk / advanced 分区）→ `new/new.component.ts`；**切片预估预览** → `new/chunk-preview.component.ts`。
  - 改解析与切片表单**（解析器 / 切片 / 图像 / 音频 / 表格 / 父儿分块）→ `processing/processing-form.ts` 及纯函数底座。
  - 改文档上传与导入**（files / url / crawl / remote / pipeline 五源）→ `documents/import/*` 与 `KnowledgeDocumentDialogService`。
  - 改摄取进度节奏**（表格去抖轮询、知识库级 GraphRAG/重建、向导第三步 `getStatus(ids)`）→ `documents/document-view-state.ts`、`documents/step-3/step.component.ts`。
  - 改切片页**（切片列表、问题集、表格元数据、分析快照、原文件预览）→ `documents/chunk/*`、`documents/document-view-model.ts`。
- **测试状态**：93 spec = 36 PASS / 55 FAIL（53 环境级缺依赖 + 2 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
