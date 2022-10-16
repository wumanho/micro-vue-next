import { h,getCurrentInstance } from "../../lib/vue-next.esm.js"

export const Foo = {
    setup() {
       const instance = getCurrentInstance()
        console.log("Foo:", instance)
    },
    render() {
        return h("div",{},"foo")
    },
}
