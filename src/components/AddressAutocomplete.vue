<template>
  <el-autocomplete :model-value="modelValue" :fetch-suggestions="query" :debounce="350" clearable style="width: 100%" placeholder="Start typing an address" @update:model-value="(v) => emit('update:modelValue', v)" @select="(o) => emit('update:modelValue', o.value)" />
</template>
<script setup>
defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])
// Photon (OpenStreetMap) geocoder, biased to South East Queensland.
async function query(q, cb) {
  if (!q || q.length < 4) return cb([])
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=-27.47&lon=153.02&limit=6&lang=en`)
    const { features = [] } = await res.json()
    cb(features.filter((f) => f.properties.countrycode === 'AU').map((f) => {
      const p = f.properties
      return { value: [[p.housenumber, p.street].filter(Boolean).join(' ') || p.name, p.city || p.district, p.state, p.postcode].filter(Boolean).join(', ') }
    }))
  } catch {
    cb([])
  }
}
</script>
