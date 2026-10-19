<template>
  <div class="card path-card">
    <div class="path">
      <div v-for="(s, i) in steps" :key="s" class="step" :class="{ done: i < idx && !lost, current: i === idx && !lost, lost: lost && s === value, ro: readonly }" @click="!readonly && emit('select', s)">
        <el-icon v-if="i < idx && !lost"><Check /></el-icon> {{ s }}
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const LOST = ['Cancelled', 'Rejected', 'Suspended', 'Decommissioned']
const props = defineProps({ options: Array, value: String, readonly: Boolean })
const emit = defineEmits(['select'])
const lost = computed(() => LOST.includes(props.value))
const steps = computed(() => props.options.filter((o) => !LOST.includes(o) || o === props.value))
const idx = computed(() => steps.value.indexOf(props.value))
</script>
<style scoped>
.path-card { padding: 8px; margin-bottom: 14px; }
.step.ro { cursor: default; }
</style>
