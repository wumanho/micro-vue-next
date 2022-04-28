const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null,
        key: props && props.key,
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
    $slots: (i) => i.slots,
    $props: (i) => i.props
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
        next: null,
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

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (let key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
let isFlushPending = false;
const p = Promise.resolve();
/**
 * nextTick API
 * @param fn
 */
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
/**
 * 异步队列
 * @param job 任务
 */
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
/**
 * 通过微任务的方式执行收集到的 Job
 */
function queueFlush() {
    // isFlushPending 标记当前微任务是否已经执行完毕
    if (isFlushPending)
        return;
    // 锁住状态，以免下一个任务过来的时候又创建一个 Promise
    isFlushPending = true;
    // 通过微任务执行所有 job
    nextTick(flushJobs);
}
function flushJobs() {
    let job;
    while (job = queue.shift()) {
        job && job();
    }
    // 解锁
    isFlushPending = false;
}

//render 只干一件事，就是调用 patch
function createRenderer(options) {
    // 获取自定义渲染器，默认渲染到 Dom 平台
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    /**
     *  核心渲染方法，渲染逻辑的入口
     * @param n1 旧的节点树，如果不存在，则处于初始化流程，如果存在，则处于更新的流程
     * @param n2 新的节点树
     * @param container 父元素
     * @param parentComponent 父组件
     * @param anchor 锚点
     */
    function patch(n1, n2, container, parentComponent, anchor) {
        //判断 vode 是否 element，element 要单独处理
        //element：{type:'div',props:'hello'}
        //组件：{ type:APP{render()=>{} ,setup()=>{} }}
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
        }
    }
    function processText(n2, container) {
        // children 就是一个字符串
        const { children } = n2;
        // 创建 text 节点，并赋值到 vnode 的 el 上
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processFragment(n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    /**
     * 处理组件挂载 & 更新逻辑
     * @param n1 old
     * @param n2 new
     * @param container 容器
     * @param parentComponent 父组件
     * @param anchor 锚点
     */
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            //挂载
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        // n2 是更新的实例，没有走初始化，所以需要把 n1 的 component 继承一下
        n2.component = n1.component;
        const instance = n2.component;
        if (shouldUpdateComponent(n1, n2)) {
            // 组件实例的 next 用于存储新的节点树
            instance.next = n2;
            // update() 是 effect 函数返回的 runner
            instance.update();
        }
        else {
            n2.el = n1.el;
            n2.vnode = n2;
        }
    }
    /**
     * 处理 element，判断是初始化还是更新
     * @param n1 老节点树
     * @param n2 新节点树
     * @param container 父元素
     * @param parentComponent 父组件
     * @param anchor 锚点
     */
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    /**
     * element 更新处理，包括对属性、Children的更新处理
     * @param n1 老节点树
     * @param n2 新节点树
     * @param container 父元素
     * @param parentComponent 父组件
     * @param anchor 锚点
     */
    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // n2 由于没有走初始化的逻辑，所有没有 el 属性
        // 所以先将 n1 的 el 赋值给 n2，用于下次更新的时候获取
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProp(el, oldProps, newProps);
    }
    /**
     * 对 children 的更新处理
     * @param n1 老节点
     * @param n2 新节点
     */
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        // 获取旧元素的类型和 children
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        // 新元素的类型以及 children
        const shapeFlag = n2.shapeFlag;
        const c2 = n2.children;
        // 新元素是 text 普通文本
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            // 如果老节点的 children 是数组的话，需要先清空掉
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                // 1.把老节点的children清空
                unmountChildren(n1.children);
            }
            // 再设置新的 text 值
            if (c1 !== c2)
                hostSetElementText(container, c2);
        }
        else { // 新节点的 children 是数组
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
                // 清空老的文本节点
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // array diff
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
    }
    /**
     *  diff 核心逻辑
     * @param c1 old children
     * @param c2 new children
     * @param container 在当前方法中不关键
     * @param parentComponent 在当前方法中不关键
     * @param parentAnchor 锚点，用于指定元素插入的位置
     */
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0; // 新节点树游标
        let e1 = c1.length - 1; // 索引指向(老)节点树尾部
        let e2 = c2.length - 1; // 索引指向(新)节点树尾部
        // 左侧位移
        while (i <= e1 && i <= e2) { // 循环条件：游标不能大于等于 e1 和 e2
            const n1 = c1[i]; // 取得元素(头部)
            const n2 = c2[i]; // 取得元素(头部)
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else { // 直到出现不同的元素，就没必要再循环下去了
                break;
            }
            i++;
        }
        // 右侧位移
        while (i <= e1 && i <= e2) { // 循环条件：游标不能大于等于 e1 和 e2
            const n1 = c1[e1]; // 取得元素(尾部)
            const n2 = c2[e2]; // 取得元素(尾部)
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        /** 位移完毕，已确定中间部分 **/
        if (i > e1) { // 新的节点树在原来的基础上新增了节点
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = nextPos < c2.length ? c2[nextPos].el : null;
                // i 大于 e1 小于等于 e2 的部分就是新增的节点
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) { // 新的节点树在原来的基础上少了节点
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else { // 处理中间乱序的情况下的逻辑
            let s1 = i; // 老节点树的起始索引
            let s2 = i; // 新节点树的起始索引
            // 用于建立 key -> 元素位置 映射关系
            const keyToNewIndexMap = new Map();
            // 用于记录新节点树(除去左右两侧)的节点数量，即需要处理的总数量
            const toBePatch = e2 - s2 + 1;
            // 新老映射关系表，为了保证性能，采用了定长数组
            const newIndexToOldIndexMap = new Array(toBePatch);
            // 标记是否有需要移动的元素
            let moved = false;
            // 用于临时保存元素的索引，也是为了判断是否有需要移动的元素
            let maxNewIndexSoFar = 0;
            for (let i = 0; i < toBePatch; i++) {
                newIndexToOldIndexMap[i] = 0; // 初始化映射表
            }
            // 用于记录已处理的新节点的数量
            let patched = 0;
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i); // key -> 元素位置
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i]; // 旧节点中间部分的起始元素
                // 已处理的元素已经大于等于需要处理的总元素
                if (patched >= toBePatch) {
                    //剩下的元素全部移除掉，然后过掉当前循环
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                // key 值对比
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key); // 通过 key 尝试从新节点树中获取到相同的元素
                }
                else {
                    // 没有 key，遍历对比
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    // 元素没有出现在新的节点树中，移除
                    hostRemove(prevChild.el);
                }
                else { // 元素出现在新的节点树中
                    // 记录当前元素的索引位置，如果元素在新节点树中的位置比原来的位置小了，意味着有元素的移动
                    // 需要进行最长递增子序列计算，否则就意味着元素位置没有变动，就不需要走下面的逻辑了
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            // 获取最长递增子序列（即稳定不变的元素）
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            // 游标 j 指向最长递增子序列
            let j = increasingNewIndexSequence.length - 1;
            // 倒序匹配，确保元素插入到正确的位置
            for (let i = toBePatch - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex]; // 从新节点树中取得元素
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null; // 锚点，不可以大于 c2 的长度
                if (newIndexToOldIndexMap[i] === 0) {
                    // 创建新元素
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 移动元素
                        console.log("移动位置");
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function isSameVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
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
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 必须先根据虚拟结点创建实例对象，实例对象用于挂载实例方法和属性，例如 props slot
        // (为虚拟节点绑定当前的实例对象)
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        //处理「组件」的初始化逻辑
        setupComponent(instance);
        //处理「元素」的渲染逻辑
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    /**
     *  在这里会调用一些 dom 的 api，将虚拟 dom 转换成真实 dom
     *  update：支持用户传入自定义渲染器
     * @param vnode
     * @param container
     * @param parentComponent
     */
    function mountElement(vnode, container, parentComponent, anchor) {
        const { children, props, shapeFlag, type } = vnode;
        //创建元素，使用自定义渲染器
        const el = (vnode.el = hostCreateElement(type));
        //创建元素内容
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) { //children 为数组
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        //处理 props
        for (const key in props) {
            const val = props[key];
            // 自定义 props 接口
            hostPatchProp(el, key, null, val);
        }
        //添加到父容器
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(v => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    /**
     *  该方法获取组件的整个元素树，交给 patch 去逐个处理
     *  effect 在这里就用上了，为 render 中的响应式对象收集依赖
     * @param instance
     * @param initialVNode
     * @param container
     * @param anchor
     */
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        // 为当前实例赋值这个 effect 的 runner，用于更新组件的时候调用
        instance.update = effect(() => {
            if (!instance.isMounted) { // 初始化逻辑
                const { proxy } = instance;
                //直接调用 instance 的 render() 获取到虚拟结点
                //指定 this 为代理对象
                const subTree = (instance.subTree = instance.render.call(proxy));
                //再次调用 patch，去处理元素的渲染
                patch(null, subTree, container, instance, anchor);
                //$el挂载，这次才是获取到初始化完成的 el
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else { //更新逻辑
                // next：新的虚拟节点
                // vnode：老的虚拟节点
                const { proxy, next, vnode } = instance;
                // 更新 el
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                // 获取当前组件的 subTree 以及上一次的 subTree 用于 diff 对比的
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                // 完事记录一下当前的 subTree
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}
/**
 *  组件更新，更新组件 props，封装
 * @param instance 组件实例
 * @param nextVNode 新虚拟节点
 */
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
}
// 最长递增子序列
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
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
 * @param child 元素
 * @param parent 需要插入的父级元素
 * @param anchor 锚点，指定插入的位置
 */
function insert(child, parent, anchor = null) {
    // parent.append(el)
    parent.insertBefore(child, anchor);
}
/**
 * 自定义渲染器，移除元素
 * @param child 需要移除的元素
 */
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
/**
 * 自定义渲染器，设置元素 text
 * @param container 容器
 * @param text 设置的内容
 */
function setElementText(container, text) {
    container.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, nextTick, provide, proxyRef, ref, renderSlots };
