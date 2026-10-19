<template>
  <el-dialog v-model="formState.open" :title="title" width="860px" top="5vh" destroy-on-close :close-on-click-modal="false" class="record-form" @closed="reset">
    <div v-if="def" class="form-body">
      <template v-for="sec in sections" :key="sec.label">
        <div v-if="sec.fields.length" class="section-title">{{ sec.label }}</div>
        <div class="field-grid">
          <div v-for="f in sec.fields" :key="f.key" class="form-field" :class="{ wide: f.type === 'textarea' }">
            <label><span v-if="f.required" class="req">*</span>{{ f.label }}
              <el-tooltip v-if="f.help" :content="f.help" placement="top"><el-icon class="muted"><InfoFilled /></el-icon></el-tooltip>
            </label>
            <FieldInput :field="f" v-model="data[f.key]" :names="names" :record="data" />
          </div>
        </div>
      </template>
    </div>
    <template #footer>
      <el-button @click="formState.open = false">Cancel</el-button>
      <el-button v-if="!formState.record" :loading="saving" @click="save(true)">Save &amp; New</el-button>
      <el-button type="primary" :loading="saving" @click="save(false)">Save</el-button>
    </template>
  </el-dialog>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { formState } from '../forms.js'
import { OBJECTS, fieldOf } from '../meta.js'
import { createRecord, updateRecord, changed, session } from '../api.js'
import { visible } from '../../shared/objects.js'
import { openRecord } from '../nav.js'
import FieldInput from './FieldInput.vue'

const def = computed(() => OBJECTS[formState.object])
const data = reactive({})
const names = reactive({})
const saving = ref(false)
const title = computed(() => formState.title || (formState.record ? `Edit ${formState.record.name}` : `New ${def.value?.label || ''}`))

watch(() => formState.open, (open) => {
  if (!open) return
  for (const k of Object.keys(data)) delete data[k]
  Object.assign(names, formState.names)
  if (formState.record) Object.assign(data, JSON.parse(JSON.stringify(formState.record)))
  else {
    for (const f of def.value.fields) {
      if (f.default !== undefined) data[f.key] = f.default
      else if (f.defaultToday) data[f.key] = new Date().toISOString().slice(0, 10)
    }
    if (def.value.owner || def.value.queue) data.ownerId = session.user?.id
    Object.assign(data, formState.defaults)
  }
})

const editable = (f) => !f.readonly && !f.hidden && f.type !== 'json' && visible(f, data)
const sections = computed(() => {
  const d = def.value
  if (!d) return []
  const withOwner = (keys) => keys.map((k) => fieldOf(d.key, k)).filter((f) => f && (f.key === 'ownerId' ? d.owner || d.queue : editable(f)))
  if (d.sections) {
    const used = new Set(d.sections.flatMap((s) => s.fields))
    const out = d.sections.filter((s) => visible(s, data)).map((s) => ({ label: s.label, fields: withOwner(s.fields) }))
    const rest = d.fields.filter((f) => !used.has(f.key) && editable(f))
    if (rest.length) out.push({ label: 'Other', fields: rest })
    return out
  }
  return [{ label: 'Information', fields: withOwner([...d.fields.map((f) => f.key), ...(d.owner || d.queue ? ['ownerId'] : [])]) }]
})

function payload() {
  const out = {}
  for (const f of def.value.fields) if (editable(f) && f.key in data) out[f.key] = data[f.key]
  if (def.value.owner || def.value.queue) out.ownerId = data.ownerId ?? null
  return out
}

async function save(again) {
  for (const s of sections.value) for (const f of s.fields) {
    const v = data[f.key]
    if (f.required && (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length))) return ElMessage.warning(`${f.label} is required`)
  }
  saving.value = true
  try {
    const { record } = formState.record ? await updateRecord(formState.record.id, payload()) : await createRecord(formState.object, payload())
    ElMessage.success(`${def.value.label} "${record.name}" was ${formState.record ? 'saved' : 'created'}.`)
    changed()
    formState.onSaved?.(record)
    if (again) {
      const keep = { ...formState.defaults }
      formState.open = false
      setTimeout(() => Object.assign(formState, { open: true, record: null, defaults: keep }), 50)
    } else {
      formState.open = false
      if (!formState.record && !formState.onSaved) openRecord(record.object, record.id, record.name)
    }
  } finally {
    saving.value = false
  }
}
const reset = () => { formState.onSaved = null; formState.title = '' }
</script>
<style scoped>
.form-body { max-height: 70vh; overflow-y: auto; padding-right: 6px; }
.form-field { padding: 6px 0; }
.form-field.wide { grid-column: 1 / -1; }
.form-field label { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.req { color: #c23934; margin-right: 2px; }
</style>
