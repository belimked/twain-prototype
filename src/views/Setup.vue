<template>
  <div class="page">
    <div class="card head row"><el-icon size="22"><Setting /></el-icon><div class="grow"><h2>Setup</h2><div class="muted small">Master data lists and billing parameters (Trade Waste Coordinators)</div></div></div>
    <el-tabs v-model="tab" class="tabs">
      <el-tab-pane v-for="k in SETUP" :key="k" :label="OBJECTS[k].plural" :name="k" />
      <el-tab-pane label="Billing Parameters" name="billing" />
    </el-tabs>
    <ObjectList v-if="tab !== 'billing'" :key="tab" :object="tab" :readonly="!isCoordinator()" />
    <div v-else class="card card-body" v-loading="!cfg">
      <div class="placeholder-note">Placeholder values until the official trade waste charging algorithm is supplied. Changes apply to the next billing run.</div>
      <el-table v-if="cfg" :data="BILLING_PARAMS" size="small" class="mt">
        <el-table-column label="Parameter" prop="label" />
        <el-table-column label="Code" prop="code" />
        <el-table-column label="Rate ($/kg)"><template #default="{ row }"><el-input-number v-model="cfg.rates[row.key]" :min="0" :step="0.05" :precision="2" :disabled="!isCoordinator()" /></template></el-table-column>
        <el-table-column label="Domestic strength (mg/L)"><template #default="{ row }"><el-input-number v-model="cfg.domesticStrength[row.key]" :min="0" :disabled="!isCoordinator()" /></template></el-table-column>
      </el-table>
      <div v-if="cfg" class="row wrap mt">
        <span>Domestic allowance per employee per day (L)</span><el-input-number v-model="cfg.domesticLitresPerEmployeeDay" :min="0" :disabled="!isCoordinator()" />
        <span>per showering employee (L)</span><el-input-number v-model="cfg.domesticLitresPerShowerDay" :min="0" :disabled="!isCoordinator()" />
      </div>
      <div class="row mt"><span class="grow" /><el-button type="primary" :disabled="!isCoordinator()" @click="save">Save</el-button></div>
    </div>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api, isCoordinator } from '../api.js'
import { OBJECTS } from '../meta.js'
import { BILLING_PARAMS } from '../../shared/objects.js'
import { SETUP } from '../layouts.js'
import ObjectList from '../components/ObjectList.vue'
const tab = ref(SETUP[0])
const cfg = ref(null)
watch(tab, async (t) => { if (t === 'billing' && !cfg.value) cfg.value = await api('/billing-config') })
async function save() {
  cfg.value = await api('/billing-config', { method: 'PUT', body: cfg.value })
  ElMessage.success('Billing parameters saved')
}
</script>
<style scoped>
.head { padding: 14px 16px; gap: 12px; margin-bottom: 8px; }
.head h2 { margin: 0; font-size: 18px; }
.tabs :deep(.el-tabs__header) { margin-bottom: 10px; }
.mt { margin-top: 12px; gap: 10px; }
</style>
