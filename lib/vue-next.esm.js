const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null
    };
    // 为 children 添加 shapeFlag
    // 通过位运算处理
    if (typeof children === 'string') {
        vnode.shapeFlag = vnode.shapeFlag | 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | 8 /* ARRAY_CHILDREN */;
    }
    //判断 children 是否插槽
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof vnode.children === "object") {
            vnode.shapeFlag |= 16 /* SLOTS_CHILDREN */;
        }
    }
    return vnode;
}
function getShapeFlag(type) {
    // 判断是元素或者是组件
    return typeof type === 'string' ? 1 /* ELEMENT */ : 2 /* STATEFUL_COMPONENT */;
}
function createTextVNode(text) {
    // 定义 Text 类型，渲染文本类型节点
    return createVNode(Text, {}, text);
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

/**
 * 由于插槽可能以数组的方式传入(多个元素)，封装一个可读性更强的方法来渲染，并兼容非数组的情况
 * @param slots 插槽
 * @param name 插槽插入的位置
 */
function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot && typeof slot === "function") {
        // Fragment 类型，不需要外层 div 包裹直接渲染子元素
        return createVNode(Fragment, {}, slot(props));
    }
}

const extend = Object.assign;
const isObject = (val) => val !== null && typeof val === 'object';
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
//先将 add-foo 事件格式转换为 addFoo格式
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
//将自定义事件的首字母转换成大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
//统一添加 on 作为事件开头
const toHandlerKey = (str) => {
    return str ? 'on' + capitalize(str) : '';
};

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        //拿到 setupState，和 props
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        // this.$el 获取根元素
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

/**
 * 初始化组件 props
 * @param instance 实例
 * @param rawProps 没有处理过的 props
 */
function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

// Map<target,depsMap>
let targetMap = new Map();
function trigger(target, key) {
    //根据target -> key 可以获取到 dep 对象
    //遍历执行 dep 对象中所有收集到的副作用函数
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
//抽取trigger方法，与ref公用
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

//get 和 set 只需要初始化一次即可
const get = createGetter(false);
const set = createSetter();
const readOnlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly, shallow = false) {
    return function (target, key) {
        //实现 isReactive 方法
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        //target = 原始对象raw，key就是用户访问的那个key
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        //如果是 object 的话，将返回的对象也设置为代理
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function (target, key, value) {
        //set的时候需要触发收集的依赖
        const res = Reflect.set(target, key, value);
        //触发副作用函数
        trigger(target, key);
        //最后当然是要做set该做的事
        return res;
    };
}
const mutableHandlers = { get, set };
const readonlyHandlers = {
    get: readOnlyGet,
    set(target, key, value) {
        console.warn('readonly');
        return true;
    }
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn("create proxy failed, target much be an Object!");
        return;
    }
    return new Proxy(raw, baseHandlers);
}

/**
 *  emit 功能
 * @param instance 组件实例
 * @param event 用户自定义事件名
 */
function emit(instance, event, ...args) {
    const { props } = instance;
    //组装标准自定义事件名
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    //执行自定义事件
    handler && handler(...args);
}

function initSlots(instance, children) {
    //判断是否 slot
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* SLOTS_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    //根据 key 获取对应的 slot
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
// 统一将 slots 包装成数组
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        parent,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        emit: () => {
        }
    };
    //初始化 componentEmit
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    //初始化组件的 props
    initProps(instance, instance.vnode.props);
    //初始化组件的插槽
    initSlots(instance, instance.vnode.children);
    //处理有状态的组件(普通组件)
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    //解构出来 setup 返回的对象
    const { setup } = Component;
    //组件代理对象 ctx，用于绑定到组件的this上，使用户可以通过this来获取到setup返回的内容
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    if (setup) {
        //在调用 setup 前，获取当前组件的实例
        setCurrentInstance(instance);
        //setupResult 可能是 function 或者 object
        //传入 props，但props必须是只读的
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
        setCurrentInstance(null);
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
let currentInstance = null;
function finishComponentSetup(instance) {
    const Component = instance.type;
    //必须要有 render 函数
    instance.render = Component.render;
}
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

/**
 * 负责从父组件中取出对应的键值对
 * @param key 键
 */
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (parentProvides[key]) {
            return parentProvides[key];
        }
        else if (defaultValue) { //处理默认值
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            else {
                return defaultValue;
            }
        }
    }
}
/**
 * 负责将键值对保存在 component 实例的 provides 对象中
 * @param key 键
 * @param value 值
 */
