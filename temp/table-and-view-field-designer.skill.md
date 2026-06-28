# 表和视图管理 - 字段设计器增强

## 页面入口
- 路由：`/table-and-view`
- 页面文件：`src/views/platform/table-and-view.vue`
- 新增组件：`src/components/FieldDesigner/index.vue`

## 页面能力
- 左侧数据库列表选择后，管理当前数据库下的表和视图元数据。
- 表设计弹窗支持字段导航、搜索、字段快速编辑、右侧字段高级属性面板。
- 字段设计支持新增、复制选中、批量粘贴、模板字段、默认字段、一键描述、排序、删除确认。
- 字段行级校验覆盖字段名为空、非法命名、重复字段、主键允许为空、自增长配置不合理、长度格式提示。
- 表设计保存前会弹出变更摘要，展示新增字段、修改字段、删除字段和风险提示。
- 表设计的“关系”页签直接嵌入 `TableRelationDesigner`，可进入图谱式关系设计。
- 新建表弹窗复用同一套 `FieldDesigner`，减少新增和编辑体验不一致。

## 使用的数据和接口
- `_base_tbllist`：表元数据，保存通过 `saveTableMeta`。
- `_base_viewlist`：视图元数据，保存通过 `saveViewMeta`。
- `base_tblfield`：字段元数据，查询通过 `queryFields`，保存通过 `saveFields`。
- `base_tblrln`：表关系元数据，关系设计器中查询和保存。
- 通用接口封装位于 `src/api/tableAndView.ts` 和 `src/api/lowcode.ts`。

## 编排注意
- `FieldDesigner` 会给前端临时行补充 `__designerKey`，保存前页面会通过 `cleanRuntimeRow` 去除。
- 删除已有字段会进入 `deletedFields`，实际删除在用户确认保存摘要后发生。
- 保存前摘要目前只做字段层面的本地 diff 和风险提示；字段被关系/视图引用的精确影响分析后续可接 `base_tblrln` 与视图 SQL 解析。
- 构建验证命令：`npm run build`，当前已通过。
