import {baseParse} from "../src/parse";
import {generate} from "../src/codegen";
import {transform} from "../src/transform";
import {transformExpression} from "../src/transforms/transformExpression";
import {transformElement} from "../src/transforms/transformElement";
import {transformText} from "../src/transforms/transformText";

describe("codegen", () => {
    test("string", () => {
        const ast = baseParse("hi")
        // 生成 codegen 根
        transform(ast)
        //暂时不 transform
        const {code} = generate(ast)
        //将方法进行快照对比
        expect(code).toMatchSnapshot()
    })
    test("interpolation", () => {
        const ast = baseParse("{{message}}")
        // 生成 codegen 根
        transform(ast, {
            nodeTransforms: [transformExpression]
        })
        //暂时不 transform
        const {code} = generate(ast)
        //将方法进行快照对比
        expect(code).toMatchSnapshot()
    })
    test("element", () => {
        const ast: any = baseParse("<div>hi,{{message}}</div>")
        // 生成 codegen 根
        transform(ast, {
            nodeTransforms: [transformExpression, transformElement, transformText]
        })
        //暂时不 transform
        const {code} = generate(ast)
        //将方法进行快照对比
        expect(code).toMatchSnapshot()
    })
})
