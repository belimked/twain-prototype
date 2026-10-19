<template>
  <div class="card">
    <div class="card-head"><el-icon><ChatLineSquare /></el-icon><h3 class="grow">Activity</h3></div>
    <div class="card-body">
      <el-tabs v-model="tab" stretch class="act-tabs">
        <el-tab-pane label="New Task" name="task" />
        <el-tab-pane label="Log a Call" name="call" />
        <el-tab-pane label="Email" name="email" />
        <el-tab-pane label="Note" name="note" />
      </el-tabs>
      <template v-if="tab === 'task'">
        <el-input v-model="draft.subject" placeholder="Subject" />
        <div class="row mt">
          <el-date-picker v-model="draft.dueDate" type="date" value-format="YYYY-MM-DD" format="DD/MM/YYYY" placeholder="Due date" style="flex: 1" />
          <el-select v-model="draft.ownerId" placeholder="Assigned to" clearable style="flex: 1">
            <el-option v-for="u in session.users" :key="u.id" :value="u.id" :label="u.displayName" />
          </el-select>
        </div>
      </template>
      <el-input v-if="tab === 'email'" v-model="draft.title" placeholder="Subject" class="mb" />
      <el-input v-if="tab === 'email'" v-model="draft.to" placeholder="To (recorded only – no email is sent in the prototype)" class="mb" />
      <el-input v-if="tab !== 'task'" v-model="draft.body" type="textarea" :rows="3" :placeholder="tab === 'call' ? 'Call notes' : tab === 'email' ? 'Message' : 'Note'" />
      <div class="row mt"><span class="grow" /><el-button type="primary" size="small" :loading="saving" @click="save">{{ tab === 'email' ? 'Send' : 'Save' }}</el-button></div>

      <div class="timeline">
        <div class="muted small tl-head">Activity timeline</div>
        <div v-for="it in timeline" :key="it.key" class="tl-item">
          <span class="tl-dot" :style="{ background: it.color }"><el-icon><component :is="it.icon" /></el-icon></span>
          <div class="grow">
            <div class="row"><a v-if="it.task" class="grow" @click="openRecord('task', it.task.id, it.task.name)">{{ it.title }}</a><b v-else class="grow">{{ it.title }}</b><span class="muted small">{{ it.when }}</span></div>
            <div class="muted small">{{ it.sub }}</div>
            <div v-if="it.body" class="tl-body">{{ it.body }}</div>
          </div>
        </div>
        <div v-if="!timeline.length" class="empty small">No activity yet.</div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api, listRecords, createRecord, session, bus, changed, userName } from '../api.js'
import { openRecord } from '../nav.js'
const props = defineProps({ record: Object })
const tab = ref('task')
const draft = reactive({ subject: '', dueDate: null, ownerId: null, title: '', to: '', body: '' })
const saving = ref(false)
const tasks = ref([])
const notes = ref([])
const fmt = (v) => (v ? new Date(v.length === 10 ? v + 'T00:00:00' : v).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const KIND = { note: ['EditPen', '#7f8de1', 'Note'], call: ['Phone', '#48c3cc', 'Call'], email: ['Message', '#939393', 'Email'] }
const timeline = computed(() => [
  ...tasks.value.map((t) => ({ key: t.id, task: t, title: t.subject, sub: `${t.status} · ${t.ownerId ? userName(t.ownerId) : 'Queue'}${t.dueDate ? ' · due ' + fmt(t.dueDate) : ''}`, when: fmt(t.dueDate || t.createdAt), sortKey: t.createdAt, icon: 'Finished', color: '#4bc076' })),
  ...notes.value.map((n) => ({ key: n.id, title: `${KIND[n.kind][2]}${n.title ? ': ' + n.title : ''}`, sub: n.userName, body: n.body, when: fmt(n.at), sortKey: n.at, icon: KIND[n.kind][0], color: KIND[n.kind][1] }))
].sort((a, b) => b.sortKey.localeCompare(a.sortKey)))
async function load() {
  const [t, n] = await Promise.all([listRecords('task', { 'f.relatedTo.id': props.record.id }), api(`/r/${props.record.id}/notes`)])
  tasks.value = t.records
  notes.value = n
}
async function save() {
  saving.value = true
  try {
    if (tab.value === 'task') {
      if (!draft.subject.trim()) return ElMessage.warning('Enter a subject')
      await createRecord('task', { subject: draft.subject, dueDate: draft.dueDate, ownerId: draft.ownerId ?? session.user.id, relatedTo: { object: props.record.object, id: props.record.id } })
    } else {
      if (!draft.body.trim()) return ElMessage.warning('Enter some text')
      const title = tab.value === 'email' ? `${draft.title || '(no subject)'}${draft.to ? ' → ' + draft.to : ''}` : null
      await api(`/r/${props.record.id}/notes`, { method: 'POST', body: { kind: tab.value, title, body: draft.body } })
    }
    Object.assign(draft, { subject: '', dueDate: null, ownerId: null, title: '', to: '', body: '' })
    ElMessage.success('Saved')
    changed()
  } finally {
    saving.value = false
  }
}
watch(() => [props.record.id, bus.version], load, { immediate: true })
</script>
<style scoped>
.mt { margin-top: 8px; }
.act-tabs :deep(.el-tabs__item) { padding: 0 6px; font-size: 13px; }
.mb { margin-bottom: 8px; }
.timeline { margin-top: 16px; border-top: 1px solid var(--line); padding-top: 10px; }
.tl-head { margin-bottom: 8px; }
.tl-item { display: flex; gap: 10px; padding: 8px 0; }
.tl-dot { width: 26px; height: 26px; border-radius: 50%; color: #fff; display: inline-flex; align-items: center; justify-content: center; flex: none; }
.tl-body { white-space: pre-wrap; font-size: 13px; margin-top: 4px; background: #f6f8fb; padding: 6px 8px; border-radius: 6px; }
</style>
