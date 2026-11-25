---
groupPath: 数据流/回想内核
relation: recall 域数据实体与落点
exportedAt: "2026-11-25T08:06:49.680Z"
---
ki_recall 域的数据实体流向（基线 0f1426b）。
- recallLog：生产方 recallLog()，不落文件，写 stderr 单行 JSON（[recall] 前缀），消费方是运维排查与 scopesUsed 审计；字段 who/targets/channel/ms/hits/scopes/rounds/code/task（task 截 200 字）。
- scopesUsed：生产方 resolveRecallTargets，去向是结果体与 toolTrace，消费方是调用方审计，用途是记录本次实际参与的库。
- 候选与 why：生产方 buildWhy，去向是结果体，消费方是模型与前端，用途是带读正文证据的回想结论。
- 本域无磁盘落盘数据，排查时不要去 ~/.ki/chat 找 recall 日志。
- 详细流向：见 .module-experts/回想内核专家/C4-数据流向与消费.md。