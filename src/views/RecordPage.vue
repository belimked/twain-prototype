<template>
  <div class="page" v-if="record">
    <div class="card header-card">
      <div class="row header-top">
        <ObjectIcon :object="object" size="lg" />
        <div class="grow">
          <div class="muted small">{{ def.label }}</div>
          <h1 class="title">{{ record.name }}<span v-if="subtitle" class="subtitle"> · {{ subtitle }}</span>
            <el-icon class="star" :class="{ on: fav }" @click="toggleFavourite({ ...record, label: title })"><component :is="fav ? 'StarFilled' : 'Star'" /></el-icon>
          </h1>
        </div>
        <div class="toolbar">
          <el-button v-for="a in primaryActions" :key="a.key" :type="a.primary ? 'primary' : ''" :loading="busy === a.key" @click="act(a.key)">{{ a.label }}</el-button>
          <el-button v-if="!layout.noEdit" @click="edit">Edit</el-button>
          <el-dropdown trigger="click" @command="act">
            <el-button :icon="'More'" />
            <template #dropdown><el-dropdown-menu>
              <el-dropdown-item v-for="a in menuActions" :key="a.key" :command="a.key">{{ a.label }}</el-dropdown-item>
              <el-dropdown-item v-if="def.owner || def.queue" command="owner" divided>Change Owner</el-dropdown-item>
              <el-dropdown-item v-if="!layout.noEdit" command="clone">Clone</el-dropdown-item>
              <el-dropdown-item v-if="isCoordinator()" command="delete">Delete</el-dropdown-item>
            </el-dropdown-menu></template>
          </el-dropdown>
        </div>
      </div>
      <div class="highlights">
        <div v-for="f in highlights" :key="f.key" class="hl">
          <div class="muted small">{{ f.label }}</div>
          <div class="hl-val"><FieldValue :field="f" :value="record[f.key]" :names="names" :record="record" /></div>
        </div>
      </div>
    </div>

    <PathBar v-if="pathField" :options="pathField.options" :value="record[pathField.key]" :readonly="!!pathField.readonly" @select="setStatus" />

    <div :class="hasSide ? 'page-grid' : ''">
      <div class="card main-card">
        <el-tabs v-model="tab" class="record-tabs">
          <el-tab-pane v-for="t in layout.tabs" :key="t.key" :name="t.key">
            <template #label>{{ t.label }}<span v-if="tabCount(t)" class="badge tab-badge">{{ tabCount(t) }}</span></template>
          </el-tab-pane>
        </el-tabs>
        <div class="tab-body">
          <template v-for="t in layout.tabs" :key="t.key">
            <template v-if="t.key === tab">
              <RecordDetails v-if="t.key === 'details'" :record="record" :names="names" @saved="onSaved" />
              <HistoryList v-else-if="t.key === 'history'" :record="record" :object="object" />
              <component v-else-if="t.component" :is="PANELS[t.component]" :record="record" :names="names" @changed="reload" />
              <div v-else class="related-stack">
                <RelatedList v-for="r in t.related" :key="r.object + r.field" v-bind="r" :parent="{ ...record, label: title }" />
              </div>
            </template>
          </template>
        </div>
      </div>
      <div v-if="hasSide" class="side">
        <component v-if="layout.side" :is="PANELS[layout.side]" :record="record" :names="names" @changed="reload" />
        <ActivityPanel v-if="layout.activity" :record="record" />
        <FilesCard v-if="layout.files" :record="record" />
      </div>
    </div>

    <el-dialog v-model="ownerOpen" title="Change Owner" width="420px">
      <el-select v-model="newOwner" clearable filterable placeholder="Unassigned (Trade Waste Queue)" style="width: 100%">
        <el-option v-for="u in session.users" :key="u.id" :value="u.id" :label="`${u.displayName} – ${ROLES[u.role]}`" />
      </el-select>
      <template #footer><el-button @click="ownerOpen = false">Cancel</el-button><el-button type="primary" @click="saveOwner">Change Owner</el-button></template>
    </el-dialog>

    <el-dialog v-model="freqOpen" title="Update Inspection Frequencies" width="460px">
      <p class="muted small">Changes are sent to a Trade Waste Coordinator as an Approval Work Item (Coordinators apply them directly).</p>
      <div v-for="k in ['freqPerformanceReview', 'freqApprovalReview', 'freqSampling']" :key="k" class="freq-row">
        <label>{{ def.fieldMap[k].label }}</label><el-input-number v-model="freq[k]" :min="0" :max="120" :controls="false" />
      </div>
      <template #footer><el-button @click="freqOpen = false">Cancel</el-button><el-button type="primary" @click="saveFreq">Save</el-button></template>
    </el-dialog>
  </div>
  <div v-else class="page"><div class="card empty" v-loading="true" style="height: 240px" /></div>
