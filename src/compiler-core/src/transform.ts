/**
 * 遍历，对 ast 进行一些处理
 * @param root ast 的根节点
 * @param options 可选参数
 */
import {NodeTypes} from "./ast";
import {TO_DISPLAY_STRING} from "./runtimeHelpers";

export function transform(root, options = {}) {
    // 创建全局上下文
    const context = createTransformContext(root, options)
    // 深度优先搜索
    traverseNode(root, context)
    // 为 codegen 创建入口
    createRootCodegen(root)

    context.root.helpers = [...context.helpers.keys()]
}

/**
 * 创建一个全局上下文对象
 * @param root
 * @param options
 */
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(), // 存储所有处理器
        helper(key) {  // 辅助设置到 root 的函数
            context.helpers.set(key, 1)
        }
    }
    return context
}

/**
 * 递归遍历树,深度优先
 * @param node 节点
 * @param context 全局上下文对象
 */
function traverseNode(node, context) {
    // 取出所有插件，遍历执行
    const nodeTransforms = context.nodeTransforms
    const exitFns: any = []
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i]
        const onExit = transform(node, context)
        if (onExit) exitFns.push(onExit)
    }
    // 判断节点类型
    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING) // 通过 helper 方法添加处理器
            break
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            // 抽取递归逻辑
            traversChildren(node, context);
            break
    }

    let i = exitFns.length
    while (i--) {
        exitFns[i]()
    }
}

function traversChildren(node, context) {
    const children = node.children
    for (let i = 0; i < children.length; i++) {
        const node = children[i]
        traverseNode(node, context)
    }
}

function createRootCodegen(root) {
    const child = root.children[0]
    if (child.type === NodeTypes.ELEMENT) {
        root.codegenNode = child.codegenNode
    } else {
        root.codegenNode = root.children[0]
    }
}

