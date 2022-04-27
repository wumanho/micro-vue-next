//render 只干一件事，就是调用 patch
import {createComponentInstance, setupComponent} from "./component";
import {ShapeFlags} from "../shared/ShapeFlags";
import {Fragment, Text} from "./vnode"
import {createAppAPI} from "./createApp";
import {effect} from "../reactivity/effect";
import {EMPTY_OBJ} from "../shared";
import {shouldUpdateComponent} from "./componentUpdateUtils";

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

    /**
     * 处理组件挂载 & 更新逻辑
     * @param n1 old
     * @param n2 new
     * @param container 容器
     * @param parentComponent 父组件
     * @param anchor 锚点
     */
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            //挂载
            mountComponent(n2, container, parentComponent, anchor)
        } else {
            updateComponent(n1, n2)
        }
    }

    function updateComponent(n1, n2) {
        // n2 是更新的实例，没有走初始化，所以需要把 n1 的 component 继承一下
        n2.component = n1.component
        const instance = n2.component
        if (shouldUpdateComponent(n1, n2)) {
            // 组件实例的 next 用于存储新的节点树
            instance.next = n2
            // update() 是 effect 函数返回的 runner
            instance.update()
        } else {
            n2.el = n1.el
            n2.vnode = n2
        }
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
     * @param container 在当前方法中不关键
     * @param parentComponent 在当前方法中不关键
     * @param parentAnchor 锚点，用于指定元素插入的位置
     */
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0   // 新节点树游标
        let e1 = c1.length - 1 // 索引指向(老)节点树尾部
        let e2 = c2.length - 1 // 索引指向(新)节点树尾部

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
        while (i <= e1 && i <= e2) { // 循环条件：游标不能大于等于 e1 和 e2
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

        /** 位移完毕，已确定中间部分 **/

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
            let s1 = i // 老节点树的起始索引
            let s2 = i // 新节点树的起始索引

            // 用于建立 key -> 元素位置 映射关系
            const keyToNewIndexMap = new Map()
            // 用于记录新节点树(除去左右两侧)的节点数量，即需要处理的总数量
            const toBePatch = e2 - s2 + 1
            // 新老映射关系表，为了保证性能，采用了定长数组
            const newIndexToOldIndexMap = new Array(toBePatch)
            // 标记是否有需要移动的元素
            let moved = false
            // 用于临时保存元素的索引，也是为了判断是否有需要移动的元素
            let maxNewIndexSoFar = 0

            for (let i = 0; i < toBePatch; i++) {
                newIndexToOldIndexMap[i] = 0 // 初始化映射表
            }
            // 用于记录已处理的新节点的数量
            let patched = 0

            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i]
                keyToNewIndexMap.set(nextChild.key, i)  // key -> 元素位置
            }

            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i] // 旧节点中间部分的起始元素

                // 已处理的元素已经大于等于需要处理的总元素
                if (patched >= toBePatch) {
                    //剩下的元素全部移除掉，然后过掉当前循环
                    hostRemove(prevChild.el)
                    continue
                }

                let newIndex
                // key 值对比
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key) // 通过 key 尝试从新节点树中获取到相同的元素
                } else {
                    // 没有 key，遍历对比
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j
                            break
                        }
                    }
                }

                if (newIndex === undefined) {
                    // 元素没有出现在新的节点树中，移除
                    hostRemove(prevChild.el)

                } else {// 元素出现在新的节点树中
                    // 记录当前元素的索引位置，如果元素在新节点树中的位置比原来的位置小了，意味着有元素的移动
                    // 需要进行最长递增子序列计算，否则就意味着元素位置没有变动，就不需要走下面的逻辑了
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex
                    } else {
                        moved = true
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1
                    patch(prevChild, c2[newIndex], container, parentComponent, null)
                    patched++
                }
            }

            // 获取最长递增子序列（即稳定不变的元素）
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
            // 游标 j 指向最长递增子序列
            let j = increasingNewIndexSequence.length - 1
            // 倒序匹配，确保元素插入到正确的位置
            for (let i = toBePatch - 1; i >= 0; i--) {
                const nextIndex = i + s2
                const nextChild = c2[nextIndex] // 从新节点树中取得元素
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null // 锚点，不可以大于 c2 的长度
                if (newIndexToOldIndexMap[i] === 0) {
                    // 创建新元素
                    patch(null, nextChild, container, parentComponent, anchor)
                } else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 移动元素
                        console.log("移动位置")
                        hostInsert(nextChild.el, container, anchor)
                    } else {
                        j--
                    }
                }
            }
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
        // 必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
        // (为虚拟节点绑定当前的实例对象)
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent))
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
     * @param anchor
     */
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        // 为当前实例赋值这个 effect 的 runner，用于更新组件的时候调用
        instance.update = effect(() => {
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
                // next：新的虚拟节点
                // vnode：老的虚拟节点
                const {proxy, next, vnode} = instance
                // 更新 el
                if (next) {
                    next.el = vnode.el
                    updateComponentPreRender(instance, next)
                }
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

/**
 *  组件更新，更新组件 props，封装
 * @param instance 组件实例
 * @param nextVNode 新虚拟节点
 */
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode
    instance.next = null

    instance.props = nextVNode.props
}


// 最长递增子序列
function getSequence(arr) {
    const p = arr.slice()
    const result = [0]
    let i, j, u, v, c
    const len = arr.length
    for (i = 0; i < len; i++) {
        const arrI = arr[i]
        if (arrI !== 0) {
            j = result[result.length - 1]
            if (arr[j] < arrI) {
                p[i] = j
                result.push(i)
                continue
            }
            u = 0
            v = result.length - 1
            while (u < v) {
                c = (u + v) >> 1
                if (arr[result[c]] < arrI) {
                    u = c + 1
                } else {
                    v = c
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1]
                }
                result[u] = i
            }
        }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
        result[u] = v
        v = p[v]
    }
    return result
}
