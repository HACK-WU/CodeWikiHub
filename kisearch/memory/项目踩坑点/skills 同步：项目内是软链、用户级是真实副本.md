---
groupPath: 项目踩坑点
relation: skills 同步：项目内是软链、用户级是真实副本
exportedAt: "2026-11-24T04:17:14.167Z"
---
改项目 skill 后要同步哪些副本，**要按目录分开看，不能一概而论**：

| 位置 | 形态 | 改源后 |
|---|---|---|
| `skills/`（仓内源） | 真源 | 直接改这里 |
| `.codebuddy/skills/<name>` | **指向 `../../skills/<name>` 的软链**（仅 event-report / ki-upload 两个） | **无需复制**（自动生效）；对软链目标 `cp` 会报“same file” |
| `~/.codebuddy/skills/<name>` | **真实副本**（非软链） | **必须手工 cp**，否则运行时静默用旧版 |

- 验证方法：`ls -la .codebuddy/skills/` 看是否有 `->`；`diff -q skills/<name>/SKILL.md ~/.codebuddy/skills/<name>/SKILL.md` 确认一致。
- 修订旧认知：“项目 skills 与 rules 目录不会被加载（先确认生效副本）”那条说的是**加载优先级**；本次补的是**软链 vs 副本**，两者不矛。
- 踩坑场景：REQ-20261124-001 批 3 改 `event-report`，对 `.codebuddy` 执行 cp 报“same file”，才确认它是软链。