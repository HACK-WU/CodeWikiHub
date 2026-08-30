---
kind: frontend_style
name: ki Web 与 zvec-studio 前端样式体系：CSS Token + 纯 CSS 组件 + React/Vite
category: frontend_style
scope:
    - '**'
source_files:
    - web/src/styles/ki.css
    - web/src/layouts/AppShell.tsx
    - web/src/App.tsx
    - web/vite.config.ts
    - web/package.json
    - zvec-studio/apps/frontend/src/styles/tokens.css
    - zvec-studio/apps/frontend/src/styles/theme.ts
    - zvec-studio/apps/frontend/package.json
    - zvec-studio/apps/frontend/src/components/ui/Button.tsx
    - zvec-studio/apps/frontend/src/components/ui/Button.css
    - zvec-studio/apps/frontend/src/components/ui/Dialog.tsx
    - zvec-studio/apps/frontend/src/components/ui/Table.tsx
    - zvec-studio/apps/frontend/src/components/ui/Toast.tsx
---

## 1. 系统/技术栈

仓库包含两个独立的前端工程，均基于 **React + Vite + TypeScript** 构建：

- `web/`（ki-web）：知识库管理界面，依赖 `react-router-dom`、`@tanstack/react-query`、`marked`、`mermaid`，无 UI 组件库。
- `zvec-studio/apps/frontend/`（zvec-studio 前端）：向量数据库工作台，除 React/Vite 外还引入 `i18next`、`react-i18next`、`@zvec-studio/api-client`（OpenAPI 生成），并配套 Vitest + Playwright。

两者均不依赖 Tailwind、Ant Design、MUI 等第三方 UI 框架，而是通过 **原生 CSS + CSS Custom Properties（变量）** 自建设计系统与组件样式。

## 2. 关键文件

- `web/src/styles/ki.css`：ki-web 的完整样式定义，包含设计 token、布局壳、按钮、表格、抽屉、搜索、导入、写入等全部页面样式。
- `web/src/layouts/AppShell.tsx`：应用外壳，实现侧边栏导航、顶栏服务状态徽标、主题切换（`data-theme="light|dark"` 注入到 `document.body`）。
- `web/vite.config.ts`：Vite 配置，设置 `@` 路径别名、开发代理 `/api`、`/mcp`、`/healthz` 到本机 `7423` 端口，构建产物输出至 `dist`。
- `zvec-studio/apps/frontend/src/styles/tokens.css`：zvec-studio 的 CSS 变量集中声明（颜色、间距、圆角、字体、阴影、动效时长），并以 `[data-theme="dark"]` 覆盖暗色主题。
- `zvec-studio/apps/frontend/src/styles/theme.ts`：主题状态管理，支持 `light | dark | system` 三种模式，通过 `useSyncExternalStore` 订阅系统 `prefers-color-scheme` 变化，将 `root.dataset.theme` 与 `colorScheme` 同步到 DOM。
- `zvec-studio/apps/frontend/src/components/ui/*.tsx`：原子级 UI 组件（Button、Dialog、Input、Select、Table、Tabs、Toast、Skeleton、EmptyState、ErrorState 等），每个组件配套独立的 `.css` 文件，命名空间以 `zv-` 前缀区分。

## 3. 架构与设计约定

### 3.1 设计 Token 体系

两个前端都采用 **CSS 自定义属性** 作为设计令牌：

- ki-web 使用 `--ki-*` 前缀（如 `--ki-color-primary`、`--ki-space-4`、`--ki-radius-md`、`--ki-font-size-lg`、`--ki-motion-fast`），在 `:root` 中声明亮色值，在 `[data-theme="dark"]` 中覆盖暗色值。
- zvec-studio 使用 `--zv-*` 前缀，结构完全一致，便于两套界面保持视觉一致性。

Token 覆盖范围包括：背景/表面色、文本色、品牌/功能色（primary/success/warning/danger/info/purple）、间距（4px 步进）、圆角（sm/md/lg）、字体族与字号、布局常量（header-height、sidebar-width、content-max-width）、交互态（hover、surface-muted、scrollbar）、阴影层级、动效时长。

