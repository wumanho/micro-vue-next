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
                tag: "div"
            })
        });
    })
})
