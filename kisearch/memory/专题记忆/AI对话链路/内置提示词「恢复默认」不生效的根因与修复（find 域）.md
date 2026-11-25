---
groupPath: 专题记忆/AI对话链路
relation: 内置提示词「恢复默认」不生效的根因与修复（find 域）
exportedAt: "2026-11-25T06:48:14.960Z"
---
**现象**：AI 查找的基础提示词，编辑保存与点「恢复默认」都不生效，徽标一直显示「已修改」。

**根因（2026-11-25 修复）**：`web/src/chat/PromptConfigLayer.tsx` 的三个入口都写的是 `d.findPrompt`（2026-11-16 的 deprecated 镜像字段），而服务端只认 `find.prompt`：
- `onSubmit`（modal.kind==='find'）→ `return { ...d, findPrompt: {...} }`
- `onReset`（modal.kind==='find'）→ 同样只写 `findPrompt`
- 保存时 `savePromptConfig` 里 `next.findPrompt = next.find.prompt` 反向覆盖 → 用户改的内容当场丢掉，磁盘内容与 `edited` 均不变。

**修法**：两处都改为写 `find.prompt`（onSubmit 直接构造、onReset 走 `mutateFind`，镜像由 mutateFind 统一同步）。服务端 `normalizePromptMeta` 入口有「内容 === 代码默认 ⇒ edited=false」的判定，所以恢复默认后徽标会自然回到「默认」。

**真机验证**：PUT `find.prompt.content = defaults.find.prompt.content` → 200，落盘 670 字、`edited=false`；GET 一致。

**同时改了默认文案**：`DEFAULT_FIND_PROMPT` 新增显眼小节「## 调用场景（同一套判定，产物去向不同）」——明确写出两个入口：页面「AI 查找」为事件挑参考文档候选（人勾选）；MCP 预取 ki_recall 为开发任务挑开工前必读（直接交给 agent）。原末尾引用块（“由调用方说明”）已并入该节。

⚠️ 历史配置里 `edited:true` 的旧文案（2026-11-16 版 490 字，不含 ki_recall）**不会自动跟随**代码升级 —— 需要用户点一次「恢复默认」（本轮已替本机配置执行一次）。

- 位置: `web/src/chat/PromptConfigLayer.tsx`（onSubmit / onReset）、`src/lib/chat/prompt-config.ts`（DEFAULT_FIND_PROMPT）