function provide(key, value) {
    // 需要获取当前实例，所以要求必须在 setup 中调用
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        // 仅在初始化的时候进行原型链赋值操作
        if (provides === parentProvides) {
            // 原型链赋值
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                //需要先将入口转换成 vnode
                //所有操作都基于 vnode 完成
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            }
        };
    };
}

//render 只干一件事，就是调用 patch
function createRenderer(options) {
    // 获取自定义渲染器，默认渲染到 Dom 平台
    const { createElement, patchProp, insert } = options;
    function render(vnode, container) {
        patch(vnode, container, null);
    }
    function patch(vnode, container, parentComponent) {
        //判断 vode 是否 element，element 要单独处理
        //element：{type:'div',props:'hello'}
        //组件：{ type:APP{render()=>{} ,setup()=>{} }}
        const { type, shapeFlag } = vnode;
        switch (type) {
            case Fragment:
                processFragment(vnode, container, parentComponent);
                break;
            case Text:
                processText(vnode, container);
                break;
            default:
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(vnode, container, parentComponent);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    //处理组件
                    processComponent(vnode, container, parentComponent);
                }
        }
    }
    function processText(vnode, container) {
        // children 就是一个字符串
        const { children } = vnode;
        // 创建 text 节点，并赋值到 vnode 的 el 上
        const textNode = (vnode.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processFragment(vnode, container, parentComponent) {
        mountChildren(vnode, container, parentComponent);
    }
    function processComponent(vnode, container, parentComponent) {
        //挂载
        mountComponent(vnode, container, parentComponent);
    }
    function processElement(vnode, container, parentComponent) {
        mountElement(vnode, container, parentComponent);
    }
    function mountComponent(initialVNode, container, parentComponent) {
        //必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
        const instance = createComponentInstance(initialVNode, parentComponent);
        //处理「组件」的初始化逻辑
        setupComponent(instance);
        //处理「元素」的渲染逻辑
        setupRenderEffect(instance, initialVNode, container);
    }
    /**
     *  在这里会调用一些 dom 的 api，将虚拟 dom 转换成真实 dom
     *  update：支持用户传入自定义渲染器
     * @param vnode
     * @param container
     * @param parentComponent
     */
    function mountElement(vnode, container, parentComponent) {
        const { children, props, shapeFlag, type } = vnode;
        //创建元素，使用自定义渲染器
        const el = (vnode.el = createElement(type));
        //创建元素内容
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) { //children 为数组
            mountChildren(vnode, el, parentComponent);
        }
        //处理 props
        for (const key in props) {
            const val = props[key];
            // 自定义 props 接口
            patchProp(el, key, val);
        }
        //添加到父容器
        insert(el, container);
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach(v => {
            patch(v, container, parentComponent);
        });
    }
    function setupRenderEffect(instance, initialVNode, container) {
        const { proxy } = instance;
        //直接调用 instance 的 render 获取到虚拟结点
        //指定 this 为代理对象
        const subTree = instance.render.call(proxy);
        //再次调用 patch，去处理元素的渲染
        patch(subTree, container, instance);
        //$el挂载，这次才是获取到初始化完成的 el
        initialVNode.el = subTree.el;
    }
    return {
        createApp: createAppAPI(render)
    };
}

/**
 * 自定义渲染器，处理元素
 * @param type 元素类型
 */
function createElement(type) {
    console.log("createElement================");
    return document.createElement(type);
}
/**
 *  自定义渲染器，处理 prop
 * @param el 元素
 * @param key 属性键
 * @param val 属性值
 */
function patchProp(el, key, val) {
    console.log("patchProp================");
    el.setAttribute(key, val);
    //注册事件的逻辑
    const isOn = (key) => {
        return /^on[A-Z]/.test(key);
    };
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    }
}
/**
 * 自定义渲染器,插入元素
 * @param el 元素
 * @param parent 需要插入的父级元素
 */
function insert(el, parent) {
    console.log("insert===================");
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, renderSlots };
