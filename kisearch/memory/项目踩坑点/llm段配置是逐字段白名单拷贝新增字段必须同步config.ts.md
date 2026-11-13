---
groupPath: 项目踩坑点
relation: llm段配置是逐字段白名单拷贝新增字段必须同步config.ts
exportedAt: "2026-11-13T04:31:10.184Z"
---
给 `config.yaml` 的 `llm` 段新增字段时，只改 `config-schema.ts` + `LlmConfig` 类型是**不够**的 —— `config.ts::parseAndExpand` 对 `llm` 段做的是**逐字段白名单拷贝**（`llm = { baseURL: ..., supportsTools: ..., contextChars: ... }`），未列出的键会被**静默丢弃**。
- 表现：类型检查通过、配置写了却永远读到 `undefined`（用到默认值），fn 无任何报错
- 实例：2026-11-13 给 `ki_ask` 加 `llm.askMaxRounds` 时踩到 —— 配置写 `askMaxRounds: 2`，实际仍走默认 6，测试断言 `captured.length===3` 得到 7 才暴露出
- 必改三处: ① `config-schema.ts` 的 `llm.fields` ② `config.ts` 的 `LlmConfig` 类型 ③ **`config.ts::parseAndExpand` 的 `llm` 拷贝块**
- 对照：`KiConfig` 顶层字段多为直接读取；只有 `llm` / `embedding` 这类做归一化（`Number()` / `Boolean()` / `resolveApiKey`）的段才是白名单拷贝
- 验证方式：写一个非默认值的配置，断言执行层收到的就是该值（只断言类型或默认值都发现不了）