---
groupPath: 项目踩坑点
relation: AI 分析的 chain 骨架存在两处定义（tail + 用户提示词）
exportedAt: "2026-11-20T04:28:22.486Z"
---
事件 AI 分析的结论骨架说明写在两个地方，改一处会漏另一处，2026-11-20 设计评审时发现（REQ-20261120-002 阻断项）。

- 位置一：`src/lib/events/analysis-runner.ts` 的 `SYSTEM_OUTPUT_TAIL`（第 6 条 chain 写法 + 第 5 条输出 JSON 示例 + 定位语），代码常量，拼进 system 消息，用户不可编辑。
- 位置二：`src/lib/chat/prompt-config.ts` 的 `DEFAULT_ANALYSIS_PROMPT`「五、输出前自检」里也有一句「chain 顺序是 现象 → 直接原因 → 根本原因 → 影响面 → 建议，缺哪层就跳过」，这是**用户可编辑**的提示词默认值。
- 后果：只改 tail 会让模型同时收到「按视角生成」与「固定顺序」两条互斥指令；只改用户提示词则改了提示词的实例会丢失视角骨架。
- 口径：输出格式与骨架的**唯一权威是 tail**；`DEFAULT_ANALYSIS_PROMPT` 里只保留与视角无关的纪律（ref 指向 candidates、反引号包路径、空结果合法），不得复述 chain 顺序或 conclusion 口径。
- 附带：该常量的默认值变化会经 `edited` 标记传播（未编辑过的用户自动跟随代码升级），改默认文案时要同步确认标记逻辑。
- 同类风险：`conclusion` 一句话口径也在两处出现，改口径时需一并检索。