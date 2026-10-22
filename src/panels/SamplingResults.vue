<template>
  <div v-loading="loading">
    <el-steps :active="stepIndex" finish-status="success" simple class="steps">
      <el-step title="Scheduled" /><el-step title="Sample Collected" /><el-step title="LIMS Results" /><el-step title="Mass Load" />
    </el-steps>
    <div class="hint muted small">{{ hint }}</div>
    <div class="kpis row wrap">
      <div class="kpi"><b>{{ record.limsId || '—' }}</b><span>LIMS ID</span></div>
      <div class="kpi"><b class="mono">{{ record.volumeKl ?? '—' }}</b><span>24h discharge (kL)</span></div>
      <div class="kpi"><b>{{ sles.length }}</b><span>Sample locations</span></div>
      <div class="kpi"><b>{{ samples.length }}</b><span>Samples</span></div>
      <div class="kpi"><b :class="{ exceeded: exceedCount }">{{ exceedCount }}</b><span>Exceedances</span></div>
    </div>
    <div class="toolbar mb"><span class="grow" /><el-button size="small" @click="addSle">Add Sample Location Event</el-button></div>
    <div v-for="sle in sles" :key="sle.id" class="card sle">
      <div class="card-head">
        <ObjectIcon object="sampleLocationEvent" size="sm" />
        <div class="grow">
          <a class="table-link" @click="openRecord('sampleLocationEvent', sle.id, sle.name)">{{ sle.name }}</a>
          <span class="muted small"> · {{ names[sle.sampleLocationId]?.label || locName(sle.sampleLocationId) }}</span>
          <span v-if="sle.exclusionReason" class="muted small"> · {{ sle.exclusionReason }}</span>
        </div>
        <el-tooltip content="Samples at this location in this event are ignored by the billing run"><el-switch :model-value="!!sle.excludedFromBilling" active-text="Excluded from billing" size="small" @change="(v) => exclude(sle, v)" /></el-tooltip>
        <el-button size="small" text @click="addSample(sle)">+ Sample</el-button>
      </div>
      <div v-for="s in samplesOf(sle.id)" :key="s.id" class="sample">
        <div class="sample-head row">
          <ObjectIcon object="sample" size="sm" />
          <div class="grow">
            <a class="table-link" @click="openRecord('sample', s.id, s.name)">{{ s.name }}</a>
            <span class="muted small"> · {{ s.method }} · {{ s.sampleType || 'Aqueous' }} · {{ s.limsSampleId || 'no LIMS ID yet' }}</span>
          </div>
          <StatusTag :value="s.status" />
          <el-button size="small" text @click="addResult(s)">+ Result</el-button>
        </div>
        <el-table :data="resultsOf(s.id)" size="small">
          <el-table-column label="Parameter" min-width="180"><template #default="{ row }"><a @click="openRecord('sampleResult', row.id, row.name)">{{ row.parameterName }}</a></template></el-table-column>
          <el-table-column label="Result" width="100"><template #default="{ row }"><span class="mono" :class="{ exceeded: row.exceeded }">{{ row.value }}</span></template></el-table-column>
          <el-table-column label="Unit" prop="unit" width="80" />
          <el-table-column label="Upper Conc." prop="limit" width="105" />
          <el-table-column label="Lower Conc." width="105"><template #default="{ row }">{{ row.lowerLimit ?? '' }}</template></el-table-column>
          <el-table-column label="NC Tol." width="80"><template #default="{ row }">{{ row.ncTolerance != null ? row.ncTolerance + '%' : '' }}</template></el-table-column>
          <el-table-column label="Exceeded" width="100"><template #default="{ row }"><el-tag v-if="row.exceeded" type="danger" size="small" round>Exceeded</el-tag></template></el-table-column>
          <el-table-column label="Mass Load (kg)" width="125"><template #default="{ row }"><span class="mono">{{ row.massLoadKg ?? '' }}</span></template></el-table-column>
          <el-table-column label="Source" width="130"><template #default="{ row }"><span class="muted small">{{ row.resultSource || '' }}</span></template></el-table-column>
        </el-table>
        <div v-if="!resultsOf(s.id).length" class="empty small">Waiting for laboratory results.</div>
      </div>
      <div v-if="!samplesOf(sle.id).length" class="empty small">No samples at this location yet.</div>
    </div>
    <div v-if="!loading && !sles.length" class="card empty">No sample location events yet. They are created for the default sample locations when the status changes to "Sample Collected".</div>
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
const sles = ref([])
const samples = ref([])
const results = ref([])
const locations = ref([])
const names = ref({})
const loading = ref(false)
const samplesOf = (sleId) => samples.value.filter((s) => s.sampleLocationEventId === sleId)
const resultsOf = (id) => results.value.filter((r) => r.sampleId === id).sort((a, b) => a.parameterName.localeCompare(b.parameterName))
const locName = (id) => locations.value.find((l) => l.id === id)?.name || ''
const exceedCount = computed(() => results.value.filter((r) => r.exceeded).length)
const stepIndex = computed(() => ({ Scheduled: 1, 'Sample Collected': 2, Received: props.record.massLoadCalculated ? 4 : 3 }[props.record.status] ?? 0))
const hint = computed(() => ({
  Scheduled: 'Next: record the sample date and collector, then set the status to "Sample Collected" – LIMS creates an ID and the default sample locations get a sample location event and a sample.',
  'Sample Collected': 'Next: use "Simulate LIMS Results" to receive results from SAS Labs. Exceedances raise one Non-Compliance case for the event.',
  Received: props.record.massLoadCalculated ? 'Complete – composite results are included in the next billing run.' : 'Next: add the Sampling Event Meter with the 24h start and end readings, then "Calculate Mass Load" so the composite results are picked up by billing.',
  Cancelled: 'This sampling event was cancelled.'
}[props.record.status]))
async function load() {
  loading.value = true
  try {
    const [e, s, r, l] = await Promise.all([
      listRecords('sampleLocationEvent', { parentId: props.record.id }), listRecords('sample', { 'f.samplingEventId': props.record.id }),
      listRecords('sampleResult', { 'f.samplingEventId': props.record.id }), listRecords('sampleLocation', { approvalId: props.record.approvalId })
    ])
    sles.value = e.records
    names.value = { ...e.names, ...s.names }
    samples.value = s.records
    results.value = r.records
    locations.value = l.records
  } finally {
    loading.value = false
  }
}
const evName = () => ({ [props.record.id]: { name: props.record.name, label: props.record.name, object: 'samplingEvent' } })
const addSle = () => openForm({ object: 'sampleLocationEvent', defaults: { samplingEventId: props.record.id, approvalId: props.record.approvalId }, names: evName(), onSaved: load })
const addSample = (sle) => openForm({ object: 'sample', defaults: { sampleLocationEventId: sle.id, samplingEventId: props.record.id, approvalId: props.record.approvalId, method: locations.value.find((l) => l.id === sle.sampleLocationId)?.method || 'Composite' }, names: { ...evName(), [sle.id]: { name: sle.name, label: sle.name, object: 'sampleLocationEvent' } }, onSaved: load })
const addResult = (s) => openForm({ object: 'sampleResult', defaults: { sampleId: s.id }, names: { [s.id]: { name: s.name, label: s.name } }, title: `Add a Sample Parameter – ${s.name}`, onSaved: load })
async function exclude(sle, v) {
  await updateRecord(sle.id, { excludedFromBilling: v, exclusionReason: v ? 'Excluded by officer' : null })
  changed()
}
watch(() => [props.record.id, props.record.status, props.record.volumeKl, bus.version], load, { immediate: true })
</script>
<style scoped>
.steps { margin-bottom: 8px; }
.hint { margin: 0 2px 12px; }
.kpis { gap: 10px; margin-bottom: 10px; }
.mb { margin-bottom: 10px; }
.sle + .sle { margin-top: 12px; }
.sle .card-head { flex-wrap: wrap; }
.sample { margin: 8px 0 0 12px; padding-left: 10px; border-left: 2px solid var(--el-border-color); }
.sample-head { align-items: center; gap: 8px; margin-bottom: 4px; }
</style>
