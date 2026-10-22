import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { t } from './language'
import './styles/index.scss'

const app = createApp(App)

app.use(router)
app.use(store)
app.config.globalProperties.$t = t

app.mount('#app')
