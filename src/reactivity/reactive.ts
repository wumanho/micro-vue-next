import {mutableHandlers, readonlyHandlers} from "./baseHandler";


export function reactive(raw) {
    return createActiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers)
}

function createActiveObject(raw: any, baseHandlers) {
    return new Proxy(raw, baseHandlers)
}

export function isReactive(value) {
    return value['is_reactive']
}