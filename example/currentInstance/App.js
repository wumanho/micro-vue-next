import {h, getCurrentInstance} from "../../lib/vue-next.esm.js"
import {Foo} from "./Foo.js"

export const App = {
    name: "App",
    render() {
        return h("div", {}, [h("p", {}, "current instance demo"), h(Foo)])
    },

    setup() {
        const instance = getCurrentInstance()
        console.log("App:", instance)
    },
}
