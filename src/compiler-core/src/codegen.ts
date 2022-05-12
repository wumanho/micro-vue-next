import {NodeTypes} from "./ast";
import {helperMapName, TO_DISPLAY_STRING} from "./runtimeHelpers";

export function generate(ast) {
    const context = createCodegenContext()
    const {push} = context
    // 构造导入语句
    genFunctionPreamble(ast, context);
    /*----------------------------------------*/
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
    switch (node.type) {
        case NodeTypes.TEXT:
            genText(node, context)
            break
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context)
            break
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break
    }
}


function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source
        },
        helper(key) {
            return `_${helperMapName[key]}`
        }
    }
    return context
}

function genFunctionPreamble(ast, context) {
    const {push} = context
    const VueBinging = "Vue"
    const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}`
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`)
        push("\n")
    }
    push("return ")
}

function genText(node, context) {
    const {push} = context
    push(`'${node.content}'`)
}

function genInterpolation(node, context) {
    const {push, helper} = context
    push(`${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content, context)
    push(")")
}

function genExpression(node, context) {
    const {push} = context
    push(`${node.content}`)
}
