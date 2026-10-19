<template>
  <div class="login">
    <div class="panel card">
      <div class="brand row"><img src="/favicon.svg" alt="" width="40" height="40" /><div><div class="name">TWAIN</div><div class="muted small">Trade Waste Access Information Network</div></div></div>
      <el-form @submit.prevent="submit">
        <el-form-item><el-input v-model="username" placeholder="Username" size="large" autocomplete="username" prefix-icon="User" /></el-form-item>
        <el-form-item><el-input v-model="password" type="password" placeholder="Password" size="large" show-password autocomplete="current-password" prefix-icon="Lock" /></el-form-item>
        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="mb" />
        <el-button type="primary" size="large" native-type="submit" :loading="loading" style="width: 100%">Log In</el-button>
      </el-form>
      <div class="demo">
        <div class="muted small">Demo accounts (password <code>twain123</code>)</div>
        <div class="row wrap">
          <el-button v-for="u in DEMO" :key="u[0]" size="small" @click="quick(u[0])">{{ u[1] }}</el-button>
        </div>
      </div>
      <div class="muted small foot">Functional prototype · data is fictional and derived from the WasteID demo</div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signIn } from '../api.js'
const DEMO = [['coordinator', 'Alex Morgan · Coordinator'], ['coordinator2', 'Priya Nair · Coordinator'], ['officer', 'Sam Taylor · Officer'], ['officer2', 'Jordan Lee · Officer']]
const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
async function submit() {
  loading.value = true
  error.value = ''
  try {
    await signIn(username.value, password.value)
    router.replace(route.query.redirect || '/home')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
const quick = (u) => { username.value = u; password.value = 'twain123'; submit() }
</script>
<style scoped>
.login { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; background: radial-gradient(1200px 600px at 10% 0%, #cfe3fb 0%, transparent 60%), radial-gradient(900px 500px at 100% 100%, #d7f0e6 0%, transparent 60%), #eef2f7; }
.panel { width: 100%; max-width: 420px; padding: 28px; }
.brand { gap: 12px; margin-bottom: 22px; }
.name { font-size: 24px; font-weight: 800; letter-spacing: 0.5px; color: var(--brand); }
.mb { margin-bottom: 12px; }
.demo { margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--line); }
.demo .row { margin-top: 8px; gap: 6px; }
.demo .el-button { margin: 0; }
.foot { margin-top: 18px; text-align: center; }
</style>
