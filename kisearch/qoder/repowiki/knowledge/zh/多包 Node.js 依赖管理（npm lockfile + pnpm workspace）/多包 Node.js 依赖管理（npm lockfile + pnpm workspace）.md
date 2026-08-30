---
kind: dependency_management
name: 多包 Node.js 依赖管理（npm lockfile + pnpm workspace）
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - web/package.json
    - web/package-lock.json
    - zvec-studio/package.json
    - zvec-studio/pnpm-workspace.yaml
    - zvec-studio/pnpm-lock.yaml
    - scripts/install-latest.sh
    - scripts/release.sh
---

## 1. 使用的系统与工具

本仓库是一个包含多个子项目的 Node.js/TypeScript 工程，依赖管理采用两种方案并存：
- **根工程 `kisearch`**：使用 npm（`package-lock.json`），通过 `package.json` 声明运行时与开发依赖。
- **Web 前端 `web/`**：独立的 npm 项目（`web/package.json` + `web/node_modules`），使用 Vite + React。
- **Zvec Studio 工作台 `zvec-studio/`**：使用 pnpm monorepo（`pnpm-workspace.yaml` + `pnpm-lock.yaml`），通过 `packages/apps/*`、`packages/*` 组织子包，并在顶层 `package.json` 中用 `packageManager: "pnpm@9.12.0"` 锁定 pnpm 版本。

所有子项目均通过各自的 `package.json` 的 `dependencies` / `devDependencies` 字段声明第三方库，未使用 vendoring（无 vendor/ 目录）、私有 registry 配置或 `.npmrc` 覆盖。

## 2. 关键文件

- `package.json`：根工程 `kisearch` 的依赖清单，声明 CLI 入口 `bin/ki.mjs`、运行时依赖（`@modelcontextprotocol/sdk`、`@zvec/zvec`、`commander`、`jiti`、`yaml`、`zod`）以及 TypeScript/Jiti 等开发依赖；`engines.node >= 18.0.0` 约束运行环境。
- `package-lock.json`：npm 锁文件，固化根工程依赖树。
- `web/package.json`：Web 前端依赖（React、Vite、TanStack Query、Mermaid 等）。
- `zvec-studio/package.json`：Monorepo 顶层脚本与 `packageManager` 锁定。
- `zvec-studio/pnpm-workspace.yaml`：定义 workspace 包路径 `apps/frontend`、`apps/desktop`、`packages/*`。
- `zvec-studio/pnpm-lock.yaml`：pnpm 锁文件，锁定整个 workspace 的依赖树。
- `scripts/install-latest.sh`、`scripts/release.sh`：发布/安装脚本（位于根工程 scripts 目录）。

## 3. 架构与约定

- **分层隔离**：根工程（CLI + 核心引擎）、`web/`（React 前端）、`zvec-studio/`（pnpm monorepo）各自维护独立的依赖声明与锁文件，避免跨层耦合。`node_modules/` 仅出现在根工程和 `web/` 下，`zvec-studio/` 使用 pnpm 的 store 机制。
- **运行时依赖最小化**：根工程仅引入必要的运行时库（MCP SDK、向量引擎、命令行框架、YAML 解析、Zod 校验），构建期工具（`jiti`、`typescript`）放在 `devDependencies`。
- **TS 直跑模式**：测试与脚本大量使用 `npx jiti src/xxx.ts` 直接执行 TS 源码，因此 `jiti` 被声明为运行时依赖而非仅 devDependency，确保 `ki` 二进制在裸环境中可用。
- **版本策略**：所有依赖使用 `^` 语义化版本前缀（如 `^14.0.0`、`^5.4.11`），由对应包管理器生成精确锁文件保证可重现安装。
- **Node 版本约束**：根工程要求 `node >= 18.0.0`，`zvec-studio` 要求 `node >= 20` 且 `pnpm >= 9`，通过 `engines` 字段声明。

## 4. 约定与约束

- **禁止手写 `node_modules`**：根工程与 `web/` 的 `node_modules/` 应通过包管理器安装，不得手动编辑。
- **Monorepo 统一包管理器**：`zvec-studio` 通过 `packageManager` 字段强制使用 `pnpm@9.12.0`，新增子包需加入 `pnpm-workspace.yaml` 的 `packages` 列表。
- **依赖变更需更新锁文件**：任何 `package.json` 修改都应配合 `npm install`（根工程/web）或 `pnpm install`（zvec-studio）重新生成锁文件，以保证 CI 与本地一致。
- **无私有 registry**：未发现 `.npmrc`、`.yarnrc` 或 `pnpm.config.*` 中的私有源配置，所有依赖均来自公共 npm registry。
- **发布产物范围受控**：根工程通过 `files` 字段限定打包发布内容（`bin/**`、`src/**`、`dist/zvec-engine/**`、`src/zvec-engine/**`、`_template/**`、`scripts/*.sh`、文档与许可证），避免将 `node_modules` 或测试数据打入发布包。
- **测试与示例代码不纳入发布**：`test/`、`test-data/`、`tests/`、`docs/` 等目录未被 `files` 包含，保持发布包精简。

## 5. 总结

该仓库采用“npm 单包 + pnpm monorepo”的双轨依赖管理模式：核心 CLI 与 Web 前端各自独立管理依赖，Zvec Studio 工作台以 pnpm workspace 统一管理多端应用与共享包。所有依赖通过语义化版本与锁文件管控，未使用 vendoring 或私有源，发布范围由 `files` 字段显式限定。