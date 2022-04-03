import {h} from "/./lib/vue-next.esm.js"

export const App = {
    render() {
        // return h("div", {id: 'root', 'class': ["red", "hard"]}, "hi,vue3")
        return h("div",
            {id: 'root', 'class': ["red", "hard"]},
            [
                h("div", {'class': "red"}, "hi,array"),
                h("div", {'class': "blue"}, "hi,array 2"),
            ])
    },
    setup() {
        return {
            msg: "mini-vue"
        }
    }
}
