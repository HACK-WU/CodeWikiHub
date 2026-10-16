---
groupPath: 项目踩坑点
relation: 写config.yaml的通路会重写整个文件丢注释
exportedAt: "2026-10-14T02:25:19.948Z"
---
【踩坑｜写 config.yaml 的通路会重写整个文件，手写注释丢失】2026-10-14 实测（REQ-20261014-001 实施中确认）

## 现象
通过 HTTP 改一个配置字段后（`POST /api/chat/config/ack` 或新增的 `PUT /api/chat/config`），`~/.ki/config.yaml` 里用户手写的注释**全部消失**，整个文件被重新序列化。

## 根因
链路是 `YAML.parse(全文) → 改一个字段 → YAML.stringify(全文)`（`src/lib/chat/chat-routes.ts::patchLlmConfigField`）—— yaml 库的 parse **不保留注释**。
- 实测（node 直接验证）：注入 `# 用户手写注释` + 字段内注释 → 重写后**两条都丢失**。
- **语义字段全部保留**：`dataDir` / `llm.*` / `scopes` 等原值不变；`scopes.default: {}` 这类**流式 map 写法也被保留**（不会被展开成多行）。
- 这是**继承自 `handleConfigAck` 的既有行为**（用户首次点隐私确认时就会发生）；2026-10-14 新增的 `PUT /api/chat/config` 只是**多了一个触发点**，不是本次引入。

## 影响与处置（当前选择：接受）
- 语义无影响（有守恒断言：`test/chat/context-limit-config.test.ts` ③④ 逐字段核对 llm 段与顶层段）。
- 但用 git 管理配置文件者会看到**整文件 diff**，手写说明丢失 —— 属可观测的格式损失，已在配置项说明与需求文档 §8.6 明示。
- 若后续要改：需换成保留格式的写实现（yaml 的 CST / document API，或文本级按行定位替换）。文本级替换脆弱（缩进/引号/多行值/同名键的歧义），需评估后再动。

## 通用注意
任何新增「能写 config.yaml」的通路都会继承这个行为 —— 要么接受（并在 UI/文档明示），要么统一换成保留格式的写实现。**同时必须复用 `atomicWriteConfig`**（临时文件 + rename + 沿用原 mode）：配置含 apiKey 明文，直接 writeFileSync 既会让人读到半截文件，也会把 0600 降级为默认权限。
