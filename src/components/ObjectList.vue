<template>
  <div class="card list-card">
    <div class="card-head list-head">
      <ObjectIcon :object="object" />
      <div class="grow">
        <div class="muted small">{{ def.plural }}</div>
        <el-dropdown trigger="click" @command="selectView">
          <span class="view-name">{{ currentView.name }} <el-icon><ArrowDown /></el-icon></span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="v in builtInViews" :key="v.id" :command="v.id">{{ v.name }}</el-dropdown-item>
              <el-dropdown-item v-for="(v, i) in savedViews" :key="v.id" :command="v.id" :divided="i === 0">
                <el-icon><Star /></el-icon>{{ v.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="muted small">{{ filtered.length }} item{{ filtered.length === 1 ? '' : 's' }} · sorted by {{ sortLabel }} · updated {{ updatedAgo }}</div>
      </div>
      <div class="toolbar">
        <el-input v-model="search" clearable placeholder="Search this list…" prefix-icon="Search" style="width: 220px" />
        <el-button v-if="!readonly" type="primary" @click="newRecord">New</el-button>
        <el-button v-if="def.queue && selection.length" @click="assignOpen = true">Assign ({{ selection.length }})</el-button>
        <el-tooltip content="Refresh"><el-button :icon="'Refresh'" circle @click="load" /></el-tooltip>
        <el-badge :value="activeFilterCount" :hidden="!activeFilterCount"><el-tooltip content="Filters"><el-button :icon="'Filter'" circle @click="filterOpen = true" /></el-tooltip></el-badge>
        <el-dropdown trigger="click" @command="menu">
          <el-button :icon="'Setting'" circle />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="save">Save as new list view…</el-dropdown-item>
              <el-dropdown-item v-if="currentView.saved" command="delete">Delete this list view</el-dropdown-item>
              <el-dropdown-item command="columns" divided>Select fields to display…</el-dropdown-item>
              <el-dropdown-item command="csv">Export CSV</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <el-table v-loading="loading" :data="page" :default-sort="defaultSort" style="width: 100%" :row-key="(r) => r.id" @sort-change="onSort" @selection-change="(s) => (selection = s)" @row-dblclick="(r) => openRecord(r.object, r.id, r.name)">
      <el-table-column v-if="def.queue" type="selection" width="42" />
      <el-table-column v-for="c in columnFields" :key="c.key" :prop="c.key" :label="c.label" sortable="custom" :min-width="c.key === 'name' ? 140 : c.type === 'textarea' ? 240 : 130" show-overflow-tooltip>
        <template #default="{ row }"><FieldValue :field="c" :value="c.key === 'name' ? row.name : row[c.key]" :names="names" :record="row" /></template>
      </el-table-column>
    </el-table>
    <div class="row pager">
      <span class="muted small grow"></span>
      <el-pagination v-model:current-page="pageNo" :page-size="pageSize" :total="filtered.length" layout="prev, pager, next" small hide-on-single-page />
    </div>

    <el-drawer v-model="filterOpen" title="Filters" size="380px">
      <div v-for="f in filterFields" :key="f.key" class="filter-row">
        <label>{{ f.label }}</label>
        <el-select v-if="f.type === 'picklist' || f.type === 'multipicklist'" v-model="filters[f.key]" multiple clearable collapse-tags placeholder="All" style="width: 100%">
          <el-option v-for="o in f.options" :key="o" :value="o" :label="o" />
        </el-select>
        <el-select v-else-if="f.type === 'checkbox'" v-model="filters[f.key]" clearable placeholder="All" style="width: 100%">
          <el-option :value="true" label="Yes" /><el-option :value="false" label="No" />
        </el-select>
        <el-select v-else-if="f.type === 'user'" v-model="filters[f.key]" multiple clearable placeholder="All" style="width: 100%">
          <el-option value="__none" label="Unassigned (queue)" />
          <el-option v-for="u in session.users" :key="u.id" :value="u.id" :label="u.displayName" />
        </el-select>
        <el-date-picker v-else-if="f.type === 'date' || f.type === 'datetime'" v-model="filters[f.key]" type="daterange" value-format="YYYY-MM-DD" format="DD/MM/YYYY" start-placeholder="From" end-placeholder="To" style="width: 100%" />
        <el-select v-else-if="f.type === 'lookup'" v-model="filters[f.key]" multiple filterable clearable collapse-tags placeholder="All" style="width: 100%">
          <el-option v-for="o in lookupOptions(f.key)" :key="o.id" :value="o.id" :label="o.label" />
        </el-select>
        <el-input v-else v-model="filters[f.key]" clearable placeholder="Contains…" />
      </div>
      <template #footer>
        <el-button @click="clearFilters">Remove all</el-button>
        <el-button type="primary" @click="filterOpen = false">Done</el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="columnsOpen" title="Select fields to display" width="520px">
      <el-checkbox-group v-model="columnDraft" class="col-pick">
        <el-checkbox v-for="f in allColumnFields" :key="f.key" :value="f.key" :label="f.label" />
      </el-checkbox-group>
      <template #footer><el-button @click="columnsOpen = false">Cancel</el-button><el-button type="primary" @click="applyColumns">Save</el-button></template>
    </el-dialog>

    <el-dialog v-model="assignOpen" title="Assign records" width="420px">
      <p class="muted">Assign {{ selection.length }} record(s) to a Trade Waste Officer, or leave them in the queue.</p>
      <el-select v-model="assignTo" clearable placeholder="Unassigned (queue)" style="width: 100%">
        <el-option v-for="u in session.users" :key="u.id" :value="u.id" :label="u.displayName" />
      </el-select>
      <template #footer><el-button @click="assignOpen = false">Cancel</el-button><el-button type="primary" @click="assign">Assign</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { OBJECTS, fieldOf, formatValue, toCsv, download } from '../meta.js'
import { api, listRecords, session, bus, changed } from '../api.js'
import { openForm } from '../forms.js'
import { openRecord } from '../nav.js'
import ObjectIcon from './ObjectIcon.vue'
import FieldValue from './FieldValue.vue'

const props = defineProps({ object: String, initialView: String, readonly: Boolean })
const def = computed(() => OBJECTS[props.object])
const records = ref([])
const names = ref({})
const loading = ref(false)
const loadedAt = ref(Date.now())
const search = ref('')
const filters = reactive({})
const sort = ref({ prop: 'name', order: 'ascending' })
const pageNo = ref(1)
const pageSize = 50
const selection = ref([])
const filterOpen = ref(false)
const columnsOpen = ref(false)
const assignOpen = ref(false)
const assignTo = ref(null)
const savedViews = ref([])
const viewId = ref(props.initialView || 'all')
const customColumns = ref(null)
const columnDraft = ref([])

const builtInViews = computed(() => {
  const d = def.value
  const v = [{ id: 'all', name: `All ${d.plural}` }]
  if (d.owner || d.queue) v.push({ id: 'mine', name: `My ${d.plural}`, filters: { ownerId: [session.user?.id] } })
  if (d.queue) v.push({ id: 'queue', name: `${d.plural} – Trade Waste Queue`, filters: { ownerId: ['__none'] } })
  if (d.fieldMap.status) {
    const closed = ['Closed', 'Completed', 'Cancelled', 'Approved', 'Rejected', 'Decommissioned', 'Inactive', 'Queued for Billing']
    const open = d.fieldMap.status.options.filter((o) => !closed.includes(o))
    if (open.length < d.fieldMap.status.options.length) v.push({ id: 'open', name: `Open ${d.plural}`, filters: { status: open } })
  }
  if (props.object === 'approval') {
    v.push({ id: 'kca', name: 'Key Corporate Accounts', filters: { kca: true } })
    v.push({ id: 'billing', name: 'Enrolled for Billing', filters: { enrolledForBilling: true, status: ['Active'] } })
  }
  if (props.object === 'case') v.push({ id: 'nc', name: 'Open Non-Compliance', filters: { caseType: ['Non-Compliance'], status: ['New', 'In Progress'] } })
  v.push({ id: 'recent', name: 'Recently Created', sort: { prop: 'createdAt', order: 'descending' } })
  return v
})
const currentView = computed(() => builtInViews.value.find((v) => v.id === viewId.value) || savedViews.value.find((v) => v.id === viewId.value) || builtInViews.value[0])

const allColumnFields = computed(() => {
  const d = def.value
  const keys = ['name', ...d.fields.filter((f) => !f.hidden && f.type !== 'json').map((f) => f.key), ...(d.owner || d.queue ? ['ownerId'] : []), 'createdAt', 'updatedAt']
  return [...new Set(keys)].map((k) => fieldOf(d.key, k)).filter(Boolean)
})
const columnFields = computed(() => (customColumns.value || currentView.value.columns || def.value.list || ['name']).map((k) => fieldOf(props.object, k)).filter(Boolean))
const filterFields = computed(() => {
  const keys = new Set([...columnFields.value.map((c) => c.key), ...def.value.fields.filter((f) => ['picklist', 'checkbox', 'date'].includes(f.type) && !f.hidden).map((f) => f.key)])
  if (def.value.owner || def.value.queue) keys.add('ownerId')
  keys.delete('name')
  return [...keys].map((k) => fieldOf(props.object, k)).filter((f) => f && f.type !== 'json' && f.type !== 'polylookup')
})
const lookupOptions = (key) => {
  const ids = [...new Set(records.value.map((r) => r[key]).filter(Boolean))]
  return ids.map((id) => ({ id, label: names.value[id]?.label || id })).sort((a, b) => a.label.localeCompare(b.label)).slice(0, 300)
}
const activeFilterCount = computed(() => Object.values(filters).filter((v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)).length)

function matches(r, key, want) {
  if (want === null || want === undefined || want === '' || (Array.isArray(want) && !want.length)) return true
  const f = fieldOf(props.object, key)
  const v = key === 'name' ? r.name : r[key]
  if (f.type === 'checkbox') return !!v === want
  if (f.type === 'date' || f.type === 'datetime') { const d = (v || '').slice(0, 10); return !!d && d >= want[0] && d <= want[1] }
  if (f.type === 'multipicklist') return (v || []).some((x) => want.includes(x))
  if (Array.isArray(want)) return want.includes(v ?? '__none')
  return formatValue(f, v, names.value).toLowerCase().includes(String(want).toLowerCase())
}
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let rows = records.value.filter((r) => Object.entries(filters).every(([k, w]) => matches(r, k, w)))
  if (q) rows = rows.filter((r) => columnFields.value.some((c) => formatValue(c, c.key === 'name' ? r.name : r[c.key], names.value).toLowerCase().includes(q)))
  const { prop, order } = sort.value
  if (prop && order) {
    const f = fieldOf(props.object, prop)
    const key = (r) => {
      const v = prop === 'name' ? r.name : r[prop]
      if (['number', 'currency', 'percent'].includes(f?.type)) return v ?? -Infinity
      if (['date', 'datetime'].includes(f?.type)) return v || ''
      return formatValue(f, v, names.value).toLowerCase()
    }
    const dir = order === 'ascending' ? 1 : -1
    rows = [...rows].sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * dir })
  }
  return rows
})
const page = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize, pageNo.value * pageSize))
const defaultSort = computed(() => sort.value)
const sortLabel = computed(() => fieldOf(props.object, sort.value.prop)?.label || 'Name')
const now = ref(Date.now())
setInterval(() => (now.value = Date.now()), 30000)
const updatedAgo = computed(() => { const m = Math.round((now.value - loadedAt.value) / 60000); return m < 1 ? 'a few seconds ago' : `${m} minute${m > 1 ? 's' : ''} ago` })

