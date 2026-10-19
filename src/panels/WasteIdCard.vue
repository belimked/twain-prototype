<template>
  <div class="card">
    <div class="card-head"><span class="wid">W</span><h3 class="grow">WasteID</h3><el-button v-if="data?.appUrl && data?.found" size="small" @click="openWasteId">Open in WasteID</el-button></div>
    <div class="card-body" v-loading="loading">
      <div v-if="!record.psid" class="muted small">No PSID recorded. Enter the WasteID device reference to link this system.</div>
      <template v-else-if="data && !data.configured">
        <div class="muted small">PSID <b>{{ record.psid }}</b>. The WasteID connection is not configured in this environment.</div>
      </template>
      <template v-else-if="data && !data.found">
        <div class="muted small">No WasteID device with reference <b>{{ record.psid }}</b>.</div>
      </template>
      <template v-else-if="data">
        <div class="kv"><span>Device</span><b>{{ data.device.ref }}</b></div>
        <div class="kv"><span>Status</span><StatusTag :value="data.device.status" /></div>
        <div class="kv"><span>Type / capacity</span><b>{{ data.device.type }} · {{ data.device.capacity ?? '—' }} L</b></div>
        <div class="kv"><span>Location</span><b>{{ data.location?.name }}</b></div>
        <div class="kv"><span>Transporter</span><b>{{ data.transporter?.name || '—' }}</b></div>
        <div class="kv"><span>Pump-out every</span><b>{{ data.device.freqWeeks ?? '—' }} weeks</b></div>
        <div class="kv"><span>Last pump-out</span><b>{{ fmt(data.device.lastService) }}</b></div>
        <div class="kv"><span>Next due</span><b :class="{ exceeded: overdue }">{{ fmt(data.nextDue) }}{{ overdue ? ' (overdue)' : '' }}</b></div>
        <div class="muted small pk-head">Recent pump-outs</div>
        <div v-for="p in data.pickups" :key="p.id" class="pk row">
          <span class="grow">{{ fmt(p.startAt) }}</span><span class="mono">{{ p.volume ?? '—' }} L</span><StatusTag :value="p.status" />
        </div>
        <div v-if="!data.pickups.length" class="muted small">No pump-outs recorded.</div>
      </template>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '../api.js'
import StatusTag from '../components/StatusTag.vue'
const props = defineProps({ record: Object })
const data = ref(null)
const loading = ref(false)
const fmt = (v) => (v ? new Date(v).toLocaleDateString('en-AU') : '—')
const overdue = computed(() => data.value?.nextDue && data.value.nextDue < new Date().toISOString())
async function load() {
  if (!props.record.psid) return (data.value = null)
  loading.value = true
  try {
    data.value = await api(`/wasteid/device/${encodeURIComponent(props.record.psid)}`, { quiet: true })
  } catch (e) {
    data.value = { configured: true, found: false, error: e.message }
  } finally {
    loading.value = false
  }
}
const openWasteId = () => window.open(`${data.value.appUrl.replace(/\/+$/, '')}/#/devices/${data.value.device.id}`, '_blank', 'noopener')
watch(() => props.record.psid, load, { immediate: true })
</script>
<style scoped>
.wid { width: 24px; height: 24px; border-radius: 6px; background: #1f6f6f; color: #fff; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
.kv { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f2f4f8; font-size: 13px; }
.kv span { color: var(--muted); }
.pk-head { margin: 12px 0 4px; }
.pk { padding: 4px 0; font-size: 13px; }
</style>
