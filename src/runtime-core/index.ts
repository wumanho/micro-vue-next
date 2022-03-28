import {createVNode} from "./vnode";
import {render} from "./renderer";

export function createApp(rootComponent) {
    return {
        mount(root) {
            //需要先将入口转换成 vnode
            //所有操作都基于 vnode 完成
            const vnode = createVNode(rootComponent)
            render(vnode, root)
        }
    }
}

