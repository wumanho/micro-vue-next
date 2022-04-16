import {createRenderer} from "../runtime-core";

/**
 * 自定义渲染器，处理元素
 * @param type 元素类型
 */
function createElement(type) {
    return document.createElement(type)
}

/**
 *  自定义渲染器，处理 prop
 * @param el 元素
 * @param key 属性键
 * @param val 属性值
 */
function patchProp(el, key, val) {
    el.setAttribute(key, val)
    //注册事件的逻辑
    const isOn = (key: string) => {
        return /^on[A-Z]/.test(key)
    }
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, val)
    }
}

/**
 * 自定义渲染器,插入元素
 * @param el 元素
 * @param parent 需要插入的父级元素
 */
function insert(el, parent) {
    parent.append(el)
}

const renderer = createRenderer({
    createElement,
    patchProp,
    insert
}) as any

export function createApp(...args) {
    return renderer.createApp(...args)
}

// runtime-core 属于 runtime-dom 的子集,所以就直接从这里导出
export * from '../runtime-core/index'

