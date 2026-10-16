# 技能包与技能仓库子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（平台插件与技能专家）
- **资产路径**：`.module-experts/后端专题/平台插件与技能专家/sub-experts/技能包与技能仓库子专家/`
- **职责**：本子专家拥有「**文件形态的智力资产**」：技能包（`skill_package`）的安装、创作、文件读写、分发与卸载；技能仓库（`skill_repository`）与仓库索引（`skill_repository_index`）的登记、同步与市场聚合；以及围绕它们的两层策略——四个来源策略（clawhub / github / workspace-public / zip）与两个 Agent 中间件策略（`SkillsMiddleware` 消费端、`SkillCreatorMiddleware` 生产端）。它的结构可以一句话概括：**仓库定义「能从哪拿」，索引定义「有哪些」，技能包定义「这里已经有一份」**；数据库只保存「索引行 + 安装行」与三个弱引用（`packagePath` / `sharedPackagePath` / `sharedSkillId`），技能内容始终是工作区 `skills/` 或组织共享目录下的真实文件。凡涉及「技能从哪来、工作区里现在有哪几份技能、某份技能怎么发到市场」的问题，都找这个子专家。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/skill-package`
  - `server-ai/src/skill-repository`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 要登记 / 修改 / 删除技能来源仓库，或查「当前可选的来源策略有哪些」（`/api/skill-repository`、`GET /api/skill-repository/source-strategies`）。
  - 要把某个仓库的技能清单同步成市场可搜索的索引（`POST /api/skill-repository-indexes/sync/:repositoryId`），并纠结 `full` 还是 `incremental`。
  - 要在市场里按关键词搜技能（`GET /api/skill-repository-indexes`，`search` 参数）。
  - 要从索引把技能包装进工作区（单条 `install`、整仓库 `install-repository`、GitHub 直连 `install-github`）。
  - 要在工作区里创作技能、读写技能目录里的单个文件、上传 / 下载技能包 zip。
  - 要把工作区自建技能分享成组织共享技能并发布到公开仓库（`…/:id/share`、`POST /api/skill-repository/workspace-public/ensure`）。
- **测试状态**：skill-package 侧 7 个 spec 的覆盖点（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
