import {NodeTypes} from "./ast";

const enum TagType {
    START,
    END
}

export function baseParse(content: string) {
    // 根据 content 创建全局上下文对象
    const context = createParserContext(content)
    // 创建根
    return createRoot(parseChildren(context))
}

/**
 * 用于切割内容
 * @param context 上下文: {{message}}
 * @param length 切割的长度
 */
function advanceBy(context: any, length: number) {
    context.source = context.source.slice(length)
}

/**
 * 解析插值方法
 * @param context 全局上下文
 */
function parseInterpolation(context) {
    // 定义初始分隔符和结束分隔符
    const openDelimiter = "{{"
    const closeDelimiter = "}}"

    // 取得 }} 的索引值,
    // 第二个参数：开始计算的地方，所以传值为初始分隔符的长度
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length)
    // 去掉 {{
    advanceBy(context, openDelimiter.length)
    // 获取插值内容长度
    const rawContentLength = closeIndex - openDelimiter.length
    // 确认实际内容
    const rawContent = context.source.slice(0, rawContentLength)
    const content = rawContent.trim()
    // 清空上下文的 source
    advanceBy(context, rawContentLength + closeDelimiter.length)
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content,
        }
    }
}

function parseTag(context, type: number) {
    //1.解析 tag
    const match: any = /^<\/?([a-z]*)/i.exec(context.source)
    const tag = match[1]
    //2.清除 source
    advanceBy(context, match[0].length) // ></div>
    advanceBy(context, 1) // </div>
    if (type === TagType.END) return
    return {
        type: NodeTypes.ELEMENT,
        tag
    }
}

/**
 * 解析 element 方法
 * @param context 全局上下文
 */
function parseElement(context) {
    const element = parseTag(context, TagType.START);
    // 这一步是清除闭合的那个标签
    parseTag(context, TagType.END)
    console.log(context.source, "source")
    return element
}

function parseChildren(context) {
    const nodes: any[] = []
    const s = context.source
    if (s.startsWith("{{")) {
        // 解析插值
        nodes.push(parseInterpolation(context))
    } else if (s[0] === "<") {
        // 元素解析，判断尖括号后是否字母a-z，忽略大小写
        if (/[a-z]/i.test(s[1])) {
            nodes.push(parseElement(context))
        }
    }
    return nodes
}

function createRoot(children) {
    return {
        children
    }
}

/**
 * 用于创建全局上下文对象
 * @param content 原始内容 : {{message}}
 */
function createParserContext(content: string) {
    return {
        source: content
    }
}
