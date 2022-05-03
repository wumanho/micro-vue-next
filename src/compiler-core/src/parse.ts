import {NodeTypes} from "./ast";

const enum TagType {
    START,
    END
}

export function baseParse(content: string) {
    // 根据 content 创建全局上下文对象
    const context = createParserContext(content)
    // 创建根
    return createRoot(parseChildren(context, []))
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


function createRoot(children) {
    return {
        children
    }
}

/**
 * 该方法循环解析 Children 节点，直到循环条件结束
 * @param context
 * @param ancestors 栈，记录所有元素
 */
function parseChildren(context, ancestors) {
    const nodes: any[] = []
    // 循环解析，直到碰到结束条件
    while (!isEnd(context, ancestors)) {
        let node
        const s = context.source
        if (s.startsWith("{{")) {
            // 解析插值
            node = parseInterpolation(context)
        } else if (s[0] === "<") {
            // 元素解析，判断尖括号后是否字母a-z，忽略大小写
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors)
            }
        }
        // 不是插值，不是元素，默认为 text
        if (!node) {
            node = parseText(context)
        }
        nodes.push(node)
    }
    return nodes
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
    const rawContent = parseTextData(context, rawContentLength)
    const content = rawContent.trim()
    // 清空上下文的 source
    advanceBy(context, closeDelimiter.length)
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content,
        }
    }
}

/**
 * 解析 element 方法
 * @param context 全局上下文
 * @param ancestors 栈，记录所有元素
 */
function parseElement(context, ancestors) {
    const element = parseTag(context, TagType.START) as any;
    // 记录解析好的标签
    ancestors.push(element)
    element.children = parseChildren(context, ancestors)
    // 当前标签内的子元素已经解析完之后，弹出元素
    ancestors.pop()
    // 判断是否有闭合标签
    if (startsWithEndTagOpen(context.source, element.tag)) {
        // 这一步是清除闭合的那个标签
        parseTag(context, TagType.END)
    } else {
        throw  new Error(`缺少结束标签：${element.tag}`)
    }
    return element
}

/**
 * 用于切割内容
 * @param context 上下文: {{message}}
 * @param length 切割的长度
 */
function advanceBy(context: any, length: number) {
    context.source = context.source.slice(length)
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
 * 获取插值文本和获取文件的方法抽取
 * @param context 全局上下文
 * @param length 截取长度
 */
function parseTextData(context, length) {
    //1.获取文本内容
    const content = context.source.slice(0, length)
    //2.清空上下文
    advanceBy(context, length)
    return content;
}

/**
 * 解析文本 方法
 * @param context 全局上下文
 */
function parseText(context) {
    let endIndex = context.source.length
    // 遇到插值表达式或者闭合标签就结束，记录结束位置的索引
    let endToken = ["<", "{{"]
    for (let i = 0; i < endToken.length; i++) {
        const index = context.source.indexOf(endToken[i])
        // 如果同时存在多个结束标记，取靠左边的那个才是正确的
        if (index !== -1 && index < endIndex) {
            endIndex = index
        }
    }
    // content 就是 text 文本内容
    const content = parseTextData(context, endIndex);
    return {
        type: NodeTypes.TEXT,
        content: content
    }
}

/**
 * 用于判断是否结束 parse 循环
 * @param context 全局上下文
 * @param ancestors 栈，记录了所有元素标签
 */
function isEnd(context, ancestors) {
    const s = context.source
    // 判断是否有对应的闭合标签
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag
            if (startsWithEndTagOpen(s, tag)) {
                //结束条件2：遇到结束标签
                return true
            }
        }
    }
    //结束条件1：source 没有值
    return !s
}

/**
 * 判断是否有闭合标签
 */
function startsWithEndTagOpen(source, tag) {
    return source.startsWith("</")
        && source.slice(2, 2 + tag.length).toLowerCase()
        === tag.toLowerCase()
}
