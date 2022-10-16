import {baseParse} from "../src/parse";
import {NodeTypes} from "../src/ast";

describe('parse', () => {
    describe('interpolation', () => {
        test('simple interpolation', () => {
            // 简单解析器
            const ast = baseParse("{{ message }}")
            // root
            // interpolation:插值
            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.INTERPOLATION,
                content: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: "message"
                }
            })
        })
    })
    describe('element', () => {
        test('simple element div', () => {
            // 元素解析器
            const ast = baseParse("<div></div>")
            // root
            // interpolation:插值
            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.ELEMENT,
                tag: "div",
                children: []
            })
        });
    })
    describe('text', () => {
        test('simple text', () => {
            // 文本解析器
            const ast = baseParse("hello text")
            // root
            // interpolation:插值
            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.TEXT,
                content: "hello text"
            })
        })
    })

    test("hello world", () => {
        const ast = baseParse("<div>hi,{{message}}</div>")
        expect(ast.children[0]).toStrictEqual({
            type: NodeTypes.ELEMENT,
            tag: "div",
            children: [
                {
                    type: NodeTypes.TEXT,
                    content: "hi,"
                },
                {
                    type: NodeTypes.INTERPOLATION,
                    content: {
                        type: NodeTypes.SIMPLE_EXPRESSION,
                        content: "message"
                    }
                }]
        })
    })

    test('nested element', () => {
        const ast = baseParse("<div><p>hi</p>hi,{{message}}</div>")
        expect(ast.children[0]).toStrictEqual({
            type: NodeTypes.ELEMENT,
            tag: "div",
            children: [
                {
                    type: NodeTypes.ELEMENT,
                    tag: "p",
                    children: [{
                        type: NodeTypes.TEXT,
                        content: "hi"
                    }]
                },
                {
                    type: NodeTypes.TEXT,
                    content: "hi,"
                },
                {
                    type: NodeTypes.INTERPOLATION,
                    content: {
                        type: NodeTypes.SIMPLE_EXPRESSION,
                        content: "message"
                    }
                }]
        })
    })

    test('should throw error when lack end tag', () => {
        expect(() => {
            baseParse("<div><span></div>")
        }).toThrow(`缺少结束标签：span`)
    })
})
