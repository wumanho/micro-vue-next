import {mutableHandlers, readonlyHandlers ,shallowReadonlyHandlers} from "./baseHandler";

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
    return new Proxy(raw, baseHandlers)
}

export function isReactive(value) {
    return !!value[ReactiveFlag.IS_REACTIVE]
}

export function isReadonly(value) {
    return !!value[ReactiveFlag.IS_READONLY]
}