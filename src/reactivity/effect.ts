import {extend} from "../shared";

class ReactiveEffect {
    private readonly _fn: any
    public scheduler?: any
    deps = []
    active = true
    onStop?: () => void

    constructor(fn) {
        this._fn = fn
    }

    run() {
        activeEffect = this
        return this._fn()
    }

    stop() {
        // stop()会清除所有effect
        // 所以只要清空过一次，就可以将 active 设置为 false 了
        if (this.active) {
            cleanUpEffect(this)
            //onStop回调
            if (this.onStop) {
                this.onStop()
            }
            this.active = false
        }
    }
}

function cleanUpEffect(effect) {
    effect.deps.forEach((dep: any) => {
        dep.delete(effect)
    })
}

// Map<target,depsMap>
let targetMap = new Map()

export function track(target, key) {
    //依赖收集的对应关系 target -> keys -> dep
    let depsMap = targetMap.get(target)
    //处理初始化
    if (!depsMap) {
        depsMap = new Map()
        targetMap.set(target, depsMap)
    }
    let dep = depsMap.get(key)
    if (!dep) {
        dep = new Set()
        depsMap.set(key, dep)
    }
    if (!activeEffect) return
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
}

export function trigger(target, key) {
    //根据target -> key 可以获取到 dep 对象
    //遍历执行 dep 对象中所有收集到的副作用函数
    let depsMap = targetMap.get(target)
    let dep = depsMap.get(key)
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler()
        } else {
            effect.run()
        }
    }
}

//全局容器，用于保存当前的effect方法
let activeEffect

export function effect(fn, options?: any) {
    // const {scheduler} = options
    const _effect = new ReactiveEffect(fn)
    //将 options 直接挂载到_effect
    if (options) {
        extend(_effect, options)
    }
    //将effect收集的依赖封装到 reactiveeffect 类的run方法中
    _effect.run()
    const runner: any = _effect.run.bind(_effect)
    runner.effect = _effect
    return runner
}

export function stop(runner) {
    runner.effect.stop()
}