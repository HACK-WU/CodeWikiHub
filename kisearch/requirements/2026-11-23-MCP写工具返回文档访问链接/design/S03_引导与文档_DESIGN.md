---
id: REQ-20261123-003
feature: MCP写工具返回文档访问链接
status: 设计中
created: 2026-11-23
updated: 2026-11-23
version: 2
tags: [feat, mcp, web, ux]
depends_on: []
author: AI
document_type: design
---

# S-03 引导与文档

> v2（2026-11-23）：按设计评审 W5 / W6 修订——补「无权限时的表现」与「旧链接的可见提示」两项验收。
> 软依赖 S-01/S-02：文案要说清「`url` 什么时候出现」，字段名必须与 S-02 一致（`url`）。

## 1. 术语

| 术语 | 定义 |
|------|------|
| **引导** | 让模型知道"结果里有 `url`，应当原样告知用户"的提示，载体是 **tool description** |
| **文档链接** | 用户文档里对该能力的称法（不写 `url` 字段名，符合 `docs/` 面向用户的约定） |
| **MCP instructions** | `buildKiMcpServer` 里传给 `McpServer` 构造参数的 `instructions`，**当前仅在 readOnly 会话存在**（`mcp-server-factory.ts:56`） |

## 2. 现状（AS-IS）

| 载体 | 现状 | 证据 |
|------|------|------|
| 4 个工具的 description | 只讲"做什么/怎么用/触发短语"，无任何返回字段说明 | `mcp-tools/sync-relation.ts:9`、`bulk-sync-relation.ts:9`、`edit-relation.ts:9-12`、`delete-relation.ts:9` |
| MCP `instructions` | `readOnly ? { instructions: READ_ONLY_INSTRUCTIONS } : undefined` ⇒ **写会话没有 instructions** | `mcp-server-factory.ts:51-57` |
| `docs/ki-command-guide.md` | 贴了 `ki_sync_relation` 的返回样例，**没有 `group` 也没有 `url`** | `docs/ki-command-guide.md:107-111` |
| `docs/mcp-http.md` | `--web` 一节只说"同时提供前端页面"，未提写工具会返回链接 | `docs/mcp-http.md:65,106-124` |
| `docs/configuration.md` | 无 `mcp.http.publicUrl` 条目 | — |

## 3. 方案（TO-BE）

### 3.1 tool description 追加（4 处，统一一句）

在 description **末尾**追加（保持原句不动，只加一句）：

> `成功时结果里带 `url`——该文档在 Web 端的地址；请把它原样告知用户（便于点开查看或继续修改）。`

| 文件 | 追加位置 |
|------|---------|
| `src/lib/mcp-tools/sync-relation.ts` | `:9` 字符串末尾 |
| `src/lib/mcp-tools/bulk-sync-relation.ts` | `:9` 字符串末尾（补一句"每条成功结果各带一条"） |
| `src/lib/mcp-tools/edit-relation.ts` | `:9-12` 拼接串末尾 |
| `src/lib/mcp-tools/delete-relation.ts` | `:9` 末尾，改为**明确说没有链接**：「删除后不返回文档链接（文档已不存在）」 |

> 为什么 `delete` 要专门写一句：否则模型会问"为什么别的工具都有链接"，或在删除场景自己拼一条 404 链接。

### 3.2 用户文档（3 处）

| 文件 | 改动 |
|------|------|
| `docs/ki-command-guide.md:107-111` | 返回样例补 `scope` 与 `group`，下方说明「`group` 是实际落盘值（根为 `__root__`）」。**不加 `url`**：该文件讲的是 CLI，CLI 输出不含链接（注入只发生在 MCP 工具层，见 S-02 D-01）——实现期按此修正了本表原写法 |
| `docs/mcp-http.md` | `--web` 一节新增「写文档的工具会返回『打开这篇文档』的链接」小节：示例 JSON、批量逐条、**需登录 / 无权限提示**（评审 W5）、未开前端整条不出现、删除类不给、反代配 `publicUrl`、改名后失效 |
| `docs/configuration.md` | 新增 `mcp.http.publicUrl` 条目（类型 / 默认无 / 作用 / 示例） |

**写法约束**（项目既有约定）：`docs/` 是给用户看的——只写"会看到什么、怎么改、出错怎么办"，**不写**源码路径、内部字段名、决策编号、`fail-loud`/`幂等` 这类术语。③ 自查：写完 grep `src/`、`REQ-`、`D-0`。

## 4. 接口设计

无新增接口。文案契约（字段名与出现条件）完全由 S-02 决定，本子需求只负责**忠实转述**：

| 要转述的事实 | 来源 |
|------------|------|
| 字段名 `url`、绝对地址 | S-02 §4 |
| 成功才有、失败/跳过没有 | S-02 §5 |
| 删除类没有 | S-02 §3.1 |
| 未开 Web 页面时字段不出现 | S-01 §3.4 ① |
| 地址取不到时字段不出现（不返回空串） | S-01 §5 |

## 5. 异常处理

| 场景 | 行为 |
|------|------|
| description 过长影响客户端工具列表展示 | 每条只加一句（≤60 字）；不写示例 |
| 用户按旧文档预期"没链接=坏了" | `docs/mcp-http.md` 明确写"关闭 `--web` 时不带" |
| 上游改了字段名而文档没跟 | 本子需求验收含"文档与实现逐条对齐"检查项（见 §6） |

## 6. 影响范围

| 文件 | 改动量 |
|------|--------|
| 4 个 `src/lib/mcp-tools/*.ts` | 每个 description 加 1 句 |
| `docs/ki-command-guide.md` | 1 段 |
| `docs/mcp-http.md` | 1 段 |
| `docs/configuration.md` | 1 条 |

**验收**：① 4 条 description 与 S-02 的注入矩阵逐条一致；② `docs/` 三处能独立回答"为什么我这里有链接/他那里没有""点开却看不到是什么原因"；③ `docs/` 内不出现 `src/`、`REQ-`、`D-0`；④ **实测「文档改名后打开旧链接」**，把浏览页实际提示抄进 `docs/mcp-http.md`（若提示不可读，先报后再改文案，评审 W6）。

## 7. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|------|-----------|---------|----------------|
| D-01 | 引导只放 **tool description** | 给所有会话加 MCP `instructions` | 现在 `instructions` 只在 readOnly 传（`mcp-server-factory.ts:56`），要给写会话加就得改这段语义；且不少客户端只读 tools/list 不用 instructions | 抽测发现 3 个客户端都不转述 `url`（关键假设 A3 被推翻） |
| D-02 | 每处内联一句，不抽公共常量 | 抽 `DOC_URL_HINT` 常量拼接 | description 是 `server.tool()` 第二参的字面量，拼接后需跳文件阅读；四条文案措辞本就不同（删除类相反） | 未来读工具也开始带链接（≥6 处）时抽常量 |
| D-03 | `docs/` 不写字段名，只写"文档地址/页面地址" | 直接在用户文档里写 `url` 字段 | `docs/` 面向用户，字段名属实现细节；且模型看到的是 description 而非文档 | 无 |

## 8. 待定问题

| # | 问题 | 影响 | 处置 |
|---|------|------|------|
| Q1 | 是否要求模型"必须"贴链接（更强措辞） | 过度要求会让模型在总结里塞满长 URL，影响可读性 | 用"请原样告知"，不写"必须" |
| Q2 | 是否需要中英文两套文案 | 无（本项目工具描述均中文） | 不做 |
