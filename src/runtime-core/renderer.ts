//render 只干一件事，就是调用 patch
import {createComponentInstance, setupComponent} from "./component";
import {ShapeFlags} from "../shared/ShapeFlags";
import {Fragment, Text} from "./vnode"
import {createAppAPI} from "./createApp";

export function createRenderer(options) {
    // 获取自定义渲染器，默认渲染到 Dom 平台
    const {createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert} = options

    function render(vnode, container) {
        patch(vnode, container, null)
    }

    function patch(vnode, container, parentComponent) {
        //判断 vode 是否 element，element 要单独处理
        //element：{type:'div',props:'hello'}
        //组件：{ type:APP{render()=>{} ,setup()=>{} }}
        const {type, shapeFlag} = vnode
        switch (type) {
            case Fragment:
                processFragment(vnode, container, parentComponent)
                break
            case Text:
                processText(vnode, container)
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(vnode, container, parentComponent)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    //处理组件
                    processComponent(vnode, container, parentComponent)
                }
        }
    }

    function processText(vnode, container) {
        // children 就是一个字符串
        const {children} = vnode
        // 创建 text 节点，并赋值到 vnode 的 el 上
        const textNode = (vnode.el = document.createTextNode(children))
        container.append(textNode)
    }

    function processFragment(vnode, container, parentComponent) {
        mountChildren(vnode, container, parentComponent)
    }

    function processComponent(vnode, container, parentComponent) {
        //挂载
        mountComponent(vnode, container, parentComponent)
    }

    function processElement(vnode, container, parentComponent) {
        mountElement(vnode, container, parentComponent)
    }

    function mountComponent(initialVNode, container, parentComponent) {
        //必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
        const instance = createComponentInstance(initialVNode, parentComponent)
        //处理「组件」的初始化逻辑
        setupComponent(instance)
        //处理「元素」的渲染逻辑
        setupRenderEffect(instance, initialVNode, container)
    }

    /**
     *  在这里会调用一些 dom 的 api，将虚拟 dom 转换成真实 dom
     *  update：支持用户传入自定义渲染器
     * @param vnode
     * @param container
     * @param parentComponent
     */
    function mountElement(vnode, container, parentComponent) {
        const {children, props, shapeFlag, type} = vnode
        //创建元素，使用自定义渲染器
        const el = (vnode.el = hostCreateElement(type))
        //创建元素内容
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {  //children 为数组
            mountChildren(vnode, el, parentComponent)
        }
        //处理 props
        for (const key in props) {
            const val = props[key]
            // 自定义 props 接口
            hostPatchProp(el, key, val)
        }
        //添加到父容器
        hostInsert(el, container)
    }

    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach(v => {
            patch(v, container, parentComponent)
        })
    }

    function setupRenderEffect(instance, initialVNode, container) {
        const {proxy} = instance
        //直接调用 instance 的 render 获取到虚拟结点
        //指定 this 为代理对象
        const subTree = instance.render.call(proxy)
        //再次调用 patch，去处理元素的渲染
        patch(subTree, container, instance)
        //$el挂载，这次才是获取到初始化完成的 el
        initialVNode.el = subTree.el
    }

    return {
        createApp: createAppAPI(render)
    }
}
