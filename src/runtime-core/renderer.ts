//render 只干一件事，就是调用 patch
import {createComponentInstance, setupComponent} from "./component";
import {ShapeFlags} from "../shared/ShapeFlags";
import {Fragment, Text} from "./vnode"
import {createAppAPI} from "./createApp";
import {effect} from "../reactivity/effect";
import {EMPTY_OBJ} from "../shared";

export function createRenderer(options) {
    // 获取自定义渲染器，默认渲染到 Dom 平台
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElementText
    } = options

    function render(vnode, container) {
        patch(null, vnode, container, null, null)
    }

    /**
     *  核心渲染方法，渲染逻辑的入口
     * @param n1 旧的节点树，如果不存在，则处于初始化流程，如果存在，则处于更新的流程
     * @param n2 新的节点树
     * @param container 父元素
     * @param parentComponent 父组件
     * @param anchor 锚点
     */
    function patch(n1, n2, container, parentComponent, anchor) {
        //判断 vode 是否 element，element 要单独处理
        //element：{type:'div',props:'hello'}
        //组件：{ type:APP{render()=>{} ,setup()=>{} }}
        const {type, shapeFlag} = n2
        switch (type) {
            case Fragment:
                processFragment(n2, container, parentComponent, anchor)
                break
            case Text:
                processText(n2, container)
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentComponent, anchor)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    //处理组件
                    processComponent(n1, n2, container, parentComponent, anchor)
                }
        }
    }

    function processText(n2, container) {
        // children 就是一个字符串
        const {children} = n2
        // 创建 text 节点，并赋值到 vnode 的 el 上
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }

    function processFragment(n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor)
    }

    function processComponent(n1, n2, container, parentComponent, anchor) {
        //挂载
        mountComponent(n2, container, parentComponent, anchor)
    }

    /**
     * 处理 element，判断是初始化还是更新
     * @param n1 老节点树
     * @param n2 新节点树
     * @param container 父元素
     * @param parentComponent 父组件
     * @param anchor 锚点
     */
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor)
        } else {
            patchElement(n1, n2, container, parentComponent, anchor)
        }
    }

    /**
     * element 更新处理，包括对属性、Children的更新处理
     * @param n1 老节点树
     * @param n2 新节点树
     * @param container 父元素
     * @param parentComponent 父组件
     * @param anchor 锚点
     */
    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ
        const newProps = n2.props || EMPTY_OBJ
        // n2 由于没有走初始化的逻辑，所有没有 el 属性
        // 所以先将 n1 的 el 赋值给 n2，用于下次更新的时候获取
        const el = (n2.el = n1.el)
        patchChildren(n1, n2, el, parentComponent, anchor)
        patchProp(el, oldProps, newProps)
    }

    /**
     * 对 children 的更新处理
     * @param n1 老节点
     * @param n2 新节点
     */
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        // 获取旧元素的类型和 children
        const prevShapeFlag = n1.shapeFlag
        const c1 = n1.children
        // 新元素的类型以及 children
        const shapeFlag = n2.shapeFlag
        const c2 = n2.children
        // 新元素是 text 普通文本
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 如果老节点的 children 是数组的话，需要先清空掉
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 1.把老节点的children清空
                unmountChildren(n1.children)
            }
            // 再设置新的 text 值
            if (c1 !== c2) hostSetElementText(container, c2)
        } else { // 新节点的 children 是数组
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 清空老的文本节点
                hostSetElementText(container, "")
                mountChildren(c2, container, parentComponent, anchor)
            } else {
                // array diff
                patchKeyedChildren(c1, c2, container, parentComponent, anchor)
            }
        }
    }

    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el
            hostRemove(el)
        }
    }

    /**
     *  diff 核心逻辑
     * @param c1 old children
     * @param c2 new children
     */
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0   // 新节点树游标
        let e1 = c1.length - 1 // 索引指向老节点树尾部
        let e2 = c2.length - 1 // 索引指向新节点树尾部

        // 左侧位移
        while (i <= e1 && i <= e2) {  // 循环条件：游标不能大于等于 e1 和 e2
            const n1 = c1[i] // 取得元素(头部)
            const n2 = c2[i] // 取得元素(头部)
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else { // 直到出现不同的元素，就没必要再循环下去了
                break
            }
            i++
        }

        // 右侧位移
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1] // 取得元素(尾部)
            const n2 = c2[e2] // 取得元素(尾部)
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
            }
            e1--
            e2--
        }

        /** 位移完毕，已锁定变化部分 **/

        if (i > e1) {  // 新的节点树在原来的基础上新增了节点
            if (i <= e2) {
                const nextPos = e2 + 1
                const anchor = nextPos < c2.length ? c2[nextPos].el : null
                // i 大于 e1 小于等于 e2 的部分就是新增的节点
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor)
                    i++
                }
            }
        } else if (i > e2) { // 新的节点树在原来的基础上少了节点
            while (i <= e1) {
                hostRemove(c1[i].el)
                i++
            }
        } else { // 处理中间乱序的情况下的逻辑

        }
    }

    function isSameVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key
    }


    /**
     *
     * @param el
     * @param oldProp
     * @param newProp
     */
    function patchProp(el, oldProp, newProp) {
        // 判断新节点树的 prop 是否有变化
        if (oldProp !== newProp) {
            for (const key in newProp) {
                // 根据新属性列表的key获取老属性列表对应的值
                const prevProp = oldProp[key]
                const nextProp = newProp[key]

                if (prevProp !== newProp) {
                    hostPatchProp(el, key, prevProp, nextProp)
                }
            }
            if (oldProp !== EMPTY_OBJ) {
                // 如果老的 prop 在新的节点树里面被删除了，那这个属性也要删除掉
                for (const key in oldProp) {
                    if (!(key in newProp)) {
                        hostPatchProp(el, key, oldProp[key], null)
                    }
                }
            }
        }
    }

    function mountComponent(initialVNode, container, parentComponent, anchor) {
        //必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
        const instance = createComponentInstance(initialVNode, parentComponent)
        //处理「组件」的初始化逻辑
        setupComponent(instance)
        //处理「元素」的渲染逻辑
        setupRenderEffect(instance, initialVNode, container, anchor)
    }

    /**
     *  在这里会调用一些 dom 的 api，将虚拟 dom 转换成真实 dom
     *  update：支持用户传入自定义渲染器
     * @param vnode
     * @param container
     * @param parentComponent
     */
    function mountElement(vnode, container, parentComponent, anchor) {
        const {children, props, shapeFlag, type} = vnode
        //创建元素，使用自定义渲染器
        const el = (vnode.el = hostCreateElement(type))
        //创建元素内容
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {  //children 为数组
            mountChildren(vnode.children, el, parentComponent, anchor)
        }
        //处理 props
        for (const key in props) {
            const val = props[key]
            // 自定义 props 接口
            hostPatchProp(el, key, null, val)
        }
        //添加到父容器
        hostInsert(el, container, anchor)
    }

    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(v => {
            patch(null, v, container, parentComponent, anchor)
        })
    }

    /**
     *  该方法获取组件的整个元素树，交给 patch 去逐个处理
     *  effect 在这里就用上了，为 render 中的响应式对象收集依赖
     * @param instance
     * @param initialVNode
     * @param container
     */
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        effect(() => {
            if (!instance.isMounted) { // 初始化逻辑
                const {proxy} = instance
                //直接调用 instance 的 render() 获取到虚拟结点
                //指定 this 为代理对象
                const subTree = (instance.subTree = instance.render.call(proxy))
                //再次调用 patch，去处理元素的渲染
                patch(null, subTree, container, instance, anchor)
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
                patch(prevSubTree, subTree, container, instance, anchor)
            }
        })
    }

    return {
        createApp: createAppAPI(render)
    }
}
