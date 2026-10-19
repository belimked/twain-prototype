<template>
  <div>
    <div class="placeholder-note">Placeholder formula until the official Urban Utilities algorithm is supplied: charge = trade waste volume × (concentration − domestic strength) ÷ 1000 × rate.</div>
    <div class="row wrap kpis">
      <div class="kpi"><b class="mono">{{ record.inflowKl }}</b><span>Metered volume (kL)</span></div>
      <div class="kpi"><b class="mono">× {{ record.dischargeFactor }}</b><span>Sewage discharge factor</span></div>
      <div class="kpi"><b class="mono">− {{ record.domesticOffsetKl }}</b><span>Domestic offset (kL)</span></div>
      <div class="kpi"><b class="mono">{{ record.tradeWasteKl }}</b><span>Trade waste volume (kL)</span></div>
      <div class="kpi"><b class="mono">{{ money(record.amount) }}</b><span>Amount ex GST</span></div>
    </div>
    <p class="muted small">{{ record.deemed ? 'Deemed quality values were used.' : `Average of ${record.sampleCount} usable sample(s) in the period.` }} {{ record.breakdown?.note || '' }}</p>
    <el-table :data="record.breakdown?.lines || []" size="small">
      <el-table-column label="Parameter" prop="parameter" min-width="150" />
      <el-table-column label="Code" prop="code" width="130" />
      <el-table-column label="Concentration (mg/L)" prop="concentration" width="170" />
      <el-table-column label="Domestic (mg/L)" prop="domesticStrength" width="140" />
      <el-table-column label="Excess (mg/L)" prop="excess" width="130" />
      <el-table-column label="Load (kg)" prop="kg" width="110" />
      <el-table-column label="Rate ($/kg)" prop="rate" width="110" />
      <el-table-column label="Charge" width="120"><template #default="{ row }">{{ money(row.charge) }}</template></el-table-column>
    </el-table>
  </div>
</template>
<script setup>
defineProps({ record: Object })
const money = (v) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(v || 0)
</script>
<style scoped>
.kpis { gap: 10px; margin: 12px 0; }
</style>
