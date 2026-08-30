---
kind: build_system
name: 构建与发布体系：Node CLI + Web 前端 + Zvec Studio Monorepo 多语言构建流水线
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - tsconfig.json
    - tsconfig.src.json
    - scripts/release.sh
    - scripts/install-latest.sh
    - bin/ki.mjs
    - zvec-studio/Makefile
    - zvec-studio/pnpm-workspace.yaml
    - zvec-studio/apps/backend/pyproject.toml
    - zvec-studio/apps/desktop/src-tauri/Cargo.toml
    - zvec-studio/apps/desktop/src-tauri/tauri.conf.json
    - zvec-studio/.github/workflows/ci.yml
    - zvec-studio/.github/workflows/release.yml
    - web/package.json
---

## 1. 整体方案

仓库包含两个相互独立的构建系统：
- **根工程（kisearch）**：基于 Node.js / TypeScript 的 CLI 工具，通过 `package.json` 的 `bin` 字段暴露 `ki` 命令，使用 `tsc` 编译、`jiti` 直接运行 `.ts` 源文件进行开发/测试。
- **zvec-studio**：独立 monorepo（pnpm workspace），用 Makefile 统一编排 Python FastAPI 后端、React/Vite 前端、Tauri 桌面壳（Rust）以及 OpenAPI 类型客户端，通过 GitHub Actions CI/Release 完成跨平台打包与发布。

两者共享同一 Git 仓库但各自维护自己的依赖、版本和发布流程。根工程没有 Dockerfile 或 Makefile；zvec-studio 是完整的跨语言构建中心。

## 2. 关键文件

- 根工程
  - `package.json`：定义 `name: kisearch`、`version: 0.2.0-beta`、`bin.ki=./bin/ki.mjs`、`files` 白名单、`engines.node >= 18`、`scripts.build = tsc -p tsconfig.src.json`、`scripts.test*` 系列。
  - `tsconfig.json`：全局 TS 配置，target/module=ES2022，moduleResolution=bundler，outDir=`./dist`，exclude 掉 `kb/test`。
  - `tsconfig.src.json`：仅编译 `src/zvec-engine/**`，输出到 `dist/zvec-engine`，并生成 declaration/sourceMap。
  - `scripts/release.sh`：本地发布脚本，校验版本号一致性、工作区干净、关键文件存在、执行 `npm test`、`npm pack`、创建 git tag、调用 `gh release create` 上传 tarball。
  - `scripts/install-latest.sh`：用户侧安装器，通过 GitHub API / gh CLI / `/releases/latest` 重定向三种方式探测最新版本并 `npm install -g` 安装。
  - `bin/ki.mjs`：CLI 入口。

- zvec-studio monorepo
  - `Makefile`：统一入口，提供 `install`、`dev`、`build`、`lint`、`test`、`verify`、`desktop.*`、`package.sidecar`、`package.desktop`、`package`、`release-check` 等目标。
  - `pnpm-workspace.yaml` + `apps/*/package.json`：frontend/desktop/api-client 为 Node 子包，backend 为 Python 包。
  - `apps/backend/pyproject.toml` + `uv.lock`：Python 后端依赖管理，支持 `[dev]`、`[ai]`、`[packaging]` extras。
  - `apps/desktop/src-tauri/Cargo.toml` + `tauri.conf.json`：Tauri v2 桌面壳，CI 中注入版本后构建 `.dmg/.deb/.AppImage/.msi/.exe`。
  - `zvec-studio/.github/workflows/ci.yml`：PR/Push main 触发，矩阵化运行 Python 3.10/11/12 后端 lint/mypy/pytest、Node 20/22 前端 lint/typecheck/unit、Desktop Rust fmt/clippy/test、E2E Playwright、安全审计（pip-audit/pnpm audit/cargo audit）、DCO Signed-off-by 检查。
  - `zvec-studio/.github/workflows/release.yml`：`v*` tag 触发，四平台（macOS ARM64、Linux x64/arm64、Windows x64）并行构建 sidecar 二进制 + Tauri bundle，收集产物并创建 GitHub Release，另起 `publish-pypi` job 将前端静态资源打包进 Python wheel 并发布到 PyPI。

## 3. 架构与约定

- **双轨构建**：根工程走 npm 单包发布（`npm pack` → GitHub Releases tarball → `npm i -g`），zvec-studio 走 pnpm workspace + Makefile + GitHub Actions 多产物流水线。
- **版本来源**：根工程版本来自 `package.json.version`，由 `scripts/release.sh` 强制校验传入参数与之相等；zvec-studio 在 release 流水线中从 git tag 动态注入 `tauri.conf.json` 的 version 与 `pyproject.toml` 的 version（PEP 440 转换：`v0.1.0-rc.2` → `0.1.0rc2`）。
- **构建产物隔离**：根工程 `dist/` 存放 TS 编译产物，`dist/zvec-engine/` 单独产出；zvec-studio 通过 `artifacts/` 目录聚合 pytest XML、coverage、Playwright report 及最终安装包。
- **可重复性**：所有依赖安装均带缓存（pip cache、pnpm cache、Swatinem/rust-cache），CI 使用 `--frozen-lockfile=false` 允许 lockfile 更新但保留锁定策略。
- **质量门禁**：zvec-studio 的 `make verify` 串联 lint → unit → integration → contract → coverage（≥60% gate）；`make release-check` 在此基础上追加 desktop check 与 E2E。
- **发布前置条件**：`scripts/release.sh` 要求工作区干净（`git diff-index --quiet HEAD`）、关键文件存在、`npm test` 全绿；CI 的 DCO job 强制 PR 提交必须含 `Signed-off-by:`。

## 4. 约定与约束

- 根工程只接受 Node ≥18（`engines.node`），TS 目标 ES2022，模块解析采用 bundler 模式。
- 发布前必须手动同步 `package.json` 版本与命令行传入的 `<version>`，否则脚本直接退出。
- 根工程不提交 `dist/` 与 `node_modules/`，发布内容受 `package.json.files` 白名单控制（`bin/**`、`src/**`、`_template/**`、`dist/zvec-engine/**`、`scripts/*.sh`、README、LICENSE）。
- zvec-studio 的 Python 后端通过 `uv sync --extra dev|ai|packaging` 按需启用可选依赖；桌面端构建需要 Linux WebKit/GTK 系统库、Rust toolchain、Tauri WebDriver。
- 跨平台发布仅在 `v*` tag push 时触发，workflow_dispatch 可用于 smoke-test 矩阵而不打 tag。
- Desktop 产物在 macOS 上需执行 `scripts/post-build-sign.sh` 进行 ad-hoc 签名后再重新生成 DMG。
- CI 对 Python/Node/Rust 三方依赖分别执行安全审计，high/critical 漏洞会阻断流水线。
- 测试报告统一以 JUnit XML 形式写入 `artifacts/`，便于后续归档与失败诊断。

## 5. 适用性说明

本仓库同时具备 CLI 包发布与复杂 monorepo 构建流水线，属于“有明确构建系统”的项目，因此本类别适用且证据充分（多个 Makefile、CI YAML、发布脚本、TS/Web/Python/Tauri 多语言构建）。