### 3.2 主题系统

- 通过给 `<body>` 或 `<html>` 设置 `data-theme="light|dark"` 切换主题，由 CSS 变量自动响应。
- ki-web 在 `AppShell.tsx` 中以 `localStorage` 键 `ki-theme` 持久化用户选择；zvec-studio 在 `theme.ts` 中以 `zv-theme` 持久化，并额外支持 `system` 模式监听 `matchMedia('(prefers-color-scheme: dark)')`。

### 3.3 样式组织方式

- **零构建 CSS**：ki-web 注释明确“零构建：纯 CSS，浏览器直接加载”，所有样式集中在 `styles/ki.css`，由 `App.tsx` 直接 import。
- **组件级 CSS 模块**：zvec-studio 的 `components/ui/` 下每个组件与其 `.css` 并列存放，通过类名前缀 `zv-` 避免全局污染，未使用 CSS Modules 或 CSS-in-JS。
- **BEM 风格命名**：ki.css 广泛使用 BEM 风格（如 `.ki-sidebar__header`、`.ki-nav-item--active`、`.ki-card__body`），配合 modifier 变体（`--ok`、`--err`、`--active`、`--danger`）表达状态。

### 3.4 布局与响应式

- 统一采用 Flex/Grid 布局：`.ki-shell`（侧边栏+主区域）、`.ki-split`（双栏）、`.ki-stats`（统计卡片网格）。
- 响应式断点集中在 `ki.css` 末尾：`max-width: 1024px` 时双栏改为单列，`640px` 时隐藏表格部分列、压缩间距。
- 滚动行为：内容区使用 `overflow-y: auto`，侧边栏隐藏通过 `margin-left` 负偏移 + `opacity` 过渡动画实现。

### 3.5 组件样式约定

- 按钮：`.ki-btn` 基类 + `--primary/--secondary/--danger/--small/--ghost` 变体，loading 态通过伪元素旋转实现。
- 表单：`.ki-form-input` / `.ki-form-textarea` / `.ki-form-select` 统一边框、聚焦态（`border-color: var(--ki-color-primary)` + `box-shadow` 光晕）。
- 反馈：`.ki-toast`（顶部居中弹出）、`.ki-overlay` + `.ki-dialog`（模态框）、`.ki-banner`（警告/成功/错误横幅）、`.ki-service-badge`（服务状态徽标）。
- 数据展示：`.ki-table`、`.ki-stat-card`、`.ki-qr-item`（搜索结果项）、`.ki-file-item`（文件列表）。
- 交互控件：`.ki-switch`（toggle 开关）、`.ki-tabs`、`.ki-combobox`（Group/Tag 选择器）、`.ki-dropzone`（拖拽上传区）。

## 4. 约定与约束

- **不使用 CSS 预处理器或 CSS-in-JS**：两个前端均只使用原生 CSS，ki-web 甚至强调“零构建”。
- **设计令牌集中声明**：颜色、间距、圆角、字体、阴影、动效时长必须通过 CSS 变量引用，禁止在组件样式中硬编码具体数值。
- **主题通过 `data-theme` 切换**：新增颜色时必须同时提供亮色与暗色两套变量值。
- **类名命名空间**：ki-web 使用 `ki-` 前缀，zvec-studio 使用 `zv-` 前缀，避免跨工程冲突。
- **响应式策略**：以移动端优先的媒体查询覆盖桌面布局，断点为 `1024px` 与 `640px`。
- **构建目标**：Vite 构建目标为 `es2022`，sourcemap 关闭，产物输出到各自 `dist/` 目录，由后端静态服务或直接部署。
- **国际化**：zvec-studio 额外通过 `i18next` + `react-i18next` 管理文案，但样式层仍保持语言无关。
- **测试相关**：zvec-studio 的 UI 组件附带 `.test.tsx`（Vitest + Testing Library），ki-web 当前未见对应样式测试。