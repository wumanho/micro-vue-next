class ReactiveEffect {
    private readonly _fn: any

    constructor(fn) {
        this._fn = fn
    }

    run() {
        activeEffect = this
        return this._fn()
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
        depsMap.set(key, dep)
    }
    dep.add(activeEffect)
}

export function trigger(target, key) {
    //根据target -> key 可以获取到 dep 对象
    //遍历执行 dep 对象中所有收集到的副作用函数
    let depsMap = targetMap.get(target)
    let dep = depsMap.get(key)
    for (const effect of dep) {
        effect.run()
    }
}

//全局容器，用于保存当前的effect方法
let activeEffect

export function effect(fn) {
    const _effect = new ReactiveEffect(fn)
    //将effect收集的依赖封装到 reactiveeffect 类的run方法中
    _effect.run()
    return _effect.run.bind(_effect)
}