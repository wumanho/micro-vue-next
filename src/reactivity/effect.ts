class ReactiveEffect {
    private readonly _fn: any

    constructor(fn) {
        this._fn = fn
    }

    run() {
        activeEffect = this
        this._fn()
    }
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
        depsMap.set(key,dep)
    }
    dep.add(activeEffect)
}

//全局容器，用于保存当前的effect方法
let activeEffect
export function effect(fn) {
    const _effect = new ReactiveEffect(fn)
    //将effect收集的依赖封装到 reactiveeffect 类的run方法中
    _effect.run()
}