//render 只干一件事，就是调用 patch
import {createComponentInstance, setupComponent} from "./component";

export function render(vnode, container) {
    patch(vnode, container)
}

function patch(vnode, container) {
    //处理组件
    processComponent(vnode, container)
}

function processComponent(vnode, container) {
    //挂载
    mountComponent(vnode, container)
}

function mountComponent(vnode, container) {
    //必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
    const instance = createComponentInstance(vnode)
    //处理「组件」的初始化逻辑
    setupComponent(instance)
    //处理「元素」的渲染逻辑
    setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
    //直接调用 instance 的 render 获取到虚拟结点
    const subTree = instance.render()
    //再次调用 patch，去处理元素的渲染
    patch(subTree, container)
}