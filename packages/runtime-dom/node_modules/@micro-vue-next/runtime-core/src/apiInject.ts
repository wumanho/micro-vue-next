import {getCurrentInstance} from "./component";

/**
 * 负责从父组件中取出对应的键值对
 * @param key 键
 */
export function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance() as any
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides
        if (parentProvides[key]) {
            return parentProvides[key]
        } else if (defaultValue) { //处理默认值
            if (typeof defaultValue === "function") {
                return defaultValue()
            } else {
                return defaultValue
            }
        }
    }
}

/**
 * 负责将键值对保存在 component 实例的 provides 对象中
 * @param key 键
 * @param value 值
 */
export function provide(key, value) {
    // 需要获取当前实例，所以要求必须在 setup 中调用
    const currentInstance = getCurrentInstance() as any
    if (currentInstance) {
        let {provides} = currentInstance
        const parentProvides = currentInstance.parent.provides
        // 仅在初始化的时候进行原型链赋值操作
        if (provides === parentProvides) {
            // 原型链赋值
            provides = currentInstance.provides = Object.create(parentProvides)
        }
        provides[key] = value
    }
}
