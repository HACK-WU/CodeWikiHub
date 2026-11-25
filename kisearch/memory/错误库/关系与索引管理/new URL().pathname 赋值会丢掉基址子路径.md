---
groupPath: 错误库/关系与索引管理
relation: new URL().pathname 赋值会丢掉基址子路径
exportedAt: "2026-11-23T04:21:54.683Z"
---
Node 里拼 URL 时，若基址本身带子路径（如 `https://ki.example.com/ki`），**不要**用 `new URL(base).pathname = '/browse'` —— 赋值会整段覆盖 pathname，`/ki` 直接消失，结果变成 `https://ki.example.com/browse`，链接必然打不开。

- 现象: 反代部署在子路径下时，生成的地址少一段前缀；本地开发（基址无路径）完全复现不了。
- 根因: `URL.pathname` 是赋值而非拼接，`new URL('https://h/ki').pathname` 读得到 `/ki`，但一赋新值就只剩新值。
- 正确写法: 把「基址」与「基址子路径」拆成两个值 —— `{ base: 协议+主机, basePath: '/ki' }`，再 `u.pathname = basePath + '/browse'`；`base` 恒不带路径。
- 位置: `src/lib/mcp-tools/doc-link.ts`（REQ-20261123-003 设计 S-01 §3.5，决策 D-04）
- 测试: 必须有一条「publicUrl 带子路径」用例，否则本地全绿、线上全坏。