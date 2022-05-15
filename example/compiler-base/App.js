import {ref} from "../../lib/vue-next.esm.js"

// export const App = {
//     name: "App",
//     template: `<div>hi,{{message}} {{count}}</div>`,
//     setup() {
//         const count = (window.count = ref(1))
//         const message = ref("mini-vue")
//         const changeCount = () => {
//             count.value++
//         }
//         return {
//             count,
//             message,
//         }
//     },
// }

export const App = {
    name: "App",
    template: `<div>hi,{{count}}</div>`,
    setup() {
        const count = (window.count = ref(1))
        return {
            count
        }
    },
}
