import {NodeTypes} from "../ast";
import {isText} from "../utils";

/**
 * 判断 element 节点中的子节点是否为复合类型
 * @param node
 */
export function transformText(node) {
    if (node.type === NodeTypes.ELEMENT) {
        // 判断是否复合类型
        const {children} = node
        let currentContainer
        for (let i = 0; i < children.length; i++) {
            const child = children[i]
            if (isText(child)) {
                // 第二层 for 循环，找到下一个节点
                for (let j = i + 1; j < children.length; j++) {
                    const next = children[j]
                    // 进了这里就证明是复合节点了
                    if (isText(next)) {
                        // 初始化
                        if (!currentContainer) {
                            currentContainer = children[i] = {
                                type: NodeTypes.COMPOUND_EXPRESSION,
                                children: [child]
                            }
                        }
                        // 每个其他节点通过 + 分割
                        currentContainer.children.push(" + ")
                        // 把其他节点 push 进去
                        currentContainer.children.push(next)
                        // 删除,并校正 j 索引
                        children.splice(j, 1)
                        j--
                    } else {
                        currentContainer = undefined
                        break
                    }
                }
            }
        }
    }
}
