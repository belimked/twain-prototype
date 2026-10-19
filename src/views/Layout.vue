<template>
  <div class="shell">
    <header class="topbar">
      <div class="row brand" @click="router.push('/home')"><img src="/favicon.svg" alt="" width="30" height="30" /><span class="app">TWAIN</span></div>
      <GlobalSearch class="grow search" />
      <div class="row right">
        <el-dropdown trigger="click" @command="globalAction">
          <el-button circle :icon="'Plus'" type="primary" />
          <template #dropdown><el-dropdown-menu>
            <el-dropdown-item disabled class="muted">Global Actions</el-dropdown-item>
            <el-dropdown-item v-for="(a, i) in GLOBAL_ACTIONS" :key="i" :command="i">{{ a.label }}</el-dropdown-item>
          </el-dropdown-menu></template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="(f) => openRecord(f.object, f.id, f.label)">
          <el-button circle :icon="'Star'" />
          <template #dropdown><el-dropdown-menu>
            <el-dropdown-item disabled>Favourites</el-dropdown-item>
            <el-dropdown-item v-for="f in ws.favourites" :key="f.id" :command="f"><ObjectIcon :object="f.object" size="sm" />&nbsp;{{ f.label }}</el-dropdown-item>
            <el-dropdown-item v-if="!ws.favourites.length" disabled>Star a record to add it here</el-dropdown-item>
          </el-dropdown-menu></template>
        </el-dropdown>
        <el-popover placement="bottom-end" :width="360" trigger="click">
          <template #reference><el-badge :value="notifications.length" :hidden="!notifications.length"><el-button circle :icon="'Bell'" /></el-badge></template>
          <div class="muted small">Notifications</div>
          <div v-for="n in notifications" :key="n.id" class="notif" @click="openRecord(n.object, n.id, n.label)"><ObjectIcon :object="n.object" size="sm" /><div class="grow"><div>{{ n.label }}</div><div class="muted small">{{ n.sub }}</div></div></div>
          <div v-if="!notifications.length" class="empty small">You're all caught up.</div>
        </el-popover>
        <el-dropdown trigger="click" @command="userMenu">
          <el-avatar :size="32" class="avatar">{{ initials }}</el-avatar>
          <template #dropdown><el-dropdown-menu>
            <el-dropdown-item disabled><b>{{ session.user?.displayName }}</b><br /><span class="small">{{ ROLES[session.user?.role] }}</span></el-dropdown-item>
            <el-dropdown-item command="setup" divided :disabled="!isCoordinator()">Setup &amp; master data</el-dropdown-item>
            <el-dropdown-item command="reset" :disabled="!isCoordinator()">Reset demo data</el-dropdown-item>
            <el-dropdown-item command="logout" divided>Log out</el-dropdown-item>
          </el-dropdown-menu></template>
        </el-dropdown>
      </div>
    </header>
    <nav class="navbar">
      <el-dropdown trigger="click" @command="(k) => router.push(k === 'setup' ? '/setup' : `/o/${k}`)">
        <span class="launcher" title="App Launcher"><el-icon><Grid /></el-icon></span>
        <template #dropdown><el-dropdown-menu>
          <el-dropdown-item v-for="k in [...NAV.slice(1).map((n) => n.key), ...MORE_NAV]" :key="k" :command="k"><ObjectIcon :object="k" size="sm" />&nbsp;{{ OBJECTS[k].plural }}</el-dropdown-item>
          <el-dropdown-item v-if="isCoordinator()" command="setup" divided>Setup</el-dropdown-item>
        </el-dropdown-menu></template>
      </el-dropdown>
      <div class="navtabs">
        <a v-for="n in NAV" :key="n.key" class="navtab" :class="{ active: activeNav === n.key }" @click="router.push(n.to || `/o/${n.key}`)">{{ n.label }}</a>
        <el-dropdown trigger="click" @command="(k) => router.push(`/o/${k}`)">
          <a class="navtab" :class="{ active: MORE_NAV.includes(activeNav) }">More <el-icon><ArrowDown /></el-icon></a>
          <template #dropdown><el-dropdown-menu><el-dropdown-item v-for="k in MORE_NAV" :key="k" :command="k">{{ OBJECTS[k].plural }}</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </div>
    </nav>
    <div v-if="ws.tabs.length" class="wstabs">
      <div v-for="t in ws.tabs" :key="t.id" class="wstab" :class="{ active: route.params.id === t.id }" @click="openRecord(t.object, t.id, t.label)">
        <ObjectIcon :object="t.object" size="sm" /><span class="wslabel">{{ t.label }}</span>
        <el-icon v-if="t.pinned" class="pin" @click.stop="togglePin(t.id)"><Paperclip /></el-icon>
        <el-dropdown v-else trigger="click" @command="(c) => (c === 'pin' ? togglePin(t.id) : close(t.id))" @click.stop>
          <el-icon class="tabmenu" @click.stop><ArrowDown /></el-icon>
          <template #dropdown><el-dropdown-menu><el-dropdown-item command="pin">Pin tab</el-dropdown-item><el-dropdown-item command="close">Close tab</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
        <el-icon class="x" @click.stop="close(t.id)"><Close /></el-icon>
      </div>
      <a class="closeall small" @click="ws.tabs = ws.tabs.filter((t) => t.pinned)">Close all</a>
    </div>
    <main class="content">
      <router-view v-if="ready" :key="route.path" />
      <div v-else class="seeding">
        <div class="card seed-card">
          <h3>Preparing TWAIN demo data…</h3>
          <p class="muted small">Migrating WasteID locations and devices into approvals, sites, occupiers and pre-treatment systems.</p>
          <el-progress :percentage="seedPct" />
        </div>
      </div>
    </main>
    <RecordForm />
  </div>
