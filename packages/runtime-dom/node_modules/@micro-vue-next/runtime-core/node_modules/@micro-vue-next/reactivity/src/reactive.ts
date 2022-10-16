import {mutableHandlers, readonlyHandlers, shallowReadonlyHandlers} from "./baseHandler";
import {isObject} from "@micro-vue-next/shared";

export const enum ReactiveFlag {
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly"
}

export function reactive(raw) {
    return createActiveObject(raw, mutableHandlers)
}

export function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers)
}

export function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers)
}

function createActiveObject(raw: any, baseHandlers) {
    if(!isObject(raw)){
        console.warn("create proxy failed, target much be an Object!")
        return
    }
    return new Proxy(raw, baseHandlers)
}

export function isReactive(value) {
    return !!value[ReactiveFlag.IS_REACTIVE]
}

export function isReadonly(value) {
    return !!value[ReactiveFlag.IS_READONLY]
}

export function isProxy(value) {
    return isReactive(value) || isReadonly(value)
}
