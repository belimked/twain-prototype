<template>
  <div v-loading="loading">
    <div class="card">
      <div class="card-head"><ObjectIcon object="meter" size="sm" /><h3 class="grow">Active Meters <span class="badge">{{ meters.filter((m) => !m.alternateSupplyId).length }}</span></h3>
        <el-button size="small" @click="newMeter('HiAffinity')">Add a HiAffinity Meter</el-button>
        <el-button size="small" @click="newMeter('Manual')">Add Manual Meter</el-button>
      </div>
      <el-table :data="meters.filter((m) => !m.alternateSupplyId)" size="small">
        <el-table-column label="Meter" min-width="120"><template #default="{ row }"><a class="table-link" @click="openRecord('meter', row.id, row.name)">{{ row.name }}</a></template></el-table-column>
        <el-table-column label="Type" prop="kind" width="100" />
        <el-table-column label="Source" prop="source" width="110" />
        <el-table-column label="Used for Billing" width="130"><template #default="{ row }"><el-icon :color="row.usedForBilling ? '#2e844a' : '#c9ced6'"><component :is="row.usedForBilling ? 'CircleCheckFilled' : 'Remove'" /></el-icon></template></el-table-column>
        <el-table-column label="Latest Reading" width="150"><template #default="{ row }">{{ latest(row.id)?.reading ?? '' }} <span class="muted small">{{ latest(row.id)?.readingDate }}</span></template></el-table-column>
        <el-table-column label="Last Period (kL)" width="140"><template #default="{ row }"><span class="mono">{{ latest(row.id)?.consumption ?? '' }}</span></template></el-table-column>
        <el-table-column label="Trend (8 quarters)" min-width="130"><template #default="{ row }"><div class="spark"><span v-for="r in trend(row.id)" :key="r.id" :style="{ height: r.h + '%' }" :title="`${r.readingDate}: ${r.consumption} kL`" /></div></template></el-table-column>
        <el-table-column width="130" align="right" fixed="right"><template #default="{ row }"><el-button size="small" @click="newReading(row)">Add Reading</el-button></template></el-table-column>
      </el-table>
    </div>

    <div class="card">
      <div class="card-head"><ObjectIcon object="meterReading" size="sm" /><h3 class="grow">Meter Readings <span class="badge">{{ shownReadings.length }}</span></h3>
        <el-select v-model="meterFilter" size="small" style="width: 220px">
          <el-option value="all" label="All meters" />
          <el-option v-for="m in meters" :key="m.id" :value="m.id" :label="`${m.name} (${m.alternateSupplyId ? 'Alt. supply' : m.kind})`" />
        </el-select>
      </div>
      <el-table :data="shownReadings.slice(0, 60)" size="small" max-height="420">
        <el-table-column label="Reading" width="130"><template #default="{ row }"><a class="table-link" @click="openRecord('meterReading', row.id, row.name)">{{ row.name }}</a></template></el-table-column>
        <el-table-column label="Meter" width="150"><template #default="{ row }">{{ meterName(row.meterId) }}</template></el-table-column>
        <el-table-column label="Reading Date" width="130"><template #default="{ row }">{{ fmtDate(row.readingDate) }}</template></el-table-column>
        <el-table-column label="Reading (kL)" prop="reading" width="130" />
        <el-table-column label="Consumption (kL)" prop="consumption" width="150" />
        <el-table-column label="Type" prop="readingType" />
      </el-table>
    </div>

    <RelatedList object="alternateSupply" field="approvalId" title="Alternate Supplies" :parent="record" />
    <div class="muted small note">Alternate supply meters are recorded for information and are not included in the billing run.</div>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { listRecords, bus } from '../api.js'
import { openForm } from '../forms.js'
import { openRecord } from '../nav.js'
import ObjectIcon from '../components/ObjectIcon.vue'
import RelatedList from '../components/RelatedList.vue'

const props = defineProps({ record: Object })
const meters = ref([])
const readings = ref([])
const loading = ref(false)
const meterFilter = ref('all')
const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AU') : '')
const byDateDesc = (a, b) => b.readingDate.localeCompare(a.readingDate)
const shownReadings = computed(() => readings.value.filter((r) => meterFilter.value === 'all' || r.meterId === meterFilter.value).sort(byDateDesc))
const latest = (id) => readings.value.filter((r) => r.meterId === id).sort(byDateDesc)[0]
const meterName = (id) => meters.value.find((m) => m.id === id)?.name || ''
function trend(id) {
  const rs = readings.value.filter((r) => r.meterId === id && r.consumption != null).sort((a, b) => a.readingDate.localeCompare(b.readingDate)).slice(-8)
  const max = Math.max(1, ...rs.map((r) => r.consumption))
  return rs.map((r) => ({ ...r, h: Math.max(6, (r.consumption / max) * 100) }))
}
async function load() {
  loading.value = true
  try {
    const [m, r] = await Promise.all([listRecords('meter', { approvalId: props.record.id }), listRecords('meterReading', { approvalId: props.record.id })])
    meters.value = m.records
    readings.value = r.records
  } finally {
    loading.value = false
  }
}
const nm = () => ({ [props.record.id]: { name: props.record.name, label: props.record.name, object: 'approval' } })
const newMeter = (source) => openForm({ object: 'meter', defaults: { approvalId: props.record.id, source, usedForBilling: source === 'HiAffinity', kind: 'Head Meter' }, names: nm(), title: source === 'HiAffinity' ? 'Add a HiAffinity Meter' : 'Add Manual Meter', onSaved: load })
const newReading = (m) => openForm({ object: 'meterReading', defaults: { meterId: m.id }, names: { [m.id]: { name: m.name, label: m.name } }, title: `Add a Manual Meter Reading – ${m.name}`, onSaved: load })
watch(() => [props.record.id, bus.version], load, { immediate: true })
</script>
<style scoped>
.spark { display: flex; align-items: flex-end; gap: 3px; height: 26px; }
.spark span { width: 10px; background: #8fc1ef; border-radius: 2px 2px 0 0; }
.note { margin-top: 6px; }
</style>
