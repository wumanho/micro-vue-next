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
 * @param prevVal 旧属性键
 * @param nextVal 新属性值
 */
function patchProp(el, key, prevVal, nextVal) {
    //注册事件的逻辑
    const isOn = (key: string) => {
        return /^on[A-Z]/.test(key)
    }
    // 判断 props 是事件还是属性
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, nextVal)
    } else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key)
        } else {
            el.setAttribute(key, nextVal)
        }
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

/**
 * 自定义渲染器，移除元素
 * @param child 需要移除的元素
 */
function remove(child) {
    const parent = child.parentNode
    if (parent) {
        parent.removeChild(child)
    }
}

/**
 * 自定义渲染器，设置元素 text
 * @param container 容器
 * @param text 设置的内容
 */
function setElementText(container, text) {
    container.textContent = text
}

const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
}) as any

export function createApp(...args) {
    return renderer.createApp(...args)
}

// runtime-core 属于 runtime-dom 的子集,所以就直接从这里导出
export * from '../runtime-core/index'

