<template>
  <span v-if="isEmpty" class="muted"></span>
  <a v-else-if="field.type === 'name' && record" class="table-link" @click.stop="open(record)">{{ record.name }}</a>
  <a v-else-if="field.type === 'lookup'" @click.stop="openId(value, names[value]?.object || field.ref)">{{ text }}</a>
  <a v-else-if="field.type === 'polylookup'" @click.stop="openId(value.id, value.object)">{{ text }}</a>
  <StatusTag v-else-if="isStatus" :value="value" />
  <el-icon v-else-if="field.type === 'checkbox'" :color="value ? '#2e844a' : '#c9ced6'"><component :is="value ? 'CircleCheckFilled' : 'Remove'" /></el-icon>
  <a v-else-if="field.type === 'email'" :href="`mailto:${value}`" @click.stop>{{ value }}</a>
  <a v-else-if="field.type === 'phone'" :href="`tel:${value}`" @click.stop>{{ value }}</a>
  <span v-else :class="{ mono: ['number', 'currency', 'percent'].includes(field.type) }">{{ text }}</span>
</template>
<script setup>
import { computed } from 'vue'
import { formatValue } from '../meta.js'
import { openRecord } from '../nav.js'
import StatusTag from './StatusTag.vue'
const props = defineProps({ field: Object, value: null, names: { type: Object, default: () => ({}) }, record: Object })
const isEmpty = computed(() => props.field.type !== 'name' && props.field.type !== 'checkbox' && (props.value === null || props.value === undefined || props.value === '' || (Array.isArray(props.value) && !props.value.length)))
const isStatus = computed(() => props.field.type === 'picklist' && ['status', 'priority', 'result'].includes(props.field.key))
const text = computed(() => formatValue(props.field, props.value, props.names))
const open = (r) => openRecord(r.object, r.id, r.name)
const openId = (id, object) => openRecord(object, id, props.names[id]?.label)
</script>
