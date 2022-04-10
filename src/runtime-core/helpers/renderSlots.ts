import {createVNode} from "../vnode";

/**
 * 由于插槽可能以数组的方式传入(多个元素)，封装一个可读性更强的方法来渲染，并兼容非数组的情况
 * @param slots 插槽
 */
export function renderSlots(slots) {
    return createVNode("div", {}, slots)
}
