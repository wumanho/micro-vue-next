import {track, trigger} from "./effect";
import {ReactiveFlag} from "./reactive";

//get 和 set 只需要初始化一次即可
const get = createGetter(false)
const set = createSetter()
const readOnlyGet = createGetter(true)

function createGetter(isReadonly: boolean) {
    return function (target, key) {
        //实现 isReactive 方法
        if (key === ReactiveFlag.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlag.IS_READONLY) {
            return isReadonly
        }
        //target = 原始对象raw，key就是用户访问的那个key
        const res = Reflect.get(target, key)
        if (!isReadonly) {
            //依赖收集
            track(target, key)
        }
        return res
    }
}

function createSetter() {
    return function (target, key, value) {
        //set的时候需要触发收集的依赖
        const res = Reflect.set(target, key, value)
        //触发副作用函数
        trigger(target, key)
        //最后当然是要做set该做的事
        return res
    }
}

export const mutableHandlers = {get, set}

export const readonlyHandlers = {
    get: readOnlyGet,
    set(target, key, value) {
        console.warn('readonly')
        return true
    }
}