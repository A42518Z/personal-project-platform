<template>
  <div class="page">
    <div class="page-title"><div><h2>文件中心</h2><p>用于个人项目中的封面、附件、文本内容和下载资源管理。</p></div><el-button type="primary">上传文件</el-button></div>
    <div class="card"><el-table :data="files" border stripe><el-table-column prop="name" label="文件名"/><el-table-column prop="type" label="类型" width="180"/><el-table-column prop="size" label="大小" width="120"/><el-table-column prop="owner" label="归属" width="140"/><el-table-column prop="time" label="上传时间" width="140"/><el-table-column label="操作" width="180"><el-button text type="primary">预览</el-button><el-button text type="primary">下载</el-button></el-table-column></el-table></div>
  </div>
</template>
<script setup lang="ts">
import { files } from '@/data/mock'
</script>
