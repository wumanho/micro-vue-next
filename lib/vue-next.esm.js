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
const hasChanged = (newVal, oldVal) => !Object.is(newVal, oldVal);
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const EMPTY_OBJ = {};
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

//全局容器，用于保存当前的effect方法
let activeEffect;
let shouldTrack;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        activeEffect = this;
        if (!this.active) {
            return this._fn();
        }
        //如果不是stop状态，就要维护一下shouldTrack开关
        shouldTrack = true;
        const result = this._fn();
        shouldTrack = false;
        return result;
    }
    stop() {
        // stop()会清除所有effect
        // 所以只要清空过一次，就可以将 active 设置为 false 了
        if (this.active) {
            cleanUpEffect(this);
            //onStop回调
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanUpEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
//语义化方法抽取
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
// Map<target,depsMap>
let targetMap = new Map();
function track(target, key) {
    //如果shouldTrack为false的话，就不应该再走收集依赖
    if (!isTracking())
        return;
    //依赖收集的对应关系 target -> keys -> dep
    let depsMap = targetMap.get(target);
    //处理初始化
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
//抽取依赖收集的方法，与ref公用
function trackEffects(dep) {
    //不再重复收集
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
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
function effect(fn, options) {
    // const {scheduler} = options
    const _effect = new ReactiveEffect(fn);
    //将 options 直接挂载到_effect
    if (options) {
        extend(_effect, options);
    }
    //将effect收集的依赖封装到 reactiveeffect 类的run方法中
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
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
        if (!isReadonly) {
            //依赖收集
            track(target, key);
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

class RefImpl {
    constructor(value) {
        this._rawValue = value;
        this.__v_isRef = true;
        //如果 value 是个对象的话，则需要用 reactive 包裹
        this._value = convert(value);
        this.deps = new Set();
    }
    //收集依赖
    get value() {
        trackRefValue(this);
        return this._value;
    }
    //触发依赖
    set value(newVal) {
        //如果数据没有变更，不触发依赖
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal;
            this._value = convert(newVal);
            triggerEffects(this.deps);
        }
    }
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.deps);
    }
}
//用于判断是否为对象类型
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRef(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        //如果是 ref 就返回.value，不是的话直接返回值即可
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            //如果访问的key本身是一个ref，但传入的参数又不是一个ref对象，就要将target[key]的value值重新赋值
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value;
            }
            else {
                //否则，直接将target[key]替换成新的ref对象即可
                return Reflect.set(target, key, value);
            }
        }
    });
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        parent,
        isMounted: false,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        subTree: {},
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
        //赋值到 instance,使用 proxyRef 包裹，可以不使用.value直接获取值
        instance.setupState = proxyRef(setupResult);
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
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null);
    }
    /**
     *  核心渲染方法，渲染逻辑的入口
     * @param n1 旧的节点树，如果不存在，则处于初始化流程，如果存在，则处于更新的流程
     * @param n2 新的节点树
     * @param container 父元素
     * @param parentComponent 父组件
     */
    function patch(n1, n2, container, parentComponent) {
        //判断 vode 是否 element，element 要单独处理
        //element：{type:'div',props:'hello'}
        //组件：{ type:APP{render()=>{} ,setup()=>{} }}
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentComponent);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    //处理组件
                    processComponent(n1, n2, container, parentComponent);
                }
        }
    }
    function processText(n1, n2, container) {
        // children 就是一个字符串
        const { children } = n2;
        // 创建 text 节点，并赋值到 vnode 的 el 上
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }
    function processComponent(n1, n2, container, parentComponent) {
        //挂载
        mountComponent(n2, container, parentComponent);
    }
    /**
     * 处理 element，判断是初始化还是更新
     * @param n1 老节点树
     * @param n2 新节点树
     * @param container 父元素
     * @param parentComponent 父组件
     */
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            mountElement(n2, container, parentComponent);
        }
        else {
            patchElement(n1, n2);
        }
    }
    /**
     * element 更新处理，包括对属性的具体处理
     * @param n1 老节点树
     * @param n2 新节点树
     * @param container 父元素
     */
    function patchElement(n1, n2, container) {
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // n2 由于没有走初始化的逻辑，所有没有 el 属性
        // 所以先将 n1 的 el 赋值给 n2，用于下次更新的时候获取
        const el = (n2.el = n1.el);
        patchProp(el, oldProps, newProps);
    }
    /**
     *
     * @param el
     * @param oldProp
     * @param newProp
     */
    function patchProp(el, oldProp, newProp) {
        // 判断新节点树的 prop 是否有变化
        if (oldProp !== newProp) {
            for (const key in newProp) {
                // 根据新属性列表的key获取老属性列表对应的值
                const prevProp = oldProp[key];
                const nextProp = newProp[key];
                if (prevProp !== newProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            if (oldProp !== EMPTY_OBJ) {
                // 如果老的 prop 在新的节点树里面被删除了，那这个属性也要删除掉
                for (const key in oldProp) {
                    if (!(key in newProp)) {
                        hostPatchProp(el, key, oldProp[key], null);
                    }
                }
            }
        }
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
        const el = (vnode.el = hostCreateElement(type));
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
            hostPatchProp(el, key, null, val);
        }
        //添加到父容器
        hostInsert(el, container);
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach(v => {
            patch(null, v, container, parentComponent);
        });
    }
    /**
     *  该方法获取组件的整个元素树，交给 patch 去逐个处理
     *  effect 在这里就用上了，为 render 中的响应式对象收集依赖
     * @param instance
     * @param initialVNode
     * @param container
     */
    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            if (!instance.isMounted) { // 初始化逻辑
                const { proxy } = instance;
                //直接调用 instance 的 render() 获取到虚拟结点
                //指定 this 为代理对象
                const subTree = (instance.subTree = instance.render.call(proxy));
                //再次调用 patch，去处理元素的渲染
                patch(null, subTree, container, instance);
                //$el挂载，这次才是获取到初始化完成的 el
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else { //更新逻辑
                const { proxy } = instance;
                // 获取当前组件的 subTree 以及上一次的 subTree 用于 diff 对比的
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                // 完事记录一下当前的 subTree
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance);
            }
        });
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
    return document.createElement(type);
}
/**
 *  自定义渲染器，处理 prop
 * @param el 元素
 * @param key 属性键
 * @param prevVal 旧属性键
 * @param nextVal 新属性值
 */
function patchProp(el, key, prevVal, nextVal) {
    //注册事件的逻辑
    const isOn = (key) => {
        return /^on[A-Z]/.test(key);
    };
    // 判断 props 是事件还是属性
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
/**
 * 自定义渲染器,插入元素
 * @param el 元素
 * @param parent 需要插入的父级元素
 */
function insert(el, parent) {
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

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, proxyRef, ref, renderSlots };
