import {ShapeFlags} from "../shared/ShapeFlags";

export const Fragment = Symbol("Fragment")
export const Text = Symbol("Text")

export {
    createVNode as createElementVNode
}

export function createVNode(type, props?, children?) {
    const vnode = {
        type,
        props,
        children,
        component: null, // 虚拟节点对应的实例
        key: props && props.key,
        shapeFlag: getShapeFlag(type),
        el: null
    }
    // 为 children 添加 shapeFlag
    // 通过位运算处理
    if (typeof children === 'string') {
        vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN
    } else if (Array.isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN
    }
    //判断 children 是否插槽
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        if (typeof vnode.children === "object") {
            vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
        }
    }
    return vnode
}

function getShapeFlag(type) {
    // 判断是元素或者是组件
    return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}

export function createTextVNode(text: string) {
    // 定义 Text 类型，渲染文本类型节点
    return createVNode(Text, {}, text)
}