</template>

<script setup>
import { computed, ref, watch, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { OBJECTS, fieldOf, recordTitle } from '../meta.js'
import { ROLES } from '../../shared/objects.js'
import { api, getRecord, updateRecord, runAction, session, isCoordinator, bus, changed } from '../api.js'
import { layoutOf } from '../layouts.js'
import { openForm } from '../forms.js'
import { openTab, closeTab, isFavourite, toggleFavourite } from '../workspace.js'
import { openRecord } from '../nav.js'
import router from '../router.js'
import ObjectIcon from '../components/ObjectIcon.vue'
import FieldValue from '../components/FieldValue.vue'
import PathBar from '../components/PathBar.vue'
import RecordDetails from '../components/RecordDetails.vue'
import RelatedList from '../components/RelatedList.vue'
import HistoryList from '../components/HistoryList.vue'
import ActivityPanel from '../components/ActivityPanel.vue'
import FilesCard from '../components/FilesCard.vue'
import { PANELS } from '../panels/index.js'

const route = useRoute()
const object = computed(() => route.params.object)
const id = computed(() => route.params.id)
const def = computed(() => OBJECTS[object.value])
const layout = computed(() => layoutOf(object.value))
const record = ref(null)
const names = ref({})
const counts = ref({})
const tab = ref('details')
const busy = ref('')
const ownerOpen = ref(false)
const newOwner = ref(null)
const freqOpen = ref(false)
const freq = reactive({})

const title = computed(() => recordTitle(record.value))
const subtitle = computed(() => title.value.split(' · ')[1] || '')
const fav = computed(() => isFavourite(id.value))
const highlights = computed(() => (def.value.highlights || def.value.list.slice(1, 6)).map((k) => fieldOf(object.value, k)).filter(Boolean))
const pathField = computed(() => (def.value.path ? def.value.fieldMap[def.value.path] : null))
const hasSide = computed(() => layout.value.side || layout.value.activity || layout.value.files)

const ACTIONS = {
  cancelApproval: { label: 'Cancel Approval', show: (r) => r.status !== 'Cancelled' },
  changeFrequencies: { label: 'Update Inspection Frequencies', show: (r) => r.status === 'Active' },
  setDefaultParameters: { label: 'Set Default Sample Parameters' },
  addCondition: { label: 'Add Conditions' },
  newNonCompliance: { label: 'New Non-Compliance Case', primary: true },
  newTask: { label: 'New Task' },
  limsResults: { label: 'Simulate LIMS Results', primary: true, show: (r) => r.status === 'Sample Collected' },
  massLoad: { label: 'Calculate Mass Load', primary: true, show: (r) => r.status === 'Received' && !r.massLoadCalculated },
  completeTask: { label: 'Mark Complete', primary: true, show: (r) => r.status !== 'Completed' },
  followUp: { label: 'Create Follow-Up Task' },
  endorseInvoice: { label: 'Send for Endorsement', primary: true, show: (r) => r.status === 'Draft' }
}
const actionList = computed(() => (layout.value.actions || []).map((k) => ({ key: k, ...ACTIONS[k] })).filter((a) => !a.show || a.show(record.value)))
const primaryActions = computed(() => actionList.value.filter((a) => a.primary))
const menuActions = computed(() => actionList.value.filter((a) => !a.primary))

function tabCount(t) {
  if (!t.related || t.related.some((r) => r.poly)) return 0
  return t.related.reduce((s, r) => s + (r.field === 'approvalId' || OBJECTS[r.object].parent === r.field ? counts.value[r.object] || 0 : 0), 0)
}

async function reload() {
  const current = id.value
  // Leaving the page changes the route before this component unmounts.
  if (!current) return
  try {
    const res = await getRecord(current)
    if (current !== id.value) return
    if (res.record.object !== object.value) return router.replace(`/r/${res.record.object}/${res.record.id}`)
    record.value = res.record
    names.value = res.names
    counts.value = res.counts
    openTab({ ...res.record, label: recordTitle(res.record) })
  } catch (e) {
    if (/not found/i.test(e.message) && current === id.value) { closeTab(current); router.replace('/home') }
  }
}
const onSaved = (r) => { record.value = r; changed() }
const edit = () => openForm({ object: object.value, record: record.value, names: names.value, onSaved: (r) => { record.value = r; reload() } })

async function setStatus(s) {
  const f = pathField.value
  if (record.value[f.key] === s) return
  if (object.value === 'approval' && s === 'Cancelled') return act('cancelApproval')
  if (object.value === 'case' && s === 'Closed' && record.value.caseType === 'Non-Compliance' && !(record.value.outcome && record.value.preventativeAction && record.value.correctiveAction)) {
    ElMessage.info('Complete Outcome, Preventative Action and Corrective Action to close the case')
    return openForm({ object: 'case', record: { ...record.value, status: 'Closed' }, names: names.value, title: `Close ${record.value.name}`, onSaved: () => reload() })
  }
  if (object.value === 'planAssessment' && s === 'Completed' && !record.value.outcome) {
    return openForm({ object: 'planAssessment', record: { ...record.value, status: 'Completed' }, names: names.value, title: `Complete ${record.value.name}`, onSaved: () => reload() })
  }
  await ElMessageBox.confirm(`Change ${f.label} to "${s}"?`, 'Mark Status', { confirmButtonText: 'Mark as Current Status' })
  const { record: r } = await updateRecord(record.value.id, { [f.key]: s })
  record.value = r
  ElMessage.success(`${f.label} changed to ${s}`)
  changed()
}

async function act(key) {
  const r = record.value
  busy.value = key
  try {
    if (key === 'owner') { newOwner.value = r.ownerId; ownerOpen.value = true }
    if (key === 'clone') {
      const copy = JSON.parse(JSON.stringify(r))
      for (const k of ['id', 'name', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy']) delete copy[k]
      openForm({ object: object.value, defaults: copy, names: names.value, title: `Clone ${r.name}` })
    }
    if (key === 'delete') {
      await ElMessageBox.confirm(`Delete ${r.name}? Prefer changing the status where possible.`, 'Delete record', { type: 'warning', confirmButtonText: 'Delete' })
      await api(`/r/${r.id}`, { method: 'DELETE' })
      closeTab(r.id)
      ElMessage.success('Deleted')
      router.push(`/o/${object.value}`)
    }
    if (key === 'cancelApproval') {
      const { value } = await ElMessageBox.prompt('Reason for cancelling this approval. A Trade Waste Coordinator must approve it.', `Cancel ${r.name}`, { inputType: 'textarea', inputValidator: (v) => !!v?.trim() || 'Enter a reason', confirmButtonText: 'Submit for Approval' })
      const res = await runAction('cancelApproval', { approvalId: r.id, reason: value })
      ElMessage.success(`Approval Work Item ${res.workItemName} created`)
      changed()
    }
    if (key === 'changeFrequencies') {
      for (const k of ['freqPerformanceReview', 'freqApprovalReview', 'freqSampling']) freq[k] = r[k] ?? undefined
      freqOpen.value = true
    }
    if (key === 'setDefaultParameters') {
      const res = await runAction('setDefaultParameters', { approvalId: r.id })
      ElMessage.success(res.added ? `${res.added} default sample parameter(s) added` : 'Default sample parameters are already set')
      changed()
    }
    if (key === 'newNonCompliance') {
      const d = { caseType: 'Non-Compliance', status: 'New', reportedBy: 'UU Internal', incidentDate: new Date().toISOString().slice(0, 10) }
      if (object.value === 'approval') Object.assign(d, { approvalId: r.id, subject: `Non-compliance – ${r.tradingName}` })
      if (object.value === 'pts') Object.assign(d, { approvalId: r.approvalId, ptsId: r.id, occupierId: r.occupierId, subject: `Pre-treatment non-compliance – ${r.name}`, nonComplianceType: 'Pre-treatment Not Maintained' })
      if (object.value === 'inspection') Object.assign(d, { approvalId: r.approvalId, inspectionId: r.id, ptsId: r.ptsId, subject: `Inspection non-compliance – ${r.name}`, nonComplianceType: r.nonComplianceItems?.[0] || null, description: r.observations })
      openForm({ object: 'case', defaults: d, names: { ...names.value, [r.id]: { name: r.name, label: title.value, object: r.object } } })
    }
    if (key === 'addCondition') {
      openForm({ object: 'approvalCondition', defaults: { approvalId: r.id }, names: { ...names.value, [r.id]: { name: r.name, label: title.value, object: r.object } }, title: `Add a Condition – ${r.name}`, onSaved: () => { tab.value = 'related'; reload(); changed() } })
    }
    if (key === 'newTask' || key === 'followUp') {
      const rel = key === 'followUp' ? r.relatedTo : { object: r.object, id: r.id }
      openForm({ object: 'task', defaults: { relatedTo: rel, subject: key === 'followUp' ? `Follow-up: ${r.subject}` : '' }, names: { ...names.value, [r.id]: { name: r.name, label: title.value, object: r.object } } })
    }
    if (key === 'limsResults') {
      const res = await runAction('limsResults', { eventId: r.id })
      ElMessage.success(`${res.results} result(s) received from LIMS${res.exceeded ? ` – ${res.exceeded} exceedance(s), case ${res.caseName} raised` : ''}`)
      tab.value = 'samples'
      await reload()
      changed()
    }
    if (key === 'massLoad') {
      await ElMessageBox.confirm('Calculate the mass load for the composite samples of this event?', 'Calculate Mass Load', { confirmButtonText: 'Yes, Calculate Mass Load' })
      const res = await runAction('massLoad', { eventId: r.id })
      ElMessage.success(`Mass load calculated for ${res.updated} result(s)`)
      await reload()
      changed()
    }
    if (key === 'completeTask') { record.value = (await updateRecord(r.id, { status: 'Completed' })).record; changed() }
    if (key === 'endorseInvoice') {
      const res = await runAction('endorseInvoice', { invoiceId: r.id })
      ElMessage.success(`Sent for endorsement as ${res.workItemName}`)
      await reload()
      changed()
    }
  } catch (e) {
    if (e !== 'cancel' && e !== 'close' && e?.message) console.warn(e.message)
  } finally {
    busy.value = ''
  }
}
async function saveOwner() {
  record.value = (await updateRecord(record.value.id, { ownerId: newOwner.value || null })).record
  ownerOpen.value = false
  ElMessage.success('Owner changed')
  changed()
}
async function saveFreq() {
  const res = await runAction('changeFrequencies', { approvalId: record.value.id, values: { ...freq } })
  freqOpen.value = false
  ElMessage.success(res.workItemName ? `Sent for approval as ${res.workItemName}` : 'Inspection frequencies updated')
  await reload()
  changed()
}

watch(id, (v) => {
  if (!v) return
  record.value = null
  const q = route.query.tab
  tab.value = q && layout.value.tabs.some((t) => t.key === q) ? q : layout.value.tabs[0].key
  reload()
}, { immediate: true })
watch(() => bus.version, () => record.value && reload())
defineExpose({ openRecord })
</script>

<style scoped>
.header-card { padding: 14px 16px; margin-bottom: 14px; }
.header-top { align-items: flex-start; flex-wrap: wrap; }
.title { margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.subtitle { font-weight: 500; color: #3e4954; }
.star { cursor: pointer; color: #b0b7c3; font-size: 18px; }
.star.on { color: #f2b200; }
.highlights { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line); }
.hl { min-width: 110px; max-width: 280px; }
.hl-val { font-weight: 550; margin-top: 2px; }
.main-card { padding: 0 16px 16px; min-width: 0; }
.record-tabs :deep(.el-tabs__header) { margin-bottom: 12px; }
.record-tabs :deep(.el-tabs__item) { padding: 0 11px; font-size: 13.5px; }
.record-tabs :deep(.el-tabs__nav-wrap) { padding-left: 0; }
.tab-badge { margin-left: 6px; }
.related-stack > .card + .card { margin-top: 14px; }
.side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.side > .card + .card { margin-top: 0; }
.freq-row { display: flex; align-items: center; justify-content: space-between; margin: 8px 0; }
</style>
