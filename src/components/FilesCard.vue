<template>
  <div class="card">
    <div class="card-head">
      <el-icon><Paperclip /></el-icon><h3 class="grow">Files <span class="badge">{{ files.length }}</span></h3>
      <el-upload :show-file-list="false" :auto-upload="false" :on-change="upload" accept="image/*,application/pdf,.csv,.txt"><el-button size="small">Upload</el-button></el-upload>
    </div>
    <div v-for="f in files" :key="f.id" class="file row">
      <el-icon><Document /></el-icon><a class="grow" @click="openFile(f)">{{ f.fileName }}</a>
      <span class="muted small">{{ Math.round(f.size / 1024) }} KB · {{ f.userName }}</span>
      <el-button size="small" text :icon="'Delete'" @click="remove(f)" />
    </div>
    <div v-if="!files.length" class="empty small">No files. Upload plans, photos or lab reports.</div>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../api.js'
const props = defineProps({ record: Object })
const files = ref([])
const load = async () => (files.value = await api(`/r/${props.record.id}/files`))
function upload(file) {
  if (file.raw.size > 1_000_000) return ElMessage.error('The prototype accepts files up to 1 MB')
  const reader = new FileReader()
  reader.onload = async () => {
    await api(`/r/${props.record.id}/files`, { method: 'POST', body: { fileName: file.name, data: reader.result } })
    ElMessage.success('File uploaded')
    load()
  }
  reader.readAsDataURL(file.raw)
}
async function openFile(f) {
  const full = await api(`/files/${f.id}`)
  const w = window.open()
  if (w) w.document.write(full.mime.startsWith('image/') ? `<img src="${full.data}" style="max-width:100%">` : `<iframe src="${full.data}" style="border:0;width:100%;height:100%"></iframe>`)
}
async function remove(f) {
  await api(`/files/${f.id}`, { method: 'DELETE' })
  load()
}
watch(() => props.record.id, load, { immediate: true })
</script>
<style scoped>
.file { padding: 8px 16px; border-bottom: 1px solid #f0f2f6; }
</style>
