<template>
  <span class="icon-tile" :class="size" :style="{ background: def?.color || '#54698d' }"><el-icon><component :is="def?.icon || 'Document'" /></el-icon></span>
</template>
<script setup>
import { computed } from 'vue'
import { OBJECTS } from '../meta.js'
const props = defineProps({ object: String, size: { type: String, default: '' } })
const def = computed(() => OBJECTS[props.object])
</script>
