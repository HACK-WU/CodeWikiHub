---
groupPath: 决策记录
relation: 内置提示词与 skill 未改动则跟随代码升级
exportedAt: "2026-11-19T07:28:39.146Z"
---
内置提示词 / skill 存进 prompt-config.json 后是**快照**：代码里改了默认文案，用户不点「恢复默认」就永远停在旧版。真机案例（2026-11-19）：用户问「为什么 AI 分析的基础提示词和 skill 里看不到 MCP 工具说明」——配置里是 11:27 的旧正文（skill 1121 字），代码里已经是 1716 字且第一章就是「先看预取清单，再搜代码」。

口径（四个域一起：AI 对话 / AI 分析 / AI 查找 / AI 预取 的 prompt + skills）：
- 新增 `edited?: boolean`（CapabilityPrompt 与 PromptSkill）；保存路径只标记 `edited = content !== 当前代码默认`（skill 还比 description，只改描述也算改过），不改内容；
- 读取路径：`edited === false` ⇒ 换成代码最新默认（提示词正文 / skill 正文 + 描述）；`edited === undefined`（历史配置）⇒ 保留，但若**内容恰好等于当前默认**则就地补 `edited:false`（可以确定没改过，下次保存即持久化）；
- 归一化必须**保留 edited 字段**（四个 skills.push 与四个 prompt 构造点都加了透传），否则存盘标记在读取时会丢。
- UI：ItemCard 新增 `stale` 属性，历史配置且内容≠默认时 meta 显示「内置已更新」（warning 色，区别于「已修改」），hover 提示点卡片可恢复默认；`isStaleBuiltin()` 判定。

验证：prompt-config 57 例（新增 3 例：保存标记 / 四域跟随升级 / edited=true 与历史配置保留 + 内容等于默认时补标记）；真机 GET /api/chat/prompt-config 实测 chat/analysis/recall 的 `edited:false`、analysis skill 1716 字已跟上；find prompt 仍是历史内容（edited undefined）→ 界面会标「内置已更新」。web 1354 全绿、两端 tsc 0、build ✓。

边界：只改描述的用户会因此停止跟随正文升级（保守取舍）；`analysisPrompt` / `findPrompt` 两个 deprecated 老字段不参与升级。