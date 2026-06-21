# personal-project-platform 前端文档：表和视图管理 / 表关系设计器

## 项目入口

- 项目目录：`personal-project-platform`
- 启动入口：`src/main.ts`
- 路由入口：`src/router/index.ts`
- 布局组件：`src/layout/index.vue`
- 开发端口：`3100`
- 后端代理：`/api -> http://localhost:8080`

## 当前页面

- `/login`：登录页，调用 `/api/LoginAuthority/UserLoginByEnt`，成功后保存 token、refreshToken、userInfo。
- `/dashboard`：个人项目平台工作台。
- `/metadata`：元数据概览，调用 `/api/DataOperation/GetData` 读取库、表、字段统计。
- `/table-and-view`：表和视图管理集成页。
- `/metadata/tables`：旧表注册页面，保留路由。
- `/metadata/fields`：旧字段维护页面，保留路由。
- `/data-workbench`：旧通用数据管理页面，保留路由。
- `/files`：文件中心，当前仍用 mock 数据。
- `/personal-hub`：个人集项目页，当前仍用 mock 数据。

## 表和视图管理页

页面文件：`src/views/platform/table-and-view.vue`

参考来源：`spark/metadatamanagement/src/views/DataBaseManage/TableAndView`

主要能力：

- 数据库列表。
- 表 / 视图切换。
- 表名、中文名、创建人搜索。
- 注册表、注册视图。
- 新增表、新增视图。
- 删除表元数据、删除视图元数据。
- 复制表元数据。
- 表设计、视图设计。
- 字段维护。
- 系统字段查看。
- 表关系设计弹窗。
- 数据流、数据预览、AI 填表、一键加描述、同步元数据、编码设计入口。

当前保存策略：

- 新增/修改/删除表只写 `_Base_TblList` / `_base_tbllist` 元数据，不执行物理 `CREATE TABLE` 或 `DROP TABLE`。
- 新增/修改/删除视图只写 `_Base_ViewList` / `_base_viewlist` 元数据，不执行物理视图 DDL。
- 表关系只写 `Base_TblRln` / `base_tblrln` 元数据，不创建数据库外键。

## 前端接口文件

### `src/api/client.ts`

- 封装原生 `fetch`。
- 注入 token。
- 统一拆包后端响应。

### `src/api/auth.ts`

- `loginApi(payload)` 调用 `/LoginAuthority/UserLoginByEnt`。
- `getUserInfoApi()` 调用 `/LoginAuthority/GetUserInfo`。

### `src/api/lowcode.ts`

- 封装 `/DataOperation/GetData`。
- 封装 `/DataOperation/BatchTableOperateRequestByCRUD`。
- `GetDataOptions` 已支持 `fields?: string[]`。
- 构造请求体时会把 `options.fields` 写入 `Table[0].Fields`。

### `src/api/tableAndView.ts`

- 表管理、视图管理、字段维护、表关系设计器的接口封装。
- 高频元数据查询已传明确 `Fields`，参考 lowcode 查询方式，避免后端每次反射全表字段。
- 表/视图主键请求已从旧 `rowid` 改为 `row_id`。
- `rowIdOf` 保留兼容读取顺序：`row_id -> rowid -> ROWID -> Id -> ID -> id`。

高频字段列表：

- `tableListFields`：表列表查询字段。
- `viewListFields`：视图列表查询字段。
- `fieldListFields`：字段列表查询字段。
- `relationListFields`：表关系列表查询字段。

## 表关系设计器

弹窗入口：`/table-and-view` 表列表操作列中的 `表关系`。

组件：

- 表关系设计器：`src/views/platform/table-relation-designer/index.vue`
- 图谱画布：`src/components/SchemaGraph/index.vue`
- 类型文件：`src/components/SchemaGraph/types.ts`

依赖：

- `@logicflow/core`
- `sass`

能力：

- 表节点可拖动、缩放、居中、全图、对齐。
- 添加表节点，支持选择已有表或新建表元数据。
- 拖线新建表关系。
- 点击连线编辑/删除表关系。
- 点击表节点打开字段抽屉。
- 关系配置支持主表字段、从表字段、操作符、级联删除、备注。
- 关系保存到 `Base_TblRln` / `base_tblrln`。

## 图谱体验优化

`SchemaGraph` 新增：

- `constrainNodeInCanvas`：表关系设计器传 `false`，防止拖拽后强制回弹。
- 连线避让节点：根据节点矩形动态选择折线路径，减少连线被块遮挡。
- 自定义关系文字渲染：`FlowSubmitTypeEdge.getText()` 固定返回 `null`，不再使用 LogicFlow 默认 edge text。

图谱设置侧栏：

- 箭头。
- 关系文字。
- 连线避让节点。
- 文本透明度。
- 节点大小。
- 连线粗细。
- 图谱向心力。
- 节点间排斥力。
- 相连节点间吸引力。
- 连线长度。

关系文字规则：

- 横向线段：文字水平显示在线上方。
- 竖线/斜线：按字段顺序逐字符从上往下展示，每个字符保持正向、不旋转。
- 关闭关系文字时，`label/text/edgeLabel` 清空，不显示关系文字。

布局保存：

- 图谱参数保存到 `localStorage`：`projecthub_table_relation_graph_settings`。
- 节点布局按当前表保存到 `localStorage`：`projecthub_table_relation_graph_layout:{tableIdOrName}`。
- 点击 `保存布局` 后，重新打开同一张表优先恢复保存布局。
- 当前布局尚未写入数据库。后续如需跨浏览器/跨设备保存，可新增布局表或接文件保存接口。

## 数据源映射

- 表元数据：`_Base_TblList` / `_base_tbllist`
- 视图元数据：`_Base_ViewList` / `_base_viewlist`
- 字段元数据：`Base_TblField` / `base_tblfield`
- 表关系元数据：`Base_TblRln` / `base_tblrln`
- 主键字段：新前端默认使用 `row_id`，兼容历史 `rowid`。
- 表关系方向：`pktable/pktbid -> fktable/fktbid`。
- 关系表达式：`RelshipExp` 中 `Field` 存从表字段，`ValueFun.Field` 存主表字段。

## 构建与启动

构建：

```bash
npm run build
```

启动：

```bash
npm run dev
```

最近一次确认：前端 `npm run build` 已通过。

## 后续建议

- 将图谱布局从浏览器 `localStorage` 迁移到数据库或文件接口。
- 表关系配置弹窗升级为完整 FilterBuilder。
- 新增物理建表/建视图能力前，需要后端提供安全 DDL 白名单接口。
- `/projects`、`/files`、`/personal-hub` 后续再接真实后端接口。
