import {createApp} from "../../lib/vue-next.esm.js"
import {App} from "./App.js"

const rootContainer = document.querySelector("#app")
createApp(App).mount(rootContainer)
