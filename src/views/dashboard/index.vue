<template>
  <div class="page">
    <div class="page-title">
      <div>
        <h2>个人项目平台工作台</h2>
        <p>先以平台效果预览为主：项目中心、低代码核心、通用数据管理和个人集模块都使用 mock 数据。</p>
      </div>
      <el-button type="primary">新建项目</el-button>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">项目模块</div><div class="stat-value">3</div></div>
      <div class="stat-card"><div class="stat-label">已注册表</div><div class="stat-value">4</div></div>
      <div class="stat-card"><div class="stat-label">元数据字段</div><div class="stat-value">45</div></div>
      <div class="stat-card"><div class="stat-label">文件资源</div><div class="stat-value">12</div></div>
    </div>

    <div class="card">
      <h3>平台分层</h3>
      <div class="action-grid">
        <div class="action-card" @click="$router.push('/projects')"><h3>项目中心</h3><p>把个人集、博客、工具箱等都作为平台下的项目模块管理。</p></div>
        <div class="action-card" @click="$router.push('/metadata')"><h3>低代码核心</h3><p>先保留表注册、字段维护、通用 CRUD 的最小能力。</p></div>
        <div class="action-card" @click="$router.push('/personal-hub')"><h3>个人集项目</h3><p>个人集作为第一个业务模块，后续内容表可先走通用 CRUD。</p></div>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="card">
          <h3>近期任务</h3>
          <el-timeline>
            <el-timeline-item timestamp="当前" type="primary">完成平台后台壳子与信息架构预览</el-timeline-item>
            <el-timeline-item timestamp="下一步" type="success">把 server 改造成 ProjectHub 后端结构，但暂不换库表</el-timeline-item>
            <el-timeline-item timestamp="后续" type="warning">替换 meta_* / hub_* 表结构，逐步摆脱 lowcode 历史表</el-timeline-item>
          </el-timeline>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="card">
          <h3>能力边界</h3>
          <el-tag>登录</el-tag>
          <el-tag type="success">通用 CRUD</el-tag>
          <el-tag type="warning">表字段元数据</el-tag>
          <el-tag type="info">文件上传</el-tag>
          <el-tag type="danger">暂不做多租户</el-tag>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>.card h3{margin:0 0 16px}.el-tag{margin:0 8px 8px 0}</style>
