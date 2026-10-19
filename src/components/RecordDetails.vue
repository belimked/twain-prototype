<template>
  <div class="details" :class="{ editing }">
    <template v-for="sec in sections" :key="sec.label">
      <div class="section-title" @click="toggle(sec.label)"><el-icon><component :is="collapsed[sec.label] ? 'ArrowRight' : 'ArrowDown'" /></el-icon>{{ sec.label }}</div>
      <div v-show="!collapsed[sec.label]" class="field-grid">
        <div v-for="f in sec.fields" :key="f.key" class="field" :class="{ wide: f.type === 'textarea' }" @dblclick="canEdit(f) && start()">
          <label>{{ f.label }}<el-tooltip v-if="f.help" :content="f.help"><el-icon class="muted"><InfoFilled /></el-icon></el-tooltip></label>
          <div v-if="editing && canEdit(f)"><FieldInput :field="f" v-model="draft[f.key]" :names="names" :record="draft" /></div>
          <div v-else class="value"><FieldValue :field="f" :value="valueOf(f)" :names="names" :record="record" /></div>
          <el-icon v-if="!editing && canEdit(f)" class="edit-btn" @click="start"><EditPen /></el-icon>
        </div>
      </div>
    </template>
    <div class="section-title" @click="toggle('__sys')"><el-icon><component :is="collapsed.__sys ? 'ArrowRight' : 'ArrowDown'" /></el-icon>System Information</div>
    <div v-show="!collapsed.__sys" class="field-grid">
      <div class="field"><label>Created By</label><div class="value">{{ record.createdBy }}, {{ fmt(record.createdAt) }}</div></div>
      <div class="field"><label>Last Modified By</label><div class="value">{{ record.updatedBy }}, {{ fmt(record.updatedAt) }}</div></div>
    </div>
    <div v-if="editing" class="edit-bar">
      <el-button @click="editing = false">Cancel</el-button>
      <el-button type="primary" :loading="saving" @click="save">Save</el-button>
    </div>
  </div>
</template>
<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { OBJECTS, fieldOf } from '../meta.js'
import { visible } from '../../shared/objects.js'
import { updateRecord } from '../api.js'
import FieldValue from './FieldValue.vue'
import FieldInput from './FieldInput.vue'

const props = defineProps({ record: Object, names: Object })
const emit = defineEmits(['saved'])
const def = computed(() => OBJECTS[props.record.object])
const editing = ref(false)
const saving = ref(false)
const draft = reactive({})
const collapsed = reactive({})
const fmt = (v) => (v ? new Date(v).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) : '')
const shown = (f) => f && !f.hidden && f.type !== 'json' && visible(f, editing.value ? draft : props.record)
const sections = computed(() => {
  const d = def.value
  const owner = d.owner || d.queue ? ['ownerId'] : []
  const raw = d.sections ? d.sections.filter((s) => visible(s, editing.value ? draft : props.record)) : [{ label: 'Information', fields: ['name', ...d.fields.map((f) => f.key), ...owner] }]
  const used = new Set(raw.flatMap((s) => s.fields))
  const rest = d.sections ? d.fields.filter((f) => !used.has(f.key)).map((f) => f.key) : []
  return [...raw, ...(rest.length ? [{ label: 'Other', fields: rest }] : [])].map((s) => ({ label: s.label, fields: s.fields.map((k) => fieldOf(d.key, k)).filter(shown) }))
})
const valueOf = (f) => (f.key === 'name' ? props.record.name : props.record[f.key])
const canEdit = (f) => !f.readonly && f.type !== 'name' && (f.key !== 'ownerId' || def.value.owner || def.value.queue)
const toggle = (k) => (collapsed[k] = !collapsed[k])
function start() {
  if (editing.value) return
  for (const k of Object.keys(draft)) delete draft[k]
  Object.assign(draft, JSON.parse(JSON.stringify(props.record)))
  editing.value = true
}
async function save() {
  const patch = {}
  for (const f of def.value.fields) if (canEdit(f) && JSON.stringify(draft[f.key] ?? null) !== JSON.stringify(props.record[f.key] ?? null)) patch[f.key] = draft[f.key]
  if ((def.value.owner || def.value.queue) && draft.ownerId !== props.record.ownerId) patch.ownerId = draft.ownerId || null
  if (!Object.keys(patch).length) return (editing.value = false)
  saving.value = true
  try {
    const { record } = await updateRecord(props.record.id, patch)
    editing.value = false
    ElMessage.success(`${def.value.label} "${record.name}" was saved.`)
    emit('saved', record)
  } finally {
    saving.value = false
  }
}
</script>
<style scoped>
.field.wide { grid-column: 1 / -1; }
.details.editing { padding-bottom: 60px; }
.edit-bar { position: sticky; bottom: 0; display: flex; justify-content: center; gap: 10px; padding: 10px; background: rgba(243, 246, 250, 0.96); border-top: 1px solid var(--line); margin: 10px -16px -16px; border-radius: 0 0 12px 12px; }
</style>
