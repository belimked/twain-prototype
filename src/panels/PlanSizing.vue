<template>
  <div>
    <div class="placeholder-note">Sizing uses a placeholder rule (litres per fixture plus 2 L per meal, rounded up to a standard arrestor size) until the official method is supplied.</div>
    <div class="row wrap kpis">
      <div class="kpi"><b class="mono">{{ total }}</b><span>Fixtures</span></div>
      <div class="kpi"><b class="mono">{{ record.mealsPerDay ?? '—' }}</b><span>Meals per day</span></div>
      <div class="kpi"><b class="mono">{{ record.proposedCapacity ?? '—' }} L</b><span>Proposed</span></div>
      <div class="kpi"><b class="mono" :class="{ exceeded: under }">{{ record.recommendedCapacity ?? '—' }} L</b><span>Recommended</span></div>
    </div>
    <p v-if="under" class="exceeded small">The proposed {{ record.proposedPtsType || 'system' }} is smaller than the recommended capacity.</p>
    <RelatedList v-if="record.occupierId" object="fixture" field="occupierId" title="Occupier Fixtures" :parent="{ id: record.occupierId, object: 'occupier', name: names[record.occupierId]?.name, approvalId: record.approvalId }" :limit="20" @loaded="(l) => (fixtures = l)" />
    <div v-else class="card empty">Link an Occupier to record the fixture schedule from the hydraulic plan.</div>
    <div class="row mt"><span class="grow" /><el-button size="small" @click="recalc">Recalculate</el-button></div>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { updateRecord, changed } from '../api.js'
import RelatedList from '../components/RelatedList.vue'
const props = defineProps({ record: Object, names: Object })
const emit = defineEmits(['changed'])
const fixtures = ref([])
const total = computed(() => fixtures.value.reduce((s, f) => s + (f.qty || 0), 0))
const under = computed(() => props.record.proposedCapacity && props.record.recommendedCapacity && props.record.proposedCapacity < props.record.recommendedCapacity)
async function recalc() {
  await updateRecord(props.record.id, { assessmentNotes: props.record.assessmentNotes ?? '' })
  ElMessage.success('Recommendation recalculated')
  changed()
  emit('changed')
}
</script>
<style scoped>
.kpis { gap: 10px; margin: 12px 0; }
.mt { margin-top: 10px; }
</style>
