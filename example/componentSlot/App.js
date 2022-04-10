import {h} from "/./lib/vue-next.esm.js"
import {Foo} from "./Foo.js";

export const App = {
    name: "APP",
    render() {
        const app = h("div", {}, "App")
        const foo = h(Foo, {}, [h("p", {}, "123"),h("div",{},"234")])
        // const foo = h(Foo, {}, h("p", {}, "123"))
        return h("div", {}, [app, foo])
    },
    setup() {
        return {}
    }
}
