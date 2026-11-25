---
groupPath: 项目踩坑点
relation: 项目 skills 与 rules 目录不会被加载（先确认生效副本）
exportedAt: "2026-11-18T07:15:07.119Z"
---
在项目根 `skills/` 或 `rules/` 下改文件**不会生效**——必须先确认实际加载的是哪一份，否则改了等于没改。
- skill 加载路径：① 项目级 `<workspace>/.codebuddy/skills/<name>`（目录或软链）；② 用户级 `~/.codebuddy/skills/<name>`。项目根的 `skills/` 只是源码目录。
- 规则加载路径：① 项目级 `<workspace>/.codebuddy/rules/*.mdc`；② 用户级 `~/.codebuddy/rules/*.mdc`。**项目根 `rules/` 不在加载路径**（本机 `.codebuddy/rules/` 是空目录，`rules/ai-codekb-memory.md` 从未被注入；actual alwaysApply 的是 `~/.codebuddy/rules/Agents_Memory.mdc`）。
- 本项目现状（2026-11-18 核对）：`ki-upload` → 项目级软链（改项目文件即生效）；`agents-md-init`、`ki-search` → 用户级**真实副本**（改完必须 cp）；`event-report` → 项目级软链；`knowledge-atlas` → 两处都没有，`use_skill` 调不到。
- 两次实例：① event-report 建好后只落在 `skills/`，available_skills 里没有 → 补 `ln -sfn ../../skills/<name> .codebuddy/skills/<name>` 后才可用；② `rules/ai-codekb-memory.md` 里加的事件上报节 / 收尾 checklist / 禁忌 18-19 一直没进上下文 → 已改为同步进用户级 `Agents_Memory.mdc`。
- 新增 skill：`ln -sfn ../../skills/<name> .codebuddy/skills/<name>`，新会话重载后生效；改已有 skill：先 `ls -la .codebuddy/skills` 与 `~/.codebuddy/skills` 看它是软链还是副本。软链 → 改项目文件；副本 → 改完 cp。