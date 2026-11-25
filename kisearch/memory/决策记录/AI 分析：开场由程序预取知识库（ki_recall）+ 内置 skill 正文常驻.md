---
groupPath: 决策记录
relation: AI 分析：开场由程序预取知识库（ki_recall）+ 内置 skill 正文常驻
exportedAt: "2026-11-19T07:03:44.474Z"
---
真机取证（2026-11-19）：#48 那次 33 轮 / 60 次工具调用全是 fs_*，ki_* 0 次、use_skill 0 次。两个根因：① 分析域唯一内置 skill 正文不常驻（只给目录，正文要 use_skill 才加载，模型从不调）；② 能力提示词不提 ki_*，事件 0 文档时 ki_get_module_info 没有目标。

改法（与「不把 ki_recall 做成分析工具」的旧决定不冲突 —— 它只跑一次、模型看不到）：
1) **开场预取**：analysis 启动时由程序调一次 executeRecall（= MCP ki_recall 同一实现），task 直接由事件标题 + 描述 + 关联/参考文档的 group 路径与名称拼成；结果渲染成【知识库预取】块追加到首轮 user 消息（summary + 建议先读 ≤5 条 + 判断不了的点 ≤3，总长 ≤1200 字）。any 失败（MODEL_UNAVAILABLE / DISCLOSURE / 限流 / 超时 / 解析失败）只记一条 recall 步骤，绝不阻塞分析；取消信号已透传进 executeRecall(RecallToolDeps.signal)。
2) **配置**：analysis.recall = { enabled: true, limit: 5 }（旧配置缺该键按默认）；设置页 AI 分析区加「分析前预取」开关。
3) **prompt**：code-locate 重写为「先看预取清单，再搜代码」，删除「至少检索 2 次」硬限制（次数交模型判断）；内置 skill 正文改为直接注入 system，没有自建 skill 时不再注册 use_skill。

真机踩的两个坑：
- executeRecall 返回的是 **MCP 工具信封**（content[0].text 才是 JSON），直接读 res.ok 会把「成功 0 命中」误判成「不可用」—— 已加 unwrapRecallPayload，测试改为按生产信封形状构造。
- 预取会让「取消」提前命中：cancel 打在预取上时 stream 根本不会启动（旧测试断言 upstreamCalls=1 因此失败）—— 测试改为等第一轮真的发出再取消。

验证：#40 连跑两次 —— 第一次信封未解包（记「跳过 不可用」），修复后记「预取知识库（ki_recall）：建议先读 0 篇」+ metrics docs=0/uncertain=2，daemon 日志 ms=15314 hits=0，task 与预期画像逐字一致；分析侧 29 轮 / 1.13M token。单元：analysis-runner 6 例（预取注入 + 失败不阻塞 + 信封形状）、prompt-config 53、web 1346、两端 tsc 0、build ✓。

边界：未验证「预取命中若干篇 → 模型真的去读那几篇」（需一条有解的事件）；预取固定 15s 左右的启动延迟；反例事件（无解样本）上 token 反而更高（281k → 1.13M），说明预取对无关事件没有成本收益。