# 实施计划：图集库一一对应

设计基线：`design/DESIGN.md`（父）+ 4 个子设计 ｜ 骨架冻结 commit：—（无骨架，单窗口串行）
执行方式：**单窗口串行**。可并行砖头 2 片（S-02 ∥ S-03）< 3，不走多窗口并行链。

## 1. 判定依据

| 项 | 结论 | 说明 |
|---|---|---|
| 可并行砖头 | 2 片（S-02 / S-03） | 低于 3 片阈值 |
| 改造现有逻辑占比 | 高 | 四个子需求都以「改现有」为主，非纯新增 |
| 共享面 | 3 处 | 映射配置 / `ki_scope_list.atlas` / `verify` 辅助函数 |
| 契约稳定性 | 稳定 | 三条拍板已定（真加入视图、默认补授权、阈值 5） |
| 结论 | **单窗口串行** | 骨架与集成成本吃不过并行收益 |

## 2. 前置层（不进批次，先于全部业务片完成）

| # | 前置项 | 内容摘要 | 完成判据 |
|---|--------|---------|---------|
| 1 | `atlas` 配置段 | `config.yaml` 的 `atlas.suffix` / `atlas.mappings` + schema 校验 | 合法/非法各有用例；非法时 `CONFIG_FIELD_INVALID` |
| 2 | 映射解析 | `src/lib/atlas/scope-map.ts` 三个函数 + 环检测 | 单测覆盖后缀 / 自指 / 显式映射 / 环 / 非法名 |
| 3 | `ki_scope_list.atlas` | `executeScopeList` 加字段，RBAC 过滤 mappings | 返回含 `atlas`；未授权库不出现在 mappings |
| 4 | 前端类型 | `ScopeInfo.atlas` 类型对齐 | `cd web && npm run typecheck` 通过 |
| 5 | 接口签名冻结 | `ensureScopeDir` / `grantScopesToTokensGrantingView` / `atlasScopeFor` | 三签名定稿，后续只增不改 |
| 6 | 非功能预算 | 视图追加探测 ≤ 成员数；并发沿用现有上限（≤10） | 写进实现注释，S-03 测试断言 |

## 3. 前端视觉基线（壳）

无。本次不新增页面、不铺壳；S-03 只改取数逻辑与顶栏文案，沿用现有 `AtlasPage` 三态与 `AtlasMemberSwitch` 结构。

## 4. 批次表

| 批 | 工作项 | 层级 | 承接验收项 | 并行 | 串行原因 | 基线 |
|---|--------|------|-----------|------|---------|------|
| 第 0 批 | **S-01 映射约定与配置**（含前置层 1–6） | 前置 | ① 给定 `kisearch` 返回 `kisearch-atlas`；② 显式映射覆盖后缀；③ 环/非法名 fail-loud | — | 先于全部 | — |
| 第 1 批 | **S-02 部署链路**（upload 改造 + link + 建库） | 业务 | ④ 主库不存在 → 退出码 2 且不建库；⑤ 旧库有图集 → 要求 `--legacy-scope`；⑥ `--views` 含不含主库视图 → 显式拒绝；⑦ 补授权后原 Token 仍可见视图 | ∥ | — | 第 0 批合入 |
| 第 1 批 | **S-03 前端回落与切换器** | 业务 | ⑧ `kisearch` 下 `/atlas` 出图；⑨ 切换器项名为 `kisearch`；⑩ 图集库 403 不出错误卡；⑪ 双份只显示图集库 | ∥ | —（与 S-02 文件互斥） | 第 0 批合入 |
| 第 2 批 | **S-04 SKILL 与验证** | 文档 | ⑫ 照 SKILL 从零跑通；⑬ 新路径不写主库；⑭ AI 按视图命中图集页 | → | 需 S-02 命令形态与 S-03 页面行为定稿 | 第 1 批合入 |

**文件互斥校验**

| 片 | 独占写 | 与其他片交集 |
|---|---|---|
| S-01 | `src/lib/atlas/scope-map.ts`、`config-schema.ts`、`src/scope.ts`、`src/lib/mcp-tools/scope-list.ts`、`web/src/lib/hooks.ts`（类型段） | 与 S-03 同碰 `hooks.ts` → **已用串行（第 0 批先行）化解** |
| S-02 | `src/atlas.ts`、`src/lib/store.ts`、`src/lib/mcp-token.ts`、`src/lib/atlas/package.ts`、`src/lib/atlas/types.ts`、`test/atlas-*.test.ts` | 无 |
| S-03 | `web/src/lib/atlasTargets.ts`、`web/src/pages/AtlasPage.tsx`、`web/src/components/AtlasHeaderActions.tsx`、`web/src/lib/hooks.ts`（取数段）、`web/test/atlas-view*.mjs` | 与 S-01 同文件 → 串行 |
| S-04 | `skills/atlas-deploy/SKILL.md`、`docs/README.md`、`docs/ki-client.md` | 无 |

## 5. 每批检查点

| 批后 | 检查 |
|---|---|
| 第 0 批 | `npx jiti test/atlas-scope-map.test.ts` 全绿；`ki_scope_list` 实际返回 `atlas`；`cd web && npm run typecheck` 通过 |
| 第 1 批 | 本机端到端：`upload → import → link → /atlas → ki search`；`ki view audit-grants` 无缺失；`web npm test` 中 atlas 相关用例全绿 |
| 第 2 批 | 按新 SKILL 从零走一遍（用 `kisearch` 主库）；验证 ⑦ 项（不写主库、AI 命中） |

## 6. 验收项对照（需求 → 片）

| 验收项 | 归属 | 验证方式 |
|---|---|---|
| 主库 ↔ 图集库映射正确 | S-01 | 单测 + `ki_scope_list --json` |
| 部署一条链路落地 | S-02 | `ki atlas status --scope <图集库>` + `ki view show` |
| 视图仍对原 Token 可见 | S-02 | `ki view audit-grants` + 用原 Token `ki_scope_list` |
| 主库页出图 | S-03 | 浏览器 `/atlas` |
| 切换器显示主库名 | S-03 | 浏览器视图下切换器 |
| AI 按视图命中 | S-02 + S-04 | `ki search --scope <视图> --query ...` |
| SKILL 可复现 | S-04 | 从零照做一遍 |

## 7. 回滚

| 场景 | 动作 |
|---|---|
| 映射配置出错 | 删除 `config.yaml` 的 `atlas` 段（回到纯后缀兜底） |
| 新 CLI 行为影响旧部署 | `--legacy-scope` 保持旧语义；或回退 `src/atlas.ts` |
| 图集库建错 | `ki atlas remove --scope <图集库> --yes` 后删库；主库不受影响 |
| SKILL 回退 | `git checkout skills/atlas-deploy/SKILL.md` |

## 8. 风险

| 风险 | 触发 | 缓解 |
|---|---|---|
| 视图消失 | 补授权未生效 | 第 1 批检查点强制跑 `ki view audit-grants` |
| 存量双份 | `default` 未迁 | 已知接受；S-03 折叠优先图集库 |
| 探测翻倍 | 大视图 | 阈值 5 已排除 `just-test`；并发上限兜底 |
| 文档与实现漂移 | S-04 先写 | S-04 排在最后，按定稿命令写 |

三问自查：① 谁必须先行 → 第 0 批 S-01 ✅；② 谁能同批、为什么不能的说明 → 第 1 批 S-02 ∥ S-03（文件互斥），S-04 串行（需前两者定稿）✅；③ 本次如何执行 → 单窗口串行，按 0 → 1 → 2 ✅。
