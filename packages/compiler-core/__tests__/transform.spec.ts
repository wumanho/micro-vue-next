import {baseParse} from "../src/parse";
import {transform} from "../src/transform"
import {NodeTypes} from "../src/ast";

describe("transform", () => {
    test('happy path', () => {
        const ast = baseParse("<div>hi,{{message}}</div>")
        // 使用插件
        const plugin = (node) => {
            if (node.type === NodeTypes.TEXT) {
                node.content = node.content + "mini-vue"
            }
        }
        // 传入插件
        transform(ast, {
            nodeTransforms: [plugin]
        })
        const nodeText = ast.children[0].children[0]
        expect(nodeText.content).toBe("hi,mini-vue")
    });
})
