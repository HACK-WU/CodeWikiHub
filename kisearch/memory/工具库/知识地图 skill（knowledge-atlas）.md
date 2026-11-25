---
groupPath: 工具库
relation: 知识地图 skill（knowledge-atlas）
exportedAt: "2026-11-18T03:19:15.063Z"
---
把代码库整理成按分类组织的架构图集的提示词规范，本地 agent 与线上 AI 生成共用同一份。位置 `skills/knowledge-atlas/`（SKILL.md 254 行 + reference.md + examples.md）。

- 两个铁律：① **先确认后作画** —— 勘察完先输出「拟画清单」（分类/标题/回答什么问题/图类型/覆盖范围），必须等用户明确确认才写 IR；"嗯/看看/继续"不算确认 ② **每张图必须配三件套** —— 摘要 60–120 字（结论先行）+ 3–5 条解读（论断+支撑）+ 2–4 条代码位置
- 分类原则：按「读者想理解什么」分，不按目录（`src`/`lib` 当分类名 = 文件浏览器美化版）；每个分类要能补全「我想知道____」；3–7 个分类，每类 1–5 张
- 两类环境：本地有 shell 可跑 archify CLI；线上只有只读沙箱（read/grep/find/ls，单次 ≤200 行 / 64KB），只产 IR + 文字交给平台渲染。**注入线上时必须同时给 reference.md 的 §1（IR 骨架）与 §5（条目数据结构）**，否则模型不知道 IR 长什么样
- 已知坑表（archify v3.2.0 实测）：纵向构图溢出、viewBox 宽 >1085 被拒、workflow 同泳道相邻列重叠、boundary 装错人、标签三难、meta.output 须相对路径、失败留锁、file:// 下 iframe 加载本地 HTML 被拦
- 与 archify 的分工：archify 管「怎么渲染」，本 skill 管「画什么、怎么讲」