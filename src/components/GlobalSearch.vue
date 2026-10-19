<template>
  <div class="gsearch">
    <el-select v-model="scope" class="scope" size="default">
      <el-option value="all" label="All" />
      <el-option v-for="o in SCOPES" :key="o" :value="o" :label="OBJECTS[o].plural" />
    </el-select>
    <el-popover :visible="open && q.length >= 2" placement="bottom-start" :width="520" :show-arrow="false" popper-class="gsearch-pop">
      <template #reference>
        <el-input v-model="q" class="q" placeholder="Search approvals, PSIDs, addresses, cases…" prefix-icon="Search" clearable @focus="open = true" @blur="close" @keydown.enter="first" />
      </template>
      <div v-loading="loading" class="results">
        <div v-for="g in groups" :key="g.object" class="group">
          <div class="muted small gtitle">{{ OBJECTS[g.object].plural }}</div>
          <div v-for="r in g.records" :key="r.id" class="hit row" @mousedown.prevent="go(r)">
            <ObjectIcon :object="r.object" size="sm" /><span class="grow">{{ r.label }}</span><StatusTag :value="r.status" />
          </div>
        </div>
        <div v-if="!loading && !groups.length" class="empty small">No results for “{{ q }}”.</div>
      </div>
    </el-popover>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue'
import { api } from '../api.js'
import { OBJECTS } from '../meta.js'
import { openRecord } from '../nav.js'
import ObjectIcon from './ObjectIcon.vue'
import StatusTag from './StatusTag.vue'
const SCOPES = ['approval', 'site', 'occupier', 'pts', 'billingAccount', 'case', 'samplingEvent', 'planAssessment', 'inspection', 'invoice', 'task']
const scope = ref('all')
const q = ref('')
const open = ref(false)
const loading = ref(false)
const groups = ref([])
let timer = null
let seq = 0
watch([q, scope], () => {
  clearTimeout(timer)
  if (q.value.trim().length < 2) return (groups.value = [])
  timer = setTimeout(async () => {
    const my = ++seq
    loading.value = true
    try {
      const res = await api(`/search?object=${scope.value}&q=${encodeURIComponent(q.value.trim())}`, { quiet: true })
      if (my === seq) groups.value = res.groups
    } finally {
      if (my === seq) loading.value = false
    }
  }, 250)
})
const close = () => setTimeout(() => (open.value = false), 150)
const go = (r) => { open.value = false; openRecord(r.object, r.id, r.label) }
const first = () => { const r = groups.value[0]?.records[0]; if (r) go(r) }
</script>
<style scoped>
.gsearch { display: flex; align-items: center; width: 100%; max-width: 640px; }
.scope { width: 130px; flex: none; }
.scope :deep(.el-select__wrapper) { border-radius: 8px 0 0 8px; background: #f3f6fa; }
.q :deep(.el-input__wrapper) { border-radius: 0 8px 8px 0; }
.results { max-height: 60vh; overflow-y: auto; }
.gtitle { padding: 6px 4px 2px; text-transform: uppercase; letter-spacing: 0.4px; font-size: 11px; }
.hit { padding: 6px 4px; border-radius: 6px; cursor: pointer; }
.hit:hover { background: #f3f7fd; }
</style>
