<template>
  <div v-loading="loading">
    <el-steps :active="stepIndex" finish-status="success" simple class="steps">
      <el-step title="Scheduled" /><el-step title="Sample Collected" /><el-step title="LIMS Results" /><el-step title="Mass Load" />
    </el-steps>
    <div class="hint muted small">{{ hint }}</div>
    <div class="kpis row wrap">
      <div class="kpi"><b>{{ record.limsId || '—' }}</b><span>LIMS ID</span></div>
      <div class="kpi"><b class="mono">{{ record.volumeKl ?? '—' }}</b><span>24h discharge (kL)</span></div>
      <div class="kpi"><b>{{ samples.length }}</b><span>Samples</span></div>
      <div class="kpi"><b :class="{ exceeded: exceedCount }">{{ exceedCount }}</b><span>Exceedances</span></div>
    </div>
    <div class="toolbar mb"><span class="grow" /><el-button size="small" @click="addSample">Add Sample</el-button></div>
    <div v-for="s in samples" :key="s.id" class="card sample">
      <div class="card-head">
        <ObjectIcon object="sample" size="sm" />
        <div class="grow">
          <a class="table-link" @click="openRecord('sample', s.id, s.name)">{{ s.name }}</a>
          <span class="muted small"> · {{ names[s.sampleLocationId]?.label || locName(s.sampleLocationId) }} · {{ s.method }} · {{ s.limsSampleId || 'no LIMS ID yet' }}</span>
        </div>
        <StatusTag :value="s.status" />
        <el-tooltip content="Excluded samples are ignored by the billing run"><el-switch :model-value="!!s.excludeFromBilling" active-text="Exclude from billing" size="small" @change="(v) => exclude(s, v)" /></el-tooltip>
        <el-button size="small" text @click="addResult(s)">+ Result</el-button>
      </div>
      <el-table :data="resultsOf(s.id)" size="small">
        <el-table-column label="Parameter" min-width="200"><template #default="{ row }"><a @click="openRecord('sampleResult', row.id, row.name)">{{ row.parameterName }}</a></template></el-table-column>
        <el-table-column label="Result" width="110"><template #default="{ row }"><span class="mono" :class="{ exceeded: row.exceeded }">{{ row.value }}</span></template></el-table-column>
        <el-table-column label="Unit" prop="unit" width="90" />
        <el-table-column label="Acceptance Limit" prop="limit" width="140" />
        <el-table-column label="Exceeded" width="100"><template #default="{ row }"><el-tag v-if="row.exceeded" type="danger" size="small" round>Exceeded</el-tag></template></el-table-column>
        <el-table-column label="Mass Load (kg)" width="140"><template #default="{ row }"><span class="mono">{{ row.massLoadKg ?? '' }}</span></template></el-table-column>
      </el-table>
      <div v-if="!resultsOf(s.id).length" class="empty small">Waiting for laboratory results.</div>
    </div>
    <div v-if="!loading && !samples.length" class="card empty">No samples yet. They are created for the default sample locations when the status changes to "Sample Collected".</div>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { listRecords, updateRecord, bus, changed } from '../api.js'
import { openForm } from '../forms.js'
import { openRecord } from '../nav.js'
import ObjectIcon from '../components/ObjectIcon.vue'
import StatusTag from '../components/StatusTag.vue'
const props = defineProps({ record: Object })
const samples = ref([])
const results = ref([])
const locations = ref([])
const names = ref({})
const loading = ref(false)
const resultsOf = (id) => results.value.filter((r) => r.sampleId === id).sort((a, b) => a.parameterName.localeCompare(b.parameterName))
const locName = (id) => locations.value.find((l) => l.id === id)?.name || ''
const exceedCount = computed(() => results.value.filter((r) => r.exceeded).length)
const stepIndex = computed(() => ({ Scheduled: 1, 'Sample Collected': 2, 'Results Received': props.record.massLoadCalculated ? 4 : 3 }[props.record.status] ?? 0))
const hint = computed(() => ({
  Scheduled: 'Next: record the sample date and collector, then set the status to "Sample Collected" – LIMS creates an ID and the default sample locations get samples.',
  'Sample Collected': 'Next: use "Simulate LIMS Results" to receive results from SAS Labs. Exceedances raise one Non-Compliance case for the event.',
  'Results Received': props.record.massLoadCalculated ? 'Complete – composite results are included in the next billing run.' : 'Next: enter the 24h meter readings and "Calculate Mass Load" so the composite results are picked up by billing.',
  Cancelled: 'This sampling event was cancelled.'
}[props.record.status]))
async function load() {
  loading.value = true
  try {
    const [s, r, l] = await Promise.all([listRecords('sample', { parentId: props.record.id }), listRecords('sampleResult', { 'f.samplingEventId': props.record.id }), listRecords('sampleLocation', { approvalId: props.record.approvalId })])
    samples.value = s.records
    names.value = s.names
    results.value = r.records
    locations.value = l.records
  } finally {
    loading.value = false
  }
}
const addSample = () => openForm({ object: 'sample', defaults: { samplingEventId: props.record.id, approvalId: props.record.approvalId }, names: { [props.record.id]: { name: props.record.name, label: props.record.name } }, onSaved: load })
const addResult = (s) => openForm({ object: 'sampleResult', defaults: { sampleId: s.id }, names: { [s.id]: { name: s.name, label: s.name } }, title: `Add a Sample Parameter – ${s.name}`, onSaved: load })
async function exclude(s, v) {
  await updateRecord(s.id, { excludeFromBilling: v, excludeReason: v ? 'Excluded by officer' : null })
  changed()
}
watch(() => [props.record.id, props.record.status, bus.version], load, { immediate: true })
</script>
<style scoped>
.steps { margin-bottom: 8px; }
.hint { margin: 0 2px 12px; }
.kpis { gap: 10px; margin-bottom: 10px; }
.mb { margin-bottom: 10px; }
.sample + .sample { margin-top: 12px; }
.sample .card-head { flex-wrap: wrap; }
</style>