async function load() {
  loading.value = true
  try {
    const res = await listRecords(props.object)
    records.value = res.records
    names.value = res.names
    loadedAt.value = Date.now()
  } finally {
    loading.value = false
  }
}
function applyView(v) {
  for (const k of Object.keys(filters)) delete filters[k]
  Object.assign(filters, JSON.parse(JSON.stringify(v.filters || {})))
  sort.value = v.sort || { prop: 'name', order: 'ascending' }
  search.value = v.search || ''
  customColumns.value = v.columns || null
  pageNo.value = 1
}
const selectView = (id) => { viewId.value = id; applyView(currentView.value) }
const onSort = ({ prop, order }) => { sort.value = { prop, order } }
const clearFilters = () => { for (const k of Object.keys(filters)) delete filters[k] }
const newRecord = () => openForm({ object: props.object })

async function persistViews() {
  await api(`/prefs/views.${props.object}`, { method: 'PUT', body: savedViews.value })
}
async function menu(cmd) {
  if (cmd === 'csv') {
    const cols = columnFields.value.map((c) => ({ label: c.label, text: (r) => formatValue(c, c.key === 'name' ? r.name : r[c.key], names.value) }))
    download(`${def.value.plural.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(filtered.value, cols))
  }
  if (cmd === 'columns') { columnDraft.value = columnFields.value.map((c) => c.key); columnsOpen.value = true }
  if (cmd === 'save') {
    const { value } = await ElMessageBox.prompt('List view name', 'Save list view', { inputValue: '', inputValidator: (v) => !!v?.trim() || 'Enter a name' })
    const v = { id: 'v' + Date.now(), name: value.trim(), saved: true, filters: JSON.parse(JSON.stringify(filters)), sort: sort.value, search: search.value, columns: customColumns.value }
    savedViews.value.push(v)
    await persistViews()
    viewId.value = v.id
    ElMessage.success('List view saved')
  }
  if (cmd === 'delete') {
    savedViews.value = savedViews.value.filter((v) => v.id !== viewId.value)
    await persistViews()
    selectView('all')
  }
}
function applyColumns() {
  const order = allColumnFields.value.map((f) => f.key)
  customColumns.value = [...columnDraft.value].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const saved = savedViews.value.find((v) => v.id === viewId.value)
  if (saved) { saved.columns = customColumns.value; persistViews() }
  columnsOpen.value = false
}
async function assign() {
  await api('/bulk-assign', { method: 'POST', body: { ids: selection.value.map((r) => r.id), ownerId: assignTo.value || null } })
  ElMessage.success(`${selection.value.length} record(s) assigned`)
  assignOpen.value = false
  changed()
}

watch(() => props.object, async () => {
  viewId.value = props.initialView || 'all'
  savedViews.value = (await api(`/prefs/views.${props.object}`, { quiet: true }).catch(() => null)) || []
  applyView(currentView.value)
  await load()
}, { immediate: true })
watch(() => props.initialView, (v) => v && selectView(v))
watch(() => bus.version, load)
watch([search, () => ({ ...filters })], () => (pageNo.value = 1), { deep: true })
</script>

<style scoped>
.list-head { flex-wrap: wrap; }
.view-name { font-size: 18px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; color: var(--ink); }
.pager { padding: 8px 12px; }
.filter-row { margin-bottom: 14px; }
.filter-row label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.col-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
</style>
