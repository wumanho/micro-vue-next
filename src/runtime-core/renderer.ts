//render 只干一件事，就是调用 patch
import {createComponentInstance, setupComponent} from "./component";
import {isObject} from "../shared";

export function render(vnode, container) {
    patch(vnode, container)
}

function patch(vnode, container) {
    //判断 vode 是否 element，element 要单独处理
    //element：{type:'div',props:'hello'}
    //组件：{ type:APP{render()=>{} ,setup()=>{} }}
    if (typeof vnode.type === 'string') {
        processElement(vnode, container)
    } else if (isObject(vnode.type)) {
        //处理组件
        processComponent(vnode, container)
    }
}

function processComponent(vnode, container) {
    //挂载
    mountComponent(vnode, container)
}

function processElement(vnode, container) {
    mountElement(vnode, container)
}

function mountComponent(vnode, container) {
    //必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
    const instance = createComponentInstance(vnode)
    //处理「组件」的初始化逻辑
    setupComponent(instance)
    //处理「元素」的渲染逻辑
    setupRenderEffect(instance, container)
}

function mountElement(vnode, container) {
    const {children} = vnode
    const {props} = vnode
    //创建元素
    const el = document.createElement(vnode.type)
    //创建元素内容
    if (typeof children === 'string') {
        el.textContent = children
    } else if (Array.isArray(children)) {  //children 为数组
        mountChildren(vnode.children, el)
    }
    //处理 props
    for (const key in props) {
        const val = props[key]
        el.setAttribute(key, val)
    }
    //添加到父容器
    container.append(el)
}

function mountChildren(children, container) {
    children.forEach(v => {
        patch(v, container)
    })
}

function setupRenderEffect(instance, container) {
    //直接调用 instance 的 render 获取到虚拟结点
    const subTree = instance.render()
    //再次调用 patch，去处理元素的渲染
    patch(subTree, container)
}
