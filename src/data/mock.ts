export const projects = [
  { code: 'personalhub', name: '个人集', status: '建设中', desc: '第一个项目模块：展示文章、项目、资源、友链和站点配置。', color: '#409eff' },
  { code: 'blog', name: '博客实验', status: '规划中', desc: '后续可作为文章体系或知识库模块。', color: '#67c23a' },
  { code: 'toolbox', name: '工具箱', status: '规划中', desc: '沉淀自己常用的小工具和自动化入口。', color: '#e6a23c' }
]

export const metaTables = [
  { project: 'personalhub', name: 'hub_article', label: '文章', pk: 'id', fields: 12, systemFields: true, api: '通用 CRUD' },
  { project: 'personalhub', name: 'hub_project', label: '项目作品', pk: 'id', fields: 10, systemFields: true, api: '通用 CRUD' },
  { project: 'personalhub', name: 'hub_resource', label: '资源收藏', pk: 'id', fields: 9, systemFields: true, api: '通用 CRUD' },
  { project: 'platform', name: 'meta_table', label: '元数据表', pk: 'id', fields: 14, systemFields: true, api: '平台接口' }
]

export const fields = [
  { table: 'hub_article', name: 'title', label: '标题', type: 'varchar', list: true, edit: true, query: true },
  { table: 'hub_article', name: 'summary', label: '摘要', type: 'varchar', list: true, edit: true, query: false },
  { table: 'hub_article', name: 'content', label: '正文', type: 'text', list: false, edit: true, query: false },
  { table: 'hub_article', name: 'status', label: '状态', type: 'varchar', list: true, edit: true, query: true },
  { table: 'hub_article', name: 'created_at', label: '创建时间', type: 'datetime', list: true, edit: false, query: true }
]

export const dataRows = [
  { id: 'A001', title: '个人集首页规划', type: '文章', status: '草稿', updatedAt: '2026-06-21 10:20' },
  { id: 'P001', title: 'Personal Project Platform', type: '项目', status: '建设中', updatedAt: '2026-06-21 11:05' },
  { id: 'R001', title: '低代码 CRUD 内核整理', type: '资源', status: '已发布', updatedAt: '2026-06-21 12:10' }
]

export const files = [
  { name: 'cover-personalhub.png', type: 'image/png', size: '182 KB', owner: 'personalhub', time: '2026-06-21' },
  { name: 'resume.pdf', type: 'application/pdf', size: '420 KB', owner: 'platform', time: '2026-06-20' },
  { name: 'article-draft.md', type: 'text/markdown', size: '9 KB', owner: 'personalhub', time: '2026-06-19' }
]