</template>
<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { api, session, signOut, loadUsers, isCoordinator, userName, bus, changed } from '../api.js'
import { OBJECTS } from '../meta.js'
import { ROLES } from '../../shared/objects.js'
import { NAV, MORE_NAV, GLOBAL_ACTIONS } from '../layouts.js'
import { ws, loadWorkspace, closeTab, togglePin } from '../workspace.js'
import { openForm } from '../forms.js'
import { openRecord } from '../nav.js'
import GlobalSearch from '../components/GlobalSearch.vue'
import ObjectIcon from '../components/ObjectIcon.vue'
import RecordForm from '../components/RecordForm.vue'

const route = useRoute()
const router = useRouter()
const ready = ref(false)
const seedPct = ref(0)
const notifications = ref([])
const initials = computed(() => (session.user?.displayName || '?').split(' ').map((x) => x[0]).join('').slice(0, 2))
const activeNav = computed(() => (route.path.startsWith('/home') ? 'home' : route.params.object))

async function seed() {
  const { chunks } = await api('/reset/start', { method: 'POST' })
  for (let i = 0; i < chunks; i++) {
    await api('/reset/chunk', { method: 'POST', body: { i } })
    seedPct.value = Math.round(((i + 1) / (chunks + 1)) * 100)
  }
  await api('/reset/finish', { method: 'POST' })
  seedPct.value = 100
}
async function loadNotifications() {
  const today = new Date().toISOString().slice(0, 10)
  const home = await api('/home', { quiet: true }).catch(() => null)
  if (!home) return
  notifications.value = [
    ...home.workItems.map((w) => ({ id: w.id, object: 'workItem', label: `${w.name} · ${w.itemType}`, sub: `Submitted by ${userName(w.submittedBy)}` })),
    ...home.myTasks.filter((t) => t.dueDate && t.dueDate <= today).map((t) => ({ id: t.id, object: 'task', label: t.subject, sub: `Task due ${new Date(t.dueDate + 'T00:00:00').toLocaleDateString('en-AU')}` }))
  ].slice(0, 15)
}
onMounted(async () => {
  await loadUsers()
  const [{ empty }] = await Promise.all([api('/state'), loadWorkspace()])
  if (empty) await seed()
  ready.value = true
  loadNotifications()
})
watch(() => bus.version, loadNotifications)

