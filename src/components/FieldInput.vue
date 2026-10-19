<template>
  <LookupInput v-if="field.type === 'lookup'" :model-value="modelValue" :object="field.ref" :label="names[modelValue]?.label" :filter="lookupFilter" @update:model-value="set" />
  <PolyLookup v-else-if="field.type === 'polylookup'" :model-value="modelValue" :names="names" @update:model-value="set" />
  <el-select v-else-if="field.type === 'user'" :model-value="modelValue" clearable filterable placeholder="Unassigned (queue)" style="width: 100%" @update:model-value="set">
    <el-option v-for="u in session.users" :key="u.id" :value="u.id" :label="`${u.displayName} – ${ROLES[u.role]}`" />
  </el-select>
  <el-select v-else-if="field.type === 'picklist'" :model-value="modelValue" clearable placeholder="--None--" style="width: 100%" @update:model-value="set">
    <el-option v-for="o in field.options" :key="o" :value="o" :label="o" />
  </el-select>
  <el-select v-else-if="field.type === 'multipicklist'" :model-value="modelValue || []" multiple collapse-tags-tooltip placeholder="--None--" style="width: 100%" @update:model-value="set">
    <el-option v-for="o in field.options" :key="o" :value="o" :label="o" />
  </el-select>
  <el-switch v-else-if="field.type === 'checkbox'" :model-value="!!modelValue" @update:model-value="set" />
  <el-date-picker v-else-if="field.type === 'date'" :model-value="modelValue" type="date" value-format="YYYY-MM-DD" format="DD/MM/YYYY" style="width: 100%" @update:model-value="set" />
  <el-date-picker v-else-if="field.type === 'datetime'" :model-value="modelValue" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" format="DD/MM/YYYY HH:mm" style="width: 100%" @update:model-value="set" />
  <el-input-number v-else-if="['number', 'currency', 'percent'].includes(field.type)" :model-value="modelValue ?? undefined" :controls="false" style="width: 100%" @update:model-value="(v) => set(v ?? null)" />
  <el-input v-else-if="field.type === 'textarea'" :model-value="modelValue" type="textarea" :autosize="{ minRows: 2, maxRows: 8 }" @update:model-value="set" />
  <AddressAutocomplete v-else-if="field.type === 'address'" :model-value="modelValue" @update:model-value="set" />
  <el-input v-else :model-value="modelValue" :type="field.type === 'email' ? 'email' : 'text'" @update:model-value="set" />
</template>
<script setup>
import { computed } from 'vue'
import { session } from '../api.js'
import { ROLES } from '../../shared/objects.js'
import LookupInput from './LookupInput.vue'
import PolyLookup from './PolyLookup.vue'
import AddressAutocomplete from './AddressAutocomplete.vue'
const props = defineProps({ field: Object, modelValue: null, names: { type: Object, default: () => ({}) }, record: Object })
const emit = defineEmits(['update:modelValue'])
const set = (v) => emit('update:modelValue', v)
// Narrow dependent lookups, e.g. an occupier must belong to the chosen site.
const lookupFilter = computed(() => {
  const r = props.record || {}
  if (props.field.key === 'occupierId' && r.siteId) return { 'f.siteId': r.siteId }
  if (props.field.key === 'siteId' && r.approvalId) return { approvalId: r.approvalId }
  if (props.field.key === 'sampleLocationId' && r.approvalId) return { approvalId: r.approvalId }
  if (props.field.key === 'ptsId' && r.occupierId) return { 'f.occupierId': r.occupierId }
  if (props.field.key === 'ptsId' && r.approvalId) return { approvalId: r.approvalId }
  if (props.field.key === 'samplingEventId' && r.approvalId) return { approvalId: r.approvalId }
  if (props.field.key === 'inspectionId' && r.approvalId) return { approvalId: r.approvalId }
  if (props.field.key === 'parameterId') return { 'f.status': 'Active' }
  return null
})
</script>
