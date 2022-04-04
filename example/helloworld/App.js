import {h} from "/./lib/vue-next.esm.js"

window.self = null
export const App = {
    render() {
        window.self = this
        // return h("div", {id: 'root', 'class': ["red", "hard"]}, "hi,vue3")
        return h("div",
            {id: 'root', 'class': ["red", "hard"]},
            [
                h("div", {'class': "red"}, "hi," + this.msg),
                h("div", {'class': "blue"}, "hi2," + this.msg),
            ])
    },
    setup() {
        return {
            msg: "mini-vue-flash"
        }
    }
}
