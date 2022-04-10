/**
 * 插槽功能
 * @param instance 组件实例
 * @param children 组件实例的children
 */
import {ShapeFlags} from "../shared/ShapeFlags";

export function initSlots(instance, children) {
    //判断是否 slot
    const {vnode} = instance
    if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        normalizeObjectSlots(children, instance.slots)
    }
}


function normalizeObjectSlots(children: any, slots: any) {
    //根据 key 获取对应的 slot
    for (const key in children) {
        const value = children[key]
        slots[key] = (props) => normalizeSlotValue(value(props))
    }
}

// 统一将 slots 包装成数组
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value]
}
