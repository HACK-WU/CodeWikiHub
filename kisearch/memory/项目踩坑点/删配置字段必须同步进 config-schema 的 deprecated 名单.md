---
groupPath: 项目踩坑点
relation: 删配置字段必须同步进 config-schema 的 deprecated 名单
exportedAt: "2026-11-18T02:30:00.382Z"
---
config-schema 对固定键对象的未知字段一律报错（附 Levenshtein 拼写建议），因此从 schema 里删掉一个字段后，存量 config.yaml 里残留该键会让所有 ki 命令在加载阶段 fail-loud。

- 做法：删字段时同步把名字加进该 object 节点的 deprecated 映射，写清「已废弃（被忽略）+ 现在该走哪里」，命中只告警不阻断。
- 实例：2026-11-18 取消 llm.analysisDailyLimit，同时把它加进 llm 节点的 deprecated；若只删 fields 不加 deprecated，配过该字段的部署升级后直接起不来。
- 相反面：prompt-config.json 不用这么做 —— normalizePromptConfig 是白名单拷贝（out 从默认配置起算，只拷贝认识的键），删掉的字段天然被忽略，加告警反而多余。
- 位置：src/lib/config-schema.ts（CONFIG_SCHEMA 的 node.deprecated）、src/lib/chat/prompt-config.ts（各 normalize*）。