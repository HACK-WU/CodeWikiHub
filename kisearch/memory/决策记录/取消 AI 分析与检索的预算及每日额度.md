---
groupPath: 决策记录
relation: 取消 AI 分析与检索的预算及每日额度
exportedAt: "2026-11-18T02:29:43.820Z"
---
把 AI 分析的轮次/文件上限、AI 查找的轮次/候选/超时上限、以及每日额度（原 50 次/日/scope，分析与查找共用一份）全部取消，只保留两条硬编码的防挂死超时；设置页对应的两个配置块整块删除（2026-11-18 用户拍板）。

- 决策：用户原话「取消检索预算，以及分析预算的限制，还有每日额度限制也直接取消」。理由：上限把分析深度卡死，且撞墙时无处可调 —— 每日额度在设置页**根本没有入口**，只能手改 config.yaml 的 llm.analysisDailyLimit。
- 保留（不可配、不进设置页）：analysis-runner 的 90s 硬超时 + 75s 软超时；find-runner 的 45s 硬超时（原 find.timeoutMs，现为常量 FIND_HARD_TIMEOUT_MS）。目的是模型卡住时请求不会永不返回。
- 删除面：analysis.maxRounds/maxFiles、find.maxRounds/maxCandidates/timeoutMs、llm.analysisDailyLimit 的类型与归一化校验；FsToolErrorCode 的 FILE_BUDGET_EXCEEDED 分支；consumeDailyQuota 与 _analysis_usage.json 读写；GET /api/chat/prompt-config 的 analysisMax* / findMax* limits；前端两块输入 UI 与 promptConfigClone 的搬运。
- 兼容：prompt-config.json 是白名单拷贝，残留键天然忽略；llm.analysisDailyLimit 必须进 config-schema 的 deprecated 名单（只告警），否则存量 config.yaml 会因「未知字段」启动即 fail-loud。
- 残留：ANALYSIS_RATE_LIMITED(1608) 与 FIND_QUOTA_EXCEEDED(1425) 保留在码表但不再抛出（删会破码表稳定性），注释标 @deprecated。
- 测试：单测注入口 deps.hardTimeoutMs（生产不传）覆盖 45s；FILE_BUDGET_EXCEEDED 用例改为「换新文件照样可读」；两个前端 clone 测试改为断言旧预算字段不再搬运。