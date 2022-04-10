/**
 * 插槽功能
 * @param instance 组件实例
 * @param children 组件实例的children
 */
export function initSlots(instance, children) {
    children = Array.isArray(children) ? children : [children]
    instance.slots = children
}
