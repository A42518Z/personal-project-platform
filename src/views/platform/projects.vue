<template>
  <div class="page">
    <div class="page-title"><div><h2>项目中心</h2><p>一个平台可以承载多个个人项目，个人集只是第一个项目模块。</p></div><el-button type="primary">新增项目</el-button></div>
    <div class="action-grid">
      <div v-for="p in projects" :key="p.code" class="project-card">
        <div class="project-icon" :style="{ background: p.color }">{{ p.name.slice(0,1) }}</div>
        <div class="project-main"><h3>{{ p.name }}</h3><p>{{ p.desc }}</p><el-tag size="small">{{ p.code }}</el-tag><el-tag size="small" type="success">{{ p.status }}</el-tag></div>
      </div>
    </div>
    <div class="card"><h3>项目模块规范</h3><el-table :data="projects" border><el-table-column prop="code" label="项目编码" width="160"/><el-table-column prop="name" label="项目名称" width="180"/><el-table-column prop="status" label="状态" width="120"/><el-table-column prop="desc" label="说明"/></el-table></div>
  </div>
</template>
<script setup lang="ts">
import { projects } from '@/data/mock'
</script>
<style scoped>.project-card{display:flex;gap:16px;background:#fff;border-radius:8px;padding:18px;box-shadow:0 1px 4px rgba(0,21,41,.08)}.project-icon{width:54px;height:54px;border-radius:14px;color:#fff;display:grid;place-items:center;font-size:22px;font-weight:700}.project-main h3{margin:0 0 8px}.project-main p{margin:0 0 12px;color:#697b8c;line-height:1.6}.el-tag{margin-right:8px}.card h3{margin:0 0 16px}</style>
