<template>
  <div class="page">
    <div class="welcome card row">
      <div class="grow">
        <h2>{{ greeting }}, {{ session.user?.displayName.split(' ')[0] }}</h2>
        <div class="muted">{{ ROLES[session.user?.role] }} · {{ new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
      </div>
      <div class="row wrap kpis">
        <div class="kpi clickable" @click="openList('case', { view: 'nc' })"><b>{{ kpi.openNc }}</b><span>Open non-compliance</span></div>
        <div class="kpi"><b>{{ kpi.myOpen }}</b><span>My open items</span></div>
        <div class="kpi"><b>{{ kpi.queue }}</b><span>Unassigned in queues</span></div>
        <div v-if="isCoordinator()" class="kpi clickable" @click="openList('workItem', { view: 'open' })"><b>{{ data?.workItems.length ?? 0 }}</b><span>Work items to approve</span></div>
      </div>
    </div>
    <div class="page-grid" v-loading="!data">
      <div class="col">
        <div class="card">
          <div class="card-head"><el-icon><User /></el-icon><h3 class="grow">My Work Queues</h3></div>
          <el-tabs v-model="mine" class="pad">
            <el-tab-pane :label="`My Tasks (${data?.myTasks.length || 0})`" name="tasks" />
            <el-tab-pane :label="`My TW Cases (${data?.myCases.length || 0})`" name="cases" />
            <el-tab-pane :label="`My Plan Assessments (${data?.myPas.length || 0})`" name="pas" />
          </el-tabs>
          <QueueTable v-if="data" :rows="{ tasks: data.myTasks, cases: data.myCases, pas: data.myPas }[mine]" :object="{ tasks: 'task', cases: 'case', pas: 'planAssessment' }[mine]" :names="data.names" @complete="complete" />
        </div>
        <div class="card">
          <div class="card-head"><el-icon><Collection /></el-icon><h3 class="grow">Trade Waste Queues</h3><span class="muted small">Unassigned work – accept an item to move it to your queue</span></div>
          <el-tabs v-model="queue" class="pad">
            <el-tab-pane :label="`Tasks (${data?.queueTasks.length || 0})`" name="tasks" />
            <el-tab-pane :label="`UF Cases (${data?.queueCases.length || 0})`" name="cases" />
            <el-tab-pane :label="`UF Plan Assessments (${data?.queuePas.length || 0})`" name="pas" />
          </el-tabs>
          <QueueTable v-if="data" :rows="{ tasks: data.queueTasks, cases: data.queueCases, pas: data.queuePas }[queue]" :object="{ tasks: 'task', cases: 'case', pas: 'planAssessment' }[queue]" :names="data.names" accept @accept="accept" />
        </div>
        <div v-if="isCoordinator()" class="card">
          <div class="card-head"><ObjectIcon object="workItem" size="sm" /><h3 class="grow">Approval Work Items</h3><a class="small" @click="openList('workItem')">View all</a></div>
          <QueueTable v-if="data" :rows="data.workItems.slice(0, 10)" object="workItem" :names="data.names" />
        </div>
        <div v-if="data?.ownershipChanges.length" class="card">
          <div class="card-head"><ObjectIcon object="billingAccount" size="sm" /><h3 class="grow">Approvals with Billing Account Ownership Changes</h3></div>
          <QueueTable :rows="data.ownershipChanges" object="approval" :names="data.names" />
        </div>
      </div>
      <div class="col">
        <div class="card">
          <div class="card-head"><el-icon><Clock /></el-icon><h3 class="grow">Recent Records</h3></div>
          <div v-for="r in ws.recent.slice(0, showAllRecent ? 20 : 5)" :key="r.id" class="recent row" @click="openRecord(r.object, r.id, r.label)"><ObjectIcon :object="r.object" size="sm" /><span class="grow">{{ r.label }}</span><span class="muted small">{{ OBJECTS[r.object]?.label }}</span></div>
          <div v-if="!ws.recent.length" class="empty small">Records you open appear here.</div>
          <div v-if="ws.recent.length > 5" class="view-all"><a @click="showAllRecent = !showAllRecent">{{ showAllRecent ? 'Show less' : 'View all' }}</a></div>
        </div>
        <div class="card">
          <div class="card-head"><el-icon><Promotion /></el-icon><h3 class="grow">Shortcuts</h3></div>
          <div class="card-body shortcuts">
            <el-button v-for="s in SHORTCUTS" :key="s.label" @click="s.go()">{{ s.label }}</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, watch, h } from 'vue'
import { ElMessage, ElButton } from 'element-plus'
import { api, session, isCoordinator, updateRecord, bus, changed, userName } from '../api.js'
import { OBJECTS, fieldOf } from '../meta.js'
import { ROLES } from '../../shared/objects.js'
import { ws } from '../workspace.js'
import { openRecord, openList } from '../nav.js'
import { openForm } from '../forms.js'
import ObjectIcon from '../components/ObjectIcon.vue'
import FieldValue from '../components/FieldValue.vue'

const data = ref(null)
const mine = ref('tasks')
const queue = ref('cases')
const showAllRecent = ref(false)
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
const kpi = computed(() => {
  const d = data.value
  if (!d) return { openNc: 0, myOpen: 0, queue: 0 }
  return {
    openNc: d.openNc,
    myOpen: d.myTasks.length + d.myCases.length + d.myPas.length,
    queue: d.queueTasks.length + d.queueCases.length + d.queuePas.length
  }
})
const SHORTCUTS = [
  { label: 'Billing run', go: () => openList('billingRun') },
  { label: 'Open non-compliance', go: () => openList('case', { view: 'nc' }) },
  { label: 'Key corporate accounts', go: () => openList('approval', { view: 'kca' }) },
  { label: 'Scheduled sampling', go: () => openList('samplingEvent', { view: 'open' }) },
  { label: 'New plan assessment', go: () => openForm({ object: 'planAssessment' }) }
]
const COLS = { task: ['subject', 'relatedTo', 'dueDate', 'status', 'priority'], case: ['name', 'subject', 'caseType', 'approvalId', 'status', 'priority'], planAssessment: ['name', 'assessmentType', 'approvalId', 'receivedDate', 'status'], workItem: ['name', 'itemType', 'summary', 'submittedBy', 'submittedAt'], approval: ['name', 'tradingName', 'billingAccountId', 'status'] }
const QueueTable = (p, { emit }) => {
  const cols = COLS[p.object].map((k) => fieldOf(p.object, k))
  if (!p.rows.length) return h('div', { class: 'empty small' }, 'Nothing here.')
  return h('div', { class: 'qwrap' }, h('table', { class: 'qtable' }, [
    h('thead', h('tr', [...cols.map((c) => h('th', c.label)), h('th')])),
    h('tbody', p.rows.slice(0, 12).map((r) => h('tr', { key: r.id }, [
      ...cols.map((c, i) => h('td', i === 0 && c.key !== 'name' ? h('a', { class: 'table-link', onClick: () => openRecord(r.object, r.id, r.name) }, r[c.key]) : h(FieldValue, { field: c, value: c.key === 'name' ? r.name : r[c.key], names: p.names, record: r }))),
      h('td', { class: 'act' }, p.accept ? h(ElButton, { size: 'small', onClick: () => emit('accept', r) }, () => 'Accept') : p.object === 'task' ? h(ElButton, { size: 'small', text: true, onClick: () => emit('complete', r) }, () => 'Complete') : null)
    ])))
  ]))
}
QueueTable.props = ['rows', 'object', 'names', 'accept']
QueueTable.emits = ['accept', 'complete']

async function load() {
  data.value = await api('/home')
}
async function accept(r) {
  await updateRecord(r.id, { ownerId: session.user.id })
  ElMessage.success(`${r.name} accepted – now in your queue`)
  changed()
}
async function complete(r) {
  await updateRecord(r.id, { status: 'Completed' })
  ElMessage.success('Task completed')
  changed()
}
watch(() => bus.version, load, { immediate: true })
</script>
<style scoped>
.welcome { padding: 16px 18px; margin-bottom: 14px; flex-wrap: wrap; gap: 14px; }
.welcome h2 { margin: 0 0 2px; font-size: 20px; }
.kpis { gap: 10px; }
.clickable { cursor: pointer; }
.clickable:hover { background: #eaf2fb; }
.col { min-width: 0; }
.col > .card + .card { margin-top: 14px; }
:deep(.qwrap) { overflow-x: auto; }
.pad { padding: 0 16px; }
.pad :deep(.el-tabs__header) { margin: 0; }
:deep(.qtable) { width: 100%; border-collapse: collapse; font-size: 13px; }
:deep(.qtable th) { text-align: left; font-weight: 600; color: var(--muted); font-size: 12px; padding: 8px 12px; background: #f6f8fb; }
:deep(.qtable td) { padding: 8px 12px; border-top: 1px solid #f0f2f6; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:deep(.qtable td.act) { text-align: right; width: 90px; }
.recent { padding: 8px 16px; cursor: pointer; border-bottom: 1px solid #f2f4f8; }
.recent:hover { background: #f6f9fd; }
.view-all { text-align: center; padding: 8px; font-size: 13px; }
.shortcuts { display: flex; flex-wrap: wrap; gap: 8px; }
.shortcuts .el-button { margin: 0; }
</style>
