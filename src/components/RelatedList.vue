<template>
  <div class="card related">
    <div class="card-head">
      <ObjectIcon :object="object" size="sm" />
      <h3 class="grow">{{ title || def.plural }} <span class="badge">{{ rows.length }}</span></h3>
      <slot name="actions" />
      <el-button v-if="!readonly" size="small" @click="add">New</el-button>
    </div>
    <el-table v-if="rows.length" v-loading="loading" :data="shown" size="small" style="width: 100%">
      <el-table-column v-for="c in cols" :key="c.key" :label="c.label" :min-width="c.type === 'textarea' ? 220 : 110" show-overflow-tooltip>
        <template #default="{ row }"><FieldValue :field="c" :value="c.key === 'name' ? row.name : row[c.key]" :names="names" :record="row" /></template>
      </el-table-column>
      <el-table-column v-if="!readonly" width="60" align="right" fixed="right">
        <template #default="{ row }">
          <el-dropdown trigger="click" @command="(c) => rowAction(c, row)">
            <el-button size="small" text :icon="'ArrowDown'" />
            <template #dropdown><el-dropdown-menu>
              <el-dropdown-item command="edit">Edit</el-dropdown-item>
              <el-dropdown-item v-if="isCoordinator()" command="delete">Delete</el-dropdown-item>
            </el-dropdown-menu></template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>
    <div v-else-if="!loading" class="empty small">No {{ (title || def.plural).toLowerCase() }} yet.</div>
    <div v-if="rows.length > limit" class="view-all"><a @click="expanded = !expanded">{{ expanded ? 'Show less' : `View all (${rows.length})` }}</a></div>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { OBJECTS, fieldOf } from '../meta.js'
import { api, listRecords, bus, changed, isCoordinator } from '../api.js'
import { openForm } from '../forms.js'
import ObjectIcon from './ObjectIcon.vue'
import FieldValue from './FieldValue.vue'

const props = defineProps({ object: String, field: String, title: String, parent: Object, sort: String, poly: Boolean, readonly: Boolean, columns: Array, limit: { type: Number, default: 6 }, defaults: Object, filter: Function })
const emit = defineEmits(['loaded'])
const def = computed(() => OBJECTS[props.object])
const all = ref([])
const names = ref({})
const loading = ref(false)
const expanded = ref(false)
const rows = computed(() => (props.filter ? all.value.filter(props.filter) : all.value))
const shown = computed(() => (expanded.value ? rows.value : rows.value.slice(0, props.limit)))
const cols = computed(() => (props.columns || def.value.list).filter((k) => k !== props.field && !(props.field === 'relatedTo.id' && k === 'relatedTo')).map((k) => fieldOf(props.object, k)).filter(Boolean))

function query() {
  const f = props.field
  if (f === 'approvalId' && props.object !== 'approval') return { approvalId: props.parent.id }
  if (def.value.parent === f) return { parentId: props.parent.id }
  return { [`f.${f}`]: props.parent.id }
}
async function load() {
  if (!props.parent?.id) return
  loading.value = true
  try {
    const res = await listRecords(props.object, query())
    let list = res.records
    if (props.sort) {
      const desc = props.sort.startsWith('-')
      const k = props.sort.replace(/^-/, '')
      list = [...list].sort((a, b) => ((a[k] ?? '') > (b[k] ?? '') ? 1 : (a[k] ?? '') < (b[k] ?? '') ? -1 : 0) * (desc ? -1 : 1))
    }
    all.value = list
    names.value = res.names
    emit('loaded', list)
  } finally {
    loading.value = false
  }
}
function add() {
  const p = props.parent
  const d = props.poly ? { relatedTo: { object: p.object, id: p.id } } : { [props.field]: p.id }
  const fm = def.value.fieldMap
  if (p.approvalId && fm.approvalId && props.field !== 'approvalId') d.approvalId = p.approvalId
  if (p.object === 'approval' && fm.approvalId) d.approvalId = p.id
  if (p.siteId && fm.siteId && props.field !== 'siteId') d.siteId = p.siteId
  const nm = { [p.id]: { name: p.name, label: p.label || p.name, object: p.object } }
  openForm({ object: props.object, defaults: { ...d, ...(props.defaults || {}) }, names: nm, onSaved: () => load() })
}
async function rowAction(cmd, row) {
  if (cmd === 'edit') openForm({ object: row.object, record: row, names: names.value, onSaved: () => load() })
  if (cmd === 'delete') {
    await ElMessageBox.confirm(`Delete ${row.name}? This cannot be undone.`, 'Delete record', { type: 'warning', confirmButtonText: 'Delete' })
    await api(`/r/${row.id}`, { method: 'DELETE' })
    ElMessage.success('Deleted')
    changed()
  }
}
watch(() => [props.parent?.id, bus.version], load, { immediate: true })
defineExpose({ reload: load, rows })
</script>
<style scoped>
.related { overflow: hidden; }
.view-all { text-align: center; padding: 8px; border-top: 1px solid var(--line); font-size: 13px; }
</style>
