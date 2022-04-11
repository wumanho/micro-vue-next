//render 只干一件事，就是调用 patch
import {createComponentInstance, setupComponent} from "./component";
import {isObject} from "../shared";
import {ShapeFlags} from "../shared/ShapeFlags";
import {Fragment} from "./vnode";

export function render(vnode, container) {
    patch(vnode, container)
}

function patch(vnode, container) {
    //判断 vode 是否 element，element 要单独处理
    //element：{type:'div',props:'hello'}
    //组件：{ type:APP{render()=>{} ,setup()=>{} }}
    const {shapeFlag, type} = vnode
    switch (type) {
        case Fragment:
            processFragment(vnode, container)
            break;
        default:
            if (shapeFlag & ShapeFlags.ELEMENT) {
                processElement(vnode, container)
            } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                //处理组件
                processComponent(vnode, container)
            }
    }

}

function processFragment(vnode, container) {
    mountChildren(vnode.children, container)
}

function processComponent(vnode, container) {
    //挂载
    mountComponent(vnode, container)
}

function processElement(vnode, container) {
    mountElement(vnode, container)
}

function mountComponent(initialVNode, container) {
    //必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
    const instance = createComponentInstance(initialVNode)
    //处理「组件」的初始化逻辑
    setupComponent(instance)
    //处理「元素」的渲染逻辑
    setupRenderEffect(instance, initialVNode, container)
}

function mountElement(vnode, container) {
    const {children, props, shapeFlag} = vnode
    //创建元素
    const el = (vnode.el = document.createElement(vnode.type))
    //创建元素内容
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {  //children 为数组
        mountChildren(vnode.children, el)
    }
    //处理 props
    for (const key in props) {
        const val = props[key]
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
    //添加到父容器
    container.append(el)
}

function mountChildren(children, container) {
    children.forEach(v => {
        patch(v, container)
    })
}

function setupRenderEffect(instance, initialVNode, container) {
    const {proxy} = instance
    //直接调用 instance 的 render 获取到虚拟结点
    //指定 this 为代理对象
    const subTree = instance.render.call(proxy)
    //再次调用 patch，去处理元素的渲染
    patch(subTree, container)
    //$el挂载，这次才是获取到初始化完成的 el
    initialVNode.el = subTree.el
}
