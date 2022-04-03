export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type //方便获取
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
