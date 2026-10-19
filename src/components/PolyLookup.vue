<template>
  <div class="row" style="width: 100%">
    <el-select v-model="object" style="width: 150px" @change="emit('update:modelValue', null)">
      <el-option v-for="o in TARGETS" :key="o" :value="o" :label="OBJECTS[o].label" />
    </el-select>
    <LookupInput class="grow" :model-value="modelValue?.id" :object="object" :label="names[modelValue?.id]?.label" @update:model-value="(id) => emit('update:modelValue', id ? { object, id } : null)" />
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { OBJECTS } from '../meta.js'
import LookupInput from './LookupInput.vue'
const TARGETS = ['approval', 'case', 'planAssessment', 'inspection', 'pts', 'samplingEvent', 'invoice']
const props = defineProps({ modelValue: Object, names: Object })
const emit = defineEmits(['update:modelValue'])
const object = ref(props.modelValue?.object || 'approval')
</script>
