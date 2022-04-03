export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type, //方便获取
        setupState: {}
    }
    return component
}

export function setupComponent(instance) {
    //TODO
    //initProps()
    //initSlots()
    //处理有状态的组件
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    const Component = instance.type
    //解构出来 setup 返回的对象
    const {setup} = Component
    //组件代理对象 ctx，用于绑定到组件的this上，使用户可以通过this来获取到setup返回的内容
    instance.proxy = new Proxy({}, {
        get(target, key) {
            //拿到 setupState
            const {setupState} = instance
            if (key in setupState) {
                return setupState[key]
            }
        }
    })
    if (setup) {
        //setupResult 可能是 function 或者 object
        const setupResult = setup()
        handleSetupResult(instance, setupResult)
    }
}

function handleSetupResult(instance, setupResult: any) {
    //TODO function
    if (typeof setupResult === "object") {
        //赋值到 instance
        instance.setupState = setupResult
    }
    //给定 render 函数
    finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
    const Component = instance.type
    //必须要有 render 函数
    instance.render = Component.render

}
