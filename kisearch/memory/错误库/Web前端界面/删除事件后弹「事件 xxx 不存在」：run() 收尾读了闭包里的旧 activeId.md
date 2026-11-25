---
groupPath: 错误库/Web前端界面
relation: 删除事件后弹「事件 xxx 不存在」：run() 收尾读了闭包里的旧 activeId
exportedAt: "2026-11-19T07:53:03.105Z"
---
事件页删除已收口事件后，右上角弹出红字 toast「事件 evt_xxx 不存在」，把本该显示的成功提示覆盖掉了。
- 现象: 删除成功（DELETE 200）→ 列表刷新（200）→ 紧接对**已删 id** 发 `GET /events/<id>` 与 `/refs` 双 404 → catch 里 `setMessage({tone:'err'})` 盖掉成功文案
- 根因: `EventsPage.tsx` 的 `run()` 收尾写的是 `if (activeId) await loadDetail(activeId)`，而 `activeId` 是**闭包变量**；`onDelete` 的 fn 里 `selectEvent(null)` 只改 state（异步），闭包仍是刚删掉的 id。凡「操作成功后要刷一下当前详情」的路径都有这个隐患，删除是唯一会清空选中的那个
- 解法: 加 `activeIdRef` 镜像 —— `selectEvent` 内**同步**写 ref（先于 setState），`useEffect(activeId)` 傅底同步（首屏/深链的选中由 `loadList` 直接 setActiveId，不经 selectEvent），`run` 收尾改读 `activeIdRef.current`
- 验证: 自建临时事件 → 流转到末位 → UI 删除。修前 NET 有 `404 GET /events/<id>` + `404 GET /refs`，TOAST 为红色「事件 xxx 不存在」；修后 NET 无 404、TOAST 为「已删除事件；0 篇文档改为长期保留」且 isErr=false
- 证据: `.debug/event-delete-404-20261119/`（repro.cjs + evidence.md E-01~E-07）
- 关联坑: 任何在 `await` 之后读组件 state 的地方都要警惕同一模式（state 更新异步、闭包快照不变），要么读 ref，要么把值作为参数传递