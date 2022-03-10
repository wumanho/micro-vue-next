import {track, trigger} from "./effect";

function createGetter(isReadonly: boolean) {
    return function (target, key) {
        const res = Reflect.get(target, key)
        if (!isReadonly) {
            //依赖收集
            track(target, key)
        }
        return res
    }
}


export function reactive(raw) {
    return new Proxy(raw, {
        //target = 原始对象raw，key就是用户访问的那个key
        get: createGetter(false),
        //set的时候需要触发收集的依赖
        set(target, key, value) {
            const res = Reflect.set(target, key, value)
            //触发副作用函数
            trigger(target, key)
            //最后当然是要做set该做的事
            return res
        }
    })
}

export function readonly(raw) {
    return new Proxy(raw, {
        get: createGetter(true),
        set(target, key, value) {
            return true
        }
    })
}