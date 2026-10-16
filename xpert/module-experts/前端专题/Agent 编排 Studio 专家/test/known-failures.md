# 已知单元测试失败：Agent 编排 Studio 专家

**当前状态（2026-10-14 项目级实测记录 + 本专家静态复核）：1 例根因命中本模块 1 个 spec（同根因在 apps/cloud 内另波及 17 个 spec，复跑后确认计数）。**

---

## 画布辅助面板 / 命令配置

### apps/cloud/src/app/features/xpert/studio/panel/commands/commands.component.spec.ts:Expert command configuration scope — loads from live workspace streams and defaults to the eligible workspace prompts

- **执行方式**：
  ```bash
  cd /root/xpert && timeout 600 corepack pnpm nx test cloud \
    --testPathPattern="features/xpert/studio/panel/commands/commands.component.spec.ts" --skip-nx-cache
  # 等价（更快，绕开 Nx 项目图）：
  cd /root/xpert && node node_modules/jest/bin/jest.js --config apps/cloud/jest.config.ts \
    --runTestsByPath apps/cloud/src/app/features/xpert/studio/panel/commands/commands.component.spec.ts
  ```
- **失败时间**：2026-10-14
- **失败原因**：**套件在加载阶段失败，用例体未执行**。spec 第 15–19 行声明 `jest.mock('@milkdown/crepe', () => ({ Crepe: class { static Feature = {} } }))`，**未传 `{ virtual: true }`**，因此 Jest 注册 mock 时仍需真实解析模块路径（`node_modules/jest-resolve/build/index.js:977` `_getAbsolutePath()` → 未解析则 `_getVirtualMockPath()` → `resolveModule()`，第 1002–1005 行；失败抛第 863 行 `_ModuleNotFoundError`），报 `Cannot find module '@milkdown/crepe' from 'apps/cloud/src/app/features/xpert/studio/panel/commands/commands.component.spec.ts'`。依赖侧事实：`@milkdown/crepe` 仅在 `apps/cloud/package.json:24`（`^7.22.1`）与 `pnpm-lock.yaml:648`（importer `apps/cloud`，解析 7.22.1）声明，**未安装**——`node_modules/@milkdown/crepe`、`apps/cloud/node_modules/@milkdown/crepe` 均不存在，`node_modules/.modules.yaml` 无 milkdown 条目（同文件中 `@foblex/flow` 等 apps/cloud 依赖的条目存在，说明安装树本身有效）；`apps/cloud/__mocks__`、`apps/cloud/src/__mocks__`、仓库根 `__mocks__` 均不存在，**无 manual mock 兜底**。
- **修复尝试**：
  1. `cd /root/xpert && corepack pnpm install`（按 `.npmrc` 的 `node-linker=hoisted` 重新落盘）——预期直接消除；
  2. **推荐**：删除该 spec 第 15–19 行——mock 属**遗留防御**，`studio/panel/commands/` 目录内除该 spec 外无任何文件引用 `@milkdown/crepe`（生产组件 `commands.component.ts` 不 import 它，同目录的 `../panel.component`、`../../domain` 已各自被 `jest.mock` 空类替换）；
  3. 必须保留 mock 时改为 `jest.mock('@milkdown/crepe', factory, { virtual: true })`。
- **影响**：该 spec 的唯一用例（命令配置作用域：workspace 流加载、默认选中 `shared`+`own`、`toggleWorkspace` 写回 entries）**完全失去回归保护**；命令配置回归只能在 UI 手工验证。同根因另有 17 个 apps/cloud spec（`@shared/files/markdown-editor`、`knowledge/knowledgebase` wiki 系列、`workspace/prompt-workflows` 系列、`setting/organizations`、`@core/services/tag.service`、`@shared/tag/*`）以及生产组件 `apps/cloud/src/app/@shared/files/markdown-editor/markdown-editor.component.ts:14` 的真实 `import { Crepe } from '@milkdown/crepe'` 受同一依赖缺口影响。
- **来源**：expert-team 创建时实测——项目级记录见 `.module-experts/PROJECT.md` §5（cloud 行：「✅ 实测可跑（442 spec；1 个 spec 因缺依赖 `@milkdown/crepe` 失败）」）；本专家 2026-10-14 静态复核（本会话无 shell 能力，未复跑；依赖落盘状态与 jest-resolve 行为均按源码逐行核对）。
