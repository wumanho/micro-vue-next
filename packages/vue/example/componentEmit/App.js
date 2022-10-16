import {h} from "/./lib/vue-next.esm.js"
import {Foo} from "./Foo.js";

window.self = null
export const App = {
    name: "APP",
    render() {
        window.self = this
        return h("div",
            {id: 'root', 'class': ["red"]},
            [
                h("div", {}, "App"),
                h(Foo, {
                    onAdd(a, b) {
                        console.log("on Add", a, b)
                    },
                    onAddFoo(a,b){
                        console.log("on Add Foo",a,b)
                    }
                }),
            ])
    },
    setup() {
        return {}
    }
}
