/**
 * 遍历，对 ast 进行一些处理
 * @param root ast 的根节点
 * @param options 可选参数
 */

export function transform(root, options = {}) {
    // 创建全局上下文
    const context = createTransformContext(root, options)
    // 深度优先搜索
    traverseNode(root, context)
    // 为 codegen 创建入口
    createRootCodegen(root)
}

/**
 * 创建一个全局上下文对象
 * @param root
 * @param options
 */
function createTransformContext(root, options) {
    return {
        root,
        nodeTransforms: options.nodeTransforms || []
    }
}

/**
 * 递归遍历树,深度优先
 * @param node 节点
 * @param context 全局上下文对象
 */
function traverseNode(node, context) {
    // 取出所有插件，遍历执行
    const nodeTransforms = context.nodeTransforms
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i]
        transform(node)
    }
    // 抽取递归逻辑
    traversChildren(node, context);
}

function traversChildren(node, context) {
    const children = node.children
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i]
            traverseNode(node, context)
        }
    }
}

function createRootCodegen(root) {
    root.codegenNode = root.children[0]
}

