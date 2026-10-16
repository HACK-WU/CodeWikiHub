---
groupPath: 错误库/Web前端界面
relation: mermaid 图表渲染失败被静默吞掉
exportedAt: "2026-10-13T03:06:59.274Z"
---
【错误库｜mermaid 图表渲染失败被静默吞掉】
- 报错原文片段：Parse error on line 2:
...U["你：写 YAML（spec "）"] --> API["kube-apis
-----------------------^
Expecting 'SQE', 'DOUBLECIRCLEEND', ... got 'STR'
- 现象：Markdown 里的 mermaid 代码块没有渲染成图，页面只剩源码块（带语言名与复制按钮），控制台零输出；用户误以为「产品不渲染了」/「渲染退化了」
- 根因：节点文本或边标签的字符串内层写了未转义的裸双引号（mermaid 语法要求字符串内层写 #quot;），词法器在字符串中途遇到第二个 " 即判定字符串提前结束，mermaid.render 抛 Parse error；而渲染方 catch {} 静默保留源码块，用户无法区分「源码语法错」与「产品坏了」。相邻缺陷：空图判定若对整份 svg 做图形标签黑名单匹配，会被 <marker>（且不在 <defs> 内）里的 path/polygon/circle 误伤，导致空图被替换成 viewBox=-8 -8 16 16 的空白画布（正是该判定原本要消除的形态）
- 解法：① 首次渲染失败时把标签串内层裸引号转义为 #quot; 后换新 id 重试一次（规则：起点是 [ ( { | 后紧跟的 "，终点是其后第一个「后面紧跟 ] ) } | 或行尾」的 "，只替换二者之间的裸引号；标签未闭合行与 %% 注释行不动；合法源码必须逐字节不变）；② 渲染失败不再静默：代码块工具条给可见标记（图表渲染失败 / 图表内容为空 / 图表渲染不可用 三态），点击或回车展开「原因 + 去路」面板，保留源码块且复制内容始终是原文；③ 补动态 import('mermaid') 的 catch（chunk 加载失败此前是 unhandledRejection 加零反馈）；④ 空白图判定改为先剥离 <defs>/<marker> 装饰容器再判有无图形元素；⑤ securityLevel 保持 strict，不得为「能渲染」改成 loose
- 验证方式：web 单测 npm test（含 6 类合法源码逐字节恒等回归、空图装饰容器判定）；DOM 级 temp/verify-mermaid-fallback.cjs 29/29（容错出图且复制为原文 / 失败提示含 Parse error 与恢复引导 / 空白图提示 / 合法图无提示 / 拦截 chunk 得不可用提示 / body 无临时容器残留 / 点按与键盘 Enter 展开面板）；真实截图 temp/shots/mermaid-fallback.png 与 mermaid-fallback-expanded.png
- 关联方案：.solutions/debugging/mermaid-render-silent-failure/