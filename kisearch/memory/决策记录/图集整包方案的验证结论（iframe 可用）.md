---
groupPath: 决策记录
relation: 图集整包方案的验证结论（iframe 可用）
exportedAt: "2026-11-24T07:25:21.914Z"
---
REQ-20261120-003 v4 形态「整包部署 + iframe 加载」经 demo-verify 原型实测通过（19/19 断言），可进入开发。原型与报告在需求目录 demo/verify/ 下。

- 结论：iframe 内图集零 polyfill 即可跑（Shadow DOM、事件委托、CompressionStream 导出）；分包上传体积与 sha 一致、重传覆盖进 archive、四类坏包均拒；249KB 与 1266KB 首屏可见 100ms vs 97ms，体积不是瓶颈；暗色外壳下 iframe 恒为白底 rgb(255,255,255)，无低成本解法，接受为已知限制。
- 三条硬约束：① iframe sandbox 需 allow-scripts / allow-same-origin / allow-downloads / allow-popups（缺 allow-downloads 导出被拦）；② 写接口的 scope 从 body 取，越权校验必须在读 body 之后（原型首版从 query 取，导致只读库写入校验失效）；③ view 的失败态是 JSON，页面必须先查 status 再建 iframe，否则裸 JSON 铺满一屏。
- 遗留：分片中断会残留 .upload/<uploadId>/，需 24h 过期清理（复用 import-uploads 范式）。
- 影响：需求 v5 已回写 5 条调整项（体积 20→10MB、暂存清理、scope 取源、失败态归外层、sandbox 四件套），新增负向 N11/N12。