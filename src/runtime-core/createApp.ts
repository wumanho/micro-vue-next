import {createVNode} from "./vnode";

export function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                //需要先将入口转换成 vnode
                //所有操作都基于 vnode 完成
                const vnode = createVNode(rootComponent)
                render(vnode, rootContainer)
            }
        }
    }
}



