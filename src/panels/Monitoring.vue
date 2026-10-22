<template>
  <div class="stack">
    <RelatedList object="sampleLocation" field="approvalId" title="Sample Locations" :parent="record" />
    <RelatedList object="sampleLocation" field="approvalId" title="Default Sample Locations" :parent="record" :filter="(r) => r.isDefault" :defaults="{ isDefault: true, usedForBilling: true }" />
    <RelatedList object="sampleParameter" field="approvalId" title="Default Sample Parameters" :parent="record" :limit="20">
      <template #actions><el-button size="small" :loading="busy" @click="setDefaults">Set Up Default Sample Parameters</el-button></template>
    </RelatedList>
    <RelatedList object="samplingEvent" field="approvalId" title="Sampling Events" :parent="record" sort="-scheduledDate" :limit="10" />
    <RelatedList object="workInstruction" field="approvalId" title="Sampling Work Instructions" :parent="record" />
    <RelatedList object="inspection" field="approvalId" title="Inspections" :parent="record" sort="-scheduledDate" />
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { runAction, changed } from '../api.js'
import RelatedList from '../components/RelatedList.vue'
const props = defineProps({ record: Object })
const busy = ref(false)
async function setDefaults() {
  busy.value = true
  try {
    const res = await runAction('setDefaultParameters', { approvalId: props.record.id })
    ElMessage.success(res.added ? `${res.added} parameter(s) added from the site Activity Type` : 'All default parameters are already set')
    changed()
  } finally {
    busy.value = false
  }
}
</script>
<style scoped>
.stack > * + * { margin-top: 14px; }
</style>
