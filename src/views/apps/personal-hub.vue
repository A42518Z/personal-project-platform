<template>
  <div class="page">
    <div class="page-title"><div><h2>个人集项目</h2><p>个人集是平台中的第一个项目模块，后续文章、项目、资源、友链都可以先走通用 CRUD。</p></div><el-button type="primary">进入项目配置</el-button></div>
    <div class="stat-grid"><div class="stat-card"><div class="stat-label">文章</div><div class="stat-value">8</div></div><div class="stat-card"><div class="stat-label">项目作品</div><div class="stat-value">3</div></div><div class="stat-card"><div class="stat-label">资源收藏</div><div class="stat-value">16</div></div><div class="stat-card"><div class="stat-label">友链</div><div class="stat-value">5</div></div></div>
    <div class="card"><h3>个人集模块设计</h3><el-descriptions border :column="2"><el-descriptions-item label="项目编码">personalhub</el-descriptions-item><el-descriptions-item label="接口策略">通用 CRUD + 少量特殊接口</el-descriptions-item><el-descriptions-item label="业务表前缀">hub_</el-descriptions-item><el-descriptions-item label="当前阶段">效果预览，不换库表</el-descriptions-item></el-descriptions></div>
    <div class="action-grid"><div class="action-card"><h3>文章管理</h3><p>标题、摘要、正文、标签、发布状态、封面图。</p></div><div class="action-card"><h3>项目作品</h3><p>项目介绍、技术栈、源码地址、演示地址、截图。</p></div><div class="action-card"><h3>资源收藏</h3><p>链接、分类、说明、推荐级别和访问统计。</p></div></div>
  </div>
</template>
<style scoped>.card h3{margin:0 0 16px}</style>
