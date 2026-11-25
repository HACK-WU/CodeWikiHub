---
groupPath: 专题记忆/AI对话链路
relation: AI分析追问实现边界（工具面与上下文）
exportedAt: "2026-11-20T10:14:11.875Z"
---
追问走独立 runner（analysis-ask-runner.ts），与 AI 分析只共享工具层与流式调用层；上下文是摘要级（2026-11-20 代码核实）。
- 共享：buildKbReadToolEntries（4 个只读 ki_*：ki_get_module_info / ki_search / ki_group_list / ki_tag_list）、createFsToolEntries（fs_read / fs_grep / fs_find / fs_ls）、streamChat 参数（单轮 300s、首字节 30s、idle 60s）、工具响应 10k 截断、DSML 收口提示、normalizeChain 归一
- 差异：① 提示词硬编码 6 句 vs 分析用用户可编辑模板 + 内置 skill 正文；② **无 skill 能力**（无 use_skill 工具、不注入 skill 正文）；③ 无 ki_recall 开场预取；④ 轮次上限 5（第 6 轮撤 tools 强制作答）vs 分析 while(true)；⑤ 输出自由文本硬截 4000 字 vs 分析强制唯一 JSON + 候选二次校验 + 2 次格式重试；⑥ 落盘 .events/{id}.ask.json，独立限流 6 次/60s
- 上下文 buildContext（analysis-ask-runner.ts:139-217）：标题 + 描述截 800；members/refs 各 20 条**仅 group/name**（无正文，模型自行调 ki_get_module_info）；结论区 = conclusion + chainToLines 合计截 1200；候选/已确认各前 5；最近 2 轮问答（问 200 / 答 400）。**不含**事件编号、类型名、阶段流转、steps、unconfirmed、candidate.snippet
- 无 targetDir 时降级为只有 ki_*（分析侧则直接抛 ANALYSIS_TARGET_NOT_CONFIGURED）