<template>
  <el-tag v-if="value" :type="STATUS_TONE[value] || 'info'" effect="light" round size="small" disable-transitions>{{ value }}</el-tag>
</template>
<script setup>
import { STATUS_TONE } from '../meta.js'
defineProps({ value: String })
</script>
