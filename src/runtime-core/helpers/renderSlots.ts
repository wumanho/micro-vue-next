import {createVNode, Fragment} from "../vnode";

/**
 * 由于插槽可能以数组的方式传入(多个元素)，封装一个可读性更强的方法来渲染，并兼容非数组的情况
 * @param slots 插槽
 * @param name 插槽插入的位置
 */
export function renderSlots(slots, name, props) {
    const slot = slots[name]
    if (slot && typeof slot === "function") {
        // Fragment 类型，不需要外层 div 包裹直接渲染子元素
        return createVNode(Fragment, {}, slot(props))
    }
}
