/**
 *  emit 功能
 * @param instance 组件实例
 * @param event 用户自定义事件名
 */
import {camelize, toHandlerKey} from "@micro-vue-next/shared";

export function emit(instance, event, ...args) {
    const {props} = instance

    //组装标准自定义事件名
    const handlerName: string = toHandlerKey(camelize(event))

    const handler = props[handlerName]
    //执行自定义事件
    handler && handler(...args)
}
