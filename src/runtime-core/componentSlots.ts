/**
 * 插槽功能
 * @param instance 组件实例
 * @param children 组件实例的children
 */
export function initSlots(instance, children) {
    // children = Array.isArray(children) ? children : [children]
    // instance.slots = children
    const slots = {}
    for (const key in children) {
        //根据 key 获取对应的 slot
        const value = children[key]
        slots[key] = Array.isArray(value) ? value : [value]
    }
    instance.slots = slots
}
