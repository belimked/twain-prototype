<template>
  <div class="page"><div class="card empty">{{ message }}</div></div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listRecords } from '../api.js'
import { openRecord } from '../nav.js'
const route = useRoute()
const router = useRouter()
const message = ref('Looking up the pre-treatment system…')
onMounted(async () => {
  const psid = String(route.params.psid)
  const { records } = await listRecords('pts', { 'f.psid': psid })
  if (records[0]) return openRecord('pts', records[0].id, records[0].name)
  message.value = `No pre-treatment system with PSID ${psid} in Salesforce.`
  setTimeout(() => router.replace({ path: '/o/pts' }), 2500)
})
</script>
