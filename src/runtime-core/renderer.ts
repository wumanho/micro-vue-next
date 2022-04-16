//render 只干一件事，就是调用 patch
import {createComponentInstance, setupComponent} from "./component";
import {ShapeFlags} from "../shared/ShapeFlags";
import {Fragment, Text} from "./vnode"
import {createAppAPI} from "./createApp";
import {effect} from "../reactivity/effect";

export function createRenderer(options) {
    // 获取自定义渲染器，默认渲染到 Dom 平台
    const {createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert} = options

    function render(vnode, container) {
        patch(null, vnode, container, null)
    }

    /**
     *  核心渲染方法，渲染逻辑的入口
     * @param n1 旧的节点树，如果不存在，则处于初始化流程，如果存在，则处于更新的流程
     * @param n2 新的节点树
     * @param container 父元素
     * @param parentComponent 父组件
     */
    function patch(n1, n2, container, parentComponent) {
        //判断 vode 是否 element，element 要单独处理
        //element：{type:'div',props:'hello'}
        //组件：{ type:APP{render()=>{} ,setup()=>{} }}
        const {type, shapeFlag} = n2
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent)
                break
            case Text:
                processText(n1, n2, container)
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentComponent)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    //处理组件
                    processComponent(n1, n2, container, parentComponent)
                }
        }
    }

    function processText(n1, n2, container) {
        // children 就是一个字符串
        const {children} = n2
        // 创建 text 节点，并赋值到 vnode 的 el 上
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }

    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent)
    }

    function processComponent(n1, n2, container, parentComponent) {
        //挂载
        mountComponent(n2, container, parentComponent)
    }

    /**
     * 处理 element，判断是初始化还是更新
     * @param n1 老节点树
     * @param n2 新节点树
     * @param container 父元素
     * @param parentComponent 父组件
     */
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            mountElement(n2, container, parentComponent)
        } else {
            patchElement(n1, n2, container)
        }
    }

    function patchElement(n1, n2, container) {
        console.log("patchElement")
        console.log(n1,'n1');
        console.log(n2,'n2');
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
            patch(null, v, container, parentComponent)
        })
    }

    /**
     *  该方法获取组件的整个元素树，交给 patch 去逐个处理
     *  effect 在这里就用上了，为 render 中的响应式对象收集依赖
     * @param instance
     * @param initialVNode
     * @param container
     */
    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            if (!instance.isMounted) { // 初始化逻辑
                const {proxy} = instance
                //直接调用 instance 的 render() 获取到虚拟结点
                //指定 this 为代理对象
                const subTree = (instance.subTree = instance.render.call(proxy))
                //再次调用 patch，去处理元素的渲染
                patch(null, subTree, container, instance)
                //$el挂载，这次才是获取到初始化完成的 el
                initialVNode.el = subTree.el
                instance.isMounted = true
            } else { //更新逻辑
                const {proxy} = instance
                // 获取当前组件的 subTree 以及上一次的 subTree 用于 diff 对比的
                const subTree = instance.render.call(proxy)
                const prevSubTree = instance.subTree
                // 完事记录一下当前的 subTree
                instance.subTree = subTree
                patch(prevSubTree, subTree, container, instance)
            }
        })
    }

    return {
        createApp: createAppAPI(render)
    }
}
