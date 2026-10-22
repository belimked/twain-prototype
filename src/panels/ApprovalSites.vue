<template>
  <div v-loading="loading">
    <div class="toolbar mb">
      <span class="muted small grow">{{ sites.length }} site(s) · {{ occupiers.length }} occupier(s) · {{ pts.length }} pre-treatment system(s)</span>
      <el-button size="small" @click="newSite">New Site</el-button>
    </div>
    <div v-for="s in sites" :key="s.id" class="card site">
      <div class="card-head">
        <ObjectIcon object="site" size="sm" />
        <div class="grow">
          <a class="table-link" @click="openRecord('site', s.id, s.name)">{{ s.name }}</a>
          <div class="muted small">{{ s.address }}{{ s.suburb ? ', ' + s.suburb : '' }} · {{ s.siteType || '—' }} · {{ s.activityType || 'No activity type' }}</div>
        </div>
        <StatusTag :value="s.status" />
        <el-button size="small" @click="newOccupier(s)">New Occupier</el-button>
        <el-button size="small" @click="newPts(s, null)">Add Site Pre-Treatment</el-button>
      </div>
      <div class="card-body">
        <div v-if="sitePts(s.id).length" class="occ shared">
          <div class="occ-title"><b>Site pre-treatment (shared)</b></div>
          <PtsTable :rows="sitePts(s.id)" />
        </div>
        <div v-for="o in occupiersOf(s.id)" :key="o.id" class="occ">
          <div class="occ-title row">
            <ObjectIcon object="occupier" size="sm" />
            <a class="table-link" @click="openRecord('occupier', o.id, o.name)">{{ o.name }}</a>
            <span class="muted small">{{ [o.shopNo, o.activityType, o.cuisine].filter(Boolean).join(' · ') }}</span>
            <StatusTag :value="o.status" />
            <span class="grow" />
            <el-button size="small" text @click="newPts(s, o)">+ Pre-Treatment</el-button>
            <el-button size="small" text @click="newFixture(o)">+ Fixture</el-button>
          </div>
          <PtsTable v-if="occPts(o.id).length" :rows="occPts(o.id)" />
          <div v-else class="muted small pad">No pre-treatment system recorded for this occupier.</div>
          <div v-if="fixturesOf(o.id).length" class="fixtures">
            <span class="muted small">Fixtures:</span>
            <el-tag v-for="f in fixturesOf(o.id)" :key="f.id" size="small" effect="plain" class="fx" @click="openRecord('fixture', f.id, f.name)">{{ f.qty }} × {{ f.fixtureType }}</el-tag>
          </div>
        </div>
        <div v-if="!occupiersOf(s.id).length" class="empty small">No occupiers yet.</div>
      </div>
    </div>
    <div v-if="!loading && !sites.length" class="card empty">No sites. Add a site with its Activity Type to set default inspection frequencies and sample parameters.</div>
  </div>
</template>
<script setup>
import { ref, watch, h } from 'vue'
import { listRecords, bus } from '../api.js'
import { openForm } from '../forms.js'
import { openRecord } from '../nav.js'
import ObjectIcon from '../components/ObjectIcon.vue'
import StatusTag from '../components/StatusTag.vue'

const props = defineProps({ record: Object })
const sites = ref([]), occupiers = ref([]), pts = ref([]), fixtures = ref([])
const loading = ref(false)
const occupiersOf = (id) => occupiers.value.filter((o) => o.siteId === id)
const occPts = (id) => pts.value.filter((p) => p.occupierId === id)
const sitePts = (id) => pts.value.filter((p) => p.siteId === id && !p.occupierId)
const fixturesOf = (id) => fixtures.value.filter((f) => f.occupierId === id)
async function load() {
  loading.value = true
  try {
    const q = { approvalId: props.record.id }
    const [a, b, c, d] = await Promise.all([listRecords('site', q), listRecords('occupier', q), listRecords('pts', q), listRecords('fixture', q)])
    sites.value = a.records; occupiers.value = b.records; pts.value = c.records; fixtures.value = d.records
  } finally {
    loading.value = false
  }
}
const nm = () => ({ [props.record.id]: { name: props.record.name, label: `${props.record.name} · ${props.record.tradingName}`, object: 'approval' } })
const newSite = () => openForm({ object: 'site', defaults: { approvalId: props.record.id, siteName: props.record.tradingName, address: props.record.propertyAddress }, names: nm(), onSaved: load })
const newOccupier = (s) => openForm({ object: 'occupier', defaults: { siteId: s.id, activityType: s.activityType }, names: { [s.id]: { name: s.name, label: s.name } }, onSaved: load })
const newPts = (s, o) => openForm({ object: 'pts', defaults: { siteId: s.id, occupierId: o?.id || null, status: 'In Plan Assessment' }, names: { [s.id]: { name: s.name, label: s.name }, ...(o ? { [o.id]: { name: o.name, label: o.name } } : {}) }, onSaved: load })
const newFixture = (o) => openForm({ object: 'fixture', defaults: { occupierId: o.id }, names: { [o.id]: { name: o.name, label: o.name } }, onSaved: load })

const PtsTable = (p) => h('table', { class: 'pts-table' }, [
  h('thead', h('tr', ['System', 'Type', 'Flow (L/s)', 'Volume (L)', 'PSID (WasteID)', 'Location', 'Status'].map((t) => h('th', t)))),
  h('tbody', p.rows.map((r) => h('tr', { key: r.id }, [
    h('td', h('a', { class: 'table-link', onClick: () => openRecord('pts', r.id, r.name) }, r.name)), h('td', r.ptsType), h('td', { class: 'mono' }, r.flowCapacity ?? ''), h('td', { class: 'mono' }, r.capacity ?? ''),
    h('td', r.psid ? h('a', { onClick: () => openRecord('pts', r.id, r.name) }, r.psid) : ''), h('td', r.locationDesc || ''), h('td', h(StatusTag, { value: r.status }))
  ])))
])
PtsTable.props = ['rows']
watch(() => [props.record.id, bus.version], load, { immediate: true })
</script>
<style scoped>
.mb { margin-bottom: 10px; }
.site + .site { margin-top: 14px; }
.occ { border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; margin-bottom: 10px; }
.occ.shared { background: #f7fbf9; }
.occ-title { margin-bottom: 6px; flex-wrap: wrap; }
.pad { padding: 4px 2px; }
.fixtures { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.fx { cursor: pointer; }
:deep(.pts-table) { width: 100%; border-collapse: collapse; font-size: 13px; }
:deep(.pts-table th) { text-align: left; font-weight: 600; color: var(--muted); font-size: 12px; padding: 4px 6px; border-bottom: 1px solid var(--line); }
:deep(.pts-table td) { padding: 5px 6px; border-bottom: 1px solid #f2f4f8; }
</style>
