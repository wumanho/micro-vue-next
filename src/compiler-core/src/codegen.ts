export function generate(ast) {
    const context = createCodegenContext()
    const {push} = context
    push("return ")
    const functionName = "render" // 函数名
    const args = ["_ctx", "_cache"] // 参数数组
    const signature = args.join(",") // 参数数组转成 string
    // 拼接
    push(`function ${functionName}(${signature}){`)
    push("return ")
    genNode(ast.codegenNode, context)
    push("}")

    return {
        code: context.code
    }
}

/**
 * 生成关键的方法体
 * @param node node
 * @param context codegen 上下文对象
 */
function genNode(node, context) {
    const {push} = context
    push(`'${node.content}'`)
}


function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source
        }
    }
    return context
}