function close(id) {
  const wasActive = route.params.id === id
  closeTab(id)
  if (wasActive) {
    const last = ws.tabs[ws.tabs.length - 1]
    last ? openRecord(last.object, last.id, last.label) : router.push('/home')
  }
}
function globalAction(i) {
  const a = GLOBAL_ACTIONS[i]
  openForm({ object: a.object, defaults: a.defaults || {}, title: a.label })
}
async function userMenu(cmd) {
  if (cmd === 'logout') { signOut(); router.replace('/login') }
  if (cmd === 'setup') router.push('/setup')
  if (cmd === 'reset') {
    await ElMessageBox.confirm('Replace all TWAIN records with fresh demo data? Changes made by everyone will be lost.', 'Reset demo data', { type: 'warning', confirmButtonText: 'Reset' })
    ready.value = false
    seedPct.value = 0
    await seed()
    ws.tabs = []
    ready.value = true
    ElMessage.success('Demo data reset')
    router.push('/home')
    changed()
  }
}
</script>
<style scoped>
.shell { min-height: 100%; display: flex; flex-direction: column; }
.topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 16px; padding: 8px 16px; background: #fff; border-bottom: 1px solid var(--line); }
.brand { cursor: pointer; gap: 8px; }
.app { font-weight: 800; font-size: 18px; color: var(--brand); letter-spacing: 0.6px; }
.search { display: flex; justify-content: center; }
.right { gap: 10px; }
.right .el-button { margin: 0; }
.avatar { background: var(--brand); cursor: pointer; font-weight: 700; }
.navbar { display: flex; align-items: center; gap: 6px; padding: 0 12px; background: #fff; border-bottom: 3px solid var(--brand); position: sticky; top: 49px; z-index: 19; }
.launcher { display: inline-flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; font-size: 18px; color: var(--brand); }
.launcher:hover { background: #eef4fb; }
.navtabs { display: flex; overflow-x: auto; scrollbar-width: none; }
.navtab { display: inline-flex; align-items: center; gap: 4px; padding: 11px 12px 9px; color: #2e3a46; font-weight: 550; white-space: nowrap; border-bottom: 3px solid transparent; margin-bottom: -3px; text-decoration: none !important; }
.navtab:hover { background: #f4f7fb; }
.navtab.active { border-bottom-color: #1b96ff; color: var(--brand); }
.wstabs { display: flex; align-items: center; gap: 4px; padding: 6px 12px 0; overflow-x: auto; background: #e6ebf2; scrollbar-width: thin; }
.wstab { display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 10px; background: #f6f8fb; border-radius: 10px 10px 0 0; cursor: pointer; max-width: 260px; flex: none; border: 1px solid transparent; border-bottom: 0; }
.wstab.active { background: #fff; border-color: var(--line); box-shadow: 0 -2px 0 #1b96ff inset; }
.wslabel { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.x, .tabmenu, .pin { color: var(--muted); font-size: 12px; }
.x:hover, .tabmenu:hover { color: var(--ink); }
.closeall { margin-left: 8px; white-space: nowrap; }
.content { flex: 1; }
.seeding { display: flex; justify-content: center; padding: 80px 16px; }
.seed-card { width: 100%; max-width: 480px; padding: 24px; }
.notif { display: flex; gap: 8px; padding: 8px 4px; border-radius: 6px; cursor: pointer; align-items: flex-start; }
.notif:hover { background: #f3f7fd; }
@media (max-width: 1280px) {
  .navtab { padding: 11px 8px 9px; font-size: 13px; }
  .topbar { gap: 10px; }
}
@media (max-width: 760px) {
  .topbar { flex-wrap: wrap; }
  .search { order: 3; flex-basis: 100%; }
  .navbar { top: 0; position: relative; }
}
</style>
