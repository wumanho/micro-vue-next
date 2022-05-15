//vue 出口
export * from './runtime-dom/index'
import {baseCompile} from "./compiler-core/src"
import * as runtimeDom from "./runtime-dom"
import {registerRuntimeCompiler} from "./runtime-dom"

/**
 * 将 code 包装成 function
 * @param template
 */
function compileToFunction(template) {
    const {code} = baseCompile(template)
    return new Function("Vue", code)(runtimeDom)
}

registerRuntimeCompiler(compileToFunction)
