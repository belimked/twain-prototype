<template>
  <div>
    <div class="row wrap kpis">
      <div class="kpi"><b>{{ fmt(record.startDate) }} – {{ fmt(record.endDate) }}</b><span>Next Billing Date range</span></div>
      <div class="kpi"><b>{{ record.status }}</b><span>Status</span></div>
      <div class="kpi"><b class="mono">{{ record.approvalCount ?? eligible.length }}</b><span>Approvals</span></div>
      <div class="kpi"><b class="mono">{{ money(record.totalAmount) }}</b><span>Total ex GST</span></div>
    </div>
    <template v-if="record.status !== 'Completed'">
      <div class="placeholder-note">Only Active approvals that are Enrolled for Billing with a Next Billing Date in the range are included. Make sure outstanding lab results are received and mass loads calculated first. Charges use placeholder rates.</div>
      <div class="row mt">
        <span class="grow muted">{{ eligible.length }} approval(s) will be processed in batches of 5.</span>
        <el-button :loading="loadingPreview" @click="preview">Refresh</el-button>
        <el-button type="primary" :disabled="!eligible.length || running" :loading="running" @click="start">Start Batch</el-button>
      </div>
      <el-progress v-if="running || done" :percentage="pct" :status="done ? 'success' : ''" class="mt" />
      <div v-if="running || done" class="muted small mt">{{ done }} of {{ eligible.length }} approvals processed{{ failed ? ` · ${failed} batch(es) failed` : '' }}</div>
      <el-table :data="eligible" size="small" max-height="420" class="mt">
        <el-table-column label="Approval" width="130"><template #default="{ row }"><a class="table-link" @click="openRecord('approval', row.id, row.name)">{{ row.name }}</a></template></el-table-column>
        <el-table-column label="Trading Name" prop="tradingName" min-width="200" />
        <el-table-column label="Next Billing Date" width="150"><template #default="{ row }">{{ fmt(row.nextBillingDate) }}</template></el-table-column>
        <el-table-column label="Quality" width="120"><template #default="{ row }">{{ row.isDeemedQuality ? 'Deemed' : 'Sampled' }}</template></el-table-column>
      </el-table>
    </template>
    <template v-else>
      <div class="row mt"><span class="grow muted">Billing run completed {{ record.runAt ? new Date(record.runAt).toLocaleString('en-AU') : '' }}. Export the file and check it before sending to the Billing Team.</span>
        <el-button type="primary" @click="exportRun">Export Billing Run</el-button></div>
    </template>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { runAction, listRecords, changed } from '../api.js'
import { openRecord } from '../nav.js'
import { toCsv, download } from '../meta.js'
const props = defineProps({ record: Object })
const emit = defineEmits(['changed'])
const eligible = ref([])
const loadingPreview = ref(false)
const running = ref(false)
const done = ref(0)
const failed = ref(0)
const pct = computed(() => (eligible.value.length ? Math.round((done.value / eligible.value.length) * 100) : 0))
const fmt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AU') : '')
const money = (v) => (v == null ? '—' : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(v))
async function preview() {
  loadingPreview.value = true
  try {
    eligible.value = (await runAction('billingPreview', { startDate: props.record.startDate, endDate: props.record.endDate })).approvals
  } finally {
    loadingPreview.value = false
  }
}
async function start() {
  running.value = true
  done.value = 0
  failed.value = 0
  const ids = eligible.value.map((a) => a.id)
  for (let i = 0; i < ids.length; i += 5) {
    try {
      await runAction('billingRunBatch', { runId: props.record.id, approvalIds: ids.slice(i, i + 5) })
    } catch {
      failed.value++
    }
    done.value = Math.min(ids.length, i + 5)
  }
  await runAction('billingRunFinish', { runId: props.record.id })
  running.value = false
  ElMessage.success('Billing run completed')
  changed()
  emit('changed')
}
async function exportRun() {
  const { records, names } = await listRecords('billingCalc', { parentId: props.record.id })
  const cols = [
    ['Calculation', (r) => r.name], ['Approval', (r) => names[r.approvalId]?.label || ''], ['Period Start', (r) => r.periodStart], ['Period End', (r) => r.periodEnd],
    ['Trade Waste kL', (r) => r.tradeWasteKl], ['SS mg/L', (r) => r.ss], ['BOD mg/L', (r) => r.bod], ['N mg/L', (r) => r.n], ['P mg/L', (r) => r.p],
    ['Deemed', (r) => (r.deemed ? 'Y' : 'N')], ['Amount ex GST', (r) => r.amount], ['Invoice', (r) => names[r.invoiceId]?.name || '']
  ].map(([label, f]) => ({ label, text: (r) => String(f(r) ?? '') }))
  download(`${props.record.name}-export.csv`, toCsv(records, cols))
}
watch(() => props.record.id, () => props.record.status !== 'Completed' && preview(), { immediate: true })
</script>
<style scoped>
.kpis { gap: 10px; margin-bottom: 12px; }
.mt { margin-top: 10px; }
</style>
