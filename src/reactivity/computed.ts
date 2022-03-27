import {ReactiveEffect} from "./effect";

class ComputedRefImpl {
    private readonly getter: () => any;
    private _dirty: boolean = true;  //是否刷新缓存
    private _value: any
    private _effect: any

    constructor(getter) {
        this.getter = getter;
        this._effect = new ReactiveEffect(getter, () => {
            // trigger 时解除锁，除了解开锁之外什么也不做
            if (!this._dirty) {
                this._dirty = true
            }
        })
    }

    get value() {
        if (this._dirty) {
            this._dirty = false
            //记录 value，控制是否返回 & 这里会进入 track 流程
            this._value = this._effect.run();
        }
        //这个就是缓存的值，因为每次调用都会返回它
        return this._value
    }
}

export function computed(getter) {
    return new ComputedRefImpl(getter)
}