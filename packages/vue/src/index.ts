//vue 出口
export * from '@micro-vue-next/runtime-dom'
import {baseCompile} from "@micro-vue-next/compiler-core/src"
import * as runtimeDom from "@micro-vue-next/runtime-dom"
import {registerRuntimeCompiler} from "@micro-vue-next/runtime-dom"

/**
 * 将 code 包装成 function
 * @param template
 */
function compileToFunction(template) {
  const {code} = baseCompile(template)
  return new Function("Vue", code)(runtimeDom)
}

registerRuntimeCompiler(compileToFunction)
