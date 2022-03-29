function createVNode(type, props, children) {
    const vnode = { type, props, children };
    return vnode;
}

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type //方便获取
    };
    return component;
}
function setupComponent(instance) {
    //TODO
    //initProps()
    //initSlots()
    //处理有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    //获取 setup 返回的对象
    const { setup } = Component;
    if (setup) {
        //setupResult 可能是 function 或者 object
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    //TODO function
    if (typeof setupResult === "object") {
        //赋值到 instance
        instance.setupState = setupResult;
    }
    //给定 render 函数
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (!Component.render) {
        //必须要有 render 函数
        Component.render = instance.render;
    }
}

//render 只干一件事，就是调用 patch
function render(vnode, container) {
    patch(vnode);
}
function patch(vnode, container) {
    //处理组件
    processComponent(vnode);
}
function processComponent(vnode, container) {
    //挂载
    mountComponent(vnode);
}
function mountComponent(vnode, container) {
    //必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
    const instance = createComponentInstance(vnode);
    //处理「组件」的初始化逻辑
    setupComponent(instance);
    //处理「元素」的渲染逻辑
    setupRenderEffect(instance);
}
function setupRenderEffect(instance, container) {
    //直接调用 instance 的 render 获取到虚拟结点
    const subTree = instance.render();
    //再次调用 patch，去处理元素的渲染
    patch(subTree);
}

function createApp(rootComponent) {
    return {
        mount(root) {
            //需要先将入口转换成 vnode
            //所有操作都基于 vnode 完成
            const vnode = createVNode(rootComponent);
            render(vnode);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
