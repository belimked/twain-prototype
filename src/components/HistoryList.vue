<template>
  <div class="card">
    <div class="card-head"><el-icon><Clock /></el-icon><h3 class="grow">{{ def.label }} History <span class="badge">{{ rows.length }}</span></h3></div>
    <el-table :data="rows" size="small" v-loading="loading">
      <el-table-column label="Date" width="170"><template #default="{ row }">{{ fmt(row.at) }}</template></el-table-column>
      <el-table-column label="Field" width="200"><template #default="{ row }">{{ row.field === '__created' ? 'Created.' : fieldOf(object, row.field)?.label || row.field }}</template></el-table-column>
      <el-table-column label="User" prop="userName" width="150" />
      <el-table-column label="Original Value" min-width="160" show-overflow-tooltip><template #default="{ row }">{{ show(row, row.oldValue) }}</template></el-table-column>
      <el-table-column label="New Value" min-width="160" show-overflow-tooltip><template #default="{ row }">{{ row.field === '__created' ? '' : show(row, row.newValue) }}</template></el-table-column>
    </el-table>
    <div v-if="!loading && !rows.length" class="empty small">Created {{ fmt(record.createdAt) }} by {{ record.createdBy }} (data migration); no changes since.</div>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { api, bus, userName } from '../api.js'
import { OBJECTS, fieldOf, formatValue } from '../meta.js'
const props = defineProps({ record: Object, object: String })
const def = computed(() => OBJECTS[props.object])
const rows = ref([])
const loading = ref(false)
const names = ref({})
const fmt = (v) => (v ? new Date(v).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) : '')
async function load() {
  loading.value = true
  try {
    rows.value = await api(`/r/${props.record.id}/history`)
    const ids = [...new Set(rows.value.flatMap((r) => [r.oldValue, r.newValue]).filter((v) => v && /^[a-z]{2}\d+_|^[0-9a-f]{18}$/.test(v)))]
    if (ids.length) {
      const pairs = await Promise.all(ids.slice(0, 30).map((id) => api(`/r/${id}`, { quiet: true }).then((x) => [id, x.record.name]).catch(() => [id, id])))
      names.value = Object.fromEntries(pairs)
    }
  } finally {
    loading.value = false
  }
}
function show(row, v) {
  if (v === null || v === undefined) return ''
  const f = fieldOf(props.object, row.field)
  if (row.field === 'ownerId' || f?.type === 'user') return userName(v)
  if (f?.type === 'lookup') return names.value[v] || v
  if (f?.type === 'multipicklist') { try { return JSON.parse(v).join('; ') } catch { return v } }
  if (f?.type === 'checkbox') return v === 'true' ? 'Yes' : 'No'
  return f ? formatValue(f, ['number', 'currency', 'percent'].includes(f.type) ? +v : v) : v
}
watch(() => [props.record.id, bus.version], load, { immediate: true })
</script>
