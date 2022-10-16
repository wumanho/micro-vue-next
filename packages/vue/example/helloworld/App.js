import {h} from "../../dist/vue-next.esm.js"
import {Foo} from "./Foo.js";

window.self = null
export const App = {
    name: "APP",
    render() {
        window.self = this
        return h("div",
            {id: 'root', 'class': ["red", "hard"]},
            [
                h("div", {}, "hi," + this.msg),
                h(Foo, {count: 1}),
            ])
    },
    setup() {
        return {
            msg: "mini-vue-flash"
        }
    }
}
