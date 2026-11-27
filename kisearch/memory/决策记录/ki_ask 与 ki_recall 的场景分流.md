---
groupPath: 决策记录
relation: ki_ask 与 ki_recall 的场景分流
exportedAt: "2026-11-27T02:06:54.708Z"
---
`ki_ask` 与 `ki_recall` 按**提问对象**分工：用户提问（为什么 / 怎么做 / 是什么 / 有没有做过 / 上次怎么定）→ 先 `ki_ask` 拿库里的既有结论与背景，**再**结合代码回答；接到任务（要动手做事）→ `ki_recall` 取「该读哪几篇文档」。
- 起因（2026-11-27 用户反馈）: agent 遇到用户提问直接翻代码，知识库里早就写好的结论完全用不上；原 `ki_ask` 描述只写「适合需要综合结论的问题」，没有触发场景与优先级，客户端不会主动想到它
- 描述精简: 326 → 240 字。删掉的是重复内容（「背景是前提不是材料」已并入 `background` 参数说明；「只要片段请用 ki_search」原写两遍合成一句），加进去的是场景与优先级
- 落地六处（缺一处就有客户端看不到）: ① `ki_ask` 工具描述；② `ki_recall` 描述补对称句（原「读完要综合结论用 ki_ask」会被误读成"读完再用"，与"先问"矛盾）；③ `docs/mcp-tools.md` 工具表；④ 资源页 `resourcesPage.ts` 的 purpose（用户可见）；⑤ `skills/ki-memories` 选择口诀 + 分工说明；⑥ `AGENTS.md` / `AGENTS-template.md` 的第一原则加「按场景选工具」行
- 为什么必须落到工具描述: 它是**唯一不依赖本项目文件与 skill** 的入口 —— AGENTS.md 被 gitignore 且仅本机，skill 要主动加载；远程或其他客户端只拿得到工具描述
- 与「记忆检索必查」的关系: ki_ask 是**问答**（拿结论），与预取（拿清单）、检索（拿片段）是三种返回物，不互相替代也不冲突
- 验证: `mcp-ask-tool` 8/8、`mcp-doc-url` 7/7、`mcp-token-readonly` 28/28、`chat/mcp-tool-registry` 18/18、web `resources-page` 86/86；daemon 重启后 curl 拉 `tools/list` 实测 ask 与 recall 新文案均命中；前端 `vite build --emptyOutDir false` 重建（`npm run build` 会被 safe-delete 守卫拦在 emptyDir）