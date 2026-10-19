<template>
  <el-select :model-value="modelValue" filterable remote clearable :remote-method="search" :loading="loading" placeholder="Search…" style="width: 100%"
    @update:model-value="(v) => emit('update:modelValue', v || null)" @visible-change="(v) => v && !options.length && search('')">
    <el-option v-for="o in options" :key="o.id" :value="o.id" :label="o.label">
      <div class="row"><ObjectIcon :object="o.object" size="sm" /><span class="grow">{{ o.label }}</span></div>
    </el-option>
  </el-select>
</template>
<script setup>
import { ref, watch } from 'vue'
import { api, listRecords } from '../api.js'
import ObjectIcon from './ObjectIcon.vue'
const props = defineProps({ modelValue: String, object: String, label: String, filter: Object })
const emit = defineEmits(['update:modelValue'])
const options = ref([])
const loading = ref(false)
watch(() => [props.modelValue, props.label], () => {
  if (props.modelValue && !options.value.some((o) => o.id === props.modelValue)) options.value = [{ id: props.modelValue, object: props.object, label: props.label || props.modelValue }, ...options.value]
}, { immediate: true })
let seq = 0
async function search(q) {
  const my = ++seq
  loading.value = true
  try {
    let rows
    if (props.filter || !q || q.length < 2) {
      const { records } = await listRecords(props.object, { ...(props.filter || {}), limit: 200 })
      const ql = (q || '').toLowerCase()
      rows = records.filter((r) => !ql || JSON.stringify(r).toLowerCase().includes(ql)).slice(0, 50).map((r) => ({ id: r.id, object: r.object, label: labelOf(r) }))
    } else {
      const { groups } = await api(`/search?object=${props.object}&q=${encodeURIComponent(q)}`)
      rows = (groups[0]?.records || []).map((r) => ({ id: r.id, object: r.object, label: r.label }))
    }
    if (my === seq) options.value = rows
  } finally {
    if (my === seq) loading.value = false
  }
}
const labelOf = (r) => ({ approval: r.tradingName, pts: r.ptsType, case: r.subject, sampleLocation: r.description }[r.object] ? `${r.name} · ${{ approval: r.tradingName, pts: r.ptsType, case: r.subject, sampleLocation: r.description }[r.object]}` : r.name)
</script>
