---
groupPath: 项目踩坑点
relation: 总览健康项嵌入服务维度实为上游probe与维度配置生效条件
exportedAt: "2026-10-16T03:08:00.785Z"
---
【踩坑｜总览健康项「嵌入服务维度」的实际检查对象 + 维度类改动的生效条件】2026-10-16 取证（REQ-20261016-002 顺带纠错）。

## 1. 该行**不检查集合**（旧命名误导，已修）
- 数据源是 `ki doctor` 三合一 probe 的 `维度匹配` 项，detail = `config=N, 实际=M` —— 比的是**上游 embedding API 返回向量的长度 vs 配置维度** @ src/lib/health-check.ts:196-214。它**从不打开集合**。
- `/api/health` 传 `checkCollectionDimensions:false` @ src/lib/mcp-http-api.ts:748 ⇒ doctor 的 `Collection 维度 (<scope>)` 项（health-check.ts:432-476）**根本不在该响应里**。
- ⇒ 前端旧文案「向量集合维度 / 集合维度一致」是**过度声称**（声称了该数据源无法建立的事实），且 fail 分支建议 `ki restore <scope> --rebuild-vector --yes` 张冠李戴（上游维度不符时重建修不了这个因）。2026-10-16 已正名为「嵌入服务维度」、pass 文案改为「上游返回维度与当前配置一致」、fail 建议改为「核对 embedding.model / embedding.dimension 是否匹配」。
- ⇒ 「配置 ↔ 集合」一致性现由总览「向量维度」面板的角标承担（数据源 /api/vector/status 的 state/persisted），这是 Web 侧首次具备该展示。

## 2. 改 embedding.model / dimension 后必须**重启 daemon** 才上屏
- daemon 进程内模块不热更（起于改动前的老进程会一直返回旧响应结构）；`ki mcp restart` 会复用 lock 的 host/port/web 并以 daemon 方式重启，实测 2s 就绪（预检含真实 embedding 探测与逐 Collection 维度诊断）。

## 3. `config.embedding.dimension` **不是固定 4096**
- src/lib/config.ts:214 的旧注释「kisearch 固定 4096」已订正为：须与集合 dimension、上游模型输出维度三者一致；改维度需重建集合（schema 无 alter API）。
- 本机实际配置（~/.ki/config.yaml）= provider dashscope / model qwen3.7-text-embedding-flash / **dimension 1024**（内置默认才是 Qwen/Qwen3-Embedding-8B / 4096）。

## 4. 待订正的旧记忆
- ki 记忆「导入期间读被队列阻塞（MCP通道缺省write）」把 `/api/vector/status`(GET) 记为「仍是 write ⇒ 导入期间排队」的残留项 —— **按当前代码已不成立**（mcp-http-api.ts:490-494 无 coordinator submit，只读快照文件）。因 ki 默认只读，未自行修改该条目。