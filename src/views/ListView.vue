<template>
  <div class="page">
    <ObjectList v-if="OBJECTS[object]" :object="object" :initial-view="route.query.view" :readonly="object === 'workItem' || object === 'billingCalc'" />
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { OBJECTS } from '../meta.js'
import ObjectList from '../components/ObjectList.vue'
const route = useRoute()
const object = computed(() => route.params.object)
</script>
