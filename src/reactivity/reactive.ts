import {track} from "./effect";

export function reactive(raw) {
    return new Proxy(raw, {
        //target = 原始对象raw，key就是用户访问的那个key
        get(target, key) {
            const res = Reflect.get(target, key)
            //依赖收集
            track(target,key)
            return res
        },
        set(target, key, value) {
            return Reflect.set(target, key, value)
        }
    })
}