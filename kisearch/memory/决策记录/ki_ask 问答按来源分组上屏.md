---
groupPath: 决策记录
relation: ki_ask 问答按来源分组上屏
exportedAt: "2026-11-16T06:24:49.003Z"
---
ki_ask 的短会话从「不进列表、背景不落盘」改为「按来源分组上屏」，两条原决策被显式推翻（2026-11-16 用户确认，REQ-20261116-003）。

- 原 C1（REQ-20261113-001 R1/R9「不落盘 / 不进 web 会话列表」）→ 改为落盘保留 + 独立分组。分组维度：我的会话 / 本地连接 / 各 Token（按 token 名称），默认折叠。理由：分组隔离同样能防「agent 噪音淹没人工会话」，且不牺牲可回溯性。
- 原 C2（REQ-20261115-001 §10-1「background 不落盘」）→ 改为落盘留痕、回放丢弃。核心是解耦「不占上下文」与「不落盘」：存储留痕让回看可理解，回放路径（ask-runner.ts::replayMessagesForModel 只取 role/content/at）必须显式排除该字段，否则背景每轮重复跨轮进上下文会撞爆 20 条 / 60K 字符预算。
- 分组归属：远程 MCP 必带 token，存 tokenId + 名称快照、实时 join 现名（改名跟随），Token 删除后兜底「已删除的 Token（原名）」；本地连接（ownerKey='local'）单独一组、仅 admin 可见；Token 组按 TokenRecord.ownerId 归属。
- 保留期与续接 TTL 解耦：context_id 续接仍 10 分钟滑动 TTL，列表态保留 7 天。**7 天按 createdAt 起算（不滑动）**——若沿用滑动的 updatedAt，高频续接的记录永不过期、磁盘无上界；GC（ask-gc.ts）只按保留期删文件，续接 TTL 过期不再删文件（原 ask-gc 过期即删会让列表条目自己消失）。配置项 llm.askSessionRetainDays（1~365，默认 7）。
- 详情只读：不可续聊 / 改名 / 归档 / 删除（ka-* 无这些字段）；「以该问答新建会话」本期不做。
- 接口：GET /api/chat/agent-asks?scope=&limit=&cursor=&group=（列表，按组独立游标）、GET /api/chat/agent-asks/:id?scope=（详情）；错误语义 404（不存在/越权同码）/410（超保留期）/422（损坏且不删文件）。列表走独立扫描，不并入主会话列表（后者是全量解析 + total 二次全扫）。
- **部署限制（实测）**：mcp-http.ts 里 authEnabled = !isLoopbackHost(host)，daemon 绑 127.0.0.1 时鉴权关闭，即使带 Bearer 身份也是 local ⇒ 本机单机部署下 origin 恒为 {kind:'local'}，Token 分组只在 daemon 对外监听时出现。
- 视觉与交互基线：demo/ki-ask-grouping/index.html（内联真实 ki.css，单文件零依赖）；头部切换列表按钮已移到「居中/铺满」右侧。
- 实现状态（2026-11-16）：B0 前端分组+只读详情、B1 数据层、B2/B3 两接口、B4 接真数据全部完成，mock 已删；web 1233/1233、两端 build 通过。