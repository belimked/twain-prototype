import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import en from 'element-plus/es/locale/lang/en'
import * as Icons from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router.js'

const app = createApp(App)
for (const [name, comp] of Object.entries(Icons)) app.component(name, comp)
app.use(ElementPlus, { locale: en }).use(router).mount('#app')
