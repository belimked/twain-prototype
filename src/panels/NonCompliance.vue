<template>
  <div class="stack">
    <RelatedList object="case" field="approvalId" title="Open Non-Compliances" :parent="record" :filter="(r) => r.caseType === 'Non-Compliance' && r.status !== 'Closed'" :defaults="{ caseType: 'Non-Compliance', reportedBy: 'UU Internal', subject: `Non-compliance – ${record.tradingName}` }" :limit="20" />
    <RelatedList object="case" field="approvalId" title="Closed Non-Compliances" :parent="record" :filter="(r) => r.caseType === 'Non-Compliance' && r.status === 'Closed'" readonly :limit="10" />
  </div>
</template>
<script setup>
import RelatedList from '../components/RelatedList.vue'
defineProps({ record: Object })
</script>
<style scoped>
.stack > * + * { margin-top: 14px; }
</style>
