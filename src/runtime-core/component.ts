import {PublicInstanceProxyHandlers} from "./componentPublisInstalce";
import {initProps} from "./componentProps";
import {shallowReadonly} from "../reactivity/reactive";

export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type, //方便获取
        setupState: {}, // setup 返回的数据
        props: {}
    }
    return component
}

export function setupComponent(instance) {
    //TODO
    initProps(instance, instance.vnode.props)
    //initSlots()
    //处理有状态的组件
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    const Component = instance.type
    //解构出来 setup 返回的对象
    const {setup} = Component
    //组件代理对象 ctx，用于绑定到组件的this上，使用户可以通过this来获取到setup返回的内容
    instance.proxy = new Proxy({_: instance}, PublicInstanceProxyHandlers)
    if (setup) {
        //setupResult 可能是 function 或者 object
        //传入 props，但props必须是只读的
        const setupResult = setup(shallowReadonly(instance.props))
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
