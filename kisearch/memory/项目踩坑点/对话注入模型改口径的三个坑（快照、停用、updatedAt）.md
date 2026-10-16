---
groupPath: 项目踩坑点
relation: 对话注入模型改口径的三个坑（快照、停用、updatedAt）
exportedAt: "2026-10-13T12:54:26.300Z"
---
# 对话注入模型改造的三个坑（2026-10-13，skill 按需加载）

## 坑1（🔴 语义不一致）快照必须**生成前**固化，不能等流结束
- 原写法：生成结束后读配置写 `injected.blocks` ⇒ 用户在生成期间改了提示词/skill，快照记下的是"第 1 轮没用过的版本"，此后每轮按它注入 ⇒ **"首轮注入"与"快照"从此不一致**，正是用户要的"只注入一次"被破坏。
- 修法：路由前置段（建立 SSE 之前）写快照 → `readConversation` 重读 → 交给本轮 loop。
- 断言方式（端到端）：`upstream[0].messages.filter(system).map(content)` 必须**逐段等于** `conv.injected.blocks`。

## 坑2（🟡 不一致）已加载的 skill 被停用后正文仍在重放
- 现象：目录里没了、`use_skill` 也调不到，但 `loadedSkillBlocks` 仍在每轮注入其正文 ⇒ "我关掉了它，它却还在影响回答"。
- 根因：重放用 `skills.find(id)` 取正文，**没检查 `enabled`**（调用的白名单 `callableSkillIds` 检查了，重放这条漏了）。
- 修法：重放改走 `findEnabledSkill(cfg, id)` —— 停用即从上下文移除。

## 坑3（🟡 测试偶发红灯）断言"不碰 updatedAt"是错的
- 现象：`applyInjectionState` 前后断言 `updatedAt` 不变 → 30 次里 5 次失败（与 `createConversation` 同毫秒则通过、跨毫秒则失败）。
- 根因：底层 `src/lib/store.ts::writeJson` 对**每一次**会话写入都统一打戳（`updatedAt: new Date().toISOString()`），这是 store 层约定，不是某个函数的行为。
- 修法：只断言 `seq` 不变（它才是消息 id `m{seq}` 的来源）；注释里写明 updatedAt 会打戳。
- 通用教训：**断言 store 层字段前先确认 `writeJson` 的隐式行为**，别按"我以为"写。

## 附带：测试"跑完不退出"
mock 上游的 keep-alive 连接会让 `server.close()` 一直等 ⇒ 表现为"测试通过但进程不退出"。修法：`after()` 里 `server.closeAllConnections?.()` 后再 close。**跑测试一律带 `timeout`**（本轮曾因无超时白等十余分钟）。