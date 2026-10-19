<template>
  <div class="card">
    <div class="card-head"><el-icon><Checked /></el-icon><h3 class="grow">Decision</h3><StatusTag :value="record.status" /></div>
    <div class="card-body">
      <p class="summary">{{ record.summary }}</p>
      <div class="kv"><span>Submitted by</span><b>{{ userName(record.submittedBy) }}</b></div>
      <div class="kv"><span>Submitted</span><b>{{ fmt(record.submittedAt) }}</b></div>
      <div v-if="record.approvalId" class="kv"><span>Approval</span><a @click="openRecord('approval', record.approvalId)">{{ names[record.approvalId]?.label }}</a></div>
      <div v-if="record.invoiceId" class="kv"><span>Invoice</span><a @click="openRecord('invoice', record.invoiceId)">{{ names[record.invoiceId]?.label }}</a></div>
      <template v-if="record.status === 'Pending'">
        <div v-if="!isCoordinator()" class="muted small mt">Waiting for a Trade Waste Coordinator.</div>
        <div v-else-if="own" class="muted small mt">You submitted this item. Another Coordinator must approve it.</div>
        <template v-else>
          <el-input v-model="comments" type="textarea" :rows="3" placeholder="Comments (required when rejecting)" class="mt" />
          <div class="row mt"><span class="grow" /><el-button type="danger" plain :loading="busy" @click="decide('Rejected')">Reject</el-button><el-button type="primary" :loading="busy" @click="decide('Approved')">Approve</el-button></div>
        </template>
      </template>
      <template v-else>
        <div class="kv"><span>Decided by</span><b>{{ userName(record.decidedBy) }}</b></div>
        <div class="kv"><span>Decided</span><b>{{ fmt(record.decidedAt) }}</b></div>
        <p v-if="record.decisionComments" class="summary">{{ record.decisionComments }}</p>
      </template>
    </div>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { runAction, session, isCoordinator, userName, changed } from '../api.js'
import { openRecord } from '../nav.js'
import StatusTag from '../components/StatusTag.vue'
const props = defineProps({ record: Object, names: Object })
const emit = defineEmits(['changed'])
const comments = ref('')
const busy = ref(false)
const own = computed(() => props.record.submittedBy === session.user?.id)
const fmt = (v) => (v ? new Date(v).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : '')
async function decide(decision) {
  busy.value = true
  try {
    await runAction('decideWorkItem', { id: props.record.id, decision, comments: comments.value })
    ElMessage.success(`Work item ${decision.toLowerCase()}`)
    changed()
    emit('changed')
  } finally {
    busy.value = false
  }
}
</script>
<style scoped>
.summary { white-space: pre-wrap; background: #f6f8fb; padding: 8px 10px; border-radius: 8px; margin: 0 0 10px; }
.kv { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f2f4f8; font-size: 13px; }
.kv span { color: var(--muted); }
.mt { margin-top: 10px; }
</style>
