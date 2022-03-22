import {trackEffects, triggerEffects, isTracking} from "./effect";
import {hasChanged, isObject} from "../shared";
import {reactive} from "./reactive";

class RefImpl {
    private _value: any
    private _rawValue: any
    public deps
    public __v_isRef: boolean

    constructor(value) {
        this._rawValue = value
        this.__v_isRef = true
        //如果 value 是个对象的话，则需要用 reactive 包裹
        this._value = convert(value)
        this.deps = new Set()
    }

    //收集依赖
    get value() {
        trackRefValue(this)
        return this._value
    }

    //触发依赖
    set value(newVal) {
        //如果数据没有变更，不触发依赖
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal
            this._value = convert(newVal)
            triggerEffects(this.deps)
        }
    }
}

function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.deps)
    }
}

//用于判断是否为对象类型
function convert(value) {
    return isObject(value) ? reactive(value) : value
}

export function ref(value) {
    return new RefImpl(value)
}

export function isRef(ref) {
    return !!ref.__v_isRef
}

export function unRef(ref) {
    return isRef(ref) ? ref.value : ref
}

