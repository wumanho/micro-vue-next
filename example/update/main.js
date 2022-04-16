import { App } from './app.js'
import { createApp } from '../../lib/vue-next.esm.js'

const rootContainer = document.getElementById('app')
createApp(App).mount(rootContainer)
