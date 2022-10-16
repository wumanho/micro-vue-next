import {h} from "../../dist/vue-next.esm.js";

export const Foo = {
    setup(props) {
        //count
        props.count ++
        console.log(props);
    },
    render() {
        return h("div", {}, "foo:" + this.count)
    }
}
