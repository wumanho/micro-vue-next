import {h, renderSlots} from "../../lib/vue-next.esm.js";

export const Foo = {
    setup() {
        return {}
    },
    render() {
        const foo = h("p", {}, "foo")
        console.log(this.$slots)
        return h("div", {}, [foo, renderSlots(this.$slots)])
    }
}
