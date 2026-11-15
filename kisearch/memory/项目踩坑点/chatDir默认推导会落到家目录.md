---
groupPath: 项目踩坑点
relation: chatDir默认推导会落到家目录
exportedAt: "2026-11-15T06:36:43.580Z"
---
# chatDir 默认推导会落到家目录

- `resolveDefaultChatDir(dataDir) = path.join(path.dirname(dataDir), 'chat')`（`src/lib/config.ts`）。
- 若 `dataDir: $HOME/.ki-data`，默认 `chatDir = $HOME/chat` → 会话文件直接落在**家目录根**。
- 规避：配置里显式写 `chatDir`（本机为 `$HOME/.ki/chat`，与 `vectorDir` 同级）。
- 待改进（未做）：文档与 `ki config init` 模板显式给出 `chatDir`，或把默认推导收到固定落点（`$HOME/.ki/chat` 一类），避免 `dataDir` 自定义时把 `chat/` 甩到家目